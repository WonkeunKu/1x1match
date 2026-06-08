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
  id: "arithmetic-lotto",
  title: "사칙 연산 로또",
  summary: "숫자 카드와 무작위 연산기호로 당첨 번호에 맞는 수식을 만드는 계산 게임",
  rules: [
    "사칙 연산 로또는 숫자 카드 8장과 연산기호 3개를 이용해 6개의 당첨 번호에 해당하는 수식을 만드는 게임입니다.",
    "게임이 시작되면 사칙연산으로 만들어야 할 6개의 당첨 번호가 공개됩니다.",
    "각 플레이어에게는 1~6까지의 숫자 카드 중 랜덤으로 8장이 지급됩니다.",
    "지배인이 더하기, 빼기, 곱하기, 나누기, 제곱, 별표로 구성된 연산 주사위 3개를 동시에 굴립니다.",
    "연산 순서는 정규 수식과 같습니다. 별표 기호는 앞뒤에 배치된 숫자를 연결합니다. 예를 들어 1×2★3+4는 2★7이 되어 27로 처리됩니다.",
    "플레이어는 자신이 가진 숫자 카드 중 4장과 주사위에서 나온 연산기호 3개를 모두 사용해 수식을 완성해야 합니다.",
    "주사위가 굴려진 뒤 먼저 종을 친 플레이어에게 기회가 주어지며, 15초 안에 수식을 완성해야 합니다.",
    "완성한 수식의 결과가 당첨 번호 중 하나에 해당하면 성공입니다. 성공한 경우 사용한 숫자 카드 4장은 수거되고, 새로운 숫자 카드 4장이 지급됩니다.",
    "한 플레이어가 수식을 완성하거나 주사위를 굴리고 3분간 아무도 맞히지 못하면 연산기호가 리셋됩니다.",
    "수식 완성에 실패한 플레이어는 기호가 리셋될 때까지 재도전할 수 없습니다.",
    "한 플레이어가 6개의 당첨 번호를 모두 완성하면 해당 플레이어의 승리로 게임을 종료합니다.",
    "아이템으로 카드 교체권을 사용할 수 있습니다. 카드 교체권은 30분을 소모해 자신의 숫자 카드 중 1장을 반납하고 1장을 새로 뽑는 효과입니다.",
    "순수한 계산 실력과 순발력을 겨루는 게임이며, 숫자 카드 교체 아이템은 사용할 수 있지만 성공할 때마다 카드가 교체되므로 급한 패 말림이 아니라면 신중하게 사용하는 것이 좋습니다.",
  ],
  win_condition: "먼저 6개의 당첨 번호를 모두 완성한 플레이어가 승리",
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
