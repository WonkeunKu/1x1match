import { createServer } from "node:http";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createPaymentProvider, createSmsProvider } from "./integrations.mjs";
import { createStorage } from "./storage.mjs";

const root = process.cwd();
const storagePath = join(root, "app-data.json");

function loadLocalEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadLocalEnv();

const storageDriver = process.env.STORAGE_DRIVER || "json";
const storage = createStorage({ driver: storageDriver, jsonPath: storagePath });
const paymentProvider = createPaymentProvider({ provider: process.env.PAYMENT_PROVIDER || "mock" });
const smsProvider = createSmsProvider({ provider: process.env.SMS_PROVIDER || "mock" });
const adminPassword = process.env.ADMIN_PASSWORD || "mindmatch-admin";
const sessionSecret = process.env.SESSION_SECRET || adminPassword;
const bankAccountLabel = process.env.BANK_ACCOUNT_LABEL || "계좌 정보 준비 중";
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const state = {
  currentUserId: null,
  isAdmin: false,
  members: [],
  games: [
    {
      id: "memory-dinner",
      title: "기억의 만찬",
      summary: "20개의 그릇 속 토큰 개수를 기억해 같은 개수의 두 그릇을 찾아내는 암기 게임",
      rules: [
        "테이블에는 1부터 20까지 번호가 적힌 커버와 접시가 놓이며, 각 플레이어는 배치 토큰 45개를 가지고 시작합니다.",
        "선 플레이어부터 원하는 빈 접시에 토큰 1개를 배치하고 커버를 덮습니다. 후 플레이어도 같은 방식으로 진행하며, 이미 토큰이 들어 있는 접시에는 배치할 수 없습니다.",
        "이후 순서대로 접시에 넣는 토큰 수를 1개씩 늘려 9개까지 배치합니다. 두 플레이어가 지급받은 45개 토큰을 모두 배치할 때까지 반복합니다.",
        "토큰 개수는 오직 암기로만 기억해야 하며, 물리적으로 기록하면 몰수패 처리됩니다.",
        "배치가 끝나면 각 플레이어는 토큰 10개를 추가로 받고, 선 플레이어부터 제한 시간 1분 안에 원하는 접시 2개의 커버를 오픈합니다.",
        "1분 안에 오픈할 접시를 선택하지 못하면 페널티로 토큰 2개를 추가로 받습니다.",
        "오픈한 두 접시의 토큰 개수가 일치하면 자신의 토큰 1개를 두 접시 중 한 곳에 추가합니다. 일치하지 않으면 페널티로 토큰 1개를 추가로 받습니다.",
      ],
      win: "먼저 자신의 토큰을 전부 소진한 플레이어가 승리",
    },
    {
      id: "position-combo",
      title: "위치, 콤보",
      summary: "숫자의 위치를 암기한 뒤 4칸 조합으로 더 강한 족보를 만드는 기억력·조합 게임",
      rules: [
        "게임은 게임판 설정 단계와 족보 제출 단계로 나뉩니다.",
        "각 플레이어는 5x5 게임판을 받고, 선 플레이어부터 번갈아가며 딜러가 굴린 1~10 숫자를 자신의 게임판 빈칸에 비공개로 배치합니다.",
        "게임판 설정이 끝나면 각 플레이어는 자신이 암기한 숫자 위치를 바탕으로 족보를 선언합니다.",
        "족보는 가로, 세로, 대각선으로 인접한 4칸의 숫자 조합으로만 만들 수 있습니다.",
        "이미 선언에 사용한 위치는 다시 사용할 수 없습니다.",
        "족보 순위는 쿼드, 로열 스트레이트, 스트레이트, 투페어, 트리플, 원페어, 하이 순입니다.",
        "같은 족보라면 사용한 숫자 합이 더 높은 쪽이 승리합니다. 숫자까지 완전히 같으면 무승부로 처리하고 다시 제출합니다.",
        "족보가 더 높은 플레이어가 승점을 획득하며, 12라운드 종료 후 승점이 더 높은 플레이어가 승리합니다.",
      ],
      win: "12라운드 종료 후 승점이 더 높은 플레이어가 승리",
    },
    {
      id: "love-wins-all",
      title: "러브 윈즈 올",
      summary: "가위바위보 카드 족보와 베팅으로 상대의 칩을 모두 빼앗는 심리 베팅 게임",
      rules: [
        "게임에는 가위 12장, 바위 7장, 보 7장, 러브 4장으로 총 30장의 카드를 사용합니다.",
        "족보 순위는 러브 윈즈 올, 트리플, 투 러브, 믹스, 더블, 원 러브 순입니다.",
        "러브 윈즈 올은 러브 카드 3장, 트리플은 같은 가위바위보 카드 3장, 투 러브는 러브 카드 2장입니다.",
        "믹스는 가위·바위·보가 각각 1장, 더블은 같은 가위바위보 카드 2장, 원 러브는 러브 카드 1장과 서로 다른 나머지 2장입니다.",
        "동일한 유형의 족보는 가위바위보 상성으로 승부를 정하고, 무승부라면 나머지 카드의 상성으로 승부를 정합니다.",
        "투 러브끼리는 남은 카드 1장의 상성으로 승부를 정하며, 원 러브끼리는 무승부 처리합니다.",
        "각 플레이어는 칩 25개로 시작하고, 라운드 시작 시 기본 베팅으로 칩 1개를 냅니다.",
        "카드 3장을 받은 뒤 1차 베팅을 진행하고, 각자 카드 1장을 공개한 뒤 족보를 선언합니다. 족보는 거짓으로 선언할 수 있습니다.",
        "족보 선언 후 2차 베팅을 진행하고, 베팅이 끝나면 모든 카드를 공개해 더 높은 족보의 플레이어가 라운드에서 승리합니다.",
        "무승부가 나오면 베팅된 칩은 다음 라운드로 넘어갑니다. 한쪽의 포기로 베팅이 끝난 경우 카드는 공개하지 않습니다.",
        "본 게임 전 이해를 돕기 위해 칩 20개로 시작하는 연습 게임을 진행합니다.",
      ],
      win: "상대의 칩 25개를 전부 획득한 플레이어가 승리",
    },
    {
      id: "language-pieces",
      title: "언어의 조각",
      summary: "한글 자음·모음 타일을 회전하고 조합해 정답 단어를 추리하는 언어 퍼즐 게임",
      rules: [
        "정답 단어는 모두 표준국어대사전에 등재된 단어이며, 1라운드는 3글자 단어로 시작해 라운드마다 글자 수가 1개씩 늘어납니다.",
        "라운드가 시작되면 정답에 사용되는 한글 자음·모음 타일과 정답 칸이 주어집니다.",
        "타일은 회전하거나 조합해 사용할 수 있습니다. 예를 들어 ㄱ은 회전해 ㄴ으로, ㅏ는 회전해 ㅗ·ㅜ·ㅓ로 사용할 수 있습니다.",
        "자음 2개를 붙여 겹받침이나 쌍자음으로 사용할 수 있습니다.",
        "ㅏ와 ㅣ를 합쳐 ㅔ·ㅐ·ㅚ·ㅟ로, ㅑ와 ㅣ를 합쳐 ㅖ·ㅒ로, ㅏ·ㅏ·ㅣ를 합쳐 ㅙ·ㅞ로 사용할 수 있습니다.",
        "선 플레이어부터 제한 시간 1분 안에 타일을 정답 칸에 배치하고 등록합니다. 등록 과정은 상대 플레이어도 볼 수 있습니다.",
        "빈 칸이 있거나 타일을 모두 사용하지 않아도 등록할 수 있지만, 자음과 모음 중 한 종류만 사용하는 등록은 불가능합니다.",
        "등록 결과는 빨강, 노랑, 초록 불빛으로 표시됩니다. 해당 차례의 플레이어는 정확한 위치를 확인하고, 상대는 색상별 개수만 확인합니다.",
        "빨강은 제시한 글자가 전혀 사용되지 않음, 노랑은 사용되었지만 위치가 틀림, 초록은 사용되었고 위치도 맞음을 뜻합니다.",
        "모든 칸에 초록 불빛을 켠 플레이어가 해당 라운드에서 승리하고, 정답 칸의 글자 수만큼 승점을 획득합니다.",
      ],
      win: "총 5라운드로 진행하며, 먼저 13점을 획득한 플레이어가 승리",
    },
    {
      id: "show-me-the-coin",
      title: "쇼 미 더 코인",
      summary: "비공개 코인 제출과 포커식 베팅으로 더 많은 칩을 확보하는 심리 베팅 게임",
      rules: [
        "각 플레이어는 베팅 칩 30개와 코인 50개를 가지고 시작합니다.",
        "코인은 500코인 3개, 100코인 7개, 50코인 10개, 10코인 30개로 구성됩니다.",
        "1라운드의 선 플레이어는 추첨으로 정하고, 2라운드부터는 번갈아가며 선 플레이어가 됩니다.",
        "라운드마다 선 플레이어와 후 플레이어는 차례대로 코인을 비공개로 제출하며, 제출한 코인의 개수만 공개됩니다.",
        "선 플레이어는 2~6개의 코인을 제출하고, 후 플레이어는 선 플레이어가 제출한 코인 개수와 최대 1개 차이가 나도록 제출합니다.",
        "제출된 코인은 모두 딜러에게 회수되며 다시 사용할 수 없습니다.",
        "코인 제출이 끝나면 기본 베팅으로 칩 1개를 내고, 이후 통상적인 포커 방식으로 베팅을 진행합니다.",
        "동일한 개수의 칩이 베팅되면 두 플레이어의 코인을 공개하고, 코인 가치 합계가 더 높은 플레이어가 베팅된 칩을 모두 가져갑니다.",
        "한쪽이 베팅을 포기하면 코인은 공개하지 않고 상대가 베팅된 칩을 모두 가져갑니다.",
        "코인 제출 이후 어느 한 플레이어의 남은 코인이 7개 이하라면 해당 라운드를 최종 라운드로 진행합니다.",
        "최종 라운드 종료 후 500코인을 제외한 코인은 20원당 칩 1개로 환전합니다.",
        "게임 중 한 플레이어의 칩이 0개가 되면 코인 환전 없이 즉시 패배합니다.",
      ],
      win: "최종 라운드와 코인 환전 이후 더 많은 칩을 가진 플레이어가 승리",
    },
    {
      id: "forgotten-mines",
      title: "망각의 지뢰",
      summary: "자신이 설치한 지뢰를 기억하고 상대의 지뢰를 추리하며 보물을 찾는 이동 전략 게임",
      rules: [
        "게임판은 가로·세로 11칸으로 구성되며, 중앙과 대각선으로 마주보는 모서리 세 곳에는 보물이 배치됩니다.",
        "각 플레이어는 제한 시간 10분 안에 자신의 지뢰 15개의 위치를 비공개로 제출합니다. 서로의 지뢰 위치는 알 수 없으며 한 칸에 두 개의 지뢰가 설치될 수도 있습니다.",
        "지뢰는 한 구간에 하나씩만 설치할 수 있고, 자신과 상대의 출발 지점에서 가로·세로 2칸 반경 및 보물이 있는 칸을 제외한 구역에만 설치할 수 있습니다.",
        "지뢰가 설치된 칸의 개수는 공개되지만, 게임판에는 표시되지 않습니다. 플레이어는 자신의 지뢰 위치를 암기하며 진행하고 필기 도구는 사용할 수 없습니다.",
        "추첨으로 선후공을 정하며, 자신의 차례에는 상하좌우 및 대각선으로 인접한 8칸 중 한 곳으로 이동할 수 있습니다. 상대 말이 놓인 곳으로는 이동할 수 없습니다.",
        "이동한 칸에 지뢰가 없으면 주변 인접 8칸에 존재하는 지뢰 개수만큼 점수를 획득합니다. 한 칸에 2개의 지뢰가 있으면 해당 칸은 지뢰 2개로 계산하지만 두 번째 점수는 획득할 수 없습니다.",
        "자신이 설치한 지뢰를 밟으면 즉시 -5점을 얻고, 자신의 출발지 주변 3칸 중 1칸으로 강제 이동합니다. 밟힌 지뢰는 제거됩니다.",
        "한 칸에 두 개의 지뢰가 배치된 경우, 하나를 밟으면 두 지뢰가 모두 제거됩니다.",
        "보물이 있는 칸에 도착하면 도착 순서에 따라 첫 번째 +10점, 두 번째 +15점, 세 번째 +20점을 획득합니다. 보물을 획득한 경우 해당 칸의 지뢰 개수 점수는 받을 수 없습니다.",
        "3개의 보물이 모두 발견되면 즉시 게임을 종료합니다.",
        "본 게임 시작 전에는 9x9 게임판과 지뢰 12개를 사용하는 연습 게임을 진행합니다.",
      ],
      win: "게임 종료 시 승점이 더 높은 플레이어가 승리",
    },
    {
      id: "horse-race",
      title: "말달리자",
      summary: "10개의 말을 이동시켜 정중앙 오아시스에 먼저 도착시키는 3라운드 레이스 게임",
      rules: [
        "게임은 총 3라운드로 진행합니다.",
        "게임판은 가로·세로 11칸의 바둑판 형태이며, 정중앙은 오아시스 칸입니다.",
        "오아시스 주변 초록색 칸은 초원 칸, 나머지는 노란색 사막 칸으로 구성됩니다.",
        "각 플레이어는 말 10개를 가지고 시작하며, 말은 각자의 대각선 위치에서 마주보는 형태로 5개씩 배치됩니다.",
        "플레이어는 번갈아가며 차례를 진행하고, 자신의 차례마다 이동 방법 중 하나를 선택해 자신의 말을 이동시킵니다.",
        "슬라이드 이동은 게임판의 가장자리나 다른 말에 가로·세로 방향으로 직선 이동하는 방식입니다.",
        "나이트 이동은 체스의 나이트처럼 한 칸 전진 후 대각선 한 칸으로 이동합니다.",
        "나이트 이동으로 도착하는 칸이 비어 있는 사막 칸이라면 이동할 수 있습니다.",
        "가장 먼저 오아시스 칸에 말을 도착시킨 플레이어가 해당 라운드에서 승리합니다.",
      ],
      win: "3라운드 중 2개 라운드를 먼저 승리한 플레이어가 게임에서 승리",
    },
    {
      id: "secret-prophecy",
      title: "천기누설",
      summary: "비밀 명제로 점수를 얻고 상대의 명제를 추리해 라운드를 빼앗는 추론 게임",
      rules: [
        "게임은 총 3라운드로 진행하며, 먼저 2개 라운드를 승리한 플레이어가 게임에서 승리합니다.",
        "게임에는 해, 달, 별, 구름 문양 카드 120장을 사용합니다. 문양이 1가지인 단일 카드 72장과 문양이 2~3가지인 믹스 카드 48장으로 구성됩니다.",
        "비밀 명제는 라운드 중 카드를 제출했을 때 승점 획득 기준으로 사용됩니다.",
        "라운드 시작 전 각 플레이어는 '□□□□□□□□□□□□□□□때 점수를 획득한다' 형식으로 비밀 명제를 비공개 작성합니다.",
        "비밀 명제는 띄어쓰기를 제외하고 한글 15자 이내로 작성하며, 숫자는 1칸당 1개씩 표기합니다.",
        "비밀 명제에는 해, 달, 별, 구름 중 한 종류 이상의 문양을 반드시 사용해야 합니다.",
        "수의 범위나 선택 조건은 사용할 수 없습니다. 표현을 바꿔도 같은 의미라면 같은 문장으로 취급해 사용할 수 없습니다. 단, 단순한 개수 비교는 가능합니다.",
        "짝수, 홀수, n의 배수 등 특정 개수 조건을 사용할 경우 0은 조건을 만족하지 않는 것으로 처리합니다.",
        "게임과 직접 관련이 없거나 점수 획득이 불가능한 명제는 사용할 수 없습니다.",
        "선 플레이어부터 차례를 진행하며, 자신의 차례에는 카드 1장을 뽑아 3개의 슬롯 중 원하는 자리에 배치합니다. 이미 카드가 놓인 슬롯 위에 덮어 배치할 수 있습니다.",
        "배치 결과가 비밀 명제를 충족하면 해당 명제의 작성자가 승점 1점을 얻습니다. 두 명제 모두 충족했다면 두 플레이어가 모두 1점씩 얻고, 이후 슬롯의 카드는 전부 제외됩니다.",
        "자신 차례의 카드 배치 직전에는 종을 쳐 '천기누설 도전'을 할 수 있으며, 상대의 비밀 명제를 의미상 맞히면 즉시 해당 라운드에서 승리합니다.",
        "도전에 실패해도 승점 변동은 없습니다.",
        "카드 120장이 모두 사용될 때까지 도전 성공이 없다면 승점이 더 많은 플레이어가 해당 라운드에서 승리합니다.",
        "게임 진행 중 기록 행위는 자유롭게 가능합니다.",
      ],
      win: "총 3라운드 중 먼저 2개 라운드를 승리한 플레이어가 승리",
    },
    {
      id: "twelve-shogi",
      title: "십이장기",
      summary: "4x3의 작은 장기판에서 네 종류의 말을 운용해 상대 왕을 잡거나 진영 돌입을 노리는 전략 보드게임",
      rules: [
        "게임은 가로 4칸, 세로 3칸의 총 12칸 게임판에서 진행하며, 플레이어의 바로 앞쪽 3칸이 각자의 진영입니다.",
        "각 플레이어는 장, 상, 왕, 자 4종류의 말을 1개씩 받고, 말마다 지정된 위치에 놓인 상태로 시작합니다.",
        "모든 말은 말에 표시된 방향으로만 이동할 수 있습니다.",
        "장(將)은 자신의 진영 오른쪽에 놓이며 앞, 뒤, 좌, 우로 이동할 수 있습니다.",
        "상(相)은 자신의 진영 왼쪽에 놓이며 대각선 4방향으로 이동할 수 있습니다.",
        "왕(王)은 자신의 진영 중앙에 놓이며 앞, 뒤, 좌, 우, 대각선 8방향으로 이동할 수 있습니다.",
        "자(子)는 왕의 앞에 놓이며 오직 앞으로 한 칸만 이동할 수 있습니다.",
        "자(子)가 상대 진영에 들어가면 뒤집어서 후(侯)로 사용합니다. 후(侯)는 대각선 뒤쪽 방향을 제외한 전 방향으로 이동할 수 있습니다.",
        "플레이어는 자신의 턴에 말 1개를 한 칸 이동시킬 수 있습니다.",
        "말을 이동시켜 상대의 말을 잡으면 해당 말을 포로로 잡고, 이후 자신의 턴에 포로로 잡은 말을 다시 자신의 말로 내려놓을 수 있습니다.",
        "포로로 잡은 말을 내려놓는 행동도 턴을 소모합니다.",
        "이미 말이 놓인 칸이나 상대 진영에는 포로 말을 내려놓을 수 없습니다.",
        "상대의 후(侯)를 잡아 자신의 말로 사용할 경우에는 자(子)로 뒤집어서 사용합니다.",
        "모든 말의 방향 전환은 불가능합니다.",
        "잡은 말을 사용할 때 자신의 원하는 턴에 자유롭게 사용할 수 있으며, 원하지 않으면 사용하지 않아도 됩니다.",
        "블랙가넷 결승전 추가 규칙으로 한 턴 제한 시간은 90초이며, 제한 시간 안에 아무 말도 놓지 못하면 패배합니다.",
        "블랙가넷 결승전의 아이템 블러킷은 상대 말이 잡히기 전까지 사용할 수 있고, 바로 전 턴에 자신이 했던 플레이를 다시 할 수 있게 합니다. 사용 순간부터 다시 90초 카운트가 시작됩니다.",
        "아이템 90초는 자신의 턴 제한 시간 90초에 90초를 더해 사용할 수 있습니다.",
        "그랜드 파이널 추가 규칙에서는 한 턴 제한 시간이 30초이며, 제한 시간 안에 아무 말도 놓지 못하면 패배합니다.",
        "그랜드 파이널 방식은 3판 2선승제로 진행합니다.",
      ],
      win: "상대의 왕(王)을 잡거나, 자신의 왕이 상대 진영에 들어가 자신의 다음 턴까지 한 턴을 버티면 승리",
    },
  ],
  matches: [],
  events: [],
};

