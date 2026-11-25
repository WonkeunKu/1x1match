// 정글 메이즈 (피의 게임2 데스매치) — 미로 타일을 밀어 넣어 길을 바꾸고, 목표물 4개를 돌아 출발점으로
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const N = 7, NN = 1, EE = 2, SS = 4, WW = 8;
  const rot = m => ((m << 1) | (m >> 3)) & 15; // 시계 방향 90도
  const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  const SYM = [['★', '#f3b641', '별'], ['◆', '#6fc4ea', '다이아'], ['●', '#e8604a', '해'], ['☾', '#b8a6f2', '달']];
  const START = [6 * N + 0, 0 * N + 6]; // 나: 왼쪽 아래, AI: 오른쪽 위
  // 밀어 넣는 자리 12곳: {line:'r'|'c', idx, dir:+1(왼쪽/위에서) | -1(오른쪽/아래에서)}
  const PUSHES = []; for (const idx of [1, 3, 5]) { PUSHES.push({ line: 'r', idx, dir: 1 }, { line: 'r', idx, dir: -1 }, { line: 'c', idx, dir: 1 }, { line: 'c', idx, dir: -1 }); }
  function newBoard() {
    const t = Array(N * N).fill(null);
    const fixed = { 0: EE | SS, 6: SS | WW, 42: NN | EE, 48: NN | WW, 2: EE | SS | WW, 4: EE | SS | WW, 44: NN | EE | WW, 46: NN | EE | WW, 14: NN | EE | SS, 28: NN | EE | SS, 20: NN | SS | WW, 34: NN | SS | WW, 16: NN | EE | SS, 18: EE | SS | WW, 30: NN | EE | WW, 32: NN | SS | WW };
    for (const k in fixed) t[k] = { m: fixed[k], fixed: true, sym: -1 };
    const bag = shuffle([...Array(12).fill(NN | SS), ...Array(16).fill(NN | EE), ...Array(6).fill(NN | EE | SS)].map(m => { let x = m; for (let r = rnd(4); r > 0; r--) x = rot(x); return { m: x, fixed: false, sym: -1 }; }));
    // 목표물 4개는 움직이는 타일에
    shuffle([...Array(34).keys()]).slice(0, 4).forEach((k, s) => bag[k].sym = s);
    let k = 0; for (let i = 0; i < N * N; i++) if (!t[i]) t[i] = bag[k++];
    return { t, spare: bag[k] };
  }
  const lineCells = p => Array.from({ length: N }, (_, k) => p.line === 'r' ? p.idx * N + k : k * N + p.idx);
  function doPush(st, p) { // st:{t,spare,pos:[a,b]} 변경
    const cells = lineCells(p); const ord = p.dir === 1 ? cells : cells.slice().reverse();
    const out = st.t[ord[N - 1]];
    for (let k = N - 1; k > 0; k--) st.t[ord[k]] = st.t[ord[k - 1]];
    st.t[ord[0]] = st.spare; st.spare = out;
    st.pos = st.pos.map(x => { const k = ord.indexOf(x); if (k < 0) return x; return k === N - 1 ? ord[0] : ord[k + 1]; });
  }
  function reach(t, from) {
    const seen = new Set([from]), q = [from];
    while (q.length) { const i = q.shift(), r = Math.floor(i / N), c = i % N, m = t[i].m;
      for (const [bit, dr, dc] of [[NN, -1, 0], [EE, 0, 1], [SS, 1, 0], [WW, 0, -1]]) { if (!(m & bit)) continue; const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue; const j = nr * N + nc; if (seen.has(j) || !(t[j].m & OPP[bit])) continue; seen.add(j); q.push(j); } }
    return seen;
  }
  const isReverse = (p, last) => last && p.line === last.line && p.idx === last.idx && p.dir === -last.dir;
  const dist = (a, b) => Math.abs(Math.floor(a / N) - Math.floor(b / N)) + Math.abs(a % N - b % N);

  LAB.add({
    id: 'jungle', name: '정글 메이즈', show: '피의 게임',
    rules: `<ul>
      <li>7×7 미로 판. 고정 타일 16개, 움직이는 타일 33개, 그리고 손에 든 여분 타일 1개로 시작해요.</li>
      <li>내 차례에는 ① 여분 타일을 (원하면 돌려서) 판 가장자리 화살표 자리로 <b>밀어 넣어</b> 미로를 바꾸고, ② 길이 이어진 곳이면 어디든 말을 옮겨요(안 옮겨도 돼요).</li>
      <li>바로 전에 밀려 나온 자리로 곧장 되밀어 넣을 수는 없어요. 밀려 나간 말은 반대쪽 끝으로 넘어와요.</li>
      <li>목표물 4개(별·다이아·해·달)는 같지만 <b>찾는 순서가 사람마다 달라요</b>. 4개를 순서대로 밟은 뒤 내 출발점으로 먼저 돌아오면 이겨요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { lv: 1 }, cfg = { ...pend }, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나 (초록)</small><b id="jgMe"></b></div><div class="dp-mid"><span id="jgTurn"></span><small id="jgSub"></small></div><div><small>AI (주황)</small><b id="jgAi"></b></div></div>
          <svg class="jg-board" id="jgB" viewBox="-60 -60 820 820"></svg>
          <div class="jg-spare"><span class="muted">여분 타일</span><svg id="jgSpare" viewBox="0 0 100 100" width="64" height="64"></svg><button type="button" id="jgRot">↻ 돌리기</button><button type="button" id="jgStay">이동 안 함</button></div>
          <p class="g-msg" id="jgMsg"></p>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정</h3><div class="opt"><span>AI 난이도</span><div id="jgLv"></div></div><button type="button" class="primary" id="jgNew">새 게임</button></div>
          <div class="card"><h3>기록</h3><div class="log" id="jgLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('jgLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('jgNew').onclick = start;
      $('jgRot').onclick = () => { if (G && G.turn === 0 && G.phase === 'push') { G.spare.m = rot(G.spare.m); render(); } };
      $('jgStay').onclick = () => { if (G && G.turn === 0 && G.phase === 'move') endMove(G.pos[0]); };
      const who = p => p ? 'AI' : '나';
      function start() {
        T.clear(); cfg = { ...pend };
        const b = newBoard();
        G = { t: b.t, spare: b.spare, pos: START.slice(), order: [shuffle([0, 1, 2, 3]), shuffle([0, 1, 2, 3])], got: [0, 0], turn: rnd(2), phase: 'push', last: null, log: [], over: false };
        LAB.coin(['나', 'AI'], G.turn);
        G.log.push(`선: ${who(G.turn)}`); render(); aiMaybe();
      }
      const targetCell = p => { if (G.got[p] >= 4) return START[p]; const s = G.order[p][G.got[p]]; const i = G.t.findIndex(x => x.sym === s); return i; }; // -1이면 여분 타일에 있음
      function push(p) {
        if (isReverse(p, G.last)) return;
        doPush(G, p); G.last = p;
        G.log.push(`${who(G.turn)}: ${p.line === 'r' ? (p.idx + 1) + '행' : (p.idx + 1) + '열'} ${p.dir === 1 ? (p.line === 'r' ? '왼쪽' : '위쪽') : (p.line === 'r' ? '오른쪽' : '아래쪽')}에서 밀어 넣기`);
        G.phase = 'move'; render();
      }
      function endMove(to) {
        const p = G.turn; G.pos[p] = to;
        const tg = targetCell(p);
        if (tg === to) {
          if (G.got[p] >= 4) { G.over = true; G.log.push(`${who(p)}: 출발점 도착!`); render(); return T.set(() => LAB.end(p === 0 ? '승리' : '패배', `${who(p)}가 목표물 4개를 모으고 먼저 돌아왔어요`, start), 500); }
          G.log.push(`${who(p)}: ${SYM[G.order[p][G.got[p]]][2]} 획득 (${G.got[p] + 1}/4)`); G.got[p]++;
        }
        G.turns = (G.turns || 0) + 1;
        if (G.turns >= 200) { G.over = true; render(); return LAB.end('무승부', '100번씩 두도록 승부가 나지 않았어요', start); }
        G.turn = 1 - p; G.phase = 'push'; render(); aiMaybe();
      }
      function aiMaybe() {
        if (G.over || G.turn !== 1) return;
        G.busy = true; render();
        T.set(() => {
          const lv = cfg.lv; let best = null, bv = -1e9;
          const look = [.45, .8, 1][lv]; // 쉬움·보통은 일부 수만 살펴봄
          for (const p of PUSHES) {
            if (isReverse(p, G.last)) continue;
            if (best && Math.random() > look) continue;
            let m = G.spare.m;
            for (let r = 0; r < 4; r++, m = rot(m)) {
              const st = { t: G.t.slice(), spare: { ...G.spare, m }, pos: G.pos.slice() };
              doPush(st, p);
              const R = reach(st.t, st.pos[1]);
              const tgSym = G.got[1] < 4 ? G.order[1][G.got[1]] : -2;
              const tg = tgSym === -2 ? START[1] : st.t.findIndex(x => x.sym === tgSym);
              let v, dest = st.pos[1];
              if (tg >= 0 && R.has(tg)) { v = 100; dest = tg; }
              else { let md = 99; for (const c of R) { const d = tg >= 0 ? dist(c, tg) : 6; if (d < md) { md = d; dest = c; } } v = -md * 3 + R.size * .05; }
              if (lv === 2) { // 상대 목표를 막는 쪽도 조금 고려
                const oS = G.got[0] < 4 ? G.order[0][G.got[0]] : -2, oT = oS === -2 ? START[0] : st.t.findIndex(x => x.sym === oS);
                if (oT >= 0 && reach(st.t, st.pos[0]).has(oT)) v -= 8;
              }
              v += (Math.random() - .5) * (lv === 0 ? 12 : lv === 1 ? 3 : .5);
              if (v > bv) { bv = v; best = { p, m, dest }; }
            }
          }
          G.spare.m = best.m; push(best.p);
          T.set(() => { G.busy = false; endMove(reach(G.t, G.pos[1]).has(best.dest) ? best.dest : G.pos[1]); }, 900);
        }, 900);
      }
      const S = 100;
      function tileSvg(m, x, y, fixed) {
        let s = `<rect x="${x + 2}" y="${y + 2}" width="${S - 4}" height="${S - 4}" rx="10" class="jg-t ${fixed ? 'fx' : ''}"/>`;
        const cx = x + S / 2, cy = y + S / 2, w = 26;
        s += `<rect x="${cx - w / 2}" y="${cy - w / 2}" width="${w}" height="${w}" class="jg-path"/>`;
        if (m & NN) s += `<rect x="${cx - w / 2}" y="${y + 2}" width="${w}" height="${S / 2}" class="jg-path"/>`;
        if (m & SS) s += `<rect x="${cx - w / 2}" y="${cy}" width="${w}" height="${S / 2 - 2}" class="jg-path"/>`;
        if (m & WW) s += `<rect x="${x + 2}" y="${cy - w / 2}" width="${S / 2}" height="${w}" class="jg-path"/>`;
        if (m & EE) s += `<rect x="${cx}" y="${cy - w / 2}" width="${S / 2 - 2}" height="${w}" class="jg-path"/>`;
        return s;
      }
      function render() {
        const prog = p => G.order[p].map((s, k) => `<span class="jg-sym ${k < G.got[p] ? 'done' : k === G.got[p] && p === 0 ? 'now' : ''}" style="color:${SYM[s][1]}">${p === 1 && k >= G.got[p] && !G.over ? '?' : SYM[s][0]}</span>`).join('') + `<span class="jg-sym ${G.got[p] >= 4 ? 'now' : ''}">⌂</span>`;
        $('jgMe').innerHTML = prog(0); $('jgAi').innerHTML = prog(1);
        $('jgTurn').textContent = G.over ? '게임 끝' : `${who(G.turn)} 차례`;
        const tg = G.got[0] < 4 ? SYM[G.order[0][G.got[0]]] : null;
        $('jgSub').textContent = tg ? `내 다음 목표: ${tg[2]} ${tg[0]}` : '내 다음 목표: 출발점으로 돌아가기';
        const myPush = !G.over && !G.busy && G.turn === 0 && G.phase === 'push', myMove = !G.over && !G.busy && G.turn === 0 && G.phase === 'move';
        const R = myMove ? reach(G.t, G.pos[0]) : new Set();
        let s = '';
        for (let i = 0; i < N * N; i++) { const r = Math.floor(i / N), c = i % N, x = c * S, y = r * S, t = G.t[i];
          s += tileSvg(t.m, x, y, t.fixed);
          if (t.sym >= 0) s += `<text x="${x + S / 2}" y="${y + S / 2 + 11}" class="jg-st" fill="${SYM[t.sym][1]}">${SYM[t.sym][0]}</text>`;
          if (i === START[0] || i === START[1]) s += `<circle cx="${x + 16}" cy="${y + 16}" r="8" class="jg-home h${i === START[0] ? 0 : 1}"/>`;
          if (R.has(i)) s += `<rect x="${x + 6}" y="${y + 6}" width="${S - 12}" height="${S - 12}" rx="8" class="jg-reach" data-cell="${i}"/>`;
        }
        for (const p of [0, 1]) { const i = G.pos[p], x = (i % N) * S, y = Math.floor(i / N) * S; s += `<circle cx="${x + S / 2 + (p ? 14 : -14)}" cy="${y + S / 2 + (p ? 14 : -14)}" r="17" class="jg-pc p${p}"/>`; }
        PUSHES.forEach((p, k) => {
          if (isReverse(p, G.last)) return;
          let x, y, a; if (p.line === 'r') { y = p.idx * S + S / 2; x = p.dir === 1 ? -32 : N * S + 32; a = p.dir === 1 ? 0 : 180; } else { x = p.idx * S + S / 2; y = p.dir === 1 ? -32 : N * S + 32; a = p.dir === 1 ? 90 : 270; }
          s += `<g transform="translate(${x} ${y}) rotate(${a})" class="jg-arrow ${myPush ? 'can' : ''}" data-push="${k}"><circle r="24"/><path d="M-9 -11 L11 0 L-9 11z"/></g>`;
        });
        $('jgB').innerHTML = s;
        $('jgSpare').innerHTML = tileSvg(G.spare.m, 0, 0, false) + (G.spare.sym >= 0 ? `<text x="50" y="61" class="jg-st" fill="${SYM[G.spare.sym][1]}">${SYM[G.spare.sym][0]}</text>` : '');
        $('jgRot').disabled = !myPush; $('jgStay').disabled = !myMove;
        $('jgMsg').textContent = G.over ? '게임 끝' : G.busy ? 'AI 생각 중…' : myPush ? '여분 타일을 돌려 맞춘 뒤, 넣을 화살표를 누르세요' : myMove ? '밝게 표시된 칸 중 갈 곳을 누르세요 (안 옮겨도 돼요)' : '';
        $('jgLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      $('jgB').addEventListener('click', e => {
        if (!G || G.over || G.busy || G.turn !== 0) return;
        const a = e.target.closest('[data-push]'); if (a && G.phase === 'push') return push(PUSHES[+a.dataset.push]);
        const c = e.target.closest('[data-cell]'); if (c && G.phase === 'move') return endMove(+c.dataset.cell);
      });
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
