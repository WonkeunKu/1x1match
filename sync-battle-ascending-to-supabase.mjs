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
  id: "battle-ascending",
  title: "배틀 오름차순",
  summary: "비공개 숫자 선택과 공개 순서 싸움으로 더 많은 점수를 노리는 1:1 숫자 배열 전략 게임",
  rules: [
    "배틀 오름차순은 숫자를 오름차순으로 이어 붙이며 상대보다 유리한 배열을 만드는 1:1 숫자 전략 게임입니다.",
    "각 플레이어는 동일한 숫자 타일 세트를 가지고 시작합니다.",
    "게임은 여러 라운드로 진행하며, 라운드마다 선 플레이어부터 번갈아 숫자 타일을 제출합니다.",
    "제출한 숫자 타일은 자신의 배열에 왼쪽에서 오른쪽으로 놓습니다.",
    "배열은 낮은 숫자에서 높은 숫자로 이어지는 오름차순이 되도록 만들어야 합니다.",
    "이미 놓인 숫자보다 낮은 숫자를 뒤에 놓으면 해당 배열은 끊긴 것으로 처리합니다.",
    "플레이어는 상대가 남긴 숫자 범위와 남은 타일을 추리해, 자신의 배열이 더 길게 이어지도록 선택합니다.",
    "라운드 종료 시 각 플레이어의 배열에서 정상적으로 이어진 오름차순 구간을 확인합니다.",
    "더 긴 오름차순 구간을 만든 플레이어가 해당 라운드 승점을 획득합니다.",
    "구간 길이가 같으면 가장 높은 마지막 숫자가 더 큰 플레이어가 승리합니다.",
    "마지막 숫자도 같으면 해당 라운드는 무승부로 처리합니다.",
    "사용한 숫자 타일은 해당 라운드에서 다시 사용할 수 없습니다.",
    "운영자는 매 라운드 시작 전 사용 숫자 범위, 제출 횟수, 제한 시간을 두 플레이어에게 동일하게 고지합니다.",
    "총 라운드 종료 후 승점이 더 높은 플레이어가 승리합니다.",
  ],
  win_condition: "총 라운드 종료 후 더 많은 승점을 획득한 플레이어가 승리",
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
