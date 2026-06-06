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
  id: "secret-dice",
  title: "시크릿 다이스",
  summary: "숨겨진 주사위 선택과 제한된 개입권으로 높은 점수 조합을 만드는 1:1 확률 전략 게임",
  rules: [
    "시크릿 다이스는 5개의 주사위를 굴려 점수표의 각 항목을 채우는 1:1 주사위 게임입니다.",
    "각 플레이어는 같은 점수표를 가지고 시작하며, 한 번 사용한 점수 항목은 다시 사용할 수 없습니다.",
    "게임은 총 12라운드로 진행하며, 선 플레이어부터 번갈아 차례를 진행합니다.",
    "자기 차례가 되면 주사위 5개를 굴립니다.",
    "플레이어는 굴린 결과를 확인한 뒤 원하는 주사위를 고정하고, 나머지 주사위를 다시 굴릴 수 있습니다.",
    "한 차례에는 최초 굴림을 포함해 최대 3번까지 주사위를 굴릴 수 있습니다.",
    "시크릿 다이스에서는 플레이어가 고정한 주사위 정보가 상대에게 모두 공개되지 않습니다. 운영자는 공개 범위를 차례 시작 전 동일하게 안내합니다.",
    "상대 플레이어는 정해진 개입권을 사용해 상대의 주사위 선택 또는 재굴림에 영향을 줄 수 있습니다.",
    "개입권은 한정되어 있으며, 한 번 사용한 개입권은 다시 사용할 수 없습니다.",
    "주사위 굴림이 끝나면 플레이어는 남은 점수 항목 중 하나를 선택해 해당 항목에 점수를 기록합니다.",
    "상단 점수 항목은 1부터 6까지 각 숫자 주사위의 합으로 계산합니다.",
    "초이스는 5개 주사위 눈의 총합으로 계산합니다.",
    "포카드는 같은 눈 4개 이상이 있을 때 5개 주사위 눈의 총합으로 계산합니다.",
    "풀하우스는 같은 눈 3개와 같은 눈 2개가 함께 있을 때 5개 주사위 눈의 총합으로 계산합니다.",
    "스몰 스트레이트는 연속된 숫자 4개 이상이 있을 때 15점으로 계산합니다.",
    "라지 스트레이트는 연속된 숫자 5개가 있을 때 30점으로 계산합니다.",
    "요트는 같은 눈 5개가 나왔을 때 50점으로 계산합니다.",
    "선택한 항목의 조건을 만족하지 못하면 해당 항목은 0점으로 기록합니다.",
    "모든 라운드가 끝난 뒤 총점이 더 높은 플레이어가 승리합니다.",
    "동점일 경우 운영자가 정한 연장 라운드 또는 단판 주사위 승부로 승자를 정합니다.",
  ],
  win_condition: "12라운드 종료 후 점수표 총점이 더 높은 플레이어가 승리",
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
