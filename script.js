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
let activeRankingSort = "rate";
let isGameDetailOpen = false;
let adminGameSearchQuery = "";
let adminGameCategoryFilter = "all";
let activeAdminGameId = null;
let activeAreaFilter = "all";
let activeNoticeAreaFilter = "all";
let activeOpsFilter = "all";
let activeOpsMatchId = null;
let activeAdminSection = "dashboard";
let activeMemberId = null;
let activeMemberDetailSection = "summary";
let memberSearchQuery = "";
let activeAdminGameSection = "library";
let visibleEventCount = 8;
let activeEventLogFilter = "all";
let eventLogSearchQuery = "";
const expandedAdminMessageKeys = new Set();
let adminReturnState = null;
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

const defaultSiteSettings = {
  participationFee: 1000,
  regularFee: 5000,
  feeNotice: "6월 시범운영 1,000원",
  bankAccountLabel: "카카오뱅크 3333-21-1861396",
  accountHolder: "구원근",
  depositNameGuide: "회원가입 닉네임과 동일",
  drinkFeeNotice: "카페 음료 비용 별도",
  refundPolicy: "시작 24시간 전까지 2명 미달 시 참가비 환불",
  exactVenueNotice: "정확한 장소는 2명 확정 후 게임 시작 24시간 전에 게임과 함께 공지됩니다.",
};

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
  "office-territory": ["영역", "전략", "이동"],
  "gold-silver-bronze": ["베팅", "무게", "심리"],
  "arithmetic-lotto": ["계산", "숫자", "순발력"],
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
  "office-territory": "lifes",
  "gold-silver-bronze": "timehotel",
  "arithmetic-lotto": "timehotel",
};

const gameCategoryOptions = [
  { value: "all", label: "전체" },
  { value: "genius", label: "더 지니어스" },
  { value: "devils", label: "데블스 플랜" },
  { value: "blood", label: "피의 게임" },
  { value: "death", label: "데스 게임" },
  { value: "lifes", label: "Life's Game" },
  { value: "timehotel", label: "더 타임 호텔" },
];

const migrationSqlMap = {
  "game-admin": `alter table games
  add column if not exists category text not null default 'uncategorized',
  add column if not exists is_hidden boolean not null default false;`,
  "auto-closed": `alter table applications
  add column if not exists auto_closed boolean not null default false;`,
};

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

function isValidPhoneInput(value) {
  return /^010-\d{4}-\d{4}$/.test(formatPhoneInput(value));
}

function isValidBirthDateInput(value) {
  const formatted = formatBirthDateInput(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(formatted);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  const currentYear = new Date().getFullYear();

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day) &&
    Number(year) >= 1900 &&
    Number(year) <= currentYear
  );
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

function formatRevealSchedule(match) {
  if (!match?.gameRevealAt) return "게임은 시작 24시간 전에 자동 공개됩니다.";
  const date = new Date(match.gameRevealAt);
  if (Number.isNaN(date.getTime())) return "게임은 시작 24시간 전에 자동 공개됩니다.";

  return `${new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)} 자동 공개 예정`;
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
  const saved = localStorage.getItem("oneVsOneSession");
  if (saved) {
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
      appState = await request("/api/state");
    }
  } else {
    appState = await request("/api/state");
  }
  renderAll();
}

