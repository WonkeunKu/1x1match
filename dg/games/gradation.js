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

  // ---------- 1:1 대결 규칙 (AI 대전과 온라인 대전이 같이 씀. 서버도 이 코드를 불러 판정) ----------
  const fail = m => { throw Object.assign(new Error(m), { duel: true }); };
  const DUEL = {
    init(prev) { return { mid: Math.random().toString(36).slice(2, 9), phase: 'setup', dist: [null, null], used: [[], []], reveals: [[], []], score: [0, 0], round: 0, lead: prev ? 1 - prev.firstOfMatch : rnd(2), firstOfMatch: null, table: null, hist: [], winner: -1, tie: 0, log: [] }; },
    act(s, seat, a) {
      if (a.type === 'dist') {
        if (s.phase !== 'setup' || s.dist[seat]) fail('지금은 배치할 수 없어요.');
        const v = (a.v || []).map(Number); if (!validDist(v)) fail('배치가 규칙에 맞지 않아요 (오름차순, 합 30 이하, 숫자마다 2개까지).');
        s.dist[seat] = v;
        if (s.dist[0] && s.dist[1]) { s.phase = 'play'; if (s.firstOfMatch == null) s.firstOfMatch = s.lead; s.round = 1; s.table = { first: s.lead, a: null, b: null }; }
        return;
      }
      if (a.type === 'pick') {
        const t = s.table, i = Number(a.i);
        if (s.phase !== 'play' || !t) fail('지금은 낼 수 없어요.');
        if (!(i >= 0 && i < 7) || s.used[seat].includes(i)) fail('그 통은 이미 냈어요.');
        if (seat === t.first && t.a == null) t.a = i;
        else if (seat !== t.first && t.a != null && t.b == null) t.b = i;
        else fail('지금은 내 차례가 아니에요.');
        s.used[seat].push(i);
        if (t.a != null && t.b != null) {
          const pos = [0, 0]; pos[t.first] = t.a; pos[1 - t.first] = t.b;
          const x = [s.dist[0][pos[0]], s.dist[1][pos[1]]];
          s.reveals[0].push({ c: COL[pos[0]], x: x[0] }); s.reveals[1].push({ c: COL[pos[1]], x: x[1] });
          const r = x[0] > x[1] ? 0 : x[0] < x[1] ? 1 : -1;
          if (r >= 0) { s.score[r]++; s.lead = r; }
          s.hist.push({ pos, x, r, first: t.first });
          if (s.round >= 7) {
            if (s.score[0] === s.score[1]) { s.log.push(`${s.score[0]}:${s.score[1]} 동점 → 재대결`); s.phase = 'tied'; s.table = null; s.rematch = [false, false]; } // 결과를 보여 주고 둘 다 '재대결'을 눌러야 다시 배치
            else { s.phase = 'over'; s.winner = s.score[0] > s.score[1] ? 0 : 1; s.table = null; }
          } else { s.round++; s.table = { first: s.lead, a: null, b: null }; }
        }
        return;
      }
      if (a.type === 'rematch') {
        if (s.phase !== 'tied') fail('지금은 재대결할 수 없어요.');
        s.rematch[seat] = true;
        if (s.rematch[0] && s.rematch[1]) { s.lastDuel = { hist: s.hist, dist: s.dist }; Object.assign(s, { phase: 'setup', dist: [null, null], used: [[], []], reveals: [[], []], score: [0, 0], round: 0, table: null, hist: [], tie: s.tie + 1, rematch: null }); }
        return;
      }
      fail('알 수 없는 행동이에요.');
    },
    view(s, seat) {
      const o = 1 - seat, t = s.table, rel = h => ({ pos: [h.pos[seat], h.pos[o]], x: [h.x[seat], h.x[o]], r: h.r < 0 ? -1 : h.r === seat ? 0 : 1, first: h.first === seat ? 0 : 1 });
      let table = null;
      if (t) { const mf = t.first === seat, myPick = mf ? t.a : t.b, oppPick = mf ? t.b : t.a; table = { first: mf ? 0 : 1, mine: myPick, oppColor: oppPick == null ? null : COL[oppPick] }; }
      return { phase: s.phase, round: s.round, score: [s.score[seat], s.score[o]], myDist: s.dist[seat], oppReady: !!s.dist[o], oppDist: s.phase === 'over' || s.phase === 'tied' ? s.dist[o] : null, rematch: s.rematch ? [s.rematch[seat], s.rematch[o]] : null,
        myUsed: s.used[seat], oppReveals: s.reveals[o], table, hist: s.hist.map(rel), mid: s.mid, starter: (s.firstOfMatch ?? s.lead) === seat ? 0 : 1, winner: s.winner < 0 ? -1 : s.winner === seat ? 0 : 1, tie: s.tie, log: s.log.slice(-10) };
    },
    // AI(자리 seat)가 지금 할 행동. 자기 화면(view)에 보이는 것만 씀
    ai(v, lv) {
      if (v.phase === 'setup' && !v.myDist) return { type: 'dist', v: aiDistribution(lv) };
      if (v.phase === 'tied') return v.rematch && !v.rematch[0] ? { type: 'rematch' } : null;
      const t = v.table; if (v.phase !== 'play' || !t || t.mine != null) return null;
      if (t.first === 1 && t.oppColor == null) return null;
      return { type: 'pick', i: aiChoose(lv, { v: v.myDist, used: new Set(v.myUsed) }, v.oppReveals, t.first === 0 ? null : t.oppColor) };
    },
  };

  const ENG = { ALLV, GOOD, COL, CNAME, validDist, aiDistribution, aiChoose, sampleBeliefs, DUEL };
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
      <li>7라운드 뒤 점수가 높은 쪽이 승리. 동점이면 다시 배치해서 재대결해요.</li>
      <li>상대는 <b>AI</b> 또는 <b>사람</b>(각자 자기 기기로 같은 방에 들어와 1:1)이에요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      const roomLink = LAB.roomParam();
      let shownMid = null; let pend = { lv: 1, opp: roomLink ? 'net' : 'ai' }, cfg = { ...pend }, st = null, V = null, net = null, draft = Array(7).fill(null), sel = 0, busy = false;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dn-lobby" id="grLobby" hidden></div>
          <div id="grGame">
          <div class="dp-score"><div><small id="grMeN">나</small><b id="grMe">0</b></div><div class="dp-mid"><span id="grRound"></span><small id="grSub"></small></div><div><small id="grOpN">상대</small><b id="grOp">0</b></div></div>
          <div class="gr-lab">상대 통 <span class="muted" id="grOpLeft"></span></div>
          <div class="gr-bins opp" id="grOpp"></div>
          <div class="gr-table" id="grTable"></div>
          <p class="g-msg" id="grMsg"></p>
          <div class="gr-lab">내 통 <span class="muted" id="grSum"></span></div>
          <div class="gr-bins" id="grMine"></div>
          <div class="gr-pool" id="grPool"></div>
          <div class="row" id="grSetBtns"><button type="button" id="grAuto">추천 배치</button><button type="button" id="grClear">비우기</button><button type="button" class="primary" id="grDone">배치 완료</button></div>
          <div id="grAgain"></div>
          <div class="bw-hist" id="grHist"></div>
          </div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>진행 기록</h3><div class="log" id="grLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      // 시작 화면·대기실은 모든 대결 게임 공통 (무거운13·슬리더링크와 같은 흐름)
      const front = LAB.duelFront({ el: $('grLobby'), gameEl: $('grGame'), soloOpts: [{ key: 'lv', label: 'AI 실력', opts: [[0, '쉬움'], [1, '보통'], [2, '어려움']], def: 1 }], roomOpts: [],
        onStart: (mode, c) => { Object.assign(pend, c, { opp: mode }); start(); }, onLeave: () => { T.clear(); if (net) { net.close(); net = null; } } });
      let logs = [];
      function start() {
        T.clear(); cfg = { ...pend }; draft = Array(7).fill(null); sel = 0; logs = []; V = null;
        if (net) { net.close(); net = null; }
        if (cfg.opp === 'net') {
          $('grGame').hidden = true;
          net = LAB.duel('gradation', { front, el: $('grLobby'), onView: v => { if (!v.st) { $('grGame').hidden = true; return; } net.hideLobby(); $('grGame').hidden = false; show(v.st, v.opp || '상대', v); }, onError: m => { $('grMsg').textContent = m; } });
          net.start(); return;
        }
        $('grLobby').hidden = true; $('grGame').hidden = false;
        st = DUEL.init(null); logs.push(`AI 대결 시작 · 첫 라운드 선: ${st.lead === 0 ? '나' : 'AI'}`); aiStep(); local();
      }
      const local = () => show(DUEL.view(st, 0), 'AI', null);
      function aiStep() { // AI는 자리 1
        if (!st || st.phase === 'over') return;
        const a = DUEL.ai(DUEL.view(st, 1), cfg.lv);
        if (a) T.set(() => { try { DUEL.act(st, 1, a); } catch (e) { console.error(e); } local(); aiStep(); afterLocal(); }, a.type === 'dist' ? 50 : 900);
      }
      function afterLocal() { if (st.phase === 'over' && !st.ended) { st.ended = true; T.set(() => LAB.end(st.winner === 0 ? '승리' : '패배', `최종 ${st.score[0]} : ${st.score[1]}`, start), 900); } }
      async function send(a) {
        if (busy) return;
        if (net) { busy = true; await net.act(a); busy = false; return; }
        try { DUEL.act(st, 0, a); } catch (e) { $('grMsg').textContent = e.message; return; }
        local(); aiStep(); afterLocal();
      }
      // 배치
      const poolLeft = d => 2 - draft.filter(x => x === d).length;
      // 고른 통(sel)에 d를 넣었을 때 나머지 빈 통을 채워 규칙(오름차순·합 30 이하·숫자마다 2개)을 만족할 수 있는지
      const completable = d => ALLV.some(v => v[sel] === d && draft.every((x, j) => j === sel || x == null || v[j] === x));
      function fitSet() {
        const ok = new Set([...Array(10).keys()].filter(completable));
        if (ok.size) return ok;
        // 이미 놓은 숫자끼리 규칙이 어긋나 있으면(직접 바꾼 경우 등) 남은 개수만 따짐
        return new Set([...Array(10).keys()].filter(d => poolLeft(d) > 0 || draft[sel] === d));
      }
      function draftProblem() {
        if (draft.some(x => x == null)) return `통 ${draft.filter(x => x == null).length}개가 비어 있어요`;
        for (let i = 1; i < 7; i++) if (draft[i] < draft[i - 1]) return `왼쪽에서 오른쪽으로 오름차순이어야 해요 (${i}번째 ${draft[i - 1]} > ${i + 1}번째 ${draft[i]})`;
        if (vsum(draft) > 30) return `합이 ${vsum(draft)}이에요. 30 이하여야 해요`;
        return '';
      }
      $('grAuto').onclick = () => { draft = GOOD[rnd(GOOD.length)].slice(); sel = 0; rerender(); };
      $('grClear').onclick = () => { draft = Array(7).fill(null); sel = 0; rerender(); };
      $('grDone').onclick = () => { const p = draftProblem(); if (p) { $('grMsg').textContent = p; return; } send({ type: 'dist', v: draft.slice() }); draft = Array(7).fill(null); };
      wrap.addEventListener('click', e => {
        const s = e.target.closest('[data-s]'); if (s) { sel = +s.dataset.s; rerender(); return; }
        const d = e.target.closest('[data-d]'); if (d && !d.disabled) { const k = +d.dataset.d; if (fitSet().has(k)) { draft[sel] = k; const nx = draft.findIndex(x => x == null); if (nx >= 0) sel = nx; rerender(); } return; }
        const p = e.target.closest('[data-p]'); if (p && !p.disabled) { send({ type: 'pick', i: +p.dataset.p }); return; }
        if (e.target.closest('[data-again]')) send({ type: 'again' });
        if (e.target.closest('[data-rematch]')) send({ type: 'rematch' });
      });
      let lastArgs = null; const rerender = () => lastArgs && show(...lastArgs);

      const cube = (c, x, cls = '', attrs = '') => `<button type="button" class="grb c${c} ${cls}" style="--bg:${GRAD[c]};--ink:${INK[c]}" ${attrs}><span>${x == null ? '' : x}</span></button>`;
      function show(v, oppName, room) {
        lastArgs = [v, oppName, room];
        if (v.mid && v.mid !== shownMid) { shownMid = v.mid; LAB.coin(['나', oppName], v.starter); } // 대결이 새로 시작될 때 선후공 연출
        $('grOpN').textContent = oppName; $('grMe').textContent = v.score[0]; $('grOp').textContent = v.score[1];
        $('grRound').textContent = v.phase === 'over' ? '게임 끝' : v.phase === 'tied' ? '동점' : v.phase === 'setup' ? '배치 단계' : `${v.round}/7 라운드`;
        $('grSub').textContent = v.table ? `${v.table.first === 0 ? '내가' : oppName + '가'} 선` : v.tie ? `재대결 ${v.tie}회째` : '';
        // 상대 통: 색만, 낸 만큼 흐리게 (같은 색 중 어느 쪽인지는 모름)
        const used = [0, 0, 0, 0]; v.oppReveals.forEach(r => used[r.c]++);
        const shown = [0, 0, 0, 0];
        $('grOpp').innerHTML = [0, 1, 2, 3, 4, 5, 6].map(i => { const c = COL[i]; const u = shown[c] < used[c] && (shown[c]++, true); return cube(c, v.oppDist ? v.oppDist[i] : null, u ? 'used' : '', 'disabled'); }).join('');
        $('grOpLeft').textContent = v.phase === 'setup' ? (v.oppReady ? '배치 완료' : '배치 중…') : `남은 통: ${[0, 1, 2, 3].map(c => `${CNAME[c]} ${POS[c].length - used[c]}`).join(' · ')}`;
        // 가운데
        const t = v.table; let tb = '';
        if (t) { const slot = (i, mine) => i == null ? '<span class="grb empty"><span>?</span></span>' : cube(COL[i], mine ? v.myDist[i] : null, 'big', 'disabled');
          const oppSlot = t.oppColor == null ? '<span class="grb empty"><span>?</span></span>' : `<span class="grb c${t.oppColor} big played" style="--bg:${GRAD[t.oppColor]};--ink:${INK[t.oppColor]}"><span class="gr-cn">${CNAME[t.oppColor]}<br>?</span></span>`; // 숫자는 비공개, 색만 공개
          tb = `<div class="duel"><div><small>나</small>${slot(t.mine, true)}</div><span class="vs">VS</span><div><small>${esc(oppName)}</small>${oppSlot}</div></div>`; }
        if (v.hist.length && (!t || (t.mine == null && t.oppColor == null))) { const l = v.hist[v.hist.length - 1];
          tb = `<div class="duel"><div><small>나</small>${cube(COL[l.pos[0]], l.x[0], 'big' + (l.r === 0 ? ' win' : ''), 'disabled')}</div><span class="vs">${l.r === 0 ? '승' : l.r === 1 ? '패' : '무'}</span><div><small>${esc(oppName)}</small>${cube(COL[l.pos[1]], l.x[1], 'big' + (l.r === 1 ? ' win' : ''), 'disabled')}</div></div>`; }
        $('grTable').innerHTML = tb;
        // 내 통
        const setup = v.phase === 'setup' && !v.myDist;
        const myTurn = t && t.mine == null && (t.first === 0 || t.oppColor != null);
        let mh = '';
        for (let i = 0; i < 7; i++) {
          if (setup) mh += cube(COL[i], draft[i], i === sel ? 'sel' : '', `data-s="${i}"`);
          else if (v.myDist) { const u = v.myUsed.includes(i); mh += cube(COL[i], v.myDist[i], u ? 'used' : myTurn ? 'can' : '', u || !myTurn ? 'disabled' : `data-p="${i}"`); }
          else mh += cube(COL[i], null, '', 'disabled');
        }
        $('grMine').innerHTML = mh;
        $('grSum').textContent = setup ? `합 ${vsum(draft.filter(x => x != null))} / 30` : v.myDist ? `합 ${vsum(v.myDist)}` : '';
        $('grPool').hidden = !setup; $('grSetBtns').hidden = !setup;
        if (setup) { const fit = fitSet(); $('grPool').innerHTML = [...Array(10).keys()].map(d => `<button type="button" class="grd" data-d="${d}" ${fit.has(d) ? '' : 'disabled'}>${d}<small>${'•'.repeat(poolLeft(d))}</small></button>`).join(''); }
        $('grMsg').textContent = v.phase === 'tied' ? `${v.score[0]} : ${v.score[1]} 동점이에요 — 상대 배치를 공개해요. 처음부터 다시 배치해서 재대결해요` : v.phase === 'over' ? (v.winner === 0 ? `이겼어요! ${v.score[0]} : ${v.score[1]}` : `졌어요. ${v.score[0]} : ${v.score[1]}`) + ' — 상대 배치를 공개해요'
          : v.phase === 'setup' ? (v.myDist ? `${oppName}의 배치를 기다리는 중…` : (draftProblem() || '배치를 마쳤으면 "배치 완료"를 누르세요') + ' · 통을 누르고 아래 숫자를 고르면 담겨요')
          : !t ? '' : myTurn ? (t.first === 0 ? '내가 선이에요. 낼 통을 고르세요' : `${oppName}가 ${CNAME[t.oppColor]} 통을 냈어요. 맞받아칠 통을 고르세요`)
          : t.first === 1 ? `${oppName}가 고르는 중…` : `${oppName}가 맞받아칠 통을 고르는 중…`;
        $('grAgain').innerHTML = v.phase === 'tied' ? (v.rematch && v.rematch[0] ? `<p class="muted" style="text-align:center">${esc(oppName)}가 재대결을 누르길 기다리는 중…</p>` : `<div class="row"><button type="button" class="primary" data-rematch>재대결${v.rematch && v.rematch[1] ? ` (${esc(oppName)} 준비 완료)` : ''}</button></div>`) : room && v.phase === 'over' ? LAB.duelAgain(room) : room && !room.oppOnline ? '<p class="muted">상대 연결이 끊겼어요. 다시 들어오면 이어서 해요.</p>' : '';
        $('grHist').innerHTML = v.hist.length ? `<table><tr><th>R</th>${v.hist.map((_, k) => `<th>${k + 1}</th>`).join('')}</tr><tr><td>나</td>${v.hist.map(x => `<td><span class="dot" style="background:${GRAD[COL[x.pos[0]]]}"></span>${x.x[0]}${x.first === 0 ? '<sup>선</sup>' : ''}</td>`).join('')}</tr><tr><td>${esc(oppName)}</td>${v.hist.map(x => `<td><span class="dot" style="background:${GRAD[COL[x.pos[1]]]}"></span>${x.x[1]}${x.first === 1 ? '<sup>선</sup>' : ''}</td>`).join('')}</tr><tr><td>결과</td>${v.hist.map(x => `<td>${x.r === 0 ? '승' : x.r === 1 ? '패' : '='}</td>`).join('')}</tr></table>` : '';
        $('grLog').innerHTML = [...logs, ...v.log].slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      if (roomLink) { pend.opp = 'net'; start(); } else front.menu();
      return () => { T.clear(); if (net) net.close(); };
    }
  });
})();
