const icons = {
  calendar: "M5 4h14v16H5z M8 2v4 M16 2v4 M5 9h14",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  trophy: "M8 4h8v4a4 4 0 0 1-8 0V4z M8 6H4a4 4 0 0 0 4 4 M16 6h4a4 4 0 0 1-4 4 M12 14v4 M9 22h6 M8 18h8",
  dice: "M5 5h14v14H5z M8 8h.01 M12 12h.01 M16 16h.01 M16 8h.01 M8 16h.01",
  shield: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z M9 12l2 2 4-5",
  link: "M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1 M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M2 12h3 M19 12h3 M4.9 19.1 7 17 M17 7l2.1-2.1",
  card: "M3 6h18v12H3z M3 10h18 M7 15h4",
};

let appState = null;
let activeGameId = null;
let gameSearchQuery = "";
let activeGameCategoryFilter = "all";
let isGameDetailOpen = false;
let activeAreaFilter = "all";
let activeOpsFilter = "all";
let activeOpsMatchId = null;
let activeMemberId = null;
let visibleEventCount = 8;
let isPaymentConfirmOpen = false;
let authReturnView = "apply";
let opsSearchQuery = "";
let opsSortMode = "dateAsc";
let opsDateFrom = "";
let opsDateTo = "";
let activeApplyArea = "";
let activeApplyDate = "";
let activeApplyTimeMatchId = "";
let activeApplyMonthKey = "";

const gameTagMap = {
  "memory-dinner": ["기억", "암기", "매칭"],
  "position-combo": ["기억", "조합", "족보"],
  "love-wins-all": ["베팅", "심리", "카드"],
  "language-pieces": ["언어", "추리", "퍼즐"],
  "show-me-the-coin": ["베팅", "심리", "계산"],
  "forgotten-mines": ["기억", "전략", "이동"],
  "horse-race": ["전략", "이동", "레이스"],
  "secret-prophecy": ["추리", "심리", "카드"],
  "doubles-plan": ["전략", "심리", "숫자"],
  "love-wins-all-2": ["베팅", "심리", "카드"],
  "forgotten-mines-2": ["전략", "기억", "이동"],
  "doubles-plan-2": ["전략", "숫자", "블러핑"],
  monorail: ["전략", "타일", "퍼즐"],
  "strategic-yut": ["전략", "심리", "윷놀이"],
  "same-number-finder": ["기억", "암산", "순발력"],
  "black-and-white": ["심리", "숫자", "블러핑"],
  "black-and-white-2": ["심리", "포인트", "블러핑"],
  "betting-black-and-white": ["베팅", "숫자", "심리"],
  "twelve-shogi": ["전략", "보드", "장기"],
  "number-shogi": ["전략", "숫자", "보드"],
  "kyeol-hap": ["순발력", "패턴", "도형"],
  "big-small": ["베팅", "카드", "심리"],
  baghchal: ["전략", "보드", "봉쇄"],
  "nine-mens-morris": ["전략", "보드", "삼목"],
  hexagon: ["기억", "암산", "숫자"],
  "color-turn": ["전략", "기억", "4목"],
  "secret-dice": ["주사위", "확률", "전략"],
  "mystery-number": ["추리", "숫자", "심리"],
  "battle-ascending": ["전략", "숫자", "순서"],
  "blind-betting": ["베팅", "카드", "심리"],
  "formula-maze": ["암기", "계산", "퍼즐"],
};

const gameCategoryMap = {
  "doubles-plan": "death",
  "love-wins-all-2": "death",
  "forgotten-mines-2": "death",
  "doubles-plan-2": "death",
  "memory-dinner": "death",
  "position-combo": "death",
  "love-wins-all": "death",
  "language-pieces": "death",
  "show-me-the-coin": "death",
  "forgotten-mines": "death",
  "horse-race": "death",
  "secret-prophecy": "death",
  monorail: "genius",
  "strategic-yut": "genius",
  "same-number-finder": "genius",
  "black-and-white": "genius",
  "black-and-white-2": "genius",
  "betting-black-and-white": "genius",
  "twelve-shogi": "genius",
  "number-shogi": "genius",
  "kyeol-hap": "genius",
  "mystery-number": "blood",
  "battle-ascending": "blood",
  "blind-betting": "blood",
  "formula-maze": "blood",
  "color-turn": "blood",
  "secret-dice": "blood",
  "big-small": "devils",
  baghchal: "devils",
  "nine-mens-morris": "devils",
  hexagon: "devils",
};

const gameCategoryOptions = [
  { value: "all", label: "전체" },
  { value: "genius", label: "더 지니어스" },
  { value: "devils", label: "데블스 플랜" },
  { value: "blood", label: "피의 게임" },
  { value: "death", label: "데스 게임" },
];

function formatPhoneInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatBirthDateInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function formatEventTime(value) {
  if (!value) return "시간 없음";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function renderIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    const path = icons[node.dataset.icon];
    node.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  });
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "요청을 처리하지 못했습니다.");
  }

  return payload;
}

function saveSession() {
  if (appState?.sessionToken) {
    localStorage.setItem("oneVsOneSession", appState.sessionToken);
  }
}

function clearSession() {
  localStorage.removeItem("oneVsOneSession");
}

async function restoreSession() {
  const saved = localStorage.getItem("oneVsOneSession");
  if (!saved) return;

  try {
    appState = await request("/api/restore-session", {
      method: "POST",
      body: JSON.stringify({ token: saved }),
    });

    if (!appState.isAuthenticated) {
      clearSession();
    }
  } catch (error) {
    clearSession();
  }
}

async function loadState() {
  appState = await request("/api/state");
  await restoreSession();
  renderAll();
}

function renderAll() {
  renderNavigation();
  renderUser();
  renderAuth();
  renderPaymentGuide();
  renderAreaFilters();
  renderMyApplications();
  renderMatches();
  renderNotices();
  renderRankings();
  renderGames(activeGameId || appState.games[0]?.id);
  renderAdmin();
  renderIcons();
}

function renderNavigation() {
  const adminNav = document.querySelector('[data-view="admin"]');
  if (!adminNav) return;

  adminNav.hidden = !appState.isAuthenticated;

  if (!appState.isAuthenticated && adminNav.classList.contains("active")) {
    adminNav.classList.remove("active");
    document.querySelector("#admin")?.classList.remove("active");
    document.querySelector('[data-view="apply"]')?.classList.add("active");
    document.querySelector("#apply")?.classList.add("active");
  }
}

