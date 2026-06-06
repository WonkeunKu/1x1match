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
  id: "blind-betting",
  title: "블라인드 베팅",
  summary: "상대의 블라인드 카드를 보고 자신의 카드를 추측해 베팅하는 1:1 심리전",
  rules: [
    "블라인드 베팅은 상대의 블라인드 카드를 보고 본인의 블라인드 카드를 예측한 뒤, 본인의 오픈 카드와 블라인드 카드의 합이 더 클 경우 베팅에 성공하는 게임입니다.",
    "게임은 총 2라운드로 진행합니다.",
    "게임 시작 전 각 플레이어는 1부터 10까지의 오픈 카드 한 세트와 베팅 칩 30개를 받습니다.",
    "게임이 시작되면 딜러는 1부터 12까지의 블라인드 카드 두 세트 중 한 장씩 각 플레이어 앞에 비공개로 배치합니다.",
    "본인의 블라인드 카드는 볼 수 없으며, 상대 플레이어의 블라인드 카드는 볼 수 있습니다.",
    "플레이어는 상대의 블라인드 카드를 바탕으로 자신의 블라인드 카드를 추측하고, 칩을 베팅하거나 베팅을 포기할 수 있습니다.",
    "지난 턴에 승리한 플레이어부터 베팅합니다. 첫 턴의 선 플레이어는 추첨으로 정합니다.",
    "베팅은 기본 베팅 1개 이후, 상대보다 더 많이 베팅하는 레이즈, 상대와 같은 개수의 칩을 베팅하는 콜, 베팅을 포기하는 폴드로 진행합니다.",
    "상대의 베팅보다 더 많이 레이즈하는 것은 불가능합니다.",
    "서로 베팅한 칩의 개수가 같아지면 각 플레이어는 공개된 오픈 카드 중 한 장을 선택해 제출합니다.",
    "블라인드 카드와 오픈 카드 두 장을 동시에 공개하며, 합이 더 큰 플레이어가 승리하고 해당 턴에 베팅된 칩을 모두 획득합니다.",
    "베팅을 포기한 경우 오픈 카드를 제출하지 않으며, 블라인드 카드와 무관하게 상대가 승리하고 베팅된 칩을 가져갑니다.",
    "베팅을 포기했을 때 포기한 플레이어의 블라인드 카드가 11 또는 12라면, 해당 플레이어는 베팅된 칩과 별개로 칩 10개를 페널티로 상대에게 제출해야 합니다.",
    "오픈 카드 1 또는 2로 승리한 플레이어는 상대에게 베팅된 칩과 별개로 칩 10개를 추가로 받을 수 있습니다.",
    "각 플레이어의 오픈 카드 10장이 모두 소진되면 라운드가 종료됩니다.",
    "2라운드 종료 시 더 많은 칩을 가진 플레이어가 승리합니다.",
    "게임 진행 중 상대 플레이어가 페널티 10개를 포함해 칩을 전부 잃은 경우 즉시 승리합니다.",
    "게임 진행 중 필기도구 사용은 금지됩니다.",
  ],
  win_condition: "2라운드 종료 시 더 많은 칩을 가진 플레이어가 승리",
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
