const { convertMarkdownToHtml } = require("./utils/email");

const sampleMarkdown = `
### 📌 스크럼 회의 요약
- 프론트엔드 메인 페이지 UI 컴포넌트 개발 완료 및 오늘 테스트 진행 예정.
- 프론트-백엔드 연동을 위한 로그인 API 개발 일정 조율.

### 🎬 액션 아이템 (Action Items)
- **민수:** 메인 페이지 UI 컴포넌트 테스트 진행
- **영희:** 로그인 API 개발 완료 (~금요일까지)
- **[공통]:** 다음 주 배포 일정을 확인하고 개인 캘린더 비워두기
`;

console.log("Testing Markdown-to-HTML conversion...");
try {
  const html = convertMarkdownToHtml(sampleMarkdown);
  console.log("HTML generated successfully!");
  console.log("-----------------------------------------");
  console.log(html.substring(0, 500) + "\n... (truncated for log preview) ...");
  console.log("-----------------------------------------");
  
  // Basic validation checks
  const hasSummaryHeader = html.includes("📌 스크럼 회의 요약");
  const hasActionHeader = html.includes("🎬 액션 아이템");
  const hasMinsu = html.includes("민수");
  const hasCommon = html.includes("[공통]");
  const hasUl = html.includes("<ul");
  const hasLi = html.includes("<li");
  
  if (hasSummaryHeader && hasActionHeader && hasMinsu && hasCommon && hasUl && hasLi) {
    console.log("Validation Successful: All key HTML tags and content pieces are present!");
    console.log("Test Passed!");
  } else {
    throw new Error("Missing required HTML elements in the converted content.");
  }
} catch (error) {
  console.error("Test Failed!", error);
  process.exit(1);
}