const defaultGames = state.games.map((game) => ({
  ...game,
  rules: [...game.rules],
}));

async function loadStoredState() {
  try {
    const stored = await storage.load();
    if (stored) {
      Object.assign(state, stored);
      const storedGamesById = new Map((state.games || []).map((game) => [game.id, game]));
      const defaultGameIds = new Set(defaultGames.map((game) => game.id));
      state.games = [
        ...defaultGames.map((game) => ({
          ...storedGamesById.get(game.id),
          ...game,
          rules: [...game.rules],
        })),
        ...(state.games || []).filter((game) => !defaultGameIds.has(game.id)),
      ];
      state.isAdmin = false;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`저장 데이터를 불러오지 못했습니다: ${error.message}`);
    }
  }
}

async function persistState() {
  await storage.save(state);
}

function currentUser() {
  return state.members.find((member) => member.id === state.currentUserId) || null;
}

function publicMember(member) {
  if (!member) return null;

  const { passwordHash, ...safeMember } = member;
  return safeMember;
}

function normalizeEvent(event) {
  if (typeof event === "string") {
    return { message: event, createdAt: null };
  }

  return {
    message: String(event?.message || ""),
    createdAt: event?.createdAt || event?.created_at || null,
  };
}

function logEvent(message) {
  state.events.unshift({
    message,
    createdAt: new Date().toISOString(),
  });
}

