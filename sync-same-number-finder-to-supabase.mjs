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
  id: "same-number-finder",
  title: "같은 숫자 찾기",
  summary: "숨겨진 숫자와 연산기호의 위치를 기억해 타깃넘버와 일치하는 수식을 찾는 1:1 암기 계산 게임",
  rules: [
    "같은 숫자 찾기는 게임판 뒷면의 숫자와 연산기호를 기억한 뒤, 타깃넘버와 같은 값이 되는 수식을 찾아내는 1:1 암기 계산 게임입니다.",
    "게임판은 A부터 P까지 16개의 알파벳 칸으로 구성됩니다.",
    "16개 칸의 뒷면에는 1부터 12까지의 숫자와 +, -, ×, ÷ 연산기호가 표시되어 있습니다.",
    "게임 시작 전 5초 동안 게임판 뒷면이 단 한 번 공개됩니다.",
    "게임이 시작되면 딜러는 매 라운드 타깃넘버를 무작위로 하나씩 뽑습니다.",
    "타깃넘버는 게임판의 숫자와 기호로 만들 수 있는 모든 경우의 자연수입니다.",
    "타깃넘버가 공개되면 먼저 버저를 누른 플레이어에게 5초 동안 수식 완성 기회가 주어집니다.",
    "플레이어는 게임판 뒷면의 숫자와 연산기호를 기억해 타깃넘버가 산출되는 수식을 완성해야 합니다.",
    "수식은 숫자 2개와 기호 1개로 이루어져야 합니다.",
    "하나의 수식에 같은 숫자 칸을 중복해서 사용할 수 없습니다.",
    "답을 말할 때는 수식의 순서인 숫자, 연산기호, 숫자에 맞춰 게임판의 알파벳 3개를 차례로 호명해야 합니다.",
    "수식 공개는 버저를 누른 플레이어가 알파벳 3개를 모두 호명한 뒤, 호명한 차례대로 오픈됩니다.",
    "호명한 알파벳 3개가 모두 뒤집히기 전에 수식이 틀렸어도 게임판 뒷면은 전부 공개됩니다.",
    "해당 라운드의 타깃넘버와 일치하는 수식이 나오면 먼저 수식을 완성한 플레이어가 승점 1점을 획득합니다.",
    "수식이 틀렸거나 5초 안에 알파벳 3개를 호명하지 못하면 기회는 상대에게 넘어갑니다.",
    "상대방의 오답으로 기회가 넘어온 경우 5초 카운트는 하지 않습니다.",
    "5초 안에 알파벳 3개를 호명하지 못했다면 게임판 뒷면은 공개되지 않습니다.",
    "두 플레이어는 해당 라운드의 타깃넘버와 일치하는 수식이 나올 때까지 번갈아 기회를 얻습니다.",
    "공개되는 타깃넘버는 중복되지 않습니다.",
    "더하기와 곱하기는 가능한 수가 많아 활용도가 높고, 빼기와 나누기는 가능한 값의 범위가 좁아 특정 수를 빠르게 좁히는 데 유용합니다.",
    "연산기호의 종류와 위치는 상대가 열어주는 정보로 자연스럽게 공개되므로, 숫자 위치를 우선적으로 외우는 전략이 중요합니다.",
    "먼저 10점을 획득한 플레이어가 승리합니다.",
  ],
  win_condition: "목표 숫자와 같은 값을 만드는 수식을 찾아 먼저 10점을 획득한 플레이어가 승리",
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
