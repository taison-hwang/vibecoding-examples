import * as mockApi from './api.mock';
import type { Recipient, SummaryResponse, EmailResponse } from './api.mock';
export type { Recipient, SummaryResponse, EmailResponse };


// Detect whether to use mock APIs. Default to false unless explicitly configured.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const BASE_URL = 'http://localhost:8000';

if (USE_MOCK) {
  console.log("🔄 API client running in MOCK mode. Backend calls are simulated locally.");
} else {
  console.log("🔗 API client running in REAL mode. Connecting to:", BASE_URL);
}

export const isMockMode = (): boolean => USE_MOCK;

export const healthCheck = async (): Promise<boolean> => {
  if (USE_MOCK) return mockApi.healthCheck();
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    return response.ok;
  } catch (error) {
    console.warn("Health check connection failure:", error);
    return false;
  }
};

export const summarizeText = async (text: string): Promise<SummaryResponse> => {
  if (USE_MOCK) return mockApi.summarizeText(text);

  if (!text.trim()) {
    throw new Error("회의록 텍스트가 비어 있습니다.");
  }

  const response = await fetch(`${BASE_URL}/api/summarize/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    let errorDetail = "AI 요약 생성에 실패했습니다.";
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json();
};

export const summarizeAudio = async (audioBlob: Blob): Promise<SummaryResponse> => {
  if (USE_MOCK) return mockApi.summarizeAudio(audioBlob);

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');

  const response = await fetch(`${BASE_URL}/api/summarize/audio`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    let errorDetail = "AI 오디오 분석에 실패했습니다.";
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json();
};

export const sendEmail = async (
  content: string,
  recipients: Recipient[],
  subject?: string,
  header?: string,
  footer?: string
): Promise<EmailResponse> => {
  if (USE_MOCK) return mockApi.sendEmail(content, recipients, subject, header, footer);

  if (!recipients || recipients.length === 0) {
    throw new Error("이메일을 발송할 팀원이 없습니다. 설정 탭에서 팀원을 추가해주세요.");
  }

  const response = await fetch(`${BASE_URL}/api/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      content,
      recipients,
      subject,
      header,
      footer
    })
  });

  if (!response.ok) {
    let errorDetail = "이메일 일괄 전송 도중 에러가 발생했습니다.";
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json();
};