function publicState() {
  const events = state.events.map(normalizeEvent);
  const rankings = [...state.members]
    .filter((member) => member.wins + member.losses > 0)
    .map((member) => {
      const total = member.wins + member.losses;
      return {
        ...publicMember(member),
        record: `${member.wins}승 ${member.losses}패`,
        rate: total ? `${((member.wins / total) * 100).toFixed(1)}%` : "0.0%",
        rateValue: total ? member.wins / total : 0,
      };
    })
    .sort((a, b) => b.rateValue - a.rateValue || b.wins - a.wins);

  return {
    user: publicMember(currentUser()),
    isAuthenticated: Boolean(state.currentUserId),
    isAdmin: Boolean(state.isAdmin),
    members: state.isAdmin ? state.members.map(publicMember) : [],
    rankings,
    games: state.games,
    matches: state.matches.map((match) => decorateMatch(match)),
    events: events.slice(0, 8),
    allEvents: state.isAdmin ? events : [],
    metrics: buildMetrics(),
    payment: {
      amount: 1000,
      method: "bank_transfer",
      bankAccountLabel,
    },
  };
}

function requireAdmin(response) {
  if (!state.isAdmin) {
    sendJson(response, 403, { error: "운영자 로그인 후 이용할 수 있습니다." });
    return false;
  }

  return true;
}

