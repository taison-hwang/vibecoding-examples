import os
import base64
import datetime
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import requests
import markdown
import smtplib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-scrum-sync")

app = FastAPI(title="AI Scrum Sync API", version="1.1")

# Configure CORS to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

class TextSummaryRequest(BaseModel):
    text: str

class Recipient(BaseModel):
    name: str
    email: EmailStr

class EmailSendRequest(BaseModel):
    content: str
    recipients: List[Recipient]
    subject: Optional[str] = None
    header: Optional[str] = None
    footer: Optional[str] = None

@app.get("/api/health")
def health_check():
    """Health check endpoint to verify backend connectivity."""
    return {"status": "ok", "timestamp": datetime.datetime.now().isoformat()}

@app.post("/api/summarize/text")
def summarize_text(request: TextSummaryRequest):
    """
    Summarize raw scrum meeting text using Gemini 2.5 Flash API.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY environment variable is missing")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key가 백엔드 서버에 설정되지 않았습니다. .env 파일을 확인해 주세요."
        )

    if not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="회의록 텍스트가 비어 있습니다."
        )

    prompt = (
        "이 내용은 데일리 스크럼 회의록 또는 대화 내용입니다. "
        "이를 면밀히 분석하여 아래 항목들을 포함하는 깔끔한 Markdown 형식의 요약 보고서를 작성해주세요.\n\n"
        "1. **회의 개요 (Summary)**: 오늘 회의의 핵심 내용을 2-3줄로 요약\n"
        "2. **액션 아이템 (Action Items)**: 누가(담당자), 무엇을(할 일), 언제까지(기한) 해야 하는지 명확히 목록으로 작성 (담당자나 기한이 불분명할 경우 유추하거나 공란/미정 처리)\n"
        "3. **주요 논의 사항 (Key Discussions)**: 중요 아젠다별 논의 및 논쟁 사항 요약\n\n"
        "작성 시 다음 규칙을 지키세요:\n"
        "- 반드시 한국어로 가독성 높고 정중하게 작성해 주세요.\n"
        "- 불필요한 서두나 결론 문구 없이 바로 Markdown 본문으로 시작하세요.\n\n"
        f"--- 회의록 내용 ---\n{request.text}"
    )

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 429:
            logger.warning("Gemini API Rate limit hit (429)")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="현재 사용량이 많아 API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
            )
        elif response.status_code != 200:
            logger.error(f"Gemini API returned error {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API 호출 중 오류가 발생했습니다: {response.text}"
            )

        data = response.json()
        summary_markdown = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"summary": summary_markdown}

    except requests.exceptions.RequestException as e:
        logger.exception("Network error during Gemini API call")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Gemini API 서버와의 통신에 실패했습니다: {str(e)}"
        )

@app.post("/api/summarize/audio")
async def summarize_audio(file: UploadFile = File(...)):
    """
    Accept an audio webm file, base64 encode it, and send to Gemini 2.5 Flash.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY environment variable is missing")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key가 백엔드 서버에 설정되지 않았습니다. .env 파일을 확인해 주세요."
        )

    # Validate file size (20MB limit)
    max_size = 20 * 1024 * 1024  # 20MB
    contents = await file.read()
    if len(contents) > max_size:
        logger.warning(f"Uploaded audio file is too large: {len(contents)} bytes")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="10분 이내(20MB 미만)의 오디오만 지원합니다."
        )

    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="오디오 파일 내용이 비어 있습니다."
        )

    # Base64 encode the audio data
    encoded_audio = base64.b64encode(contents).decode("utf-8")
    mime_type = file.content_type or "audio/webm"

    prompt = (
        "이 오디오 파일은 데일리 스크럼 회의 음성 녹음본입니다. "
        "오디오 내용을 전사(Transcription)하고, 이를 분석하여 아래 항목들을 포함하는 깔끔한 Markdown 형식의 요약 보고서를 작성해주세요.\n\n"
        "1. **회의 개요 (Summary)**: 회의의 핵심 내용을 2-3줄로 요약\n"
        "2. **액션 아이템 (Action Items)**: 누가(담당자), 무엇을(할 일), 언제까지(기한) 해야 하는지 명확히 목록으로 작성\n"
        "3. **주요 논의 사항 (Key Discussions)**: 중요 아젠다별 논의 및 논쟁 사항 요약\n\n"
        "작성 시 다음 규칙을 지키세요:\n"
        "- 반드시 한국어로 가독성 높고 정중하게 작성해 주세요.\n"
        "- 불필요한 서두나 결론 문구 없이 바로 Markdown 본문으로 시작하세요."
    )

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": encoded_audio
                    }
                },
                {
                    "text": prompt
                }
            ]
        }]
    }

    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json=payload,
            headers=headers,
            timeout=60  # Audio processing might take longer
        )
        
        if response.status_code == 429:
            logger.warning("Gemini API Rate limit hit (429) on audio")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="현재 사용량이 많아 API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
            )
        elif response.status_code != 200:
            logger.error(f"Gemini API audio processing returned error {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API가 음성을 분석하는 중 오류가 발생했습니다: {response.text}"
            )

        data = response.json()
        summary_markdown = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"summary": summary_markdown}

    except requests.exceptions.RequestException as e:
        logger.exception("Network error during Gemini audio API call")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Gemini API 서버와의 통신에 실패했습니다: {str(e)}"
        )

