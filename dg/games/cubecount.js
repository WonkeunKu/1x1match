// 큐브 세기 (데블스플랜) — 회전하는 쌓기나무를 보고 큐브 개수를 맞히기. 오답이면 20초 동안 답할 수 없음
// 같은 파일을 서버(game-data/duel-rooms.mjs)와 화면에서 같이 씀
(function () {
  const rnd = n => Math.floor(Math.random() * n);
  const fail = m => { const e = new Error(m); e.duel = true; throw e; };
  const DIFF = [{ name: '쉬움', n: 3, h: 3 }, { name: '보통', n: 4, h: 4 }, { name: '어려움', n: 5, h: 5 }];
  const QN = 5, LOCK = 20000, QTIME = 150000, GAP = 3500;
  // 바닥부터 빈틈없이 쌓인 높이 지도 (계단·탑 모양이 섞이게)
  function makeMap(d) {
    const { n, h } = DIFF[d], m = [];
    const cx = rnd(n), cy = rnd(n);
    for (let y = 0; y < n; y++) { const row = []; for (let x = 0; x < n; x++) { const far = Math.abs(x - cx) + Math.abs(y - cy); let v = Math.max(0, h - far + rnd(3) - 1); if (Math.random() < .12) v = 0; row.push(Math.min(h, v)); } m.push(row); }
    if (m.flat().every(v => !v)) m[cy][cx] = h;
    return m;
  }
  const count = m => m.flat().reduce((a, b) => a + b, 0);
  // AI가 맞히는 시간(초)과 한 번 틀릴 확률
  const AI_T = [[28, 22], [16, 14], [8, 8]], AI_W = [.45, .22, .06];

  const MULTI = {
    seats: o => Math.max(1, Math.min(6, Number(o && o.n) || 4)),
    init(prev, o, seats) {
      const diff = [0, 1, 2].includes(Number(o && o.diff)) ? Number(o.diff) : 1, lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1;
      const S = { mid: Math.random().toString(36).slice(2, 9), diff, lv, solo: seats.length === 1, qi: -1, phase: 'gap', at: Date.now() + 3500, probs: Array.from({ length: QN }, () => makeMap(diff)),
        players: seats.map((x, i) => ({ id: i, name: x.name, bot: !!x.bot, pts: 0, time: 0, res: [], lock: 0, wrong: 0, done: false, aiAt: 0, aiWrong: false })), log: [], winner: -1 };
      return S;
    },
    startQ(S, now) {
      S.qi++; S.phase = 'q'; S.qStart = now; S.order = [];
      const n = DIFF[S.diff].n;
      for (const p of S.players) { p.lock = 0; p.wrong = 0; p.done = false; p.penalty = 0;
        if (p.bot) { const [a, b] = AI_T[S.lv]; p.aiAt = now + (a + Math.random() * b) * 1000 * (n / 4); p.aiWrong = Math.random() < AI_W[S.lv]; } }
    },
    endQ(S, now) {
      const ans = count(S.probs[S.qi]), n = S.players.length;
      for (const p of S.players) { const r = S.order.indexOf(p.id); p.res.push(r < 0 ? null : { rank: r + 1, t: p.doneAt - S.qStart + p.penalty });
        if (r >= 0) { p.pts += S.solo ? 1 : n - r; p.time += p.doneAt - S.qStart + p.penalty; } }
      S.log.push(`${S.qi + 1}번 정답 ${ans}개 · ${S.order.length ? S.order.map((id, k) => `${k + 1}위 ${S.players[id].name}`).join(', ') : '맞힌 사람 없음'}`);
      S.phase = S.qi >= QN - 1 ? 'over' : 'gap'; S.at = now + GAP; S.lastAns = ans;
      if (S.phase === 'over') { const best = Math.max(...S.players.map(p => p.pts)); const w = S.players.filter(p => p.pts === best).sort((a, b) => a.time - b.time); S.winner = w[0].id; }
    },
    act(S, seat, a, now = Date.now()) {
      const p = S.players[seat]; if (!p) fail('자리가 없어요.');
      if (a.type !== 'ans') fail('알 수 없는 행동이에요.');
      if (S.phase !== 'q') fail('지금은 답할 수 없어요.');
      if (p.done) fail('이미 맞혔어요.');
      if (p.lock > now) fail(`${Math.ceil((p.lock - now) / 1000)}초 뒤에 다시 답할 수 있어요.`);
      const v = Math.round(Number(a.v)); if (!Number.isFinite(v) || v < 0) fail('숫자를 입력하세요.');
      if (v === count(S.probs[S.qi])) { p.done = true; p.doneAt = now; S.order.push(seat); S.log.push(`${p.name} 정답!`); }
      else { p.wrong++; S.log.push(`${p.name} 오답 (${v})`);
        if (S.solo) { p.penalty += LOCK; if (p.wrong >= 3) { p.done = true; p.failed = true; } } else p.lock = now + LOCK; }
    },
    tick(S, now = Date.now()) {
      if (S.phase === 'over') return false;
      if (S.phase === 'gap') { if (now >= S.at) { MULTI.startQ(S, now); return true; } return false; }
      let ch = false;
      for (const p of S.players) if (p.bot && !p.done && now >= p.aiAt && now >= p.lock) {
        const ans = count(S.probs[S.qi]);
        if (p.aiWrong) { p.aiWrong = false; MULTI.act(S, p.id, { type: 'ans', v: ans + (Math.random() < .5 ? 1 : -1) * (1 + rnd(2)) }, now); p.aiAt = now + LOCK + 2000 + rnd(4000); }
        else MULTI.act(S, p.id, { type: 'ans', v: ans }, now);
        ch = true;
      }
      if (S.players.every(p => p.done) || now - S.qStart > QTIME) { MULTI.endQ(S, now); return true; }
      return ch;
    },
    view(S, seat) {
      const me = S.players[seat], showAns = S.phase !== 'q';
      return { mid: S.mid, me: seat, phase: S.phase, qi: S.qi, qn: QN, diff: S.diff, solo: S.solo, map: S.qi >= 0 ? S.probs[S.qi] : null, qLeft: S.phase === 'q' ? Math.max(0, QTIME - (Date.now() - S.qStart)) : 0, qStartAgo: S.phase === 'q' ? Date.now() - S.qStart : 0,
        ans: showAns && S.qi >= 0 ? S.lastAns : null, lockLeft: me && me.lock > Date.now() ? me.lock - Date.now() : 0, winner: S.winner, gapLeft: S.phase === 'gap' ? Math.max(0, S.at - Date.now()) : 0,
        players: S.players.map(p => ({ id: p.id, name: p.name, bot: p.bot, pts: p.pts, time: p.time, done: p.done, failed: !!p.failed, wrong: p.wrong, penalty: p.penalty || 0, rank: S.order ? S.order.indexOf(p.id) + 1 : 0, res: p.res })), log: S.log.slice(-30) };
    },
  };
  const ENG = { MULTI, DIFF, makeMap, count };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  const { h, esc } = LAB;
  // 회전하는 쌓기나무 그림 (y축 회전 + 위에서 내려다봄). 뒤에 있는 큐브부터 그림
  function drawCubes(svg, m, ang) {
    const n = m.length, c = (n - 1) / 2, cs = Math.cos(ang), sn = Math.sin(ang), S = 26, K = .62, Z = .82;
    const P = (x, y, z) => { const X = (x - c) * cs - (y - c) * sn, Y = (x - c) * sn + (y - c) * cs; return [X * S, Y * S * K - z * S * Z, Y]; };
    const cubes = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) for (let z = 0; z < m[y][x]; z++) cubes.push([x, y, z, P(x + .5, y + .5, 0)[2]]);
    cubes.sort((a, b) => a[3] - b[3] || a[2] - b[2]);
    const faces = [[[1, 0], [1, 1]], [[0, 1], [1, 1]], [[0, 0], [0, 1]], [[0, 0], [1, 0]]]; // +x, +y, -x, -y 쪽 옆면
    const nrm = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    let out = '';
    const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}"/>`;
    for (const [x, y, z] of cubes) {
      for (let f = 0; f < 4; f++) { const [nx, ny] = nrm[f], vy = nx * sn + ny * cs; if (vy <= 0.001) continue;
        const [[ax, ay], [bx, by]] = faces[f]; out += poly([P(x + ax, y + ay, z), P(x + bx, y + by, z), P(x + bx, y + by, z + 1), P(x + ax, y + ay, z + 1)], vy > .7 ? 'cf1' : 'cf2'); }
      out += poly([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], 'ct');
    }
    const r = n * S * .8 + 10;
    svg.setAttribute('viewBox', `${-r} ${-r * .55 - n * S * Z * .55} ${2 * r} ${r * 1.25 + n * S * Z * .3}`);
    svg.innerHTML = out;
  }

  LAB.add({
    id: 'cubecount', name: '큐브 세기', show: '데블스플랜',
    rules: `<ul>
      <li>회전하는 쌓기나무를 보고 <b>큐브가 모두 몇 개인지</b> 맞히는 게임이에요.</li>
      <li>보이지 않는 곳도 <b>바닥까지 큐브가 쌓여 있어요.</b> 속이 빈 곳은 없어요.</li>
      <li>답이 틀리면 <b>20초 동안</b> 다시 답할 수 없어요. (혼자 하기는 20초가 기록에 더해지고, 한 문제에서 3번 틀리면 그 문제는 실패예요.)</li>
      <li>모두 맞히면 다음 문제로 넘어가요. 먼저 맞힌 순서대로 점수를 받아요(인원이 n명이면 1등 n점, 2등 n-1점…).</li>
      <li>5문제 점수를 더해 순위를 정해요. 같으면 걸린 시간이 짧은 쪽이 위예요.</li>
      <li>난이도: 쉬움 3×3, 보통 4×4, 어려움 5×5 판.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers(); LAB.paused = false;
      let lastRoom = null, pend = { n: 4, lv: 1, diff: 1, opp: 'ai' }, S = null, net = null, V = null, recvAt = 0, busy = false, ended = false, ang = 0, raf = 0, lastQ = -1, shownMid = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap"><div class="g-main card">
        <div class="dn-lobby" id="ccLobby" hidden></div>
        <div id="ccGame" hidden>
          <div class="qz-top"><span id="ccQ"></span><b class="qz-time" id="ccTime"></b><span id="ccDiff"></span></div>
          <div class="qz-stage"><svg id="ccSvg" class="cc-svg" aria-label="회전하는 쌓기나무"></svg><div class="qz-cover" id="ccCover" hidden></div></div>
          <form class="qz-ans" id="ccForm"><input id="ccIn" type="number" inputmode="numeric" min="0" placeholder="큐브 개수" autocomplete="off"><button type="submit" class="primary">제출</button></form>
          <p class="g-msg" id="ccMsg"></p>
          <div class="qz-players" id="ccPl"></div>
          <div id="ccAgain"></div>
        </div></div>
        <aside class="g-side"><div class="card"><h3>진행 기록</h3><div class="log" id="ccLog"></div></div></aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const N_OPTS = { key: 'n', label: '인원', opts: [[2, '2인'], [3, '3인'], [4, '4인'], [5, '5인'], [6, '6인']], def: 4 }, D_OPTS = { key: 'diff', label: '난이도', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 }, L_OPTS = { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 };
      const front = LAB.duelFront({ el: $('ccLobby'), gameEl: $('ccGame'), friendLabel: '친구와 하기 (2~6인, 빈자리는 AI)', soloLabel: 'AI와 경주', alone: { label: '혼자 하기', desc: '5문제를 빠르고 정확하게 맞혀요. 오답마다 20초가 더해지고, 한 문제에서 3번 틀리면 실패예요.' },
        soloOpts: [{ ...N_OPTS, label: '인원 (나 + AI)' }, D_OPTS, L_OPTS], roomOpts: [N_OPTS, D_OPTS, L_OPTS], onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T.clear(); cancelAnimationFrame(raf); if (net) { net.close(); net = null; } S = null; V = null; ended = false; lastQ = -1; shownMid = null; $('ccLog').innerHTML = ''; }
      function start() {
        reset();
        if (pend.opp === 'net') { net = LAB.duel('cubecount', { front, el: $('ccLobby'), opts: () => ({ n: pend.n, lv: pend.lv, diff: pend.diff }), onView: v => { lastRoom = v; if (!v.st) return; recvAt = Date.now(); show(v.st); }, onError: m => { $('ccMsg').textContent = m; } }); net.start(); }
        else {
          const n = pend.opp === 'alone' ? 1 : pend.n;
          const seats = [{ name: '나' }, ...['AI 1', 'AI 2', 'AI 3', 'AI 4', 'AI 5'].slice(0, n - 1).map(name => ({ name, bot: true }))];
          S = MULTI.init(null, { lv: pend.lv, diff: pend.diff }, seats); S.at = Date.now() + 600;
          front.solo(pend.opp === 'alone' ? `혼자 하기 · ${DIFF[pend.diff].name}` : `AI와 경주 · ${n}인 · ${DIFF[pend.diff].name}`);
          local(); T.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 150);
        }
        T.every(paint, 200); spin();
      }
      function local() { recvAt = Date.now(); show(MULTI.view(S, 0)); }
      async function send(a) { if (busy) return; if (net) { busy = true; const er = await net.act(a); busy = false; if (er) $('ccMsg').textContent = er; return; } try { MULTI.act(S, 0, a); } catch (e) { $('ccMsg').textContent = e.message; } local(); }
      $('ccForm').addEventListener('submit', e => { e.preventDefault(); const v = $('ccIn').value; if (v === '') return; send({ type: 'ans', v: +v }); $('ccIn').value = ''; });
      wrap.addEventListener('click', e => { if (e.target.closest('[data-again]')) send({ type: 'again' }); });
      function spin() { cancelAnimationFrame(raf); let t0 = performance.now(); const fr = t => { if (V && V.map && V.phase === 'q') { ang += (t - t0) / 1000 * (Math.PI * 2 / 14); drawCubes($('ccSvg'), V.map, ang); } t0 = t; raf = requestAnimationFrame(fr); }; raf = requestAnimationFrame(fr); }
      const fmt = ms => { const s = ms / 1000; return s < 60 ? s.toFixed(1) + '초' : Math.floor(s / 60) + '분 ' + Math.round(s % 60) + '초'; };
      function paint() {
        if (!V) return; const ago = Date.now() - recvAt;
        if (V.phase === 'q') { $('ccTime').textContent = fmt(V.qStartAgo + ago + (V.players[V.me].penalty || 0)); const lk = Math.max(0, V.lockLeft - ago); $('ccIn').disabled = lk > 0 || V.players[V.me].done; $('ccIn').placeholder = lk > 0 ? `${Math.ceil(lk / 1000)}초 뒤에 다시 답할 수 있어요` : V.players[V.me].done ? '맞혔어요! 다른 사람을 기다리는 중' : '큐브 개수'; }
        else if (V.phase === 'gap') $('ccTime').textContent = V.qi < 0 ? '' : `다음 문제 ${Math.ceil(Math.max(0, V.gapLeft - ago) / 1000)}`;
      }
      function show(v) {
        V = v; const me = v.players[v.me];
        if (v.mid !== shownMid) { shownMid = v.mid; lastQ = -1; }
        if (v.qi !== lastQ && v.phase === 'q') { lastQ = v.qi; ang = Math.random() * 6; if (window.GameFX && v.qi > 0) GameFX.banner(`문제 ${v.qi + 1}`, `${DIFF[v.diff].name} · ${v.qn}문제 중`); }
        $('ccQ').textContent = v.qi < 0 ? '곧 시작해요' : `${Math.min(v.qi + 1, v.qn)} / ${v.qn}`; $('ccDiff').textContent = DIFF[v.diff].name;
        const cover = $('ccCover'); cover.hidden = v.phase === 'q';
        if (v.phase !== 'q' && v.map) { drawCubes($('ccSvg'), v.map, ang); cover.innerHTML = v.ans != null ? `<div>정답 <b>${v.ans}</b>개</div>` : ''; }
        $('ccForm').hidden = v.phase !== 'q';
        $('ccMsg').textContent = v.phase === 'q' ? (me.done ? (me.failed ? '3번 틀려서 이 문제는 실패예요' : `${me.rank}등으로 맞혔어요!`) : '큐브 개수를 입력하세요') : v.phase === 'over' ? '게임 끝' : '';
        const sorted = v.players.slice().sort((a, b) => b.pts - a.pts || a.time - b.time);
        $('ccPl').innerHTML = sorted.map(p => `<div class="qz-p ${p.id === v.me ? 'me' : ''} ${p.done ? 'ok' : ''}"><span class="nm">${esc(p.id === v.me ? '나' : p.name)}</span><span class="st">${v.phase === 'q' ? (p.done ? (p.failed ? '실패' : `${p.rank}등 ✓`) : p.wrong ? `오답 ${p.wrong}` : '푸는 중') : ''}</span><b>${v.solo ? fmt(p.time) : p.pts + '점'}</b></div>`).join('');
        $('ccLog').innerHTML = v.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('ccAgain').innerHTML = v.phase === 'over' && net ? LAB.againHtml(lastRoom, v.me) : '';
        if (v.phase === 'over' && !ended) { ended = true; const rk = sorted.findIndex(p => p.id === v.me) + 1, solvedN = me.res.filter(Boolean).length;
          T.set(() => LAB.end(v.solo ? `${solvedN}/${v.qn} 문제` : `${rk}위`, v.solo ? `걸린 시간 ${fmt(me.time)} (오답 시간 포함)` : `${me.pts}점 · ${v.players.length}명 중 ${rk}위`, net ? null : start), 1500); }
      }
      if (LAB.roomParam()) { pend.opp = 'net'; start(); } else front.menu();
    },
  });
})();