function decorateMatch(match) {
  const allPlayers = match.applications.map((application) => {
    const member = state.members.find((candidate) => candidate.id === application.memberId);
    return {
      ...application,
      nickname: member?.nickname || "알 수 없음",
      phone: member?.phone || "-",
      area: member?.area || "-",
    };
  });
  const players = allPlayers.filter((player) => !player.cancelled && player.paymentStatus === "paid");
  const confirmed = players.length >= 2;
  const game = state.games.find((candidate) => candidate.id === match.gameId) || null;
  const visibleGame = match.gameRevealed || state.isAdmin ? game : null;

  return {
    ...match,
    players,
    allPlayers,
    playerCount: players.length,
    confirmed,
    status: confirmed ? "confirmed" : "waiting",
    statusLabel: confirmed ? "확정" : players.length === 1 ? "1명 대기" : "신청 가능",
    gameId: visibleGame ? match.gameId : null,
    game: visibleGame,
    adminNote: state.isAdmin ? match.adminNote || "" : undefined,
    notificationLog: match.notificationLog || [],
    appliedByMe: Boolean(state.currentUserId && match.applications.some((item) => item.memberId === state.currentUserId && !item.cancelled)),
    hasMyApplication: Boolean(state.currentUserId && match.applications.some((item) => item.memberId === state.currentUserId)),
  };
}

