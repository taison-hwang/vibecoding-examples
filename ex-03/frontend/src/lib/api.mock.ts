export interface Recipient {
  name: string;
  email: string;
}

export interface SummaryResponse {
  summary: string;
}

export interface EmailResponse {
  success: boolean;
  message: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const healthCheck = async (): Promise<boolean> => {
  await sleep(300);
  return true;
};

export const summarizeText = async (text: string): Promise<SummaryResponse> => {
  await sleep(1500);
  if (!text.trim()) {
    throw new Error("회의록 텍스트가 비어 있습니다.");
  }
  return {
    summary: `# 🔄 스크럼 회의 요약 보고서 (Mock)

## 1. 회의 개요 (Summary)
금일 데일리 스크럼 회의에서는 신규 기능인 AI 요약 및 메일 공유 시스템에 대한 진행 상황을 검토하고, 프론트엔드와 백엔드 API 연동 시 발생한 CORS 에러 및 오디오 업로드 제한 용량 예외 처리에 대해 논의했습니다.

## 2. 주요 논의 사항 (Key Discussions)
- **CORS 이슈 해결**: 로컬 개발 서버 간 포트가 달라(5173 -> 8000) 발생한 CORS 블로킹 문제를 FastAPI CORS Middleware 설정을 통해 즉시 조치했습니다.
- **오디오 녹음 한도 지정**: Gemini API 인라인(Base64) 전송 방식의 20MB 업로드 한도를 고려하여, 프론트엔드단에서 20MB 이상일 시 업로드를 차단하는 가이드를 추가하기로 협의했습니다.

## 3. 액션 아이템 (Action Items)
- **홍길동**: FastAPI CORS 설정 추가 (기한: 오늘 완료)
- **이순신**: React MediaRecorder 레코딩 타이머 및 용량 체크 추가 (기한: 내일)
- **김스크럼**: Gmail SMTP 2단계 앱 비밀번호 사전 연동 실습 가이드 작성 (기한: 이번 주 금요일)`
  };
};

export const summarizeAudio = async (audioBlob: Blob): Promise<SummaryResponse> => {
  await sleep(2500);
  if (audioBlob.size > 20 * 1024 * 1024) {
    throw new Error("10분 이내(20MB 미만)의 오디오만 지원합니다.");
  }
  return {
    summary: `# 🔄 오디오 분석 스크럼 요약 보고서 (Mock)

## 1. 회의 개요 (Summary)
녹음된 음성을 분석한 결과, 팀 내 스프린트 마감일 조정 및 릴리즈 배포 계획에 관한 논의가 확인되었습니다. 프론트엔드 빌드 최적화 및 빌드 오류 상황 공유가 주요 안건이었습니다.

## 2. 주요 논의 사항 (Key Discussions)
- **음성 전사 분석**: MediaRecorder로 녹음된 webm 음성을 Base64로 전송하여 Gemini 2.5 Flash를 통해 성공적으로 전사하고 텍스트로 요약했습니다.
- **배포 주기 일정 조율**: 매주 수요일 오전에 배포하던 일정을 화요일 오후로 당겨 장애 대응 여유를 갖기로 합의했습니다.

## 3. 액션 아이템 (Action Items)
- **이순신**: 프론트엔드 빌드 타임 개선 및 Vite 구성 최적화 (기한: 7월 2일)
- **홍길동**: 배포 자동화 스크립트 수정 및 로컬 테스트 (기한: 7월 3일)`
  };
};

export const sendEmail = async (
  _content: string,
  recipients: Recipient[],
  _subject?: string,
  _header?: string,
  _footer?: string
): Promise<EmailResponse> => {
  await sleep(1200);
  if (!recipients || recipients.length === 0) {
    throw new Error("이메일을 전송할 수신자가 지정되지 않았습니다.");
  }
  return {
    success: true,
    message: `모든 팀원(${recipients.length}명)에게 메일이 성공적으로 발송되었습니다.`
  };
};

