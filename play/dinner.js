// 기억의 만찬 (데스게임 시즌1 1회차) — 덮인 접시 20개의 토큰 개수를 외워 같은 개수 두 접시 찾기
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const P = 20;

  LAB.add({
    id: 'dinner', name: '기억의 만찬',
    rules: `<ul>
      <li>1~20번 접시. 선부터 번갈아 빈 접시 하나에 토큰을 놓고 덮어요. 1개, 2개 … 9개까지 늘려 가며 각자 45개를 다 놓으면 접시 2개는 비어요.</li>
      <li>토큰 개수는 <b>외워야</b> 해요. 배치가 끝나면 각자 토큰 10개를 더 받아요.</li>
      <li>내 차례에 1분 안에 접시 2개를 열어요. 개수가 같으면 내 토큰 1개를 둘 중 한 접시에 넣고, 다르면 벌칙으로 토큰 1개를 더 받아요. 1분을 넘기면 토큰 2개를 받아요.</li>
      <li>먼저 토큰을 다 없앤 사람이 이겨요. 둘 다 1개 남은 상황에서 선이 먼저 0개가 되면, 후가 마지막 차례에 맞히면 무승부예요.</li>
      <li>30라운드가 지나면 먼저 틀리는 사람이 바로 져요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { lv: 1, show: false }, cfg = { ...pend }, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>내 토큰</small><b id="dMe">0</b></div><div class="dp-mid"><span id="dPhase"></span><small id="dSub"></small></div><div><small>AI 토큰</small><b id="dAi">0</b></div></div>
          <div class="plates" id="dPlates"></div>
          <p class="g-msg" id="dMsg"></p>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>AI 기억력</span><div id="dLv"></div></div>
            <div class="opt"><span>접시 개수</span><div id="dShow"></div></div>
            <button type="button" class="primary" id="dNew">새 게임</button></div>
          <div class="card"><h3>진행</h3><div class="log" id="dLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('dLv').appendChild(seg([[0, '깜빡깜빡'], [1, '보통'], [2, '완벽']], 1, v => pend.lv = v));
      $('dShow').appendChild(seg([[false, '가림 (방송 규칙)'], [true, '보임 (연습)']], false, v => pend.show = v));
      $('dNew').onclick = start;
      const ACC = [.8, .93, 1];
      function start() {
        T.clear(); cfg = { ...pend };
        G = { phase: 'place', cnt: Array(P).fill(null), first: rnd(2), step: 0, tokens: [10, 10], mem: Array(P).fill(null), open: [], reveal: null, round: 0, log: [], over: false, deadline: 0 };
        G.turn = G.first; G.log.push(`선: ${G.first === 0 ? '나' : 'AI'}`); LAB.coin(['나', 'AI'], G.first);
        render(); T.every(tick, 250); nextPlace();
      }
      const who = p => p ? 'AI' : '나';
      // AI가 접시 개수를 본 순간 기록 (난이도에 따라 가끔 ±1로 잘못 기억)
      function see(plate, n) { G.mem[plate] = Math.random() < ACC[cfg.lv] ? n : Math.max(0, n + (Math.random() < .5 ? -1 : 1)); }
      const amount = () => Math.floor(G.step / 2) + 1;
      function nextPlace() {
        if (G.step >= 18) { G.cnt = G.cnt.map(x => x ?? 0); G.cnt.forEach((n, i) => { if (n === 0) see(i, 0); }); G.phase = 'play'; G.turn = G.first; G.round = 1; G.log.push('— 배치 끝! 각자 토큰 10개 —'); render(); return nextTurn(); }
        G.turn = (G.first + G.step) % 2; render();
        if (G.turn === 1) T.set(() => { const empt = G.cnt.map((x, i) => x == null ? i : -1).filter(i => i >= 0); placeAt(empt[rnd(empt.length)]); }, 700);
      }
      function placeAt(i) {
        const n = amount(); G.cnt[i] = n; see(i, n); G.flash = { i, until: Date.now() + 1400 };
        G.log.push(`${who(G.turn)}: ${i + 1}번 접시에 ${n}개`); G.step++; render(); T.set(nextPlace, 300);
      }
      function nextTurn() {
        if (G.over) return;
        G.open = []; G.reveal = null; G.deadline = Date.now() + 60000; render();
        if (G.turn === 1) T.set(aiTurn, 1100);
      }
      function aiTurn() {
        // 기억 속 같은 개수 짝 찾기
        const groups = {}; G.mem.forEach((n, i) => { if (n != null) (groups[n] = groups[n] || []).push(i); });
        const pairs = Object.values(groups).filter(g => g.length >= 2);
        let a, b;
        if (pairs.length) { const g = pairs[rnd(pairs.length)]; [a, b] = shuffle(g.slice()).slice(0, 2); }
        else { [a, b] = shuffle([...Array(P).keys()]).slice(0, 2); }
        openPlate(a); T.set(() => openPlate(b), 700);
      }
      function openPlate(i) {
        if (G.open.includes(i) || G.open.length >= 2 || G.reveal) return;
        G.open.push(i); render();
        if (G.open.length === 2) T.set(judge, 900);
      }
      function judge() {
        const [a, b] = G.open, p = G.turn, ok = G.cnt[a] === G.cnt[b];
        see(a, G.cnt[a]); see(b, G.cnt[b]);
        G.reveal = { a, b, ok };
        if (ok) {
          G.log.push(`${who(p)}: ${a + 1}번·${b + 1}번 열기 ${G.cnt[a]}-${G.cnt[b]} 성공`);
          render();
          if (p === 1) T.set(() => { // 넣을 접시: 넣은 뒤 개수가 다른 접시와 겹치지 않게(상대를 헷갈리게)
            const pickPlate = [a, b].sort((x, y) => G.mem.filter(m => m === G.cnt[x] + 1).length - G.mem.filter(m => m === G.cnt[y] + 1).length)[cfg.lv === 0 ? rnd(2) : 0];
            addToken(pickPlate); }, 900);
        } else {
          G.tokens[p]++; G.log.push(`${who(p)}: ${a + 1}번·${b + 1}번 열기 ${G.cnt[a]}-${G.cnt[b]} 실패, 토큰 +1`);
          render(); if (G.round > 30) return end(1 - p, '30라운드 뒤 먼저 틀렸어요');
          T.set(endTurn, 1500);
        }
      }
      function addToken(i) {
        const p = G.turn; G.cnt[i]++; see(i, G.cnt[i]); G.tokens[p]--; G.log.push(`${who(p)}: ${i + 1}번 접시에 토큰 넣음 (남은 ${G.tokens[p]}개)`);
        G.flash = { i, until: Date.now() + 900 }; G.reveal = null; render(); T.set(endTurn, 700);
      }
      function endTurn() {
        const p = G.turn;
        // 승패: 후가 끝내면 바로 승. 선이 끝내면 후에게 마지막 기회
        if (G.lastChance != null) { const f = G.lastChance; return G.tokens[1 - f] === 0 ? end(-1, '둘 다 토큰을 다 썼어요') : end(f, '토큰을 먼저 다 썼어요'); }
        if (G.tokens[p] === 0) { if (p === G.first && G.tokens[1 - p] === 1) { G.lastChance = p; G.log.push(`${who(1 - p)}에게 마지막 기회!`); } else return end(p, '토큰을 먼저 다 썼어요'); }
        if (p !== G.first) G.round++;
        G.turn = 1 - p; nextTurn();
      }
      function end(w, why) { G.over = true; G.phase = 'over'; render(); LAB.end(w === -1 ? '무승부' : w === 0 ? '승리' : '패배', why + ` · 남은 토큰 ${G.tokens[0]} : ${G.tokens[1]}`, start); }
      function tick() {
        if (!G || G.over || G.phase !== 'play') return render(true);
        if (G.turn === 0 && !G.reveal && Date.now() > G.deadline) { G.tokens[0] += 2; G.log.push('나: 1분 초과, 토큰 +2'); G.open = []; endTurn(); return; }
        render(true);
      }
      function render(light) {
        $('dMe').textContent = G.tokens[0]; $('dAi').textContent = G.tokens[1];
        $('dPhase').textContent = G.phase === 'place' ? `배치 ${G.step + 1}/18` : G.phase === 'play' ? `${G.round}라운드 · ${who(G.turn)} 차례` : '게임 끝';
        $('dSub').textContent = G.phase === 'play' && G.turn === 0 && !G.reveal ? `남은 시간 ${Math.max(0, Math.ceil((G.deadline - Date.now()) / 1000))}초` : G.phase === 'place' ? `${who(G.turn)}: 토큰 ${amount()}개` : '';
        if (light && !(G.flash && G.flash.until > Date.now() - 300)) return;
        const now = Date.now();
        $('dPlates').innerHTML = G.cnt.map((n, i) => {
          const isOpen = G.open.includes(i) || (G.flash && G.flash.i === i && G.flash.until > now);
          const show = cfg.show || G.over || isOpen;
          const can = (G.phase === 'place' && G.turn === 0 && n == null) || (G.phase === 'play' && G.turn === 0 && !G.reveal && G.open.length < 2 && !G.open.includes(i)) || (G.reveal && G.reveal.ok && G.turn === 0 && (i === G.reveal.a || i === G.reveal.b));
          const pick = G.reveal && G.reveal.ok && G.turn === 0 && (i === G.reveal.a || i === G.reveal.b);
          const ang = (i / G.cnt.length) * 2 * Math.PI - Math.PI / 2; // 1번이 맨 위, 시계방향으로 원을 그리며 놓임
          return `<button type="button" class="plate ${isOpen ? 'open' : ''} ${pick ? 'pick' : ''} ${n == null ? 'empty' : ''}" style="left:${(50 + 43 * Math.cos(ang)).toFixed(2)}%;top:${(50 + 43 * Math.sin(ang)).toFixed(2)}%" data-i="${i}" ${can ? '' : 'disabled'}><small>${i + 1}</small><b>${n == null ? '' : show ? n : ''}</b>${n != null && !show ? '<i class="cover"></i>' : ''}</button>`;
        }).join('');
        $('dPlates').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
          const i = +b.dataset.i;
          if (G.phase === 'place') return placeAt(i);
          if (G.reveal && G.reveal.ok) return addToken(i);
          openPlate(i);
        });
        let msg = '';
        if (G.phase === 'place') msg = G.turn === 0 ? `토큰 ${amount()}개를 놓을 빈 접시를 고르세요` : 'AI가 접시를 고르는 중…';
        else if (G.over) msg = '게임 끝 — 모든 접시가 공개됐어요';
        else if (G.turn === 1) msg = 'AI 차례…';
        else if (G.reveal && G.reveal.ok) msg = '같아요! 토큰을 넣을 접시를 둘 중에서 고르세요';
        else if (G.reveal) msg = '달라요… 토큰 +1';
        else msg = `같은 개수일 것 같은 접시 2개를 여세요 (${G.open.length}/2)`;
        $('dMsg').textContent = msg;
        $('dLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
