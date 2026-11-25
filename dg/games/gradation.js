// 그라데이션 (데블스 플랜 시즌3 감옥 매치) — 숫자 큐브 0~9 각 2개 중 7개를 색 통 7개에 오름차순(합 30 이하)으로 숨겨 담고 1:1로 한 통씩 내서 큰 쪽이 1점
(function () {
  // 통 색: 양 끝 검정 → 가운데 흰색. 상대는 내가 낸 통의 '색'만 봐서 같은 색 두 통 중 어느 쪽인지 모름
  const COL = [0, 1, 2, 3, 2, 1, 0]; // 0 검정 1 은색 2 회색 3 흰색
  const CNAME = ['검정', '은색', '회색', '흰색'];
  const POS = [[0, 6], [1, 5], [2, 4], [3]];
  const sgn = x => x > 0 ? 1 : x < 0 ? -1 : 0;
  const rnd = n => Math.floor(Math.random() * n);

  // 가능한 배치 전부: 오름차순(같은 숫자 허용, 숫자마다 최대 2개), 합 30 이하
  const ALLV = [];
  (function gen(v, from, cnt, sum) {
    if (v.length === 7) { ALLV.push(v.slice()); return; }
    for (let d = from; d <= 9; d++) {
      const c = d === from ? cnt : 0; if (c >= 2) continue;
      const left = 6 - v.length; // 뒤에 올 숫자는 d 이상
      if (sum + d + left * d > 30) break;
      v.push(d); gen(v, d, c + 1, sum + d); v.pop();
    }
  })([], 0, 0, 0);
  const vsum = v => v.reduce((a, b) => a + b, 0);
  const validDist = v => v.length === 7 && v.every(x => Number.isInteger(x) && x >= 0 && x <= 9) && v.every((x, i) => i === 0 || v[i - 1] <= x) && vsum(v) <= 30 && [...Array(10).keys()].every(d => v.filter(x => x === d).length <= 2);
  // 사람이 낼 법한 배치일수록 무겁게 (합 30, 9 포함)
  const prior = v => (vsum(v) === 30 ? 1 : vsum(v) >= 27 ? .25 : .04) * (v[6] === 9 ? 1 : .35);
  const GOOD = ALLV.filter(v => vsum(v) === 30 && v[6] === 9);

  function aiDistribution(lv) {
    if (lv === 0) { const pool = ALLV.filter(v => vsum(v) >= 25); return pool[rnd(pool.length)].slice(); }
    return GOOD[rnd(GOOD.length)].slice();
  }

  // 공개 정보(상대가 낸 색과 숫자)와 맞는 상대 배치들
  function consistent(v, reveals) {
    for (let c = 0; c < 4; c++) {
      const got = reveals.filter(r => r.c === c).map(r => r.x);
      if (!got.length) continue;
      const have = POS[c].map(i => v[i]);
      for (const x of got) { const k = have.indexOf(x); if (k < 0) return false; have.splice(k, 1); }
    }
    return true;
  }
  // 그 배치에서 아직 안 낸 숫자를 색별로
  function remainByColor(v, reveals) {
    const out = [[], [], [], []];
    for (let c = 0; c < 4; c++) {
      const have = POS[c].map(i => v[i]);
      for (const r of reveals) if (r.c === c) { const k = have.indexOf(r.x); if (k >= 0) have.splice(k, 1); }
      out[c] = have;
    }
    return out;
  }
  function sampleBeliefs(reveals, n) {
    const cand = [], w = []; let tw = 0;
    for (const v of ALLV) if (consistent(v, reveals)) { const p = prior(v); cand.push(v); w.push(p); tw += p; }
    if (!cand.length) return [];
    const out = [];
    for (let k = 0; k < n; k++) { let r = Math.random() * tw, i = 0; while (i < cand.length - 1 && (r -= w[i]) > 0) i++; out.push(remainByColor(cand[i], reveals)); }
    return out;
  }
  // 남은 패끼리 아무렇게나 맞붙을 때 기대 순승수 (큰 숫자를 아끼는 가치)
  function future(mine, theirs) {
    if (!mine.length || !theirs.length) return 0;
    let s = 0; for (const m of mine) for (const o of theirs) s += sgn(m - o);
    return s / theirs.length;
  }

  // AI가 낼 통 고르기. me: {v, used:Set(pos)}, oppReveals: 상대가 낸 [{c,x}], oppColor: 후일 때 상대가 낸 색
  function aiChoose(lv, me, oppReveals, oppColor, myReveals) {
    const avail = [0, 1, 2, 3, 4, 5, 6].filter(i => !me.used.has(i));
    if (avail.length === 1) return avail[0];
    if (lv === 0 && Math.random() < .5) return avail[rnd(avail.length)];
    const S = lv === 2 ? 160 : 60, beta = lv === 2 ? .55 : .45;
    const bel = sampleBeliefs(oppReveals, S);
    const myRem = i => avail.filter(j => j !== i).map(j => me.v[j]);
    let best = avail[0], bv = -1e9;
    for (const i of avail) {
      const x = me.v[i]; let tot = 0;
      for (const b of bel) {
        if (oppColor != null) { // 후: 상대 색을 알고 맞받아침
          const opts = b[oppColor]; if (!opts.length) continue;
          for (const o of opts) {
            const rest = b.flat(); rest.splice(rest.indexOf(o), 1);
            tot += (sgn(x - o) + beta * future(myRem(i), rest)) / opts.length;
          }
        } else { // 선: 상대가 내 색을 보고 대응한다고 가정
          const all = b.flat(); if (!all.length) continue;
          if (lv === 2) {
            // 상대가 볼 수 있는 내 정보: 이 색의 내 남은 숫자들(어느 쪽인지 모름)
            const c = COL[i], mine = avail.filter(j => COL[j] === c).map(j => me.v[j]);
            let bo = null, bs = -1e9;
            for (let k = 0; k < all.length; k++) {
              const o = all[k], rest = all.filter((_, q) => q !== k);
              let s = 0; for (const m of mine) s += sgn(o - m) / mine.length;
              s -= o / 9 * .35; // 상대도 큰 숫자는 아낀다고 가정
              if (s > bs) { bs = s; bo = k; }
            }
            const o = all[bo], rest = all.filter((_, q) => q !== bo);
            tot += sgn(x - o) + beta * future(myRem(i), rest);
          } else {
            for (let k = 0; k < all.length; k++) { const rest = all.filter((_, q) => q !== k); tot += (sgn(x - all[k]) + beta * future(myRem(i), rest)) / all.length; }
          }
        }
      }
      const v = tot / Math.max(1, bel.length) + (Math.random() - .5) * (lv === 2 ? .06 : lv === 1 ? .15 : .4);
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  }

  const ENG = { ALLV, GOOD, COL, CNAME, validDist, aiDistribution, aiChoose, sampleBeliefs };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENG; return; }
  if (typeof LAB === 'undefined') return;

  const { h, esc, seg } = LAB;
  const GRAD = ['#15191a', '#59626a', '#a3abb1', '#f1eee4']; // 통 색
  const INK = ['#f1eee4', '#f1eee4', '#10302a', '#10302a'];

  LAB.add({
    id: 'gradation', name: '그라데이션', show: '데블스플랜',
    rules: `<ul>
      <li>각자 숫자 큐브 <b>0~9 두 개씩(20개)</b> 중 7개를 골라, 양 끝 <b>검정</b>에서 가운데 <b>흰색</b>으로 밝아지는 큐브 통 7개에 하나씩 몰래 담아요.</li>
      <li>담을 때 <b>왼쪽에서 오른쪽으로 오름차순</b>(같은 숫자 가능), <b>7개 합은 30 이하</b>여야 해요.</li>
      <li>라운드마다 선이 통 하나를 내고, 후는 그 <b>통의 색만 보고</b> 자기 통을 내요. 같은 색 두 통 중 어느 쪽인지는 몰라요.</li>
      <li>두 통의 숫자를 공개해 <b>큰 쪽이 1점</b>, 같으면 점수 없음. 이긴 사람이 다음 라운드 선(비기면 그대로)이에요.</li>
      <li>7라운드 뒤 점수가 높은 쪽이 대결 승리. 동점이면 다시 배치해서 재대결해요.</li>
      <li><b>3인 서바이벌</b>(방송 방식): 대결 승자가 쉬던 사람과 붙고, <b>2연승</b>한 사람이 1위예요. 직전 대결 승자가 다음 대결 첫 라운드 선이에요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { lv: 1, mode: 'duel' }, cfg = { ...pend }, G = null, D = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small id="grMeN">나</small><b id="grMe">0</b></div><div class="dp-mid"><span id="grRound"></span><small id="grSub"></small></div><div><small id="grOpN">AI</small><b id="grOp">0</b></div></div>
          <div class="gr-surv" id="grSurv"></div>
          <div class="gr-lab">상대 통 <span class="muted" id="grOpLeft"></span></div>
          <div class="gr-bins opp" id="grOpp"></div>
          <div class="gr-table" id="grTable"></div>
          <p class="g-msg" id="grMsg"></p>
          <div class="gr-lab">내 통 <span class="muted" id="grSum"></span></div>
          <div class="gr-bins" id="grMine"></div>
          <div class="gr-pool" id="grPool"></div>
          <div class="row" id="grSetBtns"><button type="button" id="grAuto">추천 배치</button><button type="button" id="grClear">비우기</button><button type="button" class="primary" id="grDone">배치 완료</button></div>
          <div class="bw-hist" id="grHist"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>방식</span><div id="grMode"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="grLv"></div></div>
            <button type="button" class="primary" id="grNew">새 게임</button></div>
          <div class="card"><h3>진행 기록</h3><div class="log" id="grLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('grMode').appendChild(seg([['duel', '1:1 대결'], ['surv', '3인 서바이벌']], 'duel', v => pend.mode = v));
      $('grLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('grNew').onclick = start;
      const log = t => { G.log.push(t); };

      // ---------- 게임(대결 묶음) ----------
      function start() {
        T.clear(); cfg = { ...pend };
        const players = cfg.mode === 'surv' ? ['나', 'AI 1', 'AI 2'] : ['나', 'AI'];
        G = { players, streak: players.map(() => 0), log: [], duelNo: 0, over: false, lastWinner: null, survLog: [] };
        if (cfg.mode === 'surv') { const opp = 1 + rnd(2); G.wait = 3 - opp; newDuel([0, opp], rnd(2) ? 0 : opp); }
        else newDuel([0, 1], rnd(2) ? 0 : 1);
      }
      function newDuel(pair, first) {
        G.duelNo++;
        D = { pair, first, lead: first, score: [0, 0], round: 0, phase: 'setup', dist: [null, null], used: [new Set(), new Set()], reveals: [[], []], hist: [], table: null, draft: Array(7).fill(null), sel: 0 };
        const names = pair.map(p => G.players[p]);
        log(`대결 ${G.duelNo}: ${names[0]} vs ${names[1]} (선: ${G.players[first]})`);
        if (pair.includes(0)) {
          D.dist[1] = aiDistribution(cfg.lv); // 상대 AI는 바로 배치
          render();
        } else { simulateAIDuel(); }
      }
      const idx = p => D.pair.indexOf(p); // 대결 안 자리(0: 나 또는 앞 사람)

      // ---------- 배치 ----------
      const poolLeft = d => 2 - D.draft.filter(x => x === d).length;
      function placeDigit(d) {
        if (D.phase !== 'setup' || poolLeft(d) <= 0) return;
        D.draft[D.sel] = d;
        const nx = D.draft.findIndex(x => x == null); if (nx >= 0) D.sel = nx;
        render();
      }
      function draftProblem() {
        const v = D.draft;
        if (v.some(x => x == null)) return `통 ${v.filter(x => x == null).length}개가 비어 있어요`;
        for (let i = 1; i < 7; i++) if (v[i] < v[i - 1]) return `왼쪽에서 오른쪽으로 오름차순이어야 해요 (${i}번째 ${v[i - 1]} > ${i + 1}번째 ${v[i]})`;
        if (vsum(v) > 30) return `합이 ${vsum(v)}이에요. 30 이하여야 해요`;
        return '';
      }
      $('grAuto').onclick = () => { if (D.phase !== 'setup') return; D.draft = GOOD[rnd(GOOD.length)].slice(); D.sel = 0; render(); };
      $('grClear').onclick = () => { if (D.phase !== 'setup') return; D.draft = Array(7).fill(null); D.sel = 0; render(); };
      $('grDone').onclick = () => {
        if (D.phase !== 'setup') return;
        const p = draftProblem(); if (p) { $('grMsg').textContent = p; return; }
        D.dist[0] = D.draft.slice(); D.phase = 'play';
        if (vsum(D.dist[0]) < 30) log(`내 배치 합 ${vsum(D.dist[0])} (30보다 작아요)`);
        nextRound();
      };

      // ---------- 라운드 ----------
      function nextRound() {
        if (D.round >= 7) return endDuel();
        D.round++; D.table = { first: D.lead, a: null, b: null }; render();
        if (D.pair[0] === 0 && D.lead !== 0) T.set(() => { D.table.a = aiPickFor(1, null); render(); }, 900);
      }
      // 대결 안 자리 s(0/1)의 AI가 고름. oppColor: 상대가 이미 낸 색
      function aiPickFor(s, oppColor) {
        const me = { v: D.dist[s], used: D.used[s] };
        const i = aiChoose(cfg.lv, me, D.reveals[1 - s], oppColor, D.reveals[s]);
        D.used[s].add(i); return i;
      }
      function humanPlay(i) {
        const t = D.table; if (!t || D.phase !== 'play' || D.used[0].has(i)) return;
        if (t.first === 0 && t.a == null) { t.a = i; D.used[0].add(i); render(); T.set(() => { t.b = aiPickFor(1, COL[i]); render(); T.set(resolve, 900); }, 900); }
        else if (t.first === 1 && t.a != null && t.b == null) { t.b = i; D.used[0].add(i); render(); T.set(resolve, 700); }
      }
      function resolve() {
        const t = D.table;
        const pos = t.first === 0 ? [t.a, t.b] : [t.b, t.a]; // [자리0, 자리1]
        const x = [D.dist[0][pos[0]], D.dist[1][pos[1]]];
        D.reveals[0].push({ c: COL[pos[0]], x: x[0] }); D.reveals[1].push({ c: COL[pos[1]], x: x[1] });
        const r = x[0] > x[1] ? 0 : x[0] < x[1] ? 1 : -1;
        if (r >= 0) { D.score[r]++; D.lead = r; }
        D.hist.push({ pos, x, r, first: t.first });
        D.table = null; render(); T.set(nextRound, 1500);
      }
      function endDuel() {
        const [a, b] = D.score, names = D.pair.map(p => G.players[p]);
        if (a === b) { log(`대결 ${G.duelNo}: ${a}:${b} 동점 → 다시 배치해서 재대결`); render(); T.set(() => newDuel(D.pair, D.first), 1800); return; }
        const w = a > b ? 0 : 1, wp = D.pair[w], lp = D.pair[1 - w];
        log(`대결 ${G.duelNo}: ${names[0]} ${a} : ${b} ${names[1]} → ${G.players[wp]} 승리`);
        if (cfg.mode === 'duel') { G.over = true; render(); LAB.end(wp === 0 ? '승리' : '패배', `최종 ${a} : ${b}`, start); return; }
        G.streak[wp]++; G.streak[lp] = 0;
        if (G.streak[wp] >= 2) { G.over = true; render(); LAB.end(wp === 0 ? '1위 · 결승 진출' : '탈락', wp === 0 ? '2연승으로 서바이벌 1위!' : `${G.players[wp]}가 2연승으로 1위를 차지했어요`, start); return; }
        const sit = G.wait; G.wait = lp;
        render(); T.set(() => newDuel(sit === 0 ? [0, wp] : [wp, sit].sort((x, y) => x - y), wp), 1800);
      }
      // 나 없이 AI끼리 붙는 대결은 바로 계산
      function simulateAIDuel() {
        D.dist = [aiDistribution(cfg.lv), aiDistribution(cfg.lv)]; D.phase = 'play';
        const lead0 = D.first === D.pair[0] ? 0 : 1; D.lead = lead0;
        for (let r = 0; r < 7; r++) {
          const f = D.lead, s2 = 1 - f;
          const pf = aiPickFor(f, null), ps = aiPickFor(s2, COL[pf]);
          const pos = f === 0 ? [pf, ps] : [ps, pf], x = [D.dist[0][pos[0]], D.dist[1][pos[1]]];
          D.reveals[0].push({ c: COL[pos[0]], x: x[0] }); D.reveals[1].push({ c: COL[pos[1]], x: x[1] });
          const w = x[0] > x[1] ? 0 : x[0] < x[1] ? 1 : -1; if (w >= 0) { D.score[w]++; D.lead = w; }
          D.hist.push({ pos, x, r: w, first: f });
        }
        D.round = 7; render(); T.set(endDuel, 2200);
      }

      // ---------- 그리기 ----------
      const cube = (c, x, cls = '', attrs = '') => `<button type="button" class="grb c${c} ${cls}" style="--bg:${GRAD[c]};--ink:${INK[c]}" ${attrs}><span>${x == null ? '' : x}</span></button>`;
      function render() {
        const meIn = D.pair[0] === 0;
        const names = D.pair.map(p => G.players[p]);
        $('grMeN').textContent = names[0]; $('grOpN').textContent = names[1];
        $('grMe').textContent = D.score[0]; $('grOp').textContent = D.score[1];
        $('grRound').textContent = G.over ? '게임 끝' : D.phase === 'setup' ? '배치 단계' : `${D.round}/7 라운드`;
        $('grSub').textContent = D.table ? `${names[D.table.first]} 선` : cfg.mode === 'surv' ? `대결 ${G.duelNo}` : '';
        $('grSurv').innerHTML = cfg.mode === 'surv' ? G.players.map((n, p) => `<span class="${D.pair.includes(p) ? 'in' : 'out'}">${esc(n)} <b>${'●'.repeat(G.streak[p])}${'○'.repeat(2 - G.streak[p])}</b>${D.pair.includes(p) ? '' : ' · 대기'}</span>`).join('') : '';
        $('grSurv').hidden = cfg.mode !== 'surv';
        // 상대 통: 색만 보이고 낸 통은 흐리게. 같은 색 중 어느 쪽을 냈는지는 모르므로 색별 남은 개수로 표시
        const opUsedC = [0, 0, 0, 0]; D.reveals[1].forEach(r => opUsedC[r.c]++);
        const opDone = D.phase === 'play' && D.round >= 7 && !D.table;
        let opHtml = '';
        const shown = [0, 0, 0, 0];
        for (let i = 0; i < 7; i++) {
          const c = COL[i]; const usedHere = shown[c] < opUsedC[c] && (shown[c]++, true);
          opHtml += cube(c, (G.over || opDone) && D.dist[1] ? D.dist[1][i] : null, usedHere ? 'used' : '', 'disabled');
        }
        $('grOpp').innerHTML = opHtml;
        $('grOpLeft').textContent = D.phase === 'setup' ? '' : `남은 통: ${[0, 1, 2, 3].map(c => `${CNAME[c]} ${POS[c].length - opUsedC[c]}`).join(' · ')}`;
        // 가운데 판
        const t = D.table; let tb = '';
        if (t) { const mine = t.first === 0 ? t.a : t.b, theirs = t.first === 0 ? t.b : t.a;
          const slot = (i, s) => i == null ? '<span class="grb empty"><span>?</span></span>' : cube(COL[i], s === 0 && meIn ? D.dist[0][i] : null, 'big', 'disabled');
          tb = `<div class="duel"><div><small>${esc(names[0])}</small>${slot(mine, 0)}</div><span class="vs">VS</span><div><small>${esc(names[1])}</small>${slot(theirs, 1)}</div></div>`; }
        else if (D.hist.length && D.phase === 'play') { const l = D.hist[D.hist.length - 1];
          tb = `<div class="duel"><div><small>${esc(names[0])}</small>${cube(COL[l.pos[0]], l.x[0], 'big', 'disabled')}</div><span class="vs">${l.r === 0 ? '승' : l.r === 1 ? '패' : '무'}</span><div><small>${esc(names[1])}</small>${cube(COL[l.pos[1]], l.x[1], 'big', 'disabled')}</div></div>`; }
        $('grTable').innerHTML = tb;
        // 내 통
        const setup = D.phase === 'setup' && meIn;
        const myTurn = t && meIn && ((t.first === 0 && t.a == null) || (t.first === 1 && t.a != null && t.b == null));
        let mh = '';
        for (let i = 0; i < 7; i++) {
          if (setup) mh += cube(COL[i], D.draft[i], i === D.sel ? 'sel' : '', `data-s="${i}"`);
          else if (meIn && D.dist[0]) mh += cube(COL[i], D.dist[0][i], D.used[0].has(i) ? 'used' : myTurn ? 'can' : '', D.used[0].has(i) || !myTurn ? 'disabled' : `data-p="${i}"`);
          else mh += cube(COL[i], D.dist[0] ? D.dist[0][i] : null, D.used[0].has(i) ? 'used' : '', 'disabled');
        }
        $('grMine').innerHTML = mh;
        $('grMine').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { D.sel = +b.dataset.s; render(); });
        $('grMine').querySelectorAll('[data-p]').forEach(b => b.onclick = () => humanPlay(+b.dataset.p));
        $('grSum').textContent = setup ? `합 ${vsum(D.draft.filter(x => x != null))} / 30` : meIn && D.dist[0] ? `합 ${vsum(D.dist[0])}` : '';
        $('grPool').hidden = !setup; $('grSetBtns').hidden = !setup;
        if (setup) $('grPool').innerHTML = [...Array(10).keys()].map(d => `<button type="button" class="grd" data-d="${d}" ${poolLeft(d) <= 0 ? 'disabled' : ''}>${d}<small>${'•'.repeat(poolLeft(d))}</small></button>`).join('');
        $('grPool').querySelectorAll('[data-d]').forEach(b => b.onclick = () => placeDigit(+b.dataset.d));
        // 안내
        const lastC = t && t.first === 1 && t.a != null ? CNAME[COL[t.a]] : '';
        $('grMsg').textContent = G.over ? '게임 끝 — 상대 배치를 공개해요'
          : !meIn ? `${names[0]}와 ${names[1]}의 대결 결과를 계산했어요. 다음 대결을 기다려요…`
          : setup ? (draftProblem() || '배치를 마쳤으면 "배치 완료"를 누르세요') + ' · 통을 누르고 아래 숫자를 고르면 담겨요'
          : !t ? (D.round >= 7 ? '대결 끝' : '') : t.first === 0 && t.a == null ? '내가 선이에요. 낼 통을 고르세요'
          : t.first === 1 && t.a == null ? '상대가 고르는 중…' : t.b == null && t.first === 1 ? `상대가 ${lastC} 통을 냈어요. 맞받아칠 통을 고르세요` : '공개 중…';
        // 기록표
        $('grHist').innerHTML = D.hist.length ? `<table><tr><th>R</th>${D.hist.map((_, k) => `<th>${k + 1}</th>`).join('')}</tr><tr><td>${esc(names[0])}</td>${D.hist.map(x => `<td><span class="dot" style="background:${GRAD[COL[x.pos[0]]]}"></span>${x.x[0]}${x.first === 0 ? '<sup>선</sup>' : ''}</td>`).join('')}</tr><tr><td>${esc(names[1])}</td>${D.hist.map(x => `<td><span class="dot" style="background:${GRAD[COL[x.pos[1]]]}"></span>${x.x[1]}${x.first === 1 ? '<sup>선</sup>' : ''}</td>`).join('')}</tr><tr><td>결과</td>${D.hist.map(x => `<td>${x.r === 0 ? '◀' : x.r === 1 ? '▶' : '='}</td>`).join('')}</tr></table>` : '';
        $('grLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      LAB.ready(root, start);
      return () => T.clear();
    }
  });
})();
