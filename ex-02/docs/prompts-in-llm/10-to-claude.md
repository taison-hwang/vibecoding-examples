UI 컨셉 프로토타입 문서 입니다.
사실 및 적합성 검증을 위하여 입력된 UI 컨셉 프로토타입 문서를 비판적으로 리뷰해주세요.
(다만, 비판을 위한 비판은 자제해주세요.)


[UI 컨셉 프로토타입]

```markdown

```python
import os

# Define content of the UI concept prototype documentation based on the user's requirements and guide.
markdown_content = """# UI 컨셉 프로토타입 설계서 (AI 스크럼 회의록 요약 및 전송 미니 웹앱)

본 문서는 제공된 요구사항 정의서와 작성 지침에 의거하여 작성된 **바이브코딩 실습용 미니 웹앱 MVP**의 UI 컨셉 프로토타입 설계서입니다. Vite + React + TypeScript + Tailwind CSS 및 shadcn/ui 스택을 기반으로 로컬 환경에서 즉시 실행 및 테스트가 가능한 80% 품질의 프로토타입 설계를 목적으로 합니다.

---

## 1. UI 요구사항 추출 매트릭스 (Phase 1)

입력된 요구사항 정의서에서 도출한 핵심 화면별 입력/출력 항목 및 기능적 명세입니다. MVP 목적에 맞게 복잡한 회원가입을 배제하고 단일 페이지 내 2개 탭 구조로 구성합니다.

| 기능 ID | 화면/탭 이름 | 입력 항목 (Input) | 출력 항목 (Output) | 권한 | 우선순위 | 비고 / 인터랙션 요약 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | 회의 요약 및 전송<br>(메인 탭) | 회의 내용 원문 (Textarea) | Gemini AI 요약문,<br>액션 아이템 테이블 | 전체 (로컬) | **높음 (필수)** | 생성 버튼 클릭 시 로딩 스피너 및 버튼 비활성화 |
| **F-02** | 이메일 발송<br>(메인 탭) | 없음 (발송 버튼 클릭) | 성공/실패 토스트 메시지 또는 경고 모달 | 전체 (로컬) | **높음 (필수)** | 수신자 목록 비었거나 요약 없을 시 버튼 비활성화 |
| **F-03** | 팀원 이메일 관리<br>(설정 탭) | 신규 이메일 주소 (Text) | 이메일 태그 리스트,<br>형식 에러 문구 | 전체 (로컬) | **높음 (필수)** | LocalStorage 연동 영속성 유지, [X] 버튼으로 삭제 |

---

## 2. 화면 구조 및 와이어프레임 설계 (Phase 2)

### 2.1 화면 계층 구조 (Directory / Tab Layer)
단일 페이지 애플리케이션(SPA) 내에서 고정 헤더와 상단 탭 내비게이션을 통해 화면을 전환합니다.

```

```text
File UI_Concept_Prototype_Documentation.md successfully written.


```

/ (Root)
└── App (메인 레이아웃)
├── 고정 헤더 (앱 타이틀)
└── 탭 컨트롤러
├── 탭 1: 회의 요약 및 전송 (Main Dashboard)
└── 탭 2: 팀원 이메일 관리 (Settings)

```

### 2.2 레이아웃 및 골격 구조

```

+-----------------------------------------------------------------------+
|  [Header] 📝 AI Scrum Minutes Minimizer                                |
+-----------------------------------------------------------------------+
|  [Tab 1: 회의 요약 및 전송]   |   [Tab 2: 팀원 이메일 관리 (2)]        |
+-----------------------------------------------------------------------+
|                                                                       |
|  (Tab 1 활성화 시)                                                    |
|  +-----------------------------------------------------------------+  |
|  | 회의 내용 입력                                                   |  |
|  | [                                                           ]  |  |
|  | [ 여기에 스크럼 회의 내용을 붙여넣으세요.                      ]  |  |
|  |                                                                 |  |
|  | [ ✨ AI 요약 및 액션 아이템 도출 ] (클릭 시 스피너/비활성화)     |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  ▶ AI 요약 결과 (정형 데이터 출력 영역)                               |
|  +-----------------------------------------------------------------+  |
|  | 📌 핵심 요약 개요                                                |  |
|  | 오늘 스크럼 회의의 핵심 내용을 요약한 텍스트입니다...           |  |
|  +-----------------------------------------------------------------+  |
|  | ⚡ 액션 아이템 (Action Items)                                   |  |
|  | +------------+-----------------------------------+------------+ |  |
|  | | 담당자     | 업무 내용                         | 기한       | |  |
|  | +------------+-----------------------------------+------------+ |  |
|  | | 홍길동     | 백엔드 API 명세서 작성 및 공유    | 2026-07-01 | |  |
|  | | 이영희     | 프론트엔드 설정 페이지 UI 마크업  | 2026-07-02 | |  |
|  | +------------+-----------------------------------+------------+ |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  [ ✉️ 등록된 팀원에게 이메일 전송 ] (팀원 0명 또는 요약 없을 시 비활성) |
|                                                                       |
+-----------------------------------------------------------------------+

```

### 2.3 주요 컴포넌트 목록
- **공통 컴포넌트**: `Header.tsx`, `Tabs.tsx`, `Button.tsx` (shadcn/ui), `Card.tsx` (shadcn/ui)
- **화면별 컴포넌트**:
  - `SummaryForm.tsx`: 회의 내용 입력용 대형 Textarea 및 요약 생성 트리거
  - `ResultViewer.tsx`: 정형화된 JSON 파싱 결과를 보여주는 마크업 영역 및 액션 아이템 `Table`
  - `MemberManager.tsx`: 이메일 정규식 검증 기능이 포함된 입력 인풋 폼 및 LocalStorage 기반 태그 리스트

---

## 3. 프로토타입 구현 명세 (Phase 3)

### 3.1 디자인 토큰 정의 (`src/styles/tokens.css`)
Tailwind CSS의 테마와 연동할 기본 시맨틱 컬러 및 레이아웃 간격 정의입니다.
```css
:root {
  /* Brand Colors (Cool & Slate Slate Accent) */
  --primary: #2563eb;       /* 블루 600 */
  --primary-hover: #1d4ed8; /* 블루 700 */
  --bg-main: #f8fafc;       /* 슬레이트 50 */
  --border-color: #e2e8f0;  /* 슬레이트 200 */
  --error: #ef4444;         /* 레드 500 */
  
  /* Layout Spacing */
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
}

```

### 3.2 핵심 모의(Mock) 데이터 및 API 정의 (`src/lib/mockApi.ts`)

실제 백엔드가 연동되기 전, 80% 수준의 상호작용 체감을 위한 가짜 딜레이가 포함된 Mock API 함수 세트입니다.

```typescript
// 백엔드 통신 계약 규격에 맞춘 타입 정의
export interface ActionItem {
  owner: string;
  task: string;
  due: string;
}

export interface SummaryResponse {
  summary: string;
  action_items: ActionItem[];
}

// 1. Gemini 요약 Mock API
export async function mockSummarizeApi(text: string): Promise<SummaryResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5초 지연으로 로딩 스피너 유도
  
  if (!text.trim() || text.length < 10) {
    throw new Error("파싱 에러 또는 텍스트 부족"); // 예외 처리 테스트용
  }

  return {
    summary: "오늘 스크럼 회의의 핵심 내용을 요약한 텍스트입니다. 주기적인 백엔드 코드 보안 강화 및 프론트엔드-백엔드 간 구조화된 JSON 데이터 통신 규격을 확정했습니다.",
    action_items: [
      { owner: "홍길동", task: "백엔드 API 명세서 작성 및 공유", due: "2026-07-01" },
      { owner: "이영희", task: "프론트엔드 설정 페이지 UI 마크업", due: "2026-07-02" }
    ]
  };
}

// 2. 이메일 전송 Mock API
export async function mockSendEmailApi(summary: string, emails: string[]): Promise<{ success: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // 예외 처리 시뮬레이션용 (특정 조건 또는 랜덤 실패 구성 가능)
  if (emails.length === 0) {
    return { success: false };
  }
  return { success: true };
}

```

### 3.3 로컬 상태 및 LocalStorage 훅 (`src/hooks/useLocalStorage.ts`)

팀원 목록을 브라우저에 영구 저장하는 가벼운 유틸리티 훅입니다.

```typescript
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(storedValue));
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

```

---

## 4. 에러 및 예외 처리 UX 세부 명세

체험 단계에서 개발자와 사용자 모두가 완성도를 체감할 수 있도록 예외 시나리오를 인터랙션에 포함합니다.

1. **Gemini 변환 실패 시 (UI 대응)**
* 원문 텍스트가 비정상적이거나 Mock API에서 에러 발생 시, 결과 출력 컴포넌트 내에 연한 빨간색 카드 레이아웃으로 에러 박스를 렌더링합니다.
* 문구: `"요약 도출에 실패했습니다. 다시 시도해주세요."`
* 인터랙션: 에러 박스 우측 또는 하단에 `[다시 시도]` 버튼을 노출하여 사용자 액션을 즉시 유도합니다.


2. **이메일 전송 실패 시 (UI 대응)**
* SMTP 인증 만료나 가짜 네트워크 오류가 감지될 때, 상단에 토스트(Toast) 메시지 또는 경고 모달 창을 띄웁니다.
* 문구: `"일부 또는 전체 이메일 전송에 실패했습니다. 백엔드 설정을 확인하세요."`
* 인터랙션: 모달을 닫으면 이메일 발송 버튼이 다시 활성화(`disabled=false`)되어 상태를 원복합니다.


3. **이메일 유효성 검증 실패 시 (UI 대응)**
* 설정 탭에서 팀원 이메일을 입력 후 [추가] 버튼을 누를 때 정규식(`^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$`) 검증을 거칩니다.
* 실패 시: 인풋 폼의 하단 테두리가 빨간색(`border-red-500`)으로 변경되며 `올바른 이메일 형식이 아닙니다`라는 문구를 작고 붉은 폰트로 실시간 출력합니다.



---

## 5. 데모 시나리오 및 합의 체크리스트 (Phase 4)

프로토타입이 완성된 후, 로컬 데모 환경(`npm run dev`)에서 자가 점검 및 팀 내 합의를 진행할 때 사용하는 체크리스트입니다.

### 5.1 데모 주행 시나리오

1. **1단계 (설정)**: '팀원 이메일 관리' 탭으로 이동 ➔ 유효하지 않은 이메일 입력 후 에러 감지 확인 ➔ 정상 이메일 2~3개 추가 후 LocalStorage 저장 확인.
2. **2단계 (입력 및 생성)**: '회의 요약 및 전송' 탭으로 이동 ➔ 임의의 스크럼 텍스트 붙여넣기 ➔ [AI 요약...] 버튼 클릭 ➔ 1.5초간 로딩 스피너와 버튼 비활성화 상태 체감.
3. **3단계 (결과 및 발송)**: 파싱된 개요와 정돈된 액션 아이템 테이블 레이아웃 확인 ➔ [이메일 전송] 버튼 클릭 ➔ 성공 팝업 확인.

### 5.2 합의 피드백 기록 양식 (본 구현 인계용)

* **레이아웃/디자인 만족도**: 단일 페이지의 탭 구조가 직관적인가? (Y / N)
* **데이터 일치성**: Gemini의 응답 스키마와 테이블 컬럼(담당자, 업무, 기한) 매핑이 매끄러운가? (Y / N)
* **크리티컬 보안 준수**: 브라우저 레벨에서 Gemini API 키가 노출되지 않도록 구조화되었는가? (Y / 백엔드 `.env` 전제 확인 완료)
* **다음 단계 인계 사항**: 2단계 확장 기능을 위해 백엔드에서 `Gemini File API`를 통한 오디오 파일 업로드 엔드포인트 세팅 필요. 프론트엔드는 파일 드롭존 컴포넌트 준비 예정.
"""

