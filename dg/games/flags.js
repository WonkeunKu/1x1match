// 만국기 (데블스플랜) — 국기 10개를 1초씩 3번 보고, 25개 중에서 처음 본 국기 5개 고르기. 쉬움·보통·어려움 3라운드
(function () {
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fail = m => { const e = new Error(m); e.duel = true; throw e; };
  // 국기: [이름, 무리(비슷한 모양끼리), 그리기 명령]. 그리기는 30×20 판 기준
  // h:가로 줄(색들, 비율) v:세로 줄 · c:원(x,y,r,색) · x:북유럽 십자(색, 굵기, [안쪽색]) · p:가운데 십자 · s:별(x,y,r,색) · t:깃대쪽 삼각형(색, 길이) · d:마름모 · q:왼쪽 위 네모(색, 가로, 세로)
  const F = {
    fr: ['프랑스', 'v3', [['v', ['#0055A4', '#fff', '#EF4135']]]], it: ['이탈리아', 'v3', [['v', ['#009246', '#fff', '#CE2B37']]]], ie: ['아일랜드', 'v3', [['v', ['#169B62', '#fff', '#FF883E']]]],
    be: ['벨기에', 'v3', [['v', ['#000', '#FDDA24', '#EF3340']]]], ro: ['루마니아', 'v3', [['v', ['#002B7F', '#FCD116', '#CE1126']]]], td: ['차드', 'v3', [['v', ['#002664', '#FECB00', '#C60C30']]]],
    ml: ['말리', 'v3', [['v', ['#14B53A', '#FCD116', '#CE1126']]]], gn: ['기니', 'v3', [['v', ['#CE1126', '#FCD116', '#009460']]]], ng: ['나이지리아', 'v3', [['v', ['#008751', '#fff', '#008751']]]],
    pe: ['페루', 'v3', [['v', ['#D91023', '#fff', '#D91023']]]], ci: ['코트디부아르', 'v3', [['v', ['#F77F00', '#fff', '#009E60']]]], mx: ['멕시코', 'v3', [['v', ['#006847', '#fff', '#CE1126']], ['c', 15, 10, 2.6, '#8C6A3E']]],
    de: ['독일', 'h3', [['h', ['#000', '#DD0000', '#FFCE00']]]], ru: ['러시아', 'h3', [['h', ['#fff', '#0039A6', '#D52B1E']]]], nl: ['네덜란드', 'h3', [['h', ['#AE1C28', '#fff', '#21468B']]]],
    lu: ['룩셈부르크', 'h3', [['h', ['#ED2939', '#fff', '#00A1DE']]]], hu: ['헝가리', 'h3', [['h', ['#CD2A3E', '#fff', '#436F4D']]]], bg: ['불가리아', 'h3', [['h', ['#fff', '#00966E', '#D62612']]]],
    at: ['오스트리아', 'h3', [['h', ['#ED2939', '#fff', '#ED2939']]]], ee: ['에스토니아', 'h3', [['h', ['#0072CE', '#000', '#fff']]]], lt: ['리투아니아', 'h3', [['h', ['#FDB913', '#006A44', '#C1272D']]]],
    am: ['아르메니아', 'h3', [['h', ['#D90012', '#0033A0', '#F2A800']]]], ye: ['예멘', 'h3', [['h', ['#CE1126', '#fff', '#000']]]], ga: ['가봉', 'h3', [['h', ['#009E60', '#FCD116', '#3A75C4']]]],
    sl: ['시에라리온', 'h3', [['h', ['#1EB53A', '#fff', '#0072C6']]]], bo: ['볼리비아', 'h3', [['h', ['#D52B1E', '#F9E300', '#007934']]]], co: ['콜롬비아', 'h3', [['h', ['#FCD116', '#003893', '#CE1126'], [2, 1, 1]]]],
    id: ['인도네시아', 'h2', [['h', ['#CE1126', '#fff']]]], pl: ['폴란드', 'h2', [['h', ['#fff', '#DC143C']]]], ua: ['우크라이나', 'h2', [['h', ['#0057B7', '#FFD700']]]],
    jp: ['일본', 'circ', [['h', ['#fff']], ['c', 15, 10, 6, '#BC002D']]], bd: ['방글라데시', 'circ', [['h', ['#006A4E']], ['c', 13.5, 10, 6, '#F42A41']]], pw: ['팔라우', 'circ', [['h', ['#4AADD6']], ['c', 13.5, 10, 6, '#FFDE00']]],
    la: ['라오스', 'circ', [['h', ['#CE1126', '#002868', '#CE1126'], [1, 2, 1]], ['c', 15, 10, 4, '#fff']]], ar: ['아르헨티나', 'circ', [['h', ['#74ACDF', '#fff', '#74ACDF']], ['c', 15, 10, 2.4, '#F6B40E']]],
    in: ['인도', 'circ', [['h', ['#FF9933', '#fff', '#138808']], ['c', 15, 10, 2.6, '#000080'], ['c', 15, 10, 2, '#fff'], ['c', 15, 10, .6, '#000080']]],
    dk: ['덴마크', 'nord', [['h', ['#C8102E']], ['x', '#fff', 2.6]]], se: ['스웨덴', 'nord', [['h', ['#006AA7']], ['x', '#FECC00', 3]]], no: ['노르웨이', 'nord', [['h', ['#BA0C2F']], ['x', '#fff', 4.4, '#00205B', 2]]],
    fi: ['핀란드', 'nord', [['h', ['#fff']], ['x', '#002F6C', 3.6]]], is: ['아이슬란드', 'nord', [['h', ['#02529C']], ['x', '#fff', 4.4, '#DC1E35', 2]]], ch: ['스위스', 'nord', [['h', ['#DA291C']], ['p', '#fff']]],
    vn: ['베트남', 'star', [['h', ['#DA251D']], ['s', 15, 10.5, 6, '#FFFF00']]], cn: ['중국', 'star', [['h', ['#DE2910']], ['s', 6, 6, 3.6, '#FFDE00'], ['s', 11, 2.4, 1, '#FFDE00'], ['s', 12.6, 4.6, 1, '#FFDE00'], ['s', 12.6, 7.6, 1, '#FFDE00'], ['s', 11, 9.6, 1, '#FFDE00']]],
    ma: ['모로코', 'star', [['h', ['#C1272D']], ['s', 15, 10.5, 5, '#006233']]], so: ['소말리아', 'star', [['h', ['#4189DD']], ['s', 15, 10.5, 5, '#fff']]], gh: ['가나', 'star', [['h', ['#CE1126', '#FCD116', '#006B3F']], ['s', 15, 10.5, 3.2, '#000']]],
    cz: ['체코', 'tri', [['h', ['#fff', '#D7141A']], ['t', '#11457E', 15]]], ph: ['필리핀', 'tri', [['h', ['#0038A8', '#CE1126']], ['t', '#fff', 15], ['c', 5, 10, 1.6, '#FCD116']]], kw: ['쿠웨이트', 'tri', [['h', ['#007A3D', '#fff', '#CE1126']], ['t', '#000', 8]]],
    jo: ['요르단', 'tri', [['h', ['#000', '#fff', '#007A3D']], ['t', '#CE1126', 14]]], ps: ['팔레스타인', 'tri', [['h', ['#000', '#fff', '#009736']], ['t', '#EE2A35', 12]]], sd: ['수단', 'tri', [['h', ['#D21034', '#fff', '#000']], ['t', '#007229', 11]]],
    th: ['태국', 'band', [['h', ['#A51931', '#F4F5F8', '#2D2A4A', '#F4F5F8', '#A51931'], [1, 1, 2, 1, 1]]]], cr: ['코스타리카', 'band', [['h', ['#002B7F', '#fff', '#CE1126', '#fff', '#002B7F'], [1, 1, 2, 1, 1]]]],
    br: ['브라질', 'dia', [['h', ['#009C3B']], ['d', '#FFDF00'], ['c', 15, 10, 4.2, '#002776']]], us: ['미국', 'band', [['h', ['#B22234', '#fff', '#B22234', '#fff', '#B22234', '#fff', '#B22234', '#fff', '#B22234', '#fff', '#B22234', '#fff', '#B22234']], ['q', '#3C3B6E', 12, 10.8], ['dots', 12, 10.8]]],
    gr: ['그리스', 'band', [['h', ['#0D5EAF', '#fff', '#0D5EAF', '#fff', '#0D5EAF', '#fff', '#0D5EAF', '#fff', '#0D5EAF']], ['q', '#0D5EAF', 11.1, 11.1], ['qx', '#fff', 11.1, 11.1]]],
    kr: ['대한민국', 'circ', [['h', ['#fff']], ['tg']]], tr: ['튀르키예', 'star', [['h', ['#E30A17']], ['c', 11, 10, 5, '#fff'], ['c', 12.3, 10, 4, '#E30A17'], ['s', 17.2, 10, 2.2, '#fff']]],
  };
  const IDS = Object.keys(F);
  const SHOW_MS = 1000, CYCLES = 3, PICK_MS = 60000, GAP = 4000, ROUNDS = 3;
  const SPEC = [{ name: '쉬움', near: 0 }, { name: '보통', near: .5 }, { name: '어려움', near: .9 }];
  // 라운드 문제: 본 국기 10개, 그중 정답 5개 + 헷갈리는 오답 20개 (어려울수록 같은 무리에서 고름)
  function makeRound(r) {
    const seen = shuffle(IDS.slice()).slice(0, 10), ans = shuffle(seen.slice()).slice(0, 5);
    const pool = IDS.filter(x => !seen.includes(x)), fam = new Set(seen.map(x => F[x][1]));
    const near = shuffle(pool.filter(x => fam.has(F[x][1]))), far = shuffle(pool.filter(x => !fam.has(F[x][1])));
    const wrong = [];
    while (wrong.length < 20) { const src = Math.random() < SPEC[r].near && near.length ? near : far.length ? far : near; if (!src.length) break; wrong.push(src.pop()); }
    return { seen, ans, grid: shuffle(ans.concat(wrong)) };
  }
  const AI_MEM = [.45, .65, .85];

  const MULTI = {
    seats: o => Math.max(1, Math.min(8, Number(o && o.n) || 4)),
    init(prev, o, seats) {
      const lv = [0, 1, 2].includes(Number(o && o.lv)) ? Number(o.lv) : 1;
      return { mid: Math.random().toString(36).slice(2, 9), lv, solo: seats.length === 1, r: -1, phase: 'gap', at: Date.now() + 3500, R: null, winner: -1,
        players: seats.map((x, i) => ({ id: i, name: x.name, bot: !!x.bot, pts: 0, pick: [], got: [] })), log: [] };
    },
    startRound(S, now) {
      S.r++; S.R = makeRound(S.r); S.phase = 'show'; S.showAt = now; S.at = now + 10 * SHOW_MS * CYCLES + 600;
      for (const p of S.players) { p.pick = []; if (p.bot) { const mem = AI_MEM[S.lv] - S.r * .08; const right = S.R.ans.filter(() => Math.random() < mem); const rest = shuffle(S.R.grid.filter(x => !S.R.ans.includes(x))); p.aiPick = right.concat(rest.slice(0, Math.max(0, Math.min(5 - right.length, rnd(3))))); p.aiAt = 0; } }
    },
    act(S, seat, a) {
      const p = S.players[seat]; if (!p) fail('자리가 없어요.');
      if (a.type !== 'pick') fail('알 수 없는 행동이에요.');
      if (S.phase !== 'pick') fail('지금은 고를 수 없어요.');
      const id = String(a.id); if (!S.R.grid.includes(id)) fail('없는 국기예요.');
      if (p.pick.includes(id)) p.pick = p.pick.filter(x => x !== id); else { if (p.pick.length >= 5) fail('5개까지 고를 수 있어요. 다시 누르면 선택이 풀려요.'); p.pick.push(id); }
    },
    endRound(S, now) {
      for (const p of S.players) { const g = p.pick.filter(x => S.R.ans.includes(x)).length; p.got.push(g); p.pts += g; }
      S.log.push(`${S.r + 1}라운드(${SPEC[S.r].name}) · ${S.players.map(p => `${p.name} ${p.got[S.r]}`).join(', ')}`);
      S.phase = S.r >= ROUNDS - 1 ? 'over' : 'result'; S.at = now + (S.phase === 'over' ? 0 : GAP + 3000);
      if (S.phase === 'over') { const best = Math.max(...S.players.map(p => p.pts)); S.winner = S.players.find(p => p.pts === best).id; }
    },
    tick(S, now = Date.now()) {
      if (S.phase === 'over') return false;
      if (S.phase === 'gap' || S.phase === 'result') { if (now >= S.at) { MULTI.startRound(S, now); return true; } return false; }
      if (S.phase === 'show') { if (now >= S.at) { S.phase = 'pick'; S.pickAt = now; S.at = now + PICK_MS; for (const p of S.players) if (p.bot) p.aiAt = now + 6000 + rnd(30000); return true; } return false; }
      if (S.phase === 'pick') {
        let ch = false;
        for (const p of S.players) if (p.bot && p.aiAt && now >= p.aiAt) { p.pick = p.aiPick.slice(0, 5); p.aiAt = 0; ch = true; }
        const humansDone = S.players.every(p => p.bot || p.pick.length >= 5 || p.ready);
        if (now >= S.at || (humansDone && S.players.every(p => !p.bot || !p.aiAt))) { MULTI.endRound(S, now); return true; }
        return ch;
      }
      return false;
    },
    view(S, seat) {
      const now = Date.now(), me = S.players[seat], R = S.R, open = S.phase === 'result' || S.phase === 'over';
      return { mid: S.mid, me: seat, phase: S.phase, r: S.r, rounds: ROUNDS, spec: S.r >= 0 ? SPEC[S.r].name : '', solo: S.solo, winner: S.winner,
        seen: R && S.phase === 'show' ? R.seen : null, showAgo: S.phase === 'show' ? now - S.showAt : 0, grid: R && S.phase !== 'show' ? R.grid : null, ans: R && open ? R.ans : null, seenAll: R && open ? R.seen : null,
        left: S.at ? Math.max(0, S.at - now) : 0, mine: me ? me.pick : [],
        players: S.players.map(p => ({ id: p.id, name: p.name, bot: p.bot, pts: p.pts, got: p.got, n: p.pick.length, pick: open ? p.pick : null })), log: S.log.slice(-20) };
    },
  };
  const ENG = { MULTI, F, makeRound };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  const { h, esc } = LAB;
  function star(cx, cy, r) { let d = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .4 : r; d += (k ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2); } return d + 'Z'; }
  function flagSVG(id) {
    const ops = F[id][2]; let o = '';
    for (const op of ops) {
      const t = op[0];
      if (t === 'h' || t === 'v') { const cols = op[1], w = op[2] || cols.map(() => 1), tot = w.reduce((a, b) => a + b, 0); let acc = 0;
        cols.forEach((c, k) => { const s = acc / tot, e = (acc + w[k]) / tot; acc += w[k]; o += t === 'h' ? `<rect x="0" y="${(s * 20).toFixed(2)}" width="30" height="${((e - s) * 20 + .05).toFixed(2)}" fill="${c}"/>` : `<rect x="${(s * 30).toFixed(2)}" y="0" width="${((e - s) * 30 + .05).toFixed(2)}" height="20" fill="${c}"/>`; }); }
      else if (t === 'c') o += `<circle cx="${op[1]}" cy="${op[2]}" r="${op[3]}" fill="${op[4]}"/>`;
      else if (t === 'x') { const [, c, w, c2, w2] = op; o += `<rect x="0" y="${10 - w / 2}" width="30" height="${w}" fill="${c}"/><rect x="${10.5 - w / 2}" y="0" width="${w}" height="20" fill="${c}"/>`; if (c2) o += `<rect x="0" y="${10 - w2 / 2}" width="30" height="${w2}" fill="${c2}"/><rect x="${10.5 - w2 / 2}" y="0" width="${w2}" height="20" fill="${c2}"/>`; }
      else if (t === 'p') o += `<rect x="13.2" y="4.5" width="3.6" height="11" fill="${op[1]}"/><rect x="9.5" y="8.2" width="11" height="3.6" fill="${op[1]}"/>`;
      else if (t === 's') o += `<path d="${star(op[1], op[2], op[3])}" fill="${op[4]}"/>`;
      else if (t === 't') o += `<path d="M0 0 L${op[2]} 10 L0 20 Z" fill="${op[1]}"/>`;
      else if (t === 'd') o += `<path d="M15 1.8 L28 10 L15 18.2 L2 10 Z" fill="${op[1]}"/>`;
      else if (t === 'q') o += `<rect x="0" y="0" width="${op[2]}" height="${op[3]}" fill="${op[1]}"/>`;
      else if (t === 'qx') o += `<rect x="0" y="${op[3] / 2 - 1.1}" width="${op[2]}" height="2.2" fill="${op[1]}"/><rect x="${op[2] / 2 - 1.1}" y="0" width="2.2" height="${op[3]}" fill="${op[1]}"/>`;
      else if (t === 'dots') { for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) o += `<circle cx="${(1 + c * 2).toFixed(1)}" cy="${(1.1 + r * 2.1).toFixed(1)}" r=".42" fill="#fff"/>`; }
      else if (t === 'tg') { o += `<circle cx="15" cy="10" r="5" fill="#0047A0"/><path d="M10 10 A5 5 0 0 1 20 10 A2.5 2.5 0 0 1 15 10 A2.5 2.5 0 0 0 10 10 Z" fill="#CD2E3A"/>`;
        const bar = (x, y, rot, pat) => { let g = ''; pat.forEach((full, k) => { const yy = -1.6 + k * 1.3; g += full ? `<rect x="-2" y="${yy}" width="4" height=".8" fill="#000"/>` : `<rect x="-2" y="${yy}" width="1.7" height=".8" fill="#000"/><rect x=".3" y="${yy}" width="1.7" height=".8" fill="#000"/>`; }); return `<g transform="translate(${x} ${y}) rotate(${rot})">${g}</g>`; };
        o += bar(6.2, 4.2, -56, [1, 1, 1]) + bar(23.8, 15.8, -56, [0, 0, 0]) + bar(23.8, 4.2, 56, [1, 0, 1]) + bar(6.2, 15.8, 56, [0, 1, 0]); }
    }
    return `<svg viewBox="0 0 30 20" class="flag" aria-label="${esc(F[id][0])} 국기">${o}</svg>`;
  }

  LAB.add({
    id: 'flags', name: '만국기', show: '데블스플랜',
    rules: `<ul>
      <li>국기 <b>10개</b>가 <b>1초씩</b> 차례대로 나와요. 같은 순서로 <b>3번</b> 반복해요.</li>
      <li>잠시 뒤 국기 <b>25개</b>가 한 화면에 나와요. 처음 본 국기 중 <b>5개</b>가 들어 있어요.</li>
      <li><b>60초</b> 안에 처음 본 국기를 5개까지 골라요. 다시 누르면 선택이 풀려요.</li>
      <li>시간이 끝날 때 고른 국기가 답이에요. 맞힌 국기 하나에 <b>1점</b>.</li>
      <li><b>쉬움 → 보통 → 어려움</b> 순서로 3라운드. 어려울수록 비슷하게 생긴 국기가 섞여요. 점수를 더해 순위를 정하고, 같으면 공동 순위예요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers(); LAB.paused = false;
      let lastRoom = null, pend = { n: 4, lv: 1, opp: 'ai' }, S = null, net = null, V = null, recvAt = 0, busy = false, ended = false, shownMid = null, lastR = -1, resShown = -1;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap"><div class="g-main card">
        <div class="dn-lobby" id="fgLobby" hidden></div>
        <div id="fgGame" hidden>
          <div class="qz-top"><span id="fgR"></span><b class="qz-time" id="fgTime"></b><span id="fgSel"></span></div>
          <div class="fg-stage" id="fgStage"></div>
          <p class="g-msg" id="fgMsg"></p>
          <div class="qz-players" id="fgPl"></div>
          <div id="fgAgain"></div>
        </div></div>
        <aside class="g-side"><div class="card"><h3>진행 기록</h3><div class="log" id="fgLog"></div></div></aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      const N_OPTS = { key: 'n', label: '인원', opts: [[2, '2인'], [3, '3인'], [4, '4인'], [6, '6인']], def: 4 }, L_OPTS = { key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 };
      const front = LAB.duelFront({ el: $('fgLobby'), gameEl: $('fgGame'), friendLabel: '친구와 하기 (2~6인, 빈자리는 AI)', soloLabel: 'AI와 대결', alone: { label: '혼자 하기', desc: '3라운드 15문제 중 몇 개를 맞히는지 도전해요.' },
        soloOpts: [{ ...N_OPTS, label: '인원 (나 + AI)' }, L_OPTS], roomOpts: [N_OPTS, L_OPTS], onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => reset() });
      function reset() { T.clear(); if (net) { net.close(); net = null; } S = null; V = null; ended = false; shownMid = null; lastR = -1; resShown = -1; $('fgLog').innerHTML = ''; $('fgStage').innerHTML = ''; }
      function start() {
        reset();
        if (pend.opp === 'net') { net = LAB.duel('flags', { front, el: $('fgLobby'), opts: () => ({ n: pend.n, lv: pend.lv }), onView: v => { lastRoom = v; if (!v.st) return; recvAt = Date.now(); show(v.st); }, onError: m => { $('fgMsg').textContent = m; } }); net.start(); }
        else {
          const n = pend.opp === 'alone' ? 1 : pend.n;
          const seats = [{ name: '나' }, ...Array.from({ length: n - 1 }, (_, k) => ({ name: 'AI ' + (k + 1), bot: true }))];
          S = MULTI.init(null, { lv: pend.lv }, seats); S.at = Date.now() + 600;
          front.solo(pend.opp === 'alone' ? '혼자 하기' : `AI와 대결 · ${n}인`);
          local(); T.every(() => { if (S && MULTI.tick(S, Date.now())) local(); }, 120);
        }
        T.every(paint, 100);
      }
      function local() { recvAt = Date.now(); show(MULTI.view(S, 0)); }
      async function send(a) { if (busy) return; if (net) { busy = true; const er = await net.act(a); busy = false; if (er) $('fgMsg').textContent = er; return; } try { MULTI.act(S, 0, a); } catch (e) { $('fgMsg').textContent = e.message; } local(); }
      wrap.addEventListener('click', e => { const f = e.target.closest('[data-f]'); if (f && V && V.phase === 'pick') { send({ type: 'pick', id: f.dataset.f }); return; } if (e.target.closest('[data-again]')) send({ type: 'again' }); });
      let shownIdx = -2;
      function paint() {
        if (!V) return; const ago = Date.now() - recvAt;
        if (V.phase === 'show' && V.seen) {
          const t = V.showAgo + ago, i = Math.floor(t / SHOW_MS), cyc = Math.floor(i / 10), k = i % 10;
          const idx = i >= 10 * CYCLES ? -1 : k;
          if (idx !== shownIdx) { shownIdx = idx; $('fgStage').innerHTML = idx < 0 ? '<div class="fg-wait">곧 25개가 나와요</div>' : `<div class="fg-one">${flagSVG(V.seen[idx])}<small>${cyc + 1}번째 · ${idx + 1} / 10</small></div>`; }
          $('fgTime').textContent = `${Math.min(CYCLES, cyc + 1)} / ${CYCLES}회`;
        } else { shownIdx = -2; $('fgTime').textContent = V.phase === 'pick' ? `${Math.ceil(Math.max(0, V.left - ago) / 1000)}초` : V.phase === 'result' ? `다음 라운드 ${Math.ceil(Math.max(0, V.left - ago) / 1000)}` : ''; $('fgTime').classList.toggle('warn', V.phase === 'pick' && V.left - ago < 10000); }
      }
      function show(v) {
        V = v; const me = v.players[v.me];
        if (v.mid !== shownMid) { shownMid = v.mid; lastR = -1; resShown = -1; }
        if (v.phase === 'show' && v.r !== lastR) { lastR = v.r; if (window.GameFX) GameFX.banner(`ROUND ${v.r + 1}`, `${v.spec} · 국기 10개를 1초씩 3번`); }
        $('fgR').textContent = v.r < 0 ? '곧 시작해요' : `${v.r + 1}라운드 · ${v.spec}`;
        $('fgSel').textContent = v.phase === 'pick' ? `${v.mine.length} / 5 선택` : '';
        if (v.phase === 'pick' || v.phase === 'result' || v.phase === 'over') {
          const open = !!v.ans;
          $('fgStage').innerHTML = `<div class="fg-grid">${(v.grid || []).map(id => { const sel = v.mine.includes(id), ok = open && v.ans.includes(id);
            return `<button type="button" class="fg-c ${sel ? 'sel' : ''} ${open ? (ok ? 'ok' : sel ? 'bad' : 'dim') : ''}" data-f="${id}" ${open ? 'disabled' : ''} aria-pressed="${sel}">${flagSVG(id)}${open && (ok || sel) ? `<small>${esc(F[id][0])}</small>` : ''}</button>`; }).join('')}</div>`;
        }
        if (v.phase === 'gap') $('fgStage').innerHTML = '<div class="fg-wait">곧 첫 국기가 나와요. 집중하세요!</div>';
        $('fgMsg').textContent = v.phase === 'pick' ? '처음 본 국기를 5개까지 고르세요 (다시 누르면 풀려요)' : v.phase === 'show' ? '국기를 잘 기억하세요' : v.phase === 'result' || v.phase === 'over' ? `이번 라운드 ${me.got[v.r]}개 맞힘 · 초록 테두리가 정답` : '';
        const sorted = v.players.slice().sort((a, b) => b.pts - a.pts);
        $('fgPl').innerHTML = sorted.map(p => `<div class="qz-p ${p.id === v.me ? 'me' : ''}"><span class="nm">${esc(p.id === v.me ? '나' : p.name)}</span><span class="st">${v.phase === 'pick' ? `${p.n}개 고름` : p.got.length ? p.got.map((g, k) => `R${k + 1} ${g}`).join(' · ') : ''}</span><b>${p.pts}점</b></div>`).join('');
        $('fgLog').innerHTML = v.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
        $('fgAgain').innerHTML = v.phase === 'over' && net ? LAB.againHtml(lastRoom, v.me) : '';
        if (v.phase === 'over' && !ended) { ended = true; const rk = sorted.findIndex(p => p.pts === me.pts) + 1;
          T.set(() => LAB.end(v.solo ? `${me.pts} / 15개` : `${rk}위`, v.solo ? `라운드별 ${me.got.join(' · ')}개` : `${me.pts}점 · ${v.players.length}명 중 ${rk}위`, net ? null : start), 2500); }
      }
      if (LAB.roomParam()) { pend.opp = 'net'; start(); } else front.menu();
    },
  });
})();
