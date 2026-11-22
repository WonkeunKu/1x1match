// 수식미로 (피의 게임3 데스매치) — 4×4 숫자를 외운 뒤, 합이 정답이 되는 길 먼저 찾기
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const L = 'ABCDEFGHIJKLMNOP';
  const NB = i => { const r = Math.floor(i / 4), c = i % 4, o = []; if (r) o.push(i - 4); if (r < 3) o.push(i + 4); if (c) o.push(i - 1); if (c < 3) o.push(i + 1); return o; };
  function allPaths(nums, s, e, target) { // 정답 확인용: s→e 단순 경로 중 합이 target인 것
    const out = [];
    (function dfs(cur, seen, sum, path) {
      if (sum > target) return;
      if (cur === e) { if (sum === target) out.push(path.slice()); return; }
      for (const j of NB(cur)) if (!seen.has(j)) { seen.add(j); path.push(j); dfs(j, seen, sum + nums[j], path); path.pop(); seen.delete(j); }
    })(s, new Set([s]), nums[s], [s]);
    return out;
  }
  function makeProblem(nums) {
    for (let t = 0; t < 200; t++) {
      const s = rnd(16), len = 3 + rnd(4); const path = [s], seen = new Set([s]);
      while (path.length < len) { const opts = NB(path[path.length - 1]).filter(j => !seen.has(j)); if (!opts.length) break; const j = opts[rnd(opts.length)]; path.push(j); seen.add(j); }
      if (path.length < 3) continue;
      const e = path[path.length - 1], target = path.reduce((a, i) => a + nums[i], 0);
      if (Math.abs(Math.floor(s / 4) - Math.floor(e / 4)) + Math.abs(s % 4 - e % 4) < 2) continue;
      return { s, e, target, sample: path };
    }
    return { s: 0, e: 15, target: [0, 1, 2, 3, 7, 11, 15].reduce((a, i) => a + nums[i], 0), sample: [0, 1, 2, 3, 7, 11, 15] };
  }

  LAB.add({
    id: 'mathmaze', name: '수식미로', show: '피의 게임',
    rules: `<ul>
      <li>4×4 판의 숫자가 <b>1분 동안</b> 공개된 뒤 알파벳(A~P)으로 바뀌어요.</li>
      <li>문제마다 <b>출발 칸·도착 칸·정답 값</b>이 나와요. 외운 숫자로, 상하좌우로 이어진 길을 만들어 지나간 숫자의 합(출발·도착 포함)이 정답 값이 되게 하세요. 같은 칸은 두 번 지날 수 없어요.</li>
      <li>먼저 맞히면 1점. 틀리면 상대에게 30초 동안 기회가 넘어가요.</li>
      <li>3라운드(2문제·2문제·1문제), 라운드마다 숫자가 바뀌고 다시 1분 외워요. 먼저 3점을 내거나 5문제 뒤 점수가 높은 쪽이 이겨요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let pend = { lv: 1, memo: 60 }, cfg = { ...pend }, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="mzMe">0</b></div><div class="dp-mid"><span id="mzRound"></span><small id="mzTimer"></small></div><div><small>AI</small><b id="mzAi">0</b></div></div>
          <div class="mz-q" id="mzQ"></div>
          <div class="mz-board" id="mzB"></div>
          <p class="g-msg" id="mzMsg"></p>
          <div class="row" id="mzBtns"></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정 (새 게임에 적용)</h3>
            <div class="opt"><span>AI 속도</span><div id="mzLv"></div></div>
            <div class="opt"><span>외우는 시간</span><div id="mzMemo"></div></div>
            <button type="button" class="primary" id="mzNew">새 게임</button></div>
          <div class="card"><h3>기록</h3><div class="log" id="mzLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('mzLv').appendChild(seg([[0, '느림'], [1, '보통'], [2, '빠름']], 1, v => pend.lv = v));
      $('mzMemo').appendChild(seg([[60, '60초 (방송)'], [30, '30초'], [90, '90초']], 60, v => pend.memo = v));
      $('mzNew').onclick = start;
      const PER = [2, 2, 1];
      function start() { T.clear(); cfg = { ...pend }; G = { round: 0, qn: 0, score: [0, 0], log: [], over: false }; nextRound(); }
      function nextRound() {
        G.round++; G.inRound = 0; G.nums = Array.from({ length: 16 }, () => rnd(9) + 1);
        G.aiNums = G.nums.map(n => Math.random() < [0.82, 0.93, 0.99][cfg.lv] ? n : Math.max(1, Math.min(9, n + (Math.random() < .5 ? -1 : 1))));
        G.phase = 'memo'; G.until = Date.now() + cfg.memo * 1000; G.path = [];
        G.log.push(`— ${G.round}라운드: 숫자 공개 —`); render();
        T.set(() => { G.phase = 'q'; nextQ(); }, cfg.memo * 1000);
        tick();
      }
      function tick() { T.set(() => { if (!G.over) { render(true); tick(); } }, 250); }
      function nextQ() {
        G.qn++; G.inRound++; G.q = makeProblem(G.nums); G.path = [G.q.s]; G.lock = null; G.qStart = Date.now(); G.revealPath = null;
        G.msg = ''; render(); scheduleAI();
      }
      function scheduleAI(exclusive) {
        clearTimeout(G.aiTimer);
        const base = exclusive ? [[16000, 10000], [9000, 8000], [4000, 6000]][cfg.lv] : [[24000, 16000], [14000, 10000], [7000, 6000]][cfg.lv];
        const len = G.q.sample.length;
        G.aiTimer = T.set(aiAnswer, base[0] + Math.random() * base[1] + len * 800);
      }
      function aiAnswer() {
        if (G.phase !== 'q' || G.over) return;
        if (G.lock === 0) return; // 내 독점 시간
        // AI는 자기가 기억한 숫자로 길을 찾음(잘못 외웠으면 틀릴 수 있음)
        const paths = allPaths(G.aiNums, G.q.s, G.q.e, G.q.target);
        const p = paths.length ? paths[rnd(paths.length)] : G.q.sample.map((x, k) => k === 1 ? NB(G.q.s)[0] : x);
        submit(1, p);
      }
      function valid(p) { if (p[0] !== G.q.s || p[p.length - 1] !== G.q.e) return false; const seen = new Set(); for (let k = 0; k < p.length; k++) { if (seen.has(p[k])) return false; seen.add(p[k]); if (k && !NB(p[k - 1]).includes(p[k])) return false; } return p.reduce((a, i) => a + G.nums[i], 0) === G.q.target; }
      function submit(p, path) {
        const ok = valid(path), who = p ? 'AI' : '나';
        const pathTxt = path.map(i => L[i]).join('-');
        if (ok) {
          G.score[p]++; G.log.push(`${G.qn}번 ${who}: ${pathTxt} 정답 +1`); G.msg = `${who} 정답! (${pathTxt})`; G.revealPath = path.slice();
          G.phase = 'reveal'; clearTimeout(G.aiTimer); render();
          return T.set(afterQ, 2500);
        }
        G.log.push(`${G.qn}번 ${who}: ${pathTxt} 오답`); G.msg = `${who} 오답 — ${p ? '나' : 'AI'}에게 30초 기회`;
        if (G.lock != null) { G.log.push('두 사람 모두 틀려 아무도 점수를 얻지 못했어요'); G.msg = `두 사람 모두 오답 — 정답 예: ${G.q.sample.map(i => L[i]).join('-')}`; G.revealPath = G.q.sample.slice(); G.phase = 'reveal'; render(); return T.set(afterQ, 3000); }
        G.lock = 1 - p; G.lockUntil = Date.now() + 30000; if (p === 0) G.path = [G.q.s];
        render();
        if (G.lock === 1) scheduleAI(true);
        T.set(() => { if (G.phase === 'q' && G.lock === 1 - p && Date.now() >= G.lockUntil - 50) { G.log.push('30초가 지나 아무도 점수를 얻지 못했어요'); G.msg = `시간 초과 — 정답 예: ${G.q.sample.map(i => L[i]).join('-')}`; G.revealPath = G.q.sample.slice(); G.phase = 'reveal'; render(); T.set(afterQ, 3000); } }, 30000);
      }
      function afterQ() {
        if (G.score[0] >= 3 || G.score[1] >= 3 || G.qn >= 5) return finish();
        if (G.inRound >= PER[G.round - 1]) return nextRound();
        G.phase = 'q'; nextQ();
      }
      function finish() { G.over = true; G.phase = 'over'; render(); const d = G.score[0] - G.score[1]; LAB.end(d > 0 ? '승리' : d < 0 ? '패배' : '무승부', `최종 ${G.score[0]} : ${G.score[1]}`, start); }
      function render(light) {
        $('mzMe').textContent = G.score[0]; $('mzAi').textContent = G.score[1];
        $('mzRound').textContent = G.over ? '게임 끝' : `${G.round}라운드 · ${G.qn || 0}/5 문제`;
        const now = Date.now();
        $('mzTimer').textContent = G.phase === 'memo' ? `외우기 ${Math.max(0, Math.ceil((G.until - now) / 1000))}초` : G.lock != null && G.phase === 'q' ? `${G.lock === 0 ? '내' : 'AI'} 독점 기회 ${Math.max(0, Math.ceil((G.lockUntil - now) / 1000))}초` : G.phase === 'q' ? `${Math.floor((now - G.qStart) / 1000)}초 경과` : '';
        if (light) return;
        const showAll = G.phase === 'memo' || G.over; // 문제 사이에는 정답 길의 숫자만 보여 줌
        const showNum = i => showAll || (G.phase === 'reveal' && G.revealPath && G.revealPath.includes(i));
        $('mzQ').innerHTML = G.phase === 'memo' ? '<b>숫자를 외우세요</b>' : G.q ? `<span>출발 <b>${L[G.q.s]}</b></span><span>도착 <b>${L[G.q.e]}</b></span><span>정답 값 <b>${G.q.target}</b></span>` : '';
        const can = G.phase === 'q' && G.lock !== 1;
        $('mzB').innerHTML = Array.from({ length: 16 }, (_, i) => {
          const inPath = G.path.indexOf(i);
          const cls = [G.q && i === G.q.s && G.phase !== 'memo' ? 'start' : '', G.q && i === G.q.e && G.phase !== 'memo' ? 'end' : '', (inPath >= 0 && G.phase === 'q') || (G.phase === 'reveal' && G.revealPath && G.revealPath.includes(i)) ? 'on' : ''].join(' ');
          return `<button type="button" class="mz-c ${cls}" data-i="${i}" ${can ? '' : 'disabled'}><small>${L[i]}</small><b>${showNum(i) ? G.nums[i] : ''}</b>${inPath >= 0 && G.phase === 'q' ? `<i>${inPath + 1}</i>` : ''}</button>`;
        }).join('');
        $('mzB').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
          const i = +b.dataset.i, last = G.path[G.path.length - 1];
          if (i === last && G.path.length > 1) G.path.pop();
          else if (!G.path.includes(i) && NB(last).includes(i)) G.path.push(i);
          render();
        });
        $('mzBtns').innerHTML = can ? `<button type="button" id="mzClr">처음부터</button><button type="button" class="primary" id="mzGo" ${G.path[G.path.length - 1] === G.q.e ? '' : 'disabled'}>정답! (${G.path.map(i => L[i]).join('-')})</button>` : '';
        const c = $('mzClr'); if (c) c.onclick = () => { G.path = [G.q.s]; render(); };
        const g = $('mzGo'); if (g) g.onclick = () => submit(0, G.path.slice());
        $('mzMsg').textContent = G.over ? '게임 끝' : G.phase === 'memo' ? '숫자와 위치를 외우세요. 곧 알파벳으로 바뀌어요.' : G.msg || (G.lock === 1 ? 'AI의 기회예요…' : '출발 칸부터 이어지는 칸을 눌러 길을 만드세요 (마지막 칸을 다시 누르면 취소)');
        $('mzLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('');
      }
      start();
      return () => T.clear();
    }
  });
})();
