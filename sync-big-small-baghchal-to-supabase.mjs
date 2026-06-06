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

const games = [
  {
    id: "big-small",
    title: "빅스몰",
    summary: "비공개 카드 선택과 베팅으로 상대보다 큰 숫자 또는 작은 숫자를 맞히는 1:1 심리 베팅 게임",
    rules: [
      "빅스몰은 라운드마다 자신이 이길 방향을 예측하고 베팅하는 1:1 카드 심리 게임입니다.",
      "각 플레이어는 숫자 카드와 베팅 칩을 가지고 시작합니다.",
      "라운드가 시작되면 각 플레이어는 이번 라운드에 사용할 숫자 카드 1장을 비공개로 선택합니다.",
      "카드를 선택한 뒤, 플레이어들은 이번 승부가 빅인지 스몰인지 판단해 베팅을 진행합니다.",
      "빅은 더 높은 숫자 카드가 승리하는 승부입니다.",
      "스몰은 더 낮은 숫자 카드가 승리하는 승부입니다.",
      "베팅은 선 플레이어부터 진행하며, 콜, 레이즈, 폴드 방식으로 진행합니다.",
      "한 플레이어가 폴드하면 상대가 공개 없이 베팅된 칩을 획득합니다.",
      "베팅이 같은 금액으로 맞춰지면 두 플레이어의 카드를 공개하고, 해당 라운드의 빅 또는 스몰 판정에 따라 승자를 정합니다.",
      "승리한 플레이어는 베팅된 칩을 모두 획득합니다.",
      "카드 공개 후 숫자가 같아 승부가 나지 않으면 해당 라운드는 무승부로 처리하고, 운영자 판정에 따라 칩을 다음 라운드로 이월하거나 반환합니다.",
      "사용한 숫자 카드는 버려지며, 같은 카드는 다시 사용할 수 없습니다.",
      "한 플레이어의 칩이 모두 떨어지면 게임이 종료됩니다.",
    ],
    win_condition: "상대의 칩을 모두 획득한 플레이어가 승리",
  },
  {
    id: "baghchal",
    title: "바그찰",
    summary: "호랑이는 염소를 잡고, 염소는 호랑이를 봉쇄하는 비대칭 1:1 추상전략 보드게임",
    rules: [
      "바그찰은 호랑이 진영과 염소 진영으로 나뉘어 진행하는 1:1 비대칭 전략 게임입니다.",
      "게임판은 5x5 점과 점을 잇는 선으로 구성됩니다.",
      "한 플레이어는 호랑이 4마리를, 다른 플레이어는 염소 20마리를 담당합니다.",
      "게임 시작 시 호랑이 4마리는 게임판 네 모서리에 배치됩니다.",
      "염소는 처음에는 판 밖에 있으며, 염소 플레이어가 자기 차례마다 한 마리씩 빈 점에 배치합니다.",
      "모든 염소가 배치되기 전까지 염소는 이동할 수 없습니다.",
      "호랑이는 자기 차례에 선으로 연결된 인접한 빈 점으로 1칸 이동할 수 있습니다.",
      "호랑이는 인접한 염소 너머의 다음 점이 비어 있고 선으로 연결되어 있다면, 염소를 뛰어넘어 잡을 수 있습니다.",
      "호랑이가 염소를 뛰어넘어 잡으면 해당 염소는 게임판에서 제거됩니다.",
      "염소 20마리가 모두 배치된 뒤부터 염소는 자기 차례에 선으로 연결된 인접한 빈 점으로 1칸 이동할 수 있습니다.",
      "염소는 호랑이를 잡을 수 없습니다.",
      "염소 진영은 호랑이 4마리가 더 이상 이동하거나 염소를 잡을 수 없도록 봉쇄하면 승리합니다.",
      "호랑이 진영은 염소 5마리를 잡으면 승리합니다.",
      "같은 판세가 반복되거나 승부가 나지 않는다고 판단되면 운영자 판정으로 무승부 또는 재경기를 진행합니다.",
    ],
    win_condition: "호랑이는 염소 5마리를 잡으면 승리하고, 염소는 호랑이 4마리를 모두 봉쇄하면 승리",
  },
];

const response = await fetch(`${supabaseUrl}/rest/v1/games?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(games),
});

if (!response.ok) {
  throw new Error(`Supabase upsert failed: ${response.status} ${await response.text()}`);
}

const savedGames = await response.json();
console.log(`Synced games: ${savedGames.map((game) => game.id).join(", ")}`);
