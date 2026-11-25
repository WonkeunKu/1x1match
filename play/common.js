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
  // 결과 창 (index.html 의 #endOv 재사용)
  LAB.end = (title, sub, again) => {
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
      delete btn.dataset.ready; btn.textContent = label; btn.classList.remove('ready-btn', 'nudge');
      block.remove(); if (io) io.disconnect(); btn.removeEventListener('click', go, true);
      LAB.paused = false; start();
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
