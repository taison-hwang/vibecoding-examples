import { SummaryResponse } from '../types';

const MOCK_DELAY_MS = 1500;

function getMockSummary(): Promise<SummaryResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        summary: "오늘 스크럼 회의의 핵심 내용을 요약한 텍스트입니다. 주기적인 백엔드 코드 보안 강화 및 프론트엔드-백엔드 간 구조화된 JSON 데이터 통신 규격을 확정했습니다.",
        action_items: [
          { owner: "홍길동", task: "백엔드 API 명세서 작성 및 공유", due: "2026-07-01" },
          { owner: "이영희", task: "프론트엔드 설정 페이지 UI 마크업", due: "2026-07-02" },
          { owner: "김철수", task: "이메일 템플릿 최종 승인 및 릴리즈 준비", due: "2026-07-03" }
        ]
      });
    }, MOCK_DELAY_MS);
  });
}

async function callGeminiApi(prompt: string): Promise<SummaryResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          action_items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                owner: { type: "STRING" },
                task: { type: "STRING" },
                due: { type: "STRING" }
              },
              required: ["owner", "task", "due"]
            }
          }
        },
        required: ["summary", "action_items"]
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API call failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json() as any;
  const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error("Invalid response structure from Gemini API");
  }

  return JSON.parse(textContent) as SummaryResponse;
}

async function callGeminiApiWithAudio(prompt: string, base64Data: string, mimeType: string): Promise<SummaryResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          action_items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                owner: { type: "STRING" },
                task: { type: "STRING" },
                due: { type: "STRING" }
              },
              required: ["owner", "task", "due"]
            }
          }
        },
        required: ["summary", "action_items"]
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API call failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json() as any;
  const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error("Invalid response structure from Gemini API");
  }

  return JSON.parse(textContent) as SummaryResponse;
}

export async function summarizeText(text: string): Promise<SummaryResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.log('[GeminiService] GEMINI_API_KEY is not configured. Returning mock data...');
    return getMockSummary();
  }

  if (!text || text.trim().length < 5) {
    throw new Error("입력 내용이 너무 짧습니다. 회의록 내용을 더 상세히 입력해주세요.");
  }

  const prompt = `Below is a scrum meeting log. Please summarize it and extract action items with owners and due dates. Output language must be Korean.
Meeting log:
${text}`;

  return callGeminiApi(prompt);
}

export async function summarizeAudio(fileBuffer: Buffer, mimeType: string): Promise<SummaryResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.log('[GeminiService] GEMINI_API_KEY is not configured for audio. Returning mock data...');
    return getMockSummary();
  }

  const base64Data = fileBuffer.toString('base64');
  const prompt = `Please summarize the following meeting audio in detail and extract all action items. The output language must be Korean.`;

  return callGeminiApiWithAudio(prompt, base64Data, mimeType);
}
