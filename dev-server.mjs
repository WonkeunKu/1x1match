import { createServer } from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createPaymentProvider, createSmsProvider } from "./integrations.mjs";
import { createStorage } from "./storage.mjs";

const root = process.cwd();
const storagePath = join(root, "app-data.json");

function loadLocalEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadLocalEnv();

const storageDriver = process.env.STORAGE_DRIVER || "json";
const storage = createStorage({ driver: storageDriver, jsonPath: storagePath });
const paymentProvider = createPaymentProvider({ provider: process.env.PAYMENT_PROVIDER || "mock" });
const smsProvider = createSmsProvider({ provider: process.env.SMS_PROVIDER || "mock" });
const adminPassword = process.env.ADMIN_PASSWORD || "mindmatch-admin";
const bankAccountLabel = process.env.BANK_ACCOUNT_LABEL || "계좌 정보 준비 중";
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const state = {
  currentUserId: null,
  isAdmin: false,
  members: [
    { id: "u-001", nickname: "지니어스42", phone: "010-0000-0000", area: "성수", wins: 7, losses: 3 },
    { id: "u-002", nickname: "블랙칩", phone: "010-1111-2222", area: "홍대", wins: 11, losses: 3 },
    { id: "u-003", nickname: "페이크제로", phone: "010-3333-4444", area: "강남", wins: 8, losses: 5 },
    { id: "u-004", nickname: "연합브레이커", phone: "010-5555-6666", area: "성수", wins: 5, losses: 4 },
    { id: "u-005", nickname: "데스매치", phone: "010-7777-8888", area: "홍대", wins: 4, losses: 5 },
  ],
  games: [
    {
      id: "number-duel",
      title: "넘버 듀얼",
      summary: "상대의 숨겨진 숫자 조합을 추론하는 심리전",
      rules: [
        "각 플레이어는 0부터 9까지의 숫자 중 서로 다른 3개를 비밀 코드로 정합니다.",
        "라운드마다 상대에게 질문 카드 1장을 사용해 조건을 확인합니다.",
        "정확한 코드를 먼저 선언하면 승리하고, 틀리면 상대에게 즉시 추가 질문권이 주어집니다.",
      ],
      win: "상대의 3자리 코드를 먼저 맞히면 승리",
    },
    {
      id: "auction-mind",
      title: "옥션 마인드",
      summary: "제한 칩으로 점수 타일을 낙찰받는 계산 게임",
      rules: [
        "두 플레이어는 같은 수량의 칩을 받고 8개의 점수 타일을 순서대로 경매합니다.",
        "입찰가는 동시에 공개되며 높은 금액을 낸 플레이어가 타일을 가져갑니다.",
        "동점 입찰은 타일이 보류되고 다음 라운드 승자가 함께 가져갑니다.",
      ],
      win: "최종 점수 합계가 높은 플레이어 승리",
    },
    {
      id: "signal-lie",
      title: "시그널 라이어",
      summary: "정보 카드와 거짓 선언을 섞어 상대를 흔드는 추론 게임",
      rules: [
        "매 라운드 정보 카드 2장 중 1장은 진실, 1장은 거짓으로 선언할 수 있습니다.",
        "상대는 선언의 진위를 추리해 도전하거나 넘어갈 수 있습니다.",
        "도전 성공 시 점수를 얻고 실패하면 상대가 점수를 얻습니다.",
      ],
      win: "먼저 5점을 획득하면 승리",
    },
  ],
  matches: [
    {
      id: "2026-06-05",
      date: "6월 5일 금",
      time: "20:00",
      location: "성수 카페 매치룸",
      gameId: "number-duel",
      gameRevealed: true,
      applications: [
        { memberId: "u-001", paid: true, paymentStatus: "paid" },
        { memberId: "u-002", paid: true, paymentStatus: "paid" },
      ],
      result: { winnerId: "u-002", loserId: "u-001" },
    },
    {
      id: "2026-06-08",
      date: "6월 8일 월",
      time: "19:30",
      location: "홍대 카페 매치룸",
      gameId: "auction-mind",
      gameRevealed: false,
      applications: [
        { memberId: "u-001", paid: true, paymentStatus: "paid" },
        { memberId: "u-003", paid: true, paymentStatus: "paid" },
      ],
      result: null,
    },
    {
      id: "2026-06-12",
      date: "6월 12일 금",
      time: "20:00",
      location: "강남 카페 매치룸",
      gameId: null,
      gameRevealed: false,
      applications: [{ memberId: "u-004", paid: true, paymentStatus: "paid" }],
      result: null,
    },
    {
      id: "2026-06-15",
      date: "6월 15일 월",
      time: "19:30",
      location: "성수 카페 매치룸",
      gameId: null,
      gameRevealed: false,
      applications: [],
      result: null,
    },
    {
      id: "2026-06-19",
      date: "6월 19일 금",
      time: "20:00",
      location: "홍대 카페 매치룸",
      gameId: null,
      gameRevealed: false,
      applications: [{ memberId: "u-005", paid: true, paymentStatus: "paid" }],
      result: null,
    },
    {
      id: "2026-06-22",
      date: "6월 22일 월",
      time: "19:30",
      location: "강남 카페 매치룸",
      gameId: null,
      gameRevealed: false,
      applications: [],
      result: null,
    },
  ],
  events: [
    "6월 8일 19:30 매치 확정 문자를 발송했습니다.",
    "6월 5일 20:00 매치 게임을 공개했습니다.",
  ],
};

