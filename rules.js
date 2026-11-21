// 게임 규칙 창. 게임 화면의 로고 옆에 "규칙" 버튼을 붙이고, 누르면 화면 위에 규칙을 띄운다.
// - 주소 끝에 #rules가 있으면 열린 채로 시작 (홈 화면의 "규칙" 링크용)
// - data-rules 속성이 있는 버튼·링크를 눌러도 열림
(function () {
  const P = location.pathname;
  const GAME = P.startsWith('/blackwhite') ? 'bw' : P.startsWith('/slither') ? 'slither' : P.startsWith('/wallgo') ? 'wallgo' : 'auction';

  const RULES = {
    auction: {
      title: '연봉 블라인드 경매',
      lede: '큐브 20개로 KBO 선수 계약을 낙찰받아요. 16장이 모두 끝났을 때 내 선수들의 <b>연평균 연봉 합계</b>가 가장 큰 사람이 이겨요. 선수 연봉은 낙찰받은 사람만 볼 수 있어요.',
      sections: [
        ['진행 순서', `<ol>
          <li>판의 1~16번 칸 뒤에 선수 13명과 찬스 카드 3장이 숨어 있어요. 선수 13명은 게임마다 83명 중에서 무작위로 뽑히는데, 10개 구단 선수가 한 명 이상씩 꼭 들어가고, 연봉도 10억 미만부터 25억 이상까지 구간마다 2~4명씩 고르게 섞여요. 어떤 선수가 나올지는 열어 봐야 알아요.</li>
          <li>카드를 여는 사람은 라운드마다 바뀌어요. 1라운드는 1번, 2라운드는 2번, 3라운드는 3번, 4라운드는 4번, 5라운드는 다시 1번 순서예요.</li>
          <li>카드를 연 사람부터 1→2→3→4 순서로 돌아가며, 지금 최고가보다 큐브를 <b>1개 이상</b> 올리거나 포기해요. 포기하면 그 카드 경매에는 다시 들어갈 수 없어요.</li>
          <li>3명이 포기하면 남은 사람이 낙찰받고, 자기가 부른 큐브만 내요. 아무도 입찰하지 않으면 유찰돼서 카드가 사라져요.</li>
          <li>최고가보다 큐브가 모자라면 자동으로 포기돼요.</li>
        </ol>`],
        ['찬스 카드', `<dl>
          <dt>트레이드권</dt><dd>낙찰받으면 바로 내 선수 1명과 상대 선수 1명을 직접 골라 맞바꿔요. 바꿀 선수가 없으면 그냥 사라져요.</dd>
          <dt>연봉 2배</dt><dd>마지막에 합산할 때, 내 선수 중 연봉이 가장 낮은 선수의 연봉이 2배가 돼요.</dd>
          <dt>방출</dt><dd>방출은 일반 입찰이 아니에요. 가격이 0부터 1초마다 1개씩 오르고, <b>가장 먼저 포기를 누른 사람</b>이 방출 카드를 받아요. 포기한 사람은 큐브를 내지 않고, 나머지 3명이 그 순간 가격만큼 큐브를 내요. 방출 카드를 받으면 가장 최근에 영입한 내 선수가 방출돼요. 선수가 없으면 다음에 낙찰받는 선수가 바로 방출돼요. 가격을 낼 큐브가 모자란 사람이 생기면 그 사람이 포기한 것으로 처리돼요.</dd>
        </dl>
        <p class="rb-note">트레이드권은 선수가 8명 공개된 뒤부터, 연봉 2배와 방출은 선수가 2명 공개된 뒤부터 나올 수 있어요.</p>`],
        ['승리 조건', `<ul>
          <li>16장이 모두 끝나면 보유 선수의 연평균 연봉(계약 총액 ÷ 계약 연수)을 더해서 순위를 매겨요. 연봉 2배 카드도 이때 적용돼요.</li>
          <li>남은 큐브는 점수에 들어가지 않아요. 아껴도 이득이 없으니 끝까지 다 써도 돼요.</li>
          <li>합계가 같으면 공동 순위예요.</li>
        </ul>`],
        ['시간 제한', `<ul>
          <li>공개 방에서는 차례마다 30초가 주어져요. 시간을 넘기면 입찰은 포기 처리되고, 카드 열기는 아무 칸이나 자동으로 열리고, 트레이드권은 사라져요.</li>
          <li>비공개 방과 AI 대전에는 시간 제한이 없어요.</li>
        </ul>`]
      ]
    },
    bw: {
      title: '9이닝 홈런 흑과 백',
      lede: '두 사람이 똑같은 타자 카드 9장을 받아 이닝마다 한 장씩 내요. 2026 정규시즌 <b>홈런이 더 많은 선수</b>를 낸 쪽이 그 이닝을 가져가고, <b>5승</b>을 먼저 하면 이겨요.',
      sections: [
        ['카드', `<ul>
          <li>2026 정규시즌 홈런 상위 60명 중, 홈런 수가 모두 다른 9명을 뽑아 두 사람에게 똑같이 나눠 줘요.</li>
          <li>9장 중 홈런이 많은 5장은 <span class="rb-sw b">흑</span>, 나머지 4장은 <span class="rb-sw w">백</span>이에요.</li>
          <li>한 번 낸 카드는 다시 쓸 수 없어요.</li>
        </ul>`],
        ['진행 순서', `<ol>
          <li>1이닝 선공은 무작위로 정해져요.</li>
          <li>선공이 먼저 카드를 내요. 상대에게는 그 카드가 흑인지 백인지만 보여요.</li>
          <li>후공은 흑·백을 보고 자기 카드를 내요.</li>
          <li>홈런이 더 많은 쪽이 이닝을 가져가요. 같은 선수를 내면 비겨요.</li>
          <li>이닝을 이긴 사람이 다음 이닝 선공이에요. 비기면 선공이 그대로예요.</li>
        </ol>`],
        ['승리 조건', `<ul>
          <li>5승을 먼저 하면 그 자리에서 경기가 끝나요.</li>
          <li>9이닝이 끝날 때까지 아무도 5승을 못 하면 승수가 많은 쪽이 이기고, 같으면 무승부예요.</li>
          <li>선수의 홈런 수는 경기가 끝나야 공개돼요. 누가 몇 개를 쳤는지 아는 사람이 유리해요.</li>
        </ul>`],
        ['시간 제한', `<ul>
          <li>온라인 공개 방에서는 카드를 내는 데 30초가 주어져요. 시간을 넘기면 남은 카드 중 한 장이 자동으로 나가요.</li>
          <li>비공개 방과 AI 대전에는 시간 제한이 없어요.</li>
        </ul>`]
      ]
    },
    slither: {
      title: '슬리더링크',
      lede: '점과 점을 선으로 이어 <b>하나의 닫힌 고리</b>를 만드는 퍼즐이에요. 칸 안의 숫자는 그 칸을 둘러싼 네 변 중 <b>선이 그어진 변의 개수</b>예요.',
      sections: [
        ['규칙', `<ol>
          <li>선은 이웃한 점끼리 가로·세로로만 그어요. 대각선은 없어요.</li>
          <li>고리는 딱 하나여야 해요. 중간에 끊기거나, 갈라지거나, 서로 교차하면 안 돼요. 모든 점에는 선이 0개 아니면 2개만 붙어요.</li>
          <li>숫자가 있는 칸은 둘레의 선 개수가 그 숫자와 같아야 해요. 숫자가 없는 칸은 몇 개든 상관없어요.</li>
          <li>모든 숫자를 맞추고 고리 하나가 완성되면 자동으로 정답 처리되고 타이머가 멈춰요.</li>
        </ol>`],
        ['조작', `<ul>
          <li><b>탭</b>: 선을 긋거나 지워요. 점을 따라 <b>드래그</b>하면 여러 칸을 한 번에 그을 수 있어요.</li>
          <li><b>X 표시</b> 모드로 바꾸면 선이 없다고 확신하는 변에 X를 표시할 수 있어요.</li>
          <li>숫자가 빨갛게 바뀌면 그 칸의 선이 너무 많거나 X 때문에 숫자를 채울 수 없다는 뜻이에요.</li>
          <li><b>취소</b>는 한 동작 되돌리기, <b>처음부터</b>는 판을 비워요. <b>정답 보기</b>를 두 번 누르면 정답이 공개되고 기록은 남지 않아요.</li>
        </ul>`],
        ['기록 대결', `<ul>
          <li>대결방을 만들면 4자리 코드가 나와요. 다른 관리자가 코드를 입력해 들어올 수 있어요 (최대 8명).</li>
          <li>방장이 판 크기를 골라 시작하면 모두 같은 문제를 받고, 3초 카운트다운 뒤 동시에 시작해요.</li>
          <li>시간은 서버가 시작부터 정답 제출까지 재고, 정답인지도 서버가 다시 확인해요. 빨리 푼 순서로 순위가 정해져요.</li>
          <li>정답 보기를 누르거나 나가면 그 판은 포기로 처리돼요.</li>
        </ul>`],
        ['풀이 팁', `<ul>
          <li><b>0</b> 둘레의 네 변은 모두 X예요.</li>
          <li>모서리 칸의 <b>3</b>은 바깥쪽 두 변이 반드시 선이에요.</li>
          <li>나란히 붙은 <b>3</b>과 <b>3</b>은 사이 변과 양 끝 변이 선이에요.</li>
          <li>점에 선이 하나만 있으면 반드시 한쪽으로 이어져야 해요. 막힌 방향에 X를 쳐 두면 길이 보여요.</li>
        </ul>`]
      ]
    },
    wallgo: {
      title: '벽바둑 Ⅱ',
      lede: '7×7 판에서 말을 옮기고 벽을 세워, <b>내 말이 있는 영역을 가장 넓게</b> 만든 사람이 이겨요. 2~4명이 할 수 있고 빈자리는 AI가 채워요.',
      sections: [
        ['말', `<ul>
          <li><b>사각 말 ■</b>: 상하좌우 한 방향으로 1~2칸 직진해요.</li>
          <li><b>원형 말 ●</b>: 상하좌우로 1칸 간 뒤, 원하면 왼쪽이나 오른쪽으로 꺾어 1칸 더 가요 (ㄱ자). 직진 2칸은 안 돼요.</li>
          <li>기본은 각자 사각 1개 + 원형 1개예요. <b>4말 모드</b>(2인 전용)는 사각 2개 + 원형 2개이고, 원형 말은 정해진 칸에서 시작해요.</li>
        </ul>`],
        ['진행 순서', `<ol>
          <li><b>배치</b>: 선 플레이어부터 차례로 말 하나를 골라 빈 칸에 놓고, 두 번째 말은 역순으로 놓아요.</li>
          <li><b>내 차례</b>: 말 하나를 이동한 뒤, 그 말이 있는 칸의 네 면 중 하나에 반드시 벽을 세워요.</li>
          <li>다른 말이 있는 칸으로 가거나 지나갈 수 없고, 벽을 넘을 수 없어요.</li>
          <li>이미 벽이 있는 면이나 판 테두리에는 벽을 세울 수 없어요.</li>
          <li>움직일 수 없으면 말을 제자리에 두고 벽만 세워요.</li>
        </ol>`],
        ['특수 규칙', `<dl>
          <dt>벽 부수기 (옵션)</dt><dd>게임 중 한 번, 이동 경로에 있는 벽 하나를 부수고 지나갈 수 있어요. 갈 수 있는 칸에 ⚡ 표시가 떠요.</dd>
          <dt>제한시간 (옵션)</dt><dd>시간을 넘기면 말은 제자리에 있고, 아무 면에나 벽이 세워져요.</dd>
          <dt>영역 미리보기</dt><dd>켜면 지금 상태에서 누가 더 가까운 칸인지 색으로 보여 줘요. 점수판의 "예상"도 이 기준이에요.</dd>
        </dl>`],
        ['승리 조건', `<ul>
          <li>모든 플레이어의 말이 벽으로 서로 완전히 갈라지면 바로 끝나요.</li>
          <li>내 말이 있는 영역의 칸 수 합이 점수예요. 동점이면 가장 큰 영역 하나가 넓은 쪽이 앞서요.</li>
          <li>이미 다른 플레이어와 완전히 갈라진 사람은 차례를 건너뛰어요.</li>
        </ul>`]
      ]
    }
  };

  const css = `
  .rb-btn { flex: none; display: inline-flex; align-items: center; gap: 5px; font: 700 13px/1 "Noto Sans KR", "Apple SD Gothic Neo", sans-serif; color: var(--chalk, #f1eee4); background: var(--slot, #0b2420); border: 1px solid rgba(241,238,228,.2); border-radius: 999px; padding: 6px 11px; cursor: pointer; white-space: nowrap; }
  .rb-btn:hover, .rb-btn:focus-visible { border-color: var(--amber, #f3b641); color: var(--amber, #f3b641); outline: none; }
  .rb-btn i { font-style: normal; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; background: var(--amber, #f3b641); color: #1a1405; font-size: 11px; }
  @media (max-width: 480px) { .rb-btn .t { display: none; } .rb-btn { padding: 6px; } }
  .bar { min-width: 0; }
  .bar > .title { min-width: 0; }
  @media (max-width: 480px) { .bar { gap: 8px; } .bar .logo { padding-right: 8px; } }
  .rb-inline { background: none; border: 0; padding: 0; font: inherit; font-weight: 700; color: var(--amber, #f3b641); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .rb-ov { position: fixed; inset: 0; z-index: 1000; display: none; align-items: center; justify-content: center; background: rgba(3, 10, 9, .72);
    padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px)); }
  .rb-ov.open { display: flex; }
  .rb-box { width: 100%; max-width: 620px; max-height: 100%; display: flex; flex-direction: column; background: #10302a; color: #f1eee4; border: 1px solid rgba(241,238,228,.18); border-top: 4px solid #f3b641; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.5); font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
  .rb-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px 12px; border-bottom: 1px solid rgba(241,238,228,.12); }
  .rb-head h2 { margin: 0; flex: 1; font: 400 24px/1.15 "Black Han Sans", "Noto Sans KR", sans-serif; }
  .rb-head small { display: block; font: 600 11px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: .14em; color: #a7bcb2; margin-bottom: 6px; }
  .rb-x { flex: none; width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(241,238,228,.2); background: #0b2420; color: #f1eee4; font-size: 20px; line-height: 1; cursor: pointer; }
  .rb-x:hover { border-color: #f3b641; color: #f3b641; }
  .rb-body { overflow-y: auto; padding: 14px 18px 20px; display: grid; gap: 16px; font-size: 15px; line-height: 1.6; word-break: keep-all; }
  .rb-lede { margin: 0; padding: 12px 14px; background: #0b2420; border-radius: 8px; }
  .rb-lede b, .rb-body li b, .rb-body dd b { color: #f3b641; }
  .rb-body h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; letter-spacing: .06em; color: #f3b641; }
  .rb-body ol, .rb-body ul { margin: 0; padding-left: 1.3em; display: grid; gap: 5px; }
  .rb-body dl { margin: 0; display: grid; gap: 4px 0; }
  .rb-body dt { font-weight: 700; margin-top: 6px; }
  .rb-body dt:first-child { margin-top: 0; }
  .rb-body dd { margin: 0; color: #d7dfd8; }
  .rb-note { margin: 8px 0 0; font-size: 13px; color: #a7bcb2; }
  .rb-sw { display: inline-block; padding: 0 7px; border-radius: 4px; font-weight: 700; font-size: 13px; }
  .rb-sw.b { background: #0a0f0e; color: #f1eee4; border: 1px solid rgba(241,238,228,.35); }
  .rb-sw.w { background: #f1eee4; color: #0a0f0e; }
  @media (max-width: 480px) { .rb-ov { align-items: flex-end; padding-inline: 0; padding-bottom: 0; } .rb-box { border-radius: 14px 14px 0 0; max-height: 88vh; } .rb-body { padding-bottom: max(20px, env(safe-area-inset-bottom, 0px)); } }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const R = RULES[GAME];
  const ov = document.createElement('div');
  ov.className = 'rb-ov';
  ov.innerHTML = `<div class="rb-box" role="dialog" aria-modal="true" aria-labelledby="rbTitle">
    <div class="rb-head"><h2 id="rbTitle"><small>HOW TO PLAY</small>${R.title} 규칙</h2><button type="button" class="rb-x" aria-label="규칙 닫기">×</button></div>
    <div class="rb-body"><p class="rb-lede">${R.lede}</p>${R.sections.map(([h, b]) => `<section><h3>${h}</h3>${b}</section>`).join('')}</div>
  </div>`;
  let lastFocus = null;
  function open() {
    if (!ov.isConnected) document.body.appendChild(ov);
    lastFocus = document.activeElement;
    ov.classList.add('open');
    ov.querySelector('.rb-body').scrollTop = 0;
    ov.querySelector('.rb-x').focus();
  }
  function close() {
    ov.classList.remove('open');
    if (location.hash === '#rules') history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.rb-x')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('open')) close(); });
  document.addEventListener('click', e => { const t = e.target.closest('[data-rules]'); if (t) { e.preventDefault(); open(); } });

  // 화면이 다시 그려질 때마다 로고 옆에 규칙 버튼을 붙임
  function addButtons() {
    document.querySelectorAll('.logo:not([data-rb])').forEach(logo => {
      logo.setAttribute('data-rb', '');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rb-btn';
      b.setAttribute('data-rules', '');
      b.setAttribute('aria-label', '게임 규칙 보기');
      b.innerHTML = '<i>?</i><span class="t">규칙</span>';
      const box = logo.parentElement;
      const controls = box && box.querySelector(':scope > .controls');
      if (controls) { b.className = 'btn full'; b.textContent = '규칙'; controls.prepend(b); }  // AI 흑과 백: 다른 버튼들과 나란히
      else if (box && box.classList.contains('brand')) { b.style.marginLeft = 'auto'; box.appendChild(b); }  // 입장 화면 제목줄: 오른쪽 끝
      else logo.after(b);  // 경기 중 상단 막대: 로고 바로 옆
    });
  }
  function start() {
    document.body.appendChild(ov);
    addButtons();
    new MutationObserver(addButtons).observe(document.body, { childList: true, subtree: true });
    if (location.hash === '#rules') open();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('hashchange', () => { if (location.hash === '#rules') open(); });
})();