function renderAll() {
  renderNavigation();
  renderUser();
  renderAuth();
  renderMyPage();
  renderPaymentGuide();
  renderAreaFilters();
  renderMyApplications();
  renderMatches();
  renderNotices();
  renderPolicy();
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

function openGameAdminEditor(gameId = null, section = "library") {
  if (!appState.isAdmin) {
    showToast("운영자 권한 확인 후 수정할 수 있습니다.");
    setActiveView("admin");
    return;
  }

  activeAdminSection = "games";
  activeAdminGameSection = section;
  activeAdminGameId = gameId || null;
  setActiveView("admin");
  renderAdmin();

  window.setTimeout(() => {
    document.querySelector("#adminGameManager")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
}

function openAdminSiteSettings() {
  if (!appState.isAdmin) {
    showToast("운영자 권한 확인 후 수정할 수 있습니다.");
    setActiveView("admin");
    return;
  }

  activeAdminSection = "settings";
  setActiveView("admin");
  renderAdmin();

  window.setTimeout(() => {
    document.querySelector("#adminSiteSettings")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
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

function siteSettings() {
  return { ...defaultSiteSettings, ...(appState?.siteSettings || {}) };
}

function won(amount) {
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
}

function participationFeeText() {
  const settings = siteSettings();
  return settings.feeNotice || won(settings.participationFee);
}

function regularFeeText() {
  return won(siteSettings().regularFee);
}

function renderPaymentGuide() {
  const guide = document.querySelector("#bankGuide");
  if (!guide) return;
  renderApplyAdminToolbar();
  renderRefundConsentText();
  const account = paymentAccountText();
  const settings = siteSettings();
  const match = selectedApplyMatch();
  const matchLine = match ? `${match.date} ${match.time} · ${displayMatchLocation(match)}` : "선택한 매치";
  const playerLine = match ? `현재 ${match.playerCount}/2명 신청` : "선택 후 확인 가능";

  guide.innerHTML = `
    <div class="final-check-head">
      <span>신청 전 최종 확인</span>
      <strong>${matchLine}</strong>
      <small>${playerLine}</small>
    </div>
    <div class="final-check-grid">
      <span><strong>참가비</strong>${participationFeeText()}</span>
      <span><strong>계좌</strong>${account}</span>
      <span><strong>입금자명</strong>${settings.depositNameGuide}</span>
      <span><strong>음료비</strong>${settings.drinkFeeNotice}</span>
      <span><strong>환불</strong>${settings.refundPolicy}</span>
      <span><strong>정확한 장소</strong>${exactVenueNotice()}</span>
    </div>
  `;
}

function paymentAccountText() {
  const settings = siteSettings();
  const account = settings.bankAccountLabel || appState.payment?.bankAccountLabel || defaultSiteSettings.bankAccountLabel;
  return account.includes(settings.accountHolder) ? account : `${account} / 예금주: ${settings.accountHolder}`;
}

function renderRefundConsentText() {
  const consentText = document.querySelector('input[name="refundConsent"]')?.nextElementSibling;
  if (!consentText) return;

  const settings = siteSettings();
  consentText.textContent = `참가비 ${participationFeeText()}, ${settings.drinkFeeNotice}, ${settings.refundPolicy} 기준을 확인했습니다.`;
}

function renderApplyAdminToolbar() {
  const form = document.querySelector("#applyForm");
  if (!form) return;

  const existing = form.querySelector(".apply-page-admin-toolbar");
  if (!appState?.isAdmin) {
    existing?.remove();
    return;
  }

  const html = `
    <div class="apply-page-admin-toolbar">
      <div>
        <strong>참가 신청 안내 편집</strong>
        <span>참가비, 계좌, 환불 기준, 장소 안내 문구를 수정합니다.</span>
      </div>
      <button class="secondary-button" type="button" data-open-admin-site-settings>신청 안내 수정</button>
    </div>
  `;

  if (existing) {
    existing.outerHTML = html;
    return;
  }

  form.querySelector(":scope > div:first-child")?.insertAdjacentHTML("afterend", html);
}

function selectedApplyMatch() {
  const matchId = document.querySelector("#dateSelect")?.value;
  return appState.matches.find((match) => match.id === matchId) || null;
}

function getMatchArea(match) {
  return match.location.split(" ")[0];
}

function publicMatchLocation(match) {
  const area = getMatchArea(match);
  return area ? `${area} 일대 카페` : "신촌/강남 일대 카페";
}

function exactMatchVenue(match) {
  return match?.exactVenue?.trim() || "";
}

function displayMatchLocation(match) {
  return match?.gameRevealed && exactMatchVenue(match) ? exactMatchVenue(match) : publicMatchLocation(match);
}

function exactVenueNotice() {
  return siteSettings().exactVenueNotice;
}

function gameRevealVenueNotice(match) {
  const venue = exactMatchVenue(match);
  return venue ? `정확한 장소는 ${venue}입니다.` : "정확한 장소도 함께 공지됩니다.";
}

function visibleMatches() {
  const matches = appState.matches.filter((match) => !match.closedForApplications);

  if (activeAreaFilter === "all") {
    return matches;
  }

  if (activeAreaFilter === "mine") {
    if (!appState.isAuthenticated || !appState.user?.area) return matches;
    return matches.filter((match) => getMatchArea(match) === appState.user.area);
  }

  return matches.filter((match) => getMatchArea(match) === activeAreaFilter);
}

function matchSortValue(match) {
  const matchDate = parseMatchDate(match);
  const dateValue = matchDate ? matchDate.getTime() : Number.MAX_SAFE_INTEGER;
  return `${String(dateValue).padStart(16, "0")} ${match.time || ""} ${match.location || ""}`;
}

function matchCapacityLabel(match) {
  return match.playerCount >= 2 ? "마감" : `${match.playerCount}/2`;
}

function matchSeatLabel(match) {
  if (!match) return "선택 전";
  if (match.playerCount >= 2) return "마감";
  return `${2 - match.playerCount}자리 남음`;
}

function noticeAreaMatches(match, filter) {
  return filter === "all" || getMatchArea(match) === filter;
}

function groupMatchesByDate(matches) {
  return matches.reduce((groups, match) => {
    const key = dateKeyFromMatch(match) || match.date;
    const group = groups.find((item) => item.key === key);

    if (group) {
      group.matches.push(match);
    } else {
      groups.push({ key, label: match.date, matches: [match] });
    }

    return groups;
  }, []);
}

function selectableApplyMatches() {
  return appState.matches
    .filter((match) => !match.closedForApplications)
    .sort((a, b) => matchSortValue(a).localeCompare(matchSortValue(b), "ko-KR"));
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
  const monthTabs = monthKeys
    .map((monthKey) => {
      const monthItems = datedMatches.filter((item) => item.monthKey === monthKey);
      const availableCount = monthItems.filter((item) => item.match.playerCount < 2 && !item.match.appliedByMe).length;
      const monthDate = monthItems[0]?.date;
      return `
        <button class="${monthKey === activeMonthKey ? "selected" : ""}" type="button" data-apply-month-tab="${monthKey}">
          <span>${monthDate ? monthLabel(monthDate) : monthKey}</span>
          <small>${availableCount}개 가능</small>
        </button>
      `;
    })
    .join("");
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
      <div class="apply-month-tabs">${monthTabs}</div>
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
  const canApplySelectedMatch = selectedMatch && selectedMatch.playerCount < 2 && !selectedMatch.appliedByMe;
  hiddenInput.value = selectedMatch && selectedMatch.playerCount < 2 && !selectedMatch.appliedByMe ? selectedMatch.id : "";

  selector.innerHTML = `
    <div class="apply-step">
      <strong>지역</strong>
      <div class="apply-option-grid apply-option-grid--area">
        ${areas
          .map(
            (area) => {
              const matchesInArea = matches.filter((match) => getMatchArea(match) === area);
              const availableInArea = matchesInArea.filter((match) => match.playerCount < 2 && !match.appliedByMe).length;
              return `
              <button class="${area === activeApplyArea ? "selected" : ""}" type="button" data-apply-area="${area}">
                <span>${area}</span>
                <small>${availableInArea}/${matchesInArea.length} 가능</small>
              </button>
            `;
            },
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
                <em>${displayMatchLocation(match)}</em>
                <i>정확한 장소는 24시간 전 공개</i>
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
    <div class="apply-selection-summary ${canApplySelectedMatch ? "ready" : "blocked"}">
      <div>
        <span>선택한 매치</span>
        <strong>${selectedMatch ? `${selectedMatch.date} ${selectedMatch.time}` : "날짜와 시간을 선택해 주세요"}</strong>
        <small>${selectedMatch ? displayMatchLocation(selectedMatch) : "지역, 날짜, 시간 순서로 선택합니다."}</small>
        <small class="apply-venue-note">${selectedMatch ? exactVenueNotice() : "정확한 장소는 확정 후 게임과 함께 공지됩니다."}</small>
      </div>
      <div>
        <span>잔여석</span>
        <strong>${matchSeatLabel(selectedMatch)}</strong>
        <small>${canApplySelectedMatch ? "신청 전 참가비 안내를 확인합니다." : "마감 또는 이미 신청한 매치입니다."}</small>
      </div>
    </div>
  `;
}

function scrollApplyStepIntoView(stepIndex) {
  if (!window.matchMedia?.("(max-width: 760px)").matches) return;

  const scrollStep = () => {
    const steps = document.querySelectorAll("#applyStepSelector .apply-step, #applyStepSelector .apply-selection-summary");
    steps[stepIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  requestAnimationFrame(scrollStep);
  window.setTimeout(scrollStep, 120);
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
    userChip.removeAttribute("role");
    userChip.removeAttribute("tabindex");
    return;
  }

  const user = appState.user;
  if (authButton) authButton.hidden = true;
  userChip.hidden = false;
  userChip.setAttribute("role", "button");
  userChip.setAttribute("tabindex", "0");
  userChip.setAttribute("title", "마이페이지");
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
  const applyButton = document.querySelector("#applyForm button[type='submit']");
  const dateSelect = document.querySelector("#dateSelect");
  const finalPaymentCheck = document.querySelector("#finalPaymentCheck");
  const refundConsent = document.querySelector('input[name="refundConsent"]');

  if (!appState.isAuthenticated) {
    guestAuth.hidden = false;
    applyButton.disabled = false;
    applyButton.innerHTML = `<span data-icon="card"></span> 로그인하고 신청`;
    dateSelect.disabled = false;
    finalPaymentCheck.hidden = true;
    refundConsent.disabled = true;
    refundConsent.checked = false;
    isPaymentConfirmOpen = false;
    return;
  }

  guestAuth.hidden = true;
  applyButton.disabled = false;
  applyButton.innerHTML = isPaymentConfirmOpen
    ? `<span data-icon="card"></span> 신청 완료`
    : `<span data-icon="card"></span> 신청 전 확인`;
  dateSelect.disabled = false;
  finalPaymentCheck.hidden = !isPaymentConfirmOpen;
  refundConsent.disabled = !isPaymentConfirmOpen;
  if (!isPaymentConfirmOpen) refundConsent.checked = false;
}

function renderMyPage() {
  const panel = document.querySelector("#mypageContent");
  if (!panel) return;

  if (!appState.isAuthenticated) {
    panel.innerHTML = `
      <section class="mypage-card">
        <span class="status-pill pending">로그인 필요</span>
        <h3>회원 정보는 로그인 후 확인할 수 있습니다.</h3>
        <p>상단의 로그인 버튼을 눌러 먼저 회원 인증을 진행해 주세요.</p>
        <button class="primary-button" type="button" data-open-auth-from-mypage>로그인하기</button>
      </section>
    `;
    return;
  }

  const user = appState.user;
  const mine = appState.matches.filter((match) => match.hasMyApplication);
  const applicationMatches = mine
    .slice()
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  panel.innerHTML = `
    <div class="mypage-grid">
      <section class="mypage-card">
        <div class="mypage-card-head">
          <div>
            <span class="status-pill confirmed">내 정보</span>
            <h3>${escapeHtml(user.nickname)}</h3>
            <p>${user.wins}승 ${user.losses}패 · 주 활동지 ${escapeHtml(user.area)}</p>
          </div>
          <button class="secondary-button" type="button" data-logout-button>로그아웃</button>
        </div>
        <form class="profile-edit-form" id="profileEditForm">
          <label>
            닉네임
            <input type="text" name="nickname" value="${escapeHtml(user.nickname)}" required />
          </label>
          <label>
            이름
            <input type="text" name="realName" value="${escapeHtml(user.realName || "")}" required />
          </label>
          <label>
            생년월일
            <input type="text" name="birthDate" value="${escapeHtml(user.birthDate || "")}" inputmode="numeric" maxlength="10" required />
          </label>
          <label>
            전화번호
            <input type="tel" name="phone" value="${escapeHtml(user.phone)}" inputmode="numeric" maxlength="13" required />
          </label>
          <label>
            주 활동지
            <input type="text" name="area" value="${escapeHtml(user.area)}" required />
          </label>
          <div class="profile-edit-actions">
            <button class="primary-button" type="submit">정보 저장</button>
          </div>
        </form>
      </section>

      <section class="mypage-card">
        <span class="status-pill pending">비밀번호</span>
        <h3>비밀번호 변경</h3>
        <p>현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.</p>
        <form class="profile-edit-form" id="passwordChangeForm">
          <label>
            현재 비밀번호
            <input type="password" name="currentPassword" placeholder="현재 비밀번호" autocomplete="current-password" required />
          </label>
          <label>
            새 비밀번호
            <input type="password" name="newPassword" placeholder="영문, 숫자, 특수문자 포함 8자 이상" autocomplete="new-password" required />
          </label>
          <label>
            새 비밀번호 확인
            <input type="password" name="newPasswordConfirm" placeholder="새 비밀번호를 한 번 더 입력" autocomplete="new-password" required />
          </label>
          <div class="profile-edit-actions">
            <button class="primary-button" type="submit">비밀번호 변경</button>
          </div>
        </form>
      </section>

      <section class="mypage-card">
        <span class="status-pill revealed">내 신청 이력</span>
        <h3>${mine.length}개 매치 신청</h3>
        ${
          applicationMatches.length
            ? `
              <div class="mypage-history mypage-history--detailed">
                ${applicationMatches
                  .map((match) => renderMyPageApplication(match, user))
                  .join("")}
              </div>
            `
            : `<p>아직 신청한 매치가 없습니다.</p>`
        }
      </section>
    </div>
  `;
}

function renderMyPageApplication(match, user) {
  const application =
    match.myApplication || match.allPlayers?.find((player) => player.memberId === user.id) || {
      paymentStatus: "payment_pending",
      cancelled: false,
    };
  const paymentLabel = applicationPaymentLabel(application);
  const nextStep = myApplicationNextStep(match, application);
  const confirmLabel = application.cancelled ? "취소됨" : match.confirmed ? "확정" : `${match.players.length}/${match.capacity}명 모집 중`;
  const gameLabel = match.confirmed
    ? match.gameRevealed && match.game
      ? match.game.title
      : formatRevealSchedule(match)
    : "매치 확정 후 공개";
  const resultLabel = match.result
    ? match.result.winnerId === user.id
      ? "승리"
      : match.result.loserId === user.id
        ? "패배"
        : "결과 입력됨"
    : match.confirmed
      ? "결과 대기"
      : "-";
  const paymentClass = application.cancelled
    ? "cancelled"
    : application.paymentStatus === "paid"
      ? "confirmed"
      : ["cancel_requested_pending", "cancel_requested_paid", "refund_requested", "refund_scheduled", "refunded"].includes(
            application.paymentStatus,
          )
        ? "refunding"
        : "pending";
  const gameCategory = match.game ? getGameCategory(match.game) : "";

  return `
    <article class="mypage-application-card">
      <div class="mypage-application-main">
        <div>
          <strong>${formatDateLabel(match.date)} ${match.time}</strong>
          <span>${escapeHtml(match.area)} · ${escapeHtml(match.venue)}</span>
        </div>
        <span class="status-pill ${paymentClass}">${paymentLabel}</span>
      </div>
      <div class="mypage-application-status">
        <span><strong>확정</strong>${confirmLabel}</span>
        <span><strong>게임</strong><em class="${gameCategory ? `notice-game-pill notice-game-pill--${gameCategory}` : ""}">${escapeHtml(gameLabel)}</em></span>
        <span><strong>결과</strong>${resultLabel}</span>
        <span><strong>인원</strong>${match.players.length}/${match.capacity}명</span>
      </div>
      <div class="mypage-next-step">${escapeHtml(nextStep)}</div>
    </article>
  `;
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
          const paymentLabel = applicationPaymentLabel(myApplication);
          const nextStep = myApplicationNextStep(match, myApplication);
          const applicationStatusLabel = myApplication?.cancelled ? "취소됨" : match.statusLabel;
          const gameLabel = match.gameRevealed && match.game ? match.game.title : "게임 공개 대기";
          const canCancel =
            !myApplication?.cancelled &&
            !["cancel_requested_pending", "cancel_requested_paid", "refund_requested", "refund_scheduled", "refunded"].includes(myPayment);

          return `
            <article class="my-application-item">
              <div>
                <strong>${match.date} ${match.time}</strong>
                <span>${displayMatchLocation(match)}</span>
                <span>${applicationStatusLabel} · ${paymentLabel} · ${gameLabel}</span>
                <span class="my-application-next-step">${escapeHtml(nextStep)}</span>
                ${
                  myPayment === "payment_pending"
                    ? `<span>입금 계좌: ${paymentAccountText()}</span>`
                    : ""
                }
              </div>
              ${
                canCancel
                  ? `<button class="secondary-button" type="button" data-cancel-application="${match.id}">취소 요청</button>`
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
    cancel_requested_pending: "취소 승인 대기",
    cancel_requested_paid: "취소 승인 대기",
    refund_requested: "환불 요청",
    refund_scheduled: "환불 예정",
    refunded: "환불 완료",
  };

  return labels[status] || "입금 확인 완료";
}

function applicationPaymentLabel(application) {
  if (!application) return paymentStatusLabel();
  if (application.cancelled && ["refund_requested", "refund_scheduled", "refunded"].includes(application.paymentStatus)) {
    return paymentStatusLabel(application.paymentStatus);
  }
  return application.cancelled ? "신청 취소됨" : paymentStatusLabel(application.paymentStatus);
}

function myApplicationNextStep(match, application) {
  if (!application) return "신청 정보를 불러오는 중입니다.";
  if (application.paymentStatus === "payment_pending" && !application.cancelled) return `${paymentAccountText()}로 입금 후 운영자 확인을 기다려 주세요.`;
  if (application.paymentStatus === "paid" && !match.confirmed) return "입금 확인 완료. 상대 1명이 더 신청하면 매치가 확정됩니다.";
  if (["cancel_requested_pending", "cancel_requested_paid"].includes(application.paymentStatus)) return "취소 요청이 접수되었습니다. 운영자 승인 후 상태가 바뀝니다.";
  if (application.paymentStatus === "refund_requested") return "환불 요청 상태입니다. 운영자가 송금 처리 후 완료로 바꿉니다.";
  if (application.paymentStatus === "refund_scheduled") return "환불 예정 상태입니다. 실제 송금 완료 안내를 기다려 주세요.";
  if (application.paymentStatus === "refunded") return "환불 처리가 완료되었습니다.";
  if (application.cancelled) return "신청이 취소된 상태입니다.";
  if (match.confirmed && match.gameRevealed && match.game) return "게임과 장소가 공개되었습니다. 공지 내용을 확인해 주세요.";
  if (match.confirmed) return "매치가 확정되었습니다. 게임과 정확한 장소는 시작 24시간 전 공개됩니다.";
  return "신청이 접수되었습니다. 2명이 모이면 매치가 확정됩니다.";
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
              <p>${displayMatchLocation(match)}</p>
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

function renderNoticesLegacy() {
  const confirmedMatches = appState.matches.filter((match) => match.confirmed);

  document.querySelector("#noticeBoard").innerHTML = confirmedMatches
    .map((match) => {
      const gameLabel = match.gameRevealed && match.game ? match.game.title : "게임 공개 대기";
      const gameCategory = match.gameRevealed && match.game ? getGameCategory(match.game) : "";
      const gameBody =
    match.gameRevealed && match.game
      ? `${match.game.summary} ?? ??? ?? ??? ???????.`
      : formatRevealSchedule(match);
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

function renderNoticeCard(match) {
  const gameLabel = match.gameRevealed && match.game ? match.game.title : "게임 공개 대기";
  const gameCategory = match.gameRevealed && match.game ? getGameCategory(match.game) : "";
  const gameBody =
    match.gameRevealed && match.game
      ? `${match.game.summary} 이번 매치의 상세 규칙이 공개되었습니다.`
      : "시작 24시간 전에 운영자가 게임과 규칙을 공개합니다.";
  const playerNames = match.players.map((player) => player.nickname);

  return `
    <article class="notice-main notice-card">
      <div class="notice-card-top">
        <div class="status-pill ${
          match.gameRevealed ? `revealed-pill notice-game-pill notice-game-pill--${gameCategory}` : "confirmed"
        }">${gameLabel}</div>
        <span class="notice-area">${getMatchArea(match)}</span>
      </div>
      <h3>${match.time}</h3>
      <div class="notice-meta">
        <span>${displayMatchLocation(match)}</span>
        <span>${match.playerCount}/2명</span>
      </div>
      <p>${gameBody}</p>
      <div class="player-row">
        <span>${playerNames[0] || "참가자 1"}</span>
        <strong>VS</strong>
        <span>${playerNames[1] || "참가자 2"}</span>
      </div>
      ${
        match.gameRevealed && match.game
          ? `<button class="secondary-button notice-action" data-open-game="${match.game.id}">규칙 보기</button>`
          : ""
      }
    </article>
  `;
}

function renderNotices() {
  const board = document.querySelector("#noticeBoard");
  const confirmedMatches = appState.matches
    .filter((match) => match.confirmed)
    .sort((a, b) => matchSortValue(a).localeCompare(matchSortValue(b), "ko-KR"));
  const areas = ["all", ...new Set(confirmedMatches.map(getMatchArea))];

  if (!areas.includes(activeNoticeAreaFilter)) {
    activeNoticeAreaFilter = "all";
  }

  const filteredMatches = confirmedMatches.filter((match) => noticeAreaMatches(match, activeNoticeAreaFilter));
  const groups = groupMatchesByDate(filteredMatches);
  const areaButtons = areas
    .map((area) => {
      const label = area === "all" ? "전체" : area;
      return `
        <button class="${area === activeNoticeAreaFilter ? "selected" : ""}" type="button" data-notice-area-filter="${area}">
          ${label}
        </button>
      `;
    })
    .join("");

  const emptyMessage = confirmedMatches.length
    ? `
      <article class="notice-main empty-state">
        <strong>조건에 맞는 확정 공지가 없습니다</strong>
        <p>다른 지역을 선택해 주세요.</p>
      </article>
    `
    : `
      <article class="notice-main empty-state">
        <strong>확정된 매치가 없습니다</strong>
        <p>2명이 모이면 이곳에 확정 공지가 표시됩니다.</p>
      </article>
    `;
  const noticeAdminToolbar = appState.isAdmin
    ? `
      <div class="page-admin-toolbar notice-admin-toolbar">
        <div>
          <strong>확정 공지 안내 편집</strong>
          <span>정확한 장소 안내, 참가비, 환불 기준 문구는 사이트 설정에서 수정합니다.</span>
        </div>
        <button class="secondary-button" type="button" data-open-admin-site-settings>공지 안내 수정</button>
      </div>
    `
    : "";

  board.innerHTML = `
    ${noticeAdminToolbar}
    <div class="notice-toolbar">
      <div class="segmented notice-area-filter">${areaButtons}</div>
      <span class="notice-count">${filteredMatches.length}개 확정 매치</span>
    </div>
    ${
      groups.length
        ? groups
            .map(
              (group) => `
                <section class="notice-date-group">
                  <div class="notice-date-head">
                    <h3>${group.label}</h3>
                    <span>${group.matches.length}개 매치</span>
                  </div>
                  <div class="notice-card-list">
                    ${group.matches.map(renderNoticeCard).join("")}
                  </div>
                </section>
              `,
            )
            .join("")
        : emptyMessage
    }
  `;
}

function renderPolicy() {
  const grid = document.querySelector("#policyGrid");
  if (!grid) return;

  const settings = siteSettings();
  const adminCard = appState.isAdmin
    ? `
      <article class="policy-card policy-admin-card">
        <span class="status-pill waiting">운영자</span>
        <h3>운영 안내 수정</h3>
        <p>참가비, 계좌, 환불 기준, 정확한 장소 안내 문구는 사이트 설정에서 바로 수정합니다.</p>
        <button class="secondary-button" type="button" data-open-admin-site-settings>사이트 설정 열기</button>
      </article>
    `
    : "";

  grid.innerHTML = `
    ${adminCard}
    <article class="policy-card">
      <span class="status-pill revealed-pill">개인정보</span>
      <h3>수집 항목과 목적</h3>
      <p>닉네임, 이름, 생년월일, 전화번호, 주 활동지는 참가 신청 확인, 매치 확정 안내, 환불 안내, 운영 문의 응대를 위해서만 사용합니다.</p>
    </article>
    <article class="policy-card">
      <span class="status-pill waiting">참가비</span>
      <h3>${participationFeeText()}</h3>
      <p>정상 참가비는 ${regularFeeText()}입니다. 현재 적용 참가비는 ${participationFeeText()}이며, ${settings.drinkFeeNotice}입니다.</p>
    </article>
    <article class="policy-card">
      <span class="status-pill refunding">환불</span>
      <h3>환불 기준</h3>
      <p>${settings.refundPolicy}. 환불은 운영자가 입금 여부를 확인한 뒤 수동으로 처리합니다.</p>
    </article>
    <article class="policy-card">
      <span class="status-pill confirmed">게임 공개</span>
      <h3>24시간 전 공지</h3>
      <p>${settings.exactVenueNotice} 진행 게임, 방식, 규칙도 확정 공지 탭에 함께 공개됩니다.</p>
    </article>
  `;
}

function rankingWinCount(row) {
  if (Number.isFinite(row.wins)) return row.wins;
  const match = String(row.record || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function rankingRateValue(row) {
  if (Number.isFinite(row.rateValue)) return row.rateValue;
  const value = Number.parseFloat(String(row.rate || "0").replace("%", ""));
  return Number.isFinite(value) ? value / 100 : 0;
}

function sortedRankings() {
  return [...appState.rankings].sort((a, b) => {
    const rateCompare = rankingRateValue(b) - rankingRateValue(a);
    const winCompare = rankingWinCount(b) - rankingWinCount(a);
    const recordCompare = (b.wins + b.losses || 0) - (a.wins + a.losses || 0);
    const nameCompare = String(a.nickname || "").localeCompare(String(b.nickname || ""), "ko-KR");

    if (activeRankingSort === "wins") {
      return winCompare || rateCompare || recordCompare || nameCompare;
    }

    return rateCompare || winCompare || recordCompare || nameCompare;
  });
}

function renderRankingControls() {
  const buttons = document.querySelectorAll("#ranking .segmented button");
  buttons.forEach((button, index) => {
    const sort = index === 1 ? "wins" : "rate";
    button.classList.toggle("selected", activeRankingSort === sort);
    button.setAttribute("aria-pressed", activeRankingSort === sort ? "true" : "false");
    button.dataset.rankingSort = sort;
  });
}

function renderRankings() {
  renderRankingControls();
  document.querySelector("#rankingRows").innerHTML = sortedRankings()
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
  return game?.category && game.category !== "uncategorized" ? game.category : gameCategoryMap[game.id] || "uncategorized";
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
  const publicGames = appState.isAdmin ? appState.games : appState.games.filter((game) => !game.hidden);
  const categoryFilteredGames =
    activeGameCategoryFilter === "all"
      ? publicGames
      : publicGames.filter((game) => getGameCategory(game) === activeGameCategoryFilter);
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
    publicGames.find((game) => game.id === gameId) ||
    publicGames.find((game) => game.id === activeGameId) ||
    visibleGames[0] ||
    publicGames[0];

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

  const gamePageAdminToolbar = appState.isAdmin
    ? `
      <div class="game-page-admin-toolbar">
        <div>
          <strong>게임 목록 편집</strong>
          <span>게임 추가, 수정, 숨김, 분류 색상 변경을 이 페이지에서 시작합니다.</span>
        </div>
        <div>
          <button class="secondary-button" type="button" data-open-admin-game-new>새 게임 추가</button>
          <button class="secondary-button" type="button" data-open-admin-game-editor="${activeGame?.id || ""}" ${activeGame ? "" : "disabled"}>선택 게임 수정</button>
        </div>
      </div>
    `
    : "";

  gameList.innerHTML = visibleGames.length
    ? `${gamePageAdminToolbar}${visibleGames
        .map((game) => {
          const tags = getGameTags(game);
          const category = getGameCategory(game);
          return `
            <button class="game-card game-card--${category} ${game.hidden ? "game-card-is-hidden" : ""}" data-game="${game.id}">
              <strong>${game.title}</strong>
              <span>${game.summary}</span>
              ${appState.isAdmin && game.hidden ? `<em>숨김</em>` : ""}
              ${tags.length ? `<div class="game-tags">${tags.map((tag) => `<small>${tag}</small>`).join("")}</div>` : ""}
            </button>
          `;
        })
        .join("")}`
    : `${gamePageAdminToolbar}<div class="game-empty">검색 결과가 없습니다. 다른 키워드로 찾아보세요.</div>`;

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
        ${
          appState.isAdmin
            ? `<button class="secondary-button" type="button" data-open-admin-game-editor="${activeGame.id}">게임 수정</button>
               <button class="secondary-button ${activeGame.hidden ? "" : "danger-button"}" type="button" data-page-toggle-game-hidden="${activeGame.id}">
                 ${activeGame.hidden ? "게임 공개" : "게임 숨김"}
               </button>`
            : ""
        }
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

function renderAdminSections() {
  const pages = Array.from(document.querySelectorAll("[data-admin-page]"));
  const buttons = Array.from(document.querySelectorAll("[data-admin-section]"));
  const hasActivePage = pages.some((page) => page.dataset.adminPage === activeAdminSection);

  if (!hasActivePage) {
    activeAdminSection = "dashboard";
  }

  pages.forEach((page) => {
    page.classList.toggle("active", page.dataset.adminPage === activeAdminSection);
  });

  buttons.forEach((button) => {
    const selected = button.dataset.adminSection === activeAdminSection;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function focusAdminRiskLog() {
  adminReturnState = {
    adminSection: activeAdminSection,
    opsFilter: activeOpsFilter,
    opsMatchId: activeOpsMatchId,
    memberId: activeMemberId,
    memberDetailSection: activeMemberDetailSection,
    adminGameSection: activeAdminGameSection,
    adminGameId: activeAdminGameId,
  };
  activeAdminSection = "logs";
  activeEventLogFilter = "risk";
  visibleEventCount = 8;
}

function restoreAdminReturnState() {
  if (!adminReturnState) return false;

  activeAdminSection = adminReturnState.adminSection || "dashboard";
  activeOpsFilter = adminReturnState.opsFilter || "all";
  activeOpsMatchId = adminReturnState.opsMatchId || null;
  activeMemberId = adminReturnState.memberId || null;
  activeMemberDetailSection = adminReturnState.memberDetailSection || "summary";
  activeAdminGameSection = adminReturnState.adminGameSection || "library";
  activeAdminGameId = adminReturnState.adminGameId || null;
  adminReturnState = null;
  return true;
}

function scrollToAdminLog() {
  window.setTimeout(() => {
    document.querySelector("#eventLog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
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
  renderAdminSystemStatus();
  renderAdminBackupPanel();
  renderAdminGameManager();
  renderAdminSiteSettings();

  const metrics = [
    ["전체 회원", appState.members?.length || 0, "all"],
    ["입금 대기", appState.matches.filter(hasPaymentPending).length, "payment"],
    ["게임 공개 대기", appState.matches.filter((match) => match.confirmed && !match.gameRevealed).length, "reveal"],
    ["장소 미입력", appState.matches.filter(needsExactVenue).length, "venue"],
    ["게임 안내 문자", appState.matches.filter(needsGameRevealMessage).length, "gameMessage"],
    ["결과 입력 대기", appState.matches.filter((match) => match.confirmed && !match.result).length, "result"],
    ["취소 요청", appState.matches.filter(hasCancelRequest).length, "cancelRequest"],
    ["자동 취소/환불", appState.matches.filter(hasAutoClosed).length, "autoClosed"],
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
  renderEventLog();
  renderAdminSections();
}

function eventLogCategory(message) {
  const text = String(message || "");
  if (/삭제|초기화|취소|환불|되돌|숨김|공개 취소|완전|reset|delete|refund|cancel|undo/i.test(text)) return "risk";
  if (/환불|취소 요청|신청 취소|취소했습니다|되돌렸습니다/.test(text)) return "refund";
  if (/입금|결제/.test(text)) return "payment";
  if (/문자|알림|발송/.test(text)) return "message";
  if (/게임|추천|공개/.test(text)) return "game";
  if (/회원|비밀번호|로그인|가입|삭제/.test(text)) return "member";
  if (/매치|신규/.test(text)) return "match";
  return "other";
}

function eventLogFilterOptions(events) {
  const options = [
    { value: "all", label: "전체" },
    { value: "risk", label: "위험 작업" },
    { value: "payment", label: "입금" },
    { value: "refund", label: "취소/환불" },
    { value: "message", label: "문자" },
    { value: "game", label: "게임" },
    { value: "member", label: "회원" },
    { value: "match", label: "매치" },
    { value: "other", label: "기타" },
  ];

  return options.map((option) => ({
    ...option,
    count: option.value === "all" ? events.length : events.filter((event) => eventLogCategory(event.message) === option.value).length,
  }));
}

function renderEventLog() {
  const panel = document.querySelector("#eventLog");
  if (!panel) return;

  const events = appState.allEvents || appState.events || [];
  const entries = events.map((event) => (typeof event === "string" ? { message: event, createdAt: null } : event));
  const filterOptions = eventLogFilterOptions(entries);
  const query = eventLogSearchQuery.trim().toLowerCase();
  const filteredEvents = entries.filter((event) => {
    const categoryMatches = activeEventLogFilter === "all" || eventLogCategory(event.message) === activeEventLogFilter;
    return categoryMatches && (!query || String(event.message || "").toLowerCase().includes(query));
  });
  const riskCount = entries.filter((event) => eventLogCategory(event.message) === "risk").length;
  const visibleEvents = filteredEvents.slice(0, visibleEventCount);
  const hasMoreEvents = visibleEventCount < filteredEvents.length;

  panel.innerHTML = `
    <div class="event-log-head">
      <h3>운영 로그</h3>
      <span>${visibleEvents.length}/${filteredEvents.length}</span>
    </div>
    <button class="event-risk-summary ${activeEventLogFilter === "risk" ? "selected" : ""}" type="button" data-event-log-filter="risk">
      <strong>위험 작업 로그</strong>
      <span>${riskCount}건</span>
      <small>삭제, 초기화, 취소, 환불, 되돌림 기록만 모아봅니다.</small>
    </button>
    ${
      adminReturnState
        ? `<button class="event-return-button" type="button" data-return-admin-work>이전 작업으로 돌아가기</button>`
        : ""
    }
    <div class="event-log-controls">
      <input type="search" id="eventLogSearchInput" value="${escapeHtml(eventLogSearchQuery)}" placeholder="로그 검색" autocomplete="off" />
      <div class="ops-filter segmented">
        ${filterOptions
          .map(
            (option) => `
              <button class="${activeEventLogFilter === option.value ? "selected" : ""}" type="button" data-event-log-filter="${option.value}">
                ${option.label} <span>${option.count}</span>
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
    ${
      visibleEvents.length
        ? `<ul>
            ${visibleEvents
              .map(
                (entry) =>
                  `<li><time>${formatEventTime(entry.createdAt)}</time><span><b>${filterOptions.find((option) => option.value === eventLogCategory(entry.message))?.label || "기타"}</b>${escapeHtml(entry.message)}</span></li>`,
              )
              .join("")}
          </ul>`
        : `<div class="event-log-empty">조건에 맞는 운영 로그가 없습니다.</div>`
    }
    ${hasMoreEvents ? `<button class="secondary-button event-more-button" type="button" data-show-more-events>더 보기</button>` : ""}
  `;
}

function renderAdminBackupPanel() {
  const panel = document.querySelector("#adminBackupPanel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="backup-card">
      <div>
        <span>운영 데이터 백업</span>
        <strong>회원·신청·매치 데이터 내보내기</strong>
        <p>비밀번호 정보는 제외하고 내려받습니다. CSV는 신청 현황 확인용, JSON은 전체 백업용입니다.</p>
      </div>
      <div class="backup-actions">
        <button class="secondary-button" type="button" data-admin-export="csv">CSV 다운로드</button>
        <button class="secondary-button" type="button" data-admin-export="json">JSON 백업</button>
        <button class="secondary-button" type="button" data-admin-export="events-csv">운영 로그 CSV</button>
        <button class="secondary-button" type="button" data-admin-export="events-json">운영 로그 JSON</button>
      </div>
    </div>
  `;
}

function gameCategorySelectOptions(selected = "uncategorized") {
  return [
    ...gameCategoryOptions.filter((option) => option.value !== "all"),
    { value: "uncategorized", label: "미분류" },
  ]
    .map((option) => `<option value="${option.value}" ${option.value === selected ? "selected" : ""}>${option.label}</option>`)
    .join("");
}

function renderAdminGameManager() {
  const panel = document.querySelector("#adminGameManager");
  if (!panel) return;

  const query = adminGameSearchQuery.trim().toLowerCase();
  const sortedGames = [...appState.games].sort(
    (a, b) => getGameCategory(a).localeCompare(getGameCategory(b), "ko-KR") || a.title.localeCompare(b.title, "ko-KR"),
  );
  const filteredGames = sortedGames.filter((game) => {
    const categoryMatches = adminGameCategoryFilter === "all" || getGameCategory(game) === adminGameCategoryFilter;
    const text = [game.title, game.summary, game.win, game.id, ...getGameTags(game), ...(game.rules || [])].join(" ").toLowerCase();
    return categoryMatches && (!query || text.includes(query));
  });

  if (activeAdminGameId && !filteredGames.some((game) => game.id === activeAdminGameId)) {
    activeAdminGameId = null;
  }

  const activeGame = filteredGames.find((game) => game.id === activeAdminGameId) || filteredGames[0] || null;
  activeAdminGameId = activeGame?.id || null;
  const system = appState.system || {};
  const isSupabase = (system.storage || "json") === "supabase";
  const needsGameAdminMigration = Boolean(isSupabase && system.schemaStatus?.gameAdminFields === false);
  const needsAutoClosedMigration = Boolean(isSupabase && system.schemaStatus?.autoClosedApplications === false);
  const migrationIssueCount = [needsGameAdminMigration, needsAutoClosedMigration].filter(Boolean).length;
  const categoryButtons = gameCategoryOptions
    .map(
      (option) => `
        <button class="${adminGameCategoryFilter === option.value ? "selected" : ""}" type="button" data-admin-game-category="${option.value}">
          ${option.label}
          <span>${option.value === "all" ? appState.games.length : appState.games.filter((game) => getGameCategory(game) === option.value).length}</span>
        </button>
      `,
    )
    .join("");

  panel.innerHTML = `
    <div class="admin-game-head">
      <div>
        <h3>게임 관리</h3>
        <p>운영 게임을 추가하고, 규칙을 수정하거나 목록에서 숨깁니다.</p>
      </div>
      <span class="status-pill confirmed">${appState.games.filter((game) => !game.hidden).length}개 공개</span>
    </div>
    <div class="admin-game-tabs" role="tablist" aria-label="게임 관리 메뉴">
      <button class="${activeAdminGameSection === "library" ? "selected" : ""}" type="button" data-admin-game-section="library">목록/편집</button>
      <button class="${activeAdminGameSection === "new" ? "selected" : ""}" type="button" data-admin-game-section="new">새 게임 추가</button>
      <button class="${activeAdminGameSection === "database" ? "selected" : ""}" type="button" data-admin-game-section="database">DB 상태</button>
    </div>
    <section class="admin-game-section ${activeAdminGameSection === "new" ? "active" : ""}" data-admin-game-page="new">
    <form class="admin-game-form admin-game-form-new" data-create-game-form>
      <div>
        <strong>새 게임 추가</strong>
        <span>규칙은 줄마다 1개 항목으로 입력합니다.</span>
      </div>
      <label>
        게임명
        <input name="title" type="text" placeholder="예: 절대음감 경매" required />
      </label>
      <label>
        분류
        <select name="category">${gameCategorySelectOptions("uncategorized")}</select>
      </label>
      <label class="wide">
        요약
        <input name="summary" type="text" placeholder="게임 카드에 보일 한 줄 설명" required />
      </label>
      <label class="wide">
        규칙
        <textarea name="rules" rows="5" placeholder="1라운드 규칙&#10;2라운드 규칙" required></textarea>
      </label>
      <label class="wide">
        승리 조건
        <input name="win" type="text" placeholder="최종 승리 조건" required />
      </label>
      <button class="primary-button" type="submit">게임 추가</button>
    </form>
    </section>
    <section class="admin-game-section ${activeAdminGameSection === "library" ? "active" : ""}" data-admin-game-page="library">
    <div class="admin-game-controls">
      <input type="search" id="adminGameSearchInput" value="${escapeHtml(adminGameSearchQuery)}" placeholder="게임명, 규칙, 태그 검색" autocomplete="off" />
      <div class="ops-filter segmented">${categoryButtons}</div>
    </div>
    <div class="admin-game-workspace">
      <div class="admin-game-list">
        ${
          filteredGames.length
            ? filteredGames.map((game) => renderAdminGameListItem(game, activeGame?.id === game.id)).join("")
            : `<div class="game-empty">조건에 맞는 게임이 없습니다.</div>`
        }
      </div>
      <div class="admin-game-editor">
        ${activeGame ? renderAdminGameEditor(activeGame) : ""}
      </div>
    </div>
    </section>
    <section class="admin-game-section ${activeAdminGameSection === "database" ? "active" : ""}" data-admin-game-page="database">
      <div class="admin-game-db-panel">
        <div class="system-status-card ${isSupabase ? "stable" : "warning"}">
          <div>
            <span>게임 관리 DB 상태</span>
            <strong>${migrationIssueCount ? `DB 조치 필요 ${migrationIssueCount}건` : "DB 정상"}</strong>
            <p>${isSupabase ? "Supabase 스키마 상태를 기준으로 게임 관리 저장 가능 여부를 확인합니다." : "현재 로컬 JSON 저장소로 실행 중입니다. 운영 배포 환경의 Supabase 상태를 확인해 주세요."}</p>
          </div>
        </div>
        ${
          needsGameAdminMigration
            ? `<div class="system-status-card warning system-status-warning">
                <div>
                  <span>DB 마이그레이션 필요</span>
                  <strong>게임관리 컬럼 미적용</strong>
                  <p><code>supabase-add-game-admin-fields.sql</code>을 Supabase SQL Editor에서 실행해야 게임 분류와 숨김 상태가 영구 저장됩니다.</p>
                  <button class="secondary-button" type="button" data-copy-migration-sql="game-admin">SQL 복사</button>
                </div>
              </div>`
            : ""
        }
        ${
          needsAutoClosedMigration
            ? `<div class="system-status-card warning system-status-warning">
                <div>
                  <span>DB 마이그레이션 필요</span>
                  <strong>자동 취소 기록 컬럼 미적용</strong>
                  <p><code>supabase-add-auto-closed-applications.sql</code>을 Supabase SQL Editor에서 실행해야 자동 취소/환불 필터 기록이 영구 저장됩니다.</p>
                  <button class="secondary-button" type="button" data-copy-migration-sql="auto-closed">SQL 복사</button>
                </div>
              </div>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderAdminSiteSettings() {
  const panel = document.querySelector("#adminSiteSettings");
  if (!panel) return;

  const settings = siteSettings();
  const system = appState.system || {};
  const needsSiteSettingsMigration = Boolean((system.storage || "json") === "supabase" && system.schemaStatus?.siteSettings === false);

  panel.innerHTML = `
    <div class="admin-game-head">
      <div>
        <h3>사이트 설정</h3>
        <p>참가 신청 화면과 안내 문자에 쓰는 참가비, 계좌, 환불 기준 문구를 수정합니다.</p>
      </div>
      <span class="status-pill ${needsSiteSettingsMigration ? "waiting" : "confirmed"}">
        ${needsSiteSettingsMigration ? "DB 적용 필요" : "저장 가능"}
      </span>
    </div>
    ${
      needsSiteSettingsMigration
        ? `<div class="system-status-card warning system-status-warning">
            <div>
              <span>Supabase 설정 테이블 필요</span>
              <strong>site_settings 테이블이 아직 없습니다</strong>
              <p><code>supabase-add-site-settings.sql</code>을 Supabase SQL Editor에서 실행하면 이 설정이 DB에 영구 저장됩니다. 실행 전에는 기본값으로 계속 동작합니다.</p>
            </div>
          </div>`
        : ""
    }
    <form class="admin-create-form admin-site-settings-form" id="siteSettingsForm">
      <label>
        현재 참가비
        <input name="participationFee" type="number" min="0" step="100" value="${escapeHtml(settings.participationFee)}" required />
      </label>
      <label>
        정상 참가비
        <input name="regularFee" type="number" min="0" step="100" value="${escapeHtml(settings.regularFee)}" required />
      </label>
      <label class="wide">
        참가비 표시 문구
        <input name="feeNotice" type="text" value="${escapeHtml(settings.feeNotice)}" required />
      </label>
      <label class="wide">
        입금 계좌
        <input name="bankAccountLabel" type="text" value="${escapeHtml(settings.bankAccountLabel)}" required />
      </label>
      <label>
        예금주
        <input name="accountHolder" type="text" value="${escapeHtml(settings.accountHolder)}" required />
      </label>
      <label>
        입금자명 안내
        <input name="depositNameGuide" type="text" value="${escapeHtml(settings.depositNameGuide)}" required />
      </label>
      <label class="wide">
        음료비 안내
        <input name="drinkFeeNotice" type="text" value="${escapeHtml(settings.drinkFeeNotice)}" required />
      </label>
      <label class="wide">
        환불 기준
        <textarea name="refundPolicy" rows="3" required>${escapeHtml(settings.refundPolicy)}</textarea>
      </label>
      <label class="wide">
        정확한 장소 안내
        <textarea name="exactVenueNotice" rows="3" required>${escapeHtml(settings.exactVenueNotice)}</textarea>
      </label>
      <button class="primary-button" type="submit">사이트 설정 저장</button>
    </form>
  `;
}

function renderAdminGameListItem(game, selected) {
  return `
    <button class="admin-game-list-item ${selected ? "selected" : ""} ${game.hidden ? "is-hidden" : ""}" type="button" data-admin-game-select="${game.id}">
      <span>
        <strong>${escapeHtml(game.title)}</strong>
        <small>${game.hidden ? "숨김" : "공개"} · ${escapeHtml(game.id)}</small>
      </span>
      <b>${gameCategoryOptions.find((option) => option.value === getGameCategory(game))?.label || "미분류"}</b>
    </button>
  `;
}

function renderAdminGameEditor(game) {
  return `
    <form class="admin-game-form ${game.hidden ? "is-hidden" : ""}" data-update-game-form="${game.id}">
      <input name="gameId" type="hidden" value="${escapeHtml(game.id)}" />
      <div class="admin-game-row-head">
        <div>
          <strong>${escapeHtml(game.title)}</strong>
          <span>${game.hidden ? "숨김" : "공개"} · ${escapeHtml(game.id)}</span>
        </div>
        <button class="secondary-button ${game.hidden ? "" : "danger-button"}" type="button" data-toggle-game-hidden="${game.id}">
          ${game.hidden ? "복구" : "숨김"}
        </button>
      </div>
      <label>
        게임명
        <input name="title" type="text" value="${escapeHtml(game.title)}" required />
      </label>
      <label>
        분류
        <select name="category">${gameCategorySelectOptions(getGameCategory(game))}</select>
      </label>
      <label class="wide">
        요약
        <input name="summary" type="text" value="${escapeHtml(game.summary)}" required />
      </label>
      <label class="wide">
        규칙
        <textarea name="rules" rows="6" required>${escapeHtml((game.rules || []).join("\n"))}</textarea>
      </label>
      <label class="wide">
        승리 조건
        <input name="win" type="text" value="${escapeHtml(game.win)}" required />
      </label>
      <button class="secondary-button" type="submit">수정 저장</button>
    </form>
  `;
}

async function downloadAdminExport(format) {
  const response = await fetch(`/api/admin/export?format=${encodeURIComponent(format)}`);

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "백업 파일을 만들지 못했습니다.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] || `1vs1match-backup.${format.includes("csv") ? "csv" : "json"}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderAdminSystemStatus() {
  const panel = document.querySelector("#adminSystemStatus");
  if (!panel) return;

  const system = appState.system || {};
  const storage = system.storage || "json";
  const isSupabase = storage === "supabase";
  const storageLabel = system.storageLabel || (isSupabase ? "Supabase DB" : "local JSON file");
  const storageMessage = isSupabase
    ? "현재 운영 데이터가 Supabase DB에 저장됩니다."
    : "현재 운영 데이터가 서버 파일에 저장됩니다. 실제 운영 전 Supabase 연결을 확인해 주세요.";
  const needsGameAdminMigration = Boolean(isSupabase && system.schemaStatus?.gameAdminFields === false);
  const needsAutoClosedMigration = Boolean(isSupabase && system.schemaStatus?.autoClosedApplications === false);
  const migrationIssueCount = [needsGameAdminMigration, needsAutoClosedMigration].filter(Boolean).length;

  panel.innerHTML = `
    <div class="system-status-card ${isSupabase ? "stable" : "warning"}">
      <div>
        <span>데이터 저장소</span>
        <strong>${escapeHtml(storageLabel)}</strong>
        <p>${storageMessage}</p>
      </div>
      <div class="system-status-meta">
        <span class="${migrationIssueCount ? "system-status-issue" : "system-status-ok"}">
          ${migrationIssueCount ? `DB 조치 필요 ${migrationIssueCount}건` : "DB 정상"}
        </span>
        <span>결제: ${escapeHtml(system.paymentProvider || "mock")}</span>
        <span>문자: ${escapeHtml(system.smsProvider || "mock")}</span>
      </div>
    </div>
    ${
      needsGameAdminMigration
        ? `<div class="system-status-card warning system-status-warning">
            <div>
              <span>DB 마이그레이션 필요</span>
              <strong>게임관리 컬럼 미적용</strong>
              <p><code>supabase-add-game-admin-fields.sql</code>을 Supabase SQL Editor에서 실행해야 게임 분류와 숨김 상태가 영구 저장됩니다.</p>
              <button class="secondary-button" type="button" data-copy-migration-sql="game-admin">SQL 복사</button>
            </div>
          </div>`
        : ""
    }
    ${
      needsAutoClosedMigration
        ? `<div class="system-status-card warning system-status-warning">
            <div>
              <span>DB 마이그레이션 필요</span>
              <strong>자동 취소 기록 컬럼 미적용</strong>
              <p><code>supabase-add-auto-closed-applications.sql</code>을 Supabase SQL Editor에서 실행해야 자동 취소/환불 필터 기록이 영구 저장됩니다.</p>
              <button class="secondary-button" type="button" data-copy-migration-sql="auto-closed">SQL 복사</button>
            </div>
          </div>`
        : ""
    }
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
      filter: "venue",
      title: "정확한 장소",
      count: appState.matches.filter(needsExactVenue).length,
      detail: "확정됐지만 실제 카페 장소가 아직 저장되지 않은 매치",
    },
    {
      filter: "gameMessage",
      title: "게임 안내 문자",
      count: appState.matches.filter(needsGameRevealMessage).length,
      detail: "게임이 공개됐지만 안내 문자 발송 체크가 아직 없는 매치",
    },
    {
      filter: "result",
      title: "결과 입력",
      count: appState.matches.filter((match) => match.confirmed && !match.result).length,
      detail: "경기 결과가 아직 기록되지 않은 매치",
    },
    {
      filter: "cancelRequest",
      title: "취소 요청",
      count: appState.matches.filter(hasCancelRequest).length,
      detail: "참가자가 직접 보낸 신청 취소 요청",
    },
    {
      filter: "autoClosed",
      title: "자동 취소/환불",
      count: appState.matches.filter(hasAutoClosed).length,
      detail: "24시간 전 1명 미달로 자동 정리된 매치",
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

function isOpsDueSoon(match, days = 2) {
  const matchDate = parseMatchDate(match);
  if (!matchDate) return true;

  const end = startOfToday();
  end.setDate(end.getDate() + days);
  return matchDate < end;
}

function adminTodayTaskItems() {
  const matches = appState.matches;

  return [
    {
      filter: "payment",
      title: "입금 확인",
      count: matches.filter(hasPaymentPending).length,
      total: matches.filter(hasPaymentPending).length,
      detail: "입금 대기 신청을 확인합니다.",
    },
    {
      filter: "reveal",
      title: "게임 공개",
      count: matches.filter((match) => match.confirmed && !match.gameRevealed && isOpsDueSoon(match)).length,
      total: matches.filter((match) => match.confirmed && !match.gameRevealed).length,
      detail: "오늘/내일 경기 공개를 확인합니다.",
    },
    {
      filter: "venue",
      title: "장소 입력",
      count: matches.filter((match) => needsExactVenue(match) && isOpsDueSoon(match)).length,
      total: matches.filter(needsExactVenue).length,
      detail: "확정 경기의 정확한 장소를 채웁니다.",
    },
    {
      filter: "gameMessage",
      title: "문자 발송",
      count: matches.filter(needsGameRevealMessage).length,
      total: matches.filter(needsGameRevealMessage).length,
      detail: "게임 안내 문자 발송 체크가 필요합니다.",
    },
    {
      filter: "cancelRequest",
      title: "취소 요청",
      count: matches.filter(hasCancelRequest).length,
      total: matches.filter(hasCancelRequest).length,
      detail: "참가자 취소 요청을 처리합니다.",
    },
    {
      filter: "refund",
      title: "환불 확인",
      count: matches.filter(hasRefundNeeded).length,
      total: matches.filter(hasRefundNeeded).length,
      detail: "환불 예약/처리 상태를 확인합니다.",
    },
  ];
}

function adminPriorityTaskItems() {
  const matches = appState.matches;
  const tasks = [
    {
      filter: "payment",
      title: "입금 확인",
      count: matches.filter(hasPaymentPending).length,
      detail: "신청 직후 먼저 확인",
    },
    {
      filter: "cancelRequest",
      title: "취소 요청",
      count: matches.filter(hasCancelRequest).length,
      detail: "참가자 요청 우선 처리",
    },
    {
      filter: "venue",
      title: "장소 입력",
      count: matches.filter((match) => needsExactVenue(match) && isOpsDueSoon(match)).length,
      detail: "확정 경기 장소 보완",
    },
    {
      filter: "gameMessage",
      title: "문자 발송",
      count: matches.filter(needsGameRevealMessage).length,
      detail: "게임 공개 후 안내 체크",
    },
    {
      filter: "refund",
      title: "환불 확인",
      count: matches.filter(hasRefundNeeded).length,
      detail: "환불 예약/완료 처리",
    },
    {
      filter: "reveal",
      title: "게임 공개",
      count: matches.filter((match) => match.confirmed && !match.gameRevealed && isOpsDueSoon(match)).length,
      detail: "시작 임박 경기 공개",
    },
  ];

  return tasks.filter((task) => task.count > 0);
}

function renderAdminActionPanel() {
  const panel = document.querySelector("#adminActionPanel");
  if (!panel) return;

  const items = adminActionItems();
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const todayTasks = adminTodayTaskItems();
  const todayTotal = todayTasks.reduce((sum, item) => sum + item.count, 0);
  const priorityTasks = adminPriorityTaskItems();

  panel.innerHTML = `
    <div class="admin-today-board">
      <div class="admin-today-head">
        <div>
          <span>오늘 처리할 일</span>
          <h3>${todayTotal ? `바로 볼 항목 ${todayTotal}건` : "오늘 급한 처리 항목 없음"}</h3>
        </div>
        <button class="secondary-button" type="button" data-ops-jump="upcoming">오늘 이후 매치 보기</button>
      </div>
      <div class="admin-today-grid">
        ${todayTasks
          .map(
            (item) => `
              <button class="admin-today-item ${item.count ? "active" : ""}" type="button" data-ops-jump="${item.filter}">
                <strong>${item.title}</strong>
                <span>${item.count}건</span>
                <small>${item.detail}</small>
                <em>전체 ${item.total}건</em>
              </button>
            `,
          )
          .join("")}
      </div>
      <div class="admin-priority-list">
        <div class="admin-priority-head">
          <strong>운영 우선순위</strong>
          <span>${priorityTasks.length ? `${priorityTasks.length}개 처리 흐름` : "지금 급한 처리 없음"}</span>
        </div>
        ${
          priorityTasks.length
            ? priorityTasks
                .map(
                  (task, index) => `
                    <button class="admin-priority-item" type="button" data-ops-jump="${task.filter}">
                      <b>${index + 1}</b>
                      <span>
                        <strong>${task.title}</strong>
                        <small>${task.detail}</small>
                      </span>
                      <em>${task.count}건</em>
                    </button>
                  `,
                )
                .join("")
            : `<div class="admin-priority-empty">입금, 취소, 장소, 문자, 환불 대기 항목이 없습니다.</div>`
        }
      </div>
    </div>
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

function memberMatchesSearch(member, query) {
  const keyword = String(query || "").trim().toLocaleLowerCase("ko-KR");
  if (!keyword) return true;

  return [member.nickname, member.realName, member.birthDate, member.phone, member.area]
    .some((value) => String(value || "").toLocaleLowerCase("ko-KR").includes(keyword));
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
    <div class="member-detail-tabs" role="tablist" aria-label="회원 상세 메뉴">
      <button class="${activeMemberDetailSection === "summary" ? "selected" : ""}" type="button" data-member-detail-section="summary">요약</button>
      <button class="${activeMemberDetailSection === "edit" ? "selected" : ""}" type="button" data-member-detail-section="edit">정보 수정</button>
      <button class="${activeMemberDetailSection === "history" ? "selected" : ""}" type="button" data-member-detail-section="history">신청 이력</button>
    </div>
    <section class="member-detail-section ${activeMemberDetailSection === "summary" ? "active" : ""}" data-member-detail-page="summary">
    <div class="member-detail-grid">
      <span><strong>이름</strong>${escapeHtml(member.realName || "미등록")}</span>
      <span><strong>생년월일</strong>${escapeHtml(member.birthDate || "미등록")}</span>
      <span><strong>전화번호</strong>${escapeHtml(member.phone)}</span>
      <span><strong>활동지</strong>${escapeHtml(member.area)}</span>
      <span><strong>전적</strong>${member.wins}승 ${member.losses}패</span>
      <span><strong>승률</strong>${rate}</span>
      <span><strong>신청</strong>${applications.length}회</span>
    </div>
    </section>
    <section class="member-detail-section ${activeMemberDetailSection === "edit" ? "active" : ""}" data-member-detail-page="edit">
    <form class="member-edit-form" data-update-member="${member.id}">
      <div>
        <h4>회원 정보 수정</h4>
        <p>닉네임과 전화번호는 다른 회원과 중복될 수 없습니다.</p>
      </div>
      <label>
        닉네임
        <input type="text" name="nickname" value="${escapeHtml(member.nickname)}" required />
      </label>
      <label>
        이름
        <input type="text" name="realName" value="${escapeHtml(member.realName || "")}" required />
      </label>
      <label>
        생년월일
        <input type="text" name="birthDate" value="${escapeHtml(member.birthDate || "")}" inputmode="numeric" maxlength="10" required />
      </label>
      <label>
        전화번호
        <input type="tel" name="phone" value="${escapeHtml(member.phone)}" inputmode="numeric" maxlength="13" required />
      </label>
      <label>
        주 활동지
        <input type="text" name="area" value="${escapeHtml(member.area)}" required />
      </label>
      <div class="member-edit-actions">
        <button class="secondary-button danger" type="button" data-reset-member-password="${member.id}">비밀번호 초기화</button>
        <button class="secondary-button danger" type="button" data-delete-member="${member.id}">회원 완전 삭제</button>
        <button class="primary-button" type="submit">정보 저장</button>
      </div>
    </form>
    </section>
    <section class="member-detail-section ${activeMemberDetailSection === "history" ? "active" : ""}" data-member-detail-page="history">
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
    </section>
  `;
}

function renderMemberRoster() {
  const roster = document.querySelector("#memberRoster");
  if (!roster) return;
  const searchInput = document.querySelector("#memberSearchInput");
  if (searchInput && searchInput.value !== memberSearchQuery) {
    searchInput.value = memberSearchQuery;
  }

  const allMembers = [...(appState.members || [])].sort((a, b) => {
    const aTotal = a.wins + a.losses;
    const bTotal = b.wins + b.losses;
    return bTotal - aTotal || b.wins - a.wins || a.nickname.localeCompare(b.nickname, "ko-KR");
  });
  const members = allMembers.filter((member) => memberMatchesSearch(member, memberSearchQuery));

  if (!members.length) {
    activeMemberId = null;
    roster.innerHTML = `<div class="member-roster-empty">${
      allMembers.length ? "검색 조건에 맞는 회원이 없습니다." : "가입 회원이 없습니다."
    }</div>`;
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

function hasAutoClosed(match) {
  return match.allPlayers.some((player) => player.autoClosed);
}

function hasCancelRequest(match) {
  return match.allPlayers.some((player) => ["cancel_requested_pending", "cancel_requested_paid"].includes(player.paymentStatus));
}

function needsGameRevealMessage(match) {
  return Boolean(match.confirmed && match.gameRevealed && match.game && !match.notificationLog?.includes("game-revealed"));
}

function needsExactVenue(match) {
  return Boolean(match.confirmed && !exactMatchVenue(match));
}

function matchesOpsFilter(match, filter) {
  if (filter === "upcoming") {
    const matchDate = parseMatchDate(match);
    return matchDate ? matchDate >= startOfToday() : true;
  }
  if (filter === "week") return isMatchThisWeek(match);
  if (filter === "month") return isMatchThisMonth(match);
  if (filter === "open") return match.playerCount < 2;
  if (filter === "payment") return hasPaymentPending(match);
  if (filter === "confirmed") return match.confirmed;
  if (filter === "reveal") return match.confirmed && !match.gameRevealed;
  if (filter === "gameMessage") return needsGameRevealMessage(match);
  if (filter === "venue") return needsExactVenue(match);
  if (filter === "result") return match.confirmed && !match.result;
  if (filter === "cancelRequest") return hasCancelRequest(match);
  if (filter === "autoClosed") return hasAutoClosed(match);
  if (filter === "refund") return hasRefundNeeded(match);

  return true;
}

function matchSearchText(match) {
  const gameTitle = match.game?.title || "";
  const playerText = match.allPlayers.map((player) => `${player.nickname} ${player.phone} ${player.area}`).join(" ");
  return `${match.date} ${match.time} ${match.location} ${match.exactVenue || ""} ${match.statusLabel} ${gameTitle} ${playerText} ${match.adminNote || ""}`.toLowerCase();
}

function adminMatchLabel(match) {
  if (!match) return "선택한 매치";
  return `${match.date} ${match.time} ${match.location}`;
}

function adminPlayerLabel(match, memberId) {
  const player = match?.allPlayers?.find((item) => item.memberId === memberId);
  return player ? `${player.nickname} (${player.phone})` : "선택한 참가자";
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
  const quickFilters = [
    { value: "upcoming", label: "오늘 이후", note: "앞으로 열릴 매치" },
    { value: "payment", label: "입금 대기", note: "확인할 신청" },
    { value: "confirmed", label: "확정/마감", note: "2명 모집 완료" },
    { value: "venue", label: "장소 미입력", note: "공지 전 보완" },
    { value: "gameMessage", label: "문자 미발송", note: "안내 필요" },
    { value: "cancelRequest", label: "취소 요청", note: "운영자 처리" },
    { value: "autoClosed", label: "자동 취소", note: "24시간 전 1명" },
    { value: "refund", label: "환불 필요", note: "예약/처리 확인" },
  ];
  const opsFilters = [
    { value: "all", label: "전체" },
    { value: "upcoming", label: "오늘 이후" },
    { value: "week", label: "이번 주" },
    { value: "month", label: "이번 달" },
    { value: "open", label: "신청 가능" },
    { value: "payment", label: "입금 대기" },
    { value: "confirmed", label: "확정/마감" },
    { value: "reveal", label: "게임 공개 대기" },
    { value: "venue", label: "장소 미입력" },
    { value: "gameMessage", label: "게임 안내 문자" },
    { value: "result", label: "결과 대기" },
    { value: "cancelRequest", label: "취소 요청" },
    { value: "autoClosed", label: "자동 취소/환불" },
    { value: "refund", label: "환불 필요" },
  ];
  const filteredMatches = filteredOpsMatches();
  const activeFilterLabel =
    [...quickFilters, ...opsFilters].find((filter) => filter.value === activeOpsFilter)?.label || "전체";
  if (activeOpsMatchId && !filteredMatches.some((match) => match.id === activeOpsMatchId)) {
    activeOpsMatchId = null;
  }
  const controlsMarkup = `
    <div class="ops-management-panel">
      <div class="ops-management-head">
        <div>
          <strong>매치 운영 필터</strong>
          <span>처리가 필요한 매치를 상태별로 바로 모아봅니다.</span>
        </div>
        <div class="ops-current-filter">
          <span>현재 보기</span>
          <b>${activeFilterLabel}</b>
        </div>
      </div>
      <div class="ops-quick-filter">
        ${quickFilters
          .map((filter) => {
            const count = appState.matches.filter((match) => matchesOpsFilter(match, filter.value)).length;
            return `
              <button class="${filter.value === activeOpsFilter ? "selected" : ""}" type="button" data-ops-filter="${filter.value}">
                <span>
                  <strong>${filter.label}</strong>
                  <small>${filter.note}</small>
                </span>
                <b>${count}</b>
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
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
  const needsGameMessage = needsGameRevealMessage(match);
  const needsVenue = needsExactVenue(match);
  const isManualReveal = match.gameRevealMode === "manual";
  const isAutoReveal = match.gameRevealMode === "auto";
  const revealScheduleLabel = formatRevealSchedule(match);
  const hasCancelRequests = hasCancelRequest(match);
  const cancelRequestPlayers = match.allPlayers.filter((player) =>
    ["cancel_requested_pending", "cancel_requested_paid"].includes(player.paymentStatus),
  );
  const needsRefund = match.allPlayers.some((player) => ["refund_requested", "refund_scheduled"].includes(player.paymentStatus));
  const resultRecorded = Boolean(match.result);
  const isExpanded = activeOpsMatchId === match.id;
  const canDeleteMatch = !match.allPlayers.length && !match.result && !(match.notificationLog || []).length;
  const scheduleDateValue = dateKeyFromMatch(match) || match.id.slice(0, 10);
  const paymentPendingCount = match.allPlayers.filter((player) => player.paymentStatus === "payment_pending" && !player.cancelled).length;
  const issueLabels = [
    paymentPendingCount ? `입금 ${paymentPendingCount}명 대기` : "",
    needsReveal ? "게임 공개 대기" : "",
    needsVenue ? "장소 미입력" : "",
    needsGameMessage ? "문자 미발송" : "",
    hasCancelRequests ? `취소 요청 ${cancelRequestPlayers.length}건` : "",
    needsRefund ? "환불 필요" : "",
    resultRecorded ? "결과 입력됨" : "",
  ].filter(Boolean);

  if (!isExpanded) {
    return `
      <article class="ops-card ops-card-collapsed ${needsVenue ? "ops-card-needs-venue" : ""}">
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
    .filter((game) => !game.hidden || match.game?.id === game.id)
    .map(
      (game) =>
        `<option value="${game.id}" ${match.game?.id === game.id ? "selected" : ""}>${game.title}${game.hidden ? " (숨김)" : ""}</option>`,
    )
    .join("");
  const winnerOptions = match.players.map((player) => `<option value="${player.memberId}">${player.nickname}</option>`).join("");
  const participantList = match.allPlayers.length
    ? match.allPlayers
        .map((player) => {
          const paymentLabel = paymentStatusLabel(player.paymentStatus);
          const cancelRequestDetail =
            player.paymentStatus === "cancel_requested_paid"
              ? "승인 시 환불 요청으로 전환"
                : player.paymentStatus === "cancel_requested_pending"
                  ? "승인 시 결제 대기 신청 취소"
                  : "";
            const autoClosedDetail = player.autoClosed ? "24시간 전 1명 미달 자동 정리" : "";
            const participantActions = [
              player.paymentStatus === "payment_pending" && !player.cancelled
                ? `<button class="inline-action" type="button" data-complete-payment="${match.id}" data-member-id="${player.memberId}">입금 확인</button>`
                : "",
              player.paymentStatus === "paid" && !player.cancelled
                ? `<button class="inline-action danger" type="button" data-undo-payment="${match.id}" data-member-id="${player.memberId}">입금 취소</button>`
                : "",
              ["cancel_requested_pending", "cancel_requested_paid"].includes(player.paymentStatus)
                ? `<button class="inline-action danger" type="button" data-approve-cancel-request="${match.id}" data-member-id="${player.memberId}">취소 승인</button>
                   <button class="inline-action" type="button" data-reject-cancel-request="${match.id}" data-member-id="${player.memberId}">요청 반려</button>`
                : "",
              ["refund_requested", "refund_scheduled"].includes(player.paymentStatus)
                ? `<button class="inline-action danger" type="button" data-refund-member="${match.id}" data-member-id="${player.memberId}">환불 완료</button>`
                : "",
              player.paymentStatus === "refunded"
                ? `<button class="inline-action" type="button" data-undo-refund-member="${match.id}" data-member-id="${player.memberId}">환불 취소</button>`
                : "",
            ]
              .filter(Boolean)
              .join("");
            return `
            <div class="participant-row ${player.cancelled ? "cancelled" : ""} ${cancelRequestDetail || autoClosedDetail ? "cancel-requested" : ""}">
              <strong>${player.nickname}</strong>
              <span>${player.phone}</span>
              <span>${player.area}</span>
              <span class="participant-payment-cell">
                <span class="participant-payment-state">
                  <b class="participant-status ${cancelRequestDetail || autoClosedDetail ? "participant-status-alert" : ""}">${paymentLabel}</b>
                  ${cancelRequestDetail ? `<small>${cancelRequestDetail}</small>` : ""}
                  ${autoClosedDetail ? `<small>${autoClosedDetail}</small>` : ""}
                </span>
                ${participantActions ? `<span class="participant-actions">${participantActions}</span>` : ""}
              </span>
            </div>
          `;
        })
        .join("")
    : `<div class="participant-empty">아직 신청자가 없습니다.</div>`;
  const messageMarkup = buildAdminMessages(match)
    .map((messageText) => {
      const messageSent = match.notificationLog?.includes(messageText.key);
      const isPendingGameMessage = messageText.key === "game-revealed" && !messageSent;
      const messageKey = `${match.id}:${messageText.key}`;
      const isMessageExpanded = expandedAdminMessageKeys.has(messageKey);
      return `
        <div class="message-preview ${isPendingGameMessage ? "message-preview-priority" : ""} ${isMessageExpanded ? "expanded" : "collapsed"}">
          <div class="message-preview-head">
            <div>
              <strong>${messageText.type}</strong>
              <span>${messageSent ? "발송 완료" : "발송 대기"}${messageText.targetLabel ? ` · ${messageText.targetLabel}` : ""}</span>
            </div>
            <button class="secondary-button" type="button" data-toggle-admin-message="${escapeHtml(messageKey)}">
              ${isMessageExpanded ? "접기" : "펼치기"}
            </button>
          </div>
          ${
            isMessageExpanded
              ? `<div class="message-actions">
                  <button class="secondary-button" type="button" data-copy-message>문구 복사</button>
                  ${
                    messageSent
                      ? `<button class="secondary-button" type="button" data-message-unsent="${match.id}" data-message-key="${messageText.key}">발송 체크 취소</button>`
                      : `<button class="secondary-button" type="button" data-message-sent="${match.id}" data-message-key="${messageText.key}">발송 완료 체크</button>`
                  }
                </div>`
              : ""
          }
          <p>${messageText.body}</p>
        </div>
      `;
    })
    .join("");

  return `
    <article class="ops-card ops-card-expanded ${needsVenue ? "ops-card-needs-venue" : ""}">
      <div class="ops-main">
        <div>
          <h3>${match.date} ${match.time}</h3>
          <p>${match.location} · ${match.playerCount}/2명 · ${match.statusLabel}${resultRecorded ? " · 결과 입력됨" : ""}</p>
        </div>
        <button class="secondary-button" type="button" data-toggle-ops-match="${match.id}">접기</button>
        <div class="ops-actions">
          <div class="ops-action-group ops-action-group-game">
            <span>게임/장소/문자</span>
            <small>${match.confirmed ? (match.gameRevealed ? "참가자에게 게임이 공개되었습니다." : revealScheduleLabel) : "매치 확정 후 게임을 예약할 수 있습니다."}</small>
            <select data-game-select="${match.id}" ${!match.confirmed ? "disabled" : ""}>${gameOptions}</select>
            <button class="secondary-button" type="button" data-recommend-game="${match.id}" ${!needsReveal ? "disabled" : ""}>랜덤 추천</button>
            ${
              isManualReveal
                ? `<button class="secondary-button danger-button" type="button" data-hide-game="${match.id}">공개 취소</button>`
                : isAutoReveal
                  ? `<button class="secondary-button" type="button" disabled>자동 공개됨</button>`
                  : `<button class="secondary-button" data-reveal="${match.id}" ${!needsReveal ? "disabled" : ""}>선택 게임 예약</button>`
            }
          </div>
          <div class="ops-action-group ops-action-group-result">
            <span>결과/환불</span>
            <select data-winner-select="${match.id}" ${!match.confirmed ? "disabled" : ""}>${winnerOptions}</select>
            ${
              resultRecorded
                ? `<button class="secondary-button danger-button" type="button" data-clear-result="${match.id}">결과 취소</button>`
                : `<button class="secondary-button" data-result="${match.id}" ${!match.confirmed ? "disabled" : ""}>결과 입력</button>`
            }
            <small>결과는 여기서 입력하고, 환불은 참가자 행에서 사람별로 처리합니다.</small>
          </div>
          <div class="ops-action-group ops-action-group-copy compact">
            <span>복사</span>
            <button class="secondary-button" type="button" data-copy-contacts="${match.id}" ${!match.allPlayers.length ? "disabled" : ""}>연락처 복사</button>
            <button class="secondary-button" type="button" data-copy-promo="${match.id}">홍보 문구 복사</button>
          </div>
          <div class="ops-action-group ops-action-group-danger compact">
            <span>일정/삭제</span>
            <form class="match-schedule-form" data-update-match-schedule="${match.id}">
              <input name="matchId" type="hidden" value="${escapeHtml(match.id)}" />
              <input name="matchDate" type="date" value="${escapeHtml(scheduleDateValue)}" ${canDeleteMatch ? "" : "disabled"} required />
              <input name="time" type="time" value="${escapeHtml(match.time)}" ${canDeleteMatch ? "" : "disabled"} required />
              <input name="location" type="text" value="${escapeHtml(match.location)}" ${canDeleteMatch ? "" : "disabled"} required />
              <button class="secondary-button" type="submit" ${canDeleteMatch ? "" : "disabled"}>일정 저장</button>
            </form>
            <button class="secondary-button danger-button" type="button" data-delete-match="${match.id}" ${
              canDeleteMatch ? "" : "disabled"
            }>매치 삭제</button>
            <small>${canDeleteMatch ? "신청 이력 없는 매치만 삭제됩니다." : "신청, 결과, 문자 이력이 있으면 삭제할 수 없습니다."}</small>
          </div>
        </div>
      </div>
      ${
        cancelRequestPlayers.length
          ? `<div class="ops-warning-card ops-cancel-request-card">
              <strong>취소 요청 ${cancelRequestPlayers.length}건</strong>
              <span>${cancelRequestPlayers
                .map((player) => `${player.nickname}: ${player.paymentStatus === "cancel_requested_paid" ? "입금 완료, 승인 시 환불 요청" : "입금 전, 승인 시 신청 취소"}`)
                .join(" · ")}</span>
            </div>`
          : ""
      }
      ${
        needsVenue
          ? `<div class="ops-warning-card">
              <strong>정확한 장소 미입력</strong>
              <span>확정된 매치입니다. 게임 안내 문자 발송 전 정확한 카페 장소를 입력해 주세요.</span>
            </div>`
          : ""
      }
      ${
        needsReveal
          ? `<div class="recommendation-box">
              <span class="status-pill revealed-pill">랜덤 추천</span>
              <div>
                <strong>${recommendedGame ? recommendedGame.title : "아직 추천된 게임 없음"}</strong>
                <p>${
                  recommendedGame
                    ? `${recommendedGame.summary} 선택 게임 예약 후 시작 24시간 전에 자동 공개됩니다.`
                    : "랜덤 추천 버튼을 누르면 사이트가 게임을 하나 고릅니다. 마음에 들면 게임 공개, 아니면 다시 추천하거나 선택창에서 직접 바꿔 공개할 수 있습니다."
                }</p>
              </div>
            </div>`
          : ""
      }
      <div class="admin-note-box">
        <label for="exact-venue-${match.id}">정확한 장소</label>
        <input id="exact-venue-${match.id}" data-exact-venue-input="${match.id}" maxlength="160" value="${escapeHtml(
          exactMatchVenue(match),
        )}" placeholder="예: 신촌 ○○카페 2층, 예약자 구원근" />
        <div>
          <span>게임 공개 시점부터 참가자에게 보이고, 게임 공개 안내 문자에도 들어갑니다.</span>
          <button class="secondary-button" type="button" data-save-exact-venue="${match.id}">장소 저장</button>
        </div>
      </div>
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
  const settings = siteSettings();
  const feeText = participationFeeText();
  const normalFeeText = regularFeeText();
  const activeApplicants = match.allPlayers.filter((player) => !player.cancelled);
  const paymentPendingPlayers = activeApplicants.filter((player) => player.paymentStatus === "payment_pending");
  const cancelRequestPlayers = match.allPlayers.filter((player) =>
    ["cancel_requested_pending", "cancel_requested_paid"].includes(player.paymentStatus),
  );
  const refundRequestedPlayers = match.allPlayers.filter((player) => player.paymentStatus === "refund_requested");
  const refundScheduledPlayers = match.allPlayers.filter((player) => player.paymentStatus === "refund_scheduled");
  const refundedPlayers = match.allPlayers.filter((player) => player.paymentStatus === "refunded");
  const targetedMessageKey = (baseKey, players) =>
    `${baseKey}:${players
      .map((player) => player.memberId)
      .sort()
      .join(",")}`;
  const targetLabel = (players) => `대상 ${players.map((player) => player.nickname).join(", ")}`;

  if (!match.confirmed) {
    messages.push({
      key: "recruiting",
      type: "모집 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${publicMatchLocation(match)} 1:1 두뇌 서바이벌 매치 신청을 받고 있습니다. 2명이 모이면 확정됩니다. ${exactVenueNotice()} 신청: ${siteUrl}`,
    });
  }

  if (paymentPendingPlayers.length) {
    messages.push({
      key: "payment-guide",
      type: "입금 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${publicMatchLocation(match)} 참가 신청이 접수되었습니다. 정상 참가비는 ${normalFeeText}이고 현재 참가비는 ${feeText}입니다. ${account}으로 입금해 주세요. ${settings.drinkFeeNotice}. ${exactVenueNotice()} 입금자명은 ${settings.depositNameGuide}로 보내주세요. 대상: ${paymentPendingPlayers.map((player) => player.nickname).join(", ")}`,
    });
  }

  if (match.confirmed) {
    const names = match.players.map((player) => player.nickname).join(" vs ");
    messages.push({
      key: "confirmed",
      type: "매치 확정 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${publicMatchLocation(match)} 1:1 매치가 확정되었습니다. 참가자: ${names}. 게임과 정확한 장소는 시작 24시간 전에 함께 공개됩니다.`,
    });
  }

  if (match.confirmed && match.gameRevealed && match.game) {
    messages.push({
      key: "game-revealed",
      type: "게임 공개 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${publicMatchLocation(match)} 매치의 게임은 "${match.game.title}"입니다. ${gameRevealVenueNotice(match)} 사이트 게임 목록에서 규칙을 확인해 주세요. ${siteUrl}`,
    });
  }

  if (match.playerCount === 1 && match.players[0]) {
    messages.push({
      key: "refund-pending",
      type: "미달 환불 안내",
      body: `[1VS1매치] ${match.date} ${match.time} 매치가 ${settings.refundPolicy} 기준에 해당하면 참가비 ${feeText}이 환불 처리됩니다. 현재 신청자: ${match.players[0].nickname}.`,
    });
  }

  if (cancelRequestPlayers.length) {
    messages.push({
      key: targetedMessageKey("cancel-request-received", cancelRequestPlayers),
      type: "취소 요청 접수",
      targetLabel: targetLabel(cancelRequestPlayers),
      body: `[1VS1매치] ${match.date} ${match.time} ${publicMatchLocation(match)} 매치 신청 취소 요청이 접수되었습니다. 대상: ${cancelRequestPlayers.map((player) => player.nickname).join(", ")}. 운영자 확인 후 입금 전 신청은 취소 처리되고, 입금 완료 신청은 환불 요청으로 전환됩니다.`,
    });
  }

  if (refundRequestedPlayers.length) {
    messages.push({
      key: targetedMessageKey("refund-requested-guide", refundRequestedPlayers),
      type: "환불 요청 안내",
      targetLabel: targetLabel(refundRequestedPlayers),
      body: `[1VS1매치] ${match.date} ${match.time} ${publicMatchLocation(match)} 매치 환불 요청 대상 안내입니다. 대상: ${refundRequestedPlayers.map((player) => player.nickname).join(", ")}. 참가비 ${feeText} 환불을 순차 처리하겠습니다. 실제 송금 완료 후 다시 안내드리겠습니다.`,
    });
  }

  if (refundScheduledPlayers.length) {
    messages.push({
      key: targetedMessageKey("refund-scheduled-guide", refundScheduledPlayers),
      type: "환불 예정 안내",
      targetLabel: targetLabel(refundScheduledPlayers),
      body: `[1VS1매치] ${match.date} ${match.time} ${publicMatchLocation(match)} 매치 환불 예정 안내입니다. 대상: ${refundScheduledPlayers.map((player) => player.nickname).join(", ")}. 참가비 ${feeText} 환불이 예약되어 있으며, 실제 송금 완료 후 완료 안내를 드리겠습니다.`,
    });
  }

  if (refundedPlayers.length) {
    messages.push({
      key: targetedMessageKey("refund-completed-guide", refundedPlayers),
      type: "환불 완료 안내",
      targetLabel: targetLabel(refundedPlayers),
      body: `[1VS1매치] ${match.date} ${match.time} ${publicMatchLocation(match)} 매치 환불 완료 안내입니다. 대상: ${refundedPlayers.map((player) => player.nickname).join(", ")}. 참가비 ${feeText} 환불 처리가 완료되었습니다.`,
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

  const settings = siteSettings();
  const statusLine = match.confirmed ? "현재 매치 확정" : `현재 ${match.playerCount}/2명 신청`;
  return [
    "[1VS1매치 참가자 모집]",
    "",
    `${match.date} ${match.time}`,
    `${publicMatchLocation(match)}`,
    statusLine,
    "",
    "두 명이 모이면 1:1 두뇌 서바이벌 게임이 열립니다.",
    "게임과 정확한 장소는 매치 24시간 전에 함께 공개됩니다.",
    `정상 참가비 ${regularFeeText()}, 현재 참가비 ${participationFeeText()}`,
    `${settings.drinkFeeNotice}, ${settings.refundPolicy}`,
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
  const submitButton = form.querySelector("button[type='submit']");
  const previousContent = submitButton?.innerHTML;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = "처리 중...";
  }

  try {
    return await request(path, {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = previousContent;
      renderIcons();
    }
  }
}

function validateRequiredFormFields(form, fields) {
  clearFormError(form);

  for (const [name, label] of fields) {
    const field = form.elements[name];
    if (field && typeof field.value === "string") {
      field.value = field.value.trim();
    }

    if (!field?.value) {
      setFormError(form, `${label}을 입력해 주세요.`, field);
      return false;
    }
  }

  return true;
}

function validateBrowserRequiredFields(form) {
  if (typeof form.reportValidity !== "function") return true;
  return form.reportValidity();
}

function enhanceSignupRequiredUi() {
  const form = document.querySelector("#signupForm");
  if (!form) return;

  const intro = form.querySelector("p");
  if (intro && !form.querySelector(".required-form-note")) {
    const note = document.createElement("div");
    note.className = "required-form-note";
    note.textContent = "회원가입 항목은 모두 필수 입력입니다.";
    intro.insertAdjacentElement("afterend", note);
  }

  form.querySelectorAll("label:not(.check-line)").forEach((label) => {
    if (!label.querySelector("[required]") || label.querySelector(".required-badge")) return;

    const badge = document.createElement("span");
    badge.className = "required-badge";
    badge.textContent = "필수";
    label.append(badge);
  });
}

function clearFormError(form) {
  form.querySelectorAll(".field-error").forEach((node) => node.remove());
  form.querySelectorAll(".has-error").forEach((node) => node.classList.remove("has-error"));
}

function setFormError(form, message, field) {
  showToast(message);
  clearFormError(form);

  const targetField = field || null;
  targetField?.classList.add("has-error");
  const label = targetField?.closest("label");
  const error = document.createElement("span");
  error.className = "field-error";
  error.textContent = message;

  if (label) {
    label.append(error);
  } else {
    form.prepend(error);
  }

  targetField?.focus();
}

function inferErrorField(form, message) {
  if (/전화번호/.test(message)) return form.elements.phone;
  if (/닉네임/.test(message)) return form.elements.nickname;
  if (/생년월일/.test(message)) return form.elements.birthDate;
  if (/비밀번호 확인|확인 입력|일치/.test(message)) {
    return form.elements.passwordConfirm || form.elements.newPasswordConfirm;
  }
  if (/비밀번호/.test(message)) return form.elements.password || form.elements.newPassword || form.elements.currentPassword;
  if (/이름/.test(message)) return form.elements.realName;
  if (/활동지/.test(message)) return form.elements.area;
  if (/개인정보|동의/.test(message)) return form.elements.privacyConsent;
  return null;
}

function validateMemberIdentityFields(form) {
  if (form.elements.phone) {
    form.elements.phone.value = formatPhoneInput(form.elements.phone.value);
    if (!isValidPhoneInput(form.elements.phone.value)) {
      setFormError(form, "전화번호는 010으로 시작하는 휴대폰 번호로 입력해 주세요.", form.elements.phone);
      return false;
    }
  }

  if (form.elements.birthDate) {
    form.elements.birthDate.value = formatBirthDateInput(form.elements.birthDate.value);
    if (!isValidBirthDateInput(form.elements.birthDate.value)) {
      setFormError(form, "생년월일은 YYYY-MM-DD 형식의 실제 날짜로 입력해 주세요.", form.elements.birthDate);
      return false;
    }
  }

  return true;
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

document.querySelector("#userChip")?.addEventListener("click", () => {
  setActiveView("mypage");
});

document.querySelector("#userChip")?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  setActiveView("mypage");
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

document.querySelector("#ranking .segmented")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ranking-sort]");
  if (!button) return;

  activeRankingSort = button.dataset.rankingSort;
  renderRankings();
});

document.querySelector("#dateSelect")?.addEventListener("change", () => {
  isPaymentConfirmOpen = false;
  renderAuth();
  renderPaymentGuide();
  renderIcons();
});

function renderApplySelectionUpdate(nextStepIndex) {
  isPaymentConfirmOpen = false;
  renderMatches();
  renderAuth();
  renderPaymentGuide();
  renderIcons();
  if (Number.isInteger(nextStepIndex)) {
    scrollApplyStepIntoView(nextStepIndex);
  }
}

function stopApplySelectionEvent(event) {
  event.preventDefault?.();
  event.stopImmediatePropagation?.();
}

function handleApplyPointerSelection(event) {
  const areaButton = event.target.closest("[data-apply-area]");
  if (areaButton) {
    stopApplySelectionEvent(event);
    activeApplyArea = areaButton.dataset.applyArea;
    activeApplyDate = "";
    activeApplyTimeMatchId = "";
    activeApplyMonthKey = "";
    renderApplySelectionUpdate(1);
    return;
  }

  const dateButton = event.target.closest("[data-apply-date]");
  if (dateButton && !dateButton.disabled) {
    stopApplySelectionEvent(event);
    activeApplyDate = dateButton.dataset.applyDate;
    activeApplyTimeMatchId = "";
    renderApplySelectionUpdate(2);
    return;
  }

  const monthButton = event.target.closest("[data-apply-month]");
  if (monthButton && !monthButton.disabled && monthButton.dataset.applyMonth) {
    stopApplySelectionEvent(event);
    activeApplyMonthKey = monthButton.dataset.applyMonth;
    activeApplyDate = "";
    activeApplyTimeMatchId = "";
    renderApplySelectionUpdate();
    return;
  }

  const monthTab = event.target.closest("[data-apply-month-tab]");
  if (monthTab) {
    stopApplySelectionEvent(event);
    activeApplyMonthKey = monthTab.dataset.applyMonthTab;
    activeApplyDate = "";
    activeApplyTimeMatchId = "";
    renderApplySelectionUpdate();
    return;
  }

  const timeButton = event.target.closest("[data-apply-time]");
  if (timeButton && !timeButton.disabled) {
    stopApplySelectionEvent(event);
    activeApplyTimeMatchId = timeButton.dataset.applyTime;
    renderApplySelectionUpdate(3);
  }
}

document.addEventListener("touchstart", handleApplyPointerSelection, { capture: true, passive: false });
document.addEventListener("click", handleApplyPointerSelection, true);

document.addEventListener("click", (event) => {
  const mypageAuthButton = event.target.closest("[data-open-auth-from-mypage]");
  if (mypageAuthButton) {
    openAuthView();
    return;
  }

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
  scrollApplyStepIntoView(1);
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
  scrollApplyStepIntoView(2);
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
  const monthTab = event.target.closest("[data-apply-month-tab]");
  if (!monthTab) return;

  activeApplyMonthKey = monthTab.dataset.applyMonthTab;
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
  scrollApplyStepIntoView(3);
});

document.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-area-filter]");
  if (!filterButton) return;

  activeAreaFilter = filterButton.dataset.areaFilter;
  renderAreaFilters();
  renderMatches();
});

document.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-notice-area-filter]");
  if (!filterButton) return;

  activeNoticeAreaFilter = filterButton.dataset.noticeAreaFilter;
  renderNotices();
});

document.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-ops-filter]");
  if (!filterButton) return;

  activeOpsFilter = filterButton.dataset.opsFilter;
  activeOpsMatchId = null;
  renderAdmin();
});

document.addEventListener("click", (event) => {
  const sectionButton = event.target.closest("[data-admin-section]");
  if (!sectionButton) return;

  activeAdminSection = sectionButton.dataset.adminSection;
  renderAdminSections();
});

document.addEventListener("click", (event) => {
  const jumpButton = event.target.closest("[data-ops-jump]");
  if (!jumpButton) return;

  activeOpsFilter = jumpButton.dataset.opsJump;
  opsSearchQuery = "";
  opsDateFrom = "";
  opsDateTo = "";
  activeOpsMatchId = null;
  activeAdminSection = "matches";
  renderAdmin();
  document.querySelector("#opsList")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.addEventListener("click", (event) => {
  const gameSectionButton = event.target.closest("[data-admin-game-section]");
  if (gameSectionButton) {
    activeAdminGameSection = gameSectionButton.dataset.adminGameSection;
    renderAdminGameManager();
    return;
  }

  const categoryButton = event.target.closest("[data-admin-game-category]");
  if (!categoryButton) return;

  adminGameCategoryFilter = categoryButton.dataset.adminGameCategory;
  activeAdminGameId = null;
  activeAdminGameSection = "library";
  renderAdminGameManager();
});

document.addEventListener("click", (event) => {
  const gameButton = event.target.closest("[data-admin-game-select]");
  if (!gameButton) return;

  activeAdminGameId = gameButton.dataset.adminGameSelect;
  activeAdminGameSection = "library";
  renderAdminGameManager();
});

document.addEventListener("click", (event) => {
  const returnButton = event.target.closest("[data-return-admin-work]");
  if (returnButton) {
    if (restoreAdminReturnState()) {
      renderAdmin();
      window.setTimeout(() => {
        document.querySelector("#adminContent")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
    return;
  }

  const filterButton = event.target.closest("[data-event-log-filter]");
  if (!filterButton) return;

  activeEventLogFilter = filterButton.dataset.eventLogFilter;
  visibleEventCount = 8;
  renderEventLog();
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

document.addEventListener("input", (event) => {
  if (event.target.id !== "adminGameSearchInput") return;

  const cursorPosition = event.target.selectionStart;
  adminGameSearchQuery = event.target.value;
  activeAdminGameId = null;
  activeAdminGameSection = "library";
  renderAdminGameManager();
  const input = document.querySelector("#adminGameSearchInput");
  input?.focus();
  input?.setSelectionRange(cursorPosition, cursorPosition);
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "eventLogSearchInput") return;

  const cursorPosition = event.target.selectionStart;
  eventLogSearchQuery = event.target.value;
  visibleEventCount = 8;
  renderEventLog();
  const input = document.querySelector("#eventLogSearchInput");
  input?.focus();
  input?.setSelectionRange(cursorPosition, cursorPosition);
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "memberSearchInput") return;

  const cursorPosition = event.target.selectionStart;
  memberSearchQuery = event.target.value;
  activeMemberId = null;
  renderMemberRoster();
  const input = document.querySelector("#memberSearchInput");
  input?.focus();
  input?.setSelectionRange(cursorPosition, cursorPosition);
});

document.addEventListener("input", (event) => {
  const editableForm = event.target.closest("form");
  if (editableForm) clearFormError(editableForm);

  if (
    !event.target.closest("[data-update-member]") &&
    !event.target.closest("#signupForm") &&
    !event.target.closest("#loginForm") &&
    !event.target.closest("#profileEditForm") &&
    !event.target.closest("#resetForm")
  ) {
    return;
  }

  if (event.target.name === "phone") {
    event.target.value = formatPhoneInput(event.target.value);
  }

  if (event.target.name === "birthDate") {
    event.target.value = formatBirthDateInput(event.target.value);
  }
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
  if (!validateBrowserRequiredFields(form)) return;

  const requiredFields = [
    ["nickname", "닉네임"],
    ["realName", "이름"],
    ["birthDate", "생년월일"],
    ["phone", "전화번호"],
    ["area", "주 활동지"],
    ["password", "비밀번호"],
    ["passwordConfirm", "비밀번호 확인"],
  ];

  if (!validateRequiredFormFields(form, requiredFields)) return;
  if (!validateMemberIdentityFields(form)) return;

  if (!form.elements.privacyConsent.checked) {
    setFormError(form, "개인정보 수집 및 이용에 동의해 주세요.", form.elements.privacyConsent);
    return;
  }

  const password = form.elements.password.value;
  const passwordConfirm = form.elements.passwordConfirm.value;

  if (password !== passwordConfirm) {
    setFormError(form, "비밀번호와 비밀번호 확인이 일치하지 않습니다.", form.elements.passwordConfirm);
    return;
  }

  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    setFormError(form, "비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.", form.elements.password);
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
    setFormError(form, error.message, inferErrorField(form, error.message));
  }
});

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  form.elements.phone.value = formatPhoneInput(form.elements.phone.value);

  if (!isValidPhoneInput(form.elements.phone.value)) {
    setFormError(form, "전화번호는 010으로 시작하는 휴대폰 번호로 입력해 주세요.", form.elements.phone);
    return;
  }

  try {
    appState = await submitForm("/api/login", form);
    saveSession();
    isPaymentConfirmOpen = false;
    renderAll();
    closeAuthView();
    showToast("로그인되었습니다. 참가 신청을 진행할 수 있습니다.");
  } catch (error) {
    setFormError(form, error.message, inferErrorField(form, error.message));
  }
});

document.querySelector("#resetForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!validateMemberIdentityFields(form)) return;

  try {
    await submitForm("/api/request-password-reset", form);
    form.reset();
    showToast("비밀번호 초기화 요청이 운영자에게 전달되었습니다.");
  } catch (error) {
    setFormError(form, error.message, inferErrorField(form, error.message));
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
    setFormError(form, error.message, inferErrorField(form, error.message));
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
    setFormError(form, error.message, inferErrorField(form, error.message));
  }
});

document.querySelector("#bulkCreateMatchesForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    appState = await submitForm("/api/admin/bulk-create-matches", form);
    const summary = appState.bulkCreateSummary;
    renderAll();
    showToast(
      summary
        ? `월간 매치 ${summary.created}개를 생성했습니다. 중복 ${summary.skipped}개는 건너뛰었습니다.`
        : "월간 매치를 생성했습니다.",
    );
  } catch (error) {
    setFormError(form, error.message, inferErrorField(form, error.message));
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-update-match-schedule]");
  if (!form) return;

  event.preventDefault();

  try {
    const nextDate = form.elements.matchDate.value;
    const nextTime = form.elements.time.value;
    const nextLocation = form.elements.location.value.trim();
    appState = await submitForm("/api/admin/update-match-schedule", form);
    activeOpsMatchId =
      appState.matches.find(
        (match) => match.id.startsWith(`${nextDate}-${nextTime.replace(":", "")}`) && match.location === nextLocation,
      )?.id || null;
    renderAll();
    showToast("매치 일정을 수정했습니다.");
  } catch (error) {
    setFormError(form, error.message, inferErrorField(form, error.message));
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-create-game-form]");
  if (!form) return;

  event.preventDefault();

  try {
    appState = await submitForm("/api/admin/create-game", form);
    activeAdminGameSection = "library";
    form.reset();
    renderAll();
    showToast("새 게임을 추가했습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-update-game-form]");
  if (!form) return;

  event.preventDefault();

  try {
    appState = await submitForm(`/api/admin/update-game?gameId=${encodeURIComponent(form.dataset.updateGameForm)}`, form);
    activeAdminGameSection = "library";
    renderAll();
    showToast("게임 정보를 수정했습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("#siteSettingsForm");
  if (!form) return;

  event.preventDefault();

  try {
    appState = await submitForm("/api/admin/site-settings", form);
    renderAll();
    showToast("사이트 설정을 저장했습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-update-member]");
  if (!form) return;

  event.preventDefault();
  const requiredFields = [
    ["nickname", "닉네임"],
    ["realName", "이름"],
    ["birthDate", "생년월일"],
    ["phone", "전화번호"],
    ["area", "주 활동지"],
  ];

  if (!validateRequiredFormFields(form, requiredFields)) return;
  if (!validateMemberIdentityFields(form)) return;

  try {
    appState = await submitForm(`/api/admin/update-member?memberId=${encodeURIComponent(form.dataset.updateMember)}`, form);
    renderAll();
    showToast("회원 정보를 수정했습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("#profileEditForm");
  if (!form) return;

  event.preventDefault();
  const requiredFields = [
    ["nickname", "닉네임"],
    ["realName", "이름"],
    ["birthDate", "생년월일"],
    ["phone", "전화번호"],
    ["area", "주 활동지"],
  ];

  if (!validateRequiredFormFields(form, requiredFields)) return;
  if (!validateMemberIdentityFields(form)) return;

  try {
    appState = await submitForm("/api/update-profile", form);
    saveSession();
    renderAll();
    showToast("내 정보를 수정했습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("#passwordChangeForm");
  if (!form) return;

  event.preventDefault();

  const newPassword = form.elements.newPassword.value;
  const newPasswordConfirm = form.elements.newPasswordConfirm.value;

  if (newPassword !== newPasswordConfirm) {
    setFormError(form, "새 비밀번호와 확인 입력이 일치하지 않습니다.", form.elements.newPasswordConfirm);
    return;
  }

  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    setFormError(form, "비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.", form.elements.newPassword);
    return;
  }

  try {
    appState = await submitForm("/api/change-password", form);
    saveSession();
    form.reset();
    renderAll();
    showToast("비밀번호를 변경했습니다.");
  } catch (error) {
    setFormError(form, error.message, inferErrorField(form, error.message));
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

  const copyMigrationSqlButton = event.target.closest("[data-copy-migration-sql]");
  if (copyMigrationSqlButton) {
    const sql = migrationSqlMap[copyMigrationSqlButton.dataset.copyMigrationSql] || "";
    const copied = sql ? await copyText(sql) : false;
    showToast(copied ? "마이그레이션 SQL을 복사했습니다." : "복사할 SQL을 찾지 못했습니다.");
    return;
  }

  const adminExportButton = event.target.closest("[data-admin-export]");
  if (adminExportButton) {
    try {
      await downloadAdminExport(adminExportButton.dataset.adminExport);
      showToast("운영 데이터 파일을 내려받았습니다.");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const toggleGameHiddenButton = event.target.closest("[data-toggle-game-hidden]");
  if (toggleGameHiddenButton) {
    const game = appState.games.find((item) => item.id === toggleGameHiddenButton.dataset.toggleGameHidden);
    const nextState = game?.hidden ? "공개" : "숨김";
    if (!window.confirm(`${game?.title || "선택한 게임"}을(를) ${nextState} 상태로 변경할까요?\n기존 매치 예약 기록은 유지됩니다.`)) return;

    try {
      appState = await request("/api/admin/toggle-game-hidden", {
        method: "POST",
        body: JSON.stringify({ gameId: toggleGameHiddenButton.dataset.toggleGameHidden }),
      });
      focusAdminRiskLog();
      renderAll();
      scrollToAdminLog();
      showToast("게임 노출 상태를 변경했습니다.");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const memberDetailButton = event.target.closest("[data-member-detail]");
  if (memberDetailButton) {
    activeMemberId = memberDetailButton.dataset.memberDetail;
    activeMemberDetailSection = "summary";
    renderMemberRoster();
    return;
  }

  const memberDetailSectionButton = event.target.closest("[data-member-detail-section]");
  if (memberDetailSectionButton) {
    activeMemberDetailSection = memberDetailSectionButton.dataset.memberDetailSection;
    renderMemberDetail();
    return;
  }

  const closeMemberDetailButton = event.target.closest("[data-close-member-detail]");
  if (closeMemberDetailButton) {
    activeMemberId = null;
    activeMemberDetailSection = "summary";
    renderMemberRoster();
    return;
  }

  const deleteMemberButton = event.target.closest("[data-delete-member]");
  if (deleteMemberButton) {
    const memberId = deleteMemberButton.dataset.deleteMember;
    const member = (appState.members || []).find((item) => item.id === memberId);

    if (!member) {
      showToast("삭제할 회원을 찾을 수 없습니다.");
      return;
    }

    const confirmNickname = window.prompt(
      `${member.nickname} 회원을 완전히 삭제합니다.\n신청 이력과 입력된 경기 결과도 함께 정리됩니다.\n삭제하려면 회원 닉네임을 정확히 입력해 주세요.`,
    );

    if (confirmNickname === null) return;

    if (confirmNickname.trim() !== member.nickname) {
      showToast("닉네임이 일치하지 않아 삭제를 취소했습니다.");
      return;
    }

    try {
      appState = await request("/api/admin/delete-member", {
        method: "POST",
        body: JSON.stringify({ memberId, confirmNickname }),
      });
      activeMemberId = null;
      focusAdminRiskLog();
      renderAll();
      scrollToAdminLog();
      showToast(`${member.nickname} 회원을 완전히 삭제했습니다.`);
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const resetMemberPasswordButton = event.target.closest("[data-reset-member-password]");
  if (resetMemberPasswordButton) {
    const memberId = resetMemberPasswordButton.dataset.resetMemberPassword;
    const member = (appState.members || []).find((item) => item.id === memberId);
    const newPassword = window.prompt(
      `${member?.nickname || "회원"}의 비밀번호를 초기화합니다.\n전화번호: ${member?.phone || "확인 불가"}\n새 임시 비밀번호를 입력해 주세요.`,
    );

    if (newPassword === null) return;

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      showToast("임시 비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.");
      return;
    }

    try {
      appState = await request("/api/admin/reset-member-password", {
        method: "POST",
        body: JSON.stringify({ memberId, newPassword }),
      });
      focusAdminRiskLog();
      renderAll();
      scrollToAdminLog();
      showToast("회원 비밀번호를 초기화했습니다. 임시 비밀번호를 회원에게 전달해 주세요.");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const logoutButton = event.target.closest("[data-logout-button]");
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

  const toggleAdminMessageButton = event.target.closest("[data-toggle-admin-message]");
  if (toggleAdminMessageButton) {
    const messageKey = toggleAdminMessageButton.dataset.toggleAdminMessage;
    if (expandedAdminMessageKeys.has(messageKey)) {
      expandedAdminMessageKeys.delete(messageKey);
    } else {
      expandedAdminMessageKeys.add(messageKey);
    }
    renderAdmin();
    return;
  }

  const deleteMatchButton = event.target.closest("[data-delete-match]");
  if (deleteMatchButton) {
    const matchId = deleteMatchButton.dataset.deleteMatch;
    const match = appState.matches.find((candidate) => candidate.id === matchId);
    if (!match) {
      showToast("삭제할 매치를 찾을 수 없습니다.");
      return;
    }

    if (!window.confirm(`${adminMatchLabel(match)} 매치를 삭제할까요?\n신청 이력이 있는 매치는 삭제되지 않습니다.`)) {
      return;
    }

    try {
      appState = await request("/api/admin/delete-match", {
        method: "POST",
        body: JSON.stringify({ matchId }),
      });
      activeOpsMatchId = null;
      focusAdminRiskLog();
      renderAll();
      scrollToAdminLog();
      showToast("매치를 삭제했습니다.");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const openAdminGameNewButton = event.target.closest("[data-open-admin-game-new]");
  if (openAdminGameNewButton) {
    openGameAdminEditor(null, "new");
    return;
  }

  const openAdminSiteSettingsButton = event.target.closest("[data-open-admin-site-settings]");
  if (openAdminSiteSettingsButton) {
    openAdminSiteSettings();
    return;
  }

  const openAdminGameEditorButton = event.target.closest("[data-open-admin-game-editor]");
  if (openAdminGameEditorButton) {
    openGameAdminEditor(openAdminGameEditorButton.dataset.openAdminGameEditor, "library");
    return;
  }

  const pageToggleGameHiddenButton = event.target.closest("[data-page-toggle-game-hidden]");
  if (pageToggleGameHiddenButton) {
    const game = appState.games.find((item) => item.id === pageToggleGameHiddenButton.dataset.pageToggleGameHidden);
    const nextState = game?.hidden ? "공개" : "숨김";
    if (!window.confirm(`${game?.title || "선택한 게임"}을(를) ${nextState} 처리할까요?`)) return;

    try {
      appState = await request("/api/admin/toggle-game-hidden", {
        method: "POST",
        body: JSON.stringify({ gameId: pageToggleGameHiddenButton.dataset.pageToggleGameHidden }),
      });
      renderAll();
      renderGames(activeGameId, { detail: isGameDetailOpen });
      showToast("게임 공개 상태를 변경했습니다.");
    } catch (error) {
      showToast(error.message);
    }
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

  const saveExactVenueButton = event.target.closest("[data-save-exact-venue]");
  if (saveExactVenueButton) {
    const matchId = saveExactVenueButton.dataset.saveExactVenue;
    const exactVenue = document.querySelector(`[data-exact-venue-input="${matchId}"]`)?.value || "";
    appState = await request("/api/update-match-venue", {
      method: "POST",
      body: JSON.stringify({ matchId, exactVenue }),
    });
    renderAll();
    showToast("정확한 장소를 저장했습니다.");
  }

  const cancelApplicationButton = event.target.closest("[data-cancel-application]");
  if (cancelApplicationButton) {
    const matchId = cancelApplicationButton.dataset.cancelApplication;
    const match = appState.matches.find((candidate) => candidate.id === matchId);
    const application = match?.allPlayers?.find((player) => player.memberId === appState.user?.id);
    const paymentLabel = applicationPaymentLabel(application);
    const confirmMessage = [
      `${match ? `${match.date} ${match.time} ${displayMatchLocation(match)}` : "선택한 매치"} 신청 취소 요청을 보낼까요?`,
      "",
      `현재 상태: ${paymentLabel}`,
      application?.paymentStatus === "paid"
        ? "입금 확인 완료 건은 운영자 승인 후 환불 요청 상태로 전환됩니다."
        : "입금 전 신청은 운영자 승인 후 신청 취소로 처리됩니다.",
      "카페 음료비 등 별도 비용은 환불 대상이 아닙니다.",
    ].join("\n");

    if (!window.confirm(confirmMessage)) return;

    appState = await request("/api/cancel-application", {
      method: "POST",
      body: JSON.stringify({ matchId }),
    });
    renderAll();
    showToast("신청 취소 요청을 보냈습니다. 운영자 확인 후 처리됩니다.");
  }

  const approveCancelRequestButton = event.target.closest("[data-approve-cancel-request]");
  if (approveCancelRequestButton) {
    if (!window.confirm("취소 요청을 승인할까요? 입금 완료 건은 환불 요청 상태로 넘어갑니다.")) return;

    appState = await request("/api/admin/approve-cancel-request", {
      method: "POST",
      body: JSON.stringify({
        matchId: approveCancelRequestButton.dataset.approveCancelRequest,
        memberId: approveCancelRequestButton.dataset.memberId,
      }),
    });
    focusAdminRiskLog();
    renderAll();
    scrollToAdminLog();
    showToast("취소 요청을 승인했습니다.");
  }

  const rejectCancelRequestButton = event.target.closest("[data-reject-cancel-request]");
  if (rejectCancelRequestButton) {
    if (!window.confirm("취소 요청을 반려하고 기존 신청 상태로 되돌릴까요?")) return;

    appState = await request("/api/admin/reject-cancel-request", {
      method: "POST",
      body: JSON.stringify({
        matchId: rejectCancelRequestButton.dataset.rejectCancelRequest,
        memberId: rejectCancelRequestButton.dataset.memberId,
      }),
    });
    focusAdminRiskLog();
    renderAll();
    scrollToAdminLog();
    showToast("취소 요청을 반려했습니다.");
  }

  const completePaymentButton = event.target.closest("[data-complete-payment]");
  if (completePaymentButton) {
    if (!window.confirm("입금 확인 완료로 처리할까요?")) return;

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
    const match = appState.matches.find((candidate) => candidate.id === undoPaymentButton.dataset.undoPayment);
    if (
      !window.confirm(
        `${adminPlayerLabel(match, undoPaymentButton.dataset.memberId)}의 입금 확인을 취소할까요?\n매치: ${adminMatchLabel(match)}\n상태는 입금 대기로 되돌아갑니다.`,
      )
    )
      return;

    appState = await request("/api/undo-payment", {
      method: "POST",
      body: JSON.stringify({
        matchId: undoPaymentButton.dataset.undoPayment,
        memberId: undoPaymentButton.dataset.memberId,
      }),
    });
    focusAdminRiskLog();
    renderAll();
    scrollToAdminLog();
    showToast("입금 확인을 취소했습니다.");
  }

  const revealButton = event.target.closest("[data-reveal]");
  if (revealButton) {
    if (!window.confirm("선택한 게임을 예약할까요? 참가자에게는 시작 24시간 전에 자동 공개됩니다.")) return;

    const matchId = revealButton.dataset.reveal;
    const gameId = document.querySelector(`[data-game-select="${matchId}"]`).value;
    appState = await request("/api/reveal-game", {
      method: "POST",
      body: JSON.stringify({ matchId, gameId }),
    });
    renderAll();
    showToast("선택한 게임을 예약했습니다. 시작 24시간 전에 자동 공개됩니다.");
  }

  const hideGameButton = event.target.closest("[data-hide-game]");
  if (hideGameButton) {
    const match = appState.matches.find((candidate) => candidate.id === hideGameButton.dataset.hideGame);
    if (!window.confirm(`${adminMatchLabel(match)}의 공개된 게임을 다시 비공개로 되돌릴까요?\n현재 게임: ${match?.game?.title || "없음"}`)) return;

    appState = await request("/api/hide-game", {
      method: "POST",
      body: JSON.stringify({ matchId: hideGameButton.dataset.hideGame }),
    });
    focusAdminRiskLog();
    renderAll();
    scrollToAdminLog();
    showToast("게임 공개를 취소했습니다.");
  }

  const recommendGameButton = event.target.closest("[data-recommend-game]");
  if (recommendGameButton) {
    appState = await request("/api/recommend-game", {
      method: "POST",
      body: JSON.stringify({ matchId: recommendGameButton.dataset.recommendGame }),
    });
    renderAll();
    showToast("랜덤 추천 게임을 지정했습니다. 시작 24시간 전에 자동 공개됩니다.");
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
    const match = appState.matches.find((candidate) => candidate.id === clearResultButton.dataset.clearResult);
    if (!window.confirm(`${adminMatchLabel(match)}의 입력된 결과를 취소할까요?\n랭킹 반영도 함께 되돌립니다.`)) return;

    appState = await request("/api/clear-result", {
      method: "POST",
      body: JSON.stringify({ matchId: clearResultButton.dataset.clearResult }),
    });
    focusAdminRiskLog();
    renderAll();
    scrollToAdminLog();
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
    const matchId = messageSentButton.dataset.messageSent;
    const messageKey = messageSentButton.dataset.messageKey;
    const match = appState.matches.find((candidate) => candidate.id === matchId);

    if (messageKey === "game-revealed" && match && !exactMatchVenue(match)) {
      const confirmed = window.confirm(
        "정확한 장소가 아직 저장되지 않았습니다. 게임 공개 안내 문자 발송 완료로 체크할까요?",
      );
      if (!confirmed) return;
    }

    appState = await request("/api/mark-message-sent", {
      method: "POST",
      body: JSON.stringify({
        matchId,
        messageKey,
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

  const refundButton = event.target.closest("[data-refund-member]");
  if (refundButton) {
    const match = appState.matches.find((candidate) => candidate.id === refundButton.dataset.refundMember);
    if (
      !window.confirm(
        `${adminPlayerLabel(match, refundButton.dataset.memberId)}의 환불 송금을 완료 상태로 체크할까요?\n매치: ${adminMatchLabel(match)}\n실제 송금 여부를 먼저 확인해 주세요.`,
      )
    )
      return;

    appState = await request("/api/refund", {
      method: "POST",
      body: JSON.stringify({
        matchId: refundButton.dataset.refundMember,
        memberId: refundButton.dataset.memberId,
      }),
    });
    focusAdminRiskLog();
    renderAll();
    scrollToAdminLog();
    showToast("참가자 환불 완료 상태로 체크했습니다.");
  }

  const undoRefundButton = event.target.closest("[data-undo-refund-member]");
  if (undoRefundButton) {
    const match = appState.matches.find((candidate) => candidate.id === undoRefundButton.dataset.undoRefundMember);
    if (
      !window.confirm(
        `${adminPlayerLabel(match, undoRefundButton.dataset.memberId)}의 환불 완료 상태를 되돌릴까요?\n매치: ${adminMatchLabel(match)}\n상태는 입금 확인 완료로 돌아갑니다.`,
      )
    )
      return;

    appState = await request("/api/undo-refund", {
      method: "POST",
      body: JSON.stringify({
        matchId: undoRefundButton.dataset.undoRefundMember,
        memberId: undoRefundButton.dataset.memberId,
      }),
    });
    focusAdminRiskLog();
    renderAll();
    scrollToAdminLog();
    showToast("참가자 환불 상태를 되돌렸습니다.");
  }
});

enhanceSignupRequiredUi();
loadState().catch((error) => showToast(error.message));
