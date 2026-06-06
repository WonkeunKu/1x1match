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
  id: "black-and-white-2",
  title: "흑과백2",
  summary: "99포인트를 나눠 제출하며 적은 차이로 이기고 큰 차이로 지게 만드는 1:1 포인트 심리전",
  rules: [
    "흑과백2는 각자 가진 포인트를 매 라운드 원하는 만큼 제출해 더 높은 포인트를 낸 플레이어가 승점을 얻는 1:1 심리 게임입니다.",
    "각 플레이어는 게임 시작 전 99포인트씩 지급받습니다.",
    "게임은 총 9라운드로 진행합니다.",
    "플레이어는 매 라운드마다 원하는 만큼 포인트를 사용할 수 있습니다.",
    "한 라운드에서 한 자리 수 포인트를 제출한 경우 흑색으로 표시합니다.",
    "한 라운드에서 두 자리 수 포인트를 제출한 경우 백색으로 표시합니다.",
    "두 플레이어가 포인트를 제시하면 더 높은 포인트를 낸 플레이어가 승점 1점을 획득합니다.",
    "승점 1점을 획득한 플레이어는 다음 라운드의 선 플레이어가 됩니다.",
    "무승부가 나온 경우 승점 변동은 없으며, 직전 라운드의 선 플레이어가 다시 선 플레이어가 됩니다.",
    "사용한 포인트는 소멸되며, 남은 포인트는 5단계 표시등으로 공개됩니다.",
    "표시등은 0~19, 20~39, 40~59, 60~79, 80~99 구간으로 표시됩니다.",
    "99포인트는 총 20포인트씩 줄어들 때마다 한 단계씩 표시등이 꺼집니다.",
    "포인트를 입력한 순간 표시등이 적용됩니다.",
    "선 플레이어가 현재 단계보다 낮아지는 포인트를 사용했다면, 후 플레이어가 포인트를 결정하기 전에 표시등이 꺼집니다.",
    "9라운드 종료 시 승점이 더 높은 플레이어가 승리합니다.",
    "게임 도중 한 플레이어가 승점 5점을 먼저 획득하면 즉시 해당 플레이어의 승리로 게임이 종료됩니다.",
    "1라운드의 선 플레이어는 데스매치 상대로 지목된 플레이어가 결정합니다.",
    "공동 최하위자가 있는 경우 코인 토스로 1라운드 선 플레이어를 결정합니다.",
    "9라운드 종료 시 두 플레이어의 승점이 같다면, 게임에서 사용했던 포인트는 소멸되고 새로 33포인트를 지급받아 2라운드를 추가 진행합니다.",
    "기본 전략은 적은 포인트 차이로 승리하고 큰 포인트 차이로 패배하는 것입니다.",
    "자신의 포인트는 최대한 아끼면서 승리하고, 상대가 많은 포인트를 쓰도록 유도해야 합니다.",
    "한 자리 수와 두 자리 수가 흑백으로 표시되므로, 10 전후의 포인트 심리가 중요합니다.",
    "상대보다 1포인트 더 내는 블러핑, 초반 라운드 다승을 통한 승점 압박, 상대의 대량 포인트 사용 유도 등이 핵심 전략입니다.",
  ],
  win_condition: "9라운드 종료 시 더 많은 승점을 얻거나 먼저 승점 5점을 획득한 플레이어가 승리",
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
