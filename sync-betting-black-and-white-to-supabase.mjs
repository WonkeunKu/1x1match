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
  id: "betting-black-and-white",
  title: "베팅! 흑과 백",
  summary: "흑백 숫자 타일에 칩을 배분하고 순서대로 대결해 더 많은 칩을 획득하는 1:1 베팅 심리전",
  rules: [
    "베팅! 흑과 백은 숫자 타일에 칩을 미리 배분한 뒤, 정해진 대결 순서에 따라 칩을 걸고 승부하는 1:1 베팅 게임입니다.",
    "두 플레이어는 서로의 숫자 타일을 볼 수 없도록 가운데 가림막을 두고 게임을 시작합니다.",
    "게임 시작 전 각 플레이어는 숫자 타일 10개와 칩 30개를 지급받습니다.",
    "10개의 숫자 타일은 짝수 0, 2, 4, 6, 8이 흑색이고 홀수 1, 3, 5, 7, 9가 백색입니다.",
    "게임이 시작되면 두 플레이어는 숫자 타일 10개의 대결 순서를 미리 결정해 뒷면이 보이도록 놓습니다.",
    "각 플레이어는 지급받은 칩 30개를 숫자 타일 10개에 나누어 베팅합니다.",
    "숫자 타일 1개에는 최소 칩 1개 이상을 베팅해야 하며, 지급받은 칩 30개를 모두 베팅해야 합니다.",
    "승부가 시작되면 이미 베팅한 칩을 임의로 바꿀 수 없으며, 게임 도중 추가 베팅도 불가능합니다.",
    "숫자 타일 순서와 베팅이 끝나면 두 플레이어 사이의 가림막을 제거하고, 첫 번째 타일부터 차례로 승부합니다.",
    "해당 순서의 타일에 베팅한 칩 수가 서로 다를 경우, 칩을 적게 베팅한 플레이어는 상대가 베팅한 칩 수와 같아지도록 칩을 맞추거나 포기할 수 있습니다.",
    "칩을 맞출 때 보유 칩이 부족하다면 자신의 다른 타일에 베팅된 칩을 빼서 사용할 수 있습니다.",
    "단, 어떤 타일이든 최소 칩 1개 이상은 남아 있어야 합니다.",
    "게임 도중 획득한 칩 역시 상대방의 베팅 칩 수를 맞추는 데 사용할 수 있습니다.",
    "두 플레이어의 베팅 칩 수가 같아지면 해당 순서의 숫자 타일을 공개합니다.",
    "더 높은 숫자를 가진 플레이어가 승리하고, 해당 타일에 베팅된 칩을 모두 가져갑니다.",
    "무승부가 나온 경우 각자 자신이 베팅했던 칩을 가져갑니다.",
    "상대 플레이어의 칩 수와 맞추지 않고 포기할 경우 해당 순서의 숫자 타일은 공개되지 않으며, 베팅된 칩은 상대방이 획득합니다.",
    "한 플레이어가 해당 순서의 타일에 같은 개수의 칩을 베팅했다면 바로 타일을 오픈합니다.",
    "같은 방식으로 타일 10개에 대한 승부가 모두 끝나면 게임이 종료됩니다.",
    "게임 종료 시 칩을 더 많이 보유한 플레이어가 승리합니다.",
    "기본적으로 큰 숫자에는 많은 칩을, 작은 숫자에는 적은 칩을 거는 것이 안정적입니다.",
    "큰 숫자에 많이 거는 심리를 역이용해 낮은 숫자에 많은 칩을 배치하는 블러핑도 가능합니다.",
    "처음 배치와 베팅에 따라 승패가 크게 갈리므로, 숫자 순서와 칩 배분을 동시에 설계하는 것이 중요합니다.",
  ],
  win_condition: "10개의 숫자 타일 승부가 모두 끝난 뒤 더 많은 칩을 보유한 플레이어가 승리",
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
