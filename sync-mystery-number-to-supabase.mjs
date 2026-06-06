import { existsSync, readFileSync } from "node:fs";

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
  }

  return env;
}

const env = { ...loadEnv(".env.local"), ...process.env };
const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const game = {
  id: "mystery-number",
  title: "미스터리 넘버",
  summary: "상대가 숨긴 숫자 정보를 질문과 추리로 좁혀 먼저 맞히는 1:1 숫자 추리 게임",
  rules: [
    "미스터리 넘버는 상대가 비공개로 정한 숫자 정보를 질문과 추리로 알아내는 1:1 게임입니다.",
    "각 플레이어는 게임 시작 전 운영자가 정한 범위 안에서 자신의 미스터리 넘버를 비공개로 설정합니다.",
    "미스터리 넘버는 상대에게 공개하지 않으며, 운영자에게만 확인받습니다.",
    "선 플레이어부터 번갈아 차례를 진행합니다.",
    "자기 차례에는 상대의 미스터리 넘버에 대한 질문을 1개 할 수 있습니다.",
    "질문은 운영자가 정한 질문 형식 안에서만 가능하며, 상대는 반드시 사실대로 답해야 합니다.",
    "질문 예시는 숫자의 크기, 홀짝 여부, 특정 범위 포함 여부, 특정 숫자와의 관계 등입니다.",
    "상대의 답변을 들은 뒤, 해당 차례의 플레이어는 정답 선언을 할 수 있습니다.",
    "정답 선언은 상대의 미스터리 넘버 전체를 정확히 말해야 합니다.",
    "정답 선언이 맞으면 선언한 플레이어가 즉시 승리합니다.",
    "정답 선언이 틀리면 해당 플레이어는 페널티를 받으며, 운영자가 정한 방식에 따라 상대에게 추가 질문권 또는 승점을 부여합니다.",
    "정답 선언을 하지 않으면 차례를 넘기고, 상대 플레이어가 같은 방식으로 질문을 진행합니다.",
    "이미 한 질문과 같은 의미의 질문은 반복할 수 없습니다.",
    "운영자는 질문과 답변을 모두 공개 기록해 두 플레이어가 같은 정보를 기준으로 추리할 수 있게 합니다.",
    "제한 턴이 끝날 때까지 정답자가 나오지 않으면, 더 많은 핵심 정보를 맞힌 플레이어 또는 운영자 판정 기준에 따라 승자를 정합니다.",
  ],
  win_condition: "상대의 미스터리 넘버를 먼저 정확히 맞힌 플레이어가 승리",
};

const response = await fetch(`${supabaseUrl}/rest/v1/games?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(game),
});

if (!response.ok) {
  throw new Error(`Supabase upsert failed: ${response.status} ${await response.text()}`);
}

const [savedGame] = await response.json();
console.log(`Synced game: ${savedGame.id}`);
