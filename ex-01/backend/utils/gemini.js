const { GoogleGenerativeAI } = require("@google/generative-ai");

const systemInstruction = `
회의록(스크럼 대화 내용이나 회의 음성 녹음본)을 요약하고 액션 아이템을 도출하여 반드시 아래의 마크다운 형식을 엄격하게 지켜 답변해 주세요.

[요약 규칙]
1. 회의 내용을 핵심만 정리하여 '### 📌 스크럼 회의 요약' 섹션 아래에 리스트 형태로 작성할 것.
2. 각 참석자가 완료한 일, 진행할 일, 이슈 등을 파악할 것.
3. 특정 인물이 언급되지 않았거나 전체에 해당하는 액션 아이템은 '### 🎬 액션 아이템 (Action Items)' 섹션 아래에 '- **[공통]:** 할일 내용' 형태로 분류할 것.
4. 특정 인물이 언급된 액션 아이템은 '- **이름:** 할일 내용' 형태로 분류할 것.
5. 만약 액션 아이템이 전혀 도출되지 않는 경우, '### 🎬 액션 아이템 (Action Items)' 섹션 아래에 "금일 회의에서 도출된 액션 아이템이 없습니다."라고 출력할 것.
6. 응답은 오직 이 마크다운 요약본만 포함해야 하며, 인사말이나 추가 설명은 일체 배제할 것.

[출력 형식 예시]
### 📌 스크럼 회의 요약
- 프론트엔드 메인 페이지 UI 컴포넌트 개발 완료 및 오늘 테스트 진행 예정.
- 프론트-백엔드 연동을 위한 로그인 API 개발 일정 조율.

### 🎬 액션 아이템 (Action Items)
- **민수:** 메인 페이지 UI 컴포넌트 테스트 진행
- **영희:** 로그인 API 개발 완료 (~금요일까지)
- **[공통]:** 다음 주 배포 일정을 확인하고 개인 캘린더 비워두기
`;

/**
 * Generates a structured scrum summary and action items from the transcript using Gemini API.
 * @param {string} transcript 
 * @returns {Promise<string>} Markdown formatted summary
 */
async function generateScrumSummary(transcript) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.");
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: systemInstruction },
    { text: `회의록:\n"""\n${transcript}\n"""` }
  ]);
  
  return result.response.text();
}

/**
 * Generates a structured scrum summary from raw audio base64 input using Gemini's native multimodal capabilities.
 * @param {string} audioBase64 
 * @param {string} mimeType 
 * @returns {Promise<string>} Markdown formatted summary
 */
async function generateScrumSummaryFromAudio(audioBase64, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.");
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: systemInstruction },
    {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType
      }
    }
  ]);
  
  return result.response.text();
}

module.exports = { generateScrumSummary, generateScrumSummaryFromAudio };
