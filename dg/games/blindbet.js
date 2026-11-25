// 블라인드 베팅 (피의 게임3 데스매치) — 내 블라인드 카드는 못 보고, 오픈 카드와 합쳐 승부
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  // 공통 베팅 진행: pot에 각자 1개 깔고 시작. act(p,'call'|'raise'|'fold',n)
  LAB.betting = function (chips, first) {
    return { bet: [1, 1], toAct: first, acted: [false, false], done: false, folded: null, chips };
  };

  LAB.add({
    id: 'blindbet', name: '블라인드 베팅', show: '피의 게임',
    rules: `<ul>
      <li>2라운드. 각자 칩 30개와 오픈 카드 1~10을 받아요(라운드마다 다시 받음).</li>
      <li>매 턴 각자 앞에 1~12 블라인드 카드가 한 장씩 놓여요. <b>내 카드는 못 보고 상대 카드만 보여요.</b></li>
      <li>기본 1개를 걸고, 지난 턴 승자부터 <b>레이즈·콜·폴드</b>. 상대의 남은 칩보다 많이 레이즈할 수 없어요.</li>
      <li>베팅이 끝나면 각자 남은 오픈 카드 한 장을 몰래 골라 동시에 공개. <b>블라인드 + 오픈</b> 합이 큰 쪽이 판돈을 가져가요.</li>
      <li>폴드하면 상대가 판돈을 가져가요. 폴드했는데 내 블라인드가 11·12였다면 칩 10개를 벌칙으로 더 줘요.</li>
      <li>오픈 카드 <b>1이나 2로 이기면</b> 상대에게 칩 10개를 더 받아요. 2라운드 뒤 칩이 많은 쪽이 승리.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let lv = 1, pendLv = 1, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>내 칩</small><b id="bbMe">30</b></div><div class="dp-mid"><span id="bbRound"></span><small id="bbPot"></small></div><div><small>AI 칩</small><b id="bbAi">30</b></div></div>
          <div class="bb-table">
            <div class="bb-side"><small>AI</small><div class="bb-cards" id="bbAiCards"></div><div class="bb-open" id="bbAiOpen"></div></div>
            <div class="bb-side"><small>나</small><div class="bb-cards" id="bbMyCards"></div></div>
          </div>
          <p class="g-msg" id="bbMsg"></p>
          <div class="row" id="bbBtns"></div>
          <div class="dp-row"><span class="muted">내 오픈 카드</span><div class="blocks" id="bbOpen"></div></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정</h3><div class="opt"><span>AI 난이도</span><div id="bbLv"></div></div><button type="button" class="primary" id="bbNew">새 게임</button></div>
          <div class="card"><h3>기록</h3><div class="log" id="bbLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('bbLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pendLv = v));
      $('bbNew').onclick = start;
      const who = p => p ? 'AI' : '나';
      function start() { T.clear(); lv = pendLv; G = { chips: [30, 30], round: 0, lead: rnd(2), log: [], over: false }; LAB.coin(['나', 'AI'], G.lead); newRound(); }
      function newRound() {
        G.round++; G.turnNo = 0; G.open = [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]];
        G.deck = [shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])];
        G.used = [[], []]; G.log.push(`— ${G.round}라운드 —`); newTurn();
      }
      function newTurn() {
        if (G.chips[0] <= 0 || G.chips[1] <= 0) return finish();
        G.turnNo++; G.blind = [G.deck[0].pop(), G.deck[1].pop()];
        G.bet = [1, 1]; G.chips[0]--; G.chips[1]--; G.toAct = G.lead; G.acted = [false, false]; G.phase = 'bet'; G.choice = [null, null]; G.result = null;
        render(); if (G.toAct === 1) T.set(aiBet, 1100);
      }
      const maxRaise = p => Math.min(G.chips[p] - (G.bet[1 - p] - G.bet[p]), G.chips[1 - p]);
      function act(p, kind, n = 1) {
        if (kind === 'fold') { G.log.push(`${G.turnNo}턴 ${who(p)} 폴드`); return settle(1 - p, true, p); }
        const need = G.bet[1 - p] - G.bet[p];
        if (kind === 'call') { const c = Math.min(need, G.chips[p]); G.bet[p] += c; G.chips[p] -= c; if (c < need) { G.bet[1 - p] -= need - c; G.chips[1 - p] += need - c; } /* 올인: 모자란 만큼 상대 판돈 돌려줌 */ G.log.push(`${G.turnNo}턴 ${who(p)} ${need ? '콜' : '체크'}`); }
        if (kind === 'raise') { const tot = need + n; G.bet[p] += tot; G.chips[p] -= tot; G.log.push(`${G.turnNo}턴 ${who(p)} ${n}개 레이즈`); }
        G.acted[p] = true;
        if (G.bet[0] === G.bet[1] && G.acted[0] && G.acted[1]) { G.phase = 'open'; render(); return T.set(() => { G.choice[1] = aiOpen(); render(); }, 600); }
        G.toAct = 1 - p; render(); if (G.toAct === 1) T.set(aiBet, 1000);
      }
      function settle(w, fold, folder) {
        const pot = G.bet[0] + G.bet[1]; G.chips[w] += pot; let t = `${who(w)}가 판돈 ${pot}개 획득`;
        if (fold && G.blind[folder] >= 11) { const pen = Math.min(10, G.chips[folder]); G.chips[folder] -= pen; G.chips[w] += pen; t += ` · ${who(folder)} 블라인드 ${G.blind[folder]}로 폴드, 벌칙 ${pen}개`; }
        if (!fold && G.choice[w] <= 2) { const b = Math.min(10, G.chips[1 - w]); G.chips[1 - w] -= b; G.chips[w] += b; t += ` · 오픈 ${G.choice[w]}로 승리, 보너스 ${b}개`; }
        G.log.push(t); G.lead = w; G.phase = 'show'; G.result = { w, fold }; render();
        T.set(nextTurn, 2600);
      }
      function nextTurn() { if (G.turnNo >= 10) { if (G.round >= 2) return finish(); return newRound(); } newTurn(); }
      function showdown() {
        const p = G.choice; G.open[0].splice(G.open[0].indexOf(p[0]), 1); G.open[1].splice(G.open[1].indexOf(p[1]), 1);
        G.used[0].push(G.blind[0]); G.used[1].push(G.blind[1]);
        const s0 = G.blind[0] + p[0], s1 = G.blind[1] + p[1];
        G.log.push(`${G.turnNo}턴 공개: 나 ${G.blind[0]}+${p[0]}=${s0} / AI ${G.blind[1]}+${p[1]}=${s1}`);
        if (s0 === s1) { G.chips[0] += G.bet[0]; G.chips[1] += G.bet[1]; G.log.push('무승부, 판돈을 돌려받아요'); G.phase = 'show'; G.result = { w: -1 }; render(); return T.set(nextTurn, 2600); }
        settle(s0 > s1 ? 0 : 1, false);
      }
      function finish() { G.over = true; G.phase = 'over'; render(); const d = G.chips[0] - G.chips[1]; LAB.end(d > 0 ? '승리' : d < 0 ? '패배' : '무승부', `최종 칩 ${G.chips[0]} : ${G.chips[1]}`, start); }
      // AI 판단: 내 블라인드는 남은 덱에서 고르게, 상대 오픈은 남은 카드에서 고르게 나온다고 보고 승률 계산
      function winProb() {
        const myB = G.deck[1].concat([G.blind[1]]); // AI 입장에서 아직 안 나온 카드(지금 카드 포함)
        const pool = [...new Set(myB)];
        const oppB = G.blind[0], oppOpen = G.open[0], mine = G.open[1];
        const myOpen = mine[Math.floor(mine.length * .6)] || mine[mine.length - 1];
        let win = 0, n = 0;
        for (const b of myB) for (const o of oppOpen) { n++; const s = b + myOpen, t = oppB + o; win += s > t ? 1 : s === t ? .5 : 0; }
        return n ? win / n : .5;
      }
      function aiBet() {
        if (G.phase !== 'bet') return;
        let wp = winProb() + (Math.random() - .5) * (lv === 0 ? .4 : lv === 1 ? .15 : .06);
        const need = G.bet[0] - G.bet[1], mr = maxRaise(1);
        const highRisk = G.deck[1].concat([G.blind[1]]).filter(x => x >= 11).length / (G.deck[1].length + 1);
        if (need > 0 && wp < .32 && !(highRisk > .3 && need < 4)) return act(1, 'fold');
        if (wp > .66 && mr > 0 && Math.random() < .8) return act(1, 'raise', Math.max(1, Math.min(mr, Math.round((wp - .5) * 12 + rnd(3)))));
        if (wp < .25 && mr > 0 && Math.random() < (lv === 2 ? .12 : .06)) return act(1, 'raise', Math.min(mr, 2 + rnd(3))); // 허세
        act(1, 'call');
      }
      function aiOpen() {
        // 이길 확률이 높으면 작은 카드로(1·2면 보너스), 낮으면 버리는 카드로 1
        const mine = G.open[1].slice().sort((a, b) => a - b), oppB = G.blind[0], oppOpen = G.open[0];
        const myB = G.deck[1].concat([G.blind[1]]);
        let best = mine[0], bv = -1e9; const pot = G.bet[0] + G.bet[1];
        for (const c of mine) {
          let w = 0, n = 0; for (const b of myB) for (const o of oppOpen) { n++; w += b + c > oppB + o ? 1 : 0; }
          const p = w / n; const v = p * pot + (c <= 2 ? p * 10 : 0) - c * .9 + (Math.random() - .5) * (lv === 0 ? 4 : .5);
          if (v > bv) { bv = v; best = c; }
        }
        return best;
      }
      const card = (v, cls = '') => `<span class="pcard ${cls}">${v == null ? '?' : v}</span>`;
      function render() {
        $('bbMe').textContent = G.chips[0]; $('bbAi').textContent = G.chips[1];
        $('bbRound').textContent = G.over ? '게임 끝' : `${G.round}/2 라운드 · ${G.turnNo}/10 턴`;
        $('bbPot').textContent = G.bet ? `판돈 ${G.bet[0] + G.bet[1]} (나 ${G.bet[0]} · AI ${G.bet[1]})` : '';
        const showAll = G.phase === 'show' || G.over;
        $('bbAiCards').innerHTML = card(G.blind[1], 'blind') + `<small>블라인드</small>`;
        $('bbMyCards').innerHTML = card(showAll ? G.blind[0] : null, 'blind ' + (showAll ? '' : 'hide')) + `<small>내 블라인드</small>`;
        $('bbAiOpen').innerHTML = `<small>AI 남은 오픈 카드</small>` + G.open[1].map(v => `<span class="mini">${v}</span>`).join('') + (G.phase === 'show' && G.choice[1] ? `<div>AI 제출: ${card(G.choice[1], 'sm')}</div>` : '');
        const my = !G.over && G.phase === 'bet' && G.toAct === 0;
        const pick = G.phase === 'open' && G.choice[0] == null;
        $('bbOpen').innerHTML = G.open[0].map(v => `<button type="button" class="pcard sm ${pick ? 'can' : ''}" data-o="${v}" ${pick ? '' : 'disabled'}>${v}</button>`).join('');
        $('bbOpen').querySelectorAll('[data-o]').forEach(b => b.onclick = () => { G.choice[0] = +b.dataset.o; render(); if (G.choice[1] != null) T.set(showdown, 500); else T.set(() => { G.choice[1] = G.choice[1] ?? aiOpen(); showdown(); }, 700); });
        let btns = '';
        if (my) { const need = G.bet[1] - G.bet[0], mr = maxRaise(0);
          btns = `<button type="button" data-a="fold">폴드</button><button type="button" data-a="call">${need ? `콜 (${need}개)` : '체크'}</button>` + (mr > 0 ? `<span class="bb-raise"><input type="number" id="bbN" min="1" max="${mr}" value="${Math.min(3, mr)}"><button type="button" class="primary" data-a="raise">레이즈</button></span>` : ''); }
        $('bbBtns').innerHTML = btns;
        $('bbBtns').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const k = b.dataset.a; if (k === 'raise') { const n = Math.max(1, Math.min(maxRaise(0), parseInt($('bbN').value) || 1)); act(0, 'raise', n); } else act(0, k); });
        let msg = '';
        if (G.over) msg = '게임 끝';
        else if (G.phase === 'bet') msg = my ? 'AI의 블라인드를 보고 내 카드를 짐작해 베팅하세요' : 'AI가 베팅을 고민 중…';
        else if (G.phase === 'open') msg = pick ? '낼 오픈 카드를 고르세요 (합이 큰 쪽이 승리)' : '공개 중…';
        else if (G.result) msg = G.result.w === -1 ? '무승부' : `${who(G.result.w)} 승리${G.result.fold ? ' (폴드)' : ''} — 내 블라인드는 ${G.blind[0]}였어요`;
        $('bbMsg').textContent = msg;
        $('bbLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
