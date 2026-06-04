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
let activeAreaFilter = "all";
let activeOpsFilter = "all";

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
};

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

function getGameTags(game) {
  return gameTagMap[game.id] || [];
}

function renderGames(gameId) {
  const searchInput = document.querySelector("#gameSearchInput");
  if (searchInput && searchInput.value !== gameSearchQuery) {
    searchInput.value = gameSearchQuery;
  }

  const query = gameSearchQuery.trim().toLowerCase();
  const visibleGames = query
    ? appState.games.filter((game) =>
        [game.title, game.summary, game.win, ...getGameTags(game), ...(game.rules || [])]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : appState.games;
  const activeGame =
    visibleGames.find((game) => game.id === gameId) ||
    visibleGames.find((game) => game.id === activeGameId) ||
    visibleGames[0] ||
    appState.games.find((game) => game.id === gameId) ||
    appState.games[0];

  activeGameId = activeGame?.id || null;

  document.querySelector("#gameList").innerHTML = visibleGames.length
    ? visibleGames
    .map(
      (game) => {
        const tags = getGameTags(game);
        return `
          <button class="game-card ${game.id === activeGame.id ? "active" : ""}" data-game="${game.id}">
            <strong>${game.title}</strong>
            <span>${game.summary}</span>
            ${tags.length ? `<div class="game-tags">${tags.map((tag) => `<small>${tag}</small>`).join("")}</div>` : ""}
          </button>
        `;
      },
    )
    .join("")
    : `<div class="game-empty">검색 결과가 없습니다. 다른 키워드로 찾아보세요.</div>`;

  if (!activeGame) {
    document.querySelector("#gameDetail").innerHTML = "";
    return;
  }

  const activeGameTags = getGameTags(activeGame);

  document.querySelector("#gameDetail").innerHTML = `
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
  const hasRefunded = match.allPlayers.some((player) => player.paymentStatus === "refunded");
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
    <article class="ops-card">
      <div class="ops-main">
        <div>
          <h3>${match.date} ${match.time}</h3>
          <p>${match.location} · ${match.playerCount}/2명 · ${match.statusLabel}${resultRecorded ? " · 결과 입력됨" : ""}</p>
        </div>
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
  const account = appState.payment?.bankAccountLabel || "카카오뱅크 3333-21-1861396 구원근";
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
      body: `[1VS1매치] ${match.date} ${match.time} ${match.location} 참가 신청이 접수되었습니다. 참가비 1,000원을 ${account}으로 입금해 주세요. 입금자명은 회원가입 닉네임과 같게 보내주세요. 대상: ${paymentPendingPlayers.map((player) => player.nickname).join(", ")}`,
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
      body: `[1VS1매치] ${match.date} ${match.time} 매치가 시작 24시간 전까지 2명 미달이면 참가비 1,000원이 환불 처리됩니다. 현재 신청자: ${match.players[0].nickname}.`,
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

document.querySelector("#gameSearchInput")?.addEventListener("input", (event) => {
  gameSearchQuery = event.currentTarget.value;
  renderGames(activeGameId);
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
    showToast("신청을 취소했습니다. 참가비 1,000원은 환불 예정으로 처리됩니다.");
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
    showToast("미매칭 신청자의 1,000원 환불이 예약되었습니다.");
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