async function loadStoredState() {
  try {
    const stored = await storage.load();
    if (stored) {
      Object.assign(state, stored);
      state.isAdmin = false;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`저장 데이터를 불러오지 못했습니다: ${error.message}`);
    }
  }
}

async function persistState() {
  await storage.save(state);
}

function currentUser() {
  return state.members.find((member) => member.id === state.currentUserId) || null;
}

function publicMember(member) {
  if (!member) return null;

  const { passwordHash, ...safeMember } = member;
  return safeMember;
}

function publicState() {
  const rankings = [...state.members]
    .map((member) => {
      const total = member.wins + member.losses;
      return {
        ...publicMember(member),
        record: `${member.wins}승 ${member.losses}패`,
        rate: total ? `${((member.wins / total) * 100).toFixed(1)}%` : "0.0%",
        rateValue: total ? member.wins / total : 0,
      };
    })
    .sort((a, b) => b.rateValue - a.rateValue || b.wins - a.wins);

  return {
    user: publicMember(currentUser()),
    isAuthenticated: Boolean(state.currentUserId),
    isAdmin: Boolean(state.isAdmin),
    members: state.members.map(publicMember),
    rankings,
    games: state.games,
    matches: state.matches.map((match) => decorateMatch(match)),
    events: state.events.slice(0, 8),
    metrics: buildMetrics(),
    payment: {
      amount: 1000,
      method: "bank_transfer",
      bankAccountLabel,
    },
  };
}

function requireAdmin(response) {
  if (!state.isAdmin) {
    sendJson(response, 403, { error: "운영자 로그인 후 이용할 수 있습니다." });
    return false;
  }

  return true;
}

function decorateMatch(match) {
  const allPlayers = match.applications.map((application) => {
    const member = state.members.find((candidate) => candidate.id === application.memberId);
    return {
      ...application,
      nickname: member?.nickname || "알 수 없음",
      phone: member?.phone || "-",
      area: member?.area || "-",
    };
  });
  const players = allPlayers.filter((player) => !player.cancelled && player.paymentStatus === "paid");
  const confirmed = players.length >= 2;
  const game = state.games.find((candidate) => candidate.id === match.gameId) || null;

  return {
    ...match,
    players,
    allPlayers,
    playerCount: players.length,
    confirmed,
    status: confirmed ? "confirmed" : "waiting",
    statusLabel: confirmed ? "확정" : players.length === 1 ? "1명 대기" : "신청 가능",
    game,
    notificationLog: match.notificationLog || [],
    appliedByMe: Boolean(state.currentUserId && match.applications.some((item) => item.memberId === state.currentUserId && !item.cancelled)),
    hasMyApplication: Boolean(state.currentUserId && match.applications.some((item) => item.memberId === state.currentUserId)),
  };
}

function buildMetrics() {
  const waiting = state.matches.filter((match) => activePaidApplications(match).length < 2).length;
  const confirmed = state.matches.filter((match) => activePaidApplications(match).length >= 2).length;
  const revealWaiting = state.matches.filter((match) => activePaidApplications(match).length >= 2 && !match.gameRevealed).length;
  const refundTargets = state.matches.filter((match) =>
    match.applications.some((application) => ["refund_requested", "refund_scheduled"].includes(application.paymentStatus)),
  ).length;

  return {
    todayApplications: 9,
    waiting,
    confirmed,
    revealWaiting,
    refundTargets,
  };
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return digits;
}

