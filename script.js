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
let activeAreaFilter = "all";
let activeOpsFilter = "all";

function formatPhoneInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
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

async function loadState() {
  appState = await request("/api/state");
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

function renderPaymentGuide() {
  const guide = document.querySelector("#bankGuide");
  if (!guide) return;

  guide.innerHTML = `
    <strong>참가비 1,000원 계좌이체</strong>
    <span>${appState.payment?.bankAccountLabel || "운영자 공지 예정"}</span>
    <small>입금자명은 회원가입 닉네임과 같게 보내주세요. 운영자가 입금 확인 후 매치가 확정됩니다.</small>
  `;
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

  if (!appState.isAuthenticated) {
    userChip.innerHTML = `
      <span class="avatar">?</span>
      <div>
        <strong>로그인 필요</strong>
        <span>신청 전 회원 인증</span>
      </div>
    `;
    return;
  }

  const user = appState.user;
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

  if (!appState.isAuthenticated) {
    guestAuth.hidden = false;
    memberCard.hidden = true;
    applyButton.disabled = true;
    dateSelect.disabled = true;
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
  dateSelect.disabled = false;
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
                    ? `<span>입금 계좌: ${appState.payment?.bankAccountLabel || "운영자 공지 예정"}</span>`
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
  const select = document.querySelector("#dateSelect");
  const submitButton = document.querySelector("#applyForm button[type='submit']");
  const matches = visibleMatches();

  grid.innerHTML = matches.length
    ? matches
    .map(
      (match) => `
        <article class="match-card ${match.appliedByMe ? "mine" : ""}">
          <span class="status-pill ${match.status}">${match.appliedByMe ? "내 신청" : match.statusLabel}</span>
          <strong>${match.date}</strong>
          <p>${match.time} · ${match.location}</p>
          <div class="slots" aria-label="참가 슬롯">
            <span class="slot ${match.playerCount >= 1 ? "filled" : ""}"></span>
            <span class="slot ${match.playerCount >= 2 ? "filled" : ""}"></span>
          </div>
          <span>${match.playerCount}/2명 신청</span>
        </article>
      `,
    )
    .join("")
    : `<article class="match-card empty-state"><strong>표시할 매치가 없습니다</strong><p>다른 활동지를 선택해 주세요.</p></article>`;

  const available = matches.filter((match) => match.playerCount < 2 && !match.appliedByMe);
  select.innerHTML = available
    .map((match) => `<option value="${match.id}">${match.date} ${match.time} · ${match.playerCount}/2명</option>`)
    .join("");

  if (!available.length) {
    select.innerHTML = `<option value="">신청 가능한 날짜 없음</option>`;
    submitButton.disabled = true;
    select.disabled = true;
  } else {
    submitButton.disabled = !appState.isAuthenticated;
    select.disabled = !appState.isAuthenticated;
  }
}

function renderNotices() {
  const confirmedMatches = appState.matches.filter((match) => match.confirmed);

  document.querySelector("#noticeBoard").innerHTML = confirmedMatches
    .map((match) => {
      const gameLabel = match.gameRevealed && match.game ? match.game.title : "게임 공개 대기";
      const gameBody =
        match.gameRevealed && match.game
          ? `${match.game.summary} 이번 매치의 상세 규칙이 공개되었습니다.`
          : "시작 24시간 전에 운영자가 게임과 규칙을 공개합니다.";
      const playerNames = match.players.map((player) => player.nickname);

      return `
        <article class="notice-main">
          <div class="status-pill ${match.gameRevealed ? "revealed-pill" : "confirmed"}">${gameLabel}</div>
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

function renderGames(gameId) {
  activeGameId = gameId;
  const activeGame = appState.games.find((game) => game.id === gameId) || appState.games[0];

  document.querySelector("#gameList").innerHTML = appState.games
    .map(
      (game) => `
        <button class="game-card ${game.id === activeGame.id ? "active" : ""}" data-game="${game.id}">
          <strong>${game.title}</strong>
          <span>${game.summary}</span>
        </button>
      `,
    )
    .join("");

  document.querySelector("#gameDetail").innerHTML = `
    <div class="game-detail-header">
      <span class="status-pill revealed-pill">운영 게임</span>
      <h3>${activeGame.title}</h3>
      <p>${activeGame.summary}</p>
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
    ["오늘 신규 신청", appState.metrics.todayApplications],
    ["확정 매치", appState.metrics.confirmed],
    ["환불 검토", appState.metrics.refundTargets],
    ["게임 공개 대기", appState.metrics.revealWaiting],
  ];

  document.querySelector("#adminMetrics").innerHTML = metrics
    .map(
      ([label, value]) => `
        <article class="metric">
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `,
    )
    .join("");

  renderOpsList();

  document.querySelector("#eventLog").innerHTML = `
    <h3>운영 로그</h3>
    <ul>
      ${appState.events.map((event) => `<li>${event}</li>`).join("")}
    </ul>
  `;
}

function filteredOpsMatches() {
  return appState.matches.filter((match) => {
    if (activeOpsFilter === "payment") {
      return match.allPlayers.some((player) => player.paymentStatus === "payment_pending" && !player.cancelled);
    }

    if (activeOpsFilter === "confirmed") return match.confirmed;
    if (activeOpsFilter === "reveal") return match.confirmed && !match.gameRevealed;
    if (activeOpsFilter === "refund") {
      return match.allPlayers.some((player) => ["refund_requested", "refund_scheduled"].includes(player.paymentStatus));
    }

    return true;
  });
}

function renderOpsList() {
  const opsFilters = [
    { value: "all", label: "전체" },
    { value: "payment", label: "입금 대기" },
    { value: "confirmed", label: "확정" },
    { value: "reveal", label: "게임 공개 대기" },
    { value: "refund", label: "환불 필요" },
  ];
  const filteredMatches = filteredOpsMatches();
  const filterMarkup = `
    <div class="ops-filter segmented">
      ${opsFilters
        .map(
          (filter) => `
            <button class="${filter.value === activeOpsFilter ? "selected" : ""}" type="button" data-ops-filter="${filter.value}">
              ${filter.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
  const matchesMarkup = filteredMatches.length
    ? filteredMatches.map(renderOpsCard).join("")
    : `<article class="ops-card empty-state"><strong>해당 상태의 매치가 없습니다</strong><p>다른 필터를 선택해 주세요.</p></article>`;

  document.querySelector("#opsList").innerHTML = filterMarkup + matchesMarkup;
}

function renderOpsCard(match) {
  const needsReveal = match.confirmed && !match.gameRevealed;
  const needsRefund = match.allPlayers.some((player) => ["refund_requested", "refund_scheduled"].includes(player.paymentStatus));
  const resultRecorded = Boolean(match.result);
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
              </span>
            </div>
          `;
        })
        .join("")
    : `<div class="participant-empty">아직 신청자가 없습니다.</div>`;
  const messageText = buildAdminMessage(match);
  const messageSent = match.notificationLog?.includes(messageText.key);

  return `
    <article class="ops-card">
      <div class="ops-main">
        <div>
          <h3>${match.date} ${match.time}</h3>
          <p>${match.location} · ${match.playerCount}/2명 · ${match.statusLabel}${resultRecorded ? " · 결과 입력됨" : ""}</p>
        </div>
        <div class="ops-actions">
          <select data-game-select="${match.id}" ${!match.confirmed ? "disabled" : ""}>${gameOptions}</select>
          <button class="secondary-button" data-reveal="${match.id}" ${!needsReveal ? "disabled" : ""}>운영자 지정 공개</button>
          <button class="secondary-button" type="button" data-recommend-game="${match.id}" ${!needsReveal ? "disabled" : ""}>랜덤 추천</button>
          <button class="secondary-button" type="button" data-reveal-recommended="${match.id}" ${!recommendedGame ? "disabled" : ""}>추천 공개</button>
          <select data-winner-select="${match.id}" ${!match.confirmed ? "disabled" : ""}>${winnerOptions}</select>
          <button class="secondary-button" data-result="${match.id}" ${!match.confirmed ? "disabled" : ""}>결과 입력</button>
          <button class="secondary-button" data-refund="${match.id}" ${!needsRefund ? "disabled" : ""}>환불 예약</button>
          <button class="secondary-button" type="button" data-copy-contacts="${match.id}" ${!match.allPlayers.length ? "disabled" : ""}>연락처 복사</button>
          <button class="secondary-button" type="button" data-copy-promo="${match.id}">홍보 문구 복사</button>
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
                    ? `${recommendedGame.summary} 운영자가 추천 공개를 눌러야 참가자에게 공지됩니다.`
                    : "랜덤 추천 버튼을 누르면 사이트가 게임을 하나 고릅니다. 마음에 들면 추천 공개, 아니면 다시 추천하거나 운영자 지정 공개를 사용할 수 있습니다."
                }</p>
              </div>
            </div>`
          : ""
      }
      <div class="participant-list">
        <div class="participant-head">
          <span>닉네임</span>
          <span>전화번호</span>
          <span>활동지</span>
          <span>결제</span>
        </div>
        ${participantList}
      </div>
      <div class="message-preview">
        <div>
          <div>
            <strong>문자 알림 문구</strong>
            <span>${messageText.type}${messageSent ? " · 발송 완료" : ""}</span>
          </div>
          <div class="message-actions">
            <button class="secondary-button" type="button" data-copy-message>문구 복사</button>
            <button class="secondary-button" type="button" data-message-sent="${match.id}" data-message-key="${messageText.key}" ${messageSent ? "disabled" : ""}>발송 완료 체크</button>
          </div>
        </div>
        <p>${messageText.body}</p>
      </div>
    </article>
  `;
}

function buildAdminMessage(match) {
  if (match.confirmed && match.gameRevealed && match.game) {
    return {
      key: "game-revealed",
      type: "게임 공개 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 매치의 게임은 "${match.game.title}"입니다. 웹 공지에서 규칙을 확인해 주세요.`,
    };
  }

  if (match.confirmed) {
    const names = match.players.map((player) => player.nickname).join(" vs ");
    return {
      key: "confirmed",
      type: "매치 확정 안내",
      body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 1:1 매치가 확정되었습니다. 참가자: ${names}. 게임은 시작 24시간 전에 공개됩니다.`,
    };
  }

  if (match.playerCount === 1) {
    const player = match.players[0];
    return {
      key: "refund-pending",
      type: "환불 예정 안내",
      body: `[1VS1매치] ${match.date} ${match.time} 매치가 마감 전까지 2명 미달이면 참가비 1,000원은 환불 처리됩니다. 현재 신청자: ${player.nickname}.`,
    };
  }

  return {
    key: "recruiting",
    type: "모집 안내",
    body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 1:1 두뇌 서바이벌 매치 신청을 받고 있습니다. 2명이 모이면 확정됩니다.`,
  };
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
    "참가비 1,000원, 2명 미달 시 환불",
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
    document.querySelectorAll(".nav-item, .view").forEach((node) => node.classList.remove("active"));
    item.classList.add("active");
    document.querySelector(`#${item.dataset.view}`).classList.add("active");
  });
});

document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-auth-tab], .auth-form").forEach((node) => node.classList.remove("selected", "active"));
    tab.classList.add("selected");
    document.querySelector(`#${tab.dataset.authTab}Form`).classList.add("active");
  });
});

