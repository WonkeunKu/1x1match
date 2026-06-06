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
  id: "monorail",
  title: "모노레일",
  summary: "철로 타일을 번갈아 배치해 기차역에서 다시 기차역으로 돌아오는 하나의 순환선 철로를 완성하는 전략 게임",
  rules: [
    "두 플레이어는 양쪽 끝으로 철로가 열려 있는 2개의 기차역 타일을 두고 게임을 시작합니다.",
    "플레이어들은 16개의 철로 타일을 번갈아 배치해, 기차역에서 출발해 다시 기차역으로 돌아오는 하나의 순환선 철로를 완성해야 합니다.",
    "철로 타일은 양면으로 구성되어 있으며, 한 면은 직선 철로, 다른 한 면은 ㄱ자 모양 철로입니다.",
    "선 플레이어부터 번갈아 차례를 진행하며, 자기 차례에는 철로 타일을 1개에서 3개까지 놓을 수 있습니다.",
    "타일 배치 시간에는 제한이 없습니다.",
    "타일은 원하는 면을 선택해 놓을 수 있지만, 반드시 이미 놓인 타일의 상하좌우 중 한 면에 맞닿게 배치해야 합니다.",
    "새로 놓는 타일이 반드시 기존 철로와 연결되어야 하는 것은 아닙니다.",
    "한 차례에 타일을 2개 이상 놓는 경우, 새로 놓는 타일들은 서로 나란히 일렬로 배치해야 합니다.",
    "철로를 완성할 때 16개의 타일을 모두 사용할 필요는 없지만, 이미 놓인 철로는 모두 하나로 연결된 상태여야 합니다.",
    "번갈아 타일을 놓다가 기차역에서 기차역으로 이어지는 철로를 완성하는 마지막 타일을 놓은 플레이어가 승리합니다.",
    "게임 도중 자기 턴 시작 시, 남아 있는 타일로 하나로 연결된 철로를 완성할 수 없다고 판단하면 불가능을 선언할 수 있습니다.",
    "불가능이 선언되면 상대 플레이어는 남은 타일을 이용해 철로 완성에 도전해야 합니다.",
    "상대가 남은 타일로 하나로 연결된 철로를 완성하면 상대 플레이어가 승리하고, 실패하면 불가능을 선언한 플레이어가 승리합니다.",
    "핵심은 몇 개의 타일이 남았는지와 어떤 형태의 빈 공간이 남을지를 항상 계산하는 것입니다.",
    "직선으로만 이어진 빈 공간, ㄱ자 모양으로 꺾인 빈 공간, 여러 칸이 연속된 빈 공간은 남은 직선 타일과 ㄱ자 타일의 수에 따라 필승 또는 필패 형태가 될 수 있습니다.",
    "상대가 만든 모양을 그대로 따라가는 전략은 위험합니다. 눈으로는 대칭처럼 보여도 처음 두 칸을 제외하면 실제 경로 길이가 달라져, 상대에게 완성 기회를 넘겨줄 수 있습니다.",
    "자기 차례에 타일을 놓을 때는 이번에 놓는 타일 수뿐 아니라, 다음 턴 이후 남게 될 빈 공간의 모양과 필요한 타일 개수까지 함께 계산해야 합니다.",
  ],
  win_condition: "기차역과 기차역을 잇는 하나의 철로를 완성하거나, 불가능 선언 판정에서 승리한 플레이어가 승리",
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
