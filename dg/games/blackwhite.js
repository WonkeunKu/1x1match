// 흑과 백 (더 지니어스 데스매치) — 0~8 타일, 숫자는 공개되지 않고 승패와 색만 알려줌
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const col = n => n % 2 === 0 ? 'black' : 'white';
  // 상대가 낸 타일 기록(색, 결과, 내 타일)으로 가능한 배정을 모두 따져 남은 타일별 확률 계산
  function oppDist(hist, mineUsedAll) {
    const counts = Array(9).fill(0); let total = 0;
    const plays = hist; // [{c:'black'|'white', res: 1 (상대 승) | -1 | 0, mine}]
    (function bt(k, used) {
      if (total > 4000) return;
      if (k === plays.length) { total++; for (const n of ALL) if (!used.has(n)) counts[n]++; return; }
      const p = plays[k];
      for (const n of ALL) {
        if (used.has(n) || col(n) !== p.c) continue;
        const r = n > p.mine ? 1 : n < p.mine ? -1 : 0;
        if (r !== p.res) continue;
        used.add(n); bt(k + 1, used); used.delete(n);
      }
    })(0, new Set());
    return total ? counts.map(c => c / total) : ALL.map(() => 1 / 9);
  }

  LAB.add({
    id: 'blackwhite', name: '흑과 백', show: '더 지니어스',
    rules: `<ul>
      <li>각자 0~8 숫자 타일 9개. <b>짝수(0·2·4·6·8)는 검정, 홀수(1·3·5·7)는 흰색</b>이에요.</li>
      <li>9라운드. 선이 타일 하나를 뒷면으로 내면 후는 그 <b>색만 보고</b> 타일을 내요.</li>
      <li>큰 숫자를 낸 쪽이 1점. 같으면 무승부. <b>낸 숫자는 공개되지 않고 승패만</b> 알려줘요.</li>
      <li>이긴 사람이 다음 라운드 선이에요. 9라운드 뒤 점수가 높은 쪽이 이겨요.</li>
      <li>상대가 낸 색과 승패를 기억해 남은 타일을 추리하는 게 핵심이에요. 이 사이트의 '9이닝 홈런 흑과 백'이 이 게임을 야구로 바꾼 버전이에요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let lv = 1, pendLv = 1, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="bwMe">0</b></div><div class="dp-mid"><span id="bwRound"></span><small id="bwSub"></small></div><div><small>AI</small><b id="bwAi">0</b></div></div>
          <div class="dp-row"><span class="muted">AI 남은 타일</span><div class="blocks" id="bwOpp"></div></div>
          <div class="dp-table" id="bwTable"></div>
          <p class="g-msg" id="bwMsg"></p>
          <div class="dp-row"><span class="muted">내 타일</span><div class="blocks" id="bwHand"></div></div>
          <div class="bw-hist" id="bwHist"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정</h3><div class="opt"><span>AI 난이도</span><div id="bwLv"></div></div><button type="button" class="primary" id="bwNew">새 게임</button></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('bwLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pendLv = v));
      $('bwNew').onclick = start;
      function start() { T.clear(); lv = pendLv; G = { round: 0, score: [0, 0], used: [[], []], lead: rnd(2), hist: [], aiView: [], over: false }; next(); }
      function next() {
        if (G.round >= 9) return finish();
        G.round++; G.table = { first: G.lead, a: null, b: null }; render();
        if (G.lead === 1) T.set(() => { G.table.a = aiPick(null); render(); }, 1000);
      }
      const left = p => ALL.filter(n => !G.used[p].includes(n));
      function aiPick(oppColor) {
        const mine = left(1);
        if (lv === 0 && Math.random() < .45) { const t = mine[rnd(mine.length)]; G.used[1].push(t); return t; }
        const d = oppDist(G.aiView); const cand = ALL.filter(n => d[n] > 0 && (!oppColor || col(n) === oppColor));
        const w = cand.map(n => d[n]); const tw = w.reduce((a, b) => a + b, 0) || 1;
        let best = mine[0], bv = -1e9;
        for (const t of mine) {
          let ev = 0; cand.forEach((n, k) => { ev += (w[k] / tw) * (t > n ? 1 : t < n ? -1 : 0); });
          const cost = t / 8 * (oppColor ? .55 : .35); // 큰 숫자는 아껴 둠
          const v = ev - cost + (Math.random() - .5) * (lv === 2 ? .08 : .35);
          if (v > bv) { bv = v; best = t; }
        }
        G.used[1].push(best); return best;
      }
      function humanPlay(n) {
        const t = G.table; if (!t || G.over) return;
        if (t.first === 0 && t.a == null) { t.a = n; G.used[0].push(n); render(); T.set(() => { t.b = aiPick(col(n)); render(); T.set(resolve, 900); }, 1000); }
        else if (t.first === 1 && t.a != null && t.b == null) { t.b = n; G.used[0].push(n); render(); T.set(resolve, 700); }
      }
      function resolve() {
        const t = G.table, me = t.first === 0 ? t.a : t.b, ai = t.first === 0 ? t.b : t.a;
        const r = me > ai ? 0 : me < ai ? 1 : -1;
        if (r >= 0) { G.score[r]++; G.lead = r; }
        G.hist.push({ me, ai, r, first: t.first });
        G.aiView.push({ c: col(me), res: me > ai ? 1 : me < ai ? -1 : 0, mine: ai }); // AI가 보는 정보: 내 타일 색과 결과
        G.table = null; render(); T.set(next, 1400);
      }
      function finish() { G.over = true; render(); const d = G.score[0] - G.score[1]; LAB.end(d > 0 ? '승리' : d < 0 ? '패배' : '무승부', `최종 ${G.score[0]} : ${G.score[1]}`, start); }
      const tile = (n, cls = '', attrs = '') => `<button type="button" class="bwt ${col(n)} ${cls}" ${attrs}>${n}</button>`;
      function render() {
        $('bwMe').textContent = G.score[0]; $('bwAi').textContent = G.score[1];
        $('bwRound').textContent = G.over ? '게임 끝' : `${G.round}/9 라운드`;
        $('bwSub').textContent = G.table ? `${G.table.first === 0 ? '내가' : 'AI가'} 선` : '';
        const oppLeft = left(1);
        $('bwOpp').innerHTML = G.over ? oppLeft.map(n => tile(n, 'sm', 'disabled')).join('') : `<span class="muted">검정 ${oppLeft.filter(n => n % 2 === 0).length} · 흰색 ${oppLeft.filter(n => n % 2).length}</span>`;
        const t = G.table, myTurn = t && ((t.first === 0 && t.a == null) || (t.first === 1 && t.a != null && t.b == null));
        $('bwHand').innerHTML = ALL.map(n => G.used[0].includes(n) ? tile(n, 'used', 'disabled') : tile(n, myTurn ? 'can' : '', `data-n="${n}" ${myTurn ? '' : 'disabled'}`)).join('');
        $('bwHand').querySelectorAll('[data-n]').forEach(b => b.onclick = () => humanPlay(+b.dataset.n));
        let tb = '';
        if (t) { const me = t.first === 0 ? t.a : t.b, ai = t.first === 0 ? t.b : t.a;
          const slot = (n, mine) => n == null ? '<span class="bwt empty">?</span>' : `<span class="bwt big ${col(n)}">${mine ? n : ''}</span>`;
          tb = `<div class="duel"><div><small>나</small>${slot(me, true)}</div><span class="vs">VS</span><div><small>AI</small>${slot(ai, false)}</div></div>`; }
        else if (G.hist.length) { const l = G.hist[G.hist.length - 1]; tb = `<div class="bw-res ${l.r === 0 ? 'win' : l.r === 1 ? 'lose' : ''}">${l.r === 0 ? '내가 이겼어요' : l.r === 1 ? 'AI가 이겼어요' : '무승부'}</div>`; }
        $('bwTable').innerHTML = tb;
        $('bwMsg').textContent = G.over ? '게임 끝 — AI가 낸 숫자를 공개해요' : !t ? '' : t.first === 0 && t.a == null ? '내가 선이에요. 낼 타일을 고르세요' : t.first === 1 && t.a == null ? 'AI가 고르는 중…' : t.b == null && t.first === 1 ? `AI가 ${col(t.a) === 'black' ? '검정' : '흰색'} 타일을 냈어요. 맞받아칠 타일을 고르세요` : '판정 중…';
        $('bwHist').innerHTML = G.hist.length ? `<table><tr><th>라운드</th>${G.hist.map((_, k) => `<th>${k + 1}</th>`).join('')}</tr><tr><td>나</td>${G.hist.map(x => `<td><span class="dot ${col(x.me)}"></span>${x.me}</td>`).join('')}</tr><tr><td>AI</td>${G.hist.map(x => `<td><span class="dot ${col(x.ai)}"></span>${G.over ? x.ai : ''}</td>`).join('')}</tr><tr><td>결과</td>${G.hist.map(x => `<td>${x.r === 0 ? '승' : x.r === 1 ? '패' : '무'}</td>`).join('')}</tr></table>` : '';
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
