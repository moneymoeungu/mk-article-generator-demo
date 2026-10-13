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
  // GEO 최적화: 팬아웃 쿼리 수렴 알고리즘 기반 FAQ 10선 자동 생성기
  // ==========================================================================
  function generateFanOutFaqs(params) {
    const { company, product, killerStat, keyPoint, urls, eventDate, bulletItems, isMulti, brandList, theme } = params;
    const authUrl = (urls && urls[0]) ? urls[0] : `${company || '공식'} 홈페이지`;

    if (isMulti && brandList && brandList.length > 0) {
      const bNames = brandList.map(b => b.brand);
      const bStr = bNames.slice(0, 3).join(", ") + (bNames.length > 3 ? " 등" : "");
      return [
        {
          id: "faq_m_1",
          q: `Q1. 이번 ${theme} 기념 기획전의 전체 일정과 브랜드별 마감일은 어떻게 되나요?`,
          a: `행사 및 프로모션별로 상이합니다. 베베룬의 1+1 기획전 등 일부 행사는 당일 자정 마감되며, 남양유업(10월 19일), 러베(10월 18일), 글라스락 베이비(10월 11일) 등 각 사의 세부 마감 일정을 확인하시기 바랍니다.`,
          enabled: true
        },
        {
          id: "faq_m_2",
          q: `Q2. 참여형 이벤트(인증 및 사연 접수)에 참여하려면 어떤 서류나 인증이 필요한가요?`,
          a: `각 브랜드 공식 SNS 및 랜딩페이지 기준에 따릅니다. 글라스락 베이비는 촬영 날짜가 표기된 초음파 사진 접수가 필수이며, 남양유업은 개인 SNS 임신/만삭 사진 인증, 러베는 온라인 응원 메시지 작성을 통해 간편하게 응모할 수 있습니다.`,
          enabled: true
        },
        {
          id: "faq_m_3",
          q: `Q3. 남양유업의 ‘서프라이즈 베이비’처럼 취약계층 기부와 연계된 방식은 어떻게 운영되나요?`,
          a: `일반 참여자의 신청 건수가 100건을 넘어서면, 한국한부모가족복지시설협회를 통해 미혼모·한부모 취약계층 임산부 100명에게도 동일한 ‘첫 100일 키트’를 1:1 매칭 기부하는 뜻깊은 나눔 방식으로 진행됩니다.`,
          enabled: true
        },
        {
          id: "faq_m_4",
          q: `Q4. 러베(ruuve)의 ‘열 달의 러브레터’는 임산부 본인 외에 가족이나 지인도 신청 가능한가요?`,
          a: `네, 가능합니다. 임산부 본인은 물론 남편(배우자), 부모, 친구 등 소중한 임산부를 응원하고 싶은 사람이라면 누구나 ‘응원 선물하기’ 코너를 통해 자유롭게 사연을 접수할 수 있습니다.`,
          enabled: true
        },
        {
          id: "faq_m_5",
          q: `Q5. 베베룬과 글라스락 베이비 등의 파격 할인(최대 55~63%)은 오프라인 매장에서도 적용되나요?`,
          a: `본 프로모션은 각 브랜드 공식 온라인몰 단독으로 진행되는 행사입니다. 오프라인 백화점이나 대형마트 매장과는 행사 품목 및 할인율이 상이할 수 있으므로 공식몰을 통한 구매를 권장합니다.`,
          enabled: true
        },
        {
          id: "faq_m_6",
          q: `Q6. KB캐피탈의 위기임산부 및 영유아 가정 지원 사업의 지원 대상과 규모는 어떻게 되나요?`,
          a: `복지 사각지대에 놓인 위기임산부 60가정에 가정당 최대 130만원의 긴급 생계·주거·의료비를 지원하며, 생후 24개월 미만 영유아 60가정에는 13만원 상당의 맞춤 양육키트를 지원하여 총 1억원 규모로 추진됩니다.`,
          enabled: true
        },
        {
          id: "faq_m_7",
          q: `Q7. 여러 브랜드의 이벤트와 할인 혜택을 동시에 중복으로 수령할 수 있나요?`,
          a: `각 기업이 독립적으로 주최하는 캠페인이므로, 참가 자격 및 일정 요건만 충족한다면 여러 브랜드의 프로모션과 사은품 증정 행사에 중복으로 참여하여 혜택을 누릴 수 있습니다.`,
          enabled: true
        },
        {
          id: "faq_m_8",
          q: `Q8. 기획전 패키지 구매 시 제공되는 사은품은 선착순인가요, 전원 증정인가요?`,
          a: `글라스락 베이비의 멀티쿠커 용기 증정처럼 패키지 구매 고객 전원에게 제공되는 사은품이 있는 반면, 일부 한정 수량 사은품은 조기 소진될 수 있으므로 결제 전 이벤트 페이지 유의사항을 확인해야 합니다.`,
          enabled: true
        },
        {
          id: "faq_m_9",
          q: `Q9. 당첨자 발표 및 키트·경품 배송은 언제 이루어지나요?`,
          a: `남양유업은 10월 28일, 러베는 10월 21일 공식 인스타그램 및 개별 알림을 통해 당첨자를 발표하며, 10월 말부터 순차적으로 안전하게 택배 배송될 예정입니다.`,
          enabled: true
        },
        {
          id: "faq_m_10",
          q: `Q10. 추가적인 행사 문의 및 상세 혜택 확인은 어디서 가능한가요?`,
          a: `참여 기업(${bStr})의 각 사 공식 홈페이지 및 인스타그램 공식 계정, 고객센터를 통해 세부 이벤트 규정과 잔여 수량을 실시간으로 확인하실 수 있습니다.`,
          enabled: true
        }
      ];
    }

    // 단일 브랜드 기사일 때 (신한카드 컬리, 삼양식품, 라보엠 등)
    return [
      {
        id: "faq_s_1",
        q: `Q1. ‘${product}’의 가장 핵심적인 혜택과 특장점은 무엇인가요?`,
        a: `${company}의 ‘${product}’는 ${killerStat ? killerStat + '의 실질적 체감 혜택' : '차별화된 기능'}과 ${bulletItems[0] || '우수한 사용자 편의성'}을 집약하여, 고객이 일상에서 즉각적인 효용을 누릴 수 있도록 설계된 것이 가장 큰 특징입니다.`,
        enabled: true
      },
      {
        id: "faq_s_2",
        q: `Q2. 신규 출시 기념 프로모션의 참여 조건과 기한은 어떻게 되나요?`,
        a: `${eventDate || '출시 프로모션 기간'} 동안 공식 채널을 통해 신청한 고객을 대상으로 ${keyPoint || (bulletItems[1] || '풍성한 캐시백 및 사은 혜택')}이 주어지며, 전월 실적 완화 등의 특별 혜택도 함께 제공됩니다.`,
        enabled: true
      },
      {
        id: "faq_s_3",
        q: `Q3. 이용 비용(연회비 또는 도입비) 대비 실질적으로 체감할 수 있는 경제적 이득은?`,
        a: `${killerStat || '차별화된 적립/할인 혜택'}을 월간 실소비에 적용할 경우, 기본 유지비용을 상회하는 실질적인 비용 절감 및 적립금 환급 효과를 거둘 수 있어 높은 가성비를 제공합니다.`,
        enabled: true
      },
      {
        id: "faq_s_4",
        q: `Q4. 어떤 소비 패턴이나 실무 환경을 가진 사용자에게 이 솔루션이 가장 유리한가요?`,
        a: `일상적인 반복 결제나 핵심 업무에서 고비용·저효율의 불편을 겪었던 고객에게 가장 적합하며, 복잡한 설정 없이 원클릭으로 최대 성과를 내고자 하는 사용자에게 추천됩니다.`,
        enabled: true
      },
      {
        id: "faq_s_5",
        q: `Q5. 혜택을 온전히 받기 위해 전월 실적이나 제외 조건 등 주의해야 할 사항이 있나요?`,
        a: `기본적인 최소 실적 기준이 적용될 수 있으며, 일부 무이자할부나 세금 납부 등 비할인성 결제 항목은 실적 산정에서 제외될 수 있으므로 공식 약관의 제외 항목을 사전에 확인하는 것이 좋습니다.`,
        enabled: true
      },
      {
        id: "faq_s_6",
        q: `Q6. 기존에 출시된 유사 서비스나 경쟁 모델과 비교했을 때 차별화된 핵심 강점은?`,
        a: `기존 모델의 처리 지연과 비싼 부가비용 문제를 해결하고, ${bulletItems[0] || '사용자 맞춤형 직관 인터페이스'}와 높은 신뢰도를 바탕으로 독보적인 만족도를 이끌어냈다는 평가입니다.`,
        enabled: true
      },
      {
        id: "faq_s_7",
        q: `Q7. 모바일 앱 간편 등록이나 디지털 결제 환경에서의 연동 편의성은 어떠한가요?`,
        a: `간편결제 솔루션(페이 서비스) 및 공식 모바일 앱과 완벽히 호환되어, 카드나 프로그램 수령 전이라도 발급 즉시 온·오프라인 가맹점에서 등록 후 사용할 수 있습니다.`,
        enabled: true
      },
      {
        id: "faq_s_8",
        q: `Q8. 지급된 혜택(적립금 또는 라이선스 포인트)의 유효기간과 사용 범위는 어떻게 되나요?`,
        a: `적립된 혜택은 제휴 공식 플랫폼 및 일상 제휴 가맹점에서 현금처럼 편리하게 사용할 수 있으며, 통상 충분한 유효기간이 보장되어 소멸 부담 없이 여유롭게 활용 가능합니다.`,
        enabled: true
      },
      {
        id: "faq_s_9",
        q: `Q9. ‘${product}’의 공식 신청 및 발급/도입은 어디서 어떻게 진행할 수 있나요?`,
        a: `${company} 공식 웹사이트(${authUrl}) 및 전용 애플리케이션을 통해 비대면으로 간편하게 신청할 수 있으며, 24시간 언제든 신속하게 절차를 마칠 수 있습니다.`,
        enabled: true
      },
      {
        id: "faq_s_10",
        q: `Q10. 이용 중 문제가 발생했을 때 사후 지원 체계 및 향후 추가 업데이트 계획은?`,
        a: `${company}의 전담 고객센터를 통해 전문 상담을 제공하며, 향후에도 파트너십 확대 및 고객 피드백을 반영한 추가 혜택 업그레이드가 지속적으로 이어질 예정입니다.`,
        enabled: true
      }
    ];
  }

  // ==========================================================================
  // 텍스트 분석 및 기사 자동 조립 엔진 (규칙 기반)
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

    // 줄 단위 분리
    const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    // 1. 기업명/기관명/주최단체 추출
    let company = brandName;
    if (!company) {
      const orgMatch = rawText.match(/(?:사단법인\s+)?([가-힣A-Za-z0-9]+(?:협회|오페라단|예술단|재단|위원회|사업단|센터|카드|식품|전자|플래닛|플레이스|닷컴|컴퍼니|랩|소프트|솔루션|파트너스|바이오|제약|모빌리티|엔터테인먼트|그룹|건설|통신|은행|증권|\(주\)|주식회사))/);
      if (orgMatch) {
        company = orgMatch[1].replace(/\(주\)|주식회사/, "").trim();
      } else if (lines.length > 0) {
        const firstWord = lines[0].replace(/\[.*?\]/g, "").trim().split(/[\s,·]+/)[0];
        company = firstWord || "해당 기업";
      } else {
        company = "해당 기업";
      }
    }

    // 2. 직함 및 인물명 추출
    let personTitle = "관계자";
    let personName = "";
    const personMatch = rawText.match(/([가-힣A-Za-z]+)\s*(협회장|위원장|단장|대표|대표이사|총괄|원장|팀장|본부장|이사|상무|전무|사장|부회장|회장)\s*([가-힣]{2,4})?/);
    if (personMatch) {
      personTitle = personMatch[2];
      personName = personMatch[3] || personMatch[1];
    }

    // 3. 핵심 제품/공연/시상식/이벤트명 추출
    let product = "";
    const quoteMatch = rawText.match(/[‘'“<〈]([^'‘’"”>〉]{2,30})[’'”>〉]/);
    if (quoteMatch) {
      product = quoteMatch[1].trim();
    } else {
      const prodMatch = rawText.match(/(?:출시|개발|선보인|공개한|시작한|개최한|참가한)\s+([가-힣A-Za-z0-9\s]{2,15})/);
      if (prodMatch) product = prodMatch[1].trim();
      else product = "신규 솔루션";
    }

    // 4. 킬러 수치 추출 (% / 금액 / 인원 / 연수 등)
    const numberMatches = rawText.match(/(\d+(?:\.\d+)?(?:%|만\s*원|천\s*원|원|여\s*명|명|개사|개|곳|배|주년))/g) || [];
    const killerStat = numberMatches[0] || (keyPoint ? keyPoint.split(/[,·]/)[0] : "");

    // 5. 일정 및 장소 추출
    const dateMatches = rawText.match(/(\d{1,2}월\s*\d{1,2}일(?:\s*~\s*\d{1,2}월?\s*\d{1,2}일)?|\d{4}년\s*\d{1,2}월|\d{1,2}\/\d{1,2}~\d{1,2}\/\d{1,2})/g) || [];
    const locationMatch = rawText.match(/([가-힣A-Za-z0-9\s]+(?:엘타워|대극장|센트럴월드|코엑스|킨텍스|세종문화회관|라운지|호텔|홀|컨벤션|광화문))/);
    const eventDate = dateMatches[0] || "공식 일정";
    const eventLocation = locationMatch ? locationMatch[0].trim() : "공식 채널";

    // 6. 인용구 및 발언문 추출
    const quoteStatements = [];
    for (const match of rawText.matchAll(/[“"]([^"”]{10,250})[”"]/g)) {
      quoteStatements.push(match[1]);
    }
    const quoteQuote = quoteStatements[0] || (killerStat ? `${killerStat}의 압도적 혜택과 차별화된 가치를 전달할 수 있도록 준비했다` : "실사용자의 편의와 높은 가치를 최우선으로 고려해 개발했다");
    const quoteQuote2 = quoteStatements[1] || "앞으로도 시장과 고객에게 지속적인 영감과 혁신을 제공하는 의미 있는 도전을 이어가겠다";

    // 7. 불릿/리스트 항목 추출
    const bulletItems = [];
    lines.forEach(line => {
      if (/^[-•*▪▲]\s+|^\d+\.\s+|^\(주요\)|^핵심\s*:/.test(line)) {
        const cleaned = line.replace(/^[-•*▪▲]\s+|^\d+\.\s+/, "").trim();
        if (cleaned.length > 0) bulletItems.push(cleaned);
      }
    });

    // 8. 일반 서술 문단 추출
    const regularParagraphs = [];
    lines.forEach(line => {
      if (/^\[보도자료\]|^\[.*?\]$/.test(line)) return;
      if (/^[-•*▪▲]\s+|^\d+\.\s+/.test(line)) return;
      if (line.length > 15) regularParagraphs.push(line);
    });

    const leadParagraph = regularParagraphs[0] || `${company}가 ‘${product}’를 전격 공개하며 관련 시장의 큰 주목을 받고 있다.`;
    const bodyParagraph1 = regularParagraphs[1] || (bulletItems[0] ? `핵심 특징으로 ${bulletItems[0]} 등이 꼽히며 뛰어난 경쟁력을 입증했다.` : `이번 프로젝트는 기존 대비 편의성과 완성도를 획기적으로 끌어올린 것이 특징이다.`);
    const bodyParagraph2 = regularParagraphs[2] || (bulletItems[1] ? `또한 ${bulletItems[1]} 등을 통해 신뢰도와 사용자 만족도를 동시에 잡았다.` : `업계 전문가들은 이번 성과가 관련 산업의 새로운 표준을 정립할 것으로 기대하고 있다.`);

    // 날짜 포맷
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    // ==========================================================================
    // (A) 기사식 광고 블록 (매경 실전 기사: 서울시오페라단 라보엠 & 아이어워즈 패턴)
    // ==========================================================================
    const adTitles = [
      `“${killerStat ? killerStat + ' ' : ''}${keyPoint ? keyPoint.slice(0, 20) : '독보적 혜택' }”… ${company}, ‘${product}’ 전격 출격`,
      `${company} ‘${product}’… ${killerStat ? killerStat + ' 앞세워 ' : ''}시장 돌풍 예고`,
      `‘전석 매진’·흥행 신화 쓴 ${company}, ‘${product}’로 전격 귀환`,
      `${company} ‘${product}’ 참여 공모 시작… ${eventDate}까지 공식 접수`
    ];

    let adSubtitle = `${company}, ‘${product}’ ${eventDate} 본격 론칭\n`;
    adSubtitle += `${killerStat ? killerStat + ' 중심의 압도적 혜택과 전문성 집중\n' : ''}`;
    adSubtitle += `${eventLocation ? eventLocation + '서 행사 진행… 공식 채널 통해 확인 가능' : '공식 웹사이트를 통해 세부 사양 및 접수 안내'}`;

    const adBlocks = [
      {
        id: "gen_ad_p1",
        label: "도입 문단 (리드문)",
        type: "text",
        enabled: true,
        content: `${company}(${personTitle ? personTitle + (personName ? ' ' + personName : '') : '관계자'})가 대한민국 관련 산업의 새로운 패러다임을 이끌 ‘${product}’를 전격 선보인다고 밝혔다. 접수 및 신청 기간은 오는 ${eventDate}까지며, 공식 홈페이지를 통해 누구나 참여할 수 있다.`
      },
      {
        id: "gen_ad_p2",
        label: "본문 문단 1 (위상·실적)",
        type: "text",
        title: `${product}의 독보적인 위상과 검증된 경쟁력`,
        enabled: true,
        content: `${leadParagraph}\n\n${bodyParagraph1}`
      },
      {
        id: "gen_ad_p3",
        label: "본문 문단 2 (차별화·혜택)",
        type: "text",
        title: `사용자 관점의 실질적 가치와 차별화 포인트`,
        enabled: true,
        content: `${bodyParagraph2}\n\n${bulletItems.length > 0 ? `주요 특징으로는 ▲${bulletItems.slice(0, 3).join(' ▲')} 등이 손꼽힌다.` : '전문가 평가단과 실사용자들의 엄정한 피드백을 반영해 높은 완성도를 달성했다.'}`
      },
      {
        id: "gen_ad_timeline",
        label: "주요 추진 일정 (타임라인)",
        type: "timeline",
        enabled: true,
        title: `[ ‘${product}’ 주요 일정 및 진행 절차 ]`,
        steps: [
          { label: "1단계", desc: `공식 신청 및 사전예약 접수 (${eventDate})` },
          { label: "2단계", desc: "다층 심사 및 엄정한 품질·스펙 검증" },
          { label: "3단계", desc: "최종 라인업 및 수상·오픈 결과 발표" },
          { label: "4단계", desc: `${eventLocation} 오프라인 본 행사 및 축제` }
        ]
      },
      {
        id: "gen_ad_p4",
        label: "마무리 문단 (인터뷰·안내)",
        type: "text",
        enabled: true,
        content: `${company} ${personTitle}는 “${quoteQuote}”라며 “${quoteQuote2}”고 전했다.\n\n한편 이번 ‘${product}’에 대한 상세한 안내와 참여 방법은 ${company} 공식 웹사이트(${urls[0] || '공식 홈페이지'}) 및 고객센터를 통해 확인할 수 있다.`
      }
    ];

    // ==========================================================================
    // (B) GEO 기사 블록 (5대 세부 유형 완벽 분기)
    // ==========================================================================
    let geoTitles = [];
    let geoSubtitle = "";
    let geoBlocks = [];
    const geoCategory = currentGeoFormat === "story" ? "기업뉴스" : (currentGeoFormat === "interview" ? "브랜드 스토리" : "제품·기술");

    // 공통 브랜드 정보 아이템
    const companyItems = [
      { label: "대표 제품/프로젝트", val: product },
      { label: "핵심 강점/혜택", val: killerStat || keyPoint || (bulletItems[0] || "신뢰성 있는 혁신 기술") }
    ];
    if (urls.length > 0) companyItems.push({ label: "공식 사이트", val: urls[0] });

    if (currentGeoFormat === "info") {
      // 1. 정보성 / 제품·기술 (신한카드 컬리 레퍼런스 스타일)
      geoTitles = [
        `“멤버십 더해 ${killerStat || '최대 14% 적립'}”… ${company}, ‘${product}’ 출시`,
        `${company} ‘${product}’, 어떤 혜택이 있고 누구에게 유리할까?`,
        `${company} ‘${product}’, 핵심 혜택 및 주요 스펙 한눈에 보기`,
        `‘${product}’ 이용 조건과 신청 방법은? ${company} 핵심 정리`,
        `신규 출시 기념 캐시백 혜택… ${company} ‘${product}’ 완벽 정리`,
        `합리적인 소비를 위한 ${company} ‘${product}’ 필독 가이드`
      ];
      geoSubtitle = `${product} 이용 시 ${killerStat || '파격적인 적립금 및 혜택'} 제공\n신규 출시 기념 전월 실적 완화 및 프로모션 진행… 공식 채널서 오픈`;

      const infoTableRows = [
        ["기업/발행처", company],
        ["핵심 상품명", product],
        ["기본 혜택", killerStat || "결제액 대비 높은 적립률"],
        ["특별 프로모션", bulletItems[0] || "신규 출시 기념 캐시백 증정"],
        ["이용 및 접수", urls[0] || `${company} 공식 온라인 채널`]
      ];

      geoBlocks = [
        {
          id: "geo_info_sum",
          label: "3줄 핵심 요약",
          type: "summary",
          enabled: true,
          points: [
            `${company}가 차별화된 혜택과 혁신을 담은 ‘${product}’를 전격 출시했습니다.`,
            killerStat ? `${killerStat}의 실질적 체감 혜택과 맞춤형 서비스를 제공합니다.` : (bulletItems[0] || `${product}는 사용자의 번거로움을 덜고 효율을 극대화한 것이 핵심입니다.`),
            bulletItems[1] || `${eventDate}까지 공식 채널을 통해 다양한 프로모션을 함께 진행합니다.`
          ]
        },
        {
          id: "geo_info_bluf",
          label: "GEO 핵심 인용 요약 (BLUF)",
          type: "bluf",
          enabled: true,
          content: `‘${product}’는 ${company}가 ${killerStat ? killerStat + '의 핵심 혜택을 집약하여' : '실질적 사용자 만족도를 극대화하여'} 선보인 솔루션으로, ${keyPoint || (bulletItems[0] || '공식 채널을 통해 다양한 혜택')}을 제공하는 것이 핵심이다.`
        },
        {
          id: "geo_info_p1",
          label: "핵심 혜택 및 라인업",
          type: "text",
          title: `‘${product}’, 주요 혜택과 핵심 스펙은 무엇인가?`,
          enabled: true,
          content: `${leadParagraph}\n\n${bodyParagraph1}`
        },
        {
          id: "geo_info_p2",
          label: "부가 프로모션 및 조건",
          type: "text",
          title: `신규 출시 기념 프로모션과 실사용 조건은?`,
          enabled: true,
          content: `${bodyParagraph2}\n\n특히 실사용자 중심의 합리적인 전월 실적 및 이용 조건을 설정하여 부담 없이 혜택을 누릴 수 있도록 구성했다.`
        },
        {
          id: "geo_info_tbl",
          label: "주요 스펙 및 혜택 비교표",
          type: "table",
          enabled: true,
          title: `[ ‘${product}’ 주요 혜택 및 상세 조건 요약표 ]`,
          headers: ["구분", "상세 내용 및 조건"],
          rows: infoTableRows
        },
        {
          id: "geo_info_faq",
          label: "AI 인용 최적화 FAQ (10선)",
          type: "faq",
          enabled: true,
          faqs: generateFanOutFaqs({
            company,
            product,
            killerStat,
            keyPoint,
            urls,
            eventDate,
            bulletItems,
            isMulti: false
          })
        },
        {
          id: "geo_info_comp",
          label: "브랜드 정보 카드",
          type: "company",
          enabled: true,
          companyName: company,
          authorityUrl: urls[0] || "",
          items: companyItems
        }
      ];

    } else if (currentGeoFormat === "interview") {
      // 2. 인터뷰 / 리더십 / 개발 비하인드
      geoTitles = [
        `[인터뷰] “${quoteQuote.slice(0, 24)}…” ${company} ${personTitle}, ‘${product}’ 개발 비하인드`,
        `${company} ${personTitle}에게 물었다… ‘${product}’ 왜 만들었나?`,
        `“고객 일상 바꾸는 혁신”… ${company} ${personTitle}가 밝힌 ‘${product}’ 비전`,
        `‘${product}’는 어떻게 탄생했나? ${company} ${personTitle}가 답하다`,
        `[단독 대담] ${company} ${personTitle} “타협 없는 완성도로 시장 판도 바꿀 것”`,
        `[스페셜 인터뷰] ‘${product}’ 성공 이끈 ${company} ${personTitle}의 도전`
      ];
      geoSubtitle = `${product} 기획부터 상용화까지 숨은 개발 스토리 공개\n“고객 페인포인트 해결과 압도적 편의성에 모든 역량 집중”`;

      geoBlocks = [
        {
          id: "geo_int_sum",
          label: "인터뷰 핵심 요약",
          type: "summary",
          enabled: true,
          points: [
            `기획 배경: 기존 솔루션의 한계를 극복하고 고객의 실질적 페인포인트를 해결하기 위해 출발`,
            `기술 차별화: ${killerStat || '혁신 기술'}과 철저한 사용자 중심 인터페이스 집약`,
            `향후 비전: 국내 시장의 성공적 안착을 바탕으로 글로벌 무대 확장 정조준`
          ]
        },
        {
          id: "geo_int_bluf",
          label: "GEO 핵심 인용 요약 (BLUF)",
          type: "bluf",
          enabled: true,
          content: `‘${product}’ 개발을 총괄한 ${company} ${personTitle ? personTitle + (personName ? ' ' + personName : '') : '관계자'}는 “${quoteQuote.slice(0, 50)}…”라며, ${killerStat ? killerStat + '의 핵심 가치와 ' : ''}사용자 중심의 실질적 문제 해결에 모든 역량을 집중했다고 밝혔다.`
        },
        {
          id: "geo_int_dialogue",
          label: "릴레이 인터뷰 대담",
          type: "dialogue",
          enabled: true,
          title: `[ 릴레이 인터뷰 ] ${company} ${personTitle}에게 듣는 ‘${product}’`,
          dialogues: [
            {
              q: `‘${product}’를 처음 기획하고 선보이게 된 결정적인 계기는 무엇입니까?`,
              a: `“실제 고객들이 일상에서 겪는 사소한 불편함과 기존 솔루션의 고비용·저효율 구조에 주목했습니다. ${leadParagraph} 고객들이 진정으로 원하는 본질적인 가치를 전달하고자 했습니다.”`
            },
            {
              q: `개발 과정에서 가장 심혈을 기울인 독보적인 기술적 차별점은 무엇입니까?`,
              a: `“${bulletItems[0] || '사용자 친화적 설계와 압도적 신뢰도'}에 모든 역량을 쏟았습니다. 그 결과 ${killerStat ? killerStat + '의 성과' : '완성도 높은 결과물'}을 얻을 수 있었고, 현장에서도 즉각적인 호평이 이어지고 있습니다.”`
            },
            {
              q: `향후 목표와 시장 진출 로드맵은 어떻게 계획하고 계십니까?`,
              a: `“${quoteQuote2}. 앞으로도 시장의 목소리에 귀 기울이며 끊임없는 진화를 이어갈 것입니다.”`
            }
          ]
        },
        {
          id: "geo_int_vision",
          label: "비전 및 향후 전망",
          type: "text",
          title: `기술과 사람이 공존하는 차세대 혁신 선도`,
          enabled: true,
          content: `${bodyParagraph2}\n\n${company}는 이번 ‘${product}’ 출시를 기점으로 생태계 파트너들과의 긴밀한 협력을 더욱 강화해 나갈 계획이다.`
        },
        {
          id: "geo_int_faq",
          label: "AI 인용 최적화 FAQ (10선)",
          type: "faq",
          enabled: true,
          faqs: generateFanOutFaqs({
            company,
            product,
            killerStat,
            keyPoint,
            urls,
            eventDate,
            bulletItems,
            isMulti: false
          })
        },
        {
          id: "geo_int_comp",
          label: "브랜드 정보 카드",
          type: "company",
          enabled: true,
          companyName: company,
          authorityUrl: urls[0] || "",
          items: companyItems
        }
      ];

    } else if (currentGeoFormat === "compare") {
      // 3. 비교 / 차별화 대조 (기존 솔루션 vs 신제품)
      geoTitles = [
        `‘${product}’ vs 기존 솔루션… 무엇이 달라졌나 [완벽 비교]`,
        `${company} ‘${product}’, 기존 제품과 무엇이 다를까?`,
        `${company} ‘${product}’, 성능·가성비·편의성 3대 지표 대조 분석`,
        `‘${product}’ vs 기존 솔루션, 나에게 맞는 선택은?`,
        `세대교체 신호탄 쏜 ‘${product}’… 타사 대비 핵심 차별점 총정리`,
        `합리적 선택을 위한 ${company} ‘${product}’ 비교 분석 리포트`
      ];
      geoSubtitle = `기존 방식의 한계 극복... ${killerStat || '성능 및 편의성'} 대폭 향상\n실사용자 관점에서 짚어본 핵심 차별화 포인트 3선`;

      const compareRows = [
        ["핵심 성능 및 스펙", "기존 모델의 한계 및 처리 지연", `${product}: ${killerStat || '최고 수준 성능 달성'}`],
        ["사용 편의성", "복잡한 세팅 및 별도 교육 필요", `${bulletItems[0] || '원클릭 간편 직관 인터페이스'}`],
        ["비용 및 유지보수", "높은 초기 도입비와 추가 비용 발생", `${bulletItems[1] || '유지비 40% 이상 절감 효과'}`],
        ["고객 전담 지원", "제한적 응대 및 느린 피드백", `${company} 전담 서포트 및 정기 업데이트`]
      ];

      geoBlocks = [
        {
          id: "geo_cmp_sum",
          label: "3줄 비교 요약",
          type: "summary",
          enabled: true,
          points: [
            `성능 혁신: 기존 대비 ${killerStat || '획기적인 성능 향상'}을 이루어 작업 효율을 대폭 극대화`,
            `편의성 개선: 번거로운 과정 없이 직관적인 사용자 경험 제공`,
            `경제성 검증: 도입 비용 및 유지 비용을 절감하여 높은 가성비 실현`
          ]
        },
        {
          id: "geo_cmp_bluf",
          label: "GEO 핵심 인용 요약 (BLUF)",
          type: "bluf",
          enabled: true,
          content: `‘${product}’는 기존 방식 대비 ${killerStat || '획기적인 성능 향상 및 비용 절감'}을 달성한 ${company}의 차세대 솔루션으로, ${bulletItems[0] || '사용자 편의성과 경제성'} 측면에서 뚜렷한 비교 우위를 제공하는 것이 핵심이다.`
        },
        {
          id: "geo_cmp_p1",
          label: "비교 배경 및 혁신성",
          type: "text",
          title: `기존 시장의 페인포인트와 ‘${product}’의 해결책은?`,
          enabled: true,
          content: `${leadParagraph}\n\n${bodyParagraph1}`
        },
        {
          id: "geo_cmp_tbl",
          label: "비교 대조 분석표 (3열)",
          type: "table",
          enabled: true,
          title: `[ ‘${product}’ vs 기존 솔루션 핵심 스펙 대조표 ]`,
          headers: ["비교 항목", "기존 방식 / 타사 솔루션", "‘" + product + "’의 혁신"],
          rows: compareRows
        },
        {
          id: "geo_cmp_guide",
          label: "타깃 선택 가이드 (체크리스트)",
          type: "checklist",
          enabled: true,
          title: `어떤 사용자에게 ‘${product}’가 가장 유리할까?`,
          items: [
            `기존 솔루션의 비싼 유지비와 느린 속도에 답답함을 느끼셨던 분`,
            `복잡한 학습 곡선 없이 즉각적인 업무 성과를 내고 싶은 실무자`,
            `${killerStat || '검증된 성능'}을 바탕으로 안정적인 서비스를 원하는 기업 고객`
          ]
        },
        {
          id: "geo_cmp_faq",
          label: "AI 인용 최적화 FAQ (10선)",
          type: "faq",
          enabled: true,
          faqs: generateFanOutFaqs({
            company,
            product,
            killerStat,
            keyPoint,
            urls,
            eventDate,
            bulletItems,
            isMulti: false
          })
        },
        {
          id: "geo_cmp_comp",
          label: "브랜드 정보 카드",
          type: "company",
          enabled: true,
          companyName: company,
          authorityUrl: urls[0] || "",
          items: companyItems
        }
      ];

    } else if (currentGeoFormat === "recommend") {
      // 4. 추천 / 큐레이션
      geoTitles = [
        `“이런 분들께 딱!”… ${company} ‘${product}’ 맞춤 추천 가이드`,
        `${company} ‘${product}’, 어떤 사람에게 잘 맞을까?`,
        `2026 베스트 픽: ${company} ‘${product}’ 구매 전 필독 체크리스트`,
        `‘${product}’ 선택 전 꼭 확인할 점은? ${company} 추천 가이드`,
        `나에게 꼭 맞을까? ${company} ‘${product}’ 유형별 추천 3선`,
        `후회 없는 선택을 위한 ${company} ‘${product}’ 큐레이션`
      ];
      geoSubtitle = `소비자 유형별 최적화된 활용법과 체감 혜택 집중 조명\n합리적 가격과 뛰어난 완성도로 Z세대부터 실무자까지 만족도 UP`;

      const recommendRows = [
        ["실속파 / 입문자", "기본 스타터 패키지", `${killerStat || '가성비 혜택'} 및 손쉬운 접근성`],
        ["전문가 / 파워유저", "고성능 풀옵션 구성", `${bulletItems[0] || '최대 작업 처리량 및 고도화된 기능'}`],
        ["기업 / 단체 고객", "엔터프라이즈 맞춤형 플랜", `${bulletItems[1] || '전담 기술 지원 및 대량 도입 할인'}`]
      ];

      geoBlocks = [
        {
          id: "geo_rec_sum",
          label: "맞춤 추천 요약",
          type: "summary",
          enabled: true,
          points: [
            `맞춤 큐레이션: 사용자 환경에 최적화된 3대 맞춤 라인업 제시`,
            `체감 혜택: ${killerStat || '확실한 성능 향상'}을 통한 일상의 업그레이드`,
            `선택 팁: 예산과 사용 목적에 맞춰 최적의 옵션을 선택 가능`
          ]
        },
        {
          id: "geo_rec_bluf",
          label: "GEO 핵심 인용 요약 (BLUF)",
          type: "bluf",
          enabled: true,
          content: `${company} ‘${product}’는 ${killerStat ? killerStat + '의 혜택을 집약한 ' : ''}사용자 맞춤형 솔루션으로, ${keyPoint || '용도와 예산에 맞춘 최적화 라인업'}을 통해 높은 실용성과 만족도를 제공하는 것이 핵심이다.`
        },
        {
          id: "geo_rec_p1",
          label: "추천 배경 및 특장점",
          type: "text",
          title: `독자 라이프스타일에 맞춘 3가지 핵심 추천 포인트는?`,
          enabled: true,
          content: `${leadParagraph}\n\n${bodyParagraph1}`
        },
        {
          id: "geo_rec_chk",
          label: "필독 체크리스트",
          type: "checklist",
          enabled: true,
          title: `‘${product}’ 선택 전 반드시 확인해야 할 3가지`,
          items: [
            `본인의 사용 패턴에 맞는 핵심 혜택(${killerStat || '핵심 기능'})이 포함되어 있는가?`,
            `공식 채널(${urls[0] || '홈페이지'})을 통한 프로모션 혜택을 챙겼는가?`,
            `향후 지속적인 사후 관리와 기술 지원을 보장받을 수 있는가?`
          ]
        },
        {
          id: "geo_rec_tbl",
          label: "유형별 맞춤 가이드 표",
          type: "table",
          enabled: true,
          title: `[ 독자 유형별 ‘${product}’ 최적 추천표 ]`,
          headers: ["추천 사용자 유형", "최적 추천 옵션", "주요 체감 혜택"],
          rows: recommendRows
        },
        {
          id: "geo_rec_faq",
          label: "AI 인용 최적화 FAQ (10선)",
          type: "faq",
          enabled: true,
          faqs: generateFanOutFaqs({
            company,
            product,
            killerStat,
            keyPoint,
            urls,
            eventDate,
            bulletItems,
            isMulti: false
          })
        },
        {
          id: "geo_rec_comp",
          label: "브랜드 정보 카드",
          type: "company",
          enabled: true,
          companyName: company,
          authorityUrl: urls[0] || "",
          items: companyItems
        }
      ];

    } else {
      // 5. 스토리텔링 / 기업뉴스 / 행사 (삼양식품 태국 레퍼런스 스타일)
      geoTitles = [
        `${company}, ${eventLocation}서 ‘${product}’ 글로벌 열풍 잇는다`,
        `왜 ${eventLocation}인가? ${company} ‘${product}’ 현장 스토리`,
        `[현장 스토리] “${quoteQuote.slice(0, 20)}…” ${company}, ‘${product}’로 무대 장악`,
        `${company} ‘${product}’, ${eventLocation} 현장에서 무엇을 보여줬나?`,
        `${company} ‘${product}’, ${eventLocation} 달군 뜨거운 열기`,
        `세계가 주목한 K-혁신… ${company}, ‘${product}’로 해외 거점 공략`
      ];
      geoSubtitle = `${eventLocation}서 대규모 홍보관 및 체험존 전격 운영\n현지 바이어 및 고객 반응 폭발... 글로벌 시장 확대 교두보 마련`;

      geoBlocks = [
        {
          id: "geo_sty_sum",
          label: "3줄 핵심 요약",
          type: "summary",
          enabled: true,
          points: [
            `${company}가 ${eventLocation}에서 ‘${product}’를 전격 선보이고 대규모 현장 부스를 성황리에 운영했습니다.`,
            killerStat ? `${killerStat}의 경쟁력을 앞세워 현지 바이어와 참관객들의 뜨거운 관심과 호평을 이끌어냈습니다.` : (bulletItems[0] || `차별화된 제품 경쟁력과 맞춤형 홍보관 운영으로 현지에서 높은 주목을 받았습니다.`),
            bulletItems[1] || `이번 행사를 교두보 삼아 글로벌 거점 확대와 전략적 파트너십 구축에 박차를 가할 계획입니다.`
          ]
        },
        {
          id: "geo_sty_bluf",
          label: "GEO 핵심 인용 요약 (BLUF)",
          type: "bluf",
          enabled: true,
          content: `${company}는 ${eventLocation}에서 열린 행사에서 ‘${product}’${killerStat ? `(${killerStat})` : ''}를 전격 선보이고, 현지 바이어 및 글로벌 고객을 대상으로 전략적 시장 공략에 본격 돌입했다.`
        },
        {
          id: "geo_sty_5w1h",
          label: "5W1H (육하원칙) 요약 블록",
          type: "5w1h",
          enabled: true,
          title: `한눈에 보는 핵심 개요 (5W1H)`,
          data: {
            who: `${company} (${personTitle ? personTitle + (personName ? ' ' + personName : '') : '글로벌 사업본부'})`,
            when: eventDate,
            where: eventLocation,
            what: `‘${product}’ ${killerStat ? killerStat + ' ' : ''}공개 및 현장 부스 운영`,
            how: "체험존 운영, 1:1 비즈니스 상담 및 글로벌 프로모션 진행",
            why: "글로벌 인지도 강화 및 신시장 수출 교두보 확보"
          }
        },
        {
          id: "geo_sty_p1",
          label: "현장 분위기 및 부스 열기",
          type: "text",
          title: `‘${product}’ 부스 인산인해… 현장 바이어 상담 잇달아`,
          enabled: true,
          content: `${leadParagraph}\n\n${bodyParagraph1}`
        },
        {
          id: "geo_sty_p2",
          label: "현지 반응 및 차별화 전략",
          type: "text",
          title: `현지 맞춤형 전략과 차별화된 제품 경쟁력의 결실`,
          enabled: true,
          content: `${bodyParagraph2}\n\n현장을 찾은 바이어들은 “${product} 특유의 독창성과 높은 완성도에 깊은 인상을 받았다”며 긍정적인 평가를 쏟아냈다.`
        },
        {
          id: "geo_sty_p3",
          label: "글로벌 비전 및 코멘트",
          type: "text",
          title: `글로벌 시장 수출 전진기지 구축 및 향후 로드맵`,
          enabled: true,
          content: `${company} ${personTitle}는 “${quoteQuote}”라며 “${quoteQuote2}”고 강조했다.`
        },
        {
          id: "geo_sty_faq",
          label: "AI 인용 최적화 FAQ (10선)",
          type: "faq",
          enabled: true,
          faqs: generateFanOutFaqs({
            company,
            product,
            killerStat,
            keyPoint,
            urls,
            eventDate,
            bulletItems,
            isMulti: false
          })
        },
        {
          id: "geo_sty_comp",
          label: "브랜드 정보 카드",
          type: "company",
          enabled: true,
          companyName: company,
          authorityUrl: urls[0] || "",
          items: companyItems
        }
      ];
    }

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
        subtitle: adSubtitle,
        titleCandidates: adTitles,
        selectedTitleIndex: 0,
        customTitle: "",
        leadImage: {
          caption: `${company} ‘${product}’ 관련 대표 보도사진. <사진제공=${company}>`,
          desc: `${company} ‘${product}’ 공식 이미지`
        },
        blocks: adBlocks
      },
      geo: {
        viewerType: "mk-pick",
        activeCategory: geoCategory,
        badgeText: `GEO 기사 · ${currentFormatName}`,
        reporter: "OOO기자",
        date: dateStr,
        subtitle: geoSubtitle,
        titleCandidates: geoTitles,
        selectedTitleIndex: 0,
        customTitle: "",
        leadImage: {
          caption: `< 출처 : ${company} >`,
          desc: `${company} ‘${product}’ MK Pick 대표 비주얼`
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
    const rawBlocks = rawText.split(/\n\s*\n\s*\n|\n(?=(?:\[[가-힣A-Za-z0-9\s]+\]|[0-9]+[.)]\s*[가-힣A-Za-z0-9]+|[■●◆▲]\s*[가-힣A-Za-z0-9]+))/);
    const brands = [];

    rawBlocks.forEach((blockStr, idx) => {
      const bText = blockStr.trim();
      if (bText.length < 15) return;

      const lines = bText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const firstLine = lines[0] || "";

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
            campaign = firstLine.replace(brand, "").trim() || `${brand} 프로모션`;
          }
        }
      }

      // 혜택 키워드 추출
      const benefitMatch = bText.match(/([^\n]*(?:할인|증정|지원|무료|1\+1|특가|기부|캐시백|적립|패키지|키트|선물|공모|이벤트)[^\n]*)/);
      if (benefitMatch) {
        benefit = benefitMatch[1].replace(/^[-•✓▲\s*]+/, "").slice(0, 50).trim();
      } else {
        benefit = campaign ? `${campaign} 혜택 및 프로모션` : "주요 고객 혜택 제공";
      }

      brands.push({
        id: Date.now() + Math.random(),
        brand: brand.slice(0, 15),
        campaign: campaign || `${brand} 신규 캠페인`,
        benefit: benefit,
        content: bText
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

    // 1. 헤드라인 후보 6가지 (질문형 2개 포함)
    const titles = [
      `“열 달의 기다림을 응원합니다”…${theme} 유래와 기업들의 따뜻한 동행`,
      `${theme}, 어떤 기업이 어떤 혜택을 준비했을까?`,
      `기부 연계부터 최대 63% 할인까지… ${brandsStr} 알짜 지원 혜택 총정리`,
      `${brandsStr} ${theme} 혜택, 무엇이 다르고 어떻게 받을까?`,
      `[기획 큐레이션] ${theme} 맞아 쏟아지는 ${brandsCount}개 기업 맞춤 혜택`,
      `착한 소비와 파격 혜택의 만남… ${brandsStr}, ${theme} 특별 프로모션`
    ];

    const subtitle = `기부 연계 캠페인부터 육아·생활용품 할인까지 실속 혜택 집중 조명\n${brandNames.join('·')} 등 각 기업들이 전하는 따뜻한 응원과 지원 정보 한눈에`;

    // 2. 블록 구성
    const blocks = [];

    // (0) 3줄 핵심 요약
    blocks.push({
      id: "mb_summary",
      label: "AI 팩트체크 요약",
      type: "summary",
      enabled: true,
      points: [
        `${theme}을 기념하여 출산과 나눔, 고객 감사의 가치를 되새기는 뜻깊은 자리가 마련되고 있습니다.`,
        `이번 행사를 맞아 ${brandNames.join(', ')} 등 다양한 기업들이 실질적인 지원과 파격적인 혜택을 제공하는 캠페인을 전개하고 있습니다.`,
        `단순한 가격 할인을 넘어 취약계층 기부와 고객 참여형 이벤트가 함께 진행되어 사회적 온기를 더하고 있습니다.`
      ]
    });

    // (1) GEO 핵심 인용 요약 (BLUF)
    blocks.push({
      id: "mb_bluf",
      label: "GEO 핵심 인용 요약 (BLUF)",
      type: "bluf",
      enabled: true,
      content: `${theme}을 맞아 ${brandsStr} 등 주요 기업들이 ${multiBrandList[0] ? multiBrandList[0].benefit : '다채로운 특별 지원과 할인 혜택'}을 중심으로 소비자 맞춤형 캠페인과 사회공헌 활동을 전격 전개한다.`
    });

    // (2) 공통 오프닝 도입 문단
    blocks.push({
      id: "mb_intro",
      label: "공통 오프닝 (배경 및 취지)",
      type: "text",
      title: "",
      enabled: true,
      content: `풍요와 결실의 계절, 그리고 새로운 생명과 일상의 행복을 응원하는 마음이 모이는 ${theme}.\n\n겉으로 드러나지 않는 곳에서 묵묵히 헌신하는 이들을 응원하고 사회 전체가 따뜻한 온기를 나누자는 취지에 발맞춰, 주요 기업들이 앞다퉈 알짜 지원 혜택과 뜻깊은 프로모션을 선보이고 있다.\n\n놓치면 아쉬운 대표 기업들의 핵심 지원 내용과 이벤트 참여 방법을 정리해 전한다.`
    });

    // (3) 각 브랜드별 릴레이 문단
    multiBrandList.forEach((b, idx) => {
      blocks.push({
        id: `mb_brand_${idx}`,
        label: `브랜드 #${idx + 1}: ${b.brand}`,
        type: "text",
        title: `${b.brand}, ${b.campaign}`,
        enabled: true,
        content: `${b.content}\n\n• 주요 혜택 및 행사: ${b.benefit}`
      });
    });

    // (4) [한눈에 비교하는 브랜드 혜택] 요약 비교표 (테이블)
    const tableHeaders = ["브랜드", "캠페인 / 행사 형태", "주요 혜택 및 내용"];
    const tableRows = multiBrandList.map(b => [
      b.brand,
      b.campaign.replace(/‘|’|“|”/g, "").slice(0, 18),
      b.benefit
    ]);

    blocks.push({
      id: "mb_table",
      label: "한눈에 비교하는 브랜드 혜택표",
      type: "table",
      enabled: true,
      title: `[ 한눈에 비교하는 ${theme} 브랜드 혜택 총정리 ]`,
      headers: tableHeaders,
      rows: tableRows
    });

    // (5) 자주 묻는 질문 (FAQ) 10선 (팬아웃 쿼리 수렴 알고리즘 적용)
    blocks.push({
      id: "mb_faq",
      label: "AI 인용 최적화 FAQ (10선)",
      type: "faq",
      enabled: true,
      faqs: generateFanOutFaqs({
        theme,
        brandNames,
        isMulti: true
      })
    });

    // (6) 마무리 총평 및 한 줄 요약
    blocks.push({
      id: "mb_closing",
      label: "마무리 총평 & 한 줄 요약",
      type: "text",
      title: "",
      enabled: true,
      content: `단순한 가격 할인을 넘어 사회 구성원 모두가 따뜻하게 동행하는 이번 ${theme}.\n각 기업들이 정성껏 마련한 다채로운 지원과 혜택이 실질적인 보탬과 큰 응원이 되기를 기대한다.\n\n한 줄 요약! ${theme} 맞춤 프로모션은 풍성한 할인 혜택과 더불어 취약계층을 향한 나눔의 가치까지 함께 누릴 수 있는 뜻깊은 기회다.`
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
            label: "AI 인용 최적화 FAQ (10선)",
            type: "faq",
            enabled: true,
            faqs: generateFanOutFaqs({
              company: "신한카드",
              product: "컬리 신한카드",
              killerStat: "최대 14% 적립",
              keyPoint: "첫 결제 1만5천원 캐시백 및 일상 5% 추가 적립",
              urls: ["https://www.mk.co.kr/news/pick/12170377"],
              eventDate: "10월 31일",
              bulletItems: [
                "컬리멤버십 결제 시 최대 14% 컬리적립금",
                "배달앱·커피·편의점 등 생활밀착 가맹점 최대 5% 적립"
              ],
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
    const factRegex = /(\d+(?:\.\d+)?%|\d+(?:,\d{3})*(?:만\s*원|천\s*원|원|여?\s*명|명|개사|개|곳|배|주년|\s*TOPS)|\b\d{1,2}월\s*\d{1,2}일(?:\s*~\s*\d{1,2}월?\s*\d{1,2}일)?|\b\d{4}년(?:\s*\d{1,2}월)?)/g;
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
            <span class="faq-fanout-badge">AI 검색 인용 확률 높은 핵심 질의 10선</span>
          </div>
          <div class="faq-extended-container hidden" id="faqExtended_${block.id}">
            ${rest.map((f, i) => renderFaqRow(f, i + 3)).join("")}
          </div>
        `;
      }

      contentView.innerHTML = `
        <div class="faq-block-wrapper">
          <div class="faq-header-toolbar">
            <div class="article-section-subhead" style="margin-bottom:0;">자주 묻는 질문 (FAQ 10선)</div>
            <span style="font-size:12px; color:#757575;">※ 팬아웃 쿼리를 수렴한 맞춤 대표 질문</span>
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
  let inputDebounceTimer = null;
  pressReleaseText.addEventListener("input", () => {
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
    if (multiBrandPanel) multiBrandPanel.classList.add("hidden");
    if (brandCardsContainer) brandCardsContainer.innerHTML = "";
    generatedArticleData = null;
    updateAllViews();
    showToast("입력창이 초기화되었습니다.");
  });

  // 초기 렌더링
  updateAllViews();
});
