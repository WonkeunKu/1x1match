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
  id: "strategic-yut",
  title: "전략 윷놀이",
  summary: "앞면·뒷면 고정 윷 선택과 파트너 심리를 활용해 말을 모두 들여보내는 전략 보드게임",
  rules: [
    "전략 윷놀이는 기본 윷놀이와 같은 말 이동 규칙을 사용합니다.",
    "원 규칙은 탈락후보가 파트너를 선택해 2:2로 진행하지만, 1:1 운영에서는 두 플레이어가 각각 탈락후보와 파트너 역할을 번갈아 맡아 진행합니다.",
    "각 플레이어는 말 2개를 가지고 시작합니다.",
    "각 플레이어는 앞면만 있는 윷과 뒷면만 있는 윷 세트를 받습니다.",
    "4명이 각각 하나씩 던진 윷 결과에 따라 말이 이동하는 구조이며, 1:1 운영에서는 한 플레이어가 자신의 탈락후보 선택과 파트너 선택을 모두 관리합니다.",
    "한 차례의 게임 순서는 A의 탈락후보 선택, B의 파트너 선택, B의 탈락후보 선택, A의 파트너 선택 순서로 번갈아 진행합니다.",
    "각 선택자는 앞면 윷 또는 뒷면 윷 중 하나를 비공개로 선택합니다.",
    "4개의 선택이 모두 공개되면 앞면과 뒷면의 조합에 따라 도, 개, 걸, 윷, 모를 판정합니다.",
    "도는 뒷도로 간주합니다.",
    "판정된 결과만큼 현재 이동권을 가진 플레이어가 자신의 말 1개를 선택해 이동합니다.",
    "상대의 말을 잡으면 추가로 한 번 더 이동 기회를 얻습니다.",
    "자신의 말이 있는 칸에 도착하면 말을 업을 수 있으며, 업힌 말은 함께 이동합니다.",
    "일반 윷놀이와 달리 파트너의 결과와 무관하게 탈락후보의 말 2개가 모두 들어와야 승리합니다.",
    "데스매치에서 승리한 플레이어의 파트너는 탈락자의 파트너에게 가넷 1개를 받는 것으로 처리할 수 있습니다.",
    "데스매치를 진행하지 않는 관전 플레이어가 있다면 데스매치 승패에 대해 가넷 베팅을 할 수 있습니다.",
    "1:1 운영에서는 베팅 요소를 생략하고 승패만 기록해도 됩니다.",
    "핵심 전략은 상대가 어떤 윷을 낼지 읽고 그에 대응해 자신의 윷을 고르는 것입니다.",
    "모와 윷, 뒷도를 견제하거나 의도적으로 만들 수 있으며, 상대가 노리는 패를 예측해 이동 결과를 조절해야 합니다.",
    "파트너의 말을 징검다리처럼 활용하면 상대의 윷을 예측해 모 없이도 한 번에 먼 거리를 이동할 수 있습니다.",
    "선후공의 유불리는 상황에 따라 달라지며, 파트너의 말이 아니라면 뒷도를 노려 넘기는 선택이 가장 좋은 경우가 많습니다.",
    "상대의 파트너 또는 보조 역할을 지나치게 강하게 추가하면 밸런스가 무너질 수 있으므로, 1:1 운영에서는 각 플레이어가 같은 조건으로 두 역할을 모두 맡는 방식이 가장 안정적입니다.",
  ],
  win_condition: "자신의 말 2개를 상대보다 먼저 모두 결승점으로 통과시킨 플레이어가 승리",
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