function setActiveView(viewId) {
  document.querySelectorAll(".nav-item, .view").forEach((node) => node.classList.remove("active"));
  document.querySelector(`#${viewId}`)?.classList.add("active");
  document.querySelector(`[data-view="${viewId}"]`)?.classList.add("active");

  if (viewId !== "auth") {
    authReturnView = viewId;
  }

  if (viewId === "games") {
    renderGames(activeGameId, { detail: false });
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function openAuthView() {
  const currentView = document.querySelector(".view.active");
  if (currentView?.id && currentView.id !== "auth") {
    authReturnView = currentView.id;
  }

  setActiveView("auth");
}

function closeAuthView() {
  setActiveView(authReturnView || "apply");
}

function renderPaymentGuide() {
  const guide = document.querySelector("#bankGuide");
  if (!guide) return;
  const account = paymentAccountText();
  const match = selectedApplyMatch();
  const matchLine = match ? `${match.date} ${match.time} · ${match.location}` : "선택한 매치";
  const playerLine = match ? `현재 ${match.playerCount}/2명 신청` : "선택 후 확인 가능";

  guide.innerHTML = `
    <div class="final-check-head">
      <span>신청 전 최종 확인</span>
      <strong>${matchLine}</strong>
      <small>${playerLine}</small>
    </div>
    <div class="final-check-grid">
      <span><strong>정상 참가비</strong>5,000원</span>
      <span><strong>6월 시범운영</strong>1,000원</span>
      <span><strong>입금 계좌</strong>${account}</span>
      <span><strong>현장 비용</strong>카페 음료 비용 별도</span>
      <span><strong>입금자명</strong>회원가입 닉네임과 동일</span>
      <span><strong>환불 기준</strong>시작 24시간 전까지 2명 미달 시 참가비 환불</span>
    </div>
  `;
}

function paymentAccountText() {
  const account = appState.payment?.bankAccountLabel || "카카오뱅크 3333-21-1861396";
  return account.includes("구원근") ? account : `${account} / 예금주: 구원근`;
}

function selectedApplyMatch() {
  const matchId = document.querySelector("#dateSelect")?.value;
  return appState.matches.find((match) => match.id === matchId) || null;
}

function getMatchArea(match) {
  return match.location.split(" ")[0];
}

function visibleMatches() {
  if (activeAreaFilter === "all") {
    return appState.matches;
  }

  if (activeAreaFilter === "mine") {
    if (!appState.isAuthenticated || !appState.user?.area) return appState.matches;
    return appState.matches.filter((match) => getMatchArea(match) === appState.user.area);
  }

  return appState.matches.filter((match) => getMatchArea(match) === activeAreaFilter);
}

function matchSortValue(match) {
  const matchDate = parseMatchDate(match);
  const dateValue = matchDate ? matchDate.getTime() : Number.MAX_SAFE_INTEGER;
  return `${String(dateValue).padStart(16, "0")} ${match.time || ""} ${match.location || ""}`;
}

function matchCapacityLabel(match) {
  return match.playerCount >= 2 ? "마감" : `${match.playerCount}/2`;
}

function selectableApplyMatches() {
  return [...appState.matches].sort((a, b) => matchSortValue(a).localeCompare(matchSortValue(b), "ko-KR"));
}

function dateKeyFromDate(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyFromMatch(match) {
  return dateKeyFromDate(parseMatchDate(match));
}

function monthKeyFromDate(date) {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyFromMatch(match) {
  return monthKeyFromDate(parseMatchDate(match));
}

function monthLabel(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function buildApplyCalendar(areaMatches, activeDateLabel, activeMonthKey) {
  const datedMatches = areaMatches
    .map((match) => ({ match, date: parseMatchDate(match), key: dateKeyFromMatch(match), monthKey: monthKeyFromMatch(match) }))
    .filter((item) => item.date && item.key);

  if (!datedMatches.length) return "";

  const monthKeys = [...new Set(datedMatches.map((item) => item.monthKey))];
  const selectedItem =
    datedMatches.find((item) => item.monthKey === activeMonthKey) ||
    datedMatches.find((item) => item.match.date === activeDateLabel) ||
    datedMatches[0];
  const selectedMonthIndex = monthKeys.indexOf(selectedItem.monthKey);
  const prevMonthKey = selectedMonthIndex > 0 ? monthKeys[selectedMonthIndex - 1] : "";
  const nextMonthKey = selectedMonthIndex < monthKeys.length - 1 ? monthKeys[selectedMonthIndex + 1] : "";
  const monthStart = new Date(selectedItem.date.getFullYear(), selectedItem.date.getMonth(), 1);
  const monthEnd = new Date(selectedItem.date.getFullYear(), selectedItem.date.getMonth() + 1, 0);
  const firstDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push(`<span class="apply-calendar-day empty" aria-hidden="true"></span>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const key = dateKeyFromDate(cellDate);
    const matchesForDay = datedMatches.filter((item) => item.key === key).map((item) => item.match);
    const availableCount = matchesForDay.filter((match) => match.playerCount < 2 && !match.appliedByMe).length;
    const totalCount = matchesForDay.length;
    const label = matchesForDay[0]?.date || "";
    const selected = label && label === activeDateLabel;
    const disabled = !totalCount;
    const closed = totalCount > 0 && availableCount === 0;

    cells.push(`
      <button class="apply-calendar-day ${selected ? "selected" : ""} ${closed ? "closed" : ""}" type="button" data-apply-date="${label}" ${disabled ? "disabled" : ""}>
        <span>${day}</span>
        <small>${totalCount ? (closed ? "마감" : `${availableCount}개`) : ""}</small>
      </button>
    `);
  }

  return `
    <div class="apply-calendar">
      <div class="apply-calendar-head">
        <button type="button" data-apply-month="${prevMonthKey}" ${prevMonthKey ? "" : "disabled"}>‹</button>
        <strong>${monthLabel(monthStart)}</strong>
        <button type="button" data-apply-month="${nextMonthKey}" ${nextMonthKey ? "" : "disabled"}>›</button>
        <span>신청 가능한 날짜를 선택하세요</span>
      </div>
      <div class="apply-calendar-weekdays">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
      </div>
      <div class="apply-calendar-grid">
        ${cells.join("")}
      </div>
    </div>
  `;
}

function syncApplySelection(matches) {
  const areas = [...new Set(matches.map((match) => getMatchArea(match)))];
  if (!areas.length) {
    activeApplyArea = "";
    activeApplyDate = "";
    activeApplyTimeMatchId = "";
    return;
  }

  if (!areas.includes(activeApplyArea)) {
    activeApplyArea = appState.user?.area && areas.includes(appState.user.area) ? appState.user.area : areas[0];
  }

  const areaMatches = matches.filter((match) => getMatchArea(match) === activeApplyArea);
  const datedAreaMatches = areaMatches
    .map((match) => ({ match, monthKey: monthKeyFromMatch(match) }))
    .filter((item) => item.monthKey);
  const monthKeys = [...new Set(datedAreaMatches.map((item) => item.monthKey))];
  if (!monthKeys.includes(activeApplyMonthKey)) {
    activeApplyMonthKey =
      datedAreaMatches.find((item) => item.match.playerCount < 2 && !item.match.appliedByMe)?.monthKey || monthKeys[0] || "";
  }

  const monthMatches = activeApplyMonthKey
    ? datedAreaMatches.filter((item) => item.monthKey === activeApplyMonthKey).map((item) => item.match)
    : areaMatches;
  const dates = [...new Set(monthMatches.map((match) => match.date))];
  if (!dates.includes(activeApplyDate)) {
    activeApplyDate =
      dates.find((date) =>
        monthMatches.some((match) => match.date === date && match.playerCount < 2 && !match.appliedByMe),
      ) ||
      dates[0] ||
      "";
  }

  const dateMatches = areaMatches.filter((match) => match.date === activeApplyDate);
  if (!dateMatches.some((match) => match.id === activeApplyTimeMatchId)) {
    activeApplyTimeMatchId = dateMatches.find((match) => match.playerCount < 2 && !match.appliedByMe)?.id || dateMatches[0]?.id || "";
  }
}

function renderApplySelector() {
  const selector = document.querySelector("#applyStepSelector");
  const hiddenInput = document.querySelector("#dateSelect");
  if (!selector || !hiddenInput) return;

  const matches = selectableApplyMatches();
  syncApplySelection(matches);

  if (!matches.length) {
    hiddenInput.value = "";
    selector.innerHTML = `<div class="apply-step-empty">현재 신청 가능한 매치가 없습니다.</div>`;
    return;
  }

  const areas = [...new Set(matches.map((match) => getMatchArea(match)))];
  const areaMatches = matches.filter((match) => getMatchArea(match) === activeApplyArea);
  const timeMatches = areaMatches.filter((match) => match.date === activeApplyDate);
  const selectedMatch = timeMatches.find((match) => match.id === activeApplyTimeMatchId);
  hiddenInput.value = selectedMatch && selectedMatch.playerCount < 2 && !selectedMatch.appliedByMe ? selectedMatch.id : "";

  selector.innerHTML = `
    <div class="apply-step">
      <strong>지역</strong>
      <div class="apply-option-grid apply-option-grid--area">
        ${areas
          .map(
            (area) => `
              <button class="${area === activeApplyArea ? "selected" : ""}" type="button" data-apply-area="${area}">
                ${area}
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
    <div class="apply-step">
      <strong>날짜</strong>
      ${buildApplyCalendar(areaMatches, activeApplyDate, activeApplyMonthKey)}
    </div>
    <div class="apply-step">
      <strong>시간</strong>
      <div class="apply-option-grid apply-option-grid--time">
        ${timeMatches
          .map((match) => {
            const closed = match.playerCount >= 2 || match.appliedByMe;
            return `
              <button class="${match.id === activeApplyTimeMatchId ? "selected" : ""}" type="button" data-apply-time="${match.id}" ${closed ? "disabled" : ""}>
                <span>${match.time}</span>
                <small>${matchCapacityLabel(match)}</small>
                <em>${match.location}</em>
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderAreaFilters() {
  const filterBox = document.querySelector("#areaFilters");
  const areas = [...new Set(appState.matches.map((match) => getMatchArea(match)))];
  const filters = [
    { value: "all", label: "전체" },
    ...(appState.isAuthenticated ? [{ value: "mine", label: "내 활동지" }] : []),
    ...areas.map((area) => ({ value: area, label: area })),
  ];

  if (!filters.some((filter) => filter.value === activeAreaFilter)) {
    activeAreaFilter = "all";
  }

  filterBox.innerHTML = filters
    .map(
      (filter) => `
        <button class="${filter.value === activeAreaFilter ? "selected" : ""}" type="button" data-area-filter="${filter.value}">
          ${filter.label}
        </button>
      `,
    )
    .join("");
}

function renderUser() {
  const userChip = document.querySelector("#userChip");
  const authButton = document.querySelector("#openAuthButton");

  if (!appState.isAuthenticated) {
    if (authButton) {
      authButton.hidden = false;
      authButton.textContent = "로그인";
    }
    userChip.hidden = true;
    userChip.innerHTML = "";
    return;
  }

  const user = appState.user;
  if (authButton) authButton.hidden = true;
  userChip.hidden = false;
  userChip.innerHTML = `
    <span class="avatar">${user.nickname.slice(0, 1)}</span>
    <div>
      <strong>${user.nickname}</strong>
      <span>${user.wins}승 ${user.losses}패</span>
    </div>
  `;
}

function renderAuth() {
  const guestAuth = document.querySelector("#guestAuth");
  const memberCard = document.querySelector("#memberCard");
  const applyButton = document.querySelector("#applyForm button[type='submit']");
  const dateSelect = document.querySelector("#dateSelect");
  const finalPaymentCheck = document.querySelector("#finalPaymentCheck");
  const refundConsent = document.querySelector('input[name="refundConsent"]');

  if (!appState.isAuthenticated) {
    guestAuth.hidden = false;
    memberCard.hidden = true;
    memberCard.innerHTML = "";
    applyButton.disabled = false;
    applyButton.innerHTML = `<span data-icon="card"></span> 로그인하고 신청`;
    dateSelect.disabled = false;
    finalPaymentCheck.hidden = true;
    refundConsent.disabled = true;
    refundConsent.checked = false;
    isPaymentConfirmOpen = false;
    return;
  }

  const user = appState.user;
  guestAuth.hidden = true;
  memberCard.hidden = false;
  memberCard.innerHTML = `
    <div>
      <span class="status-pill confirmed">로그인됨</span>
      <h3>${user.nickname}</h3>
      <p>${user.phone} · 주 활동지 ${user.area}</p>
    </div>
    <button class="secondary-button" type="button" id="logoutButton">로그아웃</button>
  `;
  applyButton.disabled = false;
  applyButton.innerHTML = isPaymentConfirmOpen
    ? `<span data-icon="card"></span> 신청 완료`
    : `<span data-icon="card"></span> 신청 전 확인`;
  dateSelect.disabled = false;
  finalPaymentCheck.hidden = !isPaymentConfirmOpen;
  refundConsent.disabled = !isPaymentConfirmOpen;
  if (!isPaymentConfirmOpen) refundConsent.checked = false;
}

function renderMyApplications() {
  const panel = document.querySelector("#myApplications");

  if (!appState.isAuthenticated) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  const mine = appState.matches.filter((match) => match.hasMyApplication);
  panel.hidden = false;

  if (!mine.length) {
    panel.innerHTML = `
      <div>
        <h3>내 신청 내역</h3>
        <p>아직 신청한 매치가 없습니다.</p>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="my-applications-head">
      <div>
        <h3>내 신청 내역</h3>
        <p>신청한 날짜, 확정 여부, 입금 확인 상태를 확인합니다.</p>
      </div>
      <span class="status-pill confirmed">${mine.length}건</span>
    </div>
    <div class="my-application-list">
      ${mine
        .map((match) => {
          const myApplication = match.allPlayers.find((player) => player.memberId === appState.user.id);
          const myPayment = myApplication?.paymentStatus;
          const paymentLabel = paymentStatusLabel(myPayment);
          const applicationStatusLabel = myApplication?.cancelled ? "취소됨" : match.statusLabel;
          const gameLabel = match.gameRevealed && match.game ? match.game.title : "게임 공개 대기";
          const canCancel = !match.confirmed && !["refund_requested", "refund_scheduled", "refunded"].includes(myPayment);

          return `
            <article class="my-application-item">
              <div>
                <strong>${match.date} ${match.time}</strong>
                <span>${match.location}</span>
                <span>${applicationStatusLabel} · ${paymentLabel} · ${gameLabel}</span>
                ${
                  myPayment === "payment_pending"
                    ? `<span>입금 계좌: ${paymentAccountText()}</span>`
                    : ""
                }
              </div>
              ${
                canCancel
                  ? `<button class="secondary-button" type="button" data-cancel-application="${match.id}">신청 취소</button>`
                  : ""
              }
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function paymentStatusLabel(status) {
  const labels = {
    payment_pending: "입금 확인 대기",
    paid: "입금 확인 완료",
    refund_requested: "환불 요청",
    refund_scheduled: "환불 예정",
    refunded: "환불 완료",
  };

  return labels[status] || "입금 확인 완료";
}

function renderMatches() {
  const grid = document.querySelector("#matchGrid");
  const submitButton = document.querySelector("#applyForm button[type='submit']");
  const matches = visibleMatches();

  grid.innerHTML = matches.length
    ? `
      <div class="match-list-head">
        <span>날짜</span>
        <span>지역/장소</span>
        <span>상태</span>
        <span>인원</span>
      </div>
      ${matches
        .map(
          (match) => `
            <article class="match-card match-row ${match.appliedByMe ? "mine" : ""}">
              <div>
                <strong>${match.date}</strong>
                <span>${match.time}</span>
              </div>
              <p>${match.location}</p>
              <span class="status-pill ${match.status}">${match.appliedByMe ? "내 신청" : match.statusLabel}</span>
              <div class="compact-slots" aria-label="참가 슬롯">
                <span>${match.playerCount}/2명</span>
                <span class="slot ${match.playerCount >= 1 ? "filled" : ""}"></span>
                <span class="slot ${match.playerCount >= 2 ? "filled" : ""}"></span>
              </div>
            </article>
          `,
        )
        .join("")}
    `
    : `<article class="match-card empty-state"><strong>표시할 매치가 없습니다</strong><p>다른 활동지를 선택해 주세요.</p></article>`;

  renderApplySelector();
  submitButton.disabled = appState.isAuthenticated && !document.querySelector("#dateSelect")?.value;
}

function renderNotices() {
  const confirmedMatches = appState.matches.filter((match) => match.confirmed);

  document.querySelector("#noticeBoard").innerHTML = confirmedMatches
    .map((match) => {
      const gameLabel = match.gameRevealed && match.game ? match.game.title : "게임 공개 대기";
      const gameCategory = match.gameRevealed && match.game ? getGameCategory(match.game) : "";
      const gameBody =
        match.gameRevealed && match.game
          ? `${match.game.summary} 이번 매치의 상세 규칙이 공개되었습니다.`
          : "시작 24시간 전에 운영자가 게임과 규칙을 공개합니다.";
      const playerNames = match.players.map((player) => player.nickname);

      return `
        <article class="notice-main">
          <div class="status-pill ${
            match.gameRevealed ? `revealed-pill notice-game-pill notice-game-pill--${gameCategory}` : "confirmed"
          }">${gameLabel}</div>
          <h3>${match.date} ${match.time}</h3>
          <p>${gameBody}</p>
          <div class="player-row">
            <span>${playerNames[0]}</span>
            <strong>VS</strong>
            <span>${playerNames[1]}</span>
          </div>
          ${
            match.game
              ? `<button class="secondary-button notice-action" data-open-game="${match.game.id}">규칙 보기</button>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function renderRankings() {
  document.querySelector("#rankingRows").innerHTML = appState.rankings
    .map(
      (row, index) => `
        <div class="table-row">
          <span><b class="rank-badge">${index + 1}</b></span>
          <span><strong>${row.nickname}</strong></span>
          <span>${row.record}</span>
          <span><strong>${row.rate}</strong></span>
          <span>${row.area || "-"}</span>
        </div>
      `,
    )
    .join("");
}

function getGameTags(game) {
  return gameTagMap[game.id] || [];
}

function getGameCategory(game) {
  return gameCategoryMap[game.id] || "uncategorized";
}

function renderGameCategoryFilters() {
  const filter = document.querySelector("#gameCategoryFilter");
  if (!filter) return;

  filter.innerHTML = gameCategoryOptions
    .map(
      (option) => `
        <button
          type="button"
          class="${activeGameCategoryFilter === option.value ? "selected" : ""}"
          data-game-category="${option.value}"
        >
          ${option.label}
        </button>
      `,
    )
    .join("");
}

function renderGames(gameId, options = {}) {
  if (options.detail !== undefined) {
    isGameDetailOpen = options.detail;
  }

  const searchInput = document.querySelector("#gameSearchInput");
  if (searchInput && searchInput.value !== gameSearchQuery) {
    searchInput.value = gameSearchQuery;
  }

  const query = gameSearchQuery.trim().toLowerCase();
  const categoryFilteredGames =
    activeGameCategoryFilter === "all"
      ? appState.games
      : appState.games.filter((game) => getGameCategory(game) === activeGameCategoryFilter);
  const visibleGames = query
    ? categoryFilteredGames.filter((game) =>
        [game.title, game.summary, game.win, ...getGameTags(game), ...(game.rules || [])]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : categoryFilteredGames;
  const activeGame =
    visibleGames.find((game) => game.id === gameId) ||
    visibleGames.find((game) => game.id === activeGameId) ||
    appState.games.find((game) => game.id === gameId) ||
    appState.games.find((game) => game.id === activeGameId) ||
    visibleGames[0] ||
    appState.games[0];

  activeGameId = activeGame?.id || null;

  const gameLayout = document.querySelector(".game-layout");
  const gameControls = document.querySelector(".game-controls");
  const gameSearch = document.querySelector(".game-search");
  const gameList = document.querySelector("#gameList");
  const gameDetail = document.querySelector("#gameDetail");

  renderGameCategoryFilters();

  if (gameLayout) {
    gameLayout.classList.toggle("detail-view", isGameDetailOpen);
  }

  if (gameSearch) {
    gameSearch.hidden = isGameDetailOpen;
  }

  if (gameControls) {
    gameControls.hidden = isGameDetailOpen;
  }

  if (gameList) {
    gameList.hidden = isGameDetailOpen;
  }

  if (gameDetail) {
    gameDetail.hidden = !isGameDetailOpen;
  }

  gameList.innerHTML = visibleGames.length
    ? visibleGames
        .map((game) => {
          const tags = getGameTags(game);
          const category = getGameCategory(game);
          return `
            <button class="game-card game-card--${category}" data-game="${game.id}">
              <strong>${game.title}</strong>
              <span>${game.summary}</span>
              ${tags.length ? `<div class="game-tags">${tags.map((tag) => `<small>${tag}</small>`).join("")}</div>` : ""}
            </button>
          `;
        })
        .join("")
    : `<div class="game-empty">검색 결과가 없습니다. 다른 키워드로 찾아보세요.</div>`;

  if (!activeGame) {
    gameDetail.innerHTML = "";
    return;
  }

  const activeGameTags = getGameTags(activeGame);

  gameDetail.innerHTML = `
    <button class="game-back-button secondary-button" type="button" data-game-list>&lt;뒤로가기</button>
    <div class="game-detail-header">
      <span class="status-pill revealed-pill">운영 게임</span>
      <h3>${activeGame.title}</h3>
      <p>${activeGame.summary}</p>
      ${activeGameTags.length ? `<div class="game-tags detail-tags">${activeGameTags.map((tag) => `<small>${tag}</small>`).join("")}</div>` : ""}
      <div class="game-detail-actions">
        <button class="secondary-button" type="button" data-copy-game-rules="${activeGame.id}">규칙 복사</button>
      </div>
    </div>
    <div class="rule-section-title">
      <strong>게임 규칙</strong>
      <span>${activeGame.rules.length}개 항목</span>
    </div>
    <ol class="rule-list">
      ${activeGame.rules.map((rule) => `<li>${formatRule(rule)}</li>`).join("")}
    </ol>
    <div class="win-condition-box">
      <strong>승리 조건</strong>
      <p>${activeGame.win}</p>
    </div>
    <div class="game-bottom-actions">
      <button class="secondary-button" type="button" data-game-list>목록</button>
    </div>
  `;
}

function formatRule(rule) {
  const colonIndex = rule.indexOf(":");
  const lead = colonIndex > 0 ? rule.slice(0, colonIndex).trim() : "";

  if (lead && lead.length <= 18) {
    return `<div class="rule-copy"><span class="rule-lead">${lead}</span><span>${rule.slice(colonIndex + 1).trim()}</span></div>`;
  }

  return `<div class="rule-copy"><span>${rule}</span></div>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildGameRuleText(gameId) {
  const game = appState.games.find((item) => item.id === gameId);
  if (!game) return "";
  const tags = getGameTags(game);

  return [
    `[1VS1매치] ${game.title}`,
    "",
    ...(tags.length ? [`태그: ${tags.join(", ")}`, ""] : []),
    game.summary,
    "",
    "게임 규칙",
    ...game.rules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    `승리 조건: ${game.win}`,
    "",
    "https://www.1x1match.com",
  ].join("\n");
}

function renderAdmin() {
  const adminLoginForm = document.querySelector("#adminLoginForm");
  const adminContent = document.querySelector("#adminContent");

  if (!appState.isAdmin) {
    adminLoginForm.hidden = false;
    adminContent.hidden = true;
    return;
  }

  adminLoginForm.hidden = true;
  adminContent.hidden = false;

  const metrics = [
    ["전체 회원", appState.members?.length || 0, "all"],
    ["입금 대기", appState.matches.filter(hasPaymentPending).length, "payment"],
    ["게임 공개 대기", appState.matches.filter((match) => match.confirmed && !match.gameRevealed).length, "reveal"],
    ["결과 입력 대기", appState.matches.filter((match) => match.confirmed && !match.result).length, "result"],
    ["환불 필요", appState.matches.filter(hasRefundNeeded).length, "refund"],
  ];

  document.querySelector("#adminMetrics").innerHTML = metrics
    .map(
      ([label, value, filter]) => `
        <button class="metric ${activeOpsFilter === filter ? "selected" : ""}" type="button" data-ops-jump="${filter}">
          <span>${label}</span>
          <strong>${value}</strong>
        </button>
      `,
    )
    .join("");

  renderAdminActionPanel();
  renderMemberRoster();
  renderOpsList();

  const events = appState.allEvents || appState.events || [];
  const visibleEvents = events.slice(0, visibleEventCount);
  const hasMoreEvents = visibleEventCount < events.length;

  document.querySelector("#eventLog").innerHTML = `
    <div class="event-log-head">
      <h3>운영 로그</h3>
      <span>${visibleEvents.length}/${events.length}</span>
    </div>
    <ul>
      ${visibleEvents
        .map((event) => {
          const entry = typeof event === "string" ? { message: event, createdAt: null } : event;
          return `<li><time>${formatEventTime(entry.createdAt)}</time><span>${entry.message}</span></li>`;
        })
        .join("")}
    </ul>
    ${hasMoreEvents ? `<button class="secondary-button event-more-button" type="button" data-show-more-events>더 보기</button>` : ""}
  `;
}

function adminActionItems() {
  const items = [
    {
      filter: "payment",
      title: "입금 확인",
      count: appState.matches.filter(hasPaymentPending).length,
      detail: "참가 신청 후 입금 확인이 필요한 매치",
    },
    {
      filter: "reveal",
      title: "게임 공개",
      count: appState.matches.filter((match) => match.confirmed && !match.gameRevealed).length,
      detail: "확정됐지만 아직 게임이 공개되지 않은 매치",
    },
    {
      filter: "result",
      title: "결과 입력",
      count: appState.matches.filter((match) => match.confirmed && !match.result).length,
      detail: "경기 결과가 아직 기록되지 않은 매치",
    },
    {
      filter: "refund",
      title: "환불 처리",
      count: appState.matches.filter(hasRefundNeeded).length,
      detail: "환불 예약 또는 환불 확인이 필요한 매치",
    },
  ];

  return items;
}

function renderAdminActionPanel() {
  const panel = document.querySelector("#adminActionPanel");
  if (!panel) return;

  const items = adminActionItems();
  const total = items.reduce((sum, item) => sum + item.count, 0);

  panel.innerHTML = `
    <div class="admin-action-head">
      <div>
        <span>운영 체크리스트</span>
        <h3>${total ? `처리할 일 ${total}개` : "현재 급한 처리 항목 없음"}</h3>
      </div>
      <button class="secondary-button" type="button" data-ops-jump="all">전체 매치 보기</button>
    </div>
    <div class="admin-action-grid">
      ${items
        .map(
          (item) => `
            <button class="admin-action-item ${item.count ? "active" : ""}" type="button" data-ops-jump="${item.filter}">
              <strong>${item.title}</strong>
              <span>${item.count}개</span>
              <small>${item.detail}</small>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function memberApplicationCount(memberId) {
  return appState.matches.reduce(
    (count, match) => count + match.allPlayers.filter((player) => player.memberId === memberId && !player.cancelled).length,
    0,
  );
}

function memberApplications(memberId) {
  return appState.matches
    .flatMap((match) =>
      match.allPlayers
        .filter((player) => player.memberId === memberId)
        .map((player) => ({
          match,
          player,
        })),
    )
    .sort((a, b) => `${a.match.date} ${a.match.time}`.localeCompare(`${b.match.date} ${b.match.time}`, "ko-KR"));
}

function memberResultLabel(member, match) {
  if (!match.result) return "결과 없음";
  if (match.result.winnerId === member.id) return "승리";
  if (match.result.loserId === member.id) return "패배";
  return "미참여";
}

function renderMemberDetail() {
  const detail = document.querySelector("#memberDetail");
  if (!detail) return;

  const members = appState.members || [];
  const member = members.find((item) => item.id === activeMemberId);

  if (!member) {
    detail.innerHTML = `
      <div class="member-detail-empty">
        <strong>회원을 선택해 주세요.</strong>
        <span>회원 행을 클릭하면 상세 정보와 신청 이력이 열립니다.</span>
      </div>
    `;
    return;
  }

  const total = member.wins + member.losses;
  const rate = total ? `${((member.wins / total) * 100).toFixed(1)}%` : "0.0%";
  const applications = memberApplications(member.id);

  detail.innerHTML = `
    <div class="member-detail-head">
      <div>
        <p>회원 상세</p>
        <h4>${escapeHtml(member.nickname)}</h4>
      </div>
      <button class="secondary-button" type="button" data-close-member-detail>닫기</button>
    </div>
    <div class="member-detail-grid">
      <span><strong>이름</strong>${escapeHtml(member.realName || "미등록")}</span>
      <span><strong>생년월일</strong>${escapeHtml(member.birthDate || "미등록")}</span>
      <span><strong>전화번호</strong>${escapeHtml(member.phone)}</span>
      <span><strong>활동지</strong>${escapeHtml(member.area)}</span>
      <span><strong>전적</strong>${member.wins}승 ${member.losses}패</span>
      <span><strong>승률</strong>${rate}</span>
      <span><strong>신청</strong>${applications.length}회</span>
    </div>
    <div class="member-history">
      <div class="member-history-head">
        <h4>신청 이력</h4>
        <span>${applications.length}건</span>
      </div>
      ${
        applications.length
          ? applications
              .map(({ match, player }) => {
                const gameLabel = match.game ? match.game.title : match.gameRevealed ? "게임 미지정" : "게임 공개 대기";
                const applicationLabel = player.cancelled ? "취소됨" : match.confirmed ? "확정" : "대기";
                const paymentLabel = paymentStatusLabel(player.paymentStatus);
                const resultLabel = memberResultLabel(member, match);

                return `
                  <article class="member-history-row">
                    <div>
                      <strong>${match.date} ${match.time}</strong>
                      <span>${escapeHtml(match.location)} · ${escapeHtml(gameLabel)}</span>
                    </div>
                    <div>
                      <span>${applicationLabel}</span>
                      <span>${paymentLabel}</span>
                      <span>${resultLabel}</span>
                    </div>
                  </article>
                `;
              })
              .join("")
          : `<div class="member-history-empty">아직 신청 이력이 없습니다.</div>`
      }
    </div>
  `;
}

function renderMemberRoster() {
  const roster = document.querySelector("#memberRoster");
  if (!roster) return;

  const members = [...(appState.members || [])].sort((a, b) => {
    const aTotal = a.wins + a.losses;
    const bTotal = b.wins + b.losses;
    return bTotal - aTotal || b.wins - a.wins || a.nickname.localeCompare(b.nickname, "ko-KR");
  });

  if (!members.length) {
    roster.innerHTML = `<div class="member-roster-empty">가입 회원이 없습니다.</div>`;
    renderMemberDetail();
    return;
  }

  if (activeMemberId && !members.some((member) => member.id === activeMemberId)) {
    activeMemberId = null;
  }

  roster.innerHTML = `
    <div class="member-roster-row member-roster-header">
      <span>닉네임</span>
      <span>이름</span>
      <span>생년월일</span>
      <span>전화번호</span>
      <span>활동지</span>
      <span>전적</span>
      <span>승률</span>
      <span>신청</span>
    </div>
    ${members
      .map((member) => {
        const total = member.wins + member.losses;
        const rate = total ? `${((member.wins / total) * 100).toFixed(1)}%` : "0.0%";
        return `
          <button class="member-roster-row member-roster-button ${activeMemberId === member.id ? "selected" : ""}" type="button" data-member-detail="${member.id}">
            <strong>${escapeHtml(member.nickname)}</strong>
            <span>${escapeHtml(member.realName || "미등록")}</span>
            <span>${escapeHtml(member.birthDate || "미등록")}</span>
            <span>${escapeHtml(member.phone)}</span>
            <span>${escapeHtml(member.area)}</span>
            <span>${member.wins}승 ${member.losses}패</span>
            <span>${rate}</span>
            <span>${memberApplicationCount(member.id)}회</span>
          </button>
        `;
      })
      .join("")}
  `;

  renderMemberDetail();
}

function buildMemberContactText() {
  return (appState.members || [])
    .map((member) => {
      const total = member.wins + member.losses;
      const rate = total ? `${((member.wins / total) * 100).toFixed(1)}%` : "0.0%";
      return `${member.nickname} / ${member.realName || "미등록"} / ${member.birthDate || "미등록"} / ${member.phone} / ${member.area} / ${member.wins}승 ${member.losses}패 / 승률 ${rate} / 신청 ${memberApplicationCount(member.id)}회`;
    })
    .join("\n");
}

function parseMatchDate(match) {
  const idDate = String(match.id || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (idDate) return new Date(`${idDate}T00:00:00`);

  const fallback = new Date(match.date);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isMatchThisWeek(match) {
  const matchDate = parseMatchDate(match);
  if (!matchDate) return false;

  const start = startOfToday();
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return matchDate >= start && matchDate < end;
}

function isMatchThisMonth(match) {
  const matchDate = parseMatchDate(match);
  if (!matchDate) return false;

  const today = startOfToday();
  return matchDate.getFullYear() === today.getFullYear() && matchDate.getMonth() === today.getMonth();
}

function hasPaymentPending(match) {
  return match.allPlayers.some((player) => player.paymentStatus === "payment_pending" && !player.cancelled);
}

function hasRefundNeeded(match) {
  return match.allPlayers.some((player) => ["refund_requested", "refund_scheduled"].includes(player.paymentStatus));
}

function matchesOpsFilter(match, filter) {
  if (filter === "week") return isMatchThisWeek(match);
  if (filter === "month") return isMatchThisMonth(match);
  if (filter === "open") return match.playerCount < 2;
  if (filter === "payment") return hasPaymentPending(match);
  if (filter === "confirmed") return match.confirmed;
  if (filter === "reveal") return match.confirmed && !match.gameRevealed;
  if (filter === "result") return match.confirmed && !match.result;
  if (filter === "refund") return hasRefundNeeded(match);

  return true;
}

function matchSearchText(match) {
  const gameTitle = match.game?.title || "";
  const playerText = match.allPlayers.map((player) => `${player.nickname} ${player.phone} ${player.area}`).join(" ");
  return `${match.date} ${match.time} ${match.location} ${match.statusLabel} ${gameTitle} ${playerText} ${match.adminNote || ""}`.toLowerCase();
}

function isMatchInOpsDateRange(match) {
  const dateKey = dateKeyFromMatch(match);
  if (!dateKey) return true;
  if (opsDateFrom && dateKey < opsDateFrom) return false;
  if (opsDateTo && dateKey > opsDateTo) return false;
  return true;
}

function sortOpsMatches(matches) {
  return [...matches].sort((a, b) => {
    const dateCompare = matchSortValue(a).localeCompare(matchSortValue(b), "ko-KR");
    if (opsSortMode === "dateDesc") return -dateCompare;
    if (opsSortMode === "area") return getMatchArea(a).localeCompare(getMatchArea(b), "ko-KR") || dateCompare;
    if (opsSortMode === "status") return a.statusLabel.localeCompare(b.statusLabel, "ko-KR") || dateCompare;
    if (opsSortMode === "players") return b.playerCount - a.playerCount || dateCompare;
    return dateCompare;
  });
}

function filteredOpsMatches() {
  const query = opsSearchQuery.trim().toLowerCase();
  return sortOpsMatches(
    appState.matches.filter(
      (match) =>
        matchesOpsFilter(match, activeOpsFilter) &&
        isMatchInOpsDateRange(match) &&
        (!query || matchSearchText(match).includes(query)),
    ),
  );
}

function renderOpsList() {
  const opsFilters = [
    { value: "all", label: "전체" },
    { value: "week", label: "이번 주" },
    { value: "month", label: "이번 달" },
    { value: "open", label: "신청 가능" },
    { value: "payment", label: "입금 대기" },
    { value: "confirmed", label: "확정/마감" },
    { value: "reveal", label: "게임 공개 대기" },
    { value: "result", label: "결과 대기" },
    { value: "refund", label: "환불 필요" },
  ];
  const filteredMatches = filteredOpsMatches();
  if (activeOpsMatchId && !filteredMatches.some((match) => match.id === activeOpsMatchId)) {
    activeOpsMatchId = null;
  }
  const controlsMarkup = `
    <div class="ops-control-bar">
      <label>
        검색
        <input type="search" id="opsSearchInput" value="${escapeHtml(opsSearchQuery)}" placeholder="날짜, 장소, 닉네임, 전화번호, 게임명" autocomplete="off" />
      </label>
      <label>
        정렬
        <select id="opsSortSelect">
          <option value="dateAsc" ${opsSortMode === "dateAsc" ? "selected" : ""}>가까운 날짜순</option>
          <option value="dateDesc" ${opsSortMode === "dateDesc" ? "selected" : ""}>늦은 날짜순</option>
          <option value="area" ${opsSortMode === "area" ? "selected" : ""}>지역순</option>
          <option value="status" ${opsSortMode === "status" ? "selected" : ""}>상태순</option>
          <option value="players" ${opsSortMode === "players" ? "selected" : ""}>인원 많은순</option>
        </select>
      </label>
      <label>
        시작일
        <input type="date" id="opsDateFrom" value="${opsDateFrom}" />
      </label>
      <label>
        종료일
        <input type="date" id="opsDateTo" value="${opsDateTo}" />
      </label>
      <button class="secondary-button" type="button" id="opsFilterReset">필터 초기화</button>
    </div>
    <div class="ops-result-summary">
      <strong>${filteredMatches.length}개</strong>
      <span>조건에 맞는 매치</span>
    </div>
  `;
  const filterMarkup = `
    <div class="ops-filter segmented">
      ${opsFilters
        .map(
          (filter) => `
            <button class="${filter.value === activeOpsFilter ? "selected" : ""}" type="button" data-ops-filter="${filter.value}">
              ${filter.label} <span>${appState.matches.filter((match) => matchesOpsFilter(match, filter.value)).length}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
  const matchesMarkup = filteredMatches.length
    ? filteredMatches.map(renderOpsCard).join("")
    : `<article class="ops-card empty-state"><strong>조건에 맞는 매치가 없습니다</strong><p>검색어, 날짜 범위, 상태 필터를 다시 확인해 주세요.</p></article>`;

  document.querySelector("#opsList").innerHTML = controlsMarkup + filterMarkup + matchesMarkup;
}

function renderOpsCard(match) {
  const needsReveal = match.confirmed && !match.gameRevealed;
  const needsRefund = match.allPlayers.some((player) => ["refund_requested", "refund_scheduled"].includes(player.paymentStatus));
  const hasRefunded = match.allPlayers.some((player) => player.paymentStatus === "refunded");
  const resultRecorded = Boolean(match.result);
  const isExpanded = activeOpsMatchId === match.id;
  const paymentPendingCount = match.allPlayers.filter((player) => player.paymentStatus === "payment_pending" && !player.cancelled).length;
  const issueLabels = [
    paymentPendingCount ? `입금 ${paymentPendingCount}명 대기` : "",
    needsReveal ? "게임 공개 대기" : "",
    needsRefund ? "환불 필요" : "",
    resultRecorded ? "결과 입력됨" : "",
  ].filter(Boolean);

  if (!isExpanded) {
    return `
      <article class="ops-card ops-card-collapsed">
        <button class="ops-summary-button" type="button" data-toggle-ops-match="${match.id}">
          <span>
            <strong>${match.date} ${match.time}</strong>
            <small>${match.location} · ${match.playerCount}/2명 · ${match.statusLabel}</small>
          </span>
          <span class="ops-summary-tags">
            ${
              issueLabels.length
                ? issueLabels.map((label) => `<b>${label}</b>`).join("")
                : "<b>특이사항 없음</b>"
            }
          </span>
          <span class="ops-open-label">관리 열기</span>
        </button>
      </article>
    `;
  }

  const recommendedGame = needsReveal ? match.game : null;
  const gameOptions = appState.games
    .map((game) => `<option value="${game.id}" ${match.game?.id === game.id ? "selected" : ""}>${game.title}</option>`)
    .join("");
  const winnerOptions = match.players.map((player) => `<option value="${player.memberId}">${player.nickname}</option>`).join("");
  const participantList = match.allPlayers.length
    ? match.allPlayers
        .map((player) => {
          const paymentLabel = paymentStatusLabel(player.paymentStatus);
          return `
            <div class="participant-row ${player.cancelled ? "cancelled" : ""}">
              <strong>${player.nickname}</strong>
              <span>${player.phone}</span>
              <span>${player.area}</span>
              <span>
                ${paymentLabel}
                ${
                  player.paymentStatus === "payment_pending" && !player.cancelled
                    ? `<button class="inline-action" type="button" data-complete-payment="${match.id}" data-member-id="${player.memberId}">입금 확인</button>`
                    : ""
                }
                ${
                  player.paymentStatus === "paid" && !player.cancelled
                    ? `<button class="inline-action danger" type="button" data-undo-payment="${match.id}" data-member-id="${player.memberId}">입금 취소</button>`
                    : ""
                }
              </span>
            </div>
          `;
        })
        .join("")
    : `<div class="participant-empty">아직 신청자가 없습니다.</div>`;
  const messageMarkup = buildAdminMessages(match)
    .map((messageText) => {
      const messageSent = match.notificationLog?.includes(messageText.key);
      return `
        <div class="message-preview">
          <div>
            <div>
              <strong>${messageText.type}</strong>
              <span>${messageSent ? "발송 완료" : "발송 대기"}</span>
            </div>
            <div class="message-actions">
              <button class="secondary-button" type="button" data-copy-message>문구 복사</button>
              ${
                messageSent
                  ? `<button class="secondary-button" type="button" data-message-unsent="${match.id}" data-message-key="${messageText.key}">발송 체크 취소</button>`
                  : `<button class="secondary-button" type="button" data-message-sent="${match.id}" data-message-key="${messageText.key}">발송 완료 체크</button>`
              }
            </div>
          </div>
          <p>${messageText.body}</p>
        </div>
      `;
    })
    .join("");

  return `
    <article class="ops-card ops-card-expanded">
      <div class="ops-main">
        <div>
          <h3>${match.date} ${match.time}</h3>
          <p>${match.location} · ${match.playerCount}/2명 · ${match.statusLabel}${resultRecorded ? " · 결과 입력됨" : ""}</p>
        </div>
        <button class="secondary-button" type="button" data-toggle-ops-match="${match.id}">접기</button>
        <div class="ops-actions">
          <div class="ops-action-group">
            <span>게임</span>
            <select data-game-select="${match.id}" ${!match.confirmed ? "disabled" : ""}>${gameOptions}</select>
            <button class="secondary-button" type="button" data-recommend-game="${match.id}" ${!needsReveal ? "disabled" : ""}>랜덤 추천</button>
            ${
              match.gameRevealed
                ? `<button class="secondary-button danger-button" type="button" data-hide-game="${match.id}">공개 취소</button>`
                : `<button class="secondary-button" data-reveal="${match.id}" ${!needsReveal ? "disabled" : ""}>게임 공개</button>`
            }
          </div>
          <div class="ops-action-group">
            <span>결과/정산</span>
            <select data-winner-select="${match.id}" ${!match.confirmed ? "disabled" : ""}>${winnerOptions}</select>
            ${
              resultRecorded
                ? `<button class="secondary-button danger-button" type="button" data-clear-result="${match.id}">결과 취소</button>`
                : `<button class="secondary-button" data-result="${match.id}" ${!match.confirmed ? "disabled" : ""}>결과 입력</button>`
            }
            ${
              hasRefunded
                ? `<button class="secondary-button danger-button" type="button" data-undo-refund="${match.id}">환불 취소</button>`
                : `<button class="secondary-button" data-refund="${match.id}" ${!needsRefund ? "disabled" : ""}>환불 예약</button>`
            }
          </div>
          <div class="ops-action-group compact">
            <span>복사</span>
            <button class="secondary-button" type="button" data-copy-contacts="${match.id}" ${!match.allPlayers.length ? "disabled" : ""}>연락처 복사</button>
            <button class="secondary-button" type="button" data-copy-promo="${match.id}">홍보 문구 복사</button>
          </div>
        </div>
      </div>
      ${
        needsReveal
          ? `<div class="recommendation-box">
              <span class="status-pill revealed-pill">랜덤 추천</span>
              <div>
                <strong>${recommendedGame ? recommendedGame.title : "아직 추천된 게임 없음"}</strong>
                <p>${
                  recommendedGame
                    ? `${recommendedGame.summary} 운영자가 게임 공개를 눌러야 참가자에게 공지됩니다.`
                    : "랜덤 추천 버튼을 누르면 사이트가 게임을 하나 고릅니다. 마음에 들면 게임 공개, 아니면 다시 추천하거나 선택창에서 직접 바꿔 공개할 수 있습니다."
                }</p>
              </div>
            </div>`
          : ""
      }
      <div class="admin-note-box">
        <label for="admin-note-${match.id}">운영자 메모</label>
        <textarea id="admin-note-${match.id}" data-admin-note-input="${match.id}" maxlength="600" placeholder="예: 카페 예약 완료, 입금자명 확인 필요, 참가자 요청사항">${escapeHtml(match.adminNote || "")}</textarea>
        <div>
          <span>참가자에게는 보이지 않습니다.</span>
          <button class="secondary-button" type="button" data-save-admin-note="${match.id}">메모 저장</button>
        </div>
      </div>
      <div class="participant-list">
        <div class="participant-head">
          <span>닉네임</span>
          <span>전화번호</span>
          <span>활동지</span>
          <span>결제</span>
        </div>
        ${participantList}
      </div>
      <div class="message-stack">
        <strong>상황별 문자 문구</strong>
        ${messageMarkup}
      </div>
    </article>
  `;
}

function buildAdminMessages(match) {
  const messages = [];
  const siteUrl = "https://www.1x1match.com";
  const account = paymentAccountText();
  const activeApplicants = match.allPlayers.filter((player) => !player.cancelled);
  const paymentPendingPlayers = activeApplicants.filter((player) => player.paymentStatus === "payment_pending");
  const refundPlayers = activeApplicants.filter((player) =>
    ["refund_requested", "refund_scheduled", "refunded"].includes(player.paymentStatus),
  );

  if (!match.confirmed) {
    messages.push({
      key: "recruiting",
      type: "모집 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 1:1 두뇌 서바이벌 매치 신청을 받고 있습니다. 2명이 모이면 확정됩니다. 신청: ${siteUrl}`,
    });
  }

  if (paymentPendingPlayers.length) {
    messages.push({
      key: "payment-guide",
      type: "입금 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 참가 신청이 접수되었습니다. 정상 참가비는 5,000원이지만 6월 시범운영 기간에는 1,000원입니다. ${account}으로 입금해 주세요. 카페 진행 시 음료 비용은 별도입니다. 입금자명은 회원가입 닉네임과 같게 보내주세요. 대상: ${paymentPendingPlayers.map((player) => player.nickname).join(", ")}`,
    });
  }

  if (match.confirmed) {
    const names = match.players.map((player) => player.nickname).join(" vs ");
    messages.push({
      key: "confirmed",
      type: "매치 확정 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 1:1 매치가 확정되었습니다. 참가자: ${names}. 게임은 시작 24시간 전에 공개됩니다.`,
    });
  }

  if (match.confirmed && match.gameRevealed && match.game) {
    messages.push({
      key: "game-revealed",
      type: "게임 공개 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 매치의 게임은 "${match.game.title}"입니다. 사이트 게임 목록에서 규칙을 확인해 주세요. ${siteUrl}`,
    });
  }

  if (match.playerCount === 1 && match.players[0]) {
    messages.push({
      key: "refund-pending",
      type: "미달 환불 안내",
      body: `[1VS1매치] ${match.date} ${match.time} 매치가 시작 24시간 전까지 2명 미달이면 6월 시범운영 참가비 1,000원이 환불 처리됩니다. 현재 신청자: ${match.players[0].nickname}.`,
    });
  }

  if (refundPlayers.length) {
    messages.push({
      key: "refund-guide",
      type: "환불 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 매치 환불 대상 안내입니다. 환불 대상: ${refundPlayers.map((player) => player.nickname).join(", ")}. 운영자가 입금 확인 후 순차적으로 환불 처리합니다.`,
    });
  }

  return messages;
}

function buildParticipantContacts(matchId) {
  const match = appState.matches.find((candidate) => candidate.id === matchId);
  if (!match) return "";

  const rows = match.allPlayers.map((player) => {
    const status = player.cancelled ? "취소됨" : paymentStatusLabel(player.paymentStatus);
    return `${player.nickname} / ${player.phone} / ${player.area} / ${status}`;
  });

  return [`${match.date} ${match.time} ${match.location}`, ...rows].join("\n");
}

function buildPromoText(matchId) {
  const match = appState.matches.find((candidate) => candidate.id === matchId);
  if (!match) return "";

  const statusLine = match.confirmed ? "현재 매치 확정" : `현재 ${match.playerCount}/2명 신청`;
  return [
    "[1VS1매치 참가자 모집]",
    "",
    `${match.date} ${match.time}`,
    `${match.location}`,
    statusLine,
    "",
    "두 명이 모이면 1:1 두뇌 서바이벌 게임이 열립니다.",
    "게임은 매치 24시간 전에 공개됩니다.",
    "정상 참가비 5,000원, 6월 시범운영 1,000원",
    "카페 진행 시 음료 비용 별도, 2명 미달 시 참가비 환불",
    "",
    "신청: https://www.1x1match.com",
  ].join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

async function submitForm(path, form) {
  const formData = new FormData(form);
  return request(path, {
    method: "POST",
    body: JSON.stringify(Object.fromEntries(formData.entries())),
  });
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    setActiveView(item.dataset.view);
  });
});

document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-auth-tab], .auth-form").forEach((node) => node.classList.remove("selected", "active"));
    tab.classList.add("selected");
    document.querySelector(`#${tab.dataset.authTab}Form`).classList.add("active");
  });
});

document.querySelector("#openAuthButton")?.addEventListener("click", () => {
  openAuthView();
});

document.querySelector("#backFromAuthButton")?.addEventListener("click", closeAuthView);

document.querySelectorAll('input[type="tel"][name="phone"]').forEach((input) => {
  input.addEventListener("input", () => {
    input.value = formatPhoneInput(input.value);
  });
});

document.querySelectorAll('input[name="birthDate"]').forEach((input) => {
  input.addEventListener("input", () => {
    input.value = formatBirthDateInput(input.value);
  });
});

document.querySelector("#gameSearchInput")?.addEventListener("input", (event) => {
  gameSearchQuery = event.currentTarget.value;
  renderGames(activeGameId, { detail: false });
});

document.querySelector("#gameCategoryFilter")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-game-category]");
  if (!button) return;

  activeGameCategoryFilter = button.dataset.gameCategory;
  renderGames(null, { detail: false });
});

document.querySelector("#dateSelect")?.addEventListener("change", () => {
  isPaymentConfirmOpen = false;
  renderAuth();
  renderPaymentGuide();
  renderIcons();
});

document.addEventListener("click", (event) => {
  const areaButton = event.target.closest("[data-apply-area]");
  if (!areaButton) return;

  activeApplyArea = areaButton.dataset.applyArea;
  activeApplyDate = "";
  activeApplyTimeMatchId = "";
  activeApplyMonthKey = "";
  isPaymentConfirmOpen = false;
  renderMatches();
  renderAuth();
  renderPaymentGuide();
  renderIcons();
});

document.addEventListener("click", (event) => {
  const dateButton = event.target.closest("[data-apply-date]");
  if (!dateButton) return;

  activeApplyDate = dateButton.dataset.applyDate;
  activeApplyTimeMatchId = "";
  isPaymentConfirmOpen = false;
  renderMatches();
  renderAuth();
  renderPaymentGuide();
  renderIcons();
});

document.addEventListener("click", (event) => {
  const monthButton = event.target.closest("[data-apply-month]");
  if (!monthButton || monthButton.disabled || !monthButton.dataset.applyMonth) return;

  activeApplyMonthKey = monthButton.dataset.applyMonth;
  activeApplyDate = "";
  activeApplyTimeMatchId = "";
  isPaymentConfirmOpen = false;
  renderMatches();
  renderAuth();
  renderPaymentGuide();
  renderIcons();
});

document.addEventListener("click", (event) => {
  const timeButton = event.target.closest("[data-apply-time]");
  if (!timeButton || timeButton.disabled) return;

  activeApplyTimeMatchId = timeButton.dataset.applyTime;
  isPaymentConfirmOpen = false;
  renderMatches();
  renderAuth();
  renderPaymentGuide();
  renderIcons();
});

document.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-area-filter]");
  if (!filterButton) return;

  activeAreaFilter = filterButton.dataset.areaFilter;
  renderAreaFilters();
  renderMatches();
});

document.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-ops-filter]");
  if (!filterButton) return;

  activeOpsFilter = filterButton.dataset.opsFilter;
  activeOpsMatchId = null;
  renderAdmin();
});