document.querySelectorAll('input[type="tel"][name="phone"]').forEach((input) => {
  input.addEventListener("input", () => {
    input.value = formatPhoneInput(input.value);
  });
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
    renderAll();
    showToast("회원가입이 완료되었습니다. 이제 날짜만 선택해서 신청할 수 있습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    appState = await submitForm("/api/login", event.currentTarget);
    renderAll();
    showToast("로그인되었습니다. 참가 신청을 진행할 수 있습니다.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#applyForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    appState = await submitForm("/api/apply", event.currentTarget);
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

  const logoutButton = event.target.closest("#logoutButton");
  if (logoutButton) {
    appState = await request("/api/logout", { method: "POST", body: "{}" });
    renderAll();
    showToast("로그아웃되었습니다.");
  }

  const adminLogoutButton = event.target.closest("#adminLogoutButton");
  if (adminLogoutButton) {
    appState = await request("/api/admin-logout", { method: "POST", body: "{}" });
    renderAll();
    showToast("운영자 권한에서 로그아웃했습니다.");
  }

  const gameButton = event.target.closest("[data-game]");
  if (gameButton) {
    renderGames(gameButton.dataset.game);
  }

  const openGame = event.target.closest("[data-open-game]");
  if (openGame) {
    document.querySelector('[data-view="games"]').click();
    renderGames(openGame.dataset.openGame);
  }

  const cancelApplicationButton = event.target.closest("[data-cancel-application]");
  if (cancelApplicationButton) {
    const matchId = cancelApplicationButton.dataset.cancelApplication;
    appState = await request("/api/cancel-application", {
      method: "POST",
      body: JSON.stringify({ matchId }),
    });
    renderAll();
    showToast("신청을 취소했습니다. 참가비 1,000원은 환불 예정으로 처리됩니다.");
  }

  const completePaymentButton = event.target.closest("[data-complete-payment]");
  if (completePaymentButton) {
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

  const revealButton = event.target.closest("[data-reveal]");
  if (revealButton) {
    const matchId = revealButton.dataset.reveal;
    const gameId = document.querySelector(`[data-game-select="${matchId}"]`).value;
    appState = await request("/api/reveal-game", {
      method: "POST",
      body: JSON.stringify({ matchId, gameId }),
    });
    renderAll();
    showToast("게임과 규칙이 공지 화면에 공개되었습니다.");
  }

  const recommendGameButton = event.target.closest("[data-recommend-game]");
  if (recommendGameButton) {
    appState = await request("/api/recommend-game", {
      method: "POST",
      body: JSON.stringify({ matchId: recommendGameButton.dataset.recommendGame }),
    });
    renderAll();
    showToast("랜덤 추천 게임을 골랐습니다. 확인 후 추천 공개를 눌러주세요.");
  }

  const revealRecommendedButton = event.target.closest("[data-reveal-recommended]");
  if (revealRecommendedButton) {
    const matchId = revealRecommendedButton.dataset.revealRecommended;
    const match = appState.matches.find((candidate) => candidate.id === matchId);

    if (!match?.game) {
      showToast("먼저 랜덤 추천을 받아주세요.");
      return;
    }

    appState = await request("/api/reveal-game", {
      method: "POST",
      body: JSON.stringify({ matchId, gameId: match.game.id }),
    });
    renderAll();
    showToast("추천 게임을 공지 화면에 공개했습니다.");
  }

  const resultButton = event.target.closest("[data-result]");
  if (resultButton) {
    const matchId = resultButton.dataset.result;
    const winnerId = document.querySelector(`[data-winner-select="${matchId}"]`).value;
    appState = await request("/api/record-result", {
      method: "POST",
      body: JSON.stringify({ matchId, winnerId }),
    });
    renderAll();
    showToast("경기 결과를 저장했고 랭킹을 갱신했습니다.");
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

  const refundButton = event.target.closest("[data-refund]");
  if (refundButton) {
    const matchId = refundButton.dataset.refund;
    appState = await request("/api/refund", {
      method: "POST",
      body: JSON.stringify({ matchId }),
    });
    renderAll();
    showToast("미매칭 신청자의 1,000원 환불이 예약되었습니다.");
  }
});

loadState().catch((error) => showToast(error.message));
