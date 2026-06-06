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
  id: "number-shogi",
  title: "숫자장기",
  summary: "숫자말, 지뢰, 왕을 숨겨 배치하고 접촉 대결의 계산 판정으로 상대 진영을 공략하는 1:1 전략 보드게임",
  rules: [
    "숫자장기는 각 플레이어가 자신의 말을 비공개로 배치한 뒤, 상대의 왕을 잡거나 상대 말을 모두 제거하는 1:1 보드게임입니다.",
    "게임판은 가로 6칸, 세로 9칸으로 구성됩니다.",
    "각 플레이어는 1부터 10까지의 숫자말 10개, 지뢰 3개, 왕 1개로 총 14개의 말을 가지고 시작합니다.",
    "각 플레이어는 자신을 기준으로 앞쪽 3줄 안에 말을 비공개로 배치합니다.",
    "모든 말은 뒤집힌 상태로 게임을 시작하며, 상대는 말의 위치만 볼 수 있고 각 말의 정체는 알 수 없습니다.",
    "선 플레이어부터 번갈아 차례를 진행하며, 자기 차례에는 이동 가능한 자신의 말 1개를 선택해 이동합니다.",
    "말은 자신이 바라보는 방향을 기준으로 양옆과 대각선으로 1칸, 앞으로 최대 2칸까지 이동할 수 있습니다.",
    "말은 뒤쪽과 뒤쪽 대각선으로 이동할 수 없으며, 다른 말이 있는 칸으로 이동하거나 다른 말을 뛰어넘을 수 없습니다.",
    "지뢰는 이동할 수 없습니다.",
    "말 이동 후 상대 말과 상하좌우로 맞닿으면 즉시 대결이 성립합니다.",
    "대결이 성립하면 맞닿은 말들의 앞면을 공개하고, 판정 후 패배한 말은 제거합니다.",
    "숫자말끼리 대결할 경우 두 숫자의 합이 10 이상이면 더 높은 숫자의 말이 승리합니다.",
    "숫자말끼리 대결할 때 두 숫자의 합이 10 미만이면 더 낮은 숫자의 말이 승리합니다.",
    "마이너스 표시를 사이에 두고 맞닿은 경우에는 마이너스 매치로 진행합니다. 큰 수에서 작은 수를 뺀 값이 10 이상이면 높은 숫자가, 10 미만이면 낮은 숫자가 승리합니다.",
    "두 말 중 하나가 지뢰라면 지뢰가 자폭하며 대결한 두 말이 모두 제거됩니다.",
    "왕은 대결 능력이 없습니다. 왕이 다른 말과 대결하면 왕이 제거되고 상대가 즉시 승리합니다.",
    "두 왕이 대결한 경우에는 두 왕을 공개한 상태로 게임을 계속합니다.",
    "여러 상대 말과 동시에 맞닿은 경우에는 맞닿은 모든 말과 동시에 대결합니다.",
    "자신의 말이 상대 진영의 가장 끝 줄에 도달하면, 제거된 자신의 말 1개를 공개 상태로 되살릴 수 있습니다.",
    "상대의 왕을 제거하거나, 왕을 제외한 상대의 모든 말을 제거하면 승리합니다.",
    "자신의 왕이 상대 진영의 가장 끝 줄에 도달해도 승리합니다.",
  ],
  win_condition: "상대의 왕을 제거하거나, 왕을 제외한 상대의 모든 말을 제거하거나, 자신의 왕을 상대 진영 끝 줄에 도달시킨 플레이어가 승리",
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
