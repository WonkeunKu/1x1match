// 결! 합! (더 지니어스 데스매치·결승) — 그림 9장에서 '합' 찾기, 더 없으면 '결'
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const SH = ['원', '세모', '네모'], CO = ['빨강', '노랑', '파랑'], BG = ['흰색', '회색', '검정'];
  const COL = ['#e8604a', '#f3b641', '#4a90d9'], BGC = ['#f1eee4', '#8e9a96', '#1d2422'];
  const DECK = []; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) DECK.push([a, b, c]);
  const isHap = (x, y, z) => [0, 1, 2].every(k => (x[k] + y[k] + z[k]) % 3 === 0);
  function haps(cards) { const o = []; for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) for (let k = j + 1; k < 9; k++) if (isHap(cards[i], cards[j], cards[k])) o.push([i, j, k]); return o; }
  function tile([s, c, b]) {
    const f = COL[c];
    const shape = s === 0 ? `<circle cx="50" cy="50" r="26" fill="${f}"/>` : s === 1 ? `<path d="M50 20 L80 76 L20 76z" fill="${f}"/>` : `<rect x="24" y="24" width="52" height="52" rx="4" fill="${f}"/>`;
    return `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="10" fill="${BGC[b]}"/>${shape}</svg>`;
  }
  const ROUNDS = 10;

  LAB.add({
    id: 'gyulhap', name: '결! 합!', show: '더 지니어스',
    rules: `<ul>
      <li>그림 타일 27종: <b>모양(원·세모·네모) × 색(빨강·노랑·파랑) × 배경(흰색·회색·검정)</b>. 라운드마다 9장이 깔려요.</li>
      <li>세 요소가 각각 <b>모두 같거나 모두 다른</b> 3장이 <b>합</b>이에요. 먼저 찾아 외치면 +1, 틀리거나 이미 나온 합이면 −1.</li>
      <li>남은 합이 없다고 생각하면 <b>결</b>! 맞으면 +3, 틀리면 −1. 결이 맞으면 다음 라운드로 넘어가요.</li>
      <li>90초 동안 아무도 외치지 않으면 라운드가 자동으로 끝나요. ${ROUNDS}라운드 뒤 점수가 높은 쪽이 이겨요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let lv = 1, pendLv = 1, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="ghMe">0</b></div><div class="dp-mid"><span id="ghRound"></span><small id="ghTimer"></small></div><div><small>AI</small><b id="ghAi">0</b></div></div>
          <div class="gh-grid" id="ghGrid"></div>
          <p class="g-msg" id="ghMsg"></p>
          <div class="row"><button type="button" class="primary" id="ghHap" disabled>합!</button><button type="button" id="ghGyul">결!</button></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정</h3><div class="opt"><span>AI 속도</span><div id="ghLv"></div></div><button type="button" class="primary" id="ghNew">새 게임</button></div>
          <div class="card"><h3>이번 라운드에 나온 합</h3><div class="log" id="ghFound"></div></div>
          <div class="card"><h3>기록</h3><div class="log" id="ghLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('ghLv').appendChild(seg([[0, '느림'], [1, '보통'], [2, '빠름']], 1, v => pendLv = v));
      $('ghNew').onclick = start;
      $('ghHap').onclick = () => { if (G && G.sel.length === 3) call(0, G.sel.slice()); };
      $('ghGyul').onclick = () => G && gyul(0);
      const key = s => s.slice().sort((a, b) => a - b).join('');
      const who = p => p ? 'AI' : '나';
      function start() { T.clear(); lv = pendLv; G = { round: 0, score: [0, 0], log: [], over: false }; nextRound(); }
      function nextRound() {
        T.clear(); G.round++;
        if (G.round > ROUNDS) { if (G.score[0] === G.score[1]) { G.log.push('— 동점! 연장 라운드 —'); G.round = ROUNDS; G.ot = true; } else return finish(); }
        G.wait = false; G.cards = shuffle(DECK.slice()).slice(0, 9); G.all = haps(G.cards); G.found = {}; G.sel = []; G.last = Date.now(); G.msg = `${G.round}라운드 시작 — 합을 찾아보세요`;
        render(); scheduleAI(); T.every(tick, 300);
      }
      function tick() { if (G.over) return; if (Date.now() - G.last > 90000) { G.log.push(`${G.round}R: 90초 동안 아무도 외치지 않아 종료`); return nextRound(); } render(true); }
      function scheduleAI() { const b = [[11000, 9000], [6500, 5500], [3200, 2800]][lv]; T.set(aiAct, b[0] + Math.random() * b[1]); }
      function aiAct() {
        if (G.over || G.wait) return;
        const left = G.all.filter(s => !G.found[key(s)]);
        if (!left.length) { if (Math.random() < [.6, .85, 1][lv]) return gyul(1); return scheduleAI(); }
        if (Math.random() < [.15, .06, .015][lv]) { const a = shuffle([...Array(9).keys()]).slice(0, 3); if (!isHap(...a.map(i => G.cards[i]))) return call(1, a); }
        call(1, left[rnd(left.length)]);
      }
      function call(p, s) {
        if (G.over || G.wait) return;
        G.last = Date.now(); const k = key(s), ok = isHap(...s.map(i => G.cards[i])), nm = s.map(i => i + 1).sort().join('·');
        let t;
        if (ok && !G.found[k]) { G.found[k] = p + 1; G.score[p]++; t = `${who(p)}: 합! ${nm} +1`; }
        else { G.score[p]--; t = `${who(p)}: 합! ${nm} ${ok ? '— 이미 나온 합' : '— 틀림'} −1`; }
        G.log.push(`${G.round}R ${t}`); G.msg = t; if (p === 0) G.sel = [];
        render(); if (p === 1) scheduleAI();
      }
      function gyul(p) {
        if (G.over || G.wait) return;
        G.last = Date.now(); const left = G.all.filter(s => !G.found[key(s)]).length;
        if (!left) { G.score[p] += 3; G.log.push(`${G.round}R ${who(p)}: 결! 정답 +3`); G.msg = `${who(p)} 결! 정답 +3`; G.wait = true; G.sel = []; render(); T.clear(); T.set(nextRound, 2000); }
        else { G.score[p]--; G.log.push(`${G.round}R ${who(p)}: 결! 틀림 −1 (남은 합 ${left}개)`); G.msg = `${who(p)} 결! 틀림 −1`; render(); if (p === 1) scheduleAI(); }
      }
      function finish() { G.over = true; T.clear(); render(); LAB.end(G.score[0] > G.score[1] ? '승리' : '패배', `최종 ${G.score[0]} : ${G.score[1]}`, start); }
      function render(light) {
        $('ghMe').textContent = G.score[0]; $('ghAi').textContent = G.score[1];
        $('ghRound').textContent = G.ot ? '연장 라운드' : `${G.round}/${ROUNDS} 라운드`;
        $('ghTimer').textContent = `외침 없이 ${Math.floor((Date.now() - G.last) / 1000)}초 / 90초`;
        if (light) return;
        $('ghGrid').innerHTML = G.cards.map((c, i) => `<button type="button" class="gh-t ${G.sel.includes(i) ? 'sel' : ''}" data-i="${i}" title="${SH[c[0]]} · ${CO[c[1]]} · ${BG[c[2]]}"><b>${i + 1}</b>${tile(c)}</button>`).join('');
        $('ghGrid').querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const i = +b.dataset.i, k = G.sel.indexOf(i); if (k >= 0) G.sel.splice(k, 1); else if (G.sel.length < 3) G.sel.push(i); render(); });
        $('ghHap').disabled = G.sel.length !== 3 || G.over || G.wait; $('ghGyul').disabled = G.over || G.wait;
        $('ghHap').textContent = G.sel.length === 3 ? `합! (${G.sel.map(i => i + 1).sort().join('·')})` : `합! (${G.sel.length}/3)`;
        $('ghMsg').textContent = G.msg || '';
        const f = Object.entries(G.found);
        $('ghFound').innerHTML = f.length ? f.map(([k, p]) => `<span><b>${p === 2 ? 'AI' : '나'}</b> ${[...k].map(x => +x + 1).join('·')}</span>`).join('') : '<span>아직 없어요</span>';
        $('ghLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
