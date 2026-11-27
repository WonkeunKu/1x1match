// 테스트장 공통 도구: 게임 등록, 작은 DOM 헬퍼, 결과 창
(function () {
  const LAB = window.LAB = { games: [] };
  LAB.add = g => LAB.games.push(g);
  LAB.h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  LAB.esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  LAB.rnd = n => Math.floor(Math.random() * n);
  LAB.pick = a => a[Math.floor(Math.random() * a.length)];
  LAB.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  LAB.sleep = ms => new Promise(r => setTimeout(r, ms));
  // 세그먼트 버튼: opts = [[value,label],...]
  LAB.seg = (opts, value, onChange) => {
    const box = document.createElement('div'); box.className = 'seg';
    for (const [v, l] of opts) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.className = v === value ? 'on' : '';
      b.onclick = () => { box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onChange(v); };
      box.appendChild(b);
    }
    return box;
  };
  // 화면 연출은 /fx.js(GameFX)를 같이 씀: 시작 카운트다운 · 확인 창 · 규칙 슬라이드 · 처음 하는 게임 안내
  LAB.gameId = () => (location.hash || '').slice(1).split(/[?&]/)[0];
  LAB.gameName = () => { const t = document.getElementById('pageTitle'); return t ? t.textContent : ''; };
  LAB.countdown = sub => window.GameFX ? GameFX.countdown(sub) : Promise.resolve();
  LAB.ask = (title, sub, btns) => window.GameFX ? GameFX.ask(title, sub, btns) : Promise.resolve(0);
  LAB.showRules = () => { const b = document.getElementById('gameRulesBody'); return window.GameFX && b ? GameFX.rules(LAB.gameName(), b.innerHTML) : Promise.resolve(); };
  LAB.firstTime = () => window.GameFX ? GameFX.firstTime('lab:' + LAB.gameId(), LAB.showRules) : Promise.resolve();
  // 게임 중 위 막대 (게임 이름 · 판 정보 | 규칙 · 나가기). 게임 중에는 사이트 머리말·규칙 칸을 숨김
  LAB.gameBar = (anchor, onLeave) => {
    const bar = LAB.h('<div class="df-bar" hidden><div class="df-t"><b data-gn></b><span class="muted" data-lab></span></div><button type="button" data-fx="rules">규칙</button><button type="button" data-fx="leave">나가기</button></div>');
    anchor.before(bar);
    bar.addEventListener('click', async e => {
      const b = e.target.closest('[data-fx]'); if (!b) return;
      if (b.dataset.fx === 'rules') LAB.showRules();
      else {
        if (!LAB.ended) { const i = await LAB.ask('게임을 그만두시겠어요?', onLeave.net && onLeave.net() ? '나가면 이 판은 상대의 승리로 끝날 수 있어요.' : '지금 판은 기록되지 않아요.', [['계속하기'], ['그만하기', 'primary']]); if (i !== 1) return; }
        const ov = document.getElementById('endOv'); if (ov) ov.hidden = true;
        onLeave();
      }
    });
    const gw = anchor.classList && anchor.classList.contains('g-wrap') ? anchor : null;
    return {
      el: bar,
      label(t) { bar.querySelector('[data-lab]').textContent = t || ''; },
      show(on) {
        const was = document.documentElement.classList.contains('in-game');
        document.documentElement.classList.toggle('in-game', on); bar.hidden = !on;
        if (gw) { const side = gw.querySelector('.g-side'); gw.classList.toggle('g-one', on && !!side && ![...side.children].some(x => x.offsetParent !== null)); }
        if (on) { bar.querySelector('[data-gn]').textContent = LAB.gameName(); if (!was) window.scrollTo(0, 0); }
      },
    };
  };
  window.addEventListener('hashchange', () => document.documentElement.classList.remove('in-game'));
  // 라운드가 바뀌면 화면 가운데에 'ROUND n' 배너 (첫 라운드는 시작 연출이 있으니 생략)
  const roundSeen = {};
  LAB.roundBanner = (key, n, sub) => {
    const was = roundSeen[key]; roundSeen[key] = n;
    if (!window.GameFX || !n || was == null || n <= was || n < 2) return;
    GameFX.banner(`ROUND ${n}`, sub || '');
  };
  LAB.ended = false; // 결과 창이 뜬 뒤면 나가기를 물어보지 않음
  // 결과 창 (index.html 의 #endOv 재사용)
  LAB.end = (title, sub, again) => {
    LAB.ended = true;
    const ov = document.getElementById('endOv');
    document.getElementById('endTitle').textContent = title;
    document.getElementById('endSub').textContent = sub || '';
    ov.hidden = false;
    document.getElementById('againBtn').onclick = () => { ov.hidden = true; again && again(); };
    document.getElementById('closeBtn').onclick = () => { ov.hidden = true; };
  };
  // 처음 열면 판은 바로 보여 주되 멈춰 둠. 설정 칸의 '게임 시작'을 눌러야 진행(AI 수, 시간 흐름, 판 누르기)이 시작돼요.
  LAB.beforeStart = null; // 공개 페이지에서 비회원 한 판 확인용
  LAB.paused = false;
  LAB.ready = (root, start) => {
    const main = root.querySelector('.g-main'), btn = root.querySelector('.g-side button.primary');
    if (!main || !btn) { LAB.paused = false; start(); return; }
    LAB.paused = true; start(); // 멈춘 채로 첫 판을 그려 둠 (타이머는 돌지 않음)
    const label = btn.textContent; btn.textContent = '게임 시작'; btn.dataset.ready = '1'; btn.classList.add('ready-btn');
    const block = LAB.h('<div class="ready-block"><span class="ready-tip">설정을 고르고 <b>게임 시작</b>을 누르세요 <span class="rw">→</span><span class="rn">↓</span></span></div>');
    main.appendChild(block);
    block.addEventListener('click', () => { btn.classList.remove('nudge'); void btn.offsetWidth; btn.classList.add('nudge'); btn.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    // 게임 시작 버튼이 화면에 보이면 안내 띠는 숨김 (버튼을 가리지 않게)
    const tip = block.querySelector('.ready-tip'); let io = null;
    try { io = new IntersectionObserver(es => { tip.hidden = es[0].isIntersecting; }); io.observe(btn); } catch (e) {}
    const go = async e => {
      if (!btn.dataset.ready) return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (LAB.beforeStart && !(await LAB.beforeStart())) return;
      await LAB.firstTime();
      delete btn.dataset.ready; btn.textContent = label; btn.classList.remove('ready-btn', 'nudge');
      block.remove(); if (io) io.disconnect(); btn.removeEventListener('click', go, true);
      // 게임 화면으로: 머리말을 숨기고 위 막대만. 나가기는 처음(설정 고르는 화면)으로
      const bar = LAB.gameBar(root, () => { location.reload(); }); bar.show(true);
      const mo = [...root.querySelectorAll('.g-side .seg button.on')].map(x => x.textContent).slice(0, 3).join(' · ');
      bar.label(mo);
      await LAB.countdown(mo); LAB.paused = false; LAB.ended = false; start();
    };
    btn.addEventListener('click', go, true);
  };
  // 게임마다 정리할 타이머 모음
  // 선후공 연출: names 중 winner가 선. 멈춘 미리보기(LAB.paused) 중에는 안 보여 줌
  LAB.coin = (names, winner, o = {}) => { if (LAB.paused || !window.CoinFlip) return Promise.resolve(); return CoinFlip.show({ names, winner, ...o }); };
  LAB.timers = () => {
    const ids = new Set();
    return {
      // 선후공 동전 던지기가 돌아가는 동안 예약된 AI 행동은 끝난 뒤로 미룸
      set(fn, ms) { if (LAB.paused) return 0; const hold = window.CoinFlip ? Math.max(0, CoinFlip.busyUntil - Date.now()) : 0; const id = setTimeout(() => { ids.delete(id); fn(); }, ms + hold); ids.add(id); return id; },
      every(fn, ms) { if (LAB.paused) return 0; const id = setInterval(fn, ms); ids.add(id); return id; },
      clear() { ids.forEach(id => { clearTimeout(id); clearInterval(id); }); ids.clear(); }
    };
  };
})();
