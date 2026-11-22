// 미스터리 넘버 (피의 게임2 데스매치) — 1~10 블록 40개, 상대 앞 블록 숫자 맞히기
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const comb = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

  LAB.add({
    id: 'mysterynum', name: '미스터리 넘버', show: '피의 게임',
    rules: `<ul>
      <li>1~10 숫자 블록이 4개씩 모두 40개. 각자 5개를 받아 자기 블록만 볼 수 있어요.</li>
      <li>내 차례에 둘 중 하나를 해요. <b>맞히기</b>: 상대 앞에 있을 것 같은 숫자를 불러요. 있으면 그 블록 개수만큼 점수, 맞힌 블록은 버려지고 새 블록이 채워져요. 맞히면 계속 부를 수 있고, 틀리면 차례가 넘어가요. <b>블록 추가</b>: 상대 앞에 새 블록을 하나 놓아요.</li>
      <li>상대 앞 블록을 모두 맞히면 보너스 2점.</li>
      <li>집사의 블록이 다 떨어지면 두 사람 앞 블록의 숫자 합이 공개돼요. 한 사람의 블록이 모두 없어지면 끝, 점수가 높은 쪽이 이겨요.</li>
      <li>버려진 블록을 세어 두는 게 핵심이에요. 기본 설정에서는 버려진 블록 기록이 가려져요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { lv: 1, show: false }, cfg = { ...pend }, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="mnMe">0</b></div><div class="dp-mid"><span id="mnTurn"></span><small id="mnPile"></small></div><div><small>AI</small><b id="mnAi">0</b></div></div>
          <div class="dp-row"><span class="muted">AI 앞 블록</span><div class="blocks" id="mnOpp"></div></div>
          <div class="mn-nums" id="mnNums"></div>
          <p class="g-msg" id="mnMsg"></p>
          <div class="row" id="mnBtns"></div>
          <div class="dp-row"><span class="muted">내 블록</span><div class="blocks" id="mnMine"></div></div>
          <div id="mnSeen"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>AI 기억력</span><div id="mnLv"></div></div>
            <div class="opt"><span>버려진 블록 기록</span><div id="mnShow"></div></div>
            <button type="button" class="primary" id="mnNew">새 게임</button></div>
          <div class="card"><h3>진행</h3><div class="log" id="mnLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('mnLv').appendChild(seg([[0, '깜빡깜빡'], [1, '보통'], [2, '완벽']], 1, v => pend.lv = v));
      $('mnShow').appendChild(seg([[false, '가림 (방송 규칙)'], [true, '보임 (연습)']], false, v => pend.show = v));
      $('mnNew').onclick = start;
      function start() {
        T.clear(); cfg = { ...pend };
        const pile = shuffle(Array.from({ length: 40 }, (_, i) => i % 10 + 1));
        G = { pile, hand: [pile.splice(0, 5), pile.splice(0, 5)], score: [0, 0], seen: [], aiSeen: [], turn: rnd(2), log: [], over: false, sums: null, streak: false, notIn: [new Set(), new Set()] };
        G.log.push(`선: ${G.turn === 0 ? '나' : 'AI'}`);
        render(); next();
      }
      const who = p => p ? 'AI' : '나';
      function remember(n) { G.seen.push(n); G.aiSeen.push(Math.random() < [0.75, 0.93, 1][cfg.lv] ? n : (rnd(10) + 1)); }
      function refill(p, k) { if (k > 0 && G.pile.length) G.notIn[p].clear(); let added = 0; while (k-- > 0 && G.pile.length) { G.hand[p].push(G.pile.pop()); added++; } checkPile(); return added; }
      function checkPile() { if (!G.pile.length && !G.sums) { G.sums = [G.hand[0].reduce((a, b) => a + b, 0), G.hand[1].reduce((a, b) => a + b, 0)]; G.log.push(`집사 블록 소진! 앞 블록 합계 — 나 ${G.sums[0]}, AI ${G.sums[1]}`); } }
      function guess(n) {
        const p = G.turn, q = 1 - p, k = G.hand[q].filter(x => x === n).length;
        if (k) {
          G.hand[q] = G.hand[q].filter(x => x !== n); for (let i = 0; i < k; i++) remember(n);
          G.score[p] += k; let t = `${who(p)}: ${n} → ${k}개 맞힘 +${k}`;
          if (!G.hand[q].length) { G.score[p] += 2; t += ' · 전부 맞혀 보너스 +2'; }
          refill(q, k); G.log.push(t); G.streak = true;
          if (endCheck()) return; render(); if (p === 1) T.set(aiTurn, 900);
        } else { G.notIn[q].add(n); G.log.push(`${who(p)}: ${n} → 없음`); endTurn(); }
      }
      function addBlock() { const p = G.turn; if (!G.pile.length) return; refill(1 - p, 1); G.log.push(`${who(p)}: ${who(1 - p)} 앞에 블록 추가`); endTurn(); }
      function endTurn() { G.streak = false; if (endCheck()) return; G.turn = 1 - G.turn; render(); next(); }
      function endCheck() {
        if (!G.pile.length && (!G.hand[0].length || !G.hand[1].length)) {
          G.over = true; render(); const d = G.score[0] - G.score[1];
          T.set(() => LAB.end(d > 0 ? '승리' : d < 0 ? '패배' : '무승부', `최종 ${G.score[0]} : ${G.score[1]}`, start), 500); return true;
        }
        return false;
      }
      function next() { if (!G.over && G.turn === 1) T.set(aiTurn, 1000); }
      function aiTurn() {
        if (G.over) return;
        // 아는 블록: 내 손 + 기억한 버려진 블록. 모르는 블록 중 상대 손에 있을 확률이 가장 큰 숫자
        const known = Array(11).fill(0); G.hand[1].forEach(x => known[x]++); G.aiSeen.forEach(x => known[x]++);
        const unseen = Array(11).fill(0); let U = 0; for (let n = 1; n <= 10; n++) { unseen[n] = Math.max(0, 4 - known[n]); U += unseen[n]; }
        const hsz = G.hand[0].length; let best = 1, bp = -1;
        for (let n = 1; n <= 10; n++) {
          let pr = U ? 1 - comb(U - unseen[n], hsz) / comb(U, hsz) : 0;
          if (G.notIn[0].has(n)) pr = -1; // 방금 불러서 없다고 확인된 숫자
          if (G.sums && !G.pile.length) pr = unseen[n] ? Math.min(1, pr * 1.4) : 0;
          pr += (Math.random() - .5) * (cfg.lv === 0 ? .25 : .05);
          if (pr > bp) { bp = pr; best = n; }
        }
        const threshold = G.streak ? .55 : (G.pile.length > 6 ? .62 : .3);
        if (bp < threshold && G.pile.length && !G.streak) return addBlock();
        if (bp < .35 && G.streak) { G.log.push('AI: 그만 부르고 차례를 넘겨요'); return endTurn(); }
        guess(best);
      }
      const blk = (n, cls = '') => `<span class="blk ${n == null ? 'back black' : 'num'} ${cls}">${n ?? ''}</span>`;
      function render() {
        $('mnMe').textContent = G.score[0]; $('mnAi').textContent = G.score[1];
        $('mnTurn').textContent = G.over ? '게임 끝' : `${who(G.turn)} 차례`;
        $('mnPile').textContent = `집사 블록 ${G.pile.length}개 남음` + (G.sums ? ` · 합계 나 ${G.sums[0]} / AI ${G.sums[1]}` : '');
        $('mnOpp').innerHTML = G.over ? G.hand[1].slice().sort((a, b) => a - b).map(n => blk(n)).join('') : G.hand[1].map(() => blk(null)).join('') || '<span class="muted">없음</span>';
        $('mnMine').innerHTML = G.hand[0].slice().sort((a, b) => a - b).map(n => blk(n)).join('') || '<span class="muted">없음</span>';
        const my = !G.over && G.turn === 0;
        $('mnNums').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button type="button" class="mn-n" data-n="${n}" ${my ? '' : 'disabled'}>${n}</button>`).join('');
        $('mnNums').querySelectorAll('[data-n]').forEach(b => b.onclick = () => guess(+b.dataset.n));
        $('mnBtns').innerHTML = my ? (G.streak ? `<button type="button" id="mnStop">그만 부르고 넘기기</button>` : `<button type="button" id="mnAdd" ${G.pile.length ? '' : 'disabled'}>AI 앞에 블록 추가</button>`) : '';
        const st = $('mnStop'); if (st) st.onclick = endTurn; const ad = $('mnAdd'); if (ad) ad.onclick = addBlock;
        $('mnMsg').textContent = G.over ? '게임 끝 — AI 블록이 공개됐어요' : my ? (G.streak ? '맞혔어요! 계속 부르거나 차례를 넘기세요' : 'AI 앞에 있을 것 같은 숫자를 부르거나, 블록을 추가하세요') : 'AI 차례…';
        const cnt = Array(11).fill(0); G.seen.forEach(x => cnt[x]++);
        $('mnSeen').innerHTML = cfg.show ? `<div class="mn-seen">버려진 블록: ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<span>${n}<b>×${cnt[n]}</b></span>`).join('')}</div>` : '';
        $('mnLog').innerHTML = (cfg.show || G.over ? G.log : G.log.slice(-3)).slice().reverse().map(x => `<span>${esc(x)}</span>`).join('') + (!cfg.show && !G.over && G.log.length > 3 ? '<span class="muted">(지난 기록은 가려져요 — 외워 두세요)</span>' : '');
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
