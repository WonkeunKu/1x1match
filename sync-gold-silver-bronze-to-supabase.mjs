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
  id: "gold-silver-bronze",
  title: "금은동 게임",
  summary: "무게가 다른 금, 은, 동 토끼를 조합해 베팅으로 더 많은 칩을 획득하는 심리 베팅 게임",
  rules: [
    "금은동 게임은 플레이어들이 금, 은, 동 토끼를 조합해 베팅에서 승리하는 게임입니다.",
    "게임 시작 전 각 플레이어는 금토끼 3개, 은토끼 10개, 동토끼 20개, 칩 30개를 가지고 시작합니다.",
    "각 토끼에는 무게가 있으며 금토끼는 3g, 은토끼는 2g, 동토끼는 1g입니다.",
    "라운드마다 선 플레이어부터 최대 12g이 되도록 토끼를 올립니다. 후 플레이어는 선 플레이어의 무게를 확인한 뒤 최대 2g 차이만큼 토끼를 올립니다.",
    "두 플레이어가 무게를 확인하면 기본 칩 3개를 베팅하고, 선 플레이어부터 레이즈, 콜, 폴드 방식으로 베팅을 진행합니다.",
    "레이즈는 상대가 건 칩보다 더 많은 칩을 베팅하는 행동입니다.",
    "콜은 상대가 건 칩과 같은 개수의 칩을 베팅하는 행동입니다.",
    "폴드는 더 이상 베팅하지 않고 포기하는 행동입니다.",
    "콜 이후 서로의 토끼를 공개해 승부를 가립니다. 전체 무게와 관계없이 금토끼가 더 많은 쪽이 승리합니다.",
    "금토끼 수가 같으면 은토끼가 더 많은 쪽, 은토끼 수까지 같으면 동토끼가 더 많은 쪽이 승리합니다. 즉 금, 은, 동 순서로 더 강한 족보가 됩니다.",
    "포기한 경우 서로의 토끼는 공개하지 않고 상대방이 승리합니다.",
    "승부에서 승리한 플레이어는 베팅된 칩을 전부 획득하고, 다음 라운드의 선 플레이어가 됩니다. 1라운드 선 플레이어는 카이로스 게임 최하위자로 정합니다.",
    "승부가 무승부라면 베팅된 칩은 다음 라운드에서 승리한 플레이어가 전부 획득합니다.",
    "한 명의 토끼가 모두 소모되면 게임이 즉시 종료됩니다. 어느 플레이어가 남은 토끼로 최소 무게 조건을 맞출 수 없거나 기본 베팅이 불가능한 경우에도 즉시 종료됩니다.",
    "게임 종료 시 남은 토끼는 1g당 칩 1개로 교체하며, 더 많은 칩을 보유한 플레이어가 체크아웃 게임에서 승리합니다.",
    "패배한 플레이어는 더 타임 호텔에서 체크아웃하고, 승리한 플레이어는 패배한 플레이어가 보유한 시간과 다음 게임까지의 생존 보장 시간을 획득합니다.",
    "플레이어는 게임 시작 전 한계 10g 한도로 아이템을 구매할 수 있습니다. 은토끼는 개당 30분, 동토끼는 개당 10분입니다.",
    "게임 중 펜과 노트 사용이 가능합니다.",
    "토끼 무게 조합은 약한 패부터 나열하면 (금토끼, 은토끼, 동토끼) 형식으로 정리할 수 있습니다. 13~14g 조합은 선공이 12g을 제출한 경우에만 가능한 패입니다.",
    "기본 전략은 상대의 토끼 무게 총량을 계산하며 토끼를 카운팅하는 것입니다. 상대가 무게를 맞히기 위해 동토끼를 함께 쓰게 만들면 후반 승부에서 유리해질 수 있습니다.",
    "무게가 0g이 되도록 올릴 수도 있지만, 이 경우 선후공과 관계없이 패배가 확정되기 쉽기 때문에 많은 칩을 확보했거나 상대 토끼를 소모시키는 목적이 아니라면 위험합니다.",
    "카이로스 게임 최하위자가 1라운드 선 플레이어라는 점 때문에 기본적으로 후공이 유리한 게임입니다.",
  ],
  win_condition: "게임 종료 시 토끼 환산 후 더 많은 칩을 보유한 플레이어가 승리",
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
