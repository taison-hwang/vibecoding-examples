# 바이브코딩 위자드 — AI 스크럼 회의록 요약기

`docs/tutorial` 의 실습 절차를 **단계별 프롬프트 위자드**로 만든 간단한 웹앱입니다.
각 단계마다 **어떤 LLM/도구에 무엇을 붙여넣어야 하는지**를 안내하고, 그 단계에서
사용할 **프롬프트를 마크다운 뷰로 보여주며 [프롬프트 복사] 버튼**으로 바로 복사할 수 있습니다.

## 실행 방법

```bash
# 권장 — 로컬 서버(확정 문서를 wizard/data 에 파일로 저장)
node wizard/server.mjs
#  → http://localhost:4173

# 저장 기능이 필요 없으면(읽기 전용) 정적 서버나 파일 열기도 가능
cd wizard && python3 -m http.server 4173   # 또는 index.html 더블클릭
```

> `node server.mjs` 로 띄우면 3·6·9단계에서 저장한 확정 문서가
> `wizard/data/user-docs/{URD,ADR,UI}.md` 에 **파일로 기록**됩니다.
> 정적 서버/`file://` 로 열면 파일 저장 없이 **브라우저(LocalStorage)** 에만 보관됩니다.
>
> 프롬프트 본문과 마크다운 렌더러(`marked`)는 모두 **로컬 포함**이라 인터넷 없이 동작합니다.

## 위자드 흐름 (총 10단계 · 4개 Phase)

| Phase | 단계 | 도구 | 역할 |
|---|---|---|---|
| 1. 요구사항 정의서(URD) | 1 | Gemini | 초안 생성 |
|  | 2 | Claude | 비판적 리뷰 |
|  | 3 | Gemini | 리뷰 반영·개선 → `04-final-urd.md` |
| 2. 아키텍처 결정 기록(ADR) | 4 | Gemini | 초안 생성 |
|  | 5 | Claude | 비판적 리뷰 |
|  | 6 | Gemini | 리뷰 반영·개선 → `08-final-adr.md` |
| 3. UI 컨셉·프로토타입 | 7 | Gemini | 초안 생성 |
|  | 8 | Claude | 비판적 리뷰 |
|  | 9 | Gemini | 리뷰 반영·개선 → `12-final-ui.md` |
| 4. 구현 | 10 | **Antigravity** | 설계 문서 3종 기반 구현·테스트 |

각 Phase는 **Gemini 초안 → Claude 교차 리뷰 → Gemini 개선**의 동일한 패턴을 따릅니다.
마지막 Phase 4에서 확정된 3개 문서(URD·ADR·UI)를 **Antigravity** 에이전트에 넘겨
실제 코드 생성·로컬 실행·테스트까지 진행합니다.

## 주요 기능

- 좌측 단계 네비게이션 + 진행률(완료 단계는 LocalStorage에 저장)
- 단계별 **도구 안내 카드**(Gemini/Claude/Antigravity, 모델/모드, 바로가기 링크)
- 프롬프트 **미리보기(마크다운 렌더) / 원문** 토글
- **이전 단계 LLM 결과 = 빈 입력창**: 각 단계 프롬프트에서 직전 LLM 출력이 들어갈
  자리는 비워 두고, 학습자가 자기 결과를 붙여넣습니다(입력값도 LocalStorage 저장).
- **프롬프트 복사** 버튼 — 붙여넣은 입력값을 합쳐 완성된 프롬프트를 복사
  (+ Phase 4의 후속 확장 프롬프트: Gmail 연동·마이크 입력)
- 이전/다음 버튼, 단계 점프 도트, 키보드 ←/→ 이동, 반응형 레이아웃

> 입력창이 생기는 단계: 2·3·5·6·8·9 (같은 Phase 내 직전 LLM 결과를 받는 단계).
> 1단계(초기 요구사항)와 10단계(Antigravity, `@docs/final-docs` 파일 참조)는 입력창이 없습니다.

## 확정 문서: 사용자가 생성·저장 → 자동 주입

확정 설계서는 **강사용 모범답안(`docs/final-docs`)이 아니라, 학습자가 위자드 프롬프트로
LLM에서 직접 생성해 저장한 문서**입니다. 흐름은 이렇습니다.

1. **생성**: 단계 프롬프트를 복사 → LLM 실행 → 최종 문서를 받는다.
2. **저장**: 그 결과를 해당 단계의 **"확정 저장"** 카드에 붙여넣는다
   → `wizard/data/user-docs/{URD,ADR,UI}.md` 로 저장(서버 실행 시 파일, 아니면 LocalStorage).
3. **자동 주입**: 다음 생성 단계에서 위에서 저장한 확정 문서가 자동으로 들어간다.

| 저장(produces) | 단계 | 저장 위치 |
|---|---|---|
| 확정 URD | 3단계 | `wizard/data/user-docs/URD.md` |
| 확정 ADR | 6단계 | `wizard/data/user-docs/ADR.md` |
| 확정 UI | 9단계 | `wizard/data/user-docs/UI.md` |

| 자동 주입(inject) | 단계 | 주입되는 확정 문서 |
|---|---|---|
| ADR 생성 | 4단계 | 3단계의 확정 **URD** |
| UI 생성 | 7단계 | 3단계 확정 **URD** + 6단계 확정 **ADR** |
| 구현(Antigravity) | 10단계 | `@wizard/data/user-docs` 의 URD·ADR·UI 직접 참조 |

> 아직 저장 전이면 주입 블록이 비어 있고 경고가 표시됩니다.
> 막혔을 때를 위해 각 저장 카드에 **"예시(모범답안) 채우기"** 버튼이 있어
> `docs/final-docs` 의 참고본을 불러와 검토·수정할 수 있습니다(자동 사용 아님).

### 생성 단계에는 지침문서가 항상 포함됩니다

각 문서의 **최초 생성 단계**에는 해당 작성지침(`docs/guide/*`)이 프롬프트에 함께 들어갑니다.
빌드 시 자동 검증되며(`gen-data.mjs`), 누락되면 빌드가 실패합니다.

| 생성 단계 | 포함되는 지침 |
|---|---|
| 1단계 (URD 생성) | 요구사항 분석 어시스턴트 지침 |
| 4단계 (ADR 생성) | ADR 생성 어시스턴트 지침 |
| 7단계 (UI 생성) | UI 컨셉·프로토타입 어시스턴트 지침 |

## 구조

```
wizard/
├── index.html            # 앱 셸
├── server.mjs            # 정적 서빙 + 확정 문서 저장/로드 API(node로 실행)
├── assets/
│   ├── app.js            # 위자드 로직(네비·렌더·복사·저장/주입)
│   ├── styles.css        # 스타일
│   └── marked.min.js     # 마크다운 렌더러(로컬 포함)
├── data/
│   ├── prompts.js        # 단계 데이터(자동 생성, window.WIZARD_DATA)
│   ├── user-docs/        # ★ 사용자가 저장한 확정 문서 URD/ADR/UI.md (자동 주입 소스)
│   └── final-docs/       # 참고용 모범답안("예시 채우기" 버튼 전용)
└── build/
    └── gen-data.mjs      # 프롬프트에서 prompts.js 재생성 + 검증
```

## 프롬프트 내용 수정 / 재생성

프롬프트 본문은 `docs/prompts-in-llm/*.md` 의 실제 파일에서 생성됩니다.
원본을 고친 뒤 아래로 다시 빌드하세요.

```bash
node wizard/build/gen-data.mjs
```