function isValidPhone(phone) {
  return /^010-\d{4}-\d{4}$/.test(phone);
}

function validatePassword(password, confirmation) {
  const value = String(password || "");

  if (value !== String(confirmation || "")) {
    throw new Error("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
  }

  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    throw new Error("비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.");
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;

  const [salt, hash] = storedHash.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(String(password), salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function requireField(value, label) {
  if (!String(value || "").trim()) {
    throw new Error(`${label}을 입력해 주세요.`);
  }
}

async function maybeConfirm(match) {
  match.notificationLog ||= [];
  if (activePaidApplications(match).length === 2 && !match.notificationLog.includes("confirmed-ready")) {
    match.notificationLog.push("confirmed-ready");
    state.events.unshift(`${match.date} ${match.time} 매치가 확정되어 참가자 2명에게 문자를 발송했습니다.`);
  }
}

function findMember(memberId) {
  return state.members.find((member) => member.id === memberId);
}

function activePaidApplications(match) {
  return match.applications.filter((item) => !item.cancelled && item.paymentStatus === "paid");
}

function messageForMatch(match, type) {
  const players = activePaidApplications(match).map((application) => findMember(application.memberId)).filter(Boolean);

  if (type === "game-revealed") {
    const game = state.games.find((candidate) => candidate.id === match.gameId);
    return `[1대1매치] ${match.date} ${match.time} ${match.location} match game: ${game?.title || "TBA"}. Check the web notice for rules.`;
  }

  return `[1대1매치] ${match.date} ${match.time} ${match.location} 1:1 match confirmed. Players: ${players.map((player) => player.nickname).join(" vs ")}.`;
}

async function sendMatchSms(match, type) {
  const players = activePaidApplications(match).map((application) => findMember(application.memberId)).filter(Boolean);
  const message = messageForMatch(match, type);

  await Promise.all(players.map((player) => smsProvider.send({ to: player.phone, message, type })));
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      storage: storage.name,
      paymentProvider: paymentProvider.name,
      smsProvider: smsProvider.name,
      members: state.members.length,
      matches: state.matches.length,
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/state") {
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/signup") {
    const body = await parseBody(request);
    requireField(body.nickname, "닉네임");
    requireField(body.phone, "전화번호");
    requireField(body.area, "주 활동지");
    requireField(body.password, "비밀번호");
    requireField(body.passwordConfirm, "비밀번호 확인");

    const phone = normalizePhone(body.phone);
    const nickname = String(body.nickname).trim();

    if (!isValidPhone(phone)) {
      sendJson(response, 400, { error: "전화번호는 010으로 시작하는 휴대폰 번호로 입력해 주세요." });
      return;
    }

    validatePassword(body.password, body.passwordConfirm);

    const existingMemberByPhone = state.members.find((member) => member.phone === phone);
    const existingMemberByNickname = state.members.find((member) => member.nickname === nickname);

    if (existingMemberByPhone && !existingMemberByPhone.passwordHash) {
      if (existingMemberByNickname && existingMemberByNickname.id !== existingMemberByPhone.id) {
        sendJson(response, 409, { error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요." });
        return;
      }

      existingMemberByPhone.nickname = nickname;
      existingMemberByPhone.area = String(body.area || "").trim();
      existingMemberByPhone.passwordHash = hashPassword(body.password);
      state.currentUserId = existingMemberByPhone.id;
      state.isAdmin = false;
      state.events.unshift(`${existingMemberByPhone.nickname}님이 비밀번호를 설정하고 로그인했습니다.`);
      await persistState();
      sendJson(response, 200, publicState());
      return;
    }

    const exists = Boolean(existingMemberByPhone || existingMemberByNickname);

    if (exists) {
      sendJson(response, 409, { error: "이미 가입된 닉네임 또는 전화번호입니다. 로그인해 주세요." });
      return;
    }

    const member = {
      id: `u-${String(state.members.length + 1).padStart(3, "0")}`,
      nickname,
      phone,
      area: String(body.area || "").trim(),
      passwordHash: hashPassword(body.password),
      wins: 0,
      losses: 0,
    };

    state.members.push(member);
    state.currentUserId = member.id;
    state.isAdmin = false;
    state.events.unshift(`${member.nickname}님이 회원가입 후 로그인했습니다.`);
    await persistState();
    sendJson(response, 201, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    const body = await parseBody(request);
    requireField(body.phone, "전화번호");
    requireField(body.password, "비밀번호");

    const member = state.members.find((candidate) => candidate.phone === normalizePhone(body.phone));
    if (!member) {
      sendJson(response, 404, { error: "가입된 전화번호를 찾을 수 없습니다." });
      return;
    }

    if (!verifyPassword(body.password, member.passwordHash)) {
      sendJson(response, 401, { error: "전화번호 또는 비밀번호가 올바르지 않습니다." });
      return;
    }

    state.currentUserId = member.id;
    state.isAdmin = false;
    state.events.unshift(`${member.nickname}님이 로그인했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    state.currentUserId = null;
    state.isAdmin = false;
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin-login") {
    const body = await parseBody(request);
    requireField(body.password, "운영자 암호");

    if (!currentUser()) {
      sendJson(response, 401, { error: "회원 로그인 후 운영자 암호를 입력해 주세요." });
      return;
    }

    if (String(body.password) !== adminPassword) {
      sendJson(response, 401, { error: "운영자 암호가 올바르지 않습니다." });
      return;
    }

    state.isAdmin = true;
    state.events.unshift("운영자가 로그인했습니다.");
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin-logout") {
    state.isAdmin = false;
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/apply") {
    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const member = currentUser();

    if (!member) {
      sendJson(response, 401, { error: "로그인 후 참가 신청할 수 있습니다." });
      return;
    }

    if (!match) {
      sendJson(response, 404, { error: "선택한 날짜를 찾을 수 없습니다." });
      return;
    }

    if (match.applications.filter((item) => !item.cancelled).length >= 2) {
      sendJson(response, 409, { error: "이미 2명이 확정된 날짜입니다." });
      return;
    }

    if (match.applications.some((application) => application.memberId === member.id && !application.cancelled)) {
      sendJson(response, 409, { error: "이미 이 날짜에 신청했습니다." });
      return;
    }

    match.applications.push({ memberId: member.id, paid: false, paymentStatus: "payment_pending" });
    state.events.unshift(`${member.nickname}님이 ${match.date} ${match.time} 매치에 신청했습니다. 참가비 1,000원 결제 대기.`);
    await persistState();
    sendJson(response, 201, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/complete-payment") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const member = findMember(body.memberId);

    if (!member) {
      sendJson(response, 404, { error: "입금 확인할 회원을 찾을 수 없습니다." });
      return;
    }

    const application = match?.applications.find((item) => item.memberId === member.id);
    if (!application) {
      sendJson(response, 404, { error: "입금 확인할 신청 내역이 없습니다." });
      return;
    }

    await paymentProvider.captureParticipationFee({ member, match, amount: 1000 });
    application.paid = true;
    application.paymentStatus = "paid";
    state.events.unshift(`${member.nickname}님의 ${match.date} ${match.time} 참가비 1,000원 입금을 확인했습니다.`);
    await maybeConfirm(match);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/cancel-application") {
    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const member = currentUser();

    if (!member) {
      sendJson(response, 401, { error: "로그인 후 신청을 취소할 수 있습니다." });
      return;
    }

    if (!match) {
      sendJson(response, 404, { error: "선택한 매치를 찾을 수 없습니다." });
      return;
    }

    if (activePaidApplications(match).length >= 2) {
      sendJson(response, 409, { error: "이미 확정된 매치는 직접 취소할 수 없습니다. 운영자에게 문의해 주세요." });
      return;
    }

    const beforeCount = match.applications.length;
    const application = match.applications.find((item) => item.memberId === member.id);

    if (!application) {
      sendJson(response, 404, { error: "취소할 신청 내역이 없습니다." });
      return;
    }

    if (application.paymentStatus === "payment_pending") {
      match.applications = match.applications.filter((item) => item.memberId !== member.id);
      state.events.unshift(`${member.nickname}님이 ${match.date} ${match.time} 결제 대기 신청을 취소했습니다.`);
    } else {
      application.paymentStatus = "refund_requested";
      application.cancelled = true;
      state.events.unshift(`${member.nickname}님이 ${match.date} ${match.time} 신청 취소와 환불을 요청했습니다.`);
    }

    if (beforeCount === 0) {
      sendJson(response, 404, { error: "취소할 신청 내역이 없습니다." });
      return;
    }

    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/create-match") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    requireField(body.matchDate, "날짜");
    requireField(body.time, "시간");
    requireField(body.location, "장소");

    const idBase = `${body.matchDate}-${String(body.time).replace(":", "")}`;
    const exists = state.matches.some((match) => match.id === idBase);

    if (exists) {
      sendJson(response, 409, { error: "이미 같은 날짜와 시간의 매치가 있습니다." });
      return;
    }

    const dateObject = new Date(`${body.matchDate}T00:00:00+09:00`);
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const date = `${dateObject.getMonth() + 1}월 ${dateObject.getDate()}일 ${weekdays[dateObject.getDay()]}`;

    state.matches.push({
      id: idBase,
      date,
      time: String(body.time),
      location: String(body.location).trim(),
      gameId: null,
      gameRevealed: false,
      applications: [],
      result: null,
    });
    state.events.unshift(`${date} ${body.time} 신규 매치를 열었습니다.`);
    await persistState();
    sendJson(response, 201, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/record-result") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match) {
      sendJson(response, 404, { error: "선택한 매치를 찾을 수 없습니다." });
      return;
    }

    const activeApplications = activePaidApplications(match);
    if (activeApplications.length < 2) {
      sendJson(response, 409, { error: "확정된 매치만 결과를 입력할 수 있습니다." });
      return;
    }

    const winnerId = String(body.winnerId || "");
    const playerIds = activeApplications.map((application) => application.memberId);
    const loserId = playerIds.find((memberId) => memberId !== winnerId);

    if (!playerIds.includes(winnerId) || !loserId) {
      sendJson(response, 400, { error: "승자를 다시 선택해 주세요." });
      return;
    }

    if (match.result) {
      const previousWinner = findMember(match.result.winnerId);
      const previousLoser = findMember(match.result.loserId);
      if (previousWinner) previousWinner.wins = Math.max(0, previousWinner.wins - 1);
      if (previousLoser) previousLoser.losses = Math.max(0, previousLoser.losses - 1);
    }

    const winner = findMember(winnerId);
    const loser = findMember(loserId);
    winner.wins += 1;
    loser.losses += 1;
    match.result = { winnerId, loserId };
    state.events.unshift(`${match.date} ${match.time} 결과 입력: ${winner.nickname} 승리.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/mark-message-sent") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const messageKey = String(body.messageKey || "").trim();

    if (!match || !messageKey) {
      sendJson(response, 400, { error: "매치와 알림 종류를 확인해 주세요." });
      return;
    }

    match.notificationLog ||= [];
    if (!match.notificationLog.includes(messageKey)) {
      match.notificationLog.push(messageKey);
    }

    state.events.unshift(`${match.date} ${match.time} ${messageKey} 알림을 발송 완료로 체크했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/reveal-game") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const game = state.games.find((candidate) => candidate.id === body.gameId);

    if (!match || !game) {
      sendJson(response, 404, { error: "매치 또는 게임을 찾을 수 없습니다." });
      return;
    }

    match.gameId = game.id;
    match.gameRevealed = true;
    match.notificationLog ||= [];
    if (activePaidApplications(match).length >= 2 && !match.notificationLog.includes("game-revealed-ready")) {
      match.notificationLog.push("game-revealed-ready");
    }
    state.events.unshift(`${match.date} ${match.time} 매치 게임으로 ${game.title}을 공개했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/refund") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match) {
      sendJson(response, 404, { error: "선택한 날짜를 찾을 수 없습니다." });
      return;
    }

    for (const application of match.applications) {
      if (["refund_requested", "refund_scheduled", "paid"].includes(application.paymentStatus)) {
        const member = findMember(application.memberId);
        await paymentProvider.refundParticipationFee({ member, match, amount: 1000 });
        application.paymentStatus = "refunded";
        application.paid = false;
      }
    }
    state.events.unshift(`${match.date} ${match.time} 환불 대상자의 참가비 환불을 완료했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  sendJson(response, 404, { error: "지원하지 않는 API입니다." });
}

async function handleStatic(response, pathname) {
  const target = normalize(join(root, pathname === "/" ? "index.html" : pathname));

  if (!target.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": types[extname(target)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

await loadStoredState();

createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }

    await handleStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}).listen(port, host, () => {
  console.log(`1대1매치 server listening on http://${host}:${port}`);
});
