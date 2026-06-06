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
    id: "nine-mens-morris",
    title: "나인 멘스 모리스",
    summary: "말을 배치하고 이동해 3목을 만들며 상대 말을 제거하는 1:1 추상전략 보드게임",
    rules: [
      "나인 멘스 모리스는 각자 9개의 말을 사용해 3개의 말을 한 줄로 만드는 게임입니다.",
      "게임판은 선으로 연결된 24개의 점으로 구성됩니다.",
      "두 플레이어는 서로 다른 색의 말 9개씩을 가지고 시작합니다.",
      "게임은 배치 단계와 이동 단계로 나뉘어 진행합니다.",
      "배치 단계에서는 선 플레이어부터 번갈아 제한 시간 90초 안에 자신의 말 1개를 빈 점에 놓습니다.",
      "자신의 말 3개가 선으로 연결된 한 줄을 이루면 밀을 완성한 것으로 처리합니다.",
      "밀을 완성한 플레이어는 상대 말 1개를 선택해 제거할 수 있습니다.",
      "상대가 이미 완성한 밀 안에 있는 말은 원칙적으로 제거할 수 없습니다. 단, 상대의 모든 말이 밀 안에 있다면 그중 하나를 제거할 수 있습니다.",
      "양쪽의 말 9개가 모두 배치되면 이동 단계로 넘어갑니다.",
      "이동 단계에서는 자기 차례마다 자신의 말 1개를 선으로 연결된 인접한 빈 점으로 이동합니다.",
      "이동을 통해 새로 밀을 완성한 경우에도 상대 말 1개를 제거할 수 있습니다.",
      "한 플레이어의 말이 3개만 남으면 해당 플레이어는 자신의 말을 인접한 점이 아닌 빈 점 아무 곳으로나 이동할 수 있습니다.",
      "상대의 말을 2개 이하로 줄이면 승리합니다.",
      "상대가 자기 차례에 이동할 수 있는 말이 없도록 만들면 승리합니다.",
      "둘 중 한 플레이어의 말이 3개만 남은 상태에서 교착 상태가 10턴 이상 이어지면, 남아 있는 말이 더 적은 플레이어가 패배합니다.",
      "총 3라운드로 진행하며, 먼저 2라운드를 승리한 플레이어가 게임에서 승리합니다.",
    ],
    win_condition: "3라운드 중 먼저 2라운드를 승리한 플레이어가 승리",
  },
  {
    id: "hexagon",
    title: "헥사곤",
    summary: "19개 육각형 칸의 숫자를 기억하고 목표 숫자가 되는 3칸 조합을 찾는 1:1 암기 연산 게임",
    rules: [
      "헥사곤은 육각형 게임판에 숨겨진 숫자를 기억해 목표 숫자를 만드는 3칸 조합을 찾는 게임입니다.",
      "게임판은 19개의 육각형 칸으로 구성됩니다.",
      "각 칸에는 숫자가 하나씩 적혀 있으며, 게임 시작 전 모든 숫자를 30초 동안 공개합니다.",
      "30초가 지나면 모든 숫자를 가립니다.",
      "30초가 지나면 게임판은 알파벳 뒷면으로 바뀌고, 해당 라운드의 타겟 넘버가 공개됩니다.",
      "플레이어는 타겟 넘버를 만들 수 있다고 판단하면 버저를 누릅니다.",
      "버저를 누른 플레이어는 제한 시간 10초 안에 가로 또는 대각선으로 연속되는 알파벳 칸 3개를 말합니다.",
      "지정한 3칸의 숫자 합이 타겟 넘버와 같으면 정답으로 인정됩니다.",
      "정답을 맞힌 플레이어는 승점 1점을 획득합니다.",
      "오답, 이미 나온 정답 선언, 숫자로 선언, 제한 시간 초과는 모두 오답으로 처리되며 해당 플레이어는 승점 1점을 잃습니다.",
      "선언한 구역의 앞면은 공개되지 않으며, 이미 선언된 정답 역시 게임판에 표시되지 않습니다.",
      "라운드별 정답 개수는 공개되지 않습니다.",
      "모든 정답이 나오거나 90초 동안 아무도 버저를 누르지 않으면 해당 라운드는 종료됩니다.",
      "새 라운드가 시작되면 새로운 게임판과 새로운 타겟 넘버가 공개됩니다.",
      "총 10라운드를 진행하며, 모든 라운드 종료 후 승점이 더 높은 플레이어가 승리합니다.",
      "동점일 경우 연장 라운드를 진행합니다.",
    ],
    win_condition: "10라운드 종료 시 더 많은 승점을 획득한 플레이어가 승리",
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
