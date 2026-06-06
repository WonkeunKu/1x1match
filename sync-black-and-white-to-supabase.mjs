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
  id: "black-and-white",
  title: "흑과백",
  summary: "흑백으로 나뉜 숫자 타일을 내며 상대의 남은 패를 읽어내는 1:1 심리 숫자 게임",
  rules: [
    "흑과백은 0부터 8까지의 숫자 타일을 사용해 더 높은 숫자를 낸 플레이어가 승점을 얻는 1:1 게임입니다.",
    "각 플레이어는 0부터 8까지 총 9장의 숫자 타일을 받습니다.",
    "9개의 숫자 타일은 흑색과 백색으로 나뉘어 있습니다.",
    "0, 2, 4, 6, 8은 흑색 타일이고 1, 3, 5, 7은 백색 타일입니다.",
    "1라운드의 선 플레이어는 임의로 정합니다.",
    "2라운드부터는 직전 라운드에서 승리한 플레이어가 선 플레이어가 됩니다.",
    "무승부가 나온 경우에는 직전 라운드에서 선 플레이어였던 사람이 다시 선 플레이어가 됩니다.",
    "선 플레이어는 0부터 8까지의 숫자 타일 중 1개를 뒷면이 보이도록 제시합니다.",
    "후 플레이어도 숫자 타일 1개를 뒷면이 보이도록 제시합니다.",
    "제시된 타일은 딜러만 확인합니다.",
    "두 플레이어가 제시한 타일 중 더 높은 숫자 타일을 낸 플레이어가 승리해 승점 1점을 획득합니다.",
    "상대가 어떤 숫자 타일을 냈는지는 승패가 결정된 뒤에도 공개되지 않습니다.",
    "플레이어는 자신이 낸 숫자 타일과 흑백으로 나뉜 타일 정보를 바탕으로 상대의 남은 타일을 추측해야 합니다.",
    "9번의 대결 결과, 승점이 더 높은 플레이어가 데스매치에서 승리합니다.",
    "동점이 나오면 9개의 타일을 새로 제공받아 연장전을 진행합니다.",
    "핵심 전략은 질 때는 작게 지고, 이길 때는 크게 이기는 것입니다.",
    "상대가 강한 패를 냈을 것 같을 때는 낮은 숫자를 버리고, 상대가 약한 패를 낼 가능성이 높을 때는 높은 숫자로 승점을 노리는 판단이 중요합니다.",
    "흑색과 백색 타일을 되도록 균등하게 사용하는 것이 좋습니다. 한 색만 남으면 상대가 남은 숫자 범위를 예측하기 쉬워집니다.",
    "무승부가 유리한 상황에서는 의도적으로 비기는 선택을 통해 선후공을 유지하고 더 좋은 시점에 승부를 걸 수 있습니다.",
  ],
  win_condition: "9라운드 종료 시 더 많은 승점을 획득한 플레이어가 승리",
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
