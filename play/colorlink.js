// 컬러 링크 (데블스 플랜 시즌3 결승 2회전) — 같은 색 말 2개를 잇는 경로들이 서로 겹치지 않게 말을 놓는 게임. 상대 배치가 불가능하다고 보면 '불가능 선언'
(function () {
  const COLORS = 'ABCDEFGHIJKLMN'.split('');
  const MINLEN = 6; // 경로 칸 수(양 끝 말 포함) 최소
  // 판 모양: 매 게임 아래 판 중 하나를 무작위로 골라요('#'은 막힌 칸). 소용돌이는 방송에 나온 판
  const SHAPES = {
    spiral: { name: '소용돌이', rows: ['...........', '.#########.', '.#.......#.', '.#.##.##.#.', '.#.#...#.#.', '.#.#.#.#.#.', '.#.#...#.#.', '.#.#####.#.', '.#.......#.', '.####.####.', '...........'] },
    donut: { name: '도넛', rows: ['.........', '.........', '.........', '...###...', '...###...', '...###...', '.........', '.........', '.........'] },
    cross: { name: '십자', rows: ['###...###', '###...###', '###...###', '.........', '.........', '.........', '###...###', '###...###', '###...###'] },
    diamond: { name: '다이아몬드', rows: ['#####.#####', '####...####', '###.....###', '##.......##', '#.........#', '...........', '#.........#', '##.......##', '###.....###', '####...####', '#####.#####'] },
    pillars: { name: '기둥 숲', rows: ['.........', '.#..#..#.', '.........', '.........', '.#..#..#.', '.........', '.........', '.#..#..#.', '.........'] },
    hourglass: { name: '모래시계', rows: ['.........', '#.......#', '##.....##', '###...###', '###...###', '###...###', '##.....##', '#.......#', '.........'] },
    stairs: { name: '계단', rows: ['...######', '....#####', '.....####', '......###', '.......##', '........#', '.........', '#........', '##.......'] },
    rooms: { name: '네 방', rows: ['.....#.....', '.....#.....', '...........', '.....#.....', '...........', '#####.#####', '...........', '.....#.....', '...........', '.....#.....', '.....#.....'] },
    heart: { name: '하트', rows: ['##..###..##', '#....#....#', '...........', '...........', '...........', '...........', '#.........#', '##.......##', '###.....###', '####...####', '#####.#####'] },
    hshape: { name: 'H', rows: ['...###...', '...###...', '...###...', '.........', '.........', '.........', '...###...', '...###...', '...###...'] },
    maze: { name: '미로', rows: ['...........', '.###.#.###.', '.#...#...#.', '.#.#####.#.', '...#...#...', '##.#.#.#.##', '...#.#.#...', '.#.......#.', '.#.##.##.#.', '...#...#...', '.#...#...#.'] },
    frame: { name: '액자', rows: ['..........', '..........', '..######..', '..#....#..', '..#....#..', '..#....#..', '..#....#..', '..###.##..', '..........', '..........'] },
    arrow: { name: '화살표', rows: ['####.#####', '###..#####', '##...#####', '#.........', '..........', '..........', '#.........', '##...#####', '###..#####', '####.#####'] },
    zigzag: { name: '지그재그', rows: ['.........#', '.........#', '#######..#', '#........#', '#..#######', '#.........', '#.........', '#######..#', '.........#', '.........#'] },
  };
  const SHAPE_KEYS = Object.keys(SHAPES);
  function boardOf(shape) { // {N, walls:[칸...]}
    const S = SHAPES[shape];
    if (S) { const N = S.rows.length, walls = []; S.rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') walls.push(r * N + c); })); return { N, walls, shape }; }
    const N = [6, 7, 8].includes(Number(shape)) ? Number(shape) : 7; return { N, walls: [], shape: N };
  }
  // 직전 게임과 다른 판을 무작위로
  const randomShape = prev => { const ks = SHAPE_KEYS.filter(k => k !== prev); return ks[rnd(ks.length)]; };
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- 풀이기: 모든 색을 겹치지 않게 이을 수 있는지 ----------
  // pieces: { 색: [칸, 칸?] }  반환 { ok, paths:{색:[칸...]}, exhaustive }
  function solve(N, pieces, budget, walls, ms) { // ms: 시간 제한(넘으면 '모름'으로 끝냄)
    const t0 = Date.now(), lim = ms || 1e9;
    const NN = N * N, piece = new Int16Array(NN).fill(-1), used = new Uint8Array(NN);
    if (walls) for (const w of walls) used[w] = 1; // 막힌 칸은 처음부터 '쓴 칸'
    const cols = Object.keys(pieces).filter(c => pieces[c].length);
    cols.forEach((c, k) => pieces[c].forEach(i => piece[i] = k));
    const wallSet = new Set(walls || []); const nb = []; for (let i = 0; i < NN; i++) { const r = Math.floor(i / N), c = i % N, a = []; if (r) a.push(i - N); if (r < N - 1) a.push(i + N); if (c) a.push(i - 1); if (c < N - 1) a.push(i + 1); nb.push(a.filter(x => !wallSet.has(x))); }
    const free = i => piece[i] < 0 && !used[i];
    const dist = (a, b) => Math.abs(Math.floor(a / N) - Math.floor(b / N)) + Math.abs(a % N - b % N);
    let steps = 0, aborted = false;
    const paths = {};
    const comp = new Int16Array(NN), csize = [];
    function label() {
      comp.fill(-1); csize.length = 0; let id = 0;
      for (let s = 0; s < NN; s++) if (free(s) && comp[s] < 0) { let n = 0; const st = [s]; comp[s] = id;
        while (st.length) { const x = st.pop(); n++; for (const y of nb[x]) if (free(y) && comp[y] < 0) { comp[y] = id; st.push(y); } }
        csize.push(n); id++; }
    }
    const compsAround = i => { const s = new Set(); for (const y of nb[i]) if (comp[y] >= 0) s.add(comp[y]); return s; };
    // 남은 색들이 아직 이어질 가능성이 있는지 (필요조건)
    function feasible(todo, head, target, curLen) {
      label();
      if (head != null) { // 지금 그리는 경로
        const ha = compsAround(head);
        if (target != null) { if (!nb[head].includes(target) || curLen + 1 < MINLEN) { const tb = compsAround(target); let ok = false; for (const x of ha) if (tb.has(x)) { ok = true; break; } if (!ok && !(nb[head].includes(target) && curLen + 1 >= MINLEN)) return false; } }
        else if (curLen < MINLEN) { let ok = false; for (const x of ha) if (csize[x] >= MINLEN - curLen) { ok = true; break; } if (!ok) return false; }
      }
      for (const c of todo) {
        const p = pieces[c];
        if (p.length === 2) { const a = compsAround(p[0]), b = compsAround(p[1]); let ok = false; for (const x of a) if (b.has(x) && csize[x] >= MINLEN - 2) { ok = true; break; } if (!ok) return false; }
        else { const a = compsAround(p[0]); let ok = false; for (const x of a) if (csize[x] >= MINLEN - 1) { ok = true; break; } if (!ok) return false; }
      }
      return true;
    }
    function solveFrom(todo) {
      if (!todo.length) return true;
      // 선택지가 가장 적은 색부터
      let bi = 0, bs = 1e9;
      for (let k = 0; k < todo.length; k++) { const p = pieces[todo[k]]; let s = 0; for (const e of p) s += nb[e].filter(free).length; s = s * 10 + (p.length === 2 ? dist(p[0], p[1]) : 9); if (s < bs) { bs = s; bi = k; } }
      const c = todo[bi], rest = todo.filter((_, k) => k !== bi), p = pieces[c];
      const start = p[0], target = p.length === 2 ? p[1] : null;
      const path = [start];
      function grow(head) {
        if (++steps > budget || ((steps & 255) === 0 && Date.now() - t0 > lim)) { aborted = true; return false; }
        if (aborted) return false;
        const len = path.length;
        // 혼자인 말은 6칸이 되면 여기서 끝낼 수 있음(끝 칸에 짝을 놓음)
        if (target == null && len >= MINLEN) { paths[c] = path.slice(); if (feasible(rest, null, null, 0) && solveFrom(rest)) return true; if (aborted) return false; }
        let cand = nb[head].filter(y => free(y) || (y === target && len + 1 >= MINLEN));
        if (target != null) cand.sort((a, b) => (a === target ? -1 : b === target ? 1 : 0) || (len + 1 < MINLEN - 1 ? 0 : dist(a, target) - dist(b, target)));
        for (const y of cand) {
          if (y === target) { path.push(y); paths[c] = path.slice(); if (feasible(rest, null, null, 0) && solveFrom(rest)) return true; path.pop(); if (aborted) return false; continue; }
          used[y] = 1; path.push(y);
          if (feasible(rest, y, target, len + 1) && grow(y)) return true;
          used[y] = 0; path.pop(); if (aborted) return false;
        }
        return false;
      }
      const ok = grow(start);
      if (!ok) delete paths[c];
      return ok;
    }
    label();
    const ok = feasible(cols, null, null, 0) && solveFrom(cols);
    return { ok, paths: ok ? { ...paths } : null, exhaustive: !aborted, steps };
  }

  // ---------- 판 상태 ----------
  function newRound(N, first, walls = []) { const cells = Array(N * N).fill(null); return { N, walls, cells, first, turn: first, placedThisTurn: [], turnNo: 0, last: [], over: false }; }
  const isWall = (R, i) => !!(R.walls && R.walls.includes(i));
  const piecesOf = R => { const m = {}; R.cells.forEach((c, i) => { if (c) (m[c] = m[c] || []).push(i); }); return m; };
  const countOf = (R, c) => R.cells.filter(x => x === c).length;
  // 이번 차례에 놓아야 할 개수: 라운드 첫 차례만 1개, 이후 2개(서로 다른 색)
  const need = R => R.turnNo === 0 ? 1 : 2;
  function canPlace(R, c, i) { return !R.cells[i] && !isWall(R, i) && countOf(R, c) < 2 && !R.placedThisTurn.some(x => x.c === c); }
  function legalAny(R) { const empties = R.cells.filter((x, i) => !x && !isWall(R, i)).length; const colorsLeft = COLORS.filter(c => countOf(R, c) < 2).length; return empties >= need(R) && colorsLeft >= need(R); }

  // ---------- AI ----------
  const BUD = [3000, 12000, 15000];
  // 놓을 수 있는 후보: 혼자인 말의 짝을 놓거나 새 색을 놓음
  function randomPlacement(R) {
    const out = [], empt = shuffle(R.cells.map((x, i) => x || isWall(R, i) ? -1 : i).filter(i => i >= 0));
    const colorsOK = shuffle(COLORS.filter(c => countOf(R, c) < 2));
    for (let k = 0; k < need(R); k++) { const c = colorsOK.find(c => !out.some(o => o.c === c)); const i = empt[k]; if (c == null || i == null) return null; out.push({ c, i }); }
    return out;
  }
  function withPlacement(R, pl) { const R2 = { ...R, cells: R.cells.slice() }; pl.forEach(({ c, i }) => R2.cells[i] = c); return R2; }
  function aiPlace(R, lv) {
    const tries = [6, 12, 16][lv], look = [0, 0, 6][lv], t0 = Date.now(), limitMs = [400, 900, 1600][lv];
    let best = null, bv = -1e9, found = 0;
    for (let t = 0; t < tries * 3 && t < 200; t++) {
      if (Date.now() - t0 > limitMs * 2) break; // 넓은 판에서도 한 수에 오래 걸리지 않게
      const pl = randomPlacement(R); if (!pl) break;
      const R2 = withPlacement(R, pl), s = solve(R.N, piecesOf(R2), BUD[lv], R.walls, 120);
      if (!s.ok) continue;
      // 좋은 수: 판을 빡빡하게(짝 놓기, 남은 빈칸 줄이기) + 상대가 둘 수 있는 안전한 수가 적게
      let v = Math.random() * .5;
      for (const { c } of pl) if (countOf(R, c) === 1) v += 1.2; // 짝을 채우면 경로가 굳어짐
      if (look) { let safe = 0; for (let q = 0; q < look; q++) { const op = randomPlacement({ ...R2, turnNo: R2.turnNo + 1, placedThisTurn: [] }); if (!op) continue; if (solve(R.N, piecesOf(withPlacement(R2, op)), 2500, R.walls, 40).ok) safe++; } v -= safe / look * 3; }
      if (v > bv) { bv = v; best = pl; }
      if (++found >= tries || (best && Date.now() - t0 > limitMs)) break;
    }
    return best || randomPlacement(R); // 안전한 수가 없으면 아무 데나(그러면 상대가 불가능 선언 가능)
  }
  // 상대가 놓은 뒤 불가능 선언할지. 끝까지 따져 봐서 확실히 불가능할 때만(쉬움은 가끔 놓침)
  function aiShouldDeclare(R, lv) {
    const s = solve(R.N, piecesOf(R), [8000, 60000, 200000][lv], R.walls, [250, 600, 900][lv]);
    if (s.ok || !s.exhaustive) return false;
    return Math.random() < [.55, .9, 1][lv];
  }

  // ---------- 1:1 대결 규칙 (AI 대전·온라인 대전 공용, 서버도 불러 씀) ----------
  const fail = m => { throw Object.assign(new Error(m), { duel: true }); };
  function checkProof(R, paths) {
    const N = R.N, pcs = piecesOf(R), seen = new Map();
    for (const c of Object.keys(pcs)) {
      const p = (paths[c] || []).map(Number);
      if (p.length < MINLEN) return `${c}: ${p.length}칸 (6칸 이상 필요)`;
      for (let k = 1; k < p.length; k++) { const a = p[k - 1], b = p[k]; if (!(b >= 0 && b < N * N) || Math.abs(Math.floor(a / N) - Math.floor(b / N)) + Math.abs(a % N - b % N) !== 1) return `${c}: 경로가 끊겼어요`; }
      if (new Set(p).size !== p.length) return `${c}: 같은 칸을 두 번 지나요`;
      if (pcs[c].length === 2) { if (!(pcs[c].includes(p[0]) && pcs[c].includes(p[p.length - 1]))) return `${c}: 두 말이 이어지지 않았어요`; }
      else { if (p[0] !== pcs[c][0]) return `${c}: 말에서 시작해야 해요`; if (R.cells[p[p.length - 1]]) return `${c}: 짝을 놓을 끝 칸이 비어 있어야 해요`; }
      for (let k = 1; k < p.length - 1; k++) if (R.cells[p[k]]) return `${c}: 다른 말이 있는 칸을 지나요`;
      if (p.some(x => isWall(R, x))) return `${c}: 막힌 칸을 지나요`;
      for (const x of p) { if (seen.has(x)) return `${c}·${seen.get(x)} 경로가 겹쳐요`; seen.set(x, c); }
    }
    return '';
  }
  const DUEL = {
    init(prev, opts) {
      const s = { mid: Math.random().toString(36).slice(2, 9), fixed: opts && SHAPES[opts.n] ? opts.n : null, used: prev && prev.shape ? [prev.shape] : [], score: [0, 0], roundNo: 0, log: [], winner: -1 };
      return DUEL.newRound(s, prev ? 1 - prev.matchFirst : rnd(2), true);
    },
    newRound(s, first, isMatchStart) {
      // 라운드마다 판을 새로 뽑되, 한 게임 안에서는 같은 판이 다시 나오지 않게
      const key = s.fixed || (() => { const left = SHAPE_KEYS.filter(k => !s.used.includes(k)); const pool = left.length ? left : SHAPE_KEYS; return pool[rnd(pool.length)]; })();
      const B = boardOf(key); s.shape = B.shape; s.N = B.N; s.walls = B.walls; s.used = isMatchStart ? [key] : [...s.used, key];
      s.roundNo++; s.R = newRound(s.N, first, s.walls); s.phase = 'place'; s.prover = -1; s.declarer = -1; s.shown = null; s.chooser = -1;
      if (isMatchStart) s.matchFirst = first;
      return s;
    },
    roundWin(s, w, why) {
      s.score[w]++; s.log.push({ round: s.roundNo, w, why });
      if (s.score[w] >= 3 || s.roundNo >= 5) { s.phase = 'over'; s.winner = s.score[0] === s.score[1] ? 2 : s.score[0] > s.score[1] ? 0 : 1; return; }
      s.phase = 'choose'; s.chooser = 1 - w;
    },
    act(s, seat, a) {
      const R = s.R;
      if (a.type === 'place') {
        if (s.phase !== 'place' || R.turn !== seat) fail('내 차례가 아니에요.');
        const list = (a.cells || []).map(x => ({ c: String(x.c), i: Number(x.i) }));
        if (list.length !== need(R)) fail(`말 ${need(R)}개를 놓아야 해요.`);
        R.placedThisTurn = [];
        for (const { c, i } of list) {
          if (!COLORS.includes(c) || !(i >= 0 && i < s.N * s.N) || !canPlace(R, c, i)) { R.placedThisTurn.forEach(x => R.cells[x.i] = null); R.placedThisTurn = []; fail('놓을 수 없는 자리나 색이에요 (같은 차례엔 서로 다른 색).'); }
          R.cells[i] = c; R.placedThisTurn.push({ c, i });
        }
        R.last = R.placedThisTurn.slice(); R.placedThisTurn = []; R.turnNo++; R.turn = 1 - R.turn;
        s.log.push({ p: seat, cells: R.last });
        if (!legalAny(R)) DUEL.roundWin(s, seat, '상대가 더 놓을 자리가 없어요');
        return;
      }
      if (a.type === 'declare') {
        if (s.phase !== 'place' || R.turn !== seat || R.turnNo === 0) fail('지금은 불가능 선언을 할 수 없어요.');
        s.phase = 'prove'; s.prover = 1 - seat; s.declarer = seat; s.log.push({ p: seat, declare: true }); return;
      }
      if (a.type === 'proof') {
        if (s.phase !== 'prove' || seat !== s.prover) fail('증명할 차례가 아니에요.');
        const err = checkProof(R, a.paths || {}); if (err) fail('아직 증명이 안 됐어요: ' + err);
        s.shown = a.paths; DUEL.roundWin(s, seat, '증명 성공'); return;
      }
      if (a.type === 'giveup') {
        if (s.phase !== 'prove' || seat !== s.prover) fail('증명할 차례가 아니에요.');
        const sol = solve(s.N, piecesOf(R), 300000, R.walls, 2000); s.shown = sol.ok ? sol.paths : null;
        DUEL.roundWin(s, s.declarer, sol.ok ? '증명 포기 (사실은 이을 수 있었어요)' : '증명 포기 (정말 불가능한 판이었어요)'); return;
      }
      if (a.type === 'choose') {
        if (s.phase !== 'choose' || seat !== s.chooser) fail('선후를 정할 차례가 아니에요.');
        DUEL.newRound(s, a.first ? seat : 1 - seat); return;
      }
      fail('알 수 없는 행동이에요.');
    },
    view(s, seat) {
      const R = s.R, rel = x => x == null || x < 0 ? -1 : x === seat ? 0 : 1;
      return { mid: s.mid, starter: rel(s.matchFirst), phase: s.phase, N: s.N, walls: s.walls || [], shape: s.shape, shapeName: SHAPES[s.shape] ? SHAPES[s.shape].name : `${s.N}×${s.N}`, score: [s.score[seat], s.score[1 - seat]], roundNo: s.roundNo, cells: R.cells, turn: rel(R.turn), first: rel(R.first), turnNo: R.turnNo, need: need(R),
        last: R.last || [], prover: rel(s.prover), declarer: rel(s.declarer), chooser: rel(s.chooser), shown: s.shown, winner: s.winner === 2 ? 2 : rel(s.winner),
        log: s.log.slice(-24).map(x => ({ ...x, p: x.p != null ? rel(x.p) : undefined, w: x.w != null ? rel(x.w) : undefined })) };
    },
    ai(v, lv) {
      const R = { N: v.N, walls: v.walls || [], cells: v.cells.slice(), turnNo: v.turnNo, placedThisTurn: [], turn: 0 };
      if (v.phase === 'choose' && v.chooser === 0) return { type: 'choose', first: false };
      if (v.phase === 'prove' && v.prover === 0) { const s = solve(v.N, piecesOf(R), 400000, R.walls, 2500); return s.ok ? { type: 'proof', paths: s.paths } : { type: 'giveup' }; }
      if (v.phase === 'place' && v.turn === 0) {
        if (v.turnNo > 0 && aiShouldDeclare(R, lv)) return { type: 'declare' };
        const pl = aiPlace(R, lv); return pl ? { type: 'place', cells: pl } : null;
      }
      return null;
    },
  };

  const ENG = { COLORS, MINLEN, SHAPES, SHAPE_KEYS, randomShape, boardOf, solve, newRound, piecesOf, countOf, need, canPlace, legalAny, aiPlace, aiShouldDeclare, randomPlacement, withPlacement, checkProof, DUEL };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  // ---------- 화면 ----------
  const { h, esc, seg } = LAB;
  const PAL = { A: '#e8604a', B: '#f3b641', C: '#7bd88f', D: '#5aa9e6', E: '#b48cf2', F: '#f28cc4', G: '#3fc7c0', H: '#c9a06a', I: '#9fd34a', J: '#ff8f3f', K: '#8f9cff', L: '#e0e070', M: '#d46a8a', N: '#a7bcb2' };
  LAB.add({
    id: 'colorlink', name: '컬러 링크', show: '데블스플랜',
    rules: `<ul>
      <li>14가지 색(A~N) 말이 2개씩. 같은 색 두 말을 잇는 경로들이 <b>서로 겹치거나 교차하지 않도록</b> 번갈아 말을 놓아요.</li>
      <li>라운드 시작 때 선이 말 1개를 놓고, 그다음부터는 차례마다 <b>서로 다른 색 말 2개</b>를 놓아요.</li>
      <li>경로는 상하좌우로 이어진 칸들이고, <b>말이 있는 칸을 포함해 6칸 이상</b>이어야 해요. 다른 말이 있는 칸은 지날 수 없어요. 아직 하나만 놓인 색도 앞으로 놓일 짝과 이어질 수 있어야 해요.</li>
      <li>상대가 놓은 뒤 더는 다 이을 수 없다고 보면 <b>불가능 선언</b>! 직전에 놓은 사람이 모든 경로(혼자인 말은 짝 위치까지)를 그려 증명하면 증명한 쪽이, 못 하면 선언한 쪽이 1점.</li>
      <li>5라운드, <b>먼저 3점</b>을 따면 승리. 다음 라운드 선후는 직전 라운드에 진 쪽이 정해요.</li>
      <li>상대는 <b>AI</b> 또는 <b>사람</b>(각자 자기 기기로 같은 방에 들어와 1:1)이에요. 판은 <b>라운드마다 무작위</b>로 바뀌고, 한 게임 안에서는 같은 판이 다시 나오지 않아요: 소용돌이, 도넛, 십자, 다이아몬드, 기둥 숲, 모래시계, 계단, 네 방, 하트, H, 미로, 액자, 화살표, 지그재그 등 14가지(9×9~11×11, 소용돌이는 방송에 나온 판). 빗금 친 막힌 칸에는 말을 놓거나 경로를 지나갈 수 없어요. 시간 제한은 없어요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const roomLink = LAB.roomParam();
      let shownMid = null; let pend = { lv: 1, n: 7, opp: roomLink ? 'net' : 'ai' }, cfg = { ...pend }, st = null, net = null, pick = null, placing = [], proof = null, busy = false, lastArgs = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dn-lobby" id="clLobby" hidden></div>
          <div id="clGame">
          <div class="dp-score"><div><small>나</small><b id="clMe">0</b></div><div class="dp-mid"><span id="clRound"></span><small id="clSub"></small></div><div><small id="clOpN">상대</small><b id="clAi">0</b></div></div>
          <p class="cl-shape" id="clShape"></p><div class="cl-wrap"><div class="cl-board" id="clB"></div><svg class="cl-svg" id="clSvg"></svg></div>
          <p class="g-msg" id="clMsg"></p>
          <div class="cl-pal" id="clPal"></div>
          <div class="row" id="clBtns"></div>
          <div id="clAgain"></div>
          </div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>진행 기록</h3><div class="log" id="clLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      // 시작 화면·대기실은 모든 대결 게임 공통 (무거운13·슬리더링크와 같은 흐름)
      const front = LAB.duelFront({ el: $('clLobby'), gameEl: $('clGame'), soloOpts: [{ key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 }], roomOpts: [],
        onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => { T.clear(); if (net) { net.close(); net = null; } } });
      function start() {
        T.clear(); cfg = { ...pend }; pick = null; placing = []; proof = null; lastArgs = null;
        if (net) { net.close(); net = null; }
        if (cfg.opp === 'net') {
          $('clGame').hidden = true;
          net = LAB.duel('colorlink', { front, el: $('clLobby'), onView: v => { if (!v.st) { $('clGame').hidden = true; return; } net.hideLobby(); $('clGame').hidden = false; if (v.st.phase !== 'prove' || v.st.prover !== 0) proof = null; show(v.st, v.opp || '상대', v); }, onError: m => { $('clMsg').textContent = m; } });
          net.start(); return;
        }
        $('clLobby').hidden = true; $('clGame').hidden = false;
        st = DUEL.init(null, {}); local(); aiStep();
      }
      const local = () => show(DUEL.view(st, 0), 'AI', null);
      function aiStep() {
        if (!st || st.phase === 'over') return;
        const v1 = DUEL.view(st, 1);
        const mine = (v1.phase === 'place' && v1.turn === 0) || (v1.phase === 'prove' && v1.prover === 0) || (v1.phase === 'choose' && v1.chooser === 0);
        if (!mine) return;
        T.set(() => { const a = DUEL.ai(DUEL.view(st, 1), cfg.lv); if (a) { try { DUEL.act(st, 1, a); } catch (e) { console.error(e); } } local(); aiStep(); afterLocal(); }, 700);
      }
      function afterLocal() { if (st.phase === 'over' && !st.ended) { st.ended = true; const w = st.winner; T.set(() => LAB.end(w === 0 ? '승리' : w === 1 ? '패배' : '무승부', `최종 ${st.score[0]} : ${st.score[1]}`, start), 1800); } }
      async function send(a) {
        if (busy) return;
        if (net) { busy = true; const err = await net.act(a); busy = false; return err; }
        try { DUEL.act(st, 0, a); } catch (e) { $('clMsg').textContent = e.message; return e.message; }
        local(); aiStep(); afterLocal(); return '';
      }
      const name = i => { const v = lastArgs[0]; return `${'abcdefghijklmn'[i % v.N]}${v.N - Math.floor(i / v.N)}`; };
      // 칸 누르기
      function clickCell(i) {
        const v = lastArgs && lastArgs[0]; if (!v) return;
        if (v.phase === 'place' && v.turn === 0) {
          const k = placing.findIndex(x => x.i === i);
          if (k >= 0) { placing.splice(k, 1); show(...lastArgs); return; } // 이번에 놓은 말 다시 누르면 취소
          const cnt = c => v.cells.filter(x => x === c).length + placing.filter(x => x.c === c).length;
          if ((v.walls || []).includes(i) || !pick || placing.length >= v.need || v.cells[i] || placing.some(x => x.c === pick) || cnt(pick) >= 2) return;
          placing.push({ c: pick, i }); pick = null; show(...lastArgs); return;
        }
        if (v.phase === 'prove' && v.prover === 0) {
          if (!proof) proof = { paths: {}, cur: null };
          const N = v.N, c = v.cells[i], cur = proof.cur, p = cur ? proof.paths[cur] : null, head = p ? p[p.length - 1] : null;
          const adj = head != null && Math.abs(Math.floor(i / N) - Math.floor(head / N)) + Math.abs(i % N - head % N) === 1;
          const finished = p && p.length > 1 && v.cells[head] === cur;
          if (c) { if (p && c === cur && i !== p[0] && adj && !finished) { p.push(i); show(...lastArgs); return; } proof.cur = c; proof.paths[c] = [i]; show(...lastArgs); return; }
          if (!p) return;
          const k = p.indexOf(i); if (k >= 0) { p.length = k + 1; show(...lastArgs); return; }
          if (!adj || finished) return;
          if (Object.entries(proof.paths).some(([cc, pp]) => cc !== cur && pp.includes(i))) return;
          p.push(i); show(...lastArgs);
        }
      }
      wrap.addEventListener('click', async e => {
        const cell = e.target.closest('[data-i]'); if (cell) { clickCell(+cell.dataset.i); return; }
        const pc = e.target.closest('[data-c]'); if (pc && !pc.disabled) { pick = pick === pc.dataset.c ? null : pc.dataset.c; show(...lastArgs); return; }
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const a = b.dataset.a;
        if (a === 'done') { const cells = placing.slice(); placing = []; const err = await send({ type: 'place', cells }); if (err) { placing = cells; show(...lastArgs); } }
        else if (a === 'declare') send({ type: 'declare' });
        else if (a === 'submit') { const err = await send({ type: 'proof', paths: (proof && proof.paths) || {} }); if (err) $('clMsg').textContent = err; else proof = null; }
        else if (a === 'giveup') { proof = null; send({ type: 'giveup' }); }
        else if (a === 'first' || a === 'second') send({ type: 'choose', first: a === 'first' });
        else if (a === 'again') send({ type: 'again' });
      });

      function show(v, oppName, room) {
        lastArgs = [v, oppName, room];
        if (v.mid && v.mid !== shownMid) { shownMid = v.mid; LAB.coin(['나', oppName], v.starter); } // 대결이 새로 시작될 때 선후공 연출
        const N = v.N;
        $('clOpN').textContent = oppName; $('clMe').textContent = v.score[0]; $('clAi').textContent = v.score[1];
        $('clRound').textContent = v.phase === 'over' ? '게임 끝' : `${v.roundNo}라운드 · 3점 선승`; $('clShape').textContent = `판: ${v.shapeName} (${v.N}×${v.N})`;
        $('clSub').textContent = `${v.turnNo + 1}번째 차례 · ${v.turn === 0 ? '내' : oppName} 차례`;
        $('clB').style.setProperty('--n', N); $('clB').classList.toggle('walls', !!(v.walls && v.walls.length));
        const lastSet = new Set((v.last || []).map(x => x.i));
        const cells = v.cells.slice(); placing.forEach(x => cells[x.i] = x.c);
        const proofCells = new Map(); if (proof) for (const [c, p] of Object.entries(proof.paths)) p.forEach(x => proofCells.set(x, c));
        const myPlace = v.phase === 'place' && v.turn === 0;
        const cnt = c => cells.filter(x => x === c).length;
        let s = '';
        const wallSet = new Set(v.walls || []);
        for (let i = 0; i < N * N; i++) { const c = cells[i];
          if (wallSet.has(i)) { s += '<span class="clc wall" aria-hidden="true"></span>'; continue; }
          const canPut = myPlace && pick && !c && placing.length < v.need;
          const pc = proofCells.get(i);
          s += `<button type="button" class="clc ${canPut ? 'can' : ''} ${pc && !c ? 'pth' : ''}" style="${pc && !c ? `--pc:${PAL[pc]}` : ''}" data-i="${i}">${c ? `<span class="clp ${lastSet.has(i) ? 'last' : ''} ${placing.some(x => x.i === i) ? 'new' : ''} ${cnt(c) === 1 ? 'single' : ''}" style="--pc:${PAL[c]}">${c}</span>` : ''}</button>`; }
        $('clB').innerHTML = s;
        const svg = $('clSvg'); svg.setAttribute('viewBox', `0 0 ${N} ${N}`);
        const drawn = (proof && proof.paths) || v.shown;
        svg.innerHTML = drawn && (v.phase !== 'place' || proof) ? Object.entries(drawn).map(([c, p]) => `<polyline points="${p.map(x => `${x % N + .5},${Math.floor(x / N) + .5}`).join(' ')}" style="stroke:${PAL[c]}"/>${!v.cells[p[p.length - 1]] && p.length >= MINLEN ? `<circle cx="${p[p.length - 1] % N + .5}" cy="${Math.floor(p[p.length - 1] / N) + .5}" r=".22" style="fill:${PAL[c]}"/>` : ''}`).join('') : '';
        $('clPal').hidden = !myPlace;
        if (myPlace) $('clPal').innerHTML = COLORS.map(c => { const n = 2 - cnt(c); const dis = n <= 0 || placing.some(x => x.c === c) || placing.length >= v.need;
          return `<button type="button" class="clk ${pick === c ? 'on' : ''}" style="--pc:${PAL[c]}" data-c="${c}" ${dis ? 'disabled' : ''}>${c}<small>${n}</small></button>`; }).join('');
        let btn = '', msg = '';
        if (myPlace) {
          const left = v.need - placing.length;
          msg = left ? `${v.need === 2 ? '서로 다른 색 말 2개' : '말 1개'}를 놓으세요 — 색을 고르고 빈칸을 누르세요 (${left}개 남음)` : '"놓기 완료"를 누르세요 (놓은 말을 다시 누르면 취소)';
          btn = `${v.turnNo > 0 && !placing.length ? '<button type="button" data-a="declare">불가능 선언</button>' : ''}<button type="button" class="primary" data-a="done" ${left ? 'disabled' : ''}>놓기 완료</button>`;
        } else if (v.phase === 'place') msg = `${oppName}가 놓는 중…`;
        else if (v.phase === 'prove' && v.prover === 0) {
          msg = `${oppName}가 불가능 선언! 증명하세요: 말을 누르고 이웃 칸을 차례로 눌러 경로를 그려요(6칸 이상). 혼자인 말은 경로 끝 빈칸이 짝 자리예요. 경로 칸을 다시 누르면 거기까지 되돌려요`;
          btn = '<button type="button" data-a="giveup">포기</button><button type="button" class="primary" data-a="submit">증명 제출</button>';
        } else if (v.phase === 'prove') msg = `내가 불가능 선언! ${oppName}가 증명하는 중…`;
        else if (v.phase === 'choose') { const lw = v.log.filter(x => x.w != null).pop(); msg = (lw ? `${v.roundNo}라운드: ${lw.w === 0 ? '내' : oppName} 1점 (${lw.why}). ` : '') + (v.chooser === 0 ? '다음 라운드 선후를 고르세요' : `${oppName}가 다음 라운드 선후를 고르는 중…`); if (v.chooser === 0) btn = '<button type="button" data-a="first">내가 선</button><button type="button" data-a="second">내가 후</button>'; }
        else if (v.phase === 'over') msg = v.winner === 0 ? `승리! ${v.score[0]} : ${v.score[1]}` : v.winner === 1 ? `패배 ${v.score[0]} : ${v.score[1]}` : `무승부 ${v.score[0]} : ${v.score[1]}`;
        $('clBtns').innerHTML = btn; $('clMsg').textContent = msg;
        $('clAgain').innerHTML = room && v.phase === 'over' ? LAB.duelAgain(room) : room && !room.oppOnline ? '<p class="muted">상대 연결이 끊겼어요. 다시 들어오면 이어서 해요.</p>' : '';
        $('clLog').innerHTML = v.log.slice().reverse().map(x => `<span>${x.w != null ? `${x.round}라운드: ${x.w === 0 ? '내' : esc(oppName)} 1점 (${esc(x.why)})` : x.declare ? `${x.p === 0 ? '나' : esc(oppName)}: 불가능 선언!` : `${x.p === 0 ? '나' : esc(oppName)}: ${x.cells.map(({ c, i }) => `${c}→${name(i)}`).join(', ')}`}</span>`).join('');
      }
      if (roomLink) { pend.opp = 'net'; start(); } else front.menu();
      return () => { T.clear(); if (net) net.close(); };
    }
  });
})();
