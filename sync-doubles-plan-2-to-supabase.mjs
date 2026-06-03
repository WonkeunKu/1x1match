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
  id: "doubles-plan-2",
  title: "더블스플랜2",
  summary: "숫자 블록 사용 횟수를 관리하며 6세트 동안 승점을 쌓는 전략 대결 게임",
  rules: [
    "게임에는 1~12 숫자 블록을 사용하며, 뒷면 색은 빨강과 검정 2종류로 나뉩니다.",
    "3~9까지 7종류는 빨강, 나머지 5종류는 검정입니다.",
    "각 플레이어는 숫자 블록 12개를 가지고 시작합니다.",
    "게임은 총 6세트로 진행되며, 각 세트 시작 시 해당 세트에 사용할 숫자 블록 5개를 비공개로 선택합니다.",
    "한 번 선택한 블록은 세트 시작 후 교체할 수 없습니다.",
    "전체 게임 중 검정 블록은 각각 2번까지, 빨강 블록은 각각 3번까지 사용할 수 있습니다.",
    "사용 횟수를 모두 소진한 블록은 폐기됩니다.",
    "6번째 세트를 제외하고, 직전 세트에서 사용한 블록은 다음 세트에서 사용할 수 없습니다.",
    "사용 제약 때문에 블록 5개 조합을 만들지 못하면 즉시 실격 패배 처리합니다.",
    "추첨으로 첫 선후공을 결정합니다. 이후 한 세트 안에서는 승패와 관계없이 선후를 번갈아 진행합니다.",
    "세트 종료 시 승점이 더 높은 플레이어가 다음 세트의 선 플레이어가 됩니다.",
    "한 세트는 블록을 하나씩 제출해 총 5번의 숫자 승부를 진행합니다.",
    "선 플레이어가 블록 하나를 제출하면, 후 플레이어는 확인한 뒤 블록 하나를 제출합니다.",
    "제출된 두 블록의 앞면을 공개하고 승부를 판정합니다.",
    "기본승은 더 높은 숫자를 제출한 플레이어가 승리하는 방식입니다.",
    "역전승은 높은 숫자가 낮은 숫자의 2배보다 클 경우, 낮은 숫자를 제출한 플레이어가 승리하는 방식입니다.",
    "더블승은 높은 숫자가 낮은 숫자의 정확히 2배일 경우, 높은 숫자를 제출한 플레이어가 승리하는 방식입니다.",
    "같은 숫자를 낸 경우 무승부이며 승점 변동은 없습니다.",
    "1~2세트에서는 모든 승리 점수가 1점입니다.",
    "3~4세트에서는 기본승과 역전승은 1점, 더블승은 2점입니다.",
    "5~6세트에서는 기본승과 역전승은 2점, 더블승은 4점입니다.",
    "6세트 종료 시 승점이 더 높은 플레이어가 최종 승리합니다.",
    "동률일 경우 연장전 1세트를 추가로 진행합니다.",
  ],
  win_condition: "6세트 종료 시 승점이 더 높은 플레이어가 승리",
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
