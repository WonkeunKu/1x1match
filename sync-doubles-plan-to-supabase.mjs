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
  id: "doubles-plan",
  title: "더블스 플랜",
  summary: "상대의 숫자 타일을 읽어내고 역전 조건을 계산하는 심리 전략 게임",
  rules: [
    "게임에는 1~12 숫자 블록을 사용하며, 뒷면 색은 빨강과 검정 2종류로 나뉩니다. 3~9까지 7종류는 빨강, 나머지 5종류는 검정입니다.",
    "게임은 총 4세트로 진행하며, 한 세트는 블록 선택 단계와 숫자 대결 단계로 구성됩니다.",
    "선 플레이어부터 번갈아 뒷면만 보고 블록을 하나씩 선택합니다. 각자 빨강 3개와 검정 2개, 총 5개의 블록을 선택해 본인만 확인합니다.",
    "선택 후 남은 2종류의 블록은 공개하지 않고 게임에서 제외합니다.",
    "블록 선택이 끝나면 5번의 숫자 대결을 진행합니다.",
    "숫자 대결에서는 선 플레이어가 블록 하나를 제출하고, 후 플레이어가 이를 확인한 뒤 블록 하나를 제출합니다. 제출된 두 블록은 차례대로 공개합니다.",
    "기본승은 더 높은 숫자를 제출한 플레이어가 승리하는 방식입니다.",
    "역전승은 높은 숫자가 낮은 숫자의 2배보다 클 경우, 낮은 숫자를 제출한 플레이어가 승리하는 방식입니다.",
    "더블승은 높은 숫자가 낮은 숫자의 정확히 2배일 경우, 높은 숫자를 제출한 플레이어가 승리하는 방식입니다.",
    "1세트에서는 모든 승리가 1점입니다.",
    "2세트에서는 기본승과 역전승은 1점, 더블승은 2점입니다.",
    "3세트와 4세트에서는 기본승과 역전승은 2점, 더블승은 4점입니다.",
    "4세트 종료 후 점수가 높은 플레이어가 승리합니다.",
    "동점일 경우 3세트와 4세트의 점수 규칙으로 연장전을 진행합니다.",
  ],
  win_condition: "4세트 종료 후 점수가 높은 플레이어가 승리",
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
