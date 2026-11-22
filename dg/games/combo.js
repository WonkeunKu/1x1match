// 위치, 콤보! (데스게임 시즌1 2회차) — 주사위 숫자를 5×5 판에 놓고 외워서, 한 줄 4칸 족보로 12번 겨루기
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const ROWS = 'ABCDE', nm = i => ROWS[Math.floor(i / 5)] + (i % 5 + 1);
  // 4칸짜리 줄 28개 (가로 10, 세로 10, 대각 8)
  const LINES = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) LINES.push([0, 1, 2, 3].map(k => r * 5 + c + k));
  for (let c = 0; c < 5; c++) for (let r = 0; r < 2; r++) LINES.push([0, 1, 2, 3].map(k => (r + k) * 5 + c));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { LINES.push([0, 1, 2, 3].map(k => (r + k) * 5 + c + k)); LINES.push([0, 1, 2, 3].map(k => (r + k) * 5 + (4 - c) - k)); }
  const lineKey = l => l.slice().sort((a, b) => a - b).join(',');
  const LKEY = new Map(LINES.map((l, i) => [lineKey(l), i]));
  const RANK = ['하이', '원페어', '트리플', '투페어', '스트레이트', '로얄 스트레이트', '쿼드'];
  // 족보 계산: {rank, tie:[...], label}
  function hand(nums) {
    const cnt = {}; nums.forEach(n => cnt[n] = (cnt[n] || 0) + 1);
    const groups = Object.entries(cnt).map(([n, c]) => [+n, c]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const sorted = nums.slice().sort((a, b) => a - b);
    const consec = groups.length === 4 && sorted[3] - sorted[0] === 3;
    const ordered = consec && (nums.every((n, i) => i === 0 || n === nums[i - 1] + 1) || nums.every((n, i) => i === 0 || n === nums[i - 1] - 1));
    let rank, tie;
    if (groups[0][1] === 4) { rank = 6; tie = [groups[0][0]]; }
    else if (ordered) { rank = 5; tie = [sorted[3]]; }
    else if (consec) { rank = 4; tie = [sorted[3]]; }
    else if (groups[0][1] === 2 && groups[1][1] === 2) { rank = 3; tie = [groups[0][0], groups[1][0]]; }
    else if (groups[0][1] === 3) { rank = 2; tie = [groups[0][0], groups[1][0]]; }
    else if (groups[0][1] === 2) { rank = 1; tie = [groups[0][0], ...groups.slice(1).map(g => g[0]).sort((a, b) => b - a)]; }
    else { rank = 0; tie = sorted.slice().reverse(); }
    return { rank, tie, label: `${tie[0]} ${RANK[rank]}` };
  }
  function cmp(a, b) { if (a.rank !== b.rank) return a.rank - b.rank; for (let i = 0; i < Math.max(a.tie.length, b.tie.length); i++) { const d = (a.tie[i] || 0) - (b.tie[i] || 0); if (d) return d; } return 0; }
  const strength = hd => hd.rank * 20 + hd.tie[0];
  // AI 배치: 주사위 숫자를 놓았을 때 판 전체 줄들의 기대 족보가 가장 좋아지는 칸
  function potential(board) {
    let v = 0;
    for (const l of LINES) {
      const nums = l.map(i => board[i]).filter(n => n != null), empty = 4 - nums.length;
      const cnt = {}; nums.forEach(n => cnt[n] = (cnt[n] || 0) + 1); const mx = Math.max(0, ...Object.values(cnt));
      if (mx + empty < 2 && nums.length === 4) { const hd = hand(l.map(i => board[i])); v += strength(hd) * .2; continue; }
      if (!empty) { v += strength(hand(l.map(i => board[i]))) * .25; continue; }
      v += (mx >= 2 ? mx * mx * 1.6 : 0) + (mx === nums.length ? nums.length : 0) * .5;
      const s = [...new Set(nums)].sort((a, b) => a - b); if (s.length === nums.length && s.length >= 2 && s[s.length - 1] - s[0] <= 3) v += s.length * .9;
    }
    return v;
  }
  function aiPlace(board, n, lv) {
    const empt = board.map((x, i) => x == null ? i : -1).filter(i => i >= 0);
    if (lv === 0 && Math.random() < .5) return empt[rnd(empt.length)];
    let best = empt[0], bv = -1e9;
    for (const i of empt) { board[i] = n; const v = potential(board) + Math.random() * (lv === 2 ? .2 : 1.5); board[i] = null; if (v > bv) { bv = v; best = i; } }
    return best;
  }

  LAB.add({
    id: 'combo', name: '위치, 콤보!',
    rules: `<ul>
      <li>주사위(1~10)를 25번 굴려요. 나온 숫자를 두 사람이 각자 자기 5×5 판의 빈 칸에 놓아요 (같은 숫자를 씀).</li>
      <li>판을 다 채우면 숫자가 가려져요. <b>외운 대로</b> 가로·세로·대각선으로 이어진 4칸을 골라 족보를 내요. 한 번 낸 줄은 다시 못 써요.</li>
      <li>족보 순위: <b>쿼드</b>(4개 같음) &gt; <b>로얄 스트레이트</b>(연속 숫자가 순서대로) &gt; <b>스트레이트</b>(연속이지만 순서 섞임) &gt; <b>투페어</b> &gt; <b>트리플</b> &gt; <b>원페어</b> &gt; <b>하이</b>.</li>
      <li>같은 족보면 숫자가 높은 쪽이 이기고, 숫자까지 같으면 무승부예요. 이기면 1점, 12라운드 뒤 점수가 높은 쪽이 승리.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let lv = 1, memo = true, pend = { lv: 1, memo: true }, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="cMe">0</b></div><div class="dp-mid"><span id="cPhase"></span><small id="cSub"></small></div><div><small>AI</small><b id="cAi">0</b></div></div>
          <div class="cb-area"><div class="cb-dice" id="cDice"></div><div class="cb-board" id="cBoard"></div></div>
          <p class="g-msg" id="cMsg"></p>
          <div class="row"><button type="button" class="primary" id="cGo" disabled>이 줄로 내기</button><button type="button" id="cClear">선택 지우기</button></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>AI 난이도</span><div id="cLv"></div></div>
            <div class="opt"><span>숫자 가리기</span><div id="cMemo"></div></div>
            <button type="button" class="primary" id="cNew">새 게임</button></div>
          <div class="card"><h3>족보 대결</h3><div class="log" id="cLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('cLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('cMemo').appendChild(seg([[true, '가림 (방송 규칙)'], [false, '보임 (연습)']], true, v => pend.memo = v));
      $('cNew').onclick = start;
      $('cClear').onclick = () => { if (G) { G.sel = []; render(); } };
      $('cGo').onclick = declare;
      function start() {
        T.clear(); lv = pend.lv; memo = pend.memo;
        G = { phase: 'setup', mine: Array(25).fill(null), ai: Array(25).fill(null), rolls: Array.from({ length: 25 }, () => rnd(10) + 1), k: 0, score: [0, 0], round: 0, used: [new Set(), new Set()], sel: [], log: [], first: rnd(2) };
        render();
      }
      function placeMine(i) {
        if (G.phase !== 'setup' || G.mine[i] != null) return;
        const n = G.rolls[G.k]; G.mine[i] = n; G.ai[aiPlace(G.ai, n, lv)] = n; G.k++;
        if (G.k >= 25) { G.phase = 'play'; G.round = 1; planAI(); G.log.push('— 판 완성! 족보 대결 시작 —'); }
        render();
      }
      function planAI() {
        // AI 줄 계획: 센 줄 7개는 곳곳에 섞고 나머지는 약한 줄
        const scored = LINES.map((l, i) => ({ i, hd: hand(l.map(x => G.ai[x])) })).sort((a, b) => cmp(b.hd, a.hd));
        const strong = scored.slice(0, 7), weak = scored.slice(7).reverse();
        const plan = []; const slots = shuffle([...Array(12).keys()]);
        const strongSlots = new Set(slots.slice(0, lv === 0 ? 4 : 7));
        let si = 0, wi = 0;
        for (let r = 0; r < 12; r++) plan.push(strongSlots.has(r) && si < strong.length ? strong[si++].i : weak[wi++].i);
        if (lv === 0) shuffle(plan);
        G.aiPlan = plan;
      }
      function declare() {
        const li = selLine(); if (li == null || G.phase !== 'play') return;
        const ai = G.aiPlan[G.round - 1];
        G.used[0].add(li); G.used[1].add(ai);
        const a = hand(LINES[li].map(x => G.mine[x])), b = hand(LINES[ai].map(x => G.ai[x]));
        const c = cmp(a, b); if (c > 0) G.score[0]++; else if (c < 0) G.score[1]++;
        G.last = { li, ai, a, b, c };
        G.log.push(`${G.round}R 나 ${LINES[li].map(nm).join('-')} ${a.label} vs AI ${b.label} · ${c > 0 ? '내 승' : c < 0 ? 'AI 승' : '무승부'}`);
        G.sel = []; G.round++;
        if (G.round > 12) { G.phase = 'over'; render(); const r = G.score[0] - G.score[1]; return LAB.end(r > 0 ? '승리' : r < 0 ? '패배' : '무승부', `최종 ${G.score[0]} : ${G.score[1]}`, start); }
        render();
      }
      function selLine() { if (G.sel.length !== 4) return null; const li = LKEY.get(lineKey(G.sel)); return li == null || G.used[0].has(li) ? null : li; }
      function render() {
        $('cMe').textContent = G.score[0]; $('cAi').textContent = G.score[1];
        $('cPhase').textContent = G.phase === 'setup' ? `판 채우기 ${G.k + 1}/25` : G.phase === 'play' ? `${G.round}/12 라운드` : '게임 끝';
        $('cSub').textContent = G.phase === 'setup' ? '나온 숫자를 빈 칸에 놓으세요' : '승점 높은 쪽이 승리';
        $('cDice').innerHTML = G.phase === 'setup' ? `<small>주사위</small><b>${G.rolls[G.k]}</b>` : G.last ? `<small>지난 라운드</small><b class="sm">${G.last.a.label}<br>vs ${G.last.b.label}</b>` : '';
        const hide = memo && G.phase !== 'setup';
        const usedCells = new Set(); // 쓴 줄 표시는 하지 않음 (외워야 함)
        $('cBoard').innerHTML = `<div class="cb-h"></div>${[1, 2, 3, 4, 5].map(c => `<div class="cb-h">${c}</div>`).join('')}` +
          [0, 1, 2, 3, 4].map(r => `<div class="cb-h">${ROWS[r]}</div>` + [0, 1, 2, 3, 4].map(c => { const i = r * 5 + c, v = G.mine[i];
            const cls = G.sel.includes(i) ? 'sel' : ''; const lastHit = G.last && G.phase !== 'setup' && LINES[G.last.li].includes(i) ? 'last' : '';
            return `<button type="button" class="cb-c ${cls} ${lastHit} ${v == null ? 'empty' : ''}" data-i="${i}">${v == null ? '' : hide ? '' : v}</button>`; }).join('')).join('');
        $('cBoard').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
          const i = +b.dataset.i;
          if (G.phase === 'setup') return placeMine(i);
          if (G.phase !== 'play') return;
          const k = G.sel.indexOf(i); if (k >= 0) G.sel.splice(k, 1); else if (G.sel.length < 4) G.sel.push(i); render();
        });
        const li = G.phase === 'play' ? selLine() : null;
        $('cGo').disabled = li == null;
        let msg = '';
        if (G.phase === 'setup') msg = `주사위 ${G.rolls[G.k]} — 놓을 칸을 고르세요. 다 채우면 숫자가 가려져요.`;
        else if (G.phase === 'play') {
          if (G.sel.length < 4) msg = `한 줄로 이어진 4칸을 고르세요 (${G.sel.length}/4). 이미 쓴 줄: ${[...G.used[0]].map(i => nm(LINES[i][0]) + '-' + nm(LINES[i][3])).join(', ') || '없음'}`;
          else msg = li == null ? (LKEY.has(lineKey(G.sel)) ? '이미 낸 줄이에요.' : '가로·세로·대각선으로 이어진 4칸이어야 해요.') : `${LINES[li].map(nm).join('-')} 줄을 낼까요?`;
        }
        $('cMsg').textContent = msg;
        $('cLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('') || '<span>—</span>';
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