function buildMetrics() {
  const waiting = state.matches.filter((match) => activePaidApplications(match).length < 2).length;
  const confirmed = state.matches.filter((match) => activePaidApplications(match).length >= 2).length;
  const revealWaiting = state.matches.filter((match) => activePaidApplications(match).length >= 2 && !match.gameRevealed).length;
  const refundTargets = state.matches.filter((match) =>
    match.applications.some((application) => ["refund_requested", "refund_scheduled"].includes(application.paymentStatus)),
  ).length;

  return {
    todayApplications: 9,
    waiting,
    confirmed,
    revealWaiting,
    refundTargets,
  };
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return digits;
}

function isValidPhone(phone) {
  return /^010-\d{4}-\d{4}$/.test(phone);
}

function validatePassword(password, confirmation) {
  const value = String(password || "");

  if (value !== String(confirmation || "")) {
    throw new Error("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
  }

  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    throw new Error("비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.");
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;

  const [salt, hash] = storedHash.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(String(password), salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSessionPayload(payload) {
  return createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

function createSessionToken(memberId, isAdmin = false) {
  const payload = base64UrlEncode(
    JSON.stringify({
      memberId,
      isAdmin: Boolean(isAdmin),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14,
    }),
  );
  return `${payload}.${signSessionPayload(payload)}`;
}

function verifySessionToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signSessionPayload(payload);
  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payload));
    if (!session.memberId || Number(session.expiresAt) < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function publicStateWithSession() {
  return {
    ...publicState(),
    sessionToken: state.currentUserId ? createSessionToken(state.currentUserId, state.isAdmin) : null,
  };
}

function requireField(value, label) {
  if (!String(value || "").trim()) {
    throw new Error(`${label}을 입력해 주세요.`);
  }
}

function requireConsent(value, label) {
  if (value !== "on") {
    throw new Error(`${label}에 동의해 주세요.`);
  }
}

async function maybeConfirm(match) {
  match.notificationLog ||= [];
  if (activePaidApplications(match).length === 2 && !match.notificationLog.includes("confirmed-ready")) {
    match.notificationLog.push("confirmed-ready");
    logEvent(`${match.date} ${match.time} 매치가 확정되어 참가자 2명에게 문자를 발송했습니다.`);
  }
}

function findMember(memberId) {
  return state.members.find((member) => member.id === memberId);
}

function activePaidApplications(match) {
  return match.applications.filter((item) => !item.cancelled && item.paymentStatus === "paid");
}

function messageForMatch(match, type) {
  const players = activePaidApplications(match).map((application) => findMember(application.memberId)).filter(Boolean);

  if (type === "game-revealed") {
    const game = state.games.find((candidate) => candidate.id === match.gameId);
    return `[1VS1매치] ${match.date} ${match.time} ${match.location} match game: ${game?.title || "TBA"}. Check the web notice for rules.`;
  }

  return `[1VS1매치] ${match.date} ${match.time} ${match.location} 1:1 match confirmed. Players: ${players.map((player) => player.nickname).join(" vs ")}.`;
}

async function sendMatchSms(match, type) {
  const players = activePaidApplications(match).map((application) => findMember(application.memberId)).filter(Boolean);
  const message = messageForMatch(match, type);

  await Promise.all(players.map((player) => smsProvider.send({ to: player.phone, message, type })));
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      storage: storage.name,
      paymentProvider: paymentProvider.name,
      smsProvider: smsProvider.name,
      members: state.members.length,
      matches: state.matches.length,
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/state") {
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/signup") {
    const body = await parseBody(request);
    requireField(body.nickname, "닉네임");
    requireField(body.phone, "전화번호");
    requireField(body.area, "주 활동지");
    requireField(body.password, "비밀번호");
    requireField(body.passwordConfirm, "비밀번호 확인");
    requireConsent(body.privacyConsent, "개인정보 수집 및 이용");

    const phone = normalizePhone(body.phone);
    const nickname = String(body.nickname).trim();

    if (!isValidPhone(phone)) {
      sendJson(response, 400, { error: "전화번호는 010으로 시작하는 휴대폰 번호로 입력해 주세요." });
      return;
    }

    validatePassword(body.password, body.passwordConfirm);

    const existingMemberByPhone = state.members.find((member) => member.phone === phone);
    const existingMemberByNickname = state.members.find((member) => member.nickname === nickname);

    if (existingMemberByPhone && !existingMemberByPhone.passwordHash) {
      if (existingMemberByNickname && existingMemberByNickname.id !== existingMemberByPhone.id) {
        sendJson(response, 409, { error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요." });
        return;
      }

      existingMemberByPhone.nickname = nickname;
      existingMemberByPhone.area = String(body.area || "").trim();
      existingMemberByPhone.passwordHash = hashPassword(body.password);
      state.currentUserId = existingMemberByPhone.id;
      state.isAdmin = false;
      logEvent(`${existingMemberByPhone.nickname}님이 비밀번호를 설정하고 로그인했습니다.`);
      await persistState();
      sendJson(response, 200, publicStateWithSession());
      return;
    }

    const exists = Boolean(existingMemberByPhone || existingMemberByNickname);

    if (exists) {
      sendJson(response, 409, { error: "이미 가입된 닉네임 또는 전화번호입니다. 로그인해 주세요." });
      return;
    }

    const member = {
      id: `u-${String(state.members.length + 1).padStart(3, "0")}`,
      nickname,
      phone,
      area: String(body.area || "").trim(),
      passwordHash: hashPassword(body.password),
      wins: 0,
      losses: 0,
    };

    state.members.push(member);
    state.currentUserId = member.id;
    state.isAdmin = false;
    logEvent(`${member.nickname}님이 회원가입 후 로그인했습니다.`);
    await persistState();
    sendJson(response, 201, publicStateWithSession());
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    const body = await parseBody(request);
    requireField(body.phone, "전화번호");
    requireField(body.password, "비밀번호");

    const member = state.members.find((candidate) => candidate.phone === normalizePhone(body.phone));
    if (!member) {
      sendJson(response, 404, { error: "가입된 전화번호를 찾을 수 없습니다." });
      return;
    }

    if (!verifyPassword(body.password, member.passwordHash)) {
      sendJson(response, 401, { error: "전화번호 또는 비밀번호가 올바르지 않습니다." });
      return;
    }

    state.currentUserId = member.id;
    state.isAdmin = false;
    logEvent(`${member.nickname}님이 로그인했습니다.`);
    await persistState();
    sendJson(response, 200, publicStateWithSession());
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    state.currentUserId = null;
    state.isAdmin = false;
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/restore-session") {
    const body = await parseBody(request);
    const session = verifySessionToken(body.token);
    const member = session ? state.members.find((candidate) => candidate.id === session.memberId) : null;

    if (!member) {
      state.currentUserId = null;
      state.isAdmin = false;
      sendJson(response, 200, publicState());
      return;
    }

    state.currentUserId = member.id;
    state.isAdmin = Boolean(session.isAdmin);
    sendJson(response, 200, publicStateWithSession());
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin-login") {
    const body = await parseBody(request);
    requireField(body.password, "운영자 암호");

    if (!currentUser()) {
      sendJson(response, 401, { error: "회원 로그인 후 운영자 암호를 입력해 주세요." });
      return;
    }

    if (String(body.password) !== adminPassword) {
      sendJson(response, 401, { error: "운영자 암호가 올바르지 않습니다." });
      return;
    }

    state.isAdmin = true;
    logEvent("운영자가 로그인했습니다.");
    await persistState();
    sendJson(response, 200, publicStateWithSession());
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin-logout") {
    state.isAdmin = false;
    await persistState();
    sendJson(response, 200, publicStateWithSession());
    return;
  }

  if (request.method === "POST" && pathname === "/api/apply") {
    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const member = currentUser();
    requireConsent(body.refundConsent, "참가비 및 환불 안내");

    if (!member) {
      sendJson(response, 401, { error: "로그인 후 참가 신청할 수 있습니다." });
      return;
    }

    if (!match) {
      sendJson(response, 404, { error: "선택한 날짜를 찾을 수 없습니다." });
      return;
    }

    if (match.applications.filter((item) => !item.cancelled).length >= 2) {
      sendJson(response, 409, { error: "이미 2명이 확정된 날짜입니다." });
      return;
    }

    if (match.applications.some((application) => application.memberId === member.id && !application.cancelled)) {
      sendJson(response, 409, { error: "이미 이 날짜에 신청했습니다." });
      return;
    }

    match.applications.push({ memberId: member.id, paid: false, paymentStatus: "payment_pending" });
    logEvent(`${member.nickname}님이 ${match.date} ${match.time} 매치에 신청했습니다. 참가비 1,000원 결제 대기.`);
    await persistState();
    sendJson(response, 201, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/complete-payment") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const member = findMember(body.memberId);

    if (!member) {
      sendJson(response, 404, { error: "입금 확인할 회원을 찾을 수 없습니다." });
      return;
    }

    const application = match?.applications.find((item) => item.memberId === member.id);
    if (!application) {
      sendJson(response, 404, { error: "입금 확인할 신청 내역이 없습니다." });
      return;
    }

    await paymentProvider.captureParticipationFee({ member, match, amount: 1000 });
    application.paid = true;
    application.paymentStatus = "paid";
    logEvent(`${member.nickname}님의 ${match.date} ${match.time} 참가비 1,000원 입금을 확인했습니다.`);
    await maybeConfirm(match);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/undo-payment") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const member = findMember(body.memberId);
    const application = match?.applications.find((item) => item.memberId === body.memberId);

    if (!match || !member || !application) {
      sendJson(response, 404, { error: "입금 취소할 신청 내역을 찾을 수 없습니다." });
      return;
    }

    application.paid = false;
    application.paymentStatus = "payment_pending";
    match.notificationLog = (match.notificationLog || []).filter((key) => !["confirmed-ready", "confirmed"].includes(key));
    logEvent(`${member.nickname}님의 ${match.date} ${match.time} 입금 확인을 취소했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/cancel-application") {
    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const member = currentUser();

    if (!member) {
      sendJson(response, 401, { error: "로그인 후 신청을 취소할 수 있습니다." });
      return;
    }

    if (!match) {
      sendJson(response, 404, { error: "선택한 매치를 찾을 수 없습니다." });
      return;
    }

    if (activePaidApplications(match).length >= 2) {
      sendJson(response, 409, { error: "이미 확정된 매치는 직접 취소할 수 없습니다. 운영자에게 문의해 주세요." });
      return;
    }

    const beforeCount = match.applications.length;
    const application = match.applications.find((item) => item.memberId === member.id);

    if (!application) {
      sendJson(response, 404, { error: "취소할 신청 내역이 없습니다." });
      return;
    }

    if (application.paymentStatus === "payment_pending") {
      match.applications = match.applications.filter((item) => item.memberId !== member.id);
      logEvent(`${member.nickname}님이 ${match.date} ${match.time} 결제 대기 신청을 취소했습니다.`);
    } else {
      application.paymentStatus = "refund_requested";
      application.cancelled = true;
      logEvent(`${member.nickname}님이 ${match.date} ${match.time} 신청 취소와 환불을 요청했습니다.`);
    }

    if (beforeCount === 0) {
      sendJson(response, 404, { error: "취소할 신청 내역이 없습니다." });
      return;
    }

    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/create-match") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    requireField(body.matchDate, "날짜");
    requireField(body.time, "시간");
    requireField(body.location, "장소");

    const idBase = `${body.matchDate}-${String(body.time).replace(":", "")}`;
    const exists = state.matches.some((match) => match.id === idBase);

    if (exists) {
      sendJson(response, 409, { error: "이미 같은 날짜와 시간의 매치가 있습니다." });
      return;
    }

    const dateObject = new Date(`${body.matchDate}T00:00:00+09:00`);
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const date = `${dateObject.getMonth() + 1}월 ${dateObject.getDate()}일 ${weekdays[dateObject.getDay()]}`;

    state.matches.push({
      id: idBase,
      date,
      time: String(body.time),
      location: String(body.location).trim(),
      gameId: null,
      gameRevealed: false,
      adminNote: "",
      applications: [],
      result: null,
    });
    logEvent(`${date} ${body.time} 신규 매치를 열었습니다.`);
    await persistState();
    sendJson(response, 201, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/update-match-note") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match) {
      sendJson(response, 404, { error: "선택한 매치를 찾을 수 없습니다." });
      return;
    }

    match.adminNote = String(body.adminNote || "").trim().slice(0, 600);
    logEvent(`${match.date} ${match.time} 운영자 메모를 저장했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/record-result") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match) {
      sendJson(response, 404, { error: "선택한 매치를 찾을 수 없습니다." });
      return;
    }

    const activeApplications = activePaidApplications(match);
    if (activeApplications.length < 2) {
      sendJson(response, 409, { error: "확정된 매치만 결과를 입력할 수 있습니다." });
      return;
    }

    const winnerId = String(body.winnerId || "");
    const playerIds = activeApplications.map((application) => application.memberId);
    const loserId = playerIds.find((memberId) => memberId !== winnerId);

    if (!playerIds.includes(winnerId) || !loserId) {
      sendJson(response, 400, { error: "승자를 다시 선택해 주세요." });
      return;
    }

    if (match.result) {
      const previousWinner = findMember(match.result.winnerId);
      const previousLoser = findMember(match.result.loserId);
      if (previousWinner) previousWinner.wins = Math.max(0, previousWinner.wins - 1);
      if (previousLoser) previousLoser.losses = Math.max(0, previousLoser.losses - 1);
    }

    const winner = findMember(winnerId);
    const loser = findMember(loserId);
    winner.wins += 1;
    loser.losses += 1;
    match.result = { winnerId, loserId };
    logEvent(`${match.date} ${match.time} 결과 입력: ${winner.nickname} 승리.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/clear-result") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match?.result) {
      sendJson(response, 404, { error: "취소할 결과 입력 내역이 없습니다." });
      return;
    }

    const previousWinner = findMember(match.result.winnerId);
    const previousLoser = findMember(match.result.loserId);
    if (previousWinner) previousWinner.wins = Math.max(0, previousWinner.wins - 1);
    if (previousLoser) previousLoser.losses = Math.max(0, previousLoser.losses - 1);

    match.result = null;
    logEvent(`${match.date} ${match.time} 경기 결과 입력을 취소했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/mark-message-sent") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const messageKey = String(body.messageKey || "").trim();

    if (!match || !messageKey) {
      sendJson(response, 400, { error: "매치와 알림 종류를 확인해 주세요." });
      return;
    }

    match.notificationLog ||= [];
    if (!match.notificationLog.includes(messageKey)) {
      match.notificationLog.push(messageKey);
    }

    logEvent(`${match.date} ${match.time} ${messageKey} 알림을 발송 완료로 체크했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/unmark-message-sent") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const messageKey = String(body.messageKey || "").trim();

    if (!match || !messageKey) {
      sendJson(response, 400, { error: "매치와 알림 종류를 확인해 주세요." });
      return;
    }

    match.notificationLog = (match.notificationLog || []).filter((key) => key !== messageKey);
    logEvent(`${match.date} ${match.time} ${messageKey} 발송 완료 체크를 취소했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/recommend-game") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match) {
      sendJson(response, 404, { error: "선택한 매치를 찾을 수 없습니다." });
      return;
    }

    if (activePaidApplications(match).length < 2) {
      sendJson(response, 409, { error: "확정된 매치만 게임을 추천할 수 있습니다." });
      return;
    }

    if (match.gameRevealed) {
      sendJson(response, 409, { error: "이미 게임이 공개된 매치입니다." });
      return;
    }

    const candidates = state.games.filter((game) => game.id !== match.gameId);
    const pool = candidates.length ? candidates : state.games;
    const game = pool[Math.floor(Math.random() * pool.length)];

    if (!game) {
      sendJson(response, 404, { error: "추천할 게임이 없습니다." });
      return;
    }

    match.gameId = game.id;
    match.gameRevealed = false;
    logEvent(`${match.date} ${match.time} 매치에 ${game.title}을 랜덤 추천했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/reveal-game") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);
    const game = state.games.find((candidate) => candidate.id === body.gameId);

    if (!match || !game) {
      sendJson(response, 404, { error: "매치 또는 게임을 찾을 수 없습니다." });
      return;
    }

    match.gameId = game.id;
    match.gameRevealed = true;
    match.notificationLog ||= [];
    if (activePaidApplications(match).length >= 2 && !match.notificationLog.includes("game-revealed-ready")) {
      match.notificationLog.push("game-revealed-ready");
    }
    logEvent(`${match.date} ${match.time} 매치 게임으로 ${game.title}을 공개했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/hide-game") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match) {
      sendJson(response, 404, { error: "선택한 매치를 찾을 수 없습니다." });
      return;
    }

    match.gameRevealed = false;
    match.notificationLog = (match.notificationLog || []).filter((key) => !["game-revealed-ready", "game-revealed"].includes(key));
    logEvent(`${match.date} ${match.time} 매치의 게임 공개를 취소했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/refund") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match) {
      sendJson(response, 404, { error: "선택한 날짜를 찾을 수 없습니다." });
      return;
    }

    for (const application of match.applications) {
      if (["refund_requested", "refund_scheduled", "paid"].includes(application.paymentStatus)) {
        const member = findMember(application.memberId);
        await paymentProvider.refundParticipationFee({ member, match, amount: 1000 });
        application.paymentStatus = "refunded";
        application.paid = false;
      }
    }
    logEvent(`${match.date} ${match.time} 환불 대상자의 참가비 환불을 완료했습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  if (request.method === "POST" && pathname === "/api/undo-refund") {
    if (!requireAdmin(response)) return;

    const body = await parseBody(request);
    const match = state.matches.find((candidate) => candidate.id === body.matchId);

    if (!match) {
      sendJson(response, 404, { error: "선택한 날짜를 찾을 수 없습니다." });
      return;
    }

    for (const application of match.applications) {
      if (application.paymentStatus === "refunded") {
        application.paymentStatus = "paid";
        application.paid = true;
        application.cancelled = false;
      }
    }

    logEvent(`${match.date} ${match.time} 환불 처리 상태를 입금 확인 완료로 되돌렸습니다.`);
    await persistState();
    sendJson(response, 200, publicState());
    return;
  }

  sendJson(response, 404, { error: "지원하지 않는 API입니다." });
}

async function handleStatic(response, pathname) {
  const target = normalize(join(root, pathname === "/" ? "index.html" : pathname));

  if (!target.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": types[extname(target)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

await loadStoredState();

createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }

    await handleStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}).listen(port, host, () => {
  console.log(`1VS1매치 server listening on http://${host}:${port}`);
});
