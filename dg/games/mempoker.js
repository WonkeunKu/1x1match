// 기억 포커 (데블스플랜) — 카드 16장을 20초 동안 외운 뒤, 공유 카드 3장과 합쳐 가장 센 족보가 되는 2장을 고르기
(function () {
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fail = m => { const e = new Error(m); e.duel = true; throw e; };
  const MEM = 20000, PICK = 45000, RES = 6000;
  const RK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'], SU = ['♠', '♥', '♦', '♣'];
  const deck = () => Array.from({ length: 52 }, (_, i) => i); // r = i % 13 (0=2 … 12=A), s = i / 13
  const rk = c => c % 13, su = c => Math.floor(c / 13);
  const HN = ['하이카드', '원페어', '투페어', '트리플', '스트레이트', '플러시', '풀하우스', '포카드', '스트레이트 플러시'];
  // 5장 족보 점수: [등급, 비교 숫자들…] (모양은 비교하지 않음)
  function score5(cs) {
    const r = cs.map(rk).sort((a, b) => b - a), cnt = {}; r.forEach(x => cnt[x] = (cnt[x] || 0) + 1);
    const groups = Object.entries(cnt).map(([v, n]) => [n, +v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    const flush = cs.every(c => su(c) === su(cs[0]));
    const u = [...new Set(r)]; let straight = -1;
    if (u.length === 5) { if (u[0] - u[4] === 4) straight = u[0]; else if (u[0] === 12 && u[1] === 3) straight = 3; } // A-2-3-4-5
    if (straight >= 0 && flush) return [8, straight];
    if (groups[0][0] === 4) return [7, groups[0][1], groups[1][1]];
    if (groups[0][0] === 3 && groups[1][0] === 2) return [6, groups[0][1], groups[1][1]];
    if (flush) return [5, ...r];
    if (straight >= 0) return [4, straight];
    if (groups[0][0] === 3) return [3, groups[0][1], ...groups.slice(1).map(g => g[1])];
    if (groups[0][0] === 2 && groups[1][0] === 2) return [2, groups[0][1], groups[1][1], groups[2][1]];
    if (groups[0][0] === 2) return [1, groups[0][1], ...groups.slice(1).map(g => g[1])];
    return [0, ...r];
  }
  const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? -1) - (b[i] ?? -1); if (d) return d; } return 0; };
  // 판 16장 중 2장(위치)을 골랐을 때 가장 좋은 조합
  function bestPick(board, shared, known) {
    let best = null;
    for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) {
      const a = known ? known[i] : board[i], b = known ? known[j] : board[j]; if (a == null || b == null) continue;
      const s = score5([a, b, ...shared]); if (!best || cmp(s, best.s) > 0) best = { i, j, s };
    }
    return best;
  }
  const AI_MEM = [.5, .72, .95];

  const MULTI = {
    seats: o => Math.max(2, Math.min(8, Number(o && o.n) || 4)),
    init(prev, o, seats) {
      const lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1, mode = o && o.mode === 'one' ? 'one' : 'bo3';
      const S = { mid: Math.random().toString(36).slice(2, 9), lv, mode, round: 0, phase: 'gap', at: Date.now() + 3500, winner: -1,
        players: seats.map((x, i) => ({ id: i, name: x.name, bot: !!x.bot, wins: 0, pick: [] })), log: [] };
      return S;
    },
    startRound(S, now) {
      const d = shuffle(deck()); S.round++; S.board = d.slice(0, 16); S.shared = d.slice(16, 19); S.phase = 'mem'; S.at = now + MEM; S.res = null;
      for (const p of S.players) { p.pick = []; p.ready = false;
        if (p.bot) { const mem = S.board.map(c => Math.random() < AI_MEM[S.lv] ? c : (Math.random() < .5 ? null : d[19 + rnd(30)])); const b = bestPick(S.board, S.shared, mem); p.aiPick = b ? [b.i, b.j] : [0, 1]; p.aiAt = 0; } }
    },
    act(S, seat, a) {
      const p = S.players[seat]; if (!p) fail('자리가 없어요.');
      if (S.phase !== 'pick') fail('지금은 고를 수 없어요.');
      if (a.type === 'pick') { const i = Number(a.i); if (!(i >= 0 && i < 16)) fail('없는 칸이에요.'); if (p.ready) fail('이미 확정했어요.');
        if (p.pick.includes(i)) p.pick = p.pick.filter(x => x !== i); else { if (p.pick.length >= 2) p.pick.shift(); p.pick.push(i); } return; }
      if (a.type === 'ready') { if (p.pick.length !== 2) fail('카드 2장을 고르세요.'); p.ready = true; return; }
      fail('알 수 없는 행동이에요.');
    },
    endRound(S, now) {
      for (const p of S.players) { if (p.pick.length < 2) { const rest = [...Array(16).keys()].filter(x => !p.pick.includes(x)); while (p.pick.length < 2) p.pick.push(rest.splice(rnd(rest.length), 1)[0]); }
        p.hand = [S.board[p.pick[0]], S.board[p.pick[1]]]; p.score = score5([...p.hand, ...S.shared]); }
      const top = S.players.reduce((m, p) => !m || cmp(p.score, m) > 0 ? p.score : m, null), W = S.players.filter(p => cmp(p.score, top) === 0).map(p => p.id);
      S.res = { winners: W }; S.log.push(`${S.round}라운드 · ${W.map(i => S.players[i].name).join('·')} ${HN[top[0]]}${W.length > 1 ? ' (동률)' : ''}`);
      if (S.mode === 'one') { if (W.length === 1) { S.players[W[0]].wins++; S.phase = 'over'; S.winner = W[0]; } else { S.phase = 'res'; S.log.push('동률이라 다시 해요'); } }
      else { W.forEach(i => S.players[i].wins++); const champ = S.players.filter(p => p.wins >= 3); if (champ.length === 1) { S.phase = 'over'; S.winner = champ[0].id; } else S.phase = 'res'; }
      S.at = now + RES;
    },
    tick(S, now = Date.now()) {
      if (S.phase === 'over') return false;
      if (S.phase === 'gap' || S.phase === 'res') { if (now >= S.at) { MULTI.startRound(S, now); return true; } return false; }
      if (S.phase === 'mem') { if (now >= S.at) { S.phase = 'pick'; S.at = now + PICK; for (const p of S.players) if (p.bot) p.aiAt = now + 3000 + rnd(15000); return true; } return false; }
      if (S.phase === 'pick') {
        let ch = false;
        for (const p of S.players) if (p.bot && !p.ready && p.aiAt && now >= p.aiAt) { p.pick = p.aiPick.slice(); p.ready = true; ch = true; }
        if (now >= S.at || S.players.every(p => p.ready)) { MULTI.endRound(S, now); return true; }
        return ch;
      }
      return false;
    },
    view(S, seat) {
      const now = Date.now(), me = S.players[seat], open = S.phase === 'res' || S.phase === 'over';
      return { mid: S.mid, me: seat, phase: S.phase, round: S.round, mode: S.mode, winner: S.winner, left: Math.max(0, (S.at || 0) - now),
        board: S.board ? (S.phase === 'mem' || open ? S.board : S.board.map(() => null)) : null, shared: S.phase === 'pick' || open ? S.shared : null, res: S.res,
        mine: me ? me.pick : [], ready: me ? me.ready : false,
        players: S.players.map(p => ({ id: p.id, name: p.name, bot: p.bot, wins: p.wins, ready: !!p.ready, pick: open ? p.pick : null, hand: open ? p.hand : null, hn: open && p.score ? HN[p.score[0]] : null })), log: S.log.slice(-20) };
    },
  };
  const ENG = { MULTI, score5, bestPick, HN };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  const { h, esc } = LAB;
  const card = (c, cls = '', attrs = '') => c == null ? `<span class="mp-card back ${cls}" ${attrs}></span>` : `<span class="mp-card ${su(c) === 1 || su(c) === 2 ? 'red' : ''} ${cls}" ${attrs}><b>${RK[rk(c)]}</b><i>${SU[su(c)]}</i></span>`;
  const L = 'ABCDEFGHIJKLMNOP';
  LAB.add({
    id: 'mempoker', name: '기억 포커', show: '데블스플랜',
    rules: `<ul>
      <li>게임이 시작되면 52장 중 무작위 <b>16장</b>이 <b>20초</b> 동안 공개돼요. 위치(A~P)와 카드를 외우세요.</li>
      <li>카드가 뒤집히면 <b>공유 카드 3장</b>이 공개돼요.</li>
      <li>외운 16장 중에서 공유 카드 3장과 합쳐 <b>가장 센 족보</b>가 되는 카드 <b>2장</b>의 자리를 골라요. 다른 사람과 같은 자리를 골라도 돼요.</li>
      <li>모두 고르면 카드를 공개하고, 가장 높은 족보가 이겨요. 족보: 스트레이트 플러시 › 포카드 › 풀하우스 › 플러시 › 스트레이트 › 트리플 › 투페어 › 원페어 › 하이카드.</li>
      <li>같은 등급이면 더 높은 숫자 조합이, 그래도 같으면 나머지 숫자가 높은 쪽이 이겨요. 카드 모양은 비교하지 않아요.</li>
      <li><b>단판</b>: 1등만 승리, 동률이면 다시 해요. <b>3선승</b>: 3승을 먼저 채우면 우승(동률이면 같이 1승).</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers(); LAB.paused = false;
      let lastRoom = null, pend = { n: 4, lv: 1, mode: 'bo3', opp: 'ai' }, S = null, net = null, V = null, recvAt = 0, busy = false, ended = false, shownMid = null, fxKey = '';
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap"><div class="g-main card">
        <div class="dn-lobby" id="mpLobby" hidden></div>
        <div id="mpGame" hidden>
          <div class="qz-top"><span id="mpR"></span><b class="qz-time" id="mpTime"></b><span id="mpMode"></span></div>
          <div class="mp-shared" id="mpShared"></div>
          <div class="mp-board" id="mpBoard"></div>
          <div class="mp-act" id="mpAct"></div>
          <p class="g-msg" id="mpMsg"></p>
          <div class="qz-players" id="mpPl"></div>
          <div id="mpAgain"></div>
        </div></div>
        <aside class="g-side"><div class="card"><h3>진행 기록</h3><div class="log" id="mpLog"></div></div></aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const N_OPTS = { key: 'n', label: '인원', opts: [[2, '2인'], [3, '3인'], [4, '4인'], [6, '6인'], [8, '8인']], def: 4 }, L_OPTS = { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 };
      const front = LAB.duelFront({ el: $('mpLobby'), gameEl: $('mpGame'), friendLabel: '친구와 하기 (2~8인, 빈자리는 AI)',
        modeOpt: { key: 'mode', label: '승리 조건', opts: [['bo3', '3선승'], ['one', '단판']], def: 'bo3', desc: { bo3: '라운드에서 이기면 1승, 3승을 먼저 채우면 우승해요.', one: '한 판으로 끝나요. 1등이 아니면 탈락, 동률이면 다시 해요.' } },
        soloOpts: [{ ...N_OPTS, label: '인원 (나 + AI)' }, L_OPTS], roomOpts: [N_OPTS, L_OPTS], onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T.clear(); if (net) { net.close(); net = null; } S = null; V = null; ended = false; shownMid = null; fxKey = ''; $('mpLog').innerHTML = ''; }
      function start() {
        reset();
        if (pend.opp === 'net') { net = LAB.duel('mempoker', { front, el: $('mpLobby'), opts: () => ({ n: pend.n, lv: pend.lv, mode: pend.mode }), onView: v => { lastRoom = v; if (!v.st) return; recvAt = Date.now(); show(v.st); }, onError: m => { $('mpMsg').textContent = m; } }); net.start(); }
        else {
          const seats = [{ name: '나' }, ...Array.from({ length: pend.n - 1 }, (_, k) => ({ name: 'AI ' + (k + 1), bot: true }))];
          S = MULTI.init(null, { lv: pend.lv, mode: pend.mode }, seats); S.at = Date.now() + 600;
          front.solo(`AI와 대결 · ${pend.n}인 · ${pend.mode === 'one' ? '단판' : '3선승'}`);
          local(); T.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 150);
        }
        T.every(paint, 200);
      }
      function local() { recvAt = Date.now(); show(MULTI.view(S, 0)); }
      async function send(a) { if (busy) return; if (net) { busy = true; const er = await net.act(a); busy = false; if (er) $('mpMsg').textContent = er; return; } try { MULTI.act(S, 0, a); } catch (e) { $('mpMsg').textContent = e.message; } local(); }
      wrap.addEventListener('click', e => { const c = e.target.closest('[data-i]'); if (c && V && V.phase === 'pick' && !V.ready) { send({ type: 'pick', i: +c.dataset.i }); return; }
        if (e.target.closest('[data-ready]')) send({ type: 'ready' }); if (e.target.closest('[data-again]')) send({ type: 'again' }); });
      function paint() { if (!V) return; const s = Math.ceil(Math.max(0, V.left - (Date.now() - recvAt)) / 1000); $('mpTime').textContent = V.phase === 'mem' ? `외우기 ${s}초` : V.phase === 'pick' ? `${s}초` : V.phase === 'res' ? `다음 라운드 ${s}` : ''; $('mpTime').classList.toggle('warn', (V.phase === 'mem' || V.phase === 'pick') && s <= 5); }
      function show(v) {
        V = v; const me = v.players[v.me], open = v.phase === 'res' || v.phase === 'over';
        if (v.mid !== shownMid) { shownMid = v.mid; fxKey = ''; }
        const key = v.round + ':' + v.phase;
        if (key !== fxKey && window.GameFX) { const was = fxKey; fxKey = key;
          if (v.phase === 'mem' && v.round > 1) GameFX.banner(`ROUND ${v.round}`, '20초 동안 16장을 외우세요');
          if (open && was && v.res) { const W = v.res.winners;
            GameFX.reveal({ seats: v.players.map(p => ({ name: p.name, me: p.id === v.me, items: p.hand.map(c => ({ html: `${RK[rk(c)]}<small style="font-size:.7em">${SU[su(c)]}</small>`, style: su(c) === 1 || su(c) === 2 ? 'color:#c62828' : '' })), })),
              steps: [{ title: '카드 공개', sub: '공유 카드: ' + v.shared.map(c => RK[rk(c)] + SU[su(c)]).join(' '), ms: 450 }, { flip: 'all', ms: 900 }, { win: W, res: `${W.map(i => i === v.me ? '나' : v.players[i].name).join('·')} · ${v.players[W[0]].hn}`, ms: 700 }] }); }
        }
        $('mpR').textContent = v.round ? `${v.round}라운드` : '곧 시작해요'; $('mpMode').textContent = v.mode === 'one' ? '단판' : '3선승';
        $('mpShared').innerHTML = v.shared ? `<small>공유 카드</small><div>${v.shared.map(c => card(c, 'sh')).join('')}</div>` : v.phase === 'mem' ? '<small>카드를 외우세요</small>' : '';
        const myPick = open ? me.pick || [] : v.mine;
        $('mpBoard').innerHTML = v.board ? v.board.map((c, i) => {
          const pk = myPick.includes(i), others = open ? v.players.filter(p => p.id !== v.me && p.pick && p.pick.includes(i)).length : 0;
          return `<button type="button" class="mp-slot ${pk ? 'pk' : ''}" data-i="${i}" ${v.phase === 'pick' && !v.ready ? '' : 'disabled'}>${card(c)}<span class="lt">${L[i]}</span>${others ? `<span class="oth">${others}</span>` : ''}</button>`; }).join('') : '';
        $('mpAct').innerHTML = v.phase === 'pick' ? (v.ready ? '<span class="muted">확정했어요. 다른 사람을 기다리는 중…</span>' : `<button type="button" class="primary" data-ready ${v.mine.length === 2 ? '' : 'disabled'}>${v.mine.length === 2 ? `${L[v.mine[0]]} · ${L[v.mine[1]]} 확정` : `${2 - v.mine.length}장 더 고르세요`}</button>`) : '';
        $('mpMsg').textContent = v.phase === 'mem' ? '자리와 카드를 외우세요' : v.phase === 'pick' ? '공유 카드와 합쳐 가장 센 족보가 될 카드 2장의 자리를 고르세요' : open && me.hn ? `내 족보: ${me.hn}` : '';
        $('mpPl').innerHTML = v.players.slice().sort((a, b) => b.wins - a.wins).map(p => `<div class="qz-p ${p.id === v.me ? 'me' : ''}"><span class="nm">${esc(p.id === v.me ? '나' : p.name)}</span><span class="st">${v.phase === 'pick' ? (p.ready ? '확정' : '고르는 중') : p.hn || ''}</span><b>${p.wins}승</b></div>`).join('');
        $('mpLog').innerHTML = v.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('mpAgain').innerHTML = v.phase === 'over' && net ? LAB.againHtml(lastRoom, v.me) : '';
        if (v.phase === 'over' && !ended) { ended = true; const win = v.winner === v.me; T.set(() => LAB.end(win ? '우승' : '패배', `${v.players[v.winner].id === v.me ? '나' : v.players[v.winner].name} 우승 · ${v.round}라운드`, net ? null : start), 5200); }
      }
      if (LAB.roomParam()) { pend.opp = 'net'; start(); } else front.menu();
    },
  });
})();
