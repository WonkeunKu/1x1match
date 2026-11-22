// 인디언 포커 / 인디언 홀덤 (더 지니어스 데스매치) — 이마에 붙인 내 카드는 못 보고 베팅
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  // 홀덤 족보: 트리플 > 스트레이트 > 페어 > 하이
  function rank3(cards) {
    const s = cards.slice().sort((a, b) => b - a);
    if (s[0] === s[1] && s[1] === s[2]) return [3, s[0]];
    if (s[0] - 1 === s[1] && s[1] - 1 === s[2]) return [2, s[0]];
    if (s[0] === s[1] || s[1] === s[2]) { const p = s[1], k = s[0] === s[1] ? s[2] : s[0]; return [1, p, k]; }
    return [0, s[0], s[1], s[2]];
  }
  const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
  const RN = ['하이', '페어', '스트레이트', '트리플'];

  LAB.add({
    id: 'indian', name: '인디언 포커', show: '더 지니어스',
    rules: `<ul>
      <li><b>인디언 포커</b>(시즌1): 1~10 카드 두 벌(20장). 매 판 한 장씩 받아 <b>이마에 붙여요</b>. 상대 카드만 보이고 내 카드는 못 봐요.</li>
      <li>각자 1개를 걸고 시작해 <b>레이즈·콜·폴드</b>. 카드가 높은 쪽이 판돈을 가져가요. 같으면 판돈을 돌려받아요.</li>
      <li>10을 들고 폴드하면 칩 10개를 벌칙으로 내요. 칩 30개로 시작해 한쪽 칩이 다 떨어지면 끝.</li>
      <li><b>인디언 홀덤</b>(시즌2): 1~10 카드 네 벌(40장)에 <b>공용 카드 2장</b>이 깔려요. 내 카드 + 공용 2장으로 족보를 만들어요. 트리플 &gt; 스트레이트 &gt; 페어 &gt; 하이. 스트레이트 이상을 들고 폴드하면 벌칙 10개.</li>
      <li>덱을 다 쓰면 다시 섞어요. 이미 나온 카드를 세면 내 카드를 짐작할 수 있어요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { mode: 'poker', lv: 1 }, cfg = { ...pend }, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>내 칩</small><b id="ipMe">30</b></div><div class="dp-mid"><span id="ipHand"></span><small id="ipPot"></small></div><div><small>AI 칩</small><b id="ipAi">30</b></div></div>
          <div class="bb-table">
            <div class="bb-side"><small>AI 이마</small><div class="bb-cards" id="ipAiC"></div></div>
            <div class="bb-side" id="ipComm"></div>
            <div class="bb-side"><small>내 이마</small><div class="bb-cards" id="ipMyC"></div></div>
          </div>
          <p class="g-msg" id="ipMsg"></p>
          <div class="row" id="ipBtns"></div>
          <div id="ipSeen"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>규칙</span><div id="ipMode"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="ipLv"></div></div>
            <button type="button" class="primary" id="ipNew">새 게임</button></div>
          <div class="card"><h3>기록</h3><div class="log" id="ipLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('ipMode').appendChild(seg([['poker', '인디언 포커'], ['holdem', '인디언 홀덤']], 'poker', v => pend.mode = v));
      $('ipLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('ipNew').onclick = start;
      const who = p => p ? 'AI' : '나';
      const fullDeck = () => shuffle(Array.from({ length: cfg.mode === 'holdem' ? 40 : 20 }, (_, i) => i % 10 + 1));
      function start() { T.clear(); cfg = { ...pend }; G = { chips: [30, 30], deck: fullDeck(), seen: [], hand: 0, lead: rnd(2), log: [], over: false }; newHand(); }
      function draw() { if (!G.deck.length) { G.deck = fullDeck(); G.seen = []; G.log.push('덱을 다시 섞었어요'); } return G.deck.pop(); }
      function newHand() {
        if (G.chips[0] <= 0 || G.chips[1] <= 0) return finish();
        G.hand++; G.card = [draw(), draw()]; G.comm = cfg.mode === 'holdem' ? [draw(), draw()] : [];
        G.bet = [1, 1]; G.chips[0]--; G.chips[1]--; G.toAct = G.lead; G.acted = [false, false]; G.phase = 'bet'; G.result = null;
        render(); if (G.toAct === 1) T.set(aiBet, 1100);
      }
      const strength = p => cfg.mode === 'holdem' ? rank3([G.card[p], ...G.comm]) : [G.card[p]];
      const maxRaise = p => Math.min(G.chips[p] - (G.bet[1 - p] - G.bet[p]), G.chips[1 - p]);
      function act(p, kind, n = 1) {
        if (kind === 'fold') { G.log.push(`${G.hand}판 ${who(p)} 폴드`); return settle(1 - p, p); }
        const need = G.bet[1 - p] - G.bet[p];
        if (kind === 'call') { const c = Math.min(need, G.chips[p]); G.bet[p] += c; G.chips[p] -= c; if (c < need) { G.bet[1 - p] -= need - c; G.chips[1 - p] += need - c; } /* 올인: 모자란 만큼 상대 판돈 돌려줌 */ G.log.push(`${G.hand}판 ${who(p)} ${need ? '콜' : '체크'}`); }
        else { const tot = need + n; G.bet[p] += tot; G.chips[p] -= tot; G.log.push(`${G.hand}판 ${who(p)} ${n}개 레이즈`); }
        G.acted[p] = true;
        if (G.bet[0] === G.bet[1] && G.acted[0] && G.acted[1]) return showdown();
        G.toAct = 1 - p; render(); if (G.toAct === 1) T.set(aiBet, 1000);
      }
      function showdown() {
        const c = cmp(strength(0), strength(1));
        G.log.push(`${G.hand}판 공개: 나 ${G.card[0]} / AI ${G.card[1]}${cfg.mode === 'holdem' ? ` (공용 ${G.comm.join('·')}: ${RN[strength(0)[0]]} vs ${RN[strength(1)[0]]})` : ''}`);
        if (c === 0) { G.chips[0] += G.bet[0]; G.chips[1] += G.bet[1]; G.log.push('비겨서 판돈을 돌려받아요'); G.result = { w: -1 }; return endHand(); }
        settle(c > 0 ? 0 : 1, null);
      }
      function settle(w, folder) {
        const pot = G.bet[0] + G.bet[1]; G.chips[w] += pot; let t = `${who(w)}가 판돈 ${pot}개 획득`;
        if (folder != null) {
          const bad = cfg.mode === 'holdem' ? strength(folder)[0] >= 2 : G.card[folder] === 10;
          if (bad) { const pen = Math.min(10, G.chips[folder]); G.chips[folder] -= pen; G.chips[w] += pen; t += ` · ${who(folder)} ${cfg.mode === 'holdem' ? RN[strength(folder)[0]] : '10'}을 들고 폴드해 벌칙 ${pen}개`; }
        }
        G.log.push(t); G.lead = w; G.result = { w, fold: folder != null }; endHand();
      }
      function endHand() { G.seen.push(G.card[0], G.card[1], ...G.comm); G.phase = 'show'; render(); T.set(newHand, 2600); }
      function finish() { G.over = true; G.phase = 'over'; render(); LAB.end(G.chips[0] > G.chips[1] ? '승리' : '패배', `최종 칩 ${G.chips[0]} : ${G.chips[1]} · ${G.hand}판`, start); }
      function winProb() {
        // AI가 모르는 건 자기 카드뿐: 지금까지 나온 카드와 상대 카드·공용 카드를 뺀 나머지에서 고르게
        const pool = Array(11).fill(cfg.mode === 'holdem' ? 4 : 2); pool[0] = 0;
        for (const x of [...G.seen, G.card[0], ...G.comm]) pool[x]--;
        let w = 0, n = 0; const opp = strength(0);
        for (let v = 1; v <= 10; v++) { if (pool[v] <= 0) continue; const mine = cfg.mode === 'holdem' ? rank3([v, ...G.comm]) : [v]; const c = cmp(mine, opp); w += pool[v] * (c > 0 ? 1 : c === 0 ? .5 : 0); n += pool[v]; }
        return n ? w / n : .5;
      }
      function aiBet() {
        if (G.phase !== 'bet') return;
        const lv = cfg.lv; let wp = winProb() + (Math.random() - .5) * (lv === 0 ? .4 : lv === 1 ? .14 : .05);
        const need = G.bet[0] - G.bet[1], mr = maxRaise(1);
        if (need > 0 && wp < .3) return act(1, 'fold');
        if (wp > .68 && mr > 0 && Math.random() < .85) return act(1, 'raise', Math.max(1, Math.min(mr, Math.round((wp - .5) * 14 + rnd(3)))));
        if (wp < .3 && mr > 0 && need === 0 && Math.random() < (lv === 2 ? .15 : .07)) return act(1, 'raise', Math.min(mr, 2 + rnd(4)));
        if (need > 6 && wp < .45) return act(1, 'fold');
        act(1, 'call');
      }
      const card = (v, cls = '') => `<span class="pcard ${cls}">${v == null ? '?' : v}</span>`;
      function render() {
        $('ipMe').textContent = G.chips[0]; $('ipAi').textContent = G.chips[1];
        $('ipHand').textContent = G.over ? '게임 끝' : `${G.hand}판 · 덱 ${G.deck.length}장`;
        $('ipPot').textContent = `판돈 ${G.bet[0] + G.bet[1]} (나 ${G.bet[0]} · AI ${G.bet[1]})`;
        const show = G.phase === 'show' || G.over;
        $('ipAiC').innerHTML = card(G.card[1], 'blind');
        $('ipMyC').innerHTML = card(show ? G.card[0] : null, 'blind ' + (show ? '' : 'hide'));
        $('ipComm').innerHTML = cfg.mode === 'holdem' ? `<small>공용 카드</small><div class="bb-cards">${G.comm.map(v => card(v)).join('')}</div>` + `<small>AI 족보: ${RN[strength(1)[0]]}</small>` : '';
        const my = !G.over && G.phase === 'bet' && G.toAct === 0;
        let btns = '';
        if (my) { const need = G.bet[1] - G.bet[0], mr = maxRaise(0);
          btns = `<button type="button" data-a="fold">폴드</button><button type="button" data-a="call">${need ? `콜 (${need}개)` : '체크'}</button>` + (mr > 0 ? `<span class="bb-raise"><input type="number" id="ipN" min="1" max="${mr}" value="${Math.min(3, mr)}"><button type="button" class="primary" data-a="raise">레이즈</button></span>` : ''); }
        $('ipBtns').innerHTML = btns;
        $('ipBtns').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const k = b.dataset.a; if (k === 'raise') act(0, 'raise', Math.max(1, Math.min(maxRaise(0), parseInt($('ipN').value) || 1))); else act(0, k); });
        $('ipMsg').textContent = G.over ? '게임 끝' : G.phase === 'bet' ? (my ? 'AI 카드를 보고 내 카드를 짐작해 베팅하세요' : 'AI가 베팅을 고민 중…') : G.result ? (G.result.w === -1 ? '무승부' : `${who(G.result.w)} 승리${G.result.fold ? ' (폴드)' : ''} — 내 카드는 ${G.card[0]}였어요`) : '';
        const cnt = Array(11).fill(0); G.seen.forEach(x => cnt[x]++);
        $('ipSeen').innerHTML = `<div class="mn-seen">이번 덱에서 나온 카드: ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<span>${n}<b>×${cnt[n]}</b></span>`).join('')}</div>`;
        $('ipLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      start();
      return () => T.clear();
    }
  });
})();
