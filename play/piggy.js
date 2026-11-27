// 돼지 저금통 (데블스플랜) — 저금통 속 흑백 동전 개수를 기억하고, 틀린 말을 의심해 승점 얻기
// 자리마다 아래 칸(bot)·위 칸(top) 저금통. 저금통 두 개를 가진 사람이 아래 칸에 동전을 넣고 다른 사람에게 줌
(function () {
  const rnd = n => Math.floor(Math.random() * n);
  const fail = m => { const e = new Error(m); e.duel = true; throw e; };
  const T_ADD = 30000, T_SAY = 20000, T_DOUBT = 10000, T_CH = 25000, SHOW = 2600;
  const CN = { b: '흑', w: '백' };

  const MULTI = {
    seats: o => Math.max(3, Math.min(4, Number(o && o.n) || 4)),
    init(prev, o, seats) {
      const lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1, goal = [3, 5, 7].includes(Number(o && o.goal)) ? Number(o.goal) : 5;
      const S = { mid: Math.random().toString(36).slice(2, 9), lv, goal, nextNo: 1, banks: {}, color: 'b', phase: 'add', active: rnd(seats.length), at: Date.now() + 3500, deadline: 0, winner: -1,
        players: seats.map((x, i) => ({ id: i, name: x.name, bot: !!x.bot, pts: 0, bot_: null, top: null, reset: false, mem: {} })), log: [], flash: null, said: null, doubt: null };
      MULTI.deal(S);
      S.log.push(`추첨으로 선: ${S.players[S.active].name}`);
      return S;
    },
    newBank(S) { const no = S.nextNo++; S.banks[no] = { no, b: 1, w: 1 }; for (const p of S.players) if (p.bot) p.mem[no] = { b: 1, w: 1 }; return no; },
    deal(S) { S.banks = {}; for (const p of S.players) { p.bot_ = MULTI.newBank(S); p.top = null; p.reset = false; } S.players[S.active].top = MULTI.newBank(S); },
    // AI 기억: 실력에 따라 넣은 개수를 틀리게 기억하기도 함
    remember(S, no, db, dw) { const err = [.22, .1, .03][S.lv]; for (const p of S.players) if (p.bot) { const m = p.mem[no] || { b: 1, w: 1 }; const slip = Math.random() < err ? (rnd(2) ? 1 : -1) : 0, side = rnd(2); m.b += db + (side ? slip : 0); m.w += dw + (side ? 0 : slip); m.miss = (m.miss || 0) + (slip ? 1 : 0); m.b = Math.max(0, m.b); m.w = Math.max(0, m.w); p.mem[no] = m; } },
    act(S, seat, a, now = Date.now()) {
      const p = S.players[seat]; if (!p) fail('자리가 없어요.');
      if (a.type === 'reset') { if (S.phase === 'over' || S.phase === 'challenge') fail('지금은 신청할 수 없어요.'); p.reset = !p.reset; S.log.push(`${p.name}: 초기화 ${p.reset ? '신청' : '취소'}`); MULTI.checkReset(S, now); return; }
      if (a.type === 'add') {
        if (S.phase !== 'add' || S.active !== seat) fail('지금은 동전을 넣을 차례가 아니에요.');
        const b = Math.round(Number(a.b)), w = Math.round(Number(a.w)), to = Number(a.to);
        if (!(b >= 0 && w >= 0 && b + w >= 1 && b + w <= 5)) fail('흑백 합쳐 1~5개를 넣어요.');
        if (!(to >= 0 && to < S.players.length) || to === seat) fail('저금통을 줄 사람을 고르세요.');
        const no = p.bot_, bk = S.banks[no]; bk.b += b; bk.w += w; MULTI.remember(S, no, b, w);
        S.flash = { no, b, w, by: seat, until: now + SHOW }; S.log.push(`${p.name}: ${no}번 저금통에 동전 ${b + w}개를 넣어 ${S.players[to].name}에게`); // 색별 개수는 기록에 남기지 않음 (기억 게임)
        // 준 사람의 위 칸이 아래로, 받은 사람은 위 칸에 받음
        p.bot_ = p.top; p.top = null; const q = S.players[to]; q.top = no;
        S.phase = 'say'; S.target = to; S.said = null; S.deadline = now + SHOW + T_SAY; S.at = now + SHOW; return;
      }
      if (a.type === 'say') {
        if (S.phase !== 'say' || S.target !== seat) fail('지금은 말할 차례가 아니에요.');
        const v = Math.round(Number(a.v)); if (!(v >= 0 && v <= 60)) fail('개수를 말하세요.');
        S.said = { by: seat, no: p.top, color: S.color, v }; S.log.push(`${p.name}: "${p.top}번 저금통 ${CN[S.color]} 동전은 ${v}개"`);
        S.phase = 'doubt'; S.deadline = now + T_DOUBT; S.doubtAi = {}; for (const o of S.players) if (o.bot && o.id !== seat) { const m = o.mem[p.top]; const mine = m ? m[S.color] : null; if (mine != null && mine !== v && Math.random() < (m.miss ? .08 : [.5, .7, .9][S.lv])) S.doubtAi[o.id] = now + 1500 + rnd(6000); }
        return;
      }
      if (a.type === 'doubt') {
        if (S.phase !== 'doubt') fail('지금은 의심할 수 없어요.'); if (S.said.by === seat) fail('내 말은 의심할 수 없어요.');
        return MULTI.resolveDoubt(S, seat, now);
      }
      if (a.type === 'challenge') {
        if (S.phase !== 'challenge' || S.challenger !== seat) fail('도전할 수 없어요.');
        if (a.skip) { S.log.push(`${p.name}: 도전하지 않음`); return MULTI.doReset(S, now); }
        const g = a.guess || {}; let ok = true;
        for (const no of Object.keys(S.banks)) { const x = g[no] || {}; if (Number(x.b) !== S.banks[no].b || Number(x.w) !== S.banks[no].w) ok = false; }
        p.pts += ok ? 3 : -2; S.log.push(`${p.name}: 도전 ${ok ? '성공! +3점' : '실패 -2점'}`); S.reveal = { all: JSON.parse(JSON.stringify(S.banks)), ok, by: seat, until: now + 5000 };
        if (MULTI.checkWin(S)) return; return MULTI.doReset(S, now);
      }
      fail('알 수 없는 행동이에요.');
    },
    resolveDoubt(S, doubter, now) {
      const s = S.said, bk = S.banks[s.no], real = bk[s.color], d = S.players[doubter], t = S.players[s.by];
      const right = real !== s.v;
      if (right) { d.pts++; t.pts--; } else d.pts--;
      S.log.push(`${d.name} 의심! ${s.no}번 ${CN[s.color]} 실제 ${real}개 → ${right ? `의심 성공 (${d.name} +1, ${t.name} -1)` : `의심 실패 (${d.name} -1)`}`);
      S.reveal = { no: s.no, b: bk.b, w: bk.w, right, by: doubter, until: now + 4500 };
      delete S.banks[s.no]; t.top = MULTI.newBank(S); S.color = S.color === 'b' ? 'w' : 'b';
      if (MULTI.checkWin(S)) return;
      S.phase = 'add'; S.active = s.by; S.deadline = now + 4500 + T_ADD; S.at = now + 4500;
    },
    noDoubt(S, now) { const s = S.said; S.log.push('아무도 의심하지 않았어요'); S.color = S.color === 'b' ? 'w' : 'b'; S.phase = 'add'; S.active = s.by; S.deadline = now + T_ADD; S.at = now + 600; },
    checkReset(S, now) {
      const n = S.players.length, req = S.players.filter(p => p.reset).length;
      if (req >= n - 1) { const ch = S.players.find(p => !p.reset); S.log.push('초기화 확정!'); if (ch) { S.phase = 'challenge'; S.challenger = ch.id; S.deadline = now + T_CH; S.at = now + 300; } else MULTI.doReset(S, now); }
    },
    doReset(S, now) { S.log.push('모든 저금통을 새로 받아요'); MULTI.deal(S); S.phase = 'add'; S.deadline = now + 3000 + T_ADD; S.at = now + 3000; S.said = null; },
    checkWin(S) { const w = S.players.filter(p => p.pts >= S.goal); if (!w.length) return false; S.phase = 'over'; const best = Math.max(...S.players.map(p => p.pts)); S.winner = S.players.find(p => p.pts === best).id; S.log.push(`${S.players[S.winner].name} 목표 승점 달성!`); return true; },
    aiAct(S, now) {
      if (S.phase === 'add') { const p = S.players[S.active]; if (!p.bot) return false;
        let b = rnd(4), w = rnd(4); if (b + w === 0) b = 1; while (b + w > 5) b > w ? b-- : w--; const others = S.players.filter(q => q.id !== p.id); const to = others[rnd(others.length)].id;
        MULTI.act(S, p.id, { type: 'add', b, w, to }, now); return true; }
      if (S.phase === 'say') { const p = S.players[S.target]; if (!p.bot) return false; const m = p.mem[p.top] || { b: 1, w: 1 }; MULTI.act(S, p.id, { type: 'say', v: m[S.color] }, now); S.at = now + 600; return true; }
      if (S.phase === 'doubt') { for (const [id, at] of Object.entries(S.doubtAi || {})) if (now >= at) { MULTI.act(S, +id, { type: 'doubt' }, now); return true; } return false; }
      if (S.phase === 'challenge') { const p = S.players[S.challenger]; if (!p.bot) return false; const g = {}; let conf = true; for (const no of Object.keys(S.banks)) { const m = p.mem[no]; if (!m) conf = false; g[no] = m || { b: 1, w: 1 }; }
        MULTI.act(S, p.id, conf && Math.random() < [.1, .3, .6][S.lv] ? { type: 'challenge', guess: g } : { type: 'challenge', skip: true }, now); return true; }
      return false;
    },
    tick(S, now = Date.now()) {
      if (S.phase === 'over') return false;
      if (S.at && now < S.at) return false;
      if (!S.deadline) { S.deadline = now + T_ADD; return true; }
      // AI 초기화 신청: 기억이 흐려질 만큼 저금통이 무거우면 가끔
      for (const p of S.players) if (p.bot && !p.reset && S.phase === 'add' && Math.random() < .0012 * (1 + Object.values(S.banks).reduce((a, b) => a + b.b + b.w, 0) / 20)) { p.reset = true; S.log.push(`${p.name}: 초기화 신청`); MULTI.checkReset(S, now); return true; }
      if (MULTI.aiAct(S, now)) return true;
      if (now >= S.deadline) {
        if (S.phase === 'add') { const p = S.players[S.active]; const others = S.players.filter(q => q.id !== p.id); MULTI.act(S, p.id, { type: 'add', b: 1, w: 0, to: others[rnd(others.length)].id }, now); S.log.push(`${p.name}: 시간 초과 → 동전 1개를 넣고 아무에게나`); return true; }
        if (S.phase === 'say') { const p = S.players[S.target]; MULTI.act(S, p.id, { type: 'say', v: 0 }, now); S.log.push(`${p.name}: 시간 초과 → 0개라고 말함`); return true; }
        if (S.phase === 'doubt') { MULTI.noDoubt(S, now); return true; }
        if (S.phase === 'challenge') { MULTI.act(S, S.challenger, { type: 'challenge', skip: true }, now); return true; }
      }
      return false;
    },
    view(S, seat) {
      const now = Date.now(), me = S.players[seat];
      return { mid: S.mid, me: seat, phase: S.phase, goal: S.goal, color: S.color, active: S.active, target: S.target, said: S.said, challenger: S.challenger, left: Math.max(0, (S.deadline || 0) - now), waitLeft: Math.max(0, (S.at || 0) - now),
        flash: S.flash && S.flash.until > now ? { ...S.flash, left: S.flash.until - now } : null, reveal: S.reveal && S.reveal.until > now ? S.reveal : null, nos: Object.keys(S.banks).map(Number),
        players: S.players.map(p => ({ id: p.id, name: p.name, bot: p.bot, pts: p.pts, bot_: p.bot_, top: p.top, reset: p.reset })), log: S.log.slice(-40), winner: S.winner };
    },
  };
  const ENG = { MULTI };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  const { h, esc } = LAB;
  const pig = (no, cls = '') => no == null ? `<span class="pg-pig empty ${cls}"></span>` : `<span class="pg-pig ${cls}"><svg viewBox="0 0 40 30" aria-hidden="true"><ellipse cx="20" cy="17" rx="15" ry="11" fill="#e9a7b4"/><circle cx="32" cy="15" r="5" fill="#f0bcc6"/><circle cx="33.5" cy="14.5" r="1" fill="#8c4a58"/><circle cx="33.5" cy="16.5" r="1" fill="#8c4a58"/><path d="M12 7 l3 4 l-5 0z" fill="#d98c9b"/><rect x="15" y="5" width="8" height="2" rx="1" fill="#6b3946"/><rect x="9" y="25" width="4" height="4" fill="#d98c9b"/><rect x="25" y="25" width="4" height="4" fill="#d98c9b"/></svg><b>${no}</b></span>`;
  LAB.add({
    id: 'piggy', name: '돼지 저금통', show: '데블스플랜',
    rules: `<ul>
      <li>저금통 속 <b>흑·백 동전 개수</b>를 기억하고, 틀린 말을 <b>의심</b>해 승점을 얻는 게임이에요. 3~4인.</li>
      <li>모두 흑 1·백 1이 든 저금통을 <b>아래 칸</b>에 받아요. 선은 <b>위 칸</b>에 하나 더 받아요.</li>
      <li>저금통이 두 개인 사람은 아래 칸 저금통에 흑백 동전을 <b>1~5개</b> 넣어요. 넣은 색과 개수는 잠깐 모두에게 보여요. 그 저금통을 원하는 사람에게 주면, 내 위 칸 저금통이 아래로 내려와요.</li>
      <li>받은 사람은 <b>20초</b> 안에 그 저금통의 한 색 동전 개수를 말해요. 말할 색은 <b>흑 → 백 → 흑…</b> 번갈아 정해져요.</li>
      <li>틀렸다고 생각하면 다른 사람은 <b>10초</b> 안에 <b>의심</b> 버저! 먼저 누른 한 명만 의심해요. 실제와 다르면 의심 성공: 의심한 사람 +1, 말한 사람 -1. 같으면 실패: 의심한 사람 -1.</li>
      <li>의심으로 열린 저금통은 없어지고, 받았던 사람이 새 번호 저금통을 받아 이어 해요. 아무도 의심하지 않으면 받은 사람이 같은 과정을 반복해요.</li>
      <li>언제든 <b>초기화</b>를 신청할 수 있어요. 한 명만 빼고 모두 신청하면 모든 저금통을 새로 받아요. 그때 신청하지 않은 한 명은 <b>도전</b>할 수 있어요: 모든 저금통의 흑백 개수를 다 맞히면 +3, 틀리면 -2.</li>
      <li>누군가 <b>목표 승점</b>에 닿으면 끝나고, 승점 순으로 순위를 정해요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers(); LAB.paused = false;
      let lastRoom = null, pend = { n: 4, lv: 1, goal: 3, opp: 'ai' }, S = null, net = null, V = null, recvAt = 0, busy = false, ended = false, shownMid = null, add = { b: 1, w: 1, to: null }, sayV = 0, guess = {}, fxKey = '';
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap"><div class="g-main card">
        <div class="dn-lobby" id="pgLobby" hidden></div>
        <div id="pgGame" hidden>
          <div class="qz-top"><span id="pgGoal"></span><b class="qz-time" id="pgTime"></b><span id="pgColor"></span></div>
          <div class="pg-table" id="pgTable"></div>
          <div class="pg-flash" id="pgFlash"></div>
          <div class="pg-act" id="pgAct"></div>
          <p class="g-msg" id="pgMsg"></p>
          <div class="pg-reset"><button type="button" data-a="reset" id="pgReset">초기화 신청</button><span class="muted" id="pgResetN"></span></div>
          <div id="pgAgain"></div>
        </div></div>
        <aside class="g-side"><div class="card"><h3>진행 기록</h3><div class="log" id="pgLog"></div></div></aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const N_OPTS = { key: 'n', label: '인원', opts: [[3, '3인'], [4, '4인']], def: 4 }, G_OPTS = { key: 'goal', label: '목표 승점', opts: [[3, '3점'], [5, '5점'], [7, '7점']], def: 3 }, L_OPTS = { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 };
      const front = LAB.duelFront({ el: $('pgLobby'), gameEl: $('pgGame'), friendLabel: '친구와 하기 (3~4인, 빈자리는 AI)', soloLabel: 'AI와 하기',
        soloOpts: [{ ...N_OPTS, label: '인원 (나 + AI)' }, G_OPTS, L_OPTS], roomOpts: [N_OPTS, G_OPTS, L_OPTS], onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T.clear(); if (net) { net.close(); net = null; } S = null; V = null; ended = false; shownMid = null; fxKey = ''; $('pgLog').innerHTML = ''; }
      function start() {
        reset();
        if (pend.opp === 'net') { net = LAB.duel('piggy', { front, el: $('pgLobby'), opts: () => ({ n: pend.n, lv: pend.lv, goal: pend.goal }), onView: v => { lastRoom = v; if (!v.st) return; recvAt = Date.now(); show(v.st); }, onError: m => { $('pgMsg').textContent = m; } }); net.start(); }
        else {
          const seats = [{ name: '나' }, ...Array.from({ length: pend.n - 1 }, (_, k) => ({ name: 'AI ' + (k + 1), bot: true }))];
          S = MULTI.init(null, { lv: pend.lv, goal: pend.goal }, seats); S.at = Date.now() + 600;
          front.solo(`AI와 하기 · ${pend.n}인 · ${pend.goal}점`);
          local(); T.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 150);
        }
        T.every(paint, 250);
      }
      function local() { recvAt = Date.now(); show(MULTI.view(S, 0)); }
      async function send(a) { if (busy) return; if (net) { busy = true; const er = await net.act(a); busy = false; if (er) $('pgMsg').textContent = er; return; } try { MULTI.act(S, 0, a); } catch (e) { $('pgMsg').textContent = e.message; } local(); }
      wrap.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b || b.disabled || !V) { if (e.target.closest('[data-again]')) send({ type: 'again' }); return; }
        const a = b.dataset.a, x = b.dataset.v;
        if (a === 'b+' || a === 'b-' || a === 'w+' || a === 'w-') { const k = a[0]; add[k] = Math.max(0, add[k] + (a[1] === '+' ? 1 : -1)); if (add.b + add.w > 5) add[k]--; drawAct(); }
        else if (a === 'to') { add.to = +x; drawAct(); }
        else if (a === 'give') { if (add.to == null) { $('pgMsg').textContent = '저금통을 줄 사람을 고르세요'; return; } send({ type: 'add', b: add.b, w: add.w, to: add.to }); add = { b: 1, w: 1, to: null }; }
        else if (a === 's+' || a === 's-') { sayV = Math.max(0, sayV + (a === 's+' ? 1 : -1)); drawAct(); }
        else if (a === 'say') send({ type: 'say', v: sayV });
        else if (a === 'doubt') send({ type: 'doubt' });
        else if (a === 'reset') send({ type: 'reset' });
        else if (a === 'g') { const [no, k, d] = x.split(':'); guess[no] = guess[no] || { b: 1, w: 1 }; guess[no][k] = Math.max(0, guess[no][k] + +d); drawAct(); }
        else if (a === 'chal') send({ type: 'challenge', guess });
        else if (a === 'skip') send({ type: 'challenge', skip: true });
      });
      function paint() { if (!V) return; const ago = Date.now() - recvAt, s = Math.ceil(Math.max(0, V.left - ago) / 1000); $('pgTime').textContent = V.phase === 'over' ? '' : `${s}초`; $('pgTime').classList.toggle('warn', s <= 5 && V.phase !== 'over');
        const fl = $('pgFlash'); if (V.flash && V.flash.left - ago <= 0) fl.innerHTML = ''; }
      const nm = (v, id) => id === v.me ? '나' : v.players[id].name;
      function drawAct() {
        const v = V; if (!v) return; let o = '';
        if (v.phase === 'add' && v.active === v.me) {
          const mine = v.players[v.me];
          o = `<div class="pg-box"><b>${mine.bot_}번 저금통(아래 칸)에 넣기</b>
            <div class="pg-coins"><span class="pg-coin b"></span> 흑 <button type="button" data-a="b-">−</button><b>${add.b}</b><button type="button" data-a="b+">+</button>
            <span class="pg-coin w"></span> 백 <button type="button" data-a="w-">−</button><b>${add.w}</b><button type="button" data-a="w+">+</button><small>합 ${add.b + add.w} (1~5)</small></div>
            <div class="pg-to">${v.players.filter(p => p.id !== v.me).map(p => `<button type="button" class="${add.to === p.id ? 'on' : ''}" data-a="to" data-v="${p.id}">${esc(p.name)}에게</button>`).join('')}</div>
            <button type="button" class="primary" data-a="give" ${add.b + add.w < 1 || add.to == null ? 'disabled' : ''}>넣고 주기</button></div>`;
        } else if (v.phase === 'say' && v.target === v.me) {
          const no = v.players[v.me].top;
          o = `<div class="pg-box"><b>${no}번 저금통의 <span class="pg-coin ${v.color}"></span> ${CN[v.color]} 동전은 몇 개?</b><div class="pg-coins"><button type="button" data-a="s-">−</button><b class="big">${sayV}</b><button type="button" data-a="s+">+</button></div><button type="button" class="primary" data-a="say">말하기</button></div>`;
        } else if (v.phase === 'doubt' && v.said && v.said.by !== v.me) {
          o = `<button type="button" class="primary pg-buzz" data-a="doubt">의심!</button>`;
        } else if (v.phase === 'challenge' && v.challenger === v.me) {
          o = `<div class="pg-box"><b>도전! 모든 저금통의 흑백 개수를 맞히면 +3, 틀리면 -2</b>${v.nos.map(no => { const g = guess[no] || { b: 1, w: 1 }; return `<div class="pg-coins"><span>${no}번</span><span class="pg-coin b"></span><button type="button" data-a="g" data-v="${no}:b:-1">−</button><b>${g.b}</b><button type="button" data-a="g" data-v="${no}:b:1">+</button><span class="pg-coin w"></span><button type="button" data-a="g" data-v="${no}:w:-1">−</button><b>${g.w}</b><button type="button" data-a="g" data-v="${no}:w:1">+</button></div>`; }).join('')}
            <div class="row"><button type="button" class="primary" data-a="chal">도전</button><button type="button" data-a="skip">도전 안 함</button></div></div>`;
        }
        $('pgAct').innerHTML = o;
      }
      function show(v) {
        const prev = V; V = v;
        if (v.mid !== shownMid) { shownMid = v.mid; fxKey = ''; }
        if (v.phase === 'say' && (!prev || prev.phase !== 'say')) sayV = 0;
        if (v.phase === 'challenge' && (!prev || prev.phase !== 'challenge')) guess = {};
        $('pgGoal').textContent = `목표 ${v.goal}점`; $('pgColor').innerHTML = `말할 색 <span class="pg-coin ${v.color}"></span> ${CN[v.color]}`;
        $('pgTable').innerHTML = v.players.map(p => `<div class="pg-seat ${p.id === v.me ? 'me' : ''} ${(v.phase === 'add' && v.active === p.id) || ((v.phase === 'say' || v.phase === 'doubt') && v.target === p.id) ? 'turn' : ''}">
          <div class="pg-nm">${esc(nm(v, p.id))}<b>${p.pts}점</b>${p.reset ? '<small>초기화 신청</small>' : ''}</div>
          <div class="pg-slots"><div><small>위</small>${pig(p.top, v.flash && v.flash.no === p.top ? 'hot' : '')}</div><div><small>아래</small>${pig(p.bot_)}</div></div></div>`).join('');
        const F = v.flash, R = v.reveal;
        $('pgFlash').innerHTML = F ? `<div class="pg-fl">${esc(nm(v, F.by))} → <b>${F.no}번</b>에 <span class="pg-coin b"></span>×${F.b} <span class="pg-coin w"></span>×${F.w}</div>` : R ? (R.no ? `<div class="pg-fl ${R.right ? 'ok' : 'bad'}">${R.no}번 저금통 열기: <span class="pg-coin b"></span>${R.b} · <span class="pg-coin w"></span>${R.w} → ${R.right ? '의심 성공' : '의심 실패'}</div>` : `<div class="pg-fl ${R.ok ? 'ok' : 'bad'}">도전 ${R.ok ? '성공' : '실패'} · ${Object.values(R.all).map(x => `${x.no}번 흑${x.b}·백${x.w}`).join(', ')}</div>`) : '';
        const S2 = v.said;
        $('pgMsg').textContent = v.phase === 'add' ? (v.active === v.me ? '아래 칸 저금통에 동전을 넣고 다른 사람에게 주세요' : `${nm(v, v.active)} 님이 동전을 넣는 중`) : v.phase === 'say' ? (v.target === v.me ? '받은 저금통(위 칸)의 동전 개수를 말하세요' : `${nm(v, v.target)} 님이 ${CN[v.color]} 동전 개수를 말하는 중`)
          : v.phase === 'doubt' ? `"${S2.no}번 ${CN[S2.color]} ${S2.v}개" — ${S2.by === v.me ? '다른 사람이 의심할지 기다리는 중' : '틀렸다고 생각하면 의심!'}` : v.phase === 'challenge' ? (v.challenger === v.me ? '도전할지 정하세요' : `${nm(v, v.challenger)} 님이 도전할지 정하는 중`) : v.phase === 'over' ? '게임 끝' : '';
        drawAct();
        const me = v.players[v.me], req = v.players.filter(p => p.reset).length;
        $('pgReset').textContent = me.reset ? '초기화 취소' : '초기화 신청'; $('pgReset').disabled = v.phase === 'over' || v.phase === 'challenge'; $('pgResetN').textContent = req ? `${req}/${v.players.length - 1}명 신청` : '';
        $('pgLog').innerHTML = v.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('pgAgain').innerHTML = v.phase === 'over' && net ? LAB.againHtml(lastRoom, v.me) : '';
        if (v.phase === 'over' && !ended) { ended = true; const sorted = v.players.slice().sort((a, b) => b.pts - a.pts), rk = sorted.findIndex(p => p.id === v.me) + 1;
          T.set(() => LAB.end(rk === 1 ? '1위' : `${rk}위`, `${me.pts}점 · 목표 ${v.goal}점`, net ? null : start), 1800); }
      }
      if (LAB.roomParam()) { pend.opp = 'net'; start(); } else front.menu();
    },
  });
})();