@app.post("/api/send-email")
def send_email(request: EmailSendRequest):
    """
    Send the summary report to the recipient list using Gmail SMTP.
    """
    gmail_user = os.getenv("GMAIL_USER")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_app_password:
        logger.error("Gmail SMTP credentials are missing in env")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="발신자 Gmail 설정(GMAIL_USER, GMAIL_APP_PASSWORD)이 백엔드 서버에 입력되지 않았습니다. .env 파일을 확인해 주세요."
        )

    if not request.recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이메일을 전송할 수신자가 지정되지 않았습니다."
        )

    # Format the email subject
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    subject_template = request.subject or "[스크럼 요약] {date} 회의 결과 공유"
    subject = subject_template.replace("{date}", today_str)

    # Convert markdown content to HTML for email body
    html_content = markdown.markdown(request.content)

    # Wrap in layout
    email_header = request.header or "안녕하세요, 오늘 진행된 스크럼 회의 요약 및 액션 아이템을 공유해 드립니다."
    email_footer = request.footer or "감사합니다.\nAI Scrum Sync 시스템"
    
    # Simple email body HTML wrapper
    formatted_header_html = email_header.replace('\n', '<br>')
    formatted_footer_html = email_footer.replace('\n', '<br>')

    email_body_html = f"""
    <html>
        <body style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; color: #333333; padding: 20px; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #1e293b; color: #ffffff; padding: 15px 20px; border-radius: 6px 6px 0 0; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 1.25rem;">🔄 AI Scrum Sync - Meeting Summary</h2>
            </div>
            <p style="font-size: 1rem; margin-bottom: 20px;">
                {formatted_header_html}
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #f1f5f9; margin-bottom: 20px;">
                {html_content}
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 0.9rem; color: #64748b; margin-top: 20px;">
                {formatted_footer_html}
            </p>
        </body>
    </html>
    """

    try:
        # Establish connection with smtp.gmail.com:587
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(gmail_user, gmail_app_password)
        
        # Send emails to each recipient in a loop (ADR guidance: report first fail)
        for recipient in request.recipients:
            from email.header import Header
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            msg = MIMEMultipart("alternative")
            msg["Subject"] = Header(subject, "utf-8")
            msg["From"] = f"AI Scrum Sync <{gmail_user}>"
            msg["To"] = f"{recipient.name} <{recipient.email}>"

            # Attach plain text version (clean representation of markdown)
            plain_text = f"{email_header}\n\n{request.content}\n\n{email_footer}"
            msg.attach(MIMEText(plain_text, "plain", "utf-8"))
            
            # Attach HTML version
            msg.attach(MIMEText(email_body_html, "html", "utf-8"))
            
            server.sendmail(gmail_user, [recipient.email], msg.as_string())
            logger.info(f"Successfully sent email to {recipient.name} ({recipient.email})")

        server.quit()
        return {"success": True, "message": f"모든 팀원({len(request.recipients)}명)에게 메일이 성공적으로 발송되었습니다."}

    except smtplib.SMTPAuthenticationError:
        logger.exception("Gmail SMTP auth failure")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gmail SMTP 인증에 실패했습니다. 발신자 계정의 2단계 인증 및 앱 비밀번호가 정확한지 확인해주세요."
        )
    except Exception as e:
        logger.exception("Gmail SMTP transmission failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"이메일 전송 중 오류가 발생했습니다: {str(e)}"
        )
