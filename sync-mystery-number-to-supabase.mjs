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
  summary: "상대의 숫자 블록을 맞히고 추가 블록을 유도해 더 높은 점수를 노리는 1:1 숫자 추리 게임",
  rules: [
    "미스터리 넘버는 심리 파악 능력과 암기력을 활용해 상대의 숫자 블록을 더 많이 맞히는 1:1 게임입니다.",
    "각 플레이어는 1부터 10까지 숫자 4세트, 총 40개의 숫자 블록 중 5개씩 비공개로 받습니다.",
    "투표를 통해 데스매치에 진출한 플레이어부터 차례를 진행합니다.",
    "자신의 차례에는 상대방의 블록 맞히기 또는 상대방 앞에 블록 추가 두 가지 행동 중 하나를 할 수 있습니다.",
    "상대 앞의 블록 숫자를 맞히면 해당 블록은 제거됩니다.",
    "상대 앞의 블록 숫자를 맞히지 못하면, 맞힌 블록은 그대로 남고 상대 앞에 새로운 블록이 추가됩니다.",
    "정답을 맞힌 플레이어는 오답을 말할 때까지 연속으로 숫자를 부를 수 있습니다.",
    "상대 플레이어 앞에 있는 블록의 숫자를 모두 맞혔다면 추가 점수 2점을 획득합니다.",
    "진행 중 딜러가 가진 블록이 모두 소진되면 각 플레이어 앞에 있는 현재 블록 숫자의 총합을 공개합니다.",
    "한 플레이어의 블록이 모두 소진되면 게임이 종료됩니다.",
    "게임 종료 시 더 높은 점수를 얻은 플레이어가 데스매치의 생존자가 됩니다.",
    "적극적으로 숫자를 맞히는 것이 가능하며, 오답에 대한 직접 페널티는 거의 없습니다.",
    "자신의 패를 부름으로써 자신의 패를 의도적으로 감추는 블러핑 전략을 사용할 수 있습니다.",
    "초반에 맞히기보다 블록 추가를 선택해 상대에게 더 많은 정보를 제공하지 않는 방식으로 수를 조절할 수 있습니다.",
    "숫자를 맞히던 숫자를 추가하던 어느 행동이 유리하다고 단정할 수 없으며, 게임의 승패는 암기력에 크게 좌우됩니다.",
    "특정 숫자만 카운팅하거나, 손가락·의복·타일 배치 등 자신만 확인 가능한 표식을 활용해 암기하는 전략이 가능합니다.",
    "숫자를 1, 4개, 2, 3개처럼 치환해 외우는 방식도 사용할 수 있으나, 기억해야 할 정보가 많기 때문에 관리가 중요합니다.",
  ],
  win_condition: "상대의 블록을 맞혀 점수를 얻고, 게임 종료 시 더 높은 점수를 가진 플레이어가 승리",
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
