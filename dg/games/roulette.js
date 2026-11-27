// 러시안 룰렛 (데블스플랜) — 약실 속 총알 위치를 추적하고, 격발 순간 총알을 피하기
// 약실 번호는 실린더에 고정, 회전하면 약실이 옆자리로 옮겨 감. 약실 k는 자리 (k + rot) % n 을 가리킴
(function () {
  const rnd = n => Math.floor(Math.random() * n);
  const fail = m => { const e = new Error(m); e.duel = true; throw e; };
  const CREDIT = 16, TURN = 60000, NEED_EMPTY = 2, MANIP = 6;
  const COST = { pub: 1, priv: 2, rot1: 3, rot2: 4 };
  const NAMES = { pub: '공개조사', priv: '비공개조사', rot1: '1칸 회전', rot2: '2칸 회전', manip: '조작', pass: '패스' };
  const seatOf = (S, ch) => (ch + S.rot) % S.n, chOf = (S, seat) => ((seat - S.rot) % S.n + S.n) % S.n;

  const MULTI = {
    seats: o => Math.max(4, Math.min(6, Number(o && o.n) || 5)),
    init(prev, o, seats) {
      const n = seats.length, lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1, B = n <= 4 ? 1 : 2;
      const ch = Array(n).fill(0); let k = 0; while (k < B) { const i = rnd(n); if (!ch[i]) { ch[i] = 1; k++; } }
      // 선은 추첨 (선부터 시계 방향)
      const S = { mid: Math.random().toString(36).slice(2, 9), lv, n, B, ch, rot: rnd(n), turn: rnd(n), pool: 0, phase: 'play', at: Date.now() + 3500, deadline: 0, pend: null, fire: null, round: 1,
        players: seats.map((x, seat) => ({ id: seat, name: x.name, bot: !!x.bot, credit: CREDIT, priv: [], lost: false })), pub: [], log: [] };
      S.first = S.turn; S.log.push(`추첨으로 선: ${S.players[S.turn].name}`);
      if (S.players.every(p => p.bot)) S.at = Date.now();
      return S;
    },
    adj(S, i) { i = Number(i); if (!(i >= 0 && i < S.n)) fail('약실을 고르세요.'); return [i, (i + 1) % S.n]; },
    act(S, seat, a, now = Date.now()) {
      if (S.phase !== 'play') fail('지금은 행동할 수 없어요.');
      if (S.turn !== seat) fail('내 차례가 아니에요.');
      const p = S.players[seat];
      if (S.pend) { // 조작 발동: 두 약실 선택
        if (a.type !== 'swap') fail('조작할 두 약실을 고르세요.');
        const [x, y] = MULTI.adj(S, a.i); const t = S.ch[x]; S.ch[x] = S.ch[y]; S.ch[y] = t; S.pend = null;
        p.priv.push({ t: now, kind: 'swap', chs: [x, y] }); return MULTI.next(S, now);
      }
      const k = a.type;
      if (k === 'pub' || k === 'priv') {
        if (p.credit < COST[k]) fail('크레딧이 모자라요.'); const [x, y] = MULTI.adj(S, a.i); p.credit -= COST[k];
        const r = { t: now, kind: k, by: seat, chs: [x, y], res: [S.ch[x], S.ch[y]] };
        if (k === 'pub') { S.pub.push(r); S.log.push(`${p.name}: 공개조사 — 약실 ${x + 1} ${r.res[0] ? '총알' : '빈칸'}, 약실 ${y + 1} ${r.res[1] ? '총알' : '빈칸'}`); }
        else { p.priv.push(r); S.pub.push({ t: now, kind: 'hidden', by: seat }); S.log.push(`${p.name}: 비공개 행동`); }
      } else if (k === 'rot1' || k === 'rot2') {
        if (p.credit < COST[k]) fail('크레딧이 모자라요.'); p.credit -= COST[k]; S.rot = (S.rot + (k === 'rot1' ? 1 : 2)) % S.n;
        S.pub.push({ t: now, kind: k, by: seat }); S.log.push(`${p.name}: ${NAMES[k]}`);
      } else if (k === 'manip') {
        const amt = Math.round(Number(a.amt)); if (!(amt >= 1 && amt <= 3)) fail('1~3개를 넣을 수 있어요.'); if (p.credit < amt) fail('크레딧이 모자라요.');
        p.credit -= amt; S.pool += amt; p.priv.push({ t: now, kind: 'manip', amt }); S.pub.push({ t: now, kind: 'hidden', by: seat }); S.log.push(`${p.name}: 비공개 행동`);
        if (S.pool >= MANIP) { S.pool = 0; S.pend = { by: seat }; return; } // 같은 차례에 두 약실을 고름
      } else if (k === 'pass') { S.pub.push({ t: now, kind: 'hidden', by: seat }); S.log.push(`${p.name}: 비공개 행동`); }
      else fail('알 수 없는 행동이에요.');
      MULTI.next(S, now);
    },
    next(S, now) {
      if (S.players.filter(p => p.credit <= 0).length >= NEED_EMPTY) return MULTI.startFire(S, now);
      S.turn = (S.turn + 1) % S.n; if (S.turn === S.first) S.round++;
      S.deadline = now + TURN; S.at = now + 700;
    },
    startFire(S, now) {
      S.phase = 'fire'; const start = seatOf(S, 0); // 총구 = 약실 1이 가리키는 자리부터
      const seq = []; for (let k = 0; k < S.n; k++) { const seat = (start + k) % S.n, c = chOf(S, seat); seq.push({ seat, ch: c, hit: !!S.ch[c] }); }
      S.fire = { seq, at: now + 1500 }; S.log.push('격발이 시작됐어요!');
      seq.forEach(x => { if (x.hit) S.players[x.seat].lost = true; });
      S.at = now + 1500 + seq.length * 1400 + 1500;
    },
    aiTurn(S, now) {
      const p = S.players[S.turn], lv = S.lv;
      if (S.pend) return MULTI.act(S, p.id, { type: 'swap', i: chOf(S, p.id) }, now); // 내 약실과 옆 약실을 바꿈
      // 내 약실 상태 추정: 가장 최근에 본 결과(공개+내 비공개)
      const my = chOf(S, p.id); let known = null, kt = 0;
      for (const r of S.pub.concat(p.priv)) if ((r.kind === 'pub' || r.kind === 'priv') && r.chs) r.chs.forEach((c, j) => { if (c === my && r.t >= kt) { known = r.res[j]; kt = r.t; } });
      const rotsAfter = S.pub.some(r => (r.kind === 'rot1' || r.kind === 'rot2') && r.t > kt);
      if (rotsAfter) known = null;
      const smart = Math.random() < [.4, .7, .9][lv];
      if (smart && known === 1 && p.credit >= 3) return MULTI.act(S, p.id, { type: p.credit >= 4 && Math.random() < .4 ? 'rot2' : 'rot1' }, now);
      if (smart && known === 1 && p.credit >= 1) return MULTI.act(S, p.id, { type: 'manip', amt: Math.min(3, p.credit) }, now);
      if (known == null && p.credit >= 2 && Math.random() < .5) return MULTI.act(S, p.id, { type: 'priv', i: my }, now);
      if (known == null && p.credit >= 1) return MULTI.act(S, p.id, { type: 'pub', i: Math.random() < .5 ? my : (my - 1 + S.n) % S.n }, now);
      if (p.credit >= 1) { const c = [['pub', 1], ['manip', 1], ['rot1', 3]].filter(([, x]) => p.credit >= x); const [t] = c[rnd(c.length)]; return MULTI.act(S, p.id, t === 'manip' ? { type: t, amt: Math.min(3, p.credit) } : t === 'pub' ? { type: t, i: rnd(S.n) } : { type: t }, now); }
      return MULTI.act(S, p.id, { type: 'pass' }, now);
    },
    tick(S, now = Date.now()) {
      if (S.phase === 'over') return false;
      if (S.at && now < S.at) return false;
      if (S.phase === 'fire') { S.phase = 'over'; return true; }
      const p = S.players[S.turn];
      if (!S.deadline) { S.deadline = now + TURN; return true; }
      if (p.credit <= 0 && !S.pend) { S.pub.push({ t: now, kind: 'hidden', by: p.id }); S.log.push(`${p.name}: 비공개 행동`); MULTI.next(S, now); return true; } // 크레딧이 없으면 자동 패스
      if (p.bot) { try { MULTI.aiTurn(S, now); } catch (e) { MULTI.act(S, p.id, { type: 'pass' }, now); } S.at = Math.max(S.at || 0, now + 900); return true; }
      if (now >= S.deadline) { if (S.pend) MULTI.act(S, p.id, { type: 'swap', i: 0 }, now); else { p.credit = Math.max(0, p.credit - 1); S.log.push(`${p.name}: 시간 초과 · 크레딧 1개 잃음`); S.pub.push({ t: now, kind: 'hidden', by: p.id }); MULTI.next(S, now); } return true; }
      return false;
    },
    view(S, seat) {
      const now = Date.now(), me = S.players[seat], over = S.phase === 'over' || S.phase === 'fire';
      return { mid: S.mid, me: seat, n: S.n, B: S.B, rot: S.rot, turn: S.turn, round: S.round, phase: S.phase, pend: S.pend && S.pend.by === seat, left: S.deadline ? Math.max(0, S.deadline - now) : 0,
        credit: me ? me.credit : 0, priv: me ? me.priv : [], pub: S.pub.slice(-40), fire: S.fire ? { seq: S.fire.seq, ago: now - S.fire.at } : null, ch: over ? S.ch : null,
        players: S.players.map(p => ({ id: p.id, name: p.name, bot: p.bot, lost: over ? p.lost : false, empty: false })), log: S.log.slice(-40) };
    },
  };
  const ENG = { MULTI, chOf, seatOf };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  const { h, esc } = LAB;
  LAB.add({
    id: 'roulette', name: '러시안 룰렛', show: '데블스플랜',
    rules: `<ul>
      <li>총알의 위치를 추적해 <b>마지막 격발 순간</b>에 총알을 피하는 게임이에요. 4~6인.</li>
      <li>자리는 추첨으로 정해요. 1번 자리부터 시계 방향으로 돌아가며 행동해요.</li>
      <li>총에는 자리 수만큼 약실이 있고, 그중 일부(4인 1발, 5~6인 2발)에 총알이 들어 있어요. 약실마다 마주 보는 자리가 있어요.</li>
      <li>각자 <b>크레딧 16개</b>로 시작해요. 내 차례에 행동 하나를 고르고 크레딧을 써요.</li>
      <li><b>공개조사(1)</b>: 붙어 있는 약실 2개에 총알이 있는지 모두에게 공개. <b>비공개조사(2)</b>: 결과는 나만 봐요. 어느 약실을 봤는지도 안 알려져요.</li>
      <li><b>1칸 회전(3)</b>·<b>2칸 회전(4)</b>: 약실이 시계 방향으로 돌아 옆자리로 옮겨 가요. 모두에게 공개.</li>
      <li><b>조작(누적 6)</b>: 한 번에 1~3개씩 넣고, 넣은 크레딧은 모두의 것이 한곳에 쌓여요(누적은 아무도 몰라요). 내가 넣어 6을 채우면 붙어 있는 두 약실을 몰래 맞바꿔요. 나도 결과는 못 봐요.</li>
      <li>비공개조사·조작·패스는 모두 "<b>비공개 행동</b>"으로만 알려져요. 남은 크레딧도 나만 알아요. 크레딧이 없으면 자동으로 패스, 60초를 넘기면 크레딧 1개를 잃어요.</li>
      <li>크레딧을 모두 쓴 사람이 <b>2명</b>이 되는 순간 예고 없이 <b>격발</b>! 총구가 가리키는 자리부터 시계 방향으로 한 발씩 쏘고, 총알이 든 약실 앞자리가 패배해요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers(); LAB.paused = false;
      let lastRoom = null, pend = { n: 5, lv: 1, opp: 'ai' }, S = null, net = null, V = null, recvAt = 0, busy = false, ended = false, shownMid = null, sel = null, amt = 1, fireShown = false;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap"><div class="g-main card">
        <div class="dn-lobby" id="rrLobby" hidden></div>
        <div id="rrGame" hidden>
          <div class="qz-top"><span id="rrR"></span><b class="qz-time" id="rrTime"></b><span id="rrCr"></span></div>
          <div class="rr-stage"><svg id="rrSvg" viewBox="-120 -120 240 240" class="rr-svg" aria-label="실린더와 자리"></svg></div>
          <div class="rr-act" id="rrAct"></div>
          <p class="g-msg" id="rrMsg"></p>
          <div class="rr-know" id="rrKnow"></div>
          <div id="rrAgain"></div>
        </div></div>
        <aside class="g-side"><div class="card"><h3>진행 기록</h3><div class="log" id="rrLog"></div></div></aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const N_OPTS = { key: 'n', label: '인원', opts: [[4, '4인'], [5, '5인'], [6, '6인']], def: 5 }, L_OPTS = { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 };
      const front = LAB.duelFront({ el: $('rrLobby'), gameEl: $('rrGame'), friendLabel: '친구와 하기 (4~6인, 빈자리는 AI)', soloLabel: 'AI와 하기',
        soloOpts: [{ ...N_OPTS, label: '인원 (나 + AI)' }, L_OPTS], roomOpts: [N_OPTS, L_OPTS], onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T.clear(); if (net) { net.close(); net = null; } S = null; V = null; ended = false; shownMid = null; sel = null; fireShown = false; $('rrLog').innerHTML = ''; }
      function start() {
        reset();
        if (pend.opp === 'net') { net = LAB.duel('roulette', { front, el: $('rrLobby'), opts: () => ({ n: pend.n, lv: pend.lv }), onView: v => { lastRoom = v; if (!v.st) return; recvAt = Date.now(); show(v.st); }, onError: m => { $('rrMsg').textContent = m; } }); net.start(); }
        else {
          const seats = [{ name: '나' }, ...Array.from({ length: pend.n - 1 }, (_, k) => ({ name: 'AI ' + (k + 1), bot: true }))];
          S = MULTI.init(null, { lv: pend.lv }, seats); S.at = Date.now() + 600;
          front.solo(`AI와 하기 · ${pend.n}인`);
          local(); T.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 150);
        }
        T.every(paint, 250);
      }
      function local() { recvAt = Date.now(); show(MULTI.view(S, 0)); }
      async function send(a) { if (busy) return; if (net) { busy = true; const er = await net.act(a); busy = false; if (er) $('rrMsg').textContent = er; return; } try { MULTI.act(S, 0, a); } catch (e) { $('rrMsg').textContent = e.message; } local(); }
      wrap.addEventListener('click', e => {
        const c = e.target.closest('[data-ch]'); if (c && V) { sel = +c.dataset.ch; draw(); return; }
        const b = e.target.closest('[data-a]'); if (!b || b.disabled || !V) return; const a = b.dataset.a;
        if (a === 'pub' || a === 'priv' || a === 'swap') { if (sel == null) { $('rrMsg').textContent = '먼저 실린더에서 약실을 누르세요 (누른 약실과 시계 방향 옆 약실 2개)'; return; } send({ type: a, i: sel }); sel = null; }
        else if (a === 'manip') send({ type: 'manip', amt });
        else if (a === 'am') { amt = +b.dataset.v; draw(); }
        else send({ type: a });
      });
      wrap.addEventListener('click', e => { if (e.target.closest('[data-again]')) send({ type: 'again' }); });
      function paint() { if (!V) return; const s = Math.ceil(Math.max(0, V.left - (Date.now() - recvAt)) / 1000); $('rrTime').textContent = V.phase === 'play' ? `${V.turn === V.me ? '내 차례' : esc(V.players[V.turn].name)} ${s}초` : V.phase === 'fire' ? '격발!' : ''; }
      // 알려진 정보: 약실마다 가장 최근 결과. 그 뒤에 '비공개 행동'이 있었으면 조작됐을 수 있어 흐리게
      function knowledge(v) {
        const K = Array(v.n).fill(null);
        const all = v.pub.filter(r => r.kind === 'pub').concat(v.priv.filter(r => r.kind === 'priv')).sort((a, b) => a.t - b.t);
        for (const r of all) r.chs.forEach((c, j) => { K[c] = { v: r.res[j], t: r.t, mine: r.kind === 'priv' }; });
        const hid = v.pub.filter(r => r.kind === 'hidden' && r.by !== v.me).map(r => r.t), mySwap = v.priv.filter(r => r.kind === 'swap');
        K.forEach((k, c) => { if (k) k.stale = hid.some(t => t > k.t) || mySwap.some(s => s.t > k.t && s.chs.includes(c)); });
        return K;
      }
      function draw() {
        const v = V; if (!v) return; const n = v.n, K = knowledge(v), R = 92, r = 46;
        const firing = v.fire ? v.fire.seq.slice(0, Math.max(0, Math.floor((v.fire.ago + (Date.now() - recvAt)) / 1400))) : [];
        let o = `<circle r="${r + 20}" class="rr-cyl"/>`;
        for (let c = 0; c < n; c++) { const seat = (c + v.rot) % n, ang = -Math.PI / 2 + seat * 2 * Math.PI / n, x = Math.cos(ang) * r, y = Math.sin(ang) * r, k = K[c];
          const shown = v.ch ? (v.ch[c] ? 'b' : 'e') : k ? (k.v ? 'b' : 'e') : '';
          o += `<g class="rr-ch ${sel === c ? 'sel' : ''} ${v.pend || sel === c || true ? 'tap' : ''}" data-ch="${c}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15" class="rr-hole ${shown} ${k && k.stale && !v.ch ? 'stale' : ''}"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}">${c + 1}</text></g>`; }
        if (sel != null) { const a1 = -Math.PI / 2 + ((sel + v.rot) % n) * 2 * Math.PI / n, a2 = a1 + 2 * Math.PI / n; o += `<path class="rr-pair" d="M${(Math.cos(a1) * r).toFixed(1)} ${(Math.sin(a1) * r).toFixed(1)} A${r} ${r} 0 0 1 ${(Math.cos(a2) * r).toFixed(1)} ${(Math.sin(a2) * r).toFixed(1)}"/>`; }
        for (let s = 0; s < n; s++) { const ang = -Math.PI / 2 + s * 2 * Math.PI / n, x = Math.cos(ang) * R, y = Math.sin(ang) * R, p = v.players[s], f = firing.find(q => q.seat === s);
          o += `<g class="rr-seat ${s === v.me ? 'me' : ''} ${s === v.turn && v.phase === 'play' ? 'turn' : ''} ${f ? (f.hit ? 'hit' : 'safe') : ''}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="17"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}">${s + 1}</text><text class="nm" x="${x.toFixed(1)}" y="${(y + (y > 0 ? 30 : -22)).toFixed(1)}">${esc(s === v.me ? '나' : p.name)}${f ? (f.hit ? ' 💥' : ' 찰칵') : ''}</text></g>`; }
        // 총구: 약실 1이 가리키는 자리
        const mz = -Math.PI / 2 + (v.rot % n) * 2 * Math.PI / n; o += `<path class="rr-muz" d="M0 0 L${(Math.cos(mz) * 24).toFixed(1)} ${(Math.sin(mz) * 24).toFixed(1)}"/><circle r="6" class="rr-hub"/>`;
        $('rrSvg').innerHTML = o;
        const myTurn = v.phase === 'play' && v.turn === v.me;
        $('rrAct').innerHTML = !myTurn ? '' : v.pend ? `<div class="rr-row"><b>조작 발동!</b> 바꿀 두 약실을 고르세요 (누른 약실 + 시계 방향 옆)</div><button type="button" class="primary" data-a="swap">${sel != null ? `약실 ${sel + 1} ↔ ${(sel + 1) % n + 1} 맞바꾸기` : '약실을 먼저 누르세요'}</button>`
          : `<div class="rr-btns">
            <button type="button" data-a="pub" ${v.credit < 1 ? 'disabled' : ''}>공개조사 <small>1</small></button>
            <button type="button" data-a="priv" ${v.credit < 2 ? 'disabled' : ''}>비공개조사 <small>2</small></button>
            <button type="button" data-a="rot1" ${v.credit < 3 ? 'disabled' : ''}>1칸 회전 <small>3</small></button>
            <button type="button" data-a="rot2" ${v.credit < 4 ? 'disabled' : ''}>2칸 회전 <small>4</small></button></div>
            <div class="rr-row"><span>조작에 넣기</span>${[1, 2, 3].map(k => `<button type="button" class="${amt === k ? 'on' : ''}" data-a="am" data-v="${k}" ${v.credit < k ? 'disabled' : ''}>${k}</button>`).join('')}<button type="button" data-a="manip" ${v.credit < amt ? 'disabled' : ''}>조작</button><button type="button" data-a="pass">패스</button></div>
            <p class="muted rr-hint">${sel != null ? `조사 대상: 약실 ${sel + 1} · ${(sel + 1) % n + 1}` : '조사하려면 실린더에서 약실을 먼저 누르세요'}</p>`;
        $('rrKnow').innerHTML = `<div class="rr-k"><span class="rr-hole b"></span>총알 <span class="rr-hole e"></span>빈칸 <span class="rr-hole b stale"></span>그 뒤 비공개 행동이 있었음(조작됐을 수 있어요)</div>`;
      }
      function show(v) {
        V = v;
        if (v.mid !== shownMid) { shownMid = v.mid; fireShown = false; }
        $('rrR').textContent = `${v.round}바퀴째 · 총알 ${v.B}발`; $('rrCr').textContent = `내 크레딧 ${v.credit}`;
        $('rrMsg').textContent = v.phase === 'fire' ? '격발! 총구가 가리키는 자리부터 한 발씩…' : v.phase === 'over' ? (v.players[v.me].lost ? '총알을 맞았어요…' : '살아남았어요!') : v.turn === v.me ? (v.pend ? '조작할 약실을 고르세요' : '행동을 고르세요') : `${v.players[v.turn].name} 차례`;
        if (v.phase === 'fire' && !fireShown) { fireShown = true; if (window.GameFX) GameFX.banner('격발', '크레딧을 다 쓴 사람이 2명이 됐어요'); T.every(draw, 300); }
        draw();
        $('rrLog').innerHTML = v.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('rrAgain').innerHTML = v.phase === 'over' && net ? LAB.againHtml(lastRoom, v.me) : '';
        if (v.phase === 'over' && !ended) { ended = true; const lost = v.players[v.me].lost, losers = v.players.filter(p => p.lost).map(p => p.id === v.me ? '나' : p.name);
          T.set(() => LAB.end(lost ? '패배' : '생존', `총알을 맞은 사람: ${losers.join(', ') || '없음'}`, net ? null : start), 1200); }
      }
      if (LAB.roomParam()) { pend.opp = 'net'; start(); } else front.menu();
    },
  });
})();
