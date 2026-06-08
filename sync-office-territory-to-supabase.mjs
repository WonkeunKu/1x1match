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
  id: "office-territory",
  title: "사무실 땅따먹기",
  summary: "칩 배치와 이동으로 더 많은 사무실 공간을 차지하는 영역 점령 게임",
  rules: [
    "사무실 땅따먹기는 상대 플레이어와 서로 더 많은 사무실 공간을 차지하기 위해 경쟁하며 승점을 획득하는 게임입니다.",
    "게임에는 육각형으로 구성된 게임판 1개와 R&D팀을 상징하는 노란색 칩, 마케팅팀을 상징하는 초록색 칩이 21개씩 사용됩니다.",
    "게임판은 육각형 61칸으로 구성되며, 이동할 수 없는 회색 칸 7개, 진한 파란색 5점 칸 6개, 파란색 3점 칸 24개, 연한 파란색 2점 칸 24개가 존재합니다.",
    "한 라운드는 칩 배치 단계와 칩 이동 단계로 진행됩니다.",
    "1라운드는 지목 탈락 후보 선수가 플레이어를 결정하고, 2~3라운드는 직전 라운드에서 패배한 플레이어가 선 플레이어를 결정합니다.",
    "칩 배치 단계에서 선 플레이어는 자신의 팀 칩 2개를 더미로 분배하고, 그중 한 더미를 선택해 원하는 칸에 올려놓습니다.",
    "후 플레이어도 같은 방식으로 칩 2개를 두 더미로 분배하고, 2개의 더미 각각을 원하는 칸 위에 올려놓습니다.",
    "다시 선 플레이어가 남은 한 더미를 원하는 칸 위에 올려놓습니다.",
    "칩 배치는 더미마다 3분 내로 완료해야 합니다.",
    "칩 이동 단계에서 자신의 차례에는 한 개의 더미를 선택해 한 방향으로만 이동할 수 있으며, 이동할 때는 칩을 하나씩 뜯으며 이동합니다.",
    "이동 칸 수의 제한은 없고, 가다가 멈추거나 게임판 끝까지 이동할 수 있습니다.",
    "이동하는 칸에는 자신의 칩, 상대방 칩, 이동 불가 칸이 없어야 하며, 게임판 바깥으로는 이동할 수 없습니다.",
    "이동은 제한 시간 1분 이내에 완료해야 합니다. 제한 시간을 초과하면 상대 플레이어의 승리로 해당 라운드를 종료합니다.",
    "번갈아 차례를 진행해 두 플레이어 모두 칩 이동이 불가능한 경우 라운드가 종료됩니다.",
    "라운드 종료 시 자신의 팀 칩이 올라간 칸의 승점을 합산해 획득하며, 승점이 높은 플레이어가 해당 라운드에서 승리합니다.",
    "게임은 총 3라운드로 진행되며, 먼저 두 라운드를 승리한 플레이어가 생존 게임에서 승리합니다.",
    "원본 진행에서는 승리한 플레이어가 크레딧 2개를 받고 다음 회전에 진출하며, 패배한 플레이어는 최종 탈락자가 됩니다.",
    "5점 칸의 가치는 크기 때문에 5점 칸을 우선적으로 사수하는 전략이 유리할 수 있습니다.",
    "칩 배치 단계에서는 5점 칸 중심으로 큰 더미를 두고, 2~3점 칸에는 작은 더미를 분산시키는 식으로 균형을 조절할 수 있습니다.",
    "상대가 점수를 얻지 못하게 진로를 차단하는 것도 중요합니다. 선공은 칩 배치에서 후공을 끌고 상대 더미의 진로를 막는 전략을 사용할 수 있습니다.",
    "원본에는 서술 편의를 위한 게임판 좌표가 사용됩니다. 실제 진행 시 좌표와 칸 점수는 운영자가 현장 도구에 맞춰 안내합니다.",
  ],
  win_condition: "3라운드 중 먼저 2라운드를 승리한 플레이어가 승리",
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