document.addEventListener("click", (event) => {
  const jumpButton = event.target.closest("[data-ops-jump]");
  if (!jumpButton) return;

  activeOpsFilter = jumpButton.dataset.opsJump;
  opsSearchQuery = "";
  opsDateFrom = "";
  opsDateTo = "";
  activeOpsMatchId = null;
  renderAdmin();
  document.querySelector("#opsList")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "opsSearchInput") return;

  const cursorPosition = event.target.selectionStart;
  opsSearchQuery = event.target.value;
  activeOpsMatchId = null;
  renderOpsList();
  const input = document.querySelector("#opsSearchInput");
  input?.focus();
  input?.setSelectionRange(cursorPosition, cursorPosition);
});

document.addEventListener("change", (event) => {
  if (event.target.id === "opsSortSelect") {
    opsSortMode = event.target.value;
    activeOpsMatchId = null;
    renderOpsList();
    return;
  }

  if (event.target.id === "opsDateFrom") {
    opsDateFrom = event.target.value;
    activeOpsMatchId = null;
    renderOpsList();
    return;
  }

  if (event.target.id === "opsDateTo") {
    opsDateTo = event.target.value;
    activeOpsMatchId = null;
    renderOpsList();
  }
});

document.addEventListener("click", (event) => {
  const resetButton = event.target.closest("#opsFilterReset");
  if (!resetButton) return;

  opsSearchQuery = "";
  opsSortMode = "dateAsc";
  opsDateFrom = "";
  opsDateTo = "";
  activeOpsFilter = "all";
  activeOpsMatchId = null;
  renderAdmin();
});

