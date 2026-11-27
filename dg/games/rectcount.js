// 네모세기 (데블스플랜 시즌3) — 숫자판에서 안의 수를 더해 타깃이 되는 네모(직사각형)가 몇 개인지 세기
// 혼자 하기: 5문제, 오답마다 30초 추가, 한 문제에서 3번 틀리면 실패. 대결: 버저를 누른 사람만 10초 안에 답함
(function () {
  const rnd = n => Math.floor(Math.random() * n);
  const fail = m => { const e = new Error(m); e.duel = true; throw e; };
  const DIFF = [{ name: '쉬움', w: 3, h: 3 }, { name: '보통', w: 4, h: 4 }, { name: '어려움', w: 5, h: 5 }];
  const QN = 5, BUZZ = 10000, QTIME = 120000, GAP = 3500, PEN = 30000, GOAL = 3, MAXQ = 9;
  // 판: cells[y][x] = 숫자(빈칸은 0) 또는 null(판 밖). 네모는 판 밖 칸을 포함하면 안 됨
  function rects(b) {
    const H = b.length, W = b[0].length, out = [];
    for (let y0 = 0; y0 < H; y0++) for (let x0 = 0; x0 < W; x0++) for (let y1 = y0; y1 < H; y1++) for (let x1 = x0; x1 < W; x1++) {
      let s = 0, ok = true;
      for (let y = y0; y <= y1 && ok; y++) for (let x = x0; x <= x1; x++) { const v = b[y][x]; if (v == null) { ok = false; break; } s += v; }
      if (ok) out.push({ x0, y0, x1, y1, s });
    }
    return out;
  }
  function makeProb(d) {
    const { w, h } = DIFF[d];
    for (let tries = 0; tries < 200; tries++) {
      const b = Array.from({ length: h }, () => Array.from({ length: w }, () => Math.random() < .14 ? 0 : 1 + rnd(9)));
      // 어려움은 판 모양이 들쭉날쭉하게 (모서리 몇 칸을 판 밖으로)
      if (d >= 1) for (let k = 0; k < d; k++) { const y = rnd(2) ? 0 : h - 1, x = rnd(2) ? 0 : w - 1; b[y][x] = null; }
      const rs = rects(b), cnt = {};
      for (const r of rs) if (r.s >= 5) cnt[r.s] = (cnt[r.s] || 0) + 1;
      const good = Object.entries(cnt).filter(([, c]) => c >= 2 + d && c <= 5 + d * 2);
      if (!good.length) continue;
      const [t, c] = good[rnd(good.length)];
      return { b, target: +t, ans: c };
    }
    return { b: [[1, 2], [3, 4]], target: 3, ans: 2 };
  }
  const AI_T = [[30, 25], [18, 15], [9, 8]], AI_OK = [.65, .85, .96];

  const MULTI = {
    seats: o => Math.max(1, Math.min(8, Number(o && o.n) || 4)),
    init(prev, o, seats) {
      const diff = [0, 1, 2].includes(Number(o && o.diff)) ? Number(o.diff) : 1, lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1;
      return { mid: Math.random().toString(36).slice(2, 9), diff, lv, solo: seats.length === 1, qi: -1, phase: 'gap', at: Date.now() + 3500, prob: null, buzz: null, winner: -1, last: null,
        players: seats.map((x, i) => ({ id: i, name: x.name, bot: !!x.bot, pts: 0, time: 0, out: false, wrong: 0, pen: 0, aiAt: 0, failed: 0 })), log: [] };
    },
    startQ(S, now) {
      S.qi++; S.phase = 'q'; S.qStart = now; S.prob = makeProb(S.diff); S.buzz = null; S.last = null;
      for (const p of S.players) { p.out = false; p.wrong = 0; p.pen = 0; if (p.bot) { const [a, b] = AI_T[S.lv]; p.aiAt = now + (a + Math.random() * b) * 1000 * (1 + S.diff * .35); } }
    },
    endQ(S, now, who) {
      const ans = S.prob.ans;
      if (S.solo) { const p = S.players[0]; if (who === 0) { p.pts++; p.time += now - S.qStart + p.pen; } else { p.failed++; p.time += now - S.qStart + p.pen; } }
      else if (who != null) S.players[who].pts++;
      S.log.push(`${S.qi + 1}번 정답 ${ans}개 · ${who != null ? (S.solo ? '맞힘' : S.players[who].name + ' +1점') : (S.solo ? '실패' : '아무도 못 맞힘')}`);
      S.last = { ans, who }; S.buzz = null;
      const done = S.solo ? S.qi >= QN - 1 : (S.players.some(p => p.pts >= GOAL) || S.qi >= MAXQ - 1);
      S.phase = done ? 'over' : 'gap'; S.at = now + GAP;
      if (done) { const best = Math.max(...S.players.map(p => p.pts)); S.winner = S.players.find(p => p.pts === best).id; }
    },
    act(S, seat, a, now = Date.now()) {
      const p = S.players[seat]; if (!p) fail('자리가 없어요.');
      if (S.phase !== 'q') fail('지금은 답할 수 없어요.');
      if (a.type === 'buzz') {
        if (S.solo) return;
        if (p.out) fail('이 문제는 이미 틀려서 답할 수 없어요.');
        if (S.buzz) fail('다른 사람이 답하는 중이에요.');
        S.buzz = { id: seat, until: now + BUZZ }; S.log.push(`${p.name} 버저!`); return;
      }
      if (a.type !== 'ans') fail('알 수 없는 행동이에요.');
      if (!S.solo && (!S.buzz || S.buzz.id !== seat)) fail('먼저 버저를 누르세요.');
      const v = Math.round(Number(a.v)); if (!Number.isFinite(v) || v < 0) fail('숫자를 입력하세요.');
      S.last = { said: v, by: seat };
      if (v === S.prob.ans) { S.log.push(`${p.name}: ${v}개 → 정답!`); MULTI.endQ(S, now, seat); return; }
      S.log.push(`${p.name}: ${v}개 → 오답`); p.wrong++;
      if (S.solo) { p.pen += PEN; if (p.wrong >= 3) MULTI.endQ(S, now, null); return; }
      p.out = true; S.buzz = null;
      if (S.players.every(x => x.out)) MULTI.endQ(S, now, null);
    },
    tick(S, now = Date.now()) {
      if (S.phase === 'over') return false;
      if (S.phase === 'gap') { if (now >= S.at) { MULTI.startQ(S, now); return true; } return false; }
      if (S.buzz && now >= S.buzz.until) { const p = S.players[S.buzz.id]; p.out = true; S.log.push(`${p.name}: 시간 초과`); S.buzz = null; if (S.players.every(x => x.out)) MULTI.endQ(S, now, null); return true; }
      if (!S.buzz) for (const p of S.players) if (p.bot && !p.out && now >= p.aiAt) {
        MULTI.act(S, p.id, { type: 'buzz' }, now); const ok = Math.random() < AI_OK[S.lv];
        S.aiAns = { id: p.id, at: now + 1500 + rnd(2500), v: ok ? S.prob.ans : Math.max(0, S.prob.ans + (rnd(2) ? 1 : -1) * (1 + rnd(2))) }; return true;
      }
      if (S.buzz && S.aiAns && S.aiAns.id === S.buzz.id && now >= S.aiAns.at) { const x = S.aiAns; S.aiAns = null; MULTI.act(S, x.id, { type: 'ans', v: x.v }, now); return true; }
      if (now - S.qStart > QTIME) { MULTI.endQ(S, now, null); return true; }
      return false;
    },
    view(S, seat) {
      const now = Date.now();
      return { mid: S.mid, me: seat, phase: S.phase, qi: S.qi, qn: S.solo ? QN : MAXQ, goal: GOAL, diff: S.diff, solo: S.solo, board: S.prob ? S.prob.b : null, target: S.prob ? S.prob.target : null,
        ago: S.phase === 'q' ? now - S.qStart : 0, buzz: S.buzz ? { id: S.buzz.id, left: Math.max(0, S.buzz.until - now) } : null, last: S.last, gapLeft: S.phase === 'gap' ? Math.max(0, S.at - now) : 0, winner: S.winner,
        players: S.players.map(p => ({ id: p.id, name: p.name, bot: p.bot, pts: p.pts, time: p.time, out: p.out, wrong: p.wrong, pen: p.pen, failed: p.failed })), log: S.log.slice(-30) };
    },
  };
  const ENG = { MULTI, DIFF, rects, makeProb };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  const { h, esc } = LAB;
  LAB.add({
    id: 'rectcount', name: '네모세기', show: '데블스플랜',
    rules: `<ul>
      <li>문제가 열리면 숫자판과 <b>타깃 넘버</b>가 공개돼요.</li>
      <li>안의 숫자를 더해 <b>타깃 넘버가 되는 네모(직사각형)</b>가 몇 개인지 세요. 빈칸이 들어가도 돼요(0으로 쳐요). 판 밖으로 나가는 네모는 안 돼요.</li>
      <li>칸 두 개를 차례로 누르면 그 네모가 표시되고 합이 보여요. 센 네모를 표시해 두면 헷갈리지 않아요.</li>
      <li><b>대결</b>: 버저를 누른 사람만 <b>10초 안에</b> 답할 수 있어요. 오답이면 그 문제는 다시 답할 수 없어요. 맞히면 1점, <b>3점</b>을 먼저 얻으면 승리.</li>
      <li><b>혼자 하기</b>: 5문제를 빠르고 정확하게. 오답마다 <b>30초</b>가 더해지고, 한 문제에서 3번 틀리면 그 문제는 실패예요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers(); LAB.paused = false;
      let lastRoom = null, pend = { n: 4, lv: 1, diff: 1, opp: 'ai' }, S = null, net = null, V = null, recvAt = 0, busy = false, ended = false, shownMid = null, lastQ = -1, marks = [], pick = null, typed = '';
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap"><div class="g-main card">
        <div class="dn-lobby" id="rcLobby" hidden></div>
        <div id="rcGame" hidden>
          <div class="qz-top"><span id="rcQ"></span><b class="qz-time" id="rcTime"></b><span id="rcLives"></span></div>
          <div class="rc-target"><small>타깃</small><b id="rcT">?</b></div>
          <div class="qz-stage"><div class="rc-board" id="rcB"></div><div class="qz-cover" id="rcCover" hidden></div></div>
          <div class="rc-tools"><span id="rcMk">표시 0개</span><button type="button" data-a="undo">되돌리기</button><button type="button" data-a="clear">전체 지우기</button></div>
          <div class="rc-act" id="rcAct"></div>
          <p class="g-msg" id="rcMsg"></p>
          <div class="qz-players" id="rcPl"></div>
          <div id="rcAgain"></div>
        </div></div>
        <aside class="g-side"><div class="card"><h3>진행 기록</h3><div class="log" id="rcLog"></div></div></aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const N_OPTS = { key: 'n', label: '인원', opts: [[2, '2인'], [3, '3인'], [4, '4인'], [6, '6인'], [8, '8인']], def: 4 }, D_OPTS = { key: 'diff', label: '난이도', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 }, L_OPTS = { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 };
      const front = LAB.duelFront({ el: $('rcLobby'), gameEl: $('rcGame'), friendLabel: '친구와 버저 대결 (2~8인, 빈자리는 AI)', soloLabel: 'AI와 버저 대결', alone: { label: '혼자 하기', desc: '5문제를 빠르고 정확하게. 오답마다 30초가 더해지고, 한 문제에서 3번 틀리면 실패예요.' },
        soloOpts: [{ ...N_OPTS, label: '인원 (나 + AI)' }, D_OPTS, L_OPTS], roomOpts: [N_OPTS, D_OPTS, L_OPTS], onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T.clear(); if (net) { net.close(); net = null; } S = null; V = null; ended = false; shownMid = null; lastQ = -1; marks = []; pick = null; typed = ''; $('rcLog').innerHTML = ''; }
      function start() {
        reset();
        if (pend.opp === 'net') { net = LAB.duel('rectcount', { front, el: $('rcLobby'), opts: () => ({ n: pend.n, lv: pend.lv, diff: pend.diff }), onView: v => { lastRoom = v; if (!v.st) return; recvAt = Date.now(); show(v.st); }, onError: m => { $('rcMsg').textContent = m; } }); net.start(); }
        else {
          const n = pend.opp === 'alone' ? 1 : pend.n;
          const seats = [{ name: '나' }, ...Array.from({ length: n - 1 }, (_, k) => ({ name: 'AI ' + (k + 1), bot: true }))];
          S = MULTI.init(null, { lv: pend.lv, diff: pend.diff }, seats); S.at = Date.now() + 600;
          front.solo(pend.opp === 'alone' ? `혼자 하기 · ${DIFF[pend.diff].name}` : `AI와 버저 대결 · ${n}인 · ${DIFF[pend.diff].name}`);
          local(); T.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 150);
        }
        T.every(paint, 200);
      }
      function local() { recvAt = Date.now(); show(MULTI.view(S, 0)); }
      async function send(a) { if (busy) return; if (net) { busy = true; const er = await net.act(a); busy = false; if (er) $('rcMsg').textContent = er; return; } try { MULTI.act(S, 0, a); } catch (e) { $('rcMsg').textContent = e.message; } local(); }
      const sumOf = (b, r) => { let s = 0; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { if (b[y][x] == null) return null; s += b[y][x]; } return s; };
      wrap.addEventListener('click', e => {
        const c = e.target.closest('[data-c]');
        if (c && V && V.phase === 'q') { const [x, y] = c.dataset.c.split(',').map(Number);
          if (!pick) pick = { x, y }; else { const r = { x0: Math.min(pick.x, x), y0: Math.min(pick.y, y), x1: Math.max(pick.x, x), y1: Math.max(pick.y, y) }; pick = null; const s = sumOf(V.board, r); if (s == null) $('rcMsg').textContent = '판 밖 칸이 들어간 네모는 안 돼요'; else { r.s = s; marks.push(r); } }
          drawBoard(); return; }
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const a = b.dataset.a;
        if (a === 'undo') { marks.pop(); pick = null; drawBoard(); }
        else if (a === 'clear') { marks = []; pick = null; drawBoard(); }
        else if (a === 'buzz') send({ type: 'buzz' });
        else if (a.startsWith('k')) { const k = a.slice(1); if (k === 'del') typed = typed.slice(0, -1); else if (k === 'ok') { if (typed !== '') { send({ type: 'ans', v: +typed }); typed = ''; } } else if (typed.length < 3) typed += k; drawAct(); }
        else if (a === 'again') send({ type: 'again' });
      });
      wrap.addEventListener('click', e => { if (e.target.closest('[data-again]')) send({ type: 'again' }); });
      document.addEventListener('keydown', e => { if (!V || V.phase !== 'q' || !wrap.isConnected || wrap.closest('[hidden]')) return; if (/^[0-9]$/.test(e.key) && typed.length < 3) { typed += e.key; drawAct(); } else if (e.key === 'Backspace') { typed = typed.slice(0, -1); drawAct(); } else if (e.key === 'Enter' && canAnswer() && typed !== '') { send({ type: 'ans', v: +typed }); typed = ''; drawAct(); } });
      const fmt = ms => { const s = ms / 1000; return s < 60 ? s.toFixed(1) + '초' : Math.floor(s / 60) + '분 ' + Math.round(s % 60) + '초'; };
      const canAnswer = () => V && V.phase === 'q' && (V.solo || (V.buzz && V.buzz.id === V.me));
      function drawBoard() {
        const v = V; if (!v || !v.board) { $('rcB').innerHTML = ''; return; }
        const H = v.board.length, W = v.board[0].length;
        const inMark = (x, y) => marks.filter(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1).length;
        $('rcB').style.gridTemplateColumns = `repeat(${W}, 1fr)`;
        $('rcB').innerHTML = v.board.map((row, y) => row.map((c, x) => c == null ? '<span class="rc-x"></span>' : `<button type="button" class="rc-c ${c === 0 ? 'blank' : ''} ${pick && pick.x === x && pick.y === y ? 'pk' : ''} ${inMark(x, y) ? 'mk' : ''}" data-c="${x},${y}" style="--m:${Math.min(4, inMark(x, y))}">${c || ''}</button>`).join('')).join('');
        const last = marks[marks.length - 1];
        $('rcMk').innerHTML = `표시 <b>${marks.length}</b>개${last ? ` · 마지막 네모 합 <b class="${last.s === v.target ? 'hit' : ''}">${last.s}</b>` : pick ? ' · 맞은편 칸을 누르세요' : ''}`;
      }
      function drawAct() {
        const v = V; if (!v) return;
        if (v.phase !== 'q') { $('rcAct').innerHTML = ''; return; }
        const me = v.players[v.me];
        if (!v.solo && !(v.buzz && v.buzz.id === v.me)) {
          $('rcAct').innerHTML = v.buzz ? `<div class="rc-wait">${esc(v.players[v.buzz.id].name)} 님이 답하는 중…</div>` : `<button type="button" class="primary rc-buzz" data-a="buzz" ${me.out ? 'disabled' : ''}>${me.out ? '이 문제는 답할 수 없어요' : '버저'}</button>`; return;
        }
        $('rcAct').innerHTML = `<div class="rc-in">${typed === '' ? '<span class="muted">개수</span>' : esc(typed)}</div><div class="rc-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button type="button" data-a="k${k}">${k}</button>`).join('')}<button type="button" data-a="kdel">⌫</button><button type="button" data-a="k0">0</button><button type="button" class="primary" data-a="kok">제출</button></div>`;
      }
      function paint() {
        if (!V) return; const ago = Date.now() - recvAt, me = V.players[V.me];
        if (V.phase === 'q') { $('rcTime').textContent = V.buzz ? `${Math.ceil(Math.max(0, V.buzz.left - ago) / 1000)}초` : fmt(V.ago + ago + (V.solo ? me.pen : 0)); $('rcTime').classList.toggle('warn', !!V.buzz); }
        else if (V.phase === 'gap') $('rcTime').textContent = V.qi < 0 ? '' : `다음 문제 ${Math.ceil(Math.max(0, V.gapLeft - ago) / 1000)}`;
      }
      function show(v) {
        const prevBuzz = V && V.buzz ? V.buzz.id : null; V = v; const me = v.players[v.me];
        if (v.mid !== shownMid) { shownMid = v.mid; lastQ = -1; }
        if (v.phase === 'q' && v.qi !== lastQ) { lastQ = v.qi; marks = []; pick = null; typed = ''; if (window.GameFX && v.qi > 0) GameFX.banner(`문제 ${v.qi + 1}`, v.solo ? `${v.qn}문제 중` : `${v.goal}점 먼저`); }
        if (v.buzz && v.buzz.id !== prevBuzz) typed = '';
        $('rcQ').textContent = v.qi < 0 ? '곧 시작해요' : `문제 ${v.qi + 1}${v.solo ? ' / ' + v.qn : ''}`;
        $('rcLives').innerHTML = v.solo ? [0, 1, 2].map(k => `<i class="rc-life ${k < me.wrong ? 'gone' : ''}"></i>`).join('') : `${v.goal}점 먼저`;
        $('rcT').textContent = v.target ?? '?';
        drawBoard(); drawAct();
        const cover = $('rcCover'); cover.hidden = v.phase === 'q'; cover.innerHTML = v.last && v.last.ans != null ? `<div>정답 <b>${v.last.ans}</b>개</div>` : '';
        const L = v.last;
        $('rcMsg').textContent = v.phase === 'q' ? (L && L.said != null ? `${L.by === v.me ? '나' : v.players[L.by].name}: ${L.said}개 → 오답` : v.solo ? '네모 개수를 입력하세요' : '답을 알겠으면 버저를 누르세요') : v.phase === 'over' ? '게임 끝' : '';
        const sorted = v.players.slice().sort((a, b) => b.pts - a.pts);
        $('rcPl').innerHTML = v.solo ? '' : sorted.map(p => `<div class="qz-p ${p.id === v.me ? 'me' : ''}"><span class="nm">${esc(p.id === v.me ? '나' : p.name)}</span><span class="st">${v.buzz && v.buzz.id === p.id ? '답하는 중' : p.out ? '오답' : ''}</span><b>${p.pts}점</b></div>`).join('');
        $('rcLog').innerHTML = v.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('rcAgain').innerHTML = v.phase === 'over' && net ? LAB.againHtml(lastRoom, v.me) : '';
        if (v.phase === 'over' && !ended) { ended = true; const rk = sorted.findIndex(p => p.id === v.me) + 1;
          T.set(() => LAB.end(v.solo ? `${me.pts}/${v.qn} 문제` : rk === 1 ? '승리' : `${rk}위`, v.solo ? `걸린 시간 ${fmt(me.time)} (오답 시간 포함)` : `${me.pts}점 · ${v.players.length}명 중 ${rk}위`, net ? null : start), 1500); }
      }
      if (LAB.roomParam()) { pend.opp = 'net'; start(); } else front.menu();
    },
  });
})();
