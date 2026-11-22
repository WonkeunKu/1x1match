// 시크릿 다이스 (피의 게임2 데스매치) — 주사위 3개 + 두 사람이 몰래 정한 숫자로 요트 점수표 채우기
(function () {
  const { h, esc, rnd, seg } = LAB;
  const CATS = [
    ['1', '1번'], ['2', '2번'], ['3', '3번'], ['4', '4번'], ['5', '5번'], ['6', '6번'],
    ['sum', '총합'], ['fh', '2·3 다이스'], ['s4', '4연속 다이스'], ['s5', '5연속 다이스'], ['q4', '4 다이스'], ['jk', '5 다이스 / 조커']
  ];
  const BASE = { 1: 1.5, 2: 3, 3: 4.5, 4: 6, 5: 7.5, 6: 9, sum: 17, fh: 10, s4: 11, s5: 12, q4: 6, jk: 14 };
  const counts = d => { const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(x => c[x]++); return c; };
  // 1과 6도 이어진 것으로 봄 (고리 모양)
  function cyc(d, len) { const has = new Set(d); for (let s = 1; s <= 6; s++) { let ok = true; for (let k = 0; k < len; k++) if (!has.has((s - 1 + k) % 6 + 1)) { ok = false; break; } if (ok) return true; } return false; }
  // 칸별 점수(조건 안 맞으면 null)
  function score(cat, d) {
    const c = counts(d), mx = Math.max(...c);
    if (/^[1-6]$/.test(cat)) { const n = +cat; return c[n] ? c[n] * n : null; }
    if (cat === 'sum') return d.reduce((a, b) => a + b, 0);
    if (cat === 'fh') return (c.includes(3) && c.includes(2)) || mx === 5 ? 20 : null;
    if (cat === 's4') return cyc(d, 4) ? 20 : null;
    if (cat === 's5') return cyc(d, 5) ? 30 : null;
    if (cat === 'q4') return mx >= 4 ? 20 : null;
    if (cat === 'jk') { if (mx === 5) return 40; const alt = ['fh', 's4', 's5', 'q4'].map(k => score(k, d)).filter(x => x != null); return alt.length ? Math.max(...alt) : null; }
  }
  function bestCat(card, d) { // 남은 칸 중 (점수 - 기대치)가 가장 큰 칸
    let best = null, bv = -1e9;
    for (const [k] of CATS) { if (card[k] != null) continue; const s = score(k, d); const v = (s == null ? 0 : s) - BASE[k] - (s == null ? 2 : 0); if (v > bv) { bv = v; best = k; } }
    return { cat: best, v: bv };
  }
  const picks = n => n === 1 ? [1, 2, 3, 4, 5, 6].map(x => [x]) : [1, 2, 3, 4, 5, 6].flatMap(a => [1, 2, 3, 4, 5, 6].filter(b => b >= a).map(b => [a, b]));

  LAB.add({
    id: 'secretdice', name: '시크릿 다이스', show: '피의 게임',
    rules: `<ul>
      <li>12라운드. 라운드마다 두 사람이 번갈아 <b>주 플레이어</b>가 돼요.</li>
      <li>집사가 주사위 3개를 굴리면, 주 플레이어가 그중 <b>1개 이상을 고정</b>해요. 3개 고정은 게임 중 한 번만.</li>
      <li>남은 주사위는 두 사람이 나눠 가지고, 각자 <b>원하는 눈을 몰래 정해 동시에 공개</b>해요. 1개 고정: 주 2개·상대 2개 / 2개 고정: 주 1개·상대 2개 / 3개 고정: 주 1개·상대 1개.</li>
      <li>주 플레이어는 5개 눈으로 점수표 한 칸을 채워요. 조건이 안 맞는 칸을 고르면 그 칸은 0점이에요.</li>
      <li>점수표: 1~6번(그 눈의 합), 총합, 2·3 다이스 20, 4연속 20, 5연속 30, 4 다이스 20, 5 다이스 40 또는 조커(다른 조합 점수로 대신). 연속은 6 다음에 1도 이어져요.</li>
      <li>상대가 내 족보를 막으려고 눈을 정한다는 게 핵심이에요. 12칸을 다 채운 뒤 합계가 높은 쪽이 이겨요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let lv = 1, pendLv = 1, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="sdMe">0</b></div><div class="dp-mid"><span id="sdRound"></span><small id="sdSub"></small></div><div><small>AI</small><b id="sdAi">0</b></div></div>
          <div class="sd-dice" id="sdDice"></div>
          <div id="sdPick"></div>
          <p class="g-msg" id="sdMsg"></p>
          <div class="row" id="sdBtns"></div>
          <div class="scroll"><table class="sd-card" id="sdCard"></table></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정</h3><div class="opt"><span>AI 난이도</span><div id="sdLv"></div></div><button type="button" class="primary" id="sdNew">새 게임</button></div>
          <div class="card"><h3>기록</h3><div class="log" id="sdLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('sdLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pendLv = v));
      $('sdNew').onclick = start;
      const total = card => Object.values(card).reduce((a, b) => a + (b || 0), 0);
      function start() { T.clear(); lv = pendLv; G = { round: 1, first: rnd(2), half: 0, card: [{}, {}], fix3: [true, true], log: [], over: false }; G.log.push(`선: ${G.first === 0 ? '나' : 'AI'}`); newTurn(); }
      const main = () => (G.first + G.half) % 2;
      function newTurn() {
        G.dice = [1, 2, 3].map(() => rnd(6) + 1); G.fixed = []; G.phase = 'fix'; G.mine = []; G.ai = []; G.reveal = null;
        render();
        if (main() === 1) T.set(aiFix, 1200);
      }
      const giveCount = nf => nf === 1 ? [2, 2] : nf === 2 ? [1, 2] : [1, 1]; // [주, 상대]
      // 상대(막는 쪽)가 고를 눈: 주 플레이어의 가능한 선택에 대해 평균·최악을 섞은 값이 가장 낮게
      function blockPick(fixedVals, nMain, nOpp, card) {
        let best = null, bv = 1e9;
        for (const o of picks(nOpp)) {
          let sum = 0, mx = -1e9, cnt = 0;
          for (const m of picks(nMain)) { const v = bestCat(card, [...fixedVals, ...m, ...o]).v; sum += v; mx = Math.max(mx, v); cnt++; }
          const val = (lv === 2 ? .45 : .7) * (sum / cnt) + (lv === 2 ? .55 : .3) * mx + (Math.random() - .5) * (lv === 0 ? 20 : 2);
          if (val < bv) { bv = val; best = o; }
        }
        return best;
      }
      function mainPick(fixedVals, nMain, nOpp, card) {
        let best = null, bv = -1e9;
        for (const m of picks(nMain)) {
          let sum = 0, mn = 1e9, cnt = 0;
          for (const o of picks(nOpp)) { const v = bestCat(card, [...fixedVals, ...m, ...o]).v; sum += v; mn = Math.min(mn, v); cnt++; }
          const val = .55 * (sum / cnt) + .45 * mn + (Math.random() - .5) * (lv === 0 ? 20 : 2);
          if (val > bv) { bv = val; best = m; }
        }
        return { pick: best, v: bv };
      }
      function aiFix() {
        const subsets = [[0], [1], [2], [0, 1], [0, 2], [1, 2]]; if (G.fix3[1] && G.round >= 6) subsets.push([0, 1, 2]);
        let best = subsets[0], bv = -1e9;
        for (const sub of subsets) { const [nm, no] = giveCount(sub.length); const r = mainPick(sub.map(i => G.dice[i]), nm, no, G.card[1]); const v = r.v - (sub.length === 3 ? 4 : 0); if (v > bv) { bv = v; best = sub; } }
        G.fixed = best; confirmFix();
      }
      function confirmFix() {
        const m = main(); if (G.fixed.length === 3) G.fix3[m] = false;
        const [nm, no] = giveCount(G.fixed.length); G.need = m === 0 ? [nm, no] : [no, nm]; // [나, AI]
        const fv = G.fixed.map(i => G.dice[i]);
        G.ai = m === 1 ? mainPick(fv, nm, no, G.card[1]).pick : blockPick(fv, nm, no, G.card[0]);
        G.mine = Array(G.need[0]).fill(1); G.phase = 'pick';
        G.log.push(`${G.round}R ${m === 0 ? '나' : 'AI'} 주: ${G.dice.join('·')} 중 ${fv.join('·')} 고정`);
        render();
      }
      function revealNow() {
        const fv = G.fixed.map(i => G.dice[i]), d = [...fv, ...G.mine, ...G.ai];
        G.reveal = d; G.phase = 'cat';
        G.log.push(`  공개: 나 ${G.mine.join('·')} / AI ${G.ai.join('·')} → ${d.join(' ')}`);
        render();
        if (main() === 1) T.set(() => fill(bestCat(G.card[1], d).cat), 1300);
      }
      function fill(cat) {
        const m = main(), s = score(cat, G.reveal) ?? 0; G.card[m][cat] = s;
        G.log.push(`  ${m === 0 ? '나' : 'AI'}: ${CATS.find(c => c[0] === cat)[1]} ${s}점`);
        G.half++; if (G.half % 2 === 0) G.round++;
        if (G.round > 12) { G.over = true; render(); const a = total(G.card[0]), b = total(G.card[1]); return LAB.end(a > b ? '승리' : a < b ? '패배' : '무승부', `최종 ${a} : ${b}`, start); }
        newTurn();
      }
      const die = (v, cls = '', attrs = '') => `<button type="button" class="die ${cls}" ${attrs}>${v}</button>`;
      function render() {
        $('sdMe').textContent = total(G.card[0]); $('sdAi').textContent = total(G.card[1]);
        $('sdRound').textContent = G.over ? '게임 끝' : `${G.round}/12 라운드`;
        $('sdSub').textContent = G.over ? '' : `주 플레이어: ${main() === 0 ? '나' : 'AI'} · 3개 고정 ${G.fix3[0] ? '남음' : '씀'}(나)`;
        const m = main();
        let dice = '<div class="sd-row"><small>집사 주사위</small>' + G.dice.map((v, i) => die(v, (G.fixed.includes(i) ? 'fix ' : '') + (G.phase === 'fix' && m === 0 ? 'can' : ''), `data-fix="${i}"`)).join('') + '</div>';
        if (G.reveal) dice += `<div class="sd-row"><small>공개된 5개</small>${G.reveal.map(v => die(v, 'big')).join('')}</div>`;
        $('sdDice').innerHTML = dice;
        $('sdDice').querySelectorAll('[data-fix]').forEach(b => b.onclick = () => { if (G.phase !== 'fix' || m !== 0) return; const i = +b.dataset.fix, k = G.fixed.indexOf(i); if (k >= 0) G.fixed.splice(k, 1); else G.fixed.push(i); render(); });
        let pick = '';
        if (G.phase === 'pick') pick = `<div class="sd-row"><small>내 주사위 ${G.need[0]}개 · 눈 정하기</small>${G.mine.map((v, k) => `<span class="sd-choose">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="die sm ${n === v ? 'fix' : ''}" data-k="${k}" data-v="${n}">${n}</button>`).join('')}</span>`).join('')}</div><div class="sd-row"><small>AI 주사위 ${G.need[1]}개</small>${Array(G.need[1]).fill(0).map(() => '<span class="die back">?</span>').join('')}</div>`;
        $('sdPick').innerHTML = pick;
        $('sdPick').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { G.mine[+b.dataset.k] = +b.dataset.v; render(); });
        let btns = '', msg = '';
        if (G.over) msg = '게임 끝';
        else if (G.phase === 'fix') { if (m === 0) { const ok = G.fixed.length >= 1 && (G.fixed.length < 3 || G.fix3[0]); btns = `<button type="button" class="primary" id="sdFix" ${ok ? '' : 'disabled'}>${G.fixed.length}개 고정하기</button>`; msg = '고정할 주사위를 누르세요 (1개 이상' + (G.fix3[0] ? ', 3개 고정은 한 번만' : ', 3개 고정은 이미 씀') + ')'; } else msg = 'AI가 고정할 주사위를 고르는 중…'; }
        else if (G.phase === 'pick') { btns = `<button type="button" class="primary" id="sdGo">이 눈으로 공개</button>`; msg = m === 0 ? '내 족보를 만들 눈을 정하세요. 상대는 막으려고 해요.' : 'AI의 족보를 막을 눈을 정하세요.'; }
        else if (G.phase === 'cat') msg = m === 0 ? '채울 칸을 점수표에서 고르세요 (회색 0은 조건이 안 맞는 칸이에요)' : 'AI가 칸을 고르는 중…';
        $('sdBtns').innerHTML = btns; $('sdMsg').textContent = msg;
        const fx = $('sdFix'); if (fx) fx.onclick = confirmFix;
        const go = $('sdGo'); if (go) go.onclick = revealNow;
        const canFill = G.phase === 'cat' && m === 0;
        $('sdCard').innerHTML = `<tr><th>칸</th><th>나</th><th>AI</th></tr>` + CATS.map(([k, label]) => {
          const mine = G.card[0][k], ai = G.card[1][k];
          let cell = mine != null ? mine : '';
          if (canFill && mine == null) { const s = score(k, G.reveal); cell = `<button type="button" class="sd-fill ${s == null ? 'zero' : ''}" data-cat="${k}" title="${s == null ? '조건이 안 맞아 0점으로 채워요' : ''}">${s ?? 0}</button>`; }
          return `<tr><td>${label}</td><td>${cell}</td><td>${ai != null ? ai : ''}</td></tr>`;
        }).join('') + `<tr class="tot"><td>합계</td><td>${total(G.card[0])}</td><td>${total(G.card[1])}</td></tr>`;
        $('sdCard').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => fill(b.dataset.cat));
        $('sdLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
