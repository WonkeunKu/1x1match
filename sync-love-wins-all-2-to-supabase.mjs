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
  id: "love-wins-all-2",
  title: "러브 윈즈 올2",
  summary: "가위바위보 상성, 러브 카드, 라이어 카드를 활용하는 4장 조합 베팅 게임",
  rules: [
    "게임에는 총 49장의 카드를 사용합니다. 가위 18장, 바위 12장, 보 12장, 러브 6장, 라이어 1장으로 구성됩니다.",
    "플레이어는 공유 카드 1장과 개인 카드 3장, 총 4장의 카드 조합으로 승부합니다.",
    "족보는 러브 윈즈 올, 쓰리 러브, 포카드, 믹스, 투 러브, 투페어, 트리플, 원페어, 원 러브 순으로 강합니다.",
    "러브 윈즈 올은 러브 4장, 쓰리 러브는 러브 3장, 포카드는 러브가 아닌 같은 카드 4장입니다.",
    "믹스는 러브, 가위, 바위, 보가 각각 1장인 조합입니다.",
    "투 러브는 러브 2장, 투페어는 러브 없이 같은 카드 2장 두 쌍, 트리플은 러브 없이 같은 카드 3장입니다.",
    "원페어는 러브 없이 같은 카드 2장, 원 러브는 러브 카드가 1장인 조합입니다.",
    "동일한 유형의 족보는 가위바위보 조합으로 승부를 결정합니다. 조합까지 같으면 나머지 카드의 상성으로 비교하고, 이마저 같으면 무승부입니다.",
    "믹스와 원 러브끼리의 대결은 무승부 처리합니다.",
    "투 러브끼리 대결할 때 둘 모두 남은 2장이 페어라면 가위바위보 상성을 비교하고, 같은 조합이면 무승부입니다.",
    "투 러브 대결에서 한쪽만 남은 2장이 페어라면 해당 플레이어가 승리합니다. 둘 모두 페어가 아니라면 겹치지 않는 가위바위보 카드 1장으로 승부합니다.",
    "각 플레이어는 칩 35개를 가지고 시작합니다. 1라운드 선 플레이어는 추첨으로 정하고, 2라운드부터는 전 라운드 승자가 선 플레이어가 됩니다.",
    "라운드 시작 시 각 플레이어는 기본 베팅으로 칩 1개를 내고 개인 카드 2장을 받습니다. 이후 딜러가 공유 카드 1장을 공개합니다.",
    "카드 배분 후 1차 베팅을 진행합니다. 베팅 방식은 통상적인 포커 방식과 같습니다.",
    "1차 베팅 후 각 플레이어는 개인 카드 1장을 추가로 받고, 자신의 카드 3장 중 1장을 동시에 오픈합니다.",
    "선 플레이어부터 자신의 조합을 선언합니다. 선언 조합은 공유 카드와 개인 카드를 기반으로 가능한 조합이어야 합니다.",
    "족보 선언 후 2차 베팅을 진행하고, 2차 베팅이 끝나면 나머지 2장의 카드를 오픈합니다. 족보가 높은 플레이어가 승리합니다.",
    "무승부가 나오면 베팅된 칩은 다음 라운드로 넘어갑니다.",
    "베팅이 어느 한쪽의 포기로 종료되면 카드는 공개하지 않습니다. 부주의로 카드가 공개된 경우 카드 변경 없이 진행합니다.",
    "매 라운드 사용한 카드는 버려지며, 7라운드 종료 시 새로운 덱으로 교체합니다.",
    "라이어 카드는 선언 규칙을 따르면서 원하는 카드 조합으로 자유롭게 선언할 수 있습니다.",
    "라이어 카드가 공유 카드로 등장했다면 각자 원하는 패로 선언할 수 있으며, 카드 공개 단계에서 딜러에게 선언합니다.",
    "라이어 카드를 사용해 승부에서 패배하면 페널티로 상대에게 칩 5개를 추가로 지불합니다.",
    "같은 등급의 조합 비교에서 라이어 카드를 사용한 경우에는 패배합니다.",
  ],
  win_condition: "한 플레이어가 모든 칩을 획득하면 해당 플레이어가 승리",
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