# Write to file

file_name = "UI_Concept_Prototype_Documentation.md"
with open(file_name, "w", encoding="utf-8") as f:
f.write(markdown_content)

print(f"File {file_name} successfully written.")

```
요청하신 요구사항과 UI 프로토타입 작성 지침을 엄격히 준수하여 **Vite + React + TS + Tailwind** 스택 환경에 최적화된 **UI 컨셉 프로토타입 문서**를 작성하였습니다. 

작성된 문서는 바이브코딩 실습 과정의 흐름에 맞춰 요구사항 매트릭스 도출(Phase 1), 와이어프레임 설계(Phase 2), 모의 데이터 및 예외 처리 상태 관리 설계(Phase 3), 그리고 클라이언트 합의용 검증 체크리스트(Phase 4)까지 단계별로 상세히 포함하고 있습니다.

Your MD file is ready
[file-tag: code-generated-file-0-1782545896485954176]

---

### 💡 핵심 설계 포인트 반영 요약

1. **Phase 1 — UI 요구사항 추출 매트릭스**: 복잡한 비즈니스 로직을 배제하고 단일 페이지 어플리케이션(SPA) 내 2개 탭 구성으로 MVP 스코프를 컴팩트하게 제한했습니다.
2. **Phase 2 — 와이어프레임 & 컴포넌트 구조**: 텍스트 입력, 스피너 제어, Gemini JSON 응답 데이터 파싱 결과를 시각적인 테두리 테이블(`Table`) 형태로 깔끔하게 표현하도록 매핑했습니다.
3. **Phase 3 — 모의 데이터 및 상태 설계**: 로컬 실행 어플리케이션에 필수적인 `mockApi` 지연(1.5초) 함수와 브라우저 새로고침 시에도 팀원 목록이 유지되는 `LocalStorage` 커스텀 훅 예시 코드를 포함시켰습니다.
4. **UX 예외 처리 세분화**: 요구사항에 명시된 **Gemini 파싱 실패 시 [재시도] 유도**, **이메일 전송 실패 시 모달 경고**, **이메일 정규식 포맷 벨리데이션 에러 문구**를 인터랙션 조건에 정밀하게 규정했습니다.
5. **크리티컬 보안 지침 전제**: 클라이언트 사이드(`VITE_`) 키 노출을 철저히 금지하고 백엔드 서버의 환경변수를 중계하도록 아키텍처적 유의사항을 강조했습니다.

```


```