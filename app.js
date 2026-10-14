// ==========================================================================
// 매경 기사 자동 작성 솔루션 - 1번 자료 -> 3번 기사 실시간 자동 조립 엔진
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // DOM 요소 참조
  const mainTabs = document.querySelectorAll(".main-tab");
  const geoFormatContainer = document.getElementById("geoFormatContainer");
  const subTabs = document.querySelectorAll(".sub-tab");
  const currentStyleBadge = document.getElementById("currentStyleBadge");

  // 버튼들
  const generateArticleBtn = document.getElementById("generateArticleBtn");
  const loadSample1Btn = document.getElementById("loadSample1Btn");
  const loadSample2Btn = document.getElementById("loadSample2Btn");
  const loadSample3Btn = document.getElementById("loadSample3Btn");
  const loadSample4Btn = document.getElementById("loadSample4Btn");
  const loadSample5Btn = document.getElementById("loadSample5Btn");
  const clearInputsBtn = document.getElementById("clearInputsBtn");

  // 제목 후보 관련 (싱글 뷰 & 새로고침 스타일 전환)
  const activeTitleDisplay = document.getElementById("activeTitleDisplay");
  const titleStyleTag = document.getElementById("titleStyleTag");
  const titleCounterBadge = document.getElementById("titleCounterBadge");
  const refreshTitleBtn = document.getElementById("refreshTitleBtn");
  const editActiveTitleBtn = document.getElementById("editActiveTitleBtn");
  const copyActiveTitleBtn = document.getElementById("copyActiveTitleBtn");
  const titleEditBox = document.getElementById("titleEditBox");
  const directTitleInput = document.getElementById("directTitleInput");
  const saveTitleEditBtn = document.getElementById("saveTitleEditBtn");
  const cancelTitleEditBtn = document.getElementById("cancelTitleEditBtn");
  const charCountBadge = document.getElementById("charCountBadge");

  // 기사 미리보기 및 복사
  const previewContainer = document.getElementById("previewContainer");
  const copyAllTopBtn = document.getElementById("copyAllTopBtn");
  const toastNotice = document.getElementById("toastNotice");
  const toggleFactHighlight = document.getElementById("toggleFactHighlight");

  // 1번 입력 요소들
  const pressReleaseText = document.getElementById("pressReleaseText");
  const pressReleaseFile = document.getElementById("pressReleaseFile");
  const fileUploadStatus = document.getElementById("fileUploadStatus");
  const addUrlBtn = document.getElementById("addUrlBtn");
  const urlListContainer = document.getElementById("urlListContainer");
  const pdfDropzone = document.getElementById("pdfDropzone");
  const pdfFileInput = document.getElementById("pdfFileInput");
  const pdfFileName = document.getElementById("pdfFileName");

  // 복수 브랜드 자동 분리 (방안 C) 요소
  const autoSplitBrandsBtn = document.getElementById("autoSplitBrandsBtn");
  const multiBrandPanel = document.getElementById("multiBrandPanel");
  const multiBrandCount = document.getElementById("multiBrandCount");
  const addSingleBrandCardBtn = document.getElementById("addSingleBrandCardBtn");
  const closeMultiBrandPanelBtn = document.getElementById("closeMultiBrandPanelBtn");
  const multiBrandTheme = document.getElementById("multiBrandTheme");
  const brandCardsContainer = document.getElementById("brandCardsContainer");

  // 추가 선택 정보
  const optionalToggle = document.getElementById("optionalToggle");
  const optionalFields = document.getElementById("optionalFields");
  const optionalIndicator = document.getElementById("optionalIndicator");
  const brandNameInput = document.getElementById("brandNameInput");
  const keyPointInput = document.getElementById("keyPointInput");

  // 레이아웃 전환 요소
  const appContainer = document.getElementById("appContainer");
  const toggleLayoutBtn = document.getElementById("toggleLayoutBtn");
  const layoutToggleIcon = document.getElementById("layoutToggleIcon");
  const layoutToggleText = document.getElementById("layoutToggleText");

  // 현재 상태 관리
  let currentMainStyle = "ad"; // 'ad' (기사식 광고) | 'geo' (GEO 기사)
  let currentGeoFormat = "info"; // 'info' | 'interview' | 'compare' | 'recommend' | 'story'
  let currentLayoutMode = localStorage.getItem("mk_layout_mode") || "horizontal"; // 'horizontal' (가로 분할) | 'vertical' (세로 롤백)
  let isMultiBrandMode = false; // 복수 브랜드 모음 모드 여부
  let multiBrandList = []; // [ { id, brand, campaign, benefit, content } ]
  let multiBrandIntro = ""; // 복수 브랜드 자료 맨 앞의 도입부 원문

  // 레이아웃 모드 적용 함수
  function applyLayoutMode(mode, notify = false) {
    currentLayoutMode = mode;
    localStorage.setItem("mk_layout_mode", mode);

    if (mode === "horizontal") {
      appContainer.classList.add("layout-horizontal");
      appContainer.classList.remove("layout-vertical");
      if (layoutToggleIcon) layoutToggleIcon.textContent = "▤";
      if (layoutToggleText) layoutToggleText.textContent = "화면 세로로 보기 (롤백)";
      if (notify) showToast("✓ 좌우 가로 분할 모드로 변경되었습니다. (왼쪽: 자료 입력 / 오른쪽: 기사 확인)");
    } else {
      appContainer.classList.add("layout-vertical");
      appContainer.classList.remove("layout-horizontal");
      if (layoutToggleIcon) layoutToggleIcon.textContent = "◫";
      if (layoutToggleText) layoutToggleText.textContent = "화면 가로로 보기 (좌우 분할)";
      if (notify) showToast("✓ 기존 상하 세로 모드로 롤백되었습니다.");
    }
  }

  // 확장바(Resizer) 요소 참조
  const splitResizer = document.getElementById("splitResizer");

  // 저장된 왼쪽 입력창 너비 복원 (기본값: 480px)
  const savedEditorWidth = localStorage.getItem("mk_editor_width") || "480";
  appContainer.style.setProperty("--editor-width", `${savedEditorWidth}px`);

  // 확장바 드래그 크기 조절 로직
  if (splitResizer) {
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    splitResizer.addEventListener("mousedown", (e) => {
      // 세로 모드일 때는 작동 안 함
      if (currentLayoutMode === "vertical") return;

      isDragging = true;
      startX = e.clientX;
      const editorCol = document.querySelector(".editor-column");
      startWidth = editorCol ? editorCol.getBoundingClientRect().width : 480;

      document.body.classList.add("resizing");
      splitResizer.classList.add("is-dragging");
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      // 최소 320px, 최대 (화면 전체 너비 - 420px) 사이로 제한
      const maxAllowedWidth = Math.max(500, window.innerWidth - 450);
      const newWidth = Math.round(Math.max(320, Math.min(maxAllowedWidth, startWidth + deltaX)));

      appContainer.style.setProperty("--editor-width", `${newWidth}px`);
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove("resizing");
      splitResizer.classList.remove("is-dragging");

      // 조절된 너비 저장
      const editorCol = document.querySelector(".editor-column");
      if (editorCol) {
        const finalWidth = Math.round(editorCol.getBoundingClientRect().width);
        localStorage.setItem("mk_editor_width", finalWidth);
      }
    });

    // 더블클릭 시 기본 크기(480px)로 원터치 초기화
    splitResizer.addEventListener("dblclick", () => {
      if (currentLayoutMode === "vertical") return;
      appContainer.style.setProperty("--editor-width", "480px");
      localStorage.setItem("mk_editor_width", "480");
      showToast("✓ 분할 크기가 기본 크기(480px)로 초기화되었습니다.");
    });
  }

  // 레이아웃 토글 버튼 이벤트
  if (toggleLayoutBtn) {
    toggleLayoutBtn.addEventListener("click", () => {
      const nextMode = currentLayoutMode === "horizontal" ? "vertical" : "horizontal";
      applyLayoutMode(nextMode, true);
    });
  }

  // 초기 레이아웃 적용
  applyLayoutMode(currentLayoutMode, false);

  // 팩트체크 수치 강조 토글
  if (toggleFactHighlight) {
    toggleFactHighlight.addEventListener("change", (e) => {
      document.body.classList.toggle("fact-highlight-disabled", !e.target.checked);
      showToast(e.target.checked ? "팩트 수치 강조가 켜졌습니다." : "팩트 수치 강조가 꺼졌습니다.");
    });
  }

  // 실시간 생성된 기사 데이터 모델
  let generatedArticleData = null;

  // 토스트 알림
  let toastTimer = null;
  function showToast(message) {
    if (!toastNotice) return;
    toastNotice.textContent = message;
    toastNotice.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotice.classList.remove("show");
    }, 2400);
  }

  // 클립보드 복사
  async function copyTextToClipboard(text, successMessage) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast(successMessage || "클립보드에 복사되었습니다.");
    } catch (err) {
      console.error("복사 실패:", err);
      showToast("복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    }
  }

  // ==========================================================================
  // 원문 분석 도우미: 보도자료에 실제로 있는 문장·수치만 꺼내 쓴다 (지어내지 않기)
  // ==========================================================================
  const RE_AMOUNT = /(?:약\s*|최대\s*|총\s*)?\d[\d,]*(?:\.\d+)?\s*(?:조\s*\d[\d,]*억\s*원|조\s*원|억\s*원|만\s*원|천\s*원|원|달러|유로|%|퍼센트)/g;
  const RE_COUNT = /\d[\d,]*(?:\.\d+)?\s*(?:척|명|개사|개국|개|곳|배|건|톤|주년|가구|가정)/g;
  const RE_DATE = /\d{4}년(?:\s*\d{1,2}월)?(?:\s*\d{1,2}일)?|\d{1,2}월\s*\d{1,2}일(?:\s*~\s*(?:\d{1,2}월\s*)?\d{1,2}일)?/g;
  const T_AMOUNT = new RegExp(RE_AMOUNT.source);
  const T_COUNT = new RegExp(RE_COUNT.source);
  const T_DATE = new RegExp(RE_DATE.source);

  const uniq = (arr) => [...new Set(arr.map(s => s.trim()).filter(Boolean))];
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 받침 유무에 따라 조사 선택 (예: 삼성전자는 / 카카오는)
  function hasBatchim(word) {
    const ch = (word || "").trim().slice(-1);
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 !== 0;
    return /[013678LMNR]$/i.test(ch);
  }
  const josa = (word, withB, withoutB) => word + (hasBatchim(word) ? withB : withoutB);

  function splitSentences(paras) {
    return paras
      .flatMap(p => p.split(/(?<=[.!?])\s+/))
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }

  // 단어 경계에서 자르기 (말줄임표 없이)
  function shorten(text, max) {
    if (!text || text.length <= max) return text || "";
    const cut = text.slice(0, max);
    const sp = cut.lastIndexOf(" ");
    return (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[,·\s]+$/, "");
  }

  // 리드 문장을 제목용 핵심구로 압축 ("~했다고 31일 밝혔다" 꼬리와 주어 제거)
  function toHeadlineCore(sentence, company) {
    let s = (sentence || "").trim().replace(/\.$/, "");
    s = s.replace(/고\s*(?:\d{1,2}일\s*)?(?:밝혔다|전했다|발표했다|말했다)$/, "");
    s = s.replace(/(?:했|하였|됐|되었)다$/, "").replace(/한다$/, "");
    if (company) s = s.replace(new RegExp("^" + escapeRegExp(company) + "(?:은|는|이|가|도)?\\s*,?\\s*"), "");
    s = s.replace(/에 대한 /g, " ").replace(/([가-힣])(?:을|를)\s+([가-힣]+)$/, "$1 $2");
    return s.trim();
  }

  // ==========================================================================
  // 문체 다듬기 (규칙 기반, 내용 추가 없음)
  // - 문장 끝 '~합니다/~습니다/~입니다'를 기사체 '~한다/~다/~이다'로 바꾼다
  // - 따옴표로 끝나는 인용 문장은 건드리지 않는다
  // ==========================================================================
  const JONG_B = 17, JONG_N = 4, JONG_SS = 20;
  const ADJ_B_WORDS = ["큽", "다릅", "바쁩", "아픕", "예쁩", "기쁩", "슬픕", "비쌉", "짭", "고픕", "나쁩", "빠릅", "느립", "아닙"];
  const ADJ_SEUP_STEMS = "없같좋많싫낫넓높낮깊작적짧늦굵옳맑밝젊찮";
  const jong = (ch) => (ch.charCodeAt(0) - 0xAC00) % 28;
  const setJong = (ch, j) => String.fromCharCode(ch.charCodeAt(0) - jong(ch) + j);

  function toPlainEnding(sentence) {
    const m = sentence.match(/^([\s\S]*?)([가-힣])(습니다|니다)([.!]?)$/);
    if (!m) return sentence;
    const [, head, ch, ending, punct] = m;
    const prev = head.slice(-1);
    let tail;
    if (ending === "습니다") {
      tail = (jong(ch) === JONG_SS || ADJ_SEUP_STEMS.includes(ch)) ? `${ch}다` : `${ch}는다`;
    } else if (jong(ch) === JONG_B) {
      if (ch === "입") tail = "이다";
      else if (ADJ_B_WORDS.includes(ch) || ADJ_B_WORDS.includes(prev + ch)) tail = `${setJong(ch, 0)}다`;
      else tail = `${setJong(ch, JONG_N)}다`;
    } else {
      return sentence;
    }
    return `${head}${tail}${punct || "."}`;
  }

  // 문단 단위 다듬기 (문장마다 끝맺음만 변환)
  function polishParagraph(p) {
    return (p || "").split(/(?<=[.!?])\s+/).map(s => toPlainEnding(s.trim())).join(" ");
  }

  // 요약·BLUF용 직답형: "~했다고 31일 밝혔다." → "~했다."
  function toDirectStatement(s) {
    return (s || "").replace(/고\s*(?:\d{1,2}일\s*)?(?:밝혔다|전했다|발표했다)\.$/, ".");
  }

  function detectCompany(brandName, lines, rawText) {
    if (brandName) return brandName;
    for (const line of lines.slice(0, 4)) {
      const m = line.match(/^([A-Za-z0-9가-힣&·()]{2,20}?)(?:은|는|이|가|,)\s/);
      if (m && !/^(이번|이|그|한편|또한|특히|올해|지난|최근|오늘|이날)$/.test(m[1])) return m[1];
    }
    const orgMatch = rawText.match(/([가-힣A-Za-z0-9]+(?:협회|오페라단|예술단|재단|위원회|사업단|센터|카드|식품|전자|플랜트|중공업|조선|화학|제약|바이오|건설|통신|은행|증권|보험|그룹))/);
    return orgMatch ? orgMatch[1] : "해당 기업";
  }

  // 문단 성격 분류 → 소제목 결정에 사용
  function classifyParagraph(p, i) {
    if (i === 0) return "lead";
    if (/[“"]/.test(p)) return "quote";
    if (/기대|전망|계획|목표|방침|발판|의미|강화할|확대할|나설/.test(p)) return "outlook";
    if (T_AMOUNT.test(p) || T_COUNT.test(p)) return "scale";
    if (T_DATE.test(p) || /일정|인도|개최|기간|예정|시작/.test(p)) return "schedule";
    return "detail";
  }

  // 원문 문단을 빠짐없이 순서대로 묶는다 (같은 성격이 이어지면 한 섹션으로)
  function groupSections(paras) {
    const sections = [];
    paras.forEach((p, i) => {
      const kind = classifyParagraph(p, i);
      const last = sections[sections.length - 1];
      if (last && last.kind === kind && last.paras.length < 3) last.paras.push(p);
      else sections.push({ kind, paras: [p] });
    });
    return sections;
  }

  const SECTION_LABELS = { lead: "도입 (리드)", scale: "규모·조건", schedule: "일정", outlook: "의미·전망", quote: "관계자 발언", detail: "세부 내용" };
  const GEO_HEADINGS = { lead: "무엇을 발표했나?", scale: "규모와 조건은 어떻게 되나?", schedule: "일정은 어떻게 되나?", outlook: "어떤 의미와 전망이 있나?", quote: "관계자는 어떻게 설명했나?", detail: "세부 내용은?" };
  const AD_HEADINGS = { lead: "", scale: "주요 규모와 조건", schedule: "추진 일정", outlook: "의미와 전망", quote: "관계자 코멘트", detail: "세부 내용" };

  // ==========================================================================
  // GEO 최적화: 팬아웃 쿼리 기반 FAQ (최대 10개)
  // - 질문은 실제 독자가 물을 법한 표현, 답변은 원문 문장 그대로 사용
  // - 원문에서 답을 찾지 못한 질문은 만들지 않음
  // ==========================================================================
  function generateFanOutFaqs(params) {
    const { company, sentences, quotes, urls, location, isMulti, brandList, theme } = params;
    const toFaq = (list) => list.slice(0, 10).map((f, i) => ({ id: `faq_${i + 1}`, q: f.q, a: f.a, enabled: true }));

    if (isMulti) {
      const list = [];
      const names = (brandList || []).map(b => b.brand).filter(Boolean);
      if (names.length) list.push({ q: `${theme}에는 어떤 기업이 참여하나요?`, a: `${names.join(", ")} 등 ${names.length}개 기업이다.` });
      (brandList || []).forEach(b => {
        const sents = splitSentences((b.content || "").split("\n"));
        if (sents[0]) list.push({ q: `${josa(b.brand, "은", "는")} 무엇을 준비했나요?`, a: sents[0] });
      });
      (brandList || []).forEach(b => {
        const sents = splitSentences((b.content || "").split("\n"));
        const dateS = sents.slice(1).find(s => T_DATE.test(s));
        if (dateS) list.push({ q: `${b.brand} 일정은 어떻게 되나요?`, a: dateS });
      });
      return toFaq(list);
    }

    // 질문 주제어: 원문 첫 문장에서 '계약·출시·개최' 같은 핵심 행위어를 찾아 질문에 넣는다
    const leadS = (sentences || [])[0] || "";
    const topicMatch = leadS.match(/계약|협약|MOU|출시|개최|수주|투자|인수|합병|선정|수상|공개|오픈|론칭|캠페인|행사|사업|공모/);
    const T = topicMatch ? `${company} ${topicMatch[0]}` : company;

    // 질문별 키워드를 우선순위대로 검사해 가장 관련 높은 원문 문장을 답으로 고른다
    // (같은 문장은 최대 2개 질문까지, 동점이면 아직 안 쓴 문장 우선)
    const usedCount = new Map();
    const pick = (keys) => {
      let best = null, bestScore = Infinity;
      (sentences || []).forEach(x => {
        if ((usedCount.get(x) || 0) >= 2) return;
        const idx = keys.findIndex(k => k.test(x));
        if (idx < 0) return;
        const score = idx * 2 + (usedCount.has(x) ? 1 : 0);
        if (score < bestScore) { best = x; bestScore = score; }
      });
      if (best) usedCount.set(best, (usedCount.get(best) || 0) + 1);
      return best;
    };
    const kw = (...words) => words.map(w => (w instanceof RegExp ? w : new RegExp(escapeRegExp(w))));
    const specs = [
      { q: `${josa(company, "은", "는")} 이번에 무엇을 발표했나요?`, keys: [new RegExp("^" + escapeRegExp(leadS.slice(0, 10)))] },
      { q: (a) => /캐시백|할인|적립|혜택|무료|증정/.test(a) ? `${T} 혜택은 무엇인가요?` : `${T} 규모는 얼마나 되나요?`, keys: kw("규모", T_AMOUNT) },
      { q: `${T}, 언제 어떤 일정으로 진행되나요?`, keys: kw("일정", "기간", T_DATE, "인도", "개최", "예정") },
      { q: `${T}, 어디에서 진행되나요?`, keys: location ? kw(location) : kw("소재", /에서\s*(?:건조|개최|진행|열리|생산)/) },
      { q: `${josa(T, "은", "는")} 어떤 의미가 있나요?`, keys: kw("의미", "최초", "처음", "첫", "사례", "기록", "평가") },
      { q: `${T} 이후 기대되는 효과는 무엇인가요?`, keys: kw("기대", "전망", "목표", "계획") },
      { q: `${T}에 추가 조건이나 옵션이 있나요?`, keys: kw("옵션", "조건", "추가", "경우") },
      { q: `${T}의 대상이나 파트너는 누구인가요?`, keys: kw("대상", "파트너", "협력", "함께", "소비자", "고객", "선주") },
      { q: `관계자는 ${T}에 대해 뭐라고 말했나요?`, keys: kw(/[“"]/) },
      { q: `${josa(company, "은", "는")} 어떤 회사인가요?`, keys: [new RegExp(escapeRegExp(company) + ".*(기업|회사|업체|설립|전문)")] },
      { q: `${T}, 수치로 보면 어떤가요?`, keys: [T_COUNT] }
    ];
    const list = [];
    specs.forEach(sp => {
      const a = pick(sp.keys);
      if (a) list.push({ q: typeof sp.q === "function" ? sp.q(a) : sp.q, a });
    });
    if (urls && urls[0]) list.push({ q: `더 자세한 내용은 어디서 확인할 수 있나요?`, a: `${company} 공식 웹사이트(${urls[0]})에서 확인할 수 있다.` });
    return toFaq(list);
  }

  // ==========================================================================
  // 텍스트 분석 및 기사 자동 조립 엔진 (규칙 기반, 원문 충실 방식)
  // ==========================================================================
  function parseAndBuildArticle() {
    const rawText = pressReleaseText.value.trim();
    const brandName = brandNameInput.value.trim();
    const keyPoint = keyPointInput.value.trim();

    // URL 수집
    const urls = [];
    document.querySelectorAll(".url-input").forEach(input => {
      const val = input.value.trim();
      if (val) urls.push(val);
    });

    // 1번 입력창이 비어있을 경우 null 반환
    if (!rawText) {
      return null;
    }

    // 1. 보도자료 맨 앞의 제목·부제(마침표 없는 짧은 줄)와 본문 분리
    const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const headLines = [];
    let bodyStart = 0;
    while (bodyStart < lines.length && headLines.length < 3) {
      const l = lines[bodyStart].replace(/^\[보도자료\]\s*/, "").trim();
      if (!l) { bodyStart++; continue; }
      if (/[.!?”"]$/.test(l) || l.length > 80) break;
      headLines.push(l.replace(/^[-–▶■●◆]\s*/, ""));
      bodyStart++;
    }
    let bodyParas = lines.slice(bodyStart).filter(l => !/^\[.*\]$/.test(l));
    if (bodyParas.length === 0) bodyParas = headLines.splice(0);
    bodyParas = bodyParas.map(polishParagraph); // 문장 끝맺음을 기사체로 (내용은 그대로)

    const bodyText = bodyParas.join("\n");
    const sentences = splitSentences(bodyParas);
    const lead = sentences[0] || bodyParas[0];

    // 2. 원문에서 찾은 사실 정보 (없으면 비워 둔다)
    const company = detectCompany(brandName, headLines.concat(bodyParas), rawText);
    const numbers = uniq([...(bodyText.match(RE_AMOUNT) || []), ...(bodyText.match(RE_COUNT) || [])]);
    const dates = uniq(bodyText.match(RE_DATE) || []);
    const productMatch = rawText.match(/[‘〈<「『]([^’〉>」』\n]{2,30})[’〉>」』]/);
    const product = productMatch ? productMatch[1].trim() : "";
    const locationMatch = bodyText.match(/[가-힣A-Za-z0-9]+(?:엘타워|대극장|센트럴월드|코엑스|킨텍스|세종문화회관|컨벤션센터|호텔)/);
    const sojaeMatch = bodyText.match(/(\S+\s\S+)\s소재\s([^\s,.]+?)(?:에서|에|의)?(?:\s(조선소|공장|센터|본사|연구소|캠퍼스|사옥))?(?=[\s,.에의])/);
    const location = locationMatch ? locationMatch[0]
      : (sojaeMatch ? `${sojaeMatch[1]} 소재 ${sojaeMatch[2]}${sojaeMatch[3] ? " " + sojaeMatch[3] : ""}` : "");
    const quotes = [...bodyText.matchAll(/[“"]([^"”]{10,250})[”"]/g)].map(m => m[1]);
    const personMatch = bodyText.match(/([가-힣]{2,4})\s*(대표이사|대표|회장|부회장|사장|부사장|전무|상무|본부장|단장|원장|위원장|협회장|팀장)/);
    const speaker = personMatch ? `${personMatch[1]} ${personMatch[2]}` : "관계자";

    const core = toHeadlineCore(lead, company);
    const titleCore = core.replace(/\s*\([^)]*\)/g, "");
    const shortCore = shorten(titleCore, 45);
    const numStr = numbers[0] || "";
    const findSentence = (re) => sentences.find(s => re.test(s));
    const notFound = "자료에 없음 (확인 필요)";

    // 3. 원문 문단 전체를 순서대로 섹션화 (누락 없음)
    const sections = groupSections(bodyParas);
    const sectionBlocks = (style, prefix) => sections.map((sec, i) => ({
      id: `${prefix}_sec_${i}`,
      label: SECTION_LABELS[sec.kind],
      type: "text",
      title: style === "geo" ? GEO_HEADINGS[sec.kind] : (i === 0 ? "" : AD_HEADINGS[sec.kind]),
      enabled: true,
      content: sec.paras.join("\n\n")
    }));

    // 날짜 포맷
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    const firstClause = (s) => {
      const c = toHeadlineCore(s, company).split(/(?:이며|되며|하며|며|고),\s/)[0].replace(/\s*\([^)]*\)/g, "");
      return c.length >= 12 ? shorten(c, 60) : shorten(toHeadlineCore(s, company), 60);
    };
    const subtitle = headLines.slice(1).join("\n") ||
      sentences.slice(1, 3).map(firstClause).join("\n");

    // ==========================================================================
    // (A) 기사식 광고: 원문 문단 + 문체형 소제목
    // ==========================================================================
    const adTitles = uniq([
      headLines[0] || `${company}, ${shortCore}`,
      numStr ? `${numStr}… ${company}, ${shortCore}` : "",
      headLines[0] ? `${company}, ${shortCore}` : `[${company}] ${shortCore}`,
      keyPoint ? `${company}, ${keyPoint}` : ""
    ]);

    const adBlocks = sectionBlocks("ad", "ad");
    if (urls[0]) {
      adBlocks.push({
        id: "ad_closing",
        label: "마무리 안내",
        type: "text",
        enabled: true,
        content: `자세한 내용은 ${company} 공식 웹사이트(${urls[0]})에서 확인할 수 있다.`
      });
    }

    // ==========================================================================
    // (B) GEO 기사: 3줄 요약 → BLUF → 유형별 구성 → 원문 섹션(질문형 소제목) → FAQ
    // ==========================================================================
    const geoCategory = currentGeoFormat === "story" ? "기업뉴스" : (currentGeoFormat === "interview" ? "브랜드 스토리" : "제품·기술");

    const summaryPoints = uniq(bodyParas.map(p => splitSentences([p])[0] || "")).slice(0, 3);
    sentences.forEach(s => { if (summaryPoints.length < 3 && !summaryPoints.includes(s)) summaryPoints.push(s); });
    for (let i = 0; i < summaryPoints.length; i++) summaryPoints[i] = toDirectStatement(summaryPoints[i]);

    const factRows = [["기업", company]];
    if (product) factRows.push(["대상", `‘${product}’`]);
    factRows.push(["핵심 내용", core]);
    if (numbers.length) factRows.push(["주요 수치", numbers.slice(0, 4).join(", ")]);
    if (dates.length) factRows.push(["일정", dates.slice(0, 3).join(", ")]);
    if (location) factRows.push(["장소", location]);
    if (urls[0]) factRows.push(["공식 사이트", urls[0]]);

    const companyItems = [];
    if (product) companyItems.push({ label: "대표 제품/프로젝트", val: product });
    if (numbers.length) companyItems.push({ label: "주요 수치", val: numbers.slice(0, 3).join(", ") });
    if (urls[0]) companyItems.push({ label: "공식 사이트", val: urls[0] });

    const fmtQuestion = {
      info: (numbers.length || dates.length) ? `${company} ${shortCore}, 규모와 일정은?` : `${company} ${shortCore}, 핵심은?`,
      interview: quotes.length ? `${company} ${speaker}에게 듣는 ${shortCore}, 왜 중요한가?` : `${company} ${shortCore}, 왜 중요한가?`,
      compare: `${company} ${shortCore}, 무엇이 달라지나?`,
      recommend: `${company} ${shortCore}, 누가 주목해야 할까?`,
      story: `${company} ${shortCore}, 어떤 의미일까?`
    };
    const fmtLabelTitle = {
      info: `[한눈에 정리] ${company} ${shortCore}`,
      interview: quotes.length ? `${company} ${speaker} “${shorten(quotes[0], 40)}”` : `[인사이트] ${company} ${shortCore}`,
      compare: `${numbers.length ? "[수치로 보기]" : "[비교 정리]"} ${company} ${shortCore}`,
      recommend: `[체크포인트] ${company} ${shortCore}`,
      story: `[스토리] ${company} ${shortCore}`
    };
    const fmt = fmtQuestion[currentGeoFormat] ? currentGeoFormat : "story";

    const geoTitles = uniq([
      headLines[0] || `${company}, ${shortCore}`,
      `${company}, ${shortCore}… 핵심 내용은?`,
      headLines[0] ? `${company}, ${shortCore}` : (numStr ? `${numStr}… ${company}, ${shortCore}` : `[종합] ${company}, ${shortCore}`),
      fmtQuestion[fmt],
      fmtLabelTitle[fmt],
      keyPoint ? `${company}, ${keyPoint}` : ""
    ]);

    const faqBlock = {
      id: "geo_faq",
      label: "AI 인용 최적화 FAQ",
      type: "faq",
      enabled: true,
      faqs: generateFanOutFaqs({ company, sentences: sentences.concat(headLines), quotes, urls, location, isMulti: false })
    };
    const companyBlock = {
      id: "geo_comp",
      label: "브랜드 정보 카드",
      type: "company",
      enabled: true,
      companyName: company,
      authorityUrl: urls[0] || "",
      items: companyItems
    };

    // 유형별 추가 블록 (모두 원문에서 찾은 정보만 사용)
    const extraBlocks = [];
    if (fmt === "interview" && quotes.length) {
      extraBlocks.push({
        id: "geo_dialogue",
        label: "관계자 발언",
        type: "dialogue",
        enabled: true,
        title: `[ ${company} ${speaker} 발언 ]`,
        dialogues: quotes.slice(0, 3).map((q, i) => ({
          q: i === 0 ? "이번 발표에 대해 어떻게 설명했나?" : "추가로 강조한 점은?",
          a: `“${q}”`
        }))
      });
    } else if (fmt === "story") {
      const howS = findSentence(/통해|방식으로|방법으로/);
      const whyS = findSentence(/위해|기대|목표|의미/);
      extraBlocks.push({
        id: "geo_5w1h",
        label: "5W1H (육하원칙) 요약 블록",
        type: "5w1h",
        enabled: true,
        title: "한눈에 보는 핵심 개요 (5W1H)",
        data: {
          who: company,
          when: dates.length ? dates.slice(0, 2).join(" ~ ") : notFound,
          where: location || notFound,
          what: core,
          how: howS ? shorten(howS, 70) : notFound,
          why: whyS ? shorten(whyS, 70) : notFound
        }
      });
    } else if (fmt === "recommend") {
      const items = [`핵심 내용: ${core}`];
      if (numbers.length) items.push(`규모·수치: ${numbers.slice(0, 3).join(", ")}`);
      if (dates.length) items.push(`일정: ${dates.slice(0, 3).join(", ")}`);
      if (location) items.push(`장소: ${location}`);
      if (urls[0]) items.push(`공식 안내: ${urls[0]}`);
      extraBlocks.push({ id: "geo_check", label: "확인 포인트 체크리스트", type: "checklist", enabled: true, title: "한눈에 확인할 포인트", items });
    }

    let tableBlock = null;
    if (fmt === "compare" && numbers.length) {
      tableBlock = {
        id: "geo_tbl",
        label: "수치 비교표",
        type: "table",
        enabled: true,
        title: "[ 수치로 보는 핵심 내용 ]",
        headers: ["수치", "관련 내용 (원문)"],
        rows: numbers.slice(0, 6).map(n => [n, shorten(sentences.find(s => s.includes(n)) || "", 70)])
      };
    } else if (fmt !== "recommend") {
      tableBlock = {
        id: "geo_tbl",
        label: "핵심 정보 요약표",
        type: "table",
        enabled: true,
        title: "[ 핵심 정보 요약표 ]",
        headers: ["구분", "내용"],
        rows: factRows
      };
    }

    const geoBlocks = [
      { id: "geo_sum", label: "3줄 핵심 요약", type: "summary", enabled: true, points: summaryPoints },
      { id: "geo_bluf", label: "GEO 핵심 인용 요약 (BLUF)", type: "bluf", enabled: true, content: toDirectStatement(lead) },
      ...extraBlocks,
      ...sectionBlocks("geo", "geo"),
      ...(tableBlock ? [tableBlock] : []),
      faqBlock,
      companyBlock
    ];

    const geoFormatLabels = {
      info: "정보성",
      interview: "인터뷰",
      compare: "비교",
      recommend: "추천",
      story: "스토리텔링"
    };
    const currentFormatName = geoFormatLabels[currentGeoFormat] || currentGeoFormat;

    return {
      ad: {
        viewerType: "mk-news",
        categoryPath: "기업 > 기업·경영",
        badgeText: "기사식 광고",
        reporter: "OOO기자",
        date: dateStr,
        subtitle: subtitle,
        titleCandidates: adTitles,
        selectedTitleIndex: 0,
        customTitle: "",
        leadImage: {
          caption: `${company} 관련 보도사진. <사진제공=${company}>`,
          desc: `${company} 공식 이미지`
        },
        blocks: adBlocks
      },
      geo: {
        viewerType: "mk-pick",
        activeCategory: geoCategory,
        badgeText: `GEO 기사 · ${currentFormatName}`,
        reporter: "OOO기자",
        date: dateStr,
        subtitle: subtitle,
        titleCandidates: geoTitles,
        selectedTitleIndex: 0,
        customTitle: "",
        leadImage: {
          caption: `< 출처 : ${company} >`,
          desc: `${company} 대표 이미지`
        },
        blocks: geoBlocks
      }
    };
  }

  // ==========================================================================
  // 복수 브랜드 (라운드업/비교/추천) 스마트 파싱 및 기사 조립 엔진 (방안 C)
  // ==========================================================================
  function parseMultiBrandText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    // 1단계: 테마/기념일 감지
    const themeMatch = rawText.match(/(?:‘([^’]+)’|\"([^\"]+)\"|\[([^\]]+)\]|[가-힣A-Za-z0-9\s]{2,18}(?:의\s*날|기획전|특집|캠페인|비교|추천|페스티벌|어워즈))/);
    let detectedTheme = "";
    if (themeMatch) {
      detectedTheme = themeMatch[1] || themeMatch[2] || themeMatch[3] || themeMatch[0];
    }
    if (multiBrandTheme && !multiBrandTheme.value.trim() && detectedTheme) {
      multiBrandTheme.value = detectedTheme.trim();
    }

    // 2단계: 브랜드별 단락 분할
    // 빈 줄 2개 이상이거나 [브랜드명] 또는 번호 패턴 기준 분리
    const rawBlocks = rawText.split(/\n\s*\n\s*\n|\n(?=(?:\[[^\]\n]{1,30}\]|[0-9]+[.)]\s*[가-힣A-Za-z0-9]+|[■●◆▲]\s*[가-힣A-Za-z0-9]+))/);
    const brands = [];
    multiBrandIntro = "";

    rawBlocks.forEach((blockStr, idx) => {
      const bText = blockStr.trim();
      if (bText.length < 15) return;

      const lines = bText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const firstLine = lines[0] || "";

      // 첫 덩어리가 '[기획 보도자료 종합]' 같은 머리말·도입부면 브랜드가 아니라 기사 도입으로 사용
      const isIntroHeader = /^\[[^\]]*(보도자료|기획|종합|특집|총정리)[^\]]*\]/.test(firstLine);
      const othersMarked = rawBlocks.slice(idx + 1).some(b => /^\s*[\[■●◆▲]|^\s*[0-9]+[.)]/.test(b));
      if (idx === 0 && (isIntroHeader || (othersMarked && !/^[\[■●◆▲]|^[0-9]+[.)]/.test(firstLine)))) {
        multiBrandIntro = (isIntroHeader ? lines.slice(1) : lines).join("\n");
        return;
      }

      let brand = "";
      let campaign = "";
      let benefit = "";

      // 패턴 매칭: "남양유업, 참여가 나눔이 되는..." or "[남양유업] ..."
      const commaMatch = firstLine.match(/^(?:\[|■|●|◆)?([가-힣A-Za-z0-9\s()]{2,14}?)(?:\])?\s*[,·:]\s*(.+)/);
      if (commaMatch) {
        brand = commaMatch[1].replace(/\[|\]|■|●|◆/g, "").trim();
        campaign = commaMatch[2].trim();
      } else {
        const bracketMatch = firstLine.match(/\[([가-힣A-Za-z0-9\s]+)\]\s*(.*)/);
        if (bracketMatch) {
          brand = bracketMatch[1].trim();
          campaign = bracketMatch[2].trim();
        } else {
          const corpMatch = firstLine.match(/([가-힣A-Za-z0-9]+(?:유업|캐피탈|베이비|식품|전자|카드|제약|건설|통신|솔루션|닷컴|컴퍼니|러베|ruuve|베베룬|글라스락))/i);
          if (corpMatch) {
            brand = corpMatch[1].trim();
            campaign = firstLine.replace(brand, "").replace(/^[,·:\s]+/, "").trim();
          } else {
            const firstWord = firstLine.split(/\s+/)[0] || "";
            brand = firstWord.replace(/[\[\]"']/g, "") || `기업 ${idx + 1}`;
            campaign = firstLine.replace(brand, "").trim();
          }
        }
      }

      // 브랜드 머리줄(소제목으로 쓰임)을 뺀 본문
      const body = (brand && lines.length > 1 && firstLine.includes(brand)) ? lines.slice(1).join("\n") : bText;

      // 혜택 키워드가 들어간 본문 문장 (비교표용)
      const benefitSentence = splitSentences(body.split("\n")).find(s => /할인|증정|지원|무료|1\+1|특가|기부|캐시백|적립|패키지|키트|선물|공모|이벤트/.test(s));
      if (benefitSentence) {
        benefit = benefitSentence.replace(/^[-•✓▲\s*]+/, "");
      }

      brands.push({
        id: Date.now() + Math.random(),
        brand: brand.slice(0, 15),
        campaign: campaign,
        benefit: benefit,
        content: body
      });
    });

    return brands;
  }

  // 브랜드 카드 리스트 렌더링
  function renderBrandCards() {
    if (!brandCardsContainer) return;
    brandCardsContainer.innerHTML = "";

    if (multiBrandCount) {
      multiBrandCount.textContent = `총 ${multiBrandList.length}개 브랜드 인식됨`;
    }

    multiBrandList.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "brand-card-item";
      card.innerHTML = `
        <div class="brand-card-top">
          <span class="brand-card-num-tag">#${index + 1} 브랜드</span>
          <button type="button" class="brand-card-del-btn" title="이 브랜드 삭제" data-idx="${index}">&times;</button>
        </div>
        <div class="brand-card-grid">
          <div>
            <label class="input-label-sub">브랜드 / 기업명</label>
            <input type="text" class="brand-card-input brand-name-input" value="${item.brand}" placeholder="예: 남양유업">
          </div>
          <div>
            <label class="input-label-sub">캠페인 / 대표 제품명</label>
            <input type="text" class="brand-card-input brand-campaign-input" value="${item.campaign}" placeholder="예: ‘서프라이즈 베이비’ 캠페인">
          </div>
        </div>
        <div>
          <label class="input-label-sub">비교표 요약 혜택 (핵심 1줄)</label>
          <input type="text" class="brand-card-input brand-benefit-input" value="${item.benefit}" placeholder="예: 필수 육아용품 10종 무료 증정 & 매칭 기부">
        </div>
        <div>
          <label class="input-label-sub">상세 본문 및 참여 방법</label>
          <textarea class="brand-card-textarea brand-content-input" placeholder="이 브랜드의 행사 내용과 참여 방법을 적어주세요">${item.content}</textarea>
        </div>
      `;

      // 입력 이벤트 연결 (디바운스로 우측 기사 자동 반영)
      const nameInput = card.querySelector(".brand-name-input");
      const campaignInput = card.querySelector(".brand-campaign-input");
      const benefitInput = card.querySelector(".brand-benefit-input");
      const contentInput = card.querySelector(".brand-content-input");
      const delBtn = card.querySelector(".brand-card-del-btn");

      let cardDebounce = null;
      const updateCardData = () => {
        item.brand = nameInput.value.trim() || `브랜드 ${index + 1}`;
        item.campaign = campaignInput.value.trim();
        item.benefit = benefitInput.value.trim();
        item.content = contentInput.value.trim();
        if (cardDebounce) clearTimeout(cardDebounce);
        cardDebounce = setTimeout(() => {
          triggerGenerateArticle();
        }, 400);
      };

      nameInput.addEventListener("input", updateCardData);
      campaignInput.addEventListener("input", updateCardData);
      benefitInput.addEventListener("input", updateCardData);
      contentInput.addEventListener("input", updateCardData);

      delBtn.addEventListener("click", () => {
        multiBrandList.splice(index, 1);
        renderBrandCards();
        triggerGenerateArticle();
        showToast("브랜드 카드가 삭제되었습니다.");
      });

      brandCardsContainer.appendChild(card);
    });
  }

  // 복수 브랜드 종합 기획 기사 조립 엔진 (MK Pick 12171568 레퍼런스 완벽 구현)
  function buildMultiBrandArticle() {
    const theme = (multiBrandTheme && multiBrandTheme.value.trim()) || "주요 기업들의 특별 캠페인 및 혜택";
    const brandsCount = multiBrandList.length;
    const brandNames = multiBrandList.map(b => b.brand).filter(Boolean);
    const brandsStr = brandNames.slice(0, 3).join("·") + (brandNames.length > 3 ? " 등" : "");
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ".") + " 09:00";

    // 1. 헤드라인 후보 (질문형 포함) — 기업명·주제 등 입력값만 사용
    const titles = uniq([
      `${theme}… ${brandsStr} ${brandsCount}개 기업 주요 내용 정리`,
      `${theme}, 어떤 기업이 무엇을 준비했을까?`,
      `[한눈에 비교] ${brandsStr} ${theme}`,
      `${brandsStr}, ${theme} 무엇이 다를까?`
    ]);

    const subtitle = `${brandNames.join('·')} 등 ${brandsCount}개 기업 내용 정리\n브랜드별 주요 내용과 비교표 수록`;

    // 각 브랜드 원문의 첫 문장 (요약·BLUF용)
    // 문체 다듬기를 적용한 브랜드 데이터 (카드 원본은 그대로 둠)
    const brandsP = multiBrandList.map(b => ({
      ...b,
      content: (b.content || "").split("\n").map(polishParagraph).join("\n"),
      benefit: b.benefit ? polishParagraph(b.benefit) : ""
    }));
    const firstSentenceOf = (b) => splitSentences((b.content || "").split("\n"))[0] || "";

    // 2. 블록 구성
    const blocks = [];

    // (0) 3줄 핵심 요약 — 브랜드별 원문 첫 문장
    blocks.push({
      id: "mb_summary",
      label: "3줄 핵심 요약",
      type: "summary",
      enabled: true,
      points: brandsP.slice(0, 3).map(b => firstSentenceOf(b)).filter(Boolean)
    });

    // (1) GEO 핵심 인용 요약 (BLUF) — 참여 기업 사실만
    blocks.push({
      id: "mb_bluf",
      label: "GEO 핵심 인용 요약 (BLUF)",
      type: "bluf",
      enabled: true,
      content: `${josa(theme, "과", "와")} 관련해 ${brandNames.join(", ")} 등 ${brandsCount}개 기업의 주요 내용을 브랜드별로 정리했다.`
    });

    // (1-1) 자료 맨 앞 도입부 원문 (있을 때만)
    if (multiBrandIntro) {
      blocks.push({
        id: "mb_intro",
        label: "도입 (원문)",
        type: "text",
        title: "",
        enabled: true,
        content: multiBrandIntro.split("\n").map(polishParagraph).join("\n")
      });
    }

    // (2) 각 브랜드별 문단 — 원문 그대로
    brandsP.forEach((b, idx) => {
      blocks.push({
        id: `mb_brand_${idx}`,
        label: `브랜드 #${idx + 1}: ${b.brand}`,
        type: "text",
        title: b.campaign ? `${b.brand}, ${b.campaign}` : b.brand,
        enabled: true,
        content: b.content
      });
    });

    // (3) 브랜드 비교표
    const tableHeaders = ["브랜드", "캠페인 / 행사", "주요 내용 (원문)"];
    const tableRows = brandsP.map(b => [
      b.brand,
      (b.campaign || "-").replace(/‘|’|“|”/g, ""),
      b.benefit || firstSentenceOf(b) || "-"
    ]);

    blocks.push({
      id: "mb_table",
      label: "한눈에 비교하는 브랜드 표",
      type: "table",
      enabled: true,
      title: `[ 한눈에 비교하는 ${theme} ]`,
      headers: tableHeaders,
      rows: tableRows
    });

    // (4) 자주 묻는 질문 (FAQ) — 원문에서 답을 찾은 질문만
    blocks.push({
      id: "mb_faq",
      label: "AI 인용 최적화 FAQ",
      type: "faq",
      enabled: true,
      faqs: generateFanOutFaqs({
        theme,
        brandList: brandsP,
        isMulti: true
      })
    });

    return {
      viewerType: "mk-pick",
      activeCategory: "산업Q&A",
      badgeText: `복수 브랜드 기사 (${brandsCount}개사)`,
      reporter: "OOO기자",
      date: dateStr,
      subtitle: subtitle,
      titleCandidates: titles,
      selectedTitleIndex: 0,
      customTitle: "",
      leadImage: {
        caption: `< 출처 : ${brandNames.slice(0, 2).join('·')} 등 공식 자료 종합 >`,
        desc: `${theme} 기념 주요 기업 참여 비주얼`
      },
      blocks: blocks
    };
  }

  // 현재 활성 템플릿 반환
  function getActiveTemplateData() {
    // 복수 브랜드 모드 활성화 시
    if (isMultiBrandMode && multiBrandList.length > 0) {
      return buildMultiBrandArticle();
    }

    const built = parseAndBuildArticle();
    if (built) {
      if (currentMainStyle === "ad") {
        return built.ad;
      } else {
        return built.geo;
      }
    }

    // 만약 1번에 텍스트가 없으면 기본 샘플 반환 (두드레스/투썸)
    return getDefaultSampleData();
  }

  // 기본 샘플 데이터 (1번이 비어있을 때)
  function getDefaultSampleData() {
    if (currentMainStyle === "ad") {
      return {
        viewerType: "mk-news",
        categoryPath: "문화·예술 > 공연",
        badgeText: "기사식 광고",
        reporter: "OOO기자",
        date: "2026.10.13 10:00",
        subtitle: "2024년 객석 점유율 98% 전석 매진 신화… 11월 20~23일 4일간 무대\n푸치니 서거 100주년 기념, 세계적 콩쿠르 우승 정상급 성악가 총출동\n세종문화회관 대극장서 웅장한 무대와 감동 선사",
        titleCandidates: [
          "‘전석 매진’ 신화 쓴 서울시오페라단 〈라보엠〉, 세종문화회관 대극장 귀환",
          "세계 정상급 성악가 총출동… 서울시오페라단, 대작 〈라보엠〉 선보인다",
          "푸치니 서거 100주년 기념: 서울시오페라단 〈라보엠〉 11월 개막",
          "‘미미와 로돌포의 찬란한 사랑’… 세종문화회관 대극장서 만나는 감동"
        ],
        selectedTitleIndex: 0,
        customTitle: "",
        leadImage: {
          caption: "2024년 전석 매진을 기록한 서울시오페라단 〈라보엠〉 공연 실황. <사진제공=세종문화회관>",
          desc: "서울시오페라단 〈라보엠〉 대표 보도사진"
        },
        blocks: [
          {
            id: "def_ad_1",
            label: "도입 문단 (리드문)",
            type: "text",
            enabled: true,
            content: "세종문화회관(사장 안호상) 서울시오페라단(단장 박혜진)이 2024년 객석 점유율 98%를 기록하며 전석 매진 신화를 쓴 오페라 〈라보엠〉을 오는 11월 20일부터 23일까지 세종문화회관 대극장에서 다시 선보인다고 밝혔다. 접수 및 예매는 세종문화회관 공식 홈페이지와 인터파크 티켓을 통해 진행된다."
          },
          {
            id: "def_ad_2",
            label: "본문 문단 1 (위상·실적)",
            type: "text",
            title: "전석 매진 신화와 세계적 성악가들이 빚어내는 최고의 앙상블",
            enabled: true,
            content: "이번 공연은 2024년 초연 당시 대극장 전석 매진을 달성하며 평단과 관객의 찬사를 한 몸에 받은 서울시오페라단의 대표 레퍼토리다. 푸치니 서거 100주년을 기념하여 퀸 엘리자베스 콩쿠르 우승자 소프라노 서선영, 차이콥스키 콩쿠르 2위 손지혜, 메트로폴리탄 오페라 주역 테너 백석종, 독일 드레스덴 젬퍼오퍼 주역 테너 강요셉 등 세계 유수 무대를 누비는 정상급 성악가들이 대거 합류했다."
          },
          {
            id: "def_ad_3",
            label: "본문 문단 2 (스펙·연출)",
            type: "text",
            title: "현대적 미장센과 웅장한 오케스트라 사운드의 완벽한 조화",
            enabled: true,
            content: "엄숙정 연출이 이끄는 이번 무대는 19세기 파리 뒷골목 젊은 예술가들의 가난하지만 뜨거운 사랑과 고뇌를 현대적 감각으로 섬세하게 재해석했다. 최희준 지휘자가 이끄는 경기필하모닉오케스트라의 풍성한 선율과 대극장 무대 메커니즘을 극대화한 세트 디자인이 어우러져 한층 깊은 감동을 선사할 전망이다."
          },
          {
            id: "def_ad_timeline",
            label: "주요 추진 일정 (타임라인)",
            type: "timeline",
            enabled: true,
            title: "[ 〈라보엠〉 공연 일정 및 예매 안내 ]",
            steps: [
              { label: "1단계", desc: "공식 티켓 예매 오픈 (세종문화회관 및 인터파크)" },
              { label: "2단계", desc: "주역 캐스팅 및 경기필하모닉 최종 총연습 진행" },
              { label: "3단계", desc: "11월 20일(목) 세종문화회관 대극장 대망의 개막" },
              { label: "4단계", desc: "11월 23일(일)까지 4일간 4회 감동의 무대 선사" }
            ]
          },
          {
            id: "def_ad_4",
            label: "마무리 문단 (인터뷰·안내)",
            type: "text",
            enabled: true,
            content: "서울시오페라단 박혜진 단장은 “푸치니가 남긴 불멸의 걸작을 통해 관객들에게 영원히 잊히지 않을 감동의 순간을 선물하겠다”라며 “청춘의 찬란한 사랑과 비극적 슬픔을 한국 최고 수준의 프로덕션으로 만나보시길 바란다”고 밝혔다.\n\n공연 및 예매에 관한 자세한 정보는 세종문화회관 공식 홈페이지(sejongpac.or.kr)와 콜센터를 통해 확인할 수 있다."
          }
        ]
      };
    } else {
      return {
        viewerType: "mk-pick",
        activeCategory: "제품·기술",
        badgeText: "GEO 기사 · 정보성",
        reporter: "OOO기자",
        date: "2026.10.13 10:00",
        subtitle: "컬리멤버십 결제 시 최대 14% 컬리적립금 제공\n신규 출시 기념 전월 실적 무관 1만5000원 캐시백 및 추가 적립 혜택",
        titleCandidates: [
          "“멤버십 더해 최대 14% 적립”…신한카드, ‘컬리 신한카드’ 출시",
          "‘컬리 신한카드’, 적립 혜택은 얼마나 되고 누구에게 유리할까?",
          "신한카드 ‘컬리 신한카드’, 실질적 적립 혜택과 주요 스펙 총정리",
          "컬리 신한카드 연회비와 캐시백 조건은? 핵심만 정리",
          "컬리 첫 결제 시 1만5000원 캐시백… 신한카드 신규 PLCC 화제",
          "장보기 혜택 극대화: ‘컬리 신한카드’ 혜택·연회비 완벽 가이드"
        ],
        selectedTitleIndex: 0,
        customTitle: "",
        leadImage: {
          caption: "신한카드와 컬리가 협업해 선보인 PLCC ‘컬리 신한카드’. <출처=신한카드>",
          desc: "‘컬리 신한카드’ 대표 비주얼"
        },
        blocks: [
          {
            id: "def_geo_sum",
            label: "3줄 핵심 요약",
            type: "summary",
            enabled: true,
            points: [
              "신한카드가 장보기 플랫폼 컬리와 손잡고 컬리 특화 전용 카드인 ‘컬리 신한카드’를 출시했습니다.",
              "컬리멤버십 이용 시 최대 14% 적립금 혜택과 일상 가맹점 최대 5% 추가 적립을 지원합니다.",
              "10월 31일까지 첫 결제 고객 대상 1만5,000원 캐시백 프로모션을 진행합니다."
            ]
          },
          {
            id: "def_geo_bluf",
            label: "GEO 핵심 인용 요약 (BLUF)",
            type: "bluf",
            enabled: true,
            content: "‘컬리 신한카드’는 신한카드가 장보기 플랫폼 컬리와 협력해 선보인 PLCC로, 컬리멤버십 결제 시 최대 14% 적립과 첫 결제 1만5,000원 캐시백을 제공하는 것이 핵심이다."
          },
          {
            id: "def_geo_p1",
            label: "핵심 혜택 및 라인업",
            type: "text",
            title: "‘컬리 신한카드’, 주요 혜택과 핵심 스펙은 무엇인가?",
            enabled: true,
            content: "신한카드가 장보기 앱 컬리와 협력하여 컬리 쇼핑에 최적화된 PLCC ‘컬리 신한카드’를 전격 출시했다. 컬리멤버십 고객이 해당 카드로 결제할 경우 기본 멤버십 적립 7%에 카드 결제 혜택 최대 7%가 더해져 최대 14%의 파격적인 컬리적립금을 제공받을 수 있다."
          },
          {
            id: "def_geo_p2",
            label: "부가 프로모션 및 조건",
            type: "text",
            title: "신규 출시 기념 프로모션과 실사용 조건은?",
            enabled: true,
            content: "컬리뿐만 아니라 배달앱, 커피전문점, 편의점 등 일상 생활 밀착 가맹점에서도 최대 5% 적립을 지원한다. 또한 카드 출시를 기념해 10월 31일까지 컬리에서 첫 결제 시 전월 이용 실적과 무관하게 1만5,000원의 캐시백 혜택을 전격 제공한다."
          },
          {
            id: "def_geo_tbl",
            label: "주요 스펙 및 혜택 비교표",
            type: "table",
            enabled: true,
            title: "[ ‘컬리 신한카드’ 주요 혜택 및 연회비 요약 ]",
            headers: ["구분", "상세 내용 및 조건"],
            rows: [
              ["카드 상품명", "컬리 신한카드 (PLCC)"],
              ["컬리 쇼핑 혜택", "컬리멤버십 결제 시 최대 14% 컬리적립금"],
              ["일상 가맹점 혜택", "배달앱·커피·편의점 최대 5% 추가 적립"],
              ["출시 기념 프로모션", "첫 결제 시 1만5,000원 전액 캐시백 (10/31까지)"],
              ["연회비", "국내 전용 1만5,000원 / 해외 겸용 1만8,000원"]
            ]
          },
          {
            id: "def_geo_faq",
            label: "AI 인용 최적화 FAQ",
            type: "faq",
            enabled: true,
            faqs: generateFanOutFaqs({
              company: "신한카드",
              sentences: splitSentences([
                "신한카드가 장보기 앱 컬리와 협력하여 컬리 쇼핑에 최적화된 PLCC ‘컬리 신한카드’를 전격 출시했다. 컬리멤버십 고객이 해당 카드로 결제할 경우 기본 멤버십 적립 7%에 카드 결제 혜택 최대 7%가 더해져 최대 14%의 파격적인 컬리적립금을 제공받을 수 있다.",
                "컬리뿐만 아니라 배달앱, 커피전문점, 편의점 등 일상 생활 밀착 가맹점에서도 최대 5% 적립을 지원한다. 또한 카드 출시를 기념해 10월 31일까지 컬리에서 첫 결제 시 전월 이용 실적과 무관하게 1만5,000원의 캐시백 혜택을 전격 제공한다."
              ]),
              quotes: [],
              urls: ["https://www.mk.co.kr/news/pick/12170377"],
              location: "",
              isMulti: false
            })
          },
          {
            id: "def_geo_comp",
            label: "브랜드 정보 카드",
            type: "company",
            enabled: true,
            companyName: "신한카드",
            authorityUrl: "https://www.mk.co.kr/news/pick/12170377",
            items: [
              { label: "대표 제품", val: "컬리 신한카드" },
              { label: "핵심 혜택", val: "최대 14% 컬리적립금 및 일상 5% 적립" },
              { label: "공식 사이트", val: "https://www.mk.co.kr/news/pick/12170377" }
            ]
          }
        ]
      };
    }
  }

  // 현재 기사 데이터 가져오기
  function getCurrentData() {
    if (!generatedArticleData) {
      generatedArticleData = getActiveTemplateData();
    }
    return generatedArticleData;
  }

  function getActiveTitle() {
    const data = getCurrentData();
    if (data.customTitle && data.customTitle.trim()) {
      return data.customTitle;
    }
    const idx = data.selectedTitleIndex || 0;
    return data.titleCandidates[idx] || data.titleCandidates[0];
  }

  // 제목 스타일 이름: '?'가 들어가면 질문형, 나머지는 기존 4가지 스타일을 순서대로
  function getTitleStyleName(data, idx) {
    const styleNames = ["혜택 강조형", "뉴스 속보형", "흥행·성과형", "가이드·요약형"];
    const isQuestion = (t) => (t || "").includes("?");
    if (isQuestion(data.titleCandidates[idx])) return "질문형";
    const plainIdx = data.titleCandidates.slice(0, idx).filter(t => !isQuestion(t)).length;
    return styleNames[plainIdx % styleNames.length];
  }

  // 1. 제목 후보 카드 렌더링 (싱글 뷰 & 스타일 태그)
  function renderTitleCandidates() {
    const data = getCurrentData();
    const activeTitle = getActiveTitle();
    const currentIdx = data.selectedTitleIndex || 0;
    const totalCount = data.titleCandidates ? data.titleCandidates.length : 4;

    if (activeTitleDisplay) {
      activeTitleDisplay.textContent = activeTitle;
    }

    if (titleStyleTag) {
      if (data.customTitle && data.customTitle.trim()) {
        titleStyleTag.textContent = "직접 수정한 제목";
        titleStyleTag.style.backgroundColor = "#F0F0F0";
        titleStyleTag.style.color = "#111111";
        titleStyleTag.style.borderColor = "#D0D0D0";
      } else {
        titleStyleTag.textContent = getTitleStyleName(data, currentIdx);
        titleStyleTag.style.backgroundColor = "#FFF3EB";
        titleStyleTag.style.color = "#FE6B00";
        titleStyleTag.style.borderColor = "#FFD8C2";
      }
    }

    if (titleCounterBadge) {
      if (data.customTitle && data.customTitle.trim()) {
        titleCounterBadge.textContent = "수정됨";
      } else {
        titleCounterBadge.textContent = `${currentIdx + 1} / ${totalCount}`;
      }
    }

    if (directTitleInput) {
      directTitleInput.value = activeTitle;
    }
  }

  // 실시간 기사 글자 수 카운터 업데이트
  function updateCharCount() {
    if (!charCountBadge) return;
    const data = getCurrentData();
    const activeTitle = getActiveTitle();
    let text = `${activeTitle} ${data.subtitle || ""} `;
    data.blocks.filter(b => b.enabled).forEach(b => {
      text += `${extractBlockText(b)} `;
    });
    const totalChars = text.length;
    const noSpaceChars = text.replace(/\s+/g, "").length;
    const readMinutes = Math.max(1, Math.round(totalChars / 500));
    charCountBadge.textContent = `본문 ${totalChars.toLocaleString()}자 · 읽기 약 ${readMinutes}분`;
    charCountBadge.title = `총 ${totalChars.toLocaleString()}자 (공백 제외 ${noSpaceChars.toLocaleString()}자) · 분당 500자 기준 읽기 약 ${readMinutes}분`;
  }

  function renderPreviewHeaderOnly() {
    const titleEl = document.getElementById("articleHeadlineTitle");
    if (titleEl) titleEl.textContent = getActiveTitle();
  }

  function extractBlockText(block) {
    if (block.type === "summary") {
      let text = "[3줄 핵심 요약]\n";
      block.points.forEach((pt, i) => {
        text += `${i + 1}. ${pt}\n`;
      });
      return text.trim();
    }

    if (block.type === "5w1h") {
      let text = "[한눈에 보는 핵심 개요 (5W1H)]\n";
      text += `• 주체(Who): ${block.data.who}\n`;
      text += `• 일시(When): ${block.data.when}\n`;
      text += `• 장소(Where): ${block.data.where}\n`;
      text += `• 내용(What): ${block.data.what}\n`;
      text += `• 방식(How): ${block.data.how}\n`;
      text += `• 의의(Why): ${block.data.why}\n`;
      return text;
    }

    if (block.type === "dialogue") {
      let text = `[인터뷰 대담]\n\n`;
      block.dialogues.forEach(d => {
        text += `Q. ${d.q}\nA. ${d.a}\n\n`;
      });
      return text.trim();
    }

    if (block.type === "timeline") {
      let text = `[${block.title || "주요 일정 및 추진 절차"}]\n`;
      block.steps.forEach(s => {
        text += `▲ ${s.label}: ${s.desc}\n`;
      });
      return text.trim();
    }

    if (block.type === "checklist") {
      let text = `[${block.title || "맞춤 선택 체크리스트"}]\n`;
      block.items.forEach(it => {
        text += `✓ ${it}\n`;
      });
      return text.trim();
    }

    if (block.type === "table") {
      let text = `${block.title || "[스펙 및 일정 비교표]"}\n`;
      text += block.headers.join("\t") + "\n";
      block.rows.forEach(row => {
        text += row.join("\t") + "\n";
      });
      return text;
    }

    if (block.type === "bluf") {
      return `[핵심 인용 요약 (BLUF)]\n${block.content}`;
    }

    if (block.type === "faq") {
      let text = "[자주 묻는 질문 (FAQ)]\n\n";
      const included = block.faqs.filter(f => f.enabled !== false);
      included.forEach(f => {
        text += `${f.q}\n${f.a}\n\n`;
      });
      return text.trim();
    }

    if (block.type === "company") {
      let text = `[브랜드 정보: ${block.companyName}]\n`;
      block.items.forEach(item => {
        text += `• ${item.label}: ${item.val}\n`;
      });
      return text;
    }

    let text = "";
    if (block.title && block.title.trim()) {
      text += `${block.title}\n\n`;
    }
    text += block.content;
    return text;
  }

  // 팩트체크용 수치/키워드 자동 하이라이트 함수 (복사 텍스트에는 영향 없음)
  function applyFactHighlight(text) {
    if (!text || typeof text !== "string") return text;
    // 숫자, %, 금액, 날짜, 인원수, 단위 등 핵심 수치 팩트 정규식
    const factRegex = /(\d+(?:\.\d+)?%|\d+(?:,\d{3})*(?:\.\d+)?(?:조\s*\d+(?:,\d{3})*억\s*원|조\s*원|억\s*원|만\s*원|천\s*원|원|달러|여?\s*명|명|개사|개국|개|곳|배|척|건|톤|가구|주년|\s*TOPS)|\b\d{1,2}월\s*\d{1,2}일(?:\s*~\s*\d{1,2}월?\s*\d{1,2}일)?|\b\d{4}년(?:\s*\d{1,2}월)?)/g;
    return text.replace(factRegex, '<mark class="fact-highlight" title="팩트 확인: 원문 수치">$1</mark>');
  }

  // 2. 블록 엘리먼트 생성 (문단 이동 ▲/▼ 지원)
  function createBlockElement(block, isGeoMode, index = 0, totalBlocks = 1) {
    const blockItem = document.createElement("div");
    blockItem.className = `article-block-item ${block.enabled ? "" : "disabled"} ${block.isEditing ? "editing" : ""}`;
    blockItem.id = `blockItem_${block.id}`;

    let specialButtons = "";
    if (block.type === "table") {
      specialButtons = `
        <button type="button" class="btn btn-secondary-sm btn-copy-tsv" title="엑셀/한글에 붙여넣기 좋은 표 복사">글자 표 복사</button>
      `;
    }

    const toolbar = document.createElement("div");
    toolbar.className = "block-mini-toolbar";
    toolbar.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="block-tag-badge">${block.label}</span>
        <span class="block-disabled-badge">제외됨 (전체 복사 시 제외)</span>
      </div>
      <div class="block-tool-actions">
        <label class="block-checkbox-label" title="기사 포함 여부">
          <input type="checkbox" class="block-toggle-cb" ${block.enabled ? "checked" : ""}>
          <span>포함</span>
        </label>
        <button type="button" class="btn-move-block btn-move-up" title="문단을 위로 이동" ${index === 0 ? "disabled" : ""}>▲</button>
        <button type="button" class="btn-move-block btn-move-down" title="문단을 아래로 이동" ${index === totalBlocks - 1 ? "disabled" : ""}>▼</button>
        ${specialButtons}
        <button type="button" class="btn btn-secondary-sm btn-edit-block">수정</button>
        <button type="button" class="btn btn-secondary-sm btn-copy-block">복사</button>
      </div>
    `;

    const contentView = document.createElement("div");
    contentView.className = "block-content-display";

    if (block.type === "summary") {
      contentView.innerHTML = `
        <div class="summary-highlight-card">
          <div class="summary-card-title">3줄 핵심 요약</div>
          <ul class="summary-card-list">
            ${block.points.map(pt => `<li>${applyFactHighlight(pt)}</li>`).join("")}
          </ul>
        </div>
      `;
    } else if (block.type === "5w1h") {
      contentView.innerHTML = `
        <div class="five-w-one-h-box">
          <div class="five-w-title">${block.title || "한눈에 보는 핵심 개요 (5W1H)"}</div>
          <div class="five-w-grid">
            <div class="five-w-item"><span class="five-w-label"><span class="five-w-tag">Who</span> 주체</span><span class="five-w-val">${applyFactHighlight(block.data.who)}</span></div>
            <div class="five-w-item"><span class="five-w-label"><span class="five-w-tag">When</span> 일시</span><span class="five-w-val">${applyFactHighlight(block.data.when)}</span></div>
            <div class="five-w-item"><span class="five-w-label"><span class="five-w-tag">Where</span> 장소</span><span class="five-w-val">${block.data.where}</span></div>
            <div class="five-w-item"><span class="five-w-label"><span class="five-w-tag">What</span> 내용</span><span class="five-w-val">${applyFactHighlight(block.data.what)}</span></div>
            <div class="five-w-item"><span class="five-w-label"><span class="five-w-tag">How</span> 방식</span><span class="five-w-val">${block.data.how}</span></div>
            <div class="five-w-item"><span class="five-w-label"><span class="five-w-tag">Why</span> 의의</span><span class="five-w-val">${block.data.why}</span></div>
          </div>
        </div>
      `;
    } else if (block.type === "dialogue") {
      contentView.innerHTML = `
        <div class="article-section-subhead" style="margin-bottom:12px;">${block.title || "릴레이 인터뷰 대담"}</div>
        <div class="interview-dialogue-box">
          ${block.dialogues.map(d => `
            <div class="interview-turn">
              <div class="interview-q"><span class="interview-q-badge">Q</span> ${d.q}</div>
              <div class="interview-a">${applyFactHighlight(d.a)}</div>
            </div>
          `).join("")}
        </div>
      `;
    } else if (block.type === "timeline") {
      contentView.innerHTML = `
        <div class="timeline-process-box">
          <div class="timeline-process-title">${block.title || "주요 일정 및 진행 절차"}</div>
          <div class="timeline-steps">
            ${block.steps.map((s, idx) => `
              <div class="timeline-step-item">
                <span class="timeline-step-num">▲ ${s.label}</span>
                <span>${applyFactHighlight(s.desc)}</span>
              </div>
              ${idx < block.steps.length - 1 ? `<span class="timeline-step-arrow">▶</span>` : ""}
            `).join("")}
          </div>
        </div>
      `;
    } else if (block.type === "checklist") {
      contentView.innerHTML = `
        <div class="recommend-checklist-box">
          <div class="article-section-subhead" style="margin-bottom:12px;">${block.title || "구매 전 필독 체크리스트"}</div>
          ${block.items.map(it => `
            <div class="recommend-check-item">
              <span class="recommend-check-icon">✓</span>
              <span>${applyFactHighlight(it)}</span>
            </div>
          `).join("")}
        </div>
      `;
    } else if (block.type === "table") {
      contentView.innerHTML = `
        <div class="mkpick-table-container">
          <div class="article-section-subhead" style="margin-bottom:8px;">${block.title}</div>
          <table class="mkpick-data-table">
            <thead>
              <tr>${block.headers.map(h => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${block.rows.map(r => `<tr>${r.map(c => `<td>${applyFactHighlight(c)}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      `;
    } else if (block.type === "bluf") {
      contentView.innerHTML = `
        <div class="geo-bluf-box">
          <div class="geo-bluf-header">
            <span class="geo-bluf-badge">GEO 핵심 인용 요약 (BLUF)</span>
            <span class="geo-bluf-title">AI 검색 엔진(Google Overviews·ChatGPT)이 최우선 발췌하는 1문장 즉답</span>
          </div>
          <div class="geo-bluf-text">${applyFactHighlight(block.content)}</div>
        </div>
      `;
    } else if (block.type === "faq") {
      const allFaqs = block.faqs || [];
      const top3 = allFaqs.slice(0, 3);
      const rest = allFaqs.slice(3);

      const renderFaqRow = (f, idx) => `
        <div class="faq-item-box ${f.enabled === false ? 'excluded' : ''}" id="faqItem_${block.id}_${idx}">
          <div class="faq-item-top">
            <div class="faq-question-text">
              <span class="faq-q-badge">Q${idx + 1}</span>
              <span>${f.q.replace(/^Q\d+[.:\s]*/, '')}</span>
            </div>
            <label class="faq-item-cb-label" title="기사에 포함할지 선택">
              <input type="checkbox" class="faq-include-cb" data-idx="${idx}" ${f.enabled !== false ? 'checked' : ''}>
              <span>기사 포함</span>
            </label>
          </div>
          <div class="faq-answer-text">${applyFactHighlight(f.a)}</div>
        </div>
      `;

      let restHtml = "";
      if (rest.length > 0) {
        restHtml = `
          <div class="faq-expand-bar">
            <button type="button" class="btn-faq-toggle" id="faqToggleBtn_${block.id}">
              <span class="faq-toggle-icon">▼</span>
              <span class="faq-toggle-txt">추천 독자 질문 ${rest.length}개 더보기 (총 ${allFaqs.length}개 팬아웃 Q&A)</span>
            </button>
            <span class="faq-fanout-badge">답변은 원문 문장 그대로 (최대 10개)</span>
          </div>
          <div class="faq-extended-container hidden" id="faqExtended_${block.id}">
            ${rest.map((f, i) => renderFaqRow(f, i + 3)).join("")}
          </div>
        `;
      }

      contentView.innerHTML = `
        <div class="faq-block-wrapper">
          <div class="faq-header-toolbar">
            <div class="article-section-subhead" style="margin-bottom:0;">자주 묻는 질문 (FAQ ${allFaqs.length}개)</div>
            <span style="font-size:12px; color:#757575;">※ 원문에서 답을 찾은 질문만 표시</span>
          </div>
          <div class="faq-main-list">
            ${top3.map((f, i) => renderFaqRow(f, i)).join("")}
          </div>
          ${restHtml}
        </div>
      `;

      // 토글 버튼 이벤트
      setTimeout(() => {
        const toggleBtn = contentView.querySelector(`#faqToggleBtn_${block.id}`);
        const extContainer = contentView.querySelector(`#faqExtended_${block.id}`);
        if (toggleBtn && extContainer) {
          toggleBtn.addEventListener("click", () => {
            const isHidden = extContainer.classList.contains("hidden");
            extContainer.classList.toggle("hidden", !isHidden);
            const icon = toggleBtn.querySelector(".faq-toggle-icon");
            const txt = toggleBtn.querySelector(".faq-toggle-txt");
            if (icon) icon.textContent = isHidden ? "▲" : "▼";
            if (txt) txt.textContent = isHidden ? `추천 질문 ${rest.length}개 접기` : `추천 독자 질문 ${rest.length}개 더보기 (총 ${allFaqs.length}개 팬아웃 Q&A)`;
          });
        }

        // 개별 질문 포함/제외 체크박스 이벤트
        contentView.querySelectorAll(".faq-include-cb").forEach(cb => {
          cb.addEventListener("change", (e) => {
            const idx = parseInt(e.target.getAttribute("data-idx"), 10);
            if (block.faqs && block.faqs[idx]) {
              block.faqs[idx].enabled = e.target.checked;
              const itemBox = contentView.querySelector(`#faqItem_${block.id}_${idx}`);
              if (itemBox) {
                itemBox.classList.toggle("excluded", !e.target.checked);
              }
              updateCharCount();
              showToast(e.target.checked ? `Q${idx + 1} 질문이 기사에 포함되었습니다.` : `Q${idx + 1} 질문이 복사 목록에서 제외되었습니다.`);
            }
          });
        });
      }, 0);

    } else if (block.type === "company") {
      let backlinkHtml = "";
      if (block.authorityUrl) {
        backlinkHtml = `
          <div style="margin-top:10px; padding-top:8px; border-top:0.5px dashed #E0E0E0;">
            <a href="${block.authorityUrl}" target="_blank" rel="noopener noreferrer" class="authority-citation-badge" title="공식 안내 및 원문 상세 확인">
              <span class="authority-icon">↗</span> ${block.companyName} 공식 발표 및 상세 안내 바로가기
            </a>
          </div>
        `;
      }
      contentView.innerHTML = `
        <div class="brand-info-card">
          <div class="brand-card-row">
            <span class="brand-card-label">기업/브랜드:</span>
            <strong>${block.companyName}</strong>
          </div>
          ${block.items.map(it => `
            <div class="brand-card-row">
              <span class="brand-card-label">${it.label}:</span> ${it.val}
            </div>
          `).join("")}
          ${backlinkHtml}
        </div>
      `;
    } else {
      let headingHtml = "";
      if (block.title && block.title.trim()) {
        if (isGeoMode) {
          headingHtml = `<span class="mkpick-orange-heading">${block.title}</span>`;
        } else {
          headingHtml = `<div class="article-section-subhead">${block.title}</div>`;
        }
      }
      const highlightedContent = applyFactHighlight(block.content);
      contentView.innerHTML = `
        ${headingHtml}
        <p class="article-paragraph-text">${highlightedContent.replace(/\n\n/g, "</p><p class='article-paragraph-text'>").replace(/\n/g, "<br>")}</p>
      `;
    }

    const editForm = document.createElement("div");
    editForm.className = "block-edit-form";

    const textarea = document.createElement("textarea");
    textarea.className = "block-edit-textarea";
    textarea.value = extractBlockText(block);

    const editBtns = document.createElement("div");
    editBtns.className = "block-edit-btns";
    editBtns.innerHTML = `
      <button type="button" class="btn btn-primary-sm btn-save-block">저장 완료</button>
      <button type="button" class="btn btn-secondary-sm btn-cancel-block">취소</button>
    `;

    editForm.appendChild(textarea);
    editForm.appendChild(editBtns);

    blockItem.appendChild(toolbar);
    blockItem.appendChild(contentView);
    blockItem.appendChild(editForm);

    // 이벤트 리스너 바인딩
    const toggleCb = toolbar.querySelector(".block-toggle-cb");
    toggleCb.addEventListener("change", (e) => {
      block.enabled = e.target.checked;
      blockItem.classList.toggle("disabled", !block.enabled);
      updateCharCount();
      showToast(block.enabled ? `'${block.label}' 블록이 포함되었습니다.` : `'${block.label}' 블록이 제외되었습니다.`);
    });

    // 위로 이동 버튼
    const moveUpBtn = toolbar.querySelector(".btn-move-up");
    if (moveUpBtn) {
      moveUpBtn.addEventListener("click", () => {
        const data = getCurrentData();
        const idx = data.blocks.findIndex(b => b.id === block.id);
        if (idx > 0) {
          const temp = data.blocks[idx];
          data.blocks[idx] = data.blocks[idx - 1];
          data.blocks[idx - 1] = temp;
          renderPreview();
          showToast(`'${block.label}' 문단을 위로 이동했습니다.`);
        }
      });
    }

    // 아래로 이동 버튼
    const moveDownBtn = toolbar.querySelector(".btn-move-down");
    if (moveDownBtn) {
      moveDownBtn.addEventListener("click", () => {
        const data = getCurrentData();
        const idx = data.blocks.findIndex(b => b.id === block.id);
        if (idx < data.blocks.length - 1) {
          const temp = data.blocks[idx];
          data.blocks[idx] = data.blocks[idx + 1];
          data.blocks[idx + 1] = temp;
          renderPreview();
          showToast(`'${block.label}' 문단을 아래로 이동했습니다.`);
        }
      });
    }

    const copyBtn = toolbar.querySelector(".btn-copy-block");
    copyBtn.addEventListener("click", () => {
      copyTextToClipboard(extractBlockText(block), `'${block.label}' 내용이 복사되었습니다.`);
    });

    const tsvBtn = toolbar.querySelector(".btn-copy-tsv");
    if (tsvBtn) {
      tsvBtn.addEventListener("click", () => {
        copyTextToClipboard(extractBlockText(block), "표 데이터가 글자 표 형태로 복사되었습니다.");
      });
    }

    const editBtn = toolbar.querySelector(".btn-edit-block");
    editBtn.addEventListener("click", () => {
      block.isEditing = true;
      blockItem.classList.add("editing");
      textarea.value = extractBlockText(block);
      textarea.focus();
    });

    const saveBtn = editBtns.querySelector(".btn-save-block");
    saveBtn.addEventListener("click", () => {
      const val = textarea.value.trim();
      if (!val) {
        alert("내용을 입력해 주세요.");
        return;
      }
      block.type = "text";
      block.title = "";
      block.content = val;
      block.isEditing = false;
      renderPreview();
      showToast(`'${block.label}' 내용이 수정되었습니다.`);
    });

    const cancelBtn = editBtns.querySelector(".btn-cancel-block");
    cancelBtn.addEventListener("click", () => {
      block.isEditing = false;
      blockItem.classList.remove("editing");
    });

    return blockItem;
  }

  // 3. 미리보기 화면 렌더링
  function renderPreview() {
    const data = getCurrentData();
    const activeTitle = getActiveTitle();
    const isGeoMode = data.viewerType === "mk-pick";

    if (currentStyleBadge) currentStyleBadge.textContent = data.badgeText;

    previewContainer.innerHTML = "";

    const windowBar = document.createElement("div");
    windowBar.className = "viewer-window-bar";
    windowBar.innerHTML = `
      <div class="viewer-window-dots">
        <span class="window-dot"></span>
        <span class="window-dot"></span>
        <span class="window-dot"></span>
      </div>
      <span>${isGeoMode ? "매경 MK Pick 실제 기사 뷰어" : "매일경제 뉴스 실제 기사 뷰어"}</span>
      <span>${isGeoMode ? "mkpick.com" : "mk.co.kr"}</span>
    `;
    previewContainer.appendChild(windowBar);

    const articleWrapper = document.createElement("div");
    articleWrapper.className = `viewer-article-wrapper ${isGeoMode ? "mk-pick-viewer" : "mk-news-viewer"}`;

    let headerHtml = "";

    if (isGeoMode) {
      const categories = ["산업Q&A", "제품·기술", "성공사례", "기업뉴스", "브랜드 스토리"];
      const currentCat = data.activeCategory || "제품·기술";

      const navHtml = categories.map(cat => `
        <span class="mkpick-nav-item ${cat === currentCat ? "active" : ""}">${cat}</span>
      `).join("");

      headerHtml = `
        <div class="mkpick-brand-header">
          <div class="mkpick-brand-logo">
            <span class="mkpick-logo-badge">M</span>
            <span class="mkpick-logo-text">MKPick</span>
          </div>
          <div class="mkpick-category-nav">
            ${navHtml}
          </div>
        </div>

        <h1 class="mk-headline-title" id="articleHeadlineTitle">${activeTitle}</h1>

        <div class="mk-meta-row" style="margin-bottom:12px;">
          <span><strong>${data.reporter}</strong></span>
          <span>${data.date}</span>
        </div>

        <div class="mk-sub-headline-box">
          ${data.subtitle}
        </div>

        <div class="mk-lead-image-box">
          <div class="mk-lead-image-content">
            <span><strong>기사 대표 이미지 영역</strong></span>
            <span style="font-size:12px; color:#757575;">${data.leadImage.desc}</span>
          </div>
          <div class="mk-lead-image-caption">${data.leadImage.caption}</div>
        </div>
      `;
    } else {
      headerHtml = `
        <span class="mk-category-path">${data.categoryPath}</span>
        <h1 class="mk-headline-title" id="articleHeadlineTitle">${activeTitle}</h1>

        <div class="mk-meta-row">
          <span><strong>${data.reporter}</strong></span>
          <span>업데이트 : ${data.date}</span>
        </div>

        <div class="mk-article-utility-bar">
          <div class="mk-utility-left">
            <span>구글 검색 선호 추가</span>
          </div>
          <div>
            <span>요약 | 듣기</span>
          </div>
        </div>

        <div class="mk-sub-headline-box">
          ${data.subtitle}
        </div>

        <div class="mk-lead-image-box">
          <div class="mk-lead-image-content">
            <span><strong>기사 대표 보도사진 영역</strong></span>
            <span style="font-size:12px; color:#757575;">${data.leadImage.desc}</span>
          </div>
          <div class="mk-lead-image-caption">${data.leadImage.caption}</div>
        </div>
      `;
    }

    articleWrapper.innerHTML = headerHtml;

    const blocksContainer = document.createElement("div");
    blocksContainer.className = "article-blocks-container";

    data.blocks.forEach((block, idx) => {
      const blockEl = createBlockElement(block, isGeoMode, idx, data.blocks.length);
      blocksContainer.appendChild(blockEl);
    });

    articleWrapper.appendChild(blocksContainer);
    previewContainer.appendChild(articleWrapper);
    updateCharCount();
  }

  // 4. 전체 화면 새로고침
  function updateAllViews() {
    renderTitleCandidates();
    renderPreview();
  }

  // 5. 1번 자료를 바탕으로 새 기사 강제 생성 실행
  function triggerGenerateArticle() {
    const rawText = pressReleaseText.value.trim();
    if (!rawText) {
      showToast("1번에 보도자료를 먼저 입력해 주세요. (또는 상단 예시 버튼을 눌러보세요)");
      return;
    }
    generatedArticleData = getActiveTemplateData();
    updateAllViews();
    showToast("✓ 1번 자료를 분석하여 매경 기사가 성공적으로 자동 조립되었습니다!");
  }

  // 생성 버튼 클릭
  if (generateArticleBtn) {
    generateArticleBtn.addEventListener("click", triggerGenerateArticle);
  }

  // 6. 보도자료 텍스트 입력 시 실시간/자동 반영 (디바운스 처리)
  // 예시 버튼으로 채운 자료를 지우고 새 자료를 넣으면, 예시의 기업명·메모·링크·브랜드 카드도 함께 비운다
  let exampleText = "";
  document.querySelectorAll(".sample-btn").forEach(btn => {
    btn.addEventListener("click", () => setTimeout(() => { exampleText = pressReleaseText.value; }, 0));
  });
  function clearExampleLeftovers() {
    if (!exampleText || pressReleaseText.value.includes(exampleText.slice(0, 30))) return;
    exampleText = "";
    brandNameInput.value = "";
    keyPointInput.value = "";
    document.querySelectorAll(".url-input").forEach((input, idx) => {
      if (idx === 0) input.value = "";
      else input.closest(".url-input-item").remove();
    });
    if (multiBrandTheme) multiBrandTheme.value = "";
    isMultiBrandMode = false;
    multiBrandList = [];
    multiBrandIntro = "";
    if (multiBrandPanel) multiBrandPanel.classList.add("hidden");
    if (brandCardsContainer) brandCardsContainer.innerHTML = "";
    showToast("새 자료가 입력되어 예시의 기업명·메모·링크를 비웠습니다.");
  }

  let inputDebounceTimer = null;
  pressReleaseText.addEventListener("input", () => {
    clearExampleLeftovers();
    if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
      if (pressReleaseText.value.trim().length > 20) {
        generatedArticleData = getActiveTemplateData();
        updateAllViews();
      }
    }, 600);
  });

  brandNameInput.addEventListener("input", () => {
    if (pressReleaseText.value.trim().length > 20) {
      generatedArticleData = getActiveTemplateData();
      updateAllViews();
    }
  });

  keyPointInput.addEventListener("input", () => {
    if (pressReleaseText.value.trim().length > 20) {
      generatedArticleData = getActiveTemplateData();
      updateAllViews();
    }
  });

  // 7. 기사 전체 복사
  function copyEntireArticle() {
    const data = getCurrentData();
    const activeTitle = getActiveTitle();

    let fullText = `${activeTitle}\n\n`;
    fullText += `${data.subtitle}\n\n`;

    const enabledBlocks = data.blocks.filter(b => b.enabled);
    if (enabledBlocks.length === 0) {
      showToast("포함된 블록이 없습니다. 최소 하나 이상의 블록을 켜주세요.");
      return;
    }

    enabledBlocks.forEach(b => {
      fullText += `${extractBlockText(b)}\n\n`;
    });

    fullText += `${data.reporter} (${data.date})`;

    copyTextToClipboard(fullText.trim(), "기사 전체가 클립보드에 복사되었습니다! (메모장/기사 송고창에 붙여넣으세요)");
  }

  copyAllTopBtn.addEventListener("click", copyEntireArticle);

  // 8. 제목 새로고침(다른 스타일 추천) 이벤트
  if (refreshTitleBtn) {
    refreshTitleBtn.addEventListener("click", () => {
      const data = getCurrentData();
      if (!data.titleCandidates || data.titleCandidates.length === 0) return;

      // 직접 수정한 제목이 있었다면 초기화하고 다음 번호로 순환
      data.customTitle = "";
      data.selectedTitleIndex = ((data.selectedTitleIndex || 0) + 1) % data.titleCandidates.length;

      // 텍스트 부드러운 전환 효과
      if (activeTitleDisplay) {
        activeTitleDisplay.style.opacity = "0.2";
        setTimeout(() => {
          activeTitleDisplay.style.opacity = "1";
        }, 120);
      }

      renderTitleCandidates();
      renderPreviewHeaderOnly();
      updateCharCount();

      const currentStyle = getTitleStyleName(data, data.selectedTitleIndex);
      showToast(`[${currentStyle}] 제목으로 변경되었습니다.`);
    });
  }

  // 9. 제목 직접 수정 & 복사
  editActiveTitleBtn.addEventListener("click", () => {
    titleEditBox.classList.toggle("hidden");
    if (!titleEditBox.classList.contains("hidden")) {
      directTitleInput.value = getActiveTitle();
      directTitleInput.focus();
    }
  });

  saveTitleEditBtn.addEventListener("click", () => {
    const newTitle = directTitleInput.value.trim();
    if (!newTitle) {
      alert("제목을 입력해 주세요.");
      return;
    }
    const data = getCurrentData();
    data.customTitle = newTitle;
    titleEditBox.classList.add("hidden");
    renderTitleCandidates();
    renderPreviewHeaderOnly();
    showToast("제목이 수정되었습니다.");
  });

  cancelTitleEditBtn.addEventListener("click", () => {
    titleEditBox.classList.add("hidden");
  });

  copyActiveTitleBtn.addEventListener("click", () => {
    copyTextToClipboard(getActiveTitle(), "선택한 제목이 복사되었습니다.");
  });

  // 9. 상위 탭 전환 (기사식 광고 vs GEO 기사)
  mainTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const selectedStyle = tab.getAttribute("data-style");
      if (currentMainStyle === selectedStyle) return;

      currentMainStyle = selectedStyle;

      mainTabs.forEach(t => {
        const isActive = t === tab;
        t.classList.toggle("active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      if (currentMainStyle === "geo") {
        geoFormatContainer.classList.remove("hidden");
      } else {
        geoFormatContainer.classList.add("hidden");
      }

      titleEditBox.classList.add("hidden");
      generatedArticleData = getActiveTemplateData();
      updateAllViews();
    });
  });

  // 10. GEO 세부 형식 탭 전환
  subTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const selectedFormat = tab.getAttribute("data-geo-format");
      if (currentGeoFormat === selectedFormat) return;

      currentGeoFormat = selectedFormat;

      subTabs.forEach(t => {
        const isActive = t === tab;
        t.classList.toggle("active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      titleEditBox.classList.add("hidden");
      generatedArticleData = getActiveTemplateData();
      updateAllViews();
    });
  });

  // 11. 링크 추가/삭제
  addUrlBtn.addEventListener("click", () => {
    const urlItem = document.createElement("div");
    urlItem.className = "url-input-item";
    urlItem.innerHTML = `
      <input type="url" class="input-field url-input" placeholder="https://example.com/sub-page">
      <button type="button" class="btn-icon-remove remove-url-btn" title="삭제">&times;</button>
    `;
    urlListContainer.appendChild(urlItem);

    urlItem.querySelector(".remove-url-btn").addEventListener("click", () => {
      urlItem.remove();
      if (pressReleaseText.value.trim().length > 20) {
        generatedArticleData = getActiveTemplateData();
        updateAllViews();
      }
    });
  });

  document.querySelectorAll(".remove-url-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const parent = e.target.closest(".url-input-item");
      if (urlListContainer.children.length > 1) {
        parent.remove();
      } else {
        parent.querySelector(".url-input").value = "";
      }
    });
  });

  // 12. 파일 첨부
  pressReleaseFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      alert("텍스트 파일(.txt)을 선택해 주세요.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      pressReleaseText.value = event.target.result;
      fileUploadStatus.textContent = `✓ '${file.name}' 파일을 불러왔습니다.`;
      triggerGenerateArticle();
    };
    reader.readAsText(file, "UTF-8");
  });

  // 13. PDF 텍스트 자동 추출 엔진 (PDF.js 연동)
  async function extractTextFromPdf(file) {
    if (!window.pdfjsLib) {
      showToast("PDF 리더 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.");
      return null;
    }

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }

    if (pdfFileName) {
      pdfFileName.innerHTML = `<span class="pdf-spinner"></span> <strong>${file.name}</strong> 텍스트 자동 추출 중...`;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items.map(it => it.str).join(" ");
        if (pageStr.trim()) {
          fullText += pageStr + "\n\n";
        }
      }

      const cleanText = fullText.trim();
      if (!cleanText) {
        if (pdfFileName) {
          pdfFileName.textContent = `확인 필요: ${file.name} (추출 가능한 텍스트가 없습니다. 이미지 스캔본일 수 있습니다)`;
        }
        showToast("PDF에서 추출된 텍스트가 없습니다. 텍스트 복사가 가능한 PDF인지 확인해 주세요.");
        return null;
      }

      if (pdfFileName) {
        pdfFileName.textContent = `✓ 텍스트 추출 완료: ${file.name} (${pdf.numPages}페이지, ${(file.size / (1024 * 1024)).toFixed(1)}MB)`;
      }
      return cleanText;
    } catch (err) {
      console.error("PDF 추출 오류:", err);
      if (pdfFileName) {
        pdfFileName.textContent = `오류: ${file.name} 텍스트 추출 실패`;
      }
      showToast("PDF 파일을 읽는 중 오류가 발생했습니다.");
      return null;
    }
  }

  async function handlePdfFile(file) {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      alert("PDF 파일만 첨부할 수 있습니다.");
      return;
    }

    const text = await extractTextFromPdf(file);
    if (text) {
      pressReleaseText.value = text;
      if (!brandNameInput.value.trim()) {
        const autoBrand = file.name.replace(/\.pdf$/i, "").split(/_|-|\s/)[0];
        if (autoBrand && autoBrand.length <= 12) {
          brandNameInput.value = autoBrand;
        }
      }
      fileUploadStatus.textContent = `✓ PDF '${file.name}'에서 보도자료 텍스트를 자동 추출하여 입력했습니다.`;
      triggerGenerateArticle();
      showToast(`✓ PDF '${file.name}' 텍스트 자동 추출 완료! 기사가 자동 조립되었습니다.`);
    }
  }

  pdfDropzone.addEventListener("click", () => {
    pdfFileInput.click();
  });

  pdfFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handlePdfFile(file);
    }
  });

  pdfDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    pdfDropzone.classList.add("dragover");
  });

  pdfDropzone.addEventListener("dragleave", () => {
    pdfDropzone.classList.remove("dragover");
  });

  pdfDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    pdfDropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePdfFile(e.dataTransfer.files[0]);
    }
  });

  // 14. 추가 정보 아코디언
  optionalToggle.addEventListener("click", () => {
    optionalFields.classList.toggle("open");
    optionalIndicator.classList.toggle("open");
  });

  // 15. 예시 자료 1 (신한카드 ‘컬리 신한카드’ - GEO 정보성 적립률 혜택형 / 12170377)
  if (loadSample1Btn) {
    loadSample1Btn.addEventListener("click", () => {
      pressReleaseText.value = `[보도자료] “멤버십 더해 최대 14% 적립”…신한카드, ‘컬리 신한카드’ 출시

신한카드(대표 문동권)가 장보기 앱 컬리와 손잡고 컬리 특화 PLCC(상업자 표시 신용카드)인 ‘컬리 신한카드’를 전격 출시했다고 10일 밝혔다.

주요 혜택 및 특징:
- 컬리멤버십(월 1,900원) 이용 고객 결제 시 최대 14% 컬리적립금 제공 (기본 멤버십 혜택 7% + 카드 혜택 최대 7%)
- 컬리 외 일상 생활영역(배달앱·커피·편의점 등) 결제 시 이용금액의 최대 5% 추가 적립
- 신규 카드 출시 기념: 10월 31일까지 컬리 첫 결제 시 전월 실적 무관 1만5,000원 캐시백 증정
- 연회비: 국내전용 1만5,000원, 해외겸용(마스터카드) 1만8,000원

신한카드 관계자는 “장보기 필수 앱으로 자리 잡은 컬리 고객들에게 실질적인 적립 혜택을 극대화하기 위해 멤버십과 결합된 전용 카드를 기획했다”며 “앞으로도 일상 소비에서 체감할 수 있는 맞춤형 혜택을 지속 확대해 나갈 것”이라고 전했다.`;

      const firstUrl = urlListContainer.querySelector(".url-input");
      if (firstUrl) firstUrl.value = "https://www.mk.co.kr/news/pick/12170377";

      brandNameInput.value = "신한카드";
      keyPointInput.value = "컬리멤버십 결제 시 최대 14% 적립, 신규 출시 기념 1만5천원 캐시백";
      fileUploadStatus.textContent = "✓ 예시 1 (신한카드 컬리) 자료가 입력되었습니다.";

      currentMainStyle = "geo";
      currentGeoFormat = "info";
      mainTabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-style") === "geo"));
      geoFormatContainer.classList.remove("hidden");
      subTabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-geo-format") === "info"));

      triggerGenerateArticle();
    });
  }

  // 16. 예시 자료 2 (삼양식품 태국 ‘Love Korea 2026’ - GEO 기업뉴스 5W1H 행사형 / 12133315)
  if (loadSample2Btn) {
    loadSample2Btn.addEventListener("click", () => {
      pressReleaseText.value = `[보도자료] 삼양식품, 태국 ‘Love Korea 2026’ 참가… K-푸드 매운맛 열풍 잇는다

삼양식품(대표 김정수)이 태국 방콕 대형 쇼핑몰 센트럴월드(CentralwOrld)에서 열린 ‘Love Korea 2026’ 행사에 공식 참가해 글로벌 불닭 브랜드와 신규 매운 국물라면 ‘맵탱’ 홍보관을 성황리에 운영했다고 12일 밝혔다.

주요 활동 및 성과:
- 주체: 삼양식품 해외영업본부 및 현지 파트너사
- 일시 및 장소: 2026년 10월 10일~12일, 태국 방콕 센트럴월드 야외 특설무대
- 불닭볶음면 및 맵탱 시식존 운영: 3일간 현지 방문객 3만여 명 몰리며 인산인해
- 현지 대형 유통망 바이어 100여 개사와 1:1 수출 및 입점 상담 진행
- 태국 현지 인기 인플루언서 10여 명 초청 매운맛 챌린지 숏폼 라이브 방송 진행

삼양식품 해외영업 관계자는 “태국은 동남아 K-푸드 트렌드를 선도하는 핵심 거점 시장”이라며 “불닭의 강력한 브랜드 파워를 바탕으로 차세대 라인업인 맵탱까지 수출을 확대해 현지 소비자들의 입맛을 사로잡을 것”이라고 강조했다.`;

      const firstUrl = urlListContainer.querySelector(".url-input");
      if (firstUrl) firstUrl.value = "https://www.mk.co.kr/news/pick/12133315";

      brandNameInput.value = "삼양식품";
      keyPointInput.value = "태국 방콕 센트럴월드 Love Korea 2026 참가, 바이어 100여 개사 상담";
      fileUploadStatus.textContent = "✓ 예시 2 (삼양식품 태국) 자료가 입력되었습니다.";

      currentMainStyle = "geo";
      currentGeoFormat = "story";
      mainTabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-style") === "geo"));
      geoFormatContainer.classList.remove("hidden");
      subTabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-geo-format") === "story"));

      triggerGenerateArticle();
    });
  }

  // 17. 예시 자료 3 (서울시오페라단 〈라보엠〉 - 기사식 광고 공연·문화형 / 12163588)
  if (loadSample3Btn) {
    loadSample3Btn.addEventListener("click", () => {
      pressReleaseText.value = `[보도자료] ‘전석 매진’ 신화 쓴 서울시오페라단 〈라보엠〉, 세종문화회관 대극장 귀환

세종문화회관(사장 안호상) 서울시오페라단(단장 박혜진)이 2024년 객석 점유율 98%를 기록하며 전석 매진 신화를 쓴 오페라 〈라보엠〉을 오는 11월 20일부터 23일까지 세종문화회관 대극장에서 다시 선보인다.

공연 개요 및 주요 캐스팅:
- 공연 일정: 2026년 11월 20일(목) ~ 11월 23일(일), 총 4일간 4회 공연
- 공연 장소: 세종문화회관 대극장 (러닝타임 약 140분)
- 미미 역: 퀸 엘리자베스 콩쿠르 우승자 소프라노 서선영, 차이콥스키 콩쿠르 2위 손지혜 더블 캐스팅
- 로돌포 역: 메트로폴리탄 오페라 주역 테너 백석종, 독일 드레스덴 젬퍼오퍼 주역 강요셉 출연
- 지휘 및 연주: 최희준 지휘 경기필하모닉오케스트라, 연출 엄숙정

서울시오페라단 박혜진 단장은 “푸치니 서거 100주년을 기념해 세계적 프리마돈나와 정상급 테너들이 한자리에 모였다”라며 “청춘의 뜨거운 사랑과 예술혼을 웅장한 대극장 무대에서 관객들에게 깊은 감동으로 선사하겠다”고 밝혔다.

예매는 세종문화회관 공식 홈페이지 및 인터파크 티켓에서 가능하다.`;

      const firstUrl = urlListContainer.querySelector(".url-input");
      if (firstUrl) firstUrl.value = "https://www.mk.co.kr/news/pick/12163588";

      brandNameInput.value = "서울시오페라단";
      keyPointInput.value = "전석 매진 라보엠 대극장 귀환, 세계 정상급 성악가 총출동, 11월 20~23일 4일간 공연";
      fileUploadStatus.textContent = "✓ 예시 3 (서울시오페라단 라보엠) 자료가 입력되었습니다.";

      currentMainStyle = "ad";
      mainTabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-style") === "ad"));
      geoFormatContainer.classList.add("hidden");

      triggerGenerateArticle();
    });
  }

  // 18. 예시 자료 4 (한국인터넷전문가협회 아이어워즈 2026 - 기사식 광고 IT·어워드형 / 12149000)
  if (loadSample4Btn) {
    loadSample4Btn.addEventListener("click", () => {
      pressReleaseText.value = `[보도자료] 한국인터넷전문가협회 ‘아이어워즈 2026’ 수상후보 공모 시작

사단법인 한국인터넷전문가협회(KIPFA, 협회장 민승재)와 아이어워즈위원회(i-AWARDS, 위원장 유인호)가 대한민국 인터넷서비스 혁신을 이끈 주역을 찾는 ‘아이어워즈 2026’ 수상후보 공모를 시작한다고 밝혔다. 접수 기간은 오는 9월 1일부터 10월 31일까지며, 공식 홈페이지에서 신청할 수 있다.

주요 내용 및 일정:
- 국내 최고 권위의 5개 시상식(웹어워드코리아, 스마트앱어워드, 소셜아이어워드, AI서비스어워드, 인터넷에코어워드) 통합 공모
- 4000여 명의 전문가 평가위원단과 전문위원들의 다층적이고 엄정한 공정 심사
- 수상 여부와 관계없이 출품 서비스의 객관적 경쟁력을 분석한 '전문가 평가보고서' 참가 기업 전원 제공
- 추진 일정: ▲후보등록(9/1~10/31) ▲후보평가(10/20~11/26) ▲최종 발표(11/27) ▲시상식(12/17 양재 엘타워)

아이어워즈위원회 유인호 위원장은 “아이어워즈 2026은 올 한 해 사용자 중심의 혁신적인 인터넷서비스를 선보이기 위해 치열하게 달려온 전문가들의 노고를 기리는 자리”라며 “이번 시상식이 디지털 서비스의 진정한 가치를 되새기고 차세대 서비스 개발을 위한 강력한 영감의 장이 되기를 기대한다”라고 전했다.

공모 및 세부 문의는 아이어워즈 공식 홈페이지 및 사무국을 통해 가능하다.`;

      const firstUrl = urlListContainer.querySelector(".url-input");
      if (firstUrl) firstUrl.value = "https://www.mk.co.kr/news/it/12149000";

      brandNameInput.value = "한국인터넷전문가협회";
      keyPointInput.value = "국내 최고 권위 아이어워즈 2026 공모, 4천여 전문가 심사, 12월 17일 양재 엘타워 개최";
      fileUploadStatus.textContent = "✓ 예시 4 (아이어워즈 2026) 자료가 입력되었습니다.";

      currentMainStyle = "ad";
      mainTabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-style") === "ad"));
      geoFormatContainer.classList.add("hidden");

      triggerGenerateArticle();
    });
  }

  // 19. 복수 브랜드 자동 분리 버튼 (방안 C)
  if (autoSplitBrandsBtn) {
    autoSplitBrandsBtn.addEventListener("click", () => {
      const rawText = pressReleaseText.value.trim();
      if (!rawText) {
        showToast("보도자료 본문을 먼저 입력해 주세요. (또는 상단 '예시 5'를 눌러보세요)");
        return;
      }

      const parsed = parseMultiBrandText(rawText);
      if (parsed.length === 0) {
        showToast("본문에서 브랜드를 감지하지 못했습니다. '+ 브랜드 추가'로 직접 등록해 보세요.");
        return;
      }

      multiBrandList = parsed;
      isMultiBrandMode = true;
      if (multiBrandPanel) multiBrandPanel.classList.remove("hidden");
      renderBrandCards();
      triggerGenerateArticle();
      showToast(`✓ 본문 속 ${multiBrandList.length}개 브랜드를 감지하여 카드로 분리했습니다!`);
    });
  }

  // 브랜드 카드 직접 추가
  if (addSingleBrandCardBtn) {
    addSingleBrandCardBtn.addEventListener("click", () => {
      isMultiBrandMode = true;
      if (multiBrandPanel) multiBrandPanel.classList.remove("hidden");
      multiBrandList.push({
        id: Date.now() + Math.random(),
        brand: `신규 브랜드 ${multiBrandList.length + 1}`,
        campaign: "신규 캠페인 / 기획전",
        benefit: "주요 할인 및 고객 혜택 내용",
        content: "행사 상세 설명 및 일정 등을 입력하세요."
      });
      renderBrandCards();
      triggerGenerateArticle();
      showToast("새 브랜드 카드가 추가되었습니다.");
    });
  }

  // 일반 모드로 닫기
  if (closeMultiBrandPanelBtn) {
    closeMultiBrandPanelBtn.addEventListener("click", () => {
      isMultiBrandMode = false;
      if (multiBrandPanel) multiBrandPanel.classList.add("hidden");
      triggerGenerateArticle();
      showToast("단일 브랜드 일반 모드로 전환되었습니다.");
    });
  }

  // 공통 테마 수정 시 실시간 반영
  if (multiBrandTheme) {
    let themeDebounce = null;
    multiBrandTheme.addEventListener("input", () => {
      if (themeDebounce) clearTimeout(themeDebounce);
      themeDebounce = setTimeout(() => {
        if (isMultiBrandMode) triggerGenerateArticle();
      }, 400);
    });
  }

  // 20. 예시 자료 5 (10월 10일 임산부의 날 5개사 모음 - 라운드업 종합 기획 / 12171568)
  if (loadSample5Btn) {
    loadSample5Btn.addEventListener("click", () => {
      pressReleaseText.value = `[기획 보도자료 종합] 10월 10일 ‘임산부의 날’ 유래와 주요 기업들의 따뜻한 동행

10월 10일은 임신 10개월을 기념하는 법정기념일인 ‘임산부의 날’입니다. 2005년 모자보건법 개정으로 제정되어 출산 친화적 환경과 임산부 배려 문화를 확산하고 있습니다. 올해 임산부의 날을 맞아 각 기업들이 선보인 따뜻한 나눔 캠페인과 실속 프로모션을 총정리합니다.

[남양유업], 참여가 나눔이 되는 ‘서프라이즈 베이비’ 캠페인
남양유업은 출산을 앞둔 가정을 응원하고 취약계층 임산부를 지원하는 ‘서프라이즈 베이비’ 캠페인을 오는 10월 19일까지 진행합니다. 추첨을 통해 출산 예정 100가정에 자체 제작한 ‘첫 100일 키트’를 무료로 증정합니다. 키트에는 유기농 산양 분유, 스킨케어, 초점책, 수유등 등 10개 필수 품목이 담겼습니다. 특히 일반 신청자가 100명을 넘으면 미혼모·한부모 취약계층 임산부 100명에게도 동일한 키트를 전달하는 매칭 기부 방식으로 운영됩니다.

[러베 (ruuve)], 감동을 전하는 ‘열 달의 러브레터’ 캠페인
베이비 스킨케어 브랜드 러베(ruuve)가 10월 10일 임산부의 날을 기념해 온라인 응원 메시지를 실물 편지로 제작해 전하는 ‘열 달의 러브레터’ 캠페인을 10월 18일까지 진행합니다. 참여자 중 26명을 선정해 맞춤 제작된 감동 러브레터 카드와 베이비 스킨케어 정품 출산박스를 증정합니다. 임산부 본인은 물론 배우자, 가족, 친구 누구나 응원 선물하기로 참여할 수 있습니다.

[KB캐피탈], 사각지대 위기임산부 및 취약계층 영유아 120가정에 1억원 긴급 지원
KB캐피탈이 임산부의 날을 맞아 복지 사각지대 위기임산부 60가정에 생계비·의료비·주거비 등 가정당 최대 130만원 상당을 지원합니다. 또한 생후 24개월 미만 영유아 60가정을 위해 신생아 의류, 위생용품, 부모용 양육 콘텐츠북이 담긴 13만원 상당의 맞춤 양육키트를 전달하여 총 1억원 규모의 사회공헌 사업을 추진합니다.

[베베룬], 출산 필수품 모달 손수건·턱받이 ‘1+1 빅 페스티벌’
프리미엄 유아 섬유 브랜드 베베룬이 친환경 모달 원단 중심의 실속 혜택전을 오늘(10일) 자정까지 단독 진행합니다. 고온 건조기 사용에도 부드러움이 유지되는 ‘에코 프리미엄 소프트모달 손수건’과 ‘보타닉모달 테리턱받이’ 전 제품 1+1 혜택을 제공하며, 출산 준비 필수 라인업을 최대 63% 특가 할인합니다.

[글라스락 베이비], 이유식 필수템 기획전 & 초음파 사진 인증 이벤트
토탈 이유식 솔루션 브랜드 글라스락 베이비가 안심 내열강화유리 이유식기 중심의 할인 기획전을 10월 11일까지 진행합니다. 공식몰 기획전을 통해 눈금 이유식 용기와 조리도구를 최대 55% 할인하며, 촬영 날짜가 표기된 초음파 사진 인증 시 ‘이유식 스타터 패키지’를 증정합니다.`;

      const firstUrl = urlListContainer.querySelector(".url-input");
      if (firstUrl) firstUrl.value = "https://www.mk.co.kr/news/pick/12171568";

      if (multiBrandTheme) {
        multiBrandTheme.value = "10월 10일 ‘임산부의 날’ 유래와 기업들의 따뜻한 동행";
      }

      fileUploadStatus.textContent = "✓ 예시 5 (임산부의 날 5개사) 자료가 입력되었습니다.";

      // 자동 분리 버튼 실행
      if (autoSplitBrandsBtn) {
        autoSplitBrandsBtn.click();
      }
    });
  }

  // 21. 지우기
  clearInputsBtn.addEventListener("click", () => {
    pressReleaseText.value = "";
    pressReleaseFile.value = "";
    fileUploadStatus.textContent = "";
    document.querySelectorAll(".url-input").forEach((input, idx) => {
      if (idx === 0) input.value = "";
      else input.closest(".url-input-item").remove();
    });
    pdfFileInput.value = "";
    pdfFileName.textContent = "PDF 파일 최대 50MB";
    brandNameInput.value = "";
    keyPointInput.value = "";
    isMultiBrandMode = false;
    multiBrandList = [];
    multiBrandIntro = "";
    if (multiBrandPanel) multiBrandPanel.classList.add("hidden");
    if (brandCardsContainer) brandCardsContainer.innerHTML = "";
    generatedArticleData = null;
    updateAllViews();
    showToast("입력창이 초기화되었습니다.");
  });

  // 초기 렌더링
  updateAllViews();
});