document.querySelector("#signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = form.elements.password.value;
  const passwordConfirm = form.elements.passwordConfirm.value;

  if (password !== passwordConfirm) {
    showToast("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    return;
  }

  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    showToast("비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.");
    return;
  }

  try {
    appState = await submitForm("/api/signup", form);
    saveSession();
    isPaymentConfirmOpen = false;
    renderAll();
    closeAuthView();
    showToast("회원가입이 완료되었습니다. 이제 날짜만 선택해서 신청할 수 있습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    appState = await submitForm("/api/login", event.currentTarget);
    saveSession();
    isPaymentConfirmOpen = false;
    renderAll();
    closeAuthView();
    showToast("로그인되었습니다. 참가 신청을 진행할 수 있습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#applyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  if (!appState.isAuthenticated) {
    authReturnView = "apply";
    openAuthView();
    showToast("로그인 후 참가 신청할 수 있습니다.");
    return;
  }

  if (!form.elements.matchId.value) {
    showToast("참가할 날짜를 선택해 주세요.");
    return;
  }

  if (!isPaymentConfirmOpen) {
    isPaymentConfirmOpen = true;
    renderAuth();
    renderPaymentGuide();
    renderIcons();
    showToast("입금 계좌와 환불 기준을 확인한 뒤 신청 완료를 눌러주세요.");
    return;
  }

  if (!form.elements.refundConsent.checked) {
    showToast("입금 안내와 환불 기준을 확인해 주세요.");
    return;
  }

  try {
    appState = await submitForm("/api/apply", form);
    isPaymentConfirmOpen = false;
    renderAll();
    showToast("신청이 접수되었습니다. 2명이 채워진 날짜는 확정 문자 발송 로그에 기록됩니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#createMatchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    appState = await submitForm("/api/create-match", form);
    form.reset();
    renderAll();
    showToast("웹 신청용 새 매치를 열었습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#adminLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  if (!appState.isAuthenticated) {
    showToast("먼저 참가 신청 화면에서 회원 로그인해 주세요.");
    return;
  }

  try {
    appState = await submitForm("/api/admin-login", form);
    saveSession();
    form.reset();
    renderAll();
    showToast("운영자 권한으로 로그인했습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener("click", async (event) => {
  const shareButton = event.target.closest("#copyShareLink");
  if (shareButton) {
    const copied = await copyText("https://www.1x1match.com");
    showToast(copied ? "홍보 링크를 복사했습니다." : "링크 복사에 실패했습니다.");
    return;
  }

  const copyMemberContactsButton = event.target.closest("#copyMemberContactsButton");
  if (copyMemberContactsButton) {
    const text = buildMemberContactText();
    const copied = text ? await copyText(text) : false;
    showToast(copied ? "회원 연락처 명단을 복사했습니다." : "복사할 회원 명단이 없습니다.");
    return;
  }

  const memberDetailButton = event.target.closest("[data-member-detail]");
  if (memberDetailButton) {
    activeMemberId = memberDetailButton.dataset.memberDetail;
    renderMemberRoster();
    return;
  }

  const closeMemberDetailButton = event.target.closest("[data-close-member-detail]");
  if (closeMemberDetailButton) {
    activeMemberId = null;
    renderMemberRoster();
    return;
  }

  const logoutButton = event.target.closest("#logoutButton");
  if (logoutButton) {
    appState = await request("/api/logout", { method: "POST", body: "{}" });
    clearSession();
    isPaymentConfirmOpen = false;
    renderAll();
    showToast("로그아웃되었습니다.");
  }

  const adminLogoutButton = event.target.closest("#adminLogoutButton");
  if (adminLogoutButton) {
    appState = await request("/api/admin-logout", { method: "POST", body: "{}" });
    saveSession();
    renderAll();
    showToast("운영자 권한에서 로그아웃했습니다.");
  }

  const showMoreEventsButton = event.target.closest("[data-show-more-events]");
  if (showMoreEventsButton) {
    visibleEventCount += 8;
    renderAdmin();
  }

  const toggleOpsMatchButton = event.target.closest("[data-toggle-ops-match]");
  if (toggleOpsMatchButton) {
    const matchId = toggleOpsMatchButton.dataset.toggleOpsMatch;
    activeOpsMatchId = activeOpsMatchId === matchId ? null : matchId;
    renderAdmin();
    return;
  }

  const gameButton = event.target.closest("[data-game]");
  if (gameButton) {
    renderGames(gameButton.dataset.game, { detail: true });
  }

  const gameListButton = event.target.closest("[data-game-list]");
  if (gameListButton) {
    renderGames(activeGameId, { detail: false });
  }

  const openGame = event.target.closest("[data-open-game]");
  if (openGame) {
    document.querySelector('[data-view="games"]').click();
    renderGames(openGame.dataset.openGame, { detail: true });
  }

  const copyGameRulesButton = event.target.closest("[data-copy-game-rules]");
  if (copyGameRulesButton) {
    const rules = buildGameRuleText(copyGameRulesButton.dataset.copyGameRules);
    const copied = await copyText(rules);
    showToast(copied ? "게임 규칙을 복사했습니다." : "규칙 복사에 실패했습니다.");
  }

  const saveAdminNoteButton = event.target.closest("[data-save-admin-note]");
  if (saveAdminNoteButton) {
    const matchId = saveAdminNoteButton.dataset.saveAdminNote;
    const adminNote = document.querySelector(`[data-admin-note-input="${matchId}"]`)?.value || "";
    appState = await request("/api/update-match-note", {
      method: "POST",
      body: JSON.stringify({ matchId, adminNote }),
    });
    renderAll();
    showToast("운영자 메모를 저장했습니다.");
  }

  const cancelApplicationButton = event.target.closest("[data-cancel-application]");
  if (cancelApplicationButton) {
    const matchId = cancelApplicationButton.dataset.cancelApplication;
    appState = await request("/api/cancel-application", {
      method: "POST",
      body: JSON.stringify({ matchId }),
    });
    renderAll();
    showToast("신청을 취소했습니다. 시범운영 참가비 1,000원은 환불 예정으로 처리됩니다.");
  }

  const completePaymentButton = event.target.closest("[data-complete-payment]");
  if (completePaymentButton) {
    if (!window.confirm("이 참가자의 입금을 확인 처리할까요?")) return;

    appState = await request("/api/complete-payment", {
      method: "POST",
      body: JSON.stringify({
        matchId: completePaymentButton.dataset.completePayment,
        memberId: completePaymentButton.dataset.memberId,
      }),
    });
    renderAll();
    showToast("입금 확인을 완료했습니다.");
  }

  const undoPaymentButton = event.target.closest("[data-undo-payment]");
  if (undoPaymentButton) {
    if (!window.confirm("입금 확인을 취소하고 입금 대기 상태로 되돌릴까요?")) return;

    appState = await request("/api/undo-payment", {
      method: "POST",
      body: JSON.stringify({
        matchId: undoPaymentButton.dataset.undoPayment,
        memberId: undoPaymentButton.dataset.memberId,
      }),
    });
    renderAll();
    showToast("입금 확인을 취소했습니다.");
  }

  const revealButton = event.target.closest("[data-reveal]");
  if (revealButton) {
    if (!window.confirm("선택한 게임을 참가자 공지에 공개할까요?")) return;

    const matchId = revealButton.dataset.reveal;
    const gameId = document.querySelector(`[data-game-select="${matchId}"]`).value;
    appState = await request("/api/reveal-game", {
      method: "POST",
      body: JSON.stringify({ matchId, gameId }),
    });
    renderAll();
    showToast("게임과 규칙이 공지 화면에 공개되었습니다.");
  }

  const hideGameButton = event.target.closest("[data-hide-game]");
  if (hideGameButton) {
    if (!window.confirm("이미 공개한 게임을 다시 비공개 상태로 되돌릴까요?")) return;

    appState = await request("/api/hide-game", {
      method: "POST",
      body: JSON.stringify({ matchId: hideGameButton.dataset.hideGame }),
    });
    renderAll();
    showToast("게임 공개를 취소했습니다.");
  }

  const recommendGameButton = event.target.closest("[data-recommend-game]");
  if (recommendGameButton) {
    appState = await request("/api/recommend-game", {
      method: "POST",
      body: JSON.stringify({ matchId: recommendGameButton.dataset.recommendGame }),
    });
    renderAll();
    showToast("랜덤 추천 게임을 골랐습니다. 확인 후 게임 공개를 눌러주세요.");
  }

  const resultButton = event.target.closest("[data-result]");
  if (resultButton) {
    if (!window.confirm("선택한 참가자를 승자로 저장하고 랭킹에 반영할까요?")) return;

    const matchId = resultButton.dataset.result;
    const winnerId = document.querySelector(`[data-winner-select="${matchId}"]`).value;
    appState = await request("/api/record-result", {
      method: "POST",
      body: JSON.stringify({ matchId, winnerId }),
    });
    renderAll();
    showToast("경기 결과를 저장했고 랭킹을 갱신했습니다.");
  }

  const clearResultButton = event.target.closest("[data-clear-result]");
  if (clearResultButton) {
    if (!window.confirm("입력된 결과를 취소하고 랭킹 반영도 되돌릴까요?")) return;

    appState = await request("/api/clear-result", {
      method: "POST",
      body: JSON.stringify({ matchId: clearResultButton.dataset.clearResult }),
    });
    renderAll();
    showToast("경기 결과 입력을 취소했습니다.");
  }

  const copyMessageButton = event.target.closest("[data-copy-message]");
  if (copyMessageButton) {
    const message = copyMessageButton.closest(".message-preview")?.querySelector("p")?.textContent || "";
    const copied = await copyText(message);
    showToast(copied ? "문자 문구를 복사했습니다." : "문구 복사에 실패했습니다. 문구를 직접 선택해 주세요.");
  }

  const copyContactsButton = event.target.closest("[data-copy-contacts]");
  if (copyContactsButton) {
    const contacts = buildParticipantContacts(copyContactsButton.dataset.copyContacts);
    const copied = await copyText(contacts);
    showToast(copied ? "참가자 연락처를 복사했습니다." : "연락처 복사에 실패했습니다.");
  }

  const copyPromoButton = event.target.closest("[data-copy-promo]");
  if (copyPromoButton) {
    const promo = buildPromoText(copyPromoButton.dataset.copyPromo);
    const copied = await copyText(promo);
    showToast(copied ? "홍보 문구를 복사했습니다." : "홍보 문구 복사에 실패했습니다.");
  }

  const messageSentButton = event.target.closest("[data-message-sent]");
  if (messageSentButton) {
    appState = await request("/api/mark-message-sent", {
      method: "POST",
      body: JSON.stringify({
        matchId: messageSentButton.dataset.messageSent,
        messageKey: messageSentButton.dataset.messageKey,
      }),
    });
    renderAll();
    showToast("알림 발송 완료로 체크했습니다.");
  }

  const messageUnsentButton = event.target.closest("[data-message-unsent]");
  if (messageUnsentButton) {
    appState = await request("/api/unmark-message-sent", {
      method: "POST",
      body: JSON.stringify({
        matchId: messageUnsentButton.dataset.messageUnsent,
        messageKey: messageUnsentButton.dataset.messageKey,
      }),
    });
    renderAll();
    showToast("발송 완료 체크를 취소했습니다.");
  }

  const refundButton = event.target.closest("[data-refund]");
  if (refundButton) {
    if (!window.confirm("환불 처리 상태로 변경할까요? 실제 송금 여부는 별도로 확인해 주세요.")) return;

    const matchId = refundButton.dataset.refund;
    appState = await request("/api/refund", {
      method: "POST",
      body: JSON.stringify({ matchId }),
    });
    renderAll();
    showToast("미매칭 신청자의 시범운영 참가비 1,000원 환불이 예약되었습니다.");
  }

  const undoRefundButton = event.target.closest("[data-undo-refund]");
  if (undoRefundButton) {
    if (!window.confirm("환불 완료 상태를 입금 확인 완료 상태로 되돌릴까요?")) return;

    appState = await request("/api/undo-refund", {
      method: "POST",
      body: JSON.stringify({ matchId: undoRefundButton.dataset.undoRefund }),
    });
    renderAll();
    showToast("환불 상태를 되돌렸습니다.");
  }
});

loadState().catch((error) => showToast(error.message));
