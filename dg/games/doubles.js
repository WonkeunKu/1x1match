// 더블스 플랜 (데스게임 시즌1 10회차) / 더블스 플랜2 (시즌2 6강) — AI 대전
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const RED = n => n >= 3 && n <= 9;
  const col = n => RED(n) ? 'red' : 'black';
  // 승부 판정: 0 무승부, 1 a 승, -1 b 승 + 종류
  function judge(a, b) {
    if (a === b) return { w: 0, kind: '무승부' };
    const hi = Math.max(a, b), lo = Math.min(a, b);
    let winner, kind;
    if (hi > lo * 2) { winner = lo; kind = '역전승'; }
    else if (hi === lo * 2) { winner = hi; kind = '더블승'; }
    else { winner = hi; kind = '기본승'; }
    return { w: winner === a ? 1 : -1, kind };
  }
  function pts(mode, set, kind) {
    if (kind === '무승부') return 0;
    if (mode === 1) { if (set === 1) return 1; if (set === 2) return kind === '더블승' ? 2 : 1; return kind === '더블승' ? 4 : 2; }
    if (set <= 2) return 1; if (set <= 4) return kind === '더블승' ? 2 : 1; return kind === '더블승' ? 4 : 2;
  }
  const ALL = Array.from({ length: 12 }, (_, i) => i + 1);

  LAB.add({
    id: 'doubles', name: '더블스 플랜',
    rules: `<ul>
      <li>1~12 숫자 블록. 뒷면은 <b>3~9 빨강(7개)</b>, <b>1·2·10·11·12 검정(5개)</b>이에요.</li>
      <li>한 세트에 블록을 하나씩 내서 5번 겨뤄요. 선이 먼저 내고, 후는 선이 낸 블록의 <b>뒷면 색</b>을 보고 내요.</li>
      <li><b>기본승</b>: 큰 숫자가 이겨요. <b>역전승</b>: 큰 숫자가 작은 숫자의 2배보다 크면 작은 숫자가 이겨요. <b>더블승</b>: 정확히 2배면 큰 숫자가 이겨요. 같은 숫자는 무승부.</li>
      <li><b>더블스 플랜(시즌1)</b>: 4세트. 세트마다 12개 중에서 빨강 3개·검정 2개를 무작위로 받고, 남은 빨강 1·검정 1은 빠져요. 점수: 1세트 모두 1점 / 2세트 더블승 2점 / 3·4세트 기본·역전 2점, 더블 4점.</li>
      <li><b>더블스 플랜2(시즌2)</b>: 6세트. 각자 1~12를 하나씩 갖고, 세트마다 5개를 골라요. 검정은 게임 전체에서 2번, 빨강은 3번까지 쓸 수 있고, 6세트를 빼면 <b>직전 세트에 쓴 블록은 못 써요</b>. 5개를 못 고르면 실격패. 점수: 1·2세트 1점 / 3·4세트 더블승 2점 / 5·6세트 2점, 더블 4점.</li>
      <li>선후는 매 승부마다 번갈아 가요. 동점이면 마지막 세트 규칙으로 연장 1세트.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let mode = 1, lv = 1, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="dpMe">0</b></div><div class="dp-mid"><span id="dpSet"></span><small id="dpDuel"></small></div><div><small>AI</small><b id="dpAi">0</b></div></div>
          <div class="dp-row"><span class="muted">AI 손패</span><div class="blocks" id="dpOpp"></div></div>
          <div class="dp-table" id="dpTable"></div>
          <p class="g-msg" id="dpMsg"></p>
          <div class="dp-row"><span class="muted">내 손패</span><div class="blocks" id="dpHand"></div></div>
          <div id="dpPick"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>규칙</span><div id="dpMode"></div></div>
            <div class="opt"><span>AI 난이도</span><div id="dpLv"></div></div>
            <button type="button" class="primary" id="dpNew">새 게임</button></div>
          <div class="card"><h3>승부 기록</h3><div class="log" id="dpLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      let pend = { mode: 1, lv: 1 };
      $('dpMode').appendChild(seg([[1, '더블스 플랜'], [2, '더블스 플랜2']], 1, v => pend.mode = v));
      $('dpLv').appendChild(seg([[0, '쉬움'], [1, '보통'], [2, '어려움']], 1, v => pend.lv = v));
      $('dpNew').onclick = start;

      function start() {
        T.clear(); mode = pend.mode; lv = pend.lv;
        G = { set: 1, duel: 0, score: [0, 0], first: rnd(2), log: [], uses: [{}, {}], lastSet: [[], []], overtime: false, over: false };
        LAB.coin(['나', 'AI'], G.first);
        for (const p of [0, 1]) for (const n of ALL) G.uses[p][n] = RED(n) ? 3 : 2;
        G.maxSet = mode === 1 ? 4 : 6;
        beginSet();
      }
      const setRule = () => G.overtime ? G.maxSet : G.set;
      // 앞으로 남은 세트를 모두 채울 수 있는지 (더블스 플랜2)
      function feasible(uses, last, setsLeft, setNo) {
        const u = { ...uses }; let prev = last.slice();
        for (let k = 0; k < setsLeft; k++) {
          const s = setNo + k, final = s >= 6;
          const cand = ALL.filter(n => u[n] > 0 && (final || !prev.includes(n))).sort((a, b) => u[b] - u[a] || (RED(b) - RED(a)));
          if (cand.length < 5) return false;
          const pick5 = cand.slice(0, 5); pick5.forEach(n => u[n]--); prev = pick5;
        }
        return true;
      }
      function legalForSet(p) { const final = G.set >= 6 || G.overtime; return ALL.filter(n => G.uses[p][n] > 0 && (final || !G.lastSet[p].includes(n))); }
      function aiChooseSet() {
        const avail = legalForSet(1), left = G.overtime ? 0 : G.maxSet - G.set;
        for (let tries = 0; tries < 400; tries++) {
          // 높은 세트일수록 강한 블록(더블승 노리기 좋은 6·12, 역전용 1·2)을 아껴 둠
          const pool = shuffle(avail.slice()).sort((a, b) => (G.uses[1][b] - G.uses[1][a]) + (Math.random() - .5) * 3);
          const s = pool.slice(0, 5); if (s.length < 5) break;
          const u = { ...G.uses[1] }; s.forEach(n => u[n]--);
          if (feasible(u, s, left, G.set + 1)) return s;
        }
        return avail.slice(0, 5);
      }
      function beginSet() {
        G.duel = 0; G.table = null; G.played = [[], []];
        if (mode === 1) {
          const red = shuffle(ALL.filter(RED)), black = shuffle(ALL.filter(n => !RED(n)));
          G.hand = [[...red.slice(0, 3), ...black.slice(0, 2)].sort((a, b) => a - b), [...red.slice(3, 6), ...black.slice(2, 4)].sort((a, b) => a - b)];
          G.excluded = [red[6], black[4]];
          render(); nextDuel();
        } else {
          const avail = legalForSet(0); G.meLegal = avail;
          if (avail.length < 5) return finish('실격패', `${G.set}세트에 낼 블록 5개를 고를 수 없어요.`, -1);
          G.hand = [null, aiChooseSet()]; G.choosing = []; render();
        }
      }
      function confirmPick() {
        const s = G.choosing.slice().sort((a, b) => a - b);
        const u = { ...G.uses[0] }; s.forEach(n => u[n]--);
        const left = G.overtime ? 0 : G.maxSet - G.set;
        if (!feasible(u, s, left, G.set + 1)) { $('dpMsg').textContent = '이렇게 고르면 뒤 세트에서 5개를 못 채울 수 있어요. 다른 조합을 고르세요.'; return; }
        G.hand[0] = s; for (const p of [0, 1]) { G.hand[p].forEach(n => G.uses[p][n]--); G.lastSet[p] = G.hand[p].slice(); }
        G.choosing = null; render(); nextDuel();
      }
      const firstOfDuel = () => (G.first + G.dcount) % 2; // 0=나 1=AI
      function nextDuel() {
        if (G.duel >= 5) return endSet();
        G.dcount = (G.dcount || 0); G.table = { first: firstOfDuel(), a: null, b: null };
        render();
        if (G.table.first === 1) T.set(() => { G.table.a = aiPlay(null); render(); }, 900);
      }
      // AI 블록 선택: 상대(나)가 낼 수 있는 숫자 후보를 추정해 기대 점수가 가장 큰 블록
      function oppCandidates(color) {
        // AI는 내 손패를 모름: 시즌1은 자기 손패를 뺀 나머지, 시즌2는 이번 세트에 내가 고를 수 있었던 블록에서 이미 낸 것을 뺀 것
        let c = mode === 1 ? ALL.filter(n => !G.hand[1].includes(n)) : (G.meLegal || ALL).slice();
        c = c.filter(n => !G.played[0].includes(n));
        if (color) c = c.filter(n => col(n) === color);
        return c.length ? c : ALL.filter(n => !color || col(n) === color);
      }
      function aiPlay(oppColor) {
        const mine = G.hand[1].filter(n => !G.played[1].includes(n));
        if (lv === 0 && Math.random() < .5) return mine[rnd(mine.length)];
        const cand = oppCandidates(oppColor), set = setRule();
        const leftAfter = mine.length - 1;
        let best = null, bv = -1e9;
        for (const b of mine) {
          let ev = 0;
          for (const o of cand) { const j = judge(b, o); ev += j.w * pts(mode, set, j.kind); }
          ev /= cand.length;
          // 남은 블록의 가치(아껴 둘 블록일수록 손해): 숫자 1·2와 6·12는 역전·더블에 쓸모 큼
          const keep = leftAfter > 0 ? ({ 1: .35, 2: .3, 6: .25, 12: .3, 5: .15, 10: .15 }[b] || 0) : 0;
          const v = ev - keep + (Math.random() - .5) * (lv === 2 ? .15 : .6);
          if (v > bv) { bv = v; best = b; }
        }
        G.played[1].push(best); return best;
      }
      function humanPlay(n) {
        const t = G.table; if (!t || G.over) return;
        if (t.first === 0 && t.a == null) { t.a = n; G.played[0].push(n); render(); T.set(() => { t.b = aiPlay(col(n)); render(); T.set(resolve, 900); }, 1000); }
        else if (t.first === 1 && t.a != null && t.b == null) { t.b = n; G.played[0].push(n); render(); T.set(resolve, 700); }
      }
      function resolve() {
        const t = G.table; const me = t.first === 0 ? t.a : t.b, ai = t.first === 0 ? t.b : t.a;
        const j = judge(me, ai), p = pts(mode, setRule(), j.kind);
        if (j.w === 1) G.score[0] += p; else if (j.w === -1) G.score[1] += p;
        G.log.push(`${G.overtime ? '연장' : G.set + '세트'} ${G.duel + 1}. 나 ${me} : ${ai} AI · ${j.w === 0 ? '무승부' : (j.w === 1 ? '내 ' : 'AI ') + j.kind + ' +' + p}`);
        G.last = { me, ai, j, p };
        G.duel++; G.dcount++; G.table = null; render();
        T.set(nextDuel, 1300);
      }
      function endSet() {
        if (mode === 2 && !G.overtime) { if (G.score[0] !== G.score[1]) G.first = (G.score[0] > G.score[1] ? 0 : 1), G.dcount = 0; }
        if (G.overtime || G.set >= G.maxSet) {
          if (G.score[0] === G.score[1]) {
            if (mode === 2) { const ok0 = ALL.filter(n => G.uses[0][n] > 0).length >= 5, ok1 = ALL.filter(n => G.uses[1][n] > 0).length >= 5; if (!ok0 || !ok1) return finish('무승부', '연장전에 낼 블록이 부족해요.', 0); }
            G.overtime = true; G.log.push('— 동점! 연장 1세트 —'); return beginSet();
          }
          return finish(G.score[0] > G.score[1] ? '승리' : '패배', `최종 ${G.score[0]} : ${G.score[1]}`, G.score[0] > G.score[1] ? 1 : -1);
        }
        G.set++; beginSet();
      }
      function finish(title, sub) { G.over = true; render(); LAB.end(title, sub, start); }
      function blk(n, cls = '', attrs = '') { return `<button type="button" class="blk ${col(n)} ${cls}" ${attrs}>${n}</button>`; }
      function render() {
        if (!G) return;
        $('dpMe').textContent = G.score[0]; $('dpAi').textContent = G.score[1];
        const r = setRule();
        $('dpSet').textContent = G.overtime ? '연장전' : `${G.set} / ${G.maxSet} 세트`;
        const p = k => pts(mode, r, k);
        $('dpDuel').textContent = `기본 ${p('기본승')} · 역전 ${p('역전승')} · 더블 ${p('더블승')}점`;
        // AI 손패: 뒷면만
        const oppLeft = G.hand[1] ? G.hand[1].filter(n => !G.played[1].includes(n)) : [];
        $('dpOpp').innerHTML = oppLeft.map(n => `<span class="blk back ${col(n)}"></span>`).join('') || '<span class="muted">—</span>';
        // 내 손패
        const t = G.table, myTurn = t && ((t.first === 0 && t.a == null) || (t.first === 1 && t.a != null && t.b == null));
        if (G.choosing) {
          const avail = new Set(legalForSet(0));
          $('dpHand').innerHTML = '';
          $('dpPick').innerHTML = `<div class="pickgrid">${ALL.map(n => blk(n, (G.choosing.includes(n) ? 'sel ' : '') + (avail.has(n) ? '' : 'dis'), `data-pick="${n}" ${avail.has(n) ? '' : 'disabled'}`) + `<small>${G.uses[0][n]}회</small>`).map(x => `<span class="pk">${x}</span>`).join('')}</div>
            <button type="button" class="primary" id="dpOk" ${G.choosing.length === 5 ? '' : 'disabled'}>이 5개로 ${G.overtime ? '연장전' : G.set + '세트'} 시작</button>`;
          $('dpMsg').textContent = `${G.overtime ? '연장전' : G.set + '세트'}에 쓸 블록 5개를 고르세요 (아래 숫자는 남은 사용 횟수${G.set < 6 && !G.overtime ? ', 직전 세트에 쓴 블록은 못 골라요' : ''})`;
          $('dpPick').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { const n = +b.dataset.pick; const i = G.choosing.indexOf(n); if (i >= 0) G.choosing.splice(i, 1); else if (G.choosing.length < 5) G.choosing.push(n); render(); });
          const ok = $('dpOk'); if (ok) ok.onclick = confirmPick;
        } else {
          $('dpPick').innerHTML = '';
          const mine = G.hand[0] ? G.hand[0] : [];
          $('dpHand').innerHTML = mine.map(n => G.played[0].includes(n) ? blk(n, 'used', 'disabled') : blk(n, myTurn ? 'can' : '', `data-n="${n}" ${myTurn ? '' : 'disabled'}`)).join('');
          $('dpHand').querySelectorAll('[data-n]').forEach(b => b.onclick = () => humanPlay(+b.dataset.n));
          let msg = '';
          if (G.over) msg = '게임 끝';
          else if (!t) msg = G.last ? `나 ${G.last.me} : ${G.last.ai} AI — ${G.last.j.w === 0 ? '무승부' : (G.last.j.w === 1 ? '내 ' : 'AI ') + G.last.j.kind + (G.last.p ? ' +' + G.last.p : '')}` : '';
          else if (t.first === 0 && t.a == null) msg = '내가 선이에요. 낼 블록을 고르세요.';
          else if (t.first === 1 && t.a == null) msg = 'AI가 블록을 고르는 중…';
          else if (t.first === 1 && t.b == null) msg = `AI가 ${col(t.a) === 'red' ? '빨강' : '검정'} 블록을 냈어요. 맞받아칠 블록을 고르세요.`;
          else msg = '공개!';
          $('dpMsg').textContent = msg;
        }
        // 테이블
        let tb = '';
        if (t) {
          const slot = (n, who, show) => n == null ? `<span class="blk empty">?</span>` : show ? blk(n, 'big') : `<span class="blk back big ${col(n)}"></span>`;
          const both = t.a != null && t.b != null;
          const me = t.first === 0 ? t.a : t.b, ai = t.first === 0 ? t.b : t.a;
          tb = `<div class="duel"><div><small>나${t.first === 0 ? ' (선)' : ''}</small>${slot(me, 0, me != null)}</div><span class="vs">VS</span><div><small>AI${t.first === 1 ? ' (선)' : ''}</small>${slot(ai, 1, both)}</div></div>`;
        } else if (G.last) {
          tb = `<div class="duel"><div><small>나</small>${blk(G.last.me, 'big')}</div><span class="vs">${G.last.j.w === 0 ? '=' : G.last.j.w === 1 ? '◀' : '▶'}</span><div><small>AI</small>${blk(G.last.ai, 'big')}</div></div>`;
        }
        $('dpTable').innerHTML = tb;
        $('dpLog').innerHTML = G.log.length ? G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('') : '<span>아직 승부가 없어요</span>';
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
