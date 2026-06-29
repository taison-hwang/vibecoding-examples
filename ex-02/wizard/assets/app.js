/* 바이브코딩 위자드 — 단계별 프롬프트 가이드 */
(function () {
  "use strict";

  const DATA = window.WIZARD_DATA;
  if (!DATA) {
    document.body.innerHTML =
      '<p style="padding:40px;font-family:sans-serif">데이터를 불러오지 못했습니다. data/prompts.js 를 확인하세요.</p>';
    return;
  }

  const STEPS = DATA.steps;
  const TOOLS = DATA.tools;
  const STORAGE = "vc-wizard-state";

  // 상태: 현재 단계 + 완료 단계
  let state = { current: 0, done: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
    if (typeof saved.current === "number") state.current = saved.current;
    if (Array.isArray(saved.done)) state.done = saved.done;
  } catch (_) {}

  const save = () => localStorage.setItem(STORAGE, JSON.stringify(state));

  // 렌더 모드(미리보기/원문) — 단계별 기억
  const viewMode = {}; // stepNo -> 'preview' | 'raw'

  // 입력창(이전 단계 LLM 결과) 값 — 단계/파트별 저장
  const INPUTS_KEY = "vc-wizard-inputs";
  let inputs = {};
  try {
    inputs = JSON.parse(localStorage.getItem(INPUTS_KEY) || "{}");
  } catch (_) {}
  const inputKey = (stepNo, idx) => stepNo + ":" + idx;
  const getInput = (stepNo, idx) => inputs[inputKey(stepNo, idx)] || "";
  const setInput = (stepNo, idx, val) => {
    inputs[inputKey(stepNo, idx)] = val;
    localStorage.setItem(INPUTS_KEY, JSON.stringify(inputs));
  };

  // 확정 산출물(URD/ADR/UI) — 사용자가 위자드에서 생성·저장한 최종 문서.
  // wizard/data/user-docs/ 에 파일로 저장(서버 연결 시) + LocalStorage 캐시.
  const ARTI_KEY = "vc-wizard-artifacts";
  let artifacts = {};
  try {
    artifacts = JSON.parse(localStorage.getItem(ARTI_KEY) || "{}");
  } catch (_) {}
  let serverOnline = false;
  const saveTimers = {};
  const getArtifact = (id) => artifacts[id] || "";
  function setArtifact(id, val) {
    artifacts[id] = val;
    localStorage.setItem(ARTI_KEY, JSON.stringify(artifacts));
    clearTimeout(saveTimers[id]);
    saveTimers[id] = setTimeout(() => serverSave(id, val), 600);
  }
  async function serverSave(id, val) {
    try {
      const r = await fetch("./api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, content: val }),
      });
      const j = await r.json();
      if (j.ok) {
        serverOnline = true;
        updateSaveStatus(id, j.path, j.bytes);
      }
    } catch (_) {
      /* 서버 미연결 → LocalStorage 캐시만 사용 */
    }
  }
  async function hydrateFromServer() {
    try {
      const r = await fetch("./api/load");
      const j = await r.json();
      if (j && j.ok) {
        serverOnline = true;
        Object.entries(j.docs).forEach(([id, content]) => {
          if (content) artifacts[id] = content;
        });
        localStorage.setItem(ARTI_KEY, JSON.stringify(artifacts));
        renderNav();
        renderStage();
      }
    } catch (_) {
      /* 정적 서버/file:// → LocalStorage 캐시로 동작 */
    }
  }
  function updateSaveStatus(id, path, bytes) {
    const el = document.getElementById("produceStatus");
    if (el && el.dataset.id === id) {
      el.textContent =
        "저장됨 · " + bytes + " bytes → " + (path || "wizard/data/user-docs/" + id + ".md");
      el.className = "produce-status ok";
    }
  }

  // ---- DOM refs ----
  const $ = (id) => document.getElementById(id);
  const navEl = $("nav");
  const stageEl = $("stage");
  const toastEl = $("toast");

  $("projectTitle").textContent = DATA.meta.project;
  $("projectSubtitle").textContent = DATA.meta.subtitle;

  marked.setOptions({ breaks: false, gfm: true });

  function toolClass(tool) {
    return "t-" + (TOOLS[tool] ? TOOLS[tool].color : tool);
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // 폴백
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (e) {}
      document.body.removeChild(ta);
    }
    toast("프롬프트를 복사했습니다 ✓");
    if (btn) {
      const orig = btn.dataset.label;
      btn.classList.add("copied");
      btn.querySelector(".copy-label").textContent = "복사됨!";
      clearTimeout(btn._t);
      btn._t = setTimeout(() => {
        btn.classList.remove("copied");
        btn.querySelector(".copy-label").textContent = orig;
      }, 1600);
    }
  }

  // ---------- 사이드바 네비 ----------
  function renderNav() {
    navEl.innerHTML = "";
    let lastPhase = null;
    STEPS.forEach((s, i) => {
      if (s.phase !== lastPhase) {
        const ph = document.createElement("div");
        ph.className = "nav-phase";
        ph.textContent = "Phase " + s.phase + " · " + s.phaseTitle;
        navEl.appendChild(ph);
        lastPhase = s.phase;
      }
      const item = document.createElement("div");
      item.className = "nav-item";
      if (i === state.current) item.classList.add("active");
      if (state.done.includes(i)) item.classList.add("done");
      const tool = TOOLS[s.tool];
      item.innerHTML =
        '<span class="nav-num">' +
        (state.done.includes(i) ? "✓" : s.stepNo) +
        "</span>" +
        '<span class="nav-label">' +
        s.title +
        "</span>" +
        '<span class="nav-tool ' +
        toolClass(s.tool) +
        '">' +
        tool.badge +
        "</span>";
      item.addEventListener("click", () => goTo(i));
      navEl.appendChild(item);
    });

    const total = STEPS.length;
    const pct = Math.round((state.done.length / total) * 100);
    $("progressFill").style.width = pct + "%";
    $("progressText").textContent =
      state.done.length + " / " + total + " 단계 완료 (" + pct + "%)";
  }

  // ---------- 메인 스테이지 ----------
  function renderStage() {
    const s = STEPS[state.current];
    const tool = TOOLS[s.tool];
    const mode = viewMode[s.stepNo] || "preview";

    const linkHtml = tool.url
      ? '<a class="target-link" href="' +
        tool.url +
        '" target="_blank" rel="noopener">' +
        tool.badge +
        " 열기 ↗</a>"
      : '<span class="target-link" style="cursor:default;opacity:.6">로컬 도구</span>';

    stageEl.innerHTML = [
      '<div class="step-head">',
      '  <span class="phase-chip">Phase ' + s.phase + " · " + s.phaseTitle + "</span>",
      '  <span class="role-chip ' + toolClass(s.tool) + '">' + s.role + "</span>",
      "</div>",
      '<h2 class="step-title">' + s.stepNo + ". " + s.title + "</h2>",
      '<p class="step-goal">' + s.goal + "</p>",

      // 도구 안내
      '<div class="target-card">',
      '  <div class="target-icon ' + toolClass(s.tool) + '">' + tool.badge.slice(0, 2) + "</div>",
      '  <div class="target-body">',
      '    <div class="target-row">',
      '      <span class="target-name">' + tool.name + "</span>",
      "    </div>",
      '    <div class="target-model">모델/모드: ' + tool.model + "</div>",
      '    <div class="target-hint">' + tool.hint + "</div>",
      "  </div>",
      "  " + linkHtml,
      "</div>",

      // 프롬프트 패널
      '<div class="prompt-panel">',
      '  <div class="prompt-bar">',
      '    <div class="prompt-bar-left">',
      '      <span class="prompt-bar-title">붙여넣을 프롬프트</span>',
      s.file ? '      <span class="prompt-bar-file">' + s.file + "</span>" : "",
      "    </div>",
      '    <div class="prompt-bar-left">',
      '      <div class="seg" id="segView">',
      '        <button data-m="preview" class="' + (mode === "preview" ? "active" : "") + '">미리보기</button>',
      '        <button data-m="raw" class="' + (mode === "raw" ? "active" : "") + '">원문</button>',
      "      </div>",
      '      <button class="copy-btn" id="copyBtn" data-label="프롬프트 복사">',
      '        <span>⧉</span><span class="copy-label">프롬프트 복사</span>',
      "      </button>",
      "    </div>",
      "  </div>",
      '  <div class="prompt-body" id="promptBody"></div>',
      "</div>",

      // 확정 문서 저장(produces)
      s.produces ? '<div id="produceHost"></div>' : "",

      // 산출물 안내
      '<div class="info-grid">',
      '  <div class="info-card">',
      '    <h4><span class="dot"></span>이 단계의 산출물 · 다음 할 일</h4>',
      "    <p>" + s.output + "</p>",
      "  </div>",
      "</div>",

      // 후속 프롬프트(있으면)
      s.followups ? renderFollowups(s.followups) : "",
    ].join("\n");

    // 프롬프트 본문(파트별) 렌더
    renderParts(s, mode);

    // 확정 문서 저장 카드
    if (s.produces) renderProduce(s);

    // 뷰 토글
    $("segView").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      viewMode[s.stepNo] = b.dataset.m;
      $("segView").querySelectorAll("button").forEach((x) =>
        x.classList.toggle("active", x === b)
      );
      renderParts(s, b.dataset.m);
    });

    // 복사 (입력창 값 포함)
    $("copyBtn").addEventListener("click", function () {
      copyText(buildPromptText(s), this);
    });

    // 후속 프롬프트 복사 버튼
    stageEl.querySelectorAll("[data-fu]").forEach((btn) => {
      btn.addEventListener("click", function () {
        copyText(s.followups[+this.dataset.fu].prompt, null);
        toast("후속 프롬프트를 복사했습니다 ✓");
      });
    });

    renderStepNav();
  }

  // 프롬프트를 파트별로 렌더(고정 텍스트 + 입력창)
  function renderParts(s, mode) {
    const body = $("promptBody");
    body.innerHTML = "";
    s.parts.forEach((p, idx) => {
      if (p.type === "text") {
        if (mode === "raw") {
          const pre = document.createElement("pre");
          pre.className = "raw-view";
          pre.textContent = p.md;
          body.appendChild(pre);
        } else {
          const div = document.createElement("div");
          div.className = "markdown-view";
          div.innerHTML = marked.parse(p.md);
          body.appendChild(div);
        }
        return;
      }
      if (p.type === "inject") {
        const wrap = document.createElement("div");
        const resolved = resolveInject(p);
        const missing = p.artifacts.filter((a) => !getArtifact(a.id));
        wrap.className = "inject" + (missing.length ? " inject-missing" : "");

        const srcList = p.artifacts
          .map((a) => {
            const has = !!getArtifact(a.id);
            return (
              '<span class="src-item ' + (has ? "have" : "miss") + '">' +
              (has ? "✓ " : "⚠ ") +
              escapeHtml(a.title) +
              ' <code>wizard/data/user-docs/' + a.id + ".md</code>" +
              (has ? "" : " — " + a.fromStep + "단계에서 먼저 저장") +
              "</span>"
            );
          })
          .join("");

        wrap.innerHTML =
          '<div class="inject-head">' +
          '<span class="inject-badge">자동 주입</span>' +
          '<span class="slot-label">' + p.label + "</span>" +
          "</div>" +
          '<div class="slot-hint">' + p.hint + "</div>" +
          '<div class="inject-src">' + srcList + "</div>" +
          (missing.length
            ? '<div class="inject-warn">⚠ 아직 저장되지 않은 확정 문서가 있어 주입 내용이 비어 있습니다. 해당 단계에서 먼저 생성·저장하세요.</div>'
            : "");

        const det = document.createElement("details");
        det.innerHTML =
          "<summary>주입되는 내용 미리보기 (" + resolved.length + "자) — 펼치기</summary>";
        const pre = document.createElement("pre");
        pre.className = "raw-view inject-body";
        pre.textContent = p.open + "\n" + resolved + "\n" + p.close;
        det.appendChild(pre);
        wrap.appendChild(det);
        body.appendChild(wrap);
        return;
      }
      // input slot
      const wrap = document.createElement("div");
      wrap.className = "slot";
      const val = getInput(s.stepNo, idx);
      wrap.innerHTML =
        '<div class="slot-head">' +
        '<span class="slot-badge">붙여넣기</span>' +
        '<span class="slot-label">' + p.label + "</span>" +
        "</div>" +
        '<div class="slot-hint">' + p.hint + "</div>" +
        '<div class="slot-fence">' + escapeHtml(p.open) + "</div>";
      const ta = document.createElement("textarea");
      ta.className = "slot-input";
      ta.placeholder = p.placeholder;
      ta.value = val;
      ta.spellcheck = false;
      ta.addEventListener("input", function () {
        setInput(s.stepNo, idx, this.value);
        autoGrow(this);
      });
      wrap.appendChild(ta);
      const fenceClose = document.createElement("div");
      fenceClose.className = "slot-fence";
      fenceClose.textContent = p.close;
      wrap.appendChild(fenceClose);
      body.appendChild(wrap);
      autoGrow(ta);
    });
  }

  // 확정 문서 저장 카드(produces) — 사용자가 LLM 산출물을 저장 → wizard/data/user-docs
  function renderProduce(s) {
    const host = $("produceHost");
    if (!host) return;
    const pr = s.produces;
    const val = getArtifact(pr.id);
    host.innerHTML =
      '<div class="produce">' +
      '<div class="produce-head">' +
      '<span class="produce-badge">확정 저장</span>' +
      '<span class="slot-label">' + pr.title + " — 확정본 저장</span>" +
      "</div>" +
      '<div class="slot-hint">' + pr.hint + "</div>" +
      '<div class="produce-actions">' +
      '<button class="btn-mini" id="exampleBtn">예시(모범답안) 채우기</button>' +
      '<span class="produce-status' + (val ? " ok" : "") + '" id="produceStatus" data-id="' + pr.id + '"></span>' +
      "</div>" +
      '<textarea class="slot-input produce-input" id="produceInput" spellcheck="false" ' +
      'placeholder="여기에 LLM이 생성한 최종 ' + escapeHtml(pr.title) + ' 전체를 붙여넣어 저장하세요…"></textarea>' +
      "</div>";

    const ta = $("produceInput");
    ta.value = val;
    autoGrow(ta);
    setProduceStatus(pr, ta.value, true);

    ta.addEventListener("input", function () {
      setArtifact(pr.id, this.value);
      autoGrow(this);
      setProduceStatus(pr, this.value, false);
    });
    $("exampleBtn").addEventListener("click", function () {
      ta.value = pr.example;
      setArtifact(pr.id, pr.example);
      autoGrow(ta);
      setProduceStatus(pr, ta.value, false);
      toast("예시(모범답안)를 채웠습니다 — 검토 후 수정하세요");
    });
  }

  function setProduceStatus(pr, val, initial) {
    const el = $("produceStatus");
    if (!el) return;
    if (!val) {
      el.textContent = "미저장";
      el.className = "produce-status";
      return;
    }
    const bytes = new Blob([val]).size;
    if (serverOnline) {
      el.textContent =
        (initial ? "저장됨" : "저장 중…") + " · " + bytes + " bytes → wizard/data/" + pr.saveAs;
    } else {
      el.textContent = "브라우저 저장됨 · " + bytes + " bytes (서버 연결 시 wizard/data 에 파일로 기록)";
    }
    el.className = "produce-status ok";
  }

  function autoGrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight + 2, 360) + "px";
  }

  // 자동 주입 블록의 실제 내용을 사용자 산출물에서 해석
  function resolveInject(p) {
    return p.artifacts
      .map((a) => getArtifact(a.id))
      .filter(Boolean)
      .join("\n\n---\n\n");
  }

  // 복사용 전체 프롬프트 조립(고정 텍스트 + 입력값 + 자동 주입 문서)
  function buildPromptText(s) {
    return s.parts
      .map((p, idx) => {
        if (p.type === "text") return p.md;
        if (p.type === "inject") return p.open + "\n" + resolveInject(p) + "\n" + p.close;
        const v = getInput(s.stepNo, idx);
        return p.open + "\n" + v + "\n" + p.close;
      })
      .join("\n\n");
  }

  function renderFollowups(fus) {
    const items = fus
      .map(
        (f, i) =>
          '<div class="fu">' +
          '<div class="fu-bar"><span class="fu-title">' +
          f.title +
          "</span>" +
          '<button class="copy-btn" data-fu="' +
          i +
          '"><span>⧉</span><span>복사</span></button></div>' +
          "<pre>" +
          escapeHtml(f.prompt) +
          "</pre></div>"
      )
      .join("");
    return (
      '<div class="followups"><h3>↳ 후속 확장 프롬프트 (구현 후 이어서)</h3>' +
      items +
      "</div>"
    );
  }

  function escapeHtml(t) {
    return t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ---------- 하단 네비 ----------
  function renderStepNav() {
    const dots = $("stepDots");
    dots.innerHTML = "";
    STEPS.forEach((s, i) => {
      const d = document.createElement("span");
      d.className = "dot";
      if (i === state.current) d.classList.add("active");
      else if (state.done.includes(i)) d.classList.add("done");
      d.title = s.stepNo + ". " + s.title;
      d.addEventListener("click", () => goTo(i));
      dots.appendChild(d);
    });
    const prev = $("prevBtn");
    const next = $("nextBtn");
    prev.disabled = state.current === 0;
    next.textContent =
      state.current === STEPS.length - 1 ? "완료 ✓" : "다음 단계 →";
  }

  // ---------- 네비게이션 ----------
  function goTo(i) {
    if (i < 0 || i >= STEPS.length) return;
    state.current = i;
    save();
    renderNav();
    renderStage();
    stageEl.scrollTop = 0;
  }

  $("prevBtn").addEventListener("click", () => goTo(state.current - 1));
  $("nextBtn").addEventListener("click", () => {
    // 현재 단계 완료 처리
    if (!state.done.includes(state.current)) state.done.push(state.current);
    save();
    if (state.current < STEPS.length - 1) goTo(state.current + 1);
    else {
      renderNav();
      renderStepNav();
      toast("모든 단계를 완료했습니다 🎉");
    }
  });

  // 키보드 좌우 이동
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight") goTo(state.current + 1);
    if (e.key === "ArrowLeft") goTo(state.current - 1);
  });

  // ---------- 초기 렌더 ----------
  renderNav();
  renderStage();
  hydrateFromServer(); // 서버 연결 시 wizard/data/user-docs 의 확정 문서를 불러와 동기화
})();
