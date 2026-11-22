// 용의자들 (데스게임 시즌1 11회차) — 네 요소가 모두 같거나 모두 다른 3장 찾기, AI와 실시간 대결
(function () {
  const { h, esc, rnd, shuffle, seg } = LAB;
  const ATTR = [['아침', '저녁', '밤'], ['양갈래', '모히칸', '아프로'], ['마스크', '선글라스', '변장 없음'], ['총', '칼', '수류탄']];
  const DECK = []; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) DECK.push([a, b, c, d]);
  const isSet = (x, y, z) => [0, 1, 2, 3].every(k => (x[k] + y[k] + z[k]) % 3 === 0);
  function allSets(cards) { const out = []; for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) for (let k = j + 1; k < cards.length; k++) if (isSet(cards[i], cards[j], cards[k])) out.push([i, j, k]); return out; }
  const BG = ['#f6e7a8', '#f2a86b', '#3b4a7a'], SKIN = '#f1d3b3';
  function face(c) {
    const [t, hair, dis, w] = c, night = t === 2;
    let s = `<svg viewBox="0 0 80 96" aria-hidden="true"><rect width="80" height="96" rx="8" fill="${BG[t]}"/>`;
    if (t === 0) s += `<circle cx="66" cy="14" r="7" fill="#f3b641"/>`; else if (t === 1) s += `<circle cx="66" cy="16" r="7" fill="#e8604a"/><rect x="0" y="22" width="80" height="2" fill="#e8604a" opacity=".4"/>`; else s += `<path d="M66 8a8 8 0 1 0 6 12a6 6 0 1 1-6-12z" fill="#f1eee4"/>`;
    s += `<rect x="22" y="62" width="36" height="30" rx="10" fill="${night ? '#6f7fb0' : '#4f6b5e'}"/>`;
    if (hair === 2) s += `<circle cx="40" cy="38" r="24" fill="#2b1d14"/>`;
    s += `<circle cx="40" cy="42" r="16" fill="${SKIN}"/>`;
    if (hair === 0) s += `<path d="M24 38q16-18 32 0" fill="#3a2717"/><circle cx="20" cy="46" r="6" fill="#3a2717"/><circle cx="60" cy="46" r="6" fill="#3a2717"/>`;
    if (hair === 1) s += `<path d="M34 28l3-10 3 8 3-9 3 11z" fill="#c2412d"/><rect x="34" y="24" width="12" height="6" fill="#c2412d"/>`;
    if (dis === 1) s += `<rect x="27" y="37" width="26" height="7" rx="3" fill="#111"/>`; else s += `<circle cx="34" cy="41" r="2" fill="#222"/><circle cx="46" cy="41" r="2" fill="#222"/>`;
    if (dis === 0) s += `<rect x="29" y="46" width="22" height="9" rx="4" fill="#e9eef2" stroke="#9aa"/>`; else s += `<path d="M35 51q5 3 10 0" stroke="#7a3b2a" stroke-width="2" fill="none"/>`;
    if (w === 0) s += `<path d="M56 70h16v5h-9v8h-5z" fill="#222"/>`;
    if (w === 1) s += `<path d="M58 86l12-22 3 2-12 22z" fill="#cfd6db" stroke="#555"/><rect x="56" y="84" width="7" height="4" fill="#7a4a2a"/>`;
    if (w === 2) s += `<circle cx="64" cy="78" r="7" fill="#3f5b2c"/><rect x="62" y="68" width="4" height="4" fill="#888"/>`;
    return s + '</svg>';
  }
  const ROUNDS = 9, setOf = r => r <= 3 ? 1 : r <= 6 ? 2 : 3;
  const countOf = r => setOf(r) === 1 ? 9 : 12;

  LAB.add({
    id: 'suspects', name: '용의자들',
    rules: `<ul>
      <li>용의자 카드는 <b>시간대(아침·저녁·밤)</b>, <b>머리(양갈래·모히칸·아프로)</b>, <b>변장(마스크·선글라스·없음)</b>, <b>무기(총·칼·수류탄)</b>가 섞인 81장이에요.</li>
      <li>네 요소가 각각 <b>모두 같거나 모두 다른</b> 3장을 찾으면 검거예요. 정답 +1, 오답 −1, 이미 나온 조합은 변동 없음.</li>
      <li>더 이상 검거할 조합이 없다고 생각하면 <b>검거 불가</b>를 선언해요. 정답 +2, 오답 −2.</li>
      <li>3세트 9라운드. 1세트 9장, 2·3세트 12장. 3세트는 카드가 하나씩 나왔다가 뒤집혀서 기억해야 해요. 3세트는 점수가 1점씩 커져요(검거 ±2, 검거 불가 ±3).</li>
      <li>1·2세트는 검거 불가 정답이나 마지막 선언 후 3분이 지나면, 3세트는 검거 불가 정답이 나와야 라운드가 끝나요.</li>
    </ul>`,
    mount(root) {
      const T = LAB.timers();
      let lv = 1, pendLv = 1, G = null;
      root.innerHTML = '';
      const wrap = h(`<div class="g-wrap">
        <div class="g-main card">
          <div class="dp-score"><div><small>나</small><b id="sMe">0</b></div><div class="dp-mid"><span id="sRound"></span><small id="sTimer"></small></div><div><small>AI</small><b id="sAi">0</b></div></div>
          <div class="sus-grid" id="sGrid"></div>
          <p class="g-msg" id="sMsg"></p>
          <div class="row"><button type="button" class="primary" id="sClaim" disabled>검거 (3장 선택)</button><button type="button" id="sNone">검거 불가 선언</button></div>
        </div>
        <aside class="g-side">
          <div class="card"><h3>설정</h3><div class="opt"><span>AI 속도</span><div id="sLv"></div></div><button type="button" class="primary" id="sNew">새 게임</button></div>
          <div class="card"><h3>이번 라운드에 나온 검거</h3><div class="log" id="sFound"></div></div>
          <div class="card"><h3>기록</h3><div class="log" id="sLog"></div></div>
        </aside></div>`);
      root.appendChild(wrap);
      const $ = id => wrap.querySelector('#' + id);
      $('sLv').appendChild(seg([[0, '느림'], [1, '보통'], [2, '빠름']], 1, v => pendLv = v));
      $('sNew').onclick = start;
      $('sClaim').onclick = () => { if (G && G.sel.length === 3) claim(0, G.sel.slice()); };
      $('sNone').onclick = () => G && claimNone(0);

      function start() { T.clear(); lv = pendLv; G = { round: 0, score: [0, 0], log: [], over: false }; nextRound(); }
      function nextRound() {
        T.clear(); G.round++;
        if (G.round > ROUNDS) {
          if (G.score[0] === G.score[1]) { G.log.push('— 동점! 3세트 규칙으로 연장 —'); G.round = 9; G.overtime = true; }
          else return finish();
        }
        const n = countOf(G.round);
        G.cards = shuffle(DECK.slice()).slice(0, n); G.sets = allSets(G.cards); G.found = []; G.foundBy = {}; G.sel = []; G.lastAct = Date.now(); G.busy = false;
        G.seq = setOf(G.round) === 3 || G.overtime; G.shown = G.seq ? 0 : n; G.hidden = new Set();
        G.msg = `${G.round}라운드 시작${G.seq ? ' — 카드가 하나씩 나왔다가 뒤집혀요' : ''}`;
        if (G.seq) { for (let i = 0; i < n; i++) { T.set(() => { G.shown = i + 1; render(); }, 600 + i * 1500); T.set(() => { G.hidden.add(i); render(); }, 600 + i * 1500 + 7000); } }
        render(); scheduleAI();
        T.every(tick, 500);
      }
      const big = () => setOf(G.round) === 3 || G.overtime;
      const key = s => s.slice().sort((a, b) => a - b).join('-');
      function tick() {
        if (G.over) return;
        if (!G.seq && Date.now() - G.lastAct > 180000) { G.log.push(`${G.round}R: 3분 동안 선언이 없어 종료`); return nextRound(); }
        render(true);
      }
      function scheduleAI() {
        const base = [[13000, 9000], [8000, 6000], [4200, 3000]][lv];
        const wait = base[0] + Math.random() * base[1] + (G.seq ? (G.cards.length - G.shown) * 600 : 0);
        T.set(aiAct, wait);
      }
      function aiAct() {
        if (G.over || G.busy) return scheduleAI();
        const visible = i => i < G.shown;
        const left = G.sets.filter(s => !G.found.includes(key(s)) && s.every(visible));
        const allLeft = G.sets.filter(s => !G.found.includes(key(s)));
        if (G.seq && G.shown < G.cards.length) return scheduleAI();
        if (!allLeft.length) { // 다 찾았으면 검거 불가
          if (Math.random() < [0.6, 0.85, 1][lv]) return claimNone(1); return scheduleAI();
        }
        if (Math.random() < [0.14, 0.05, 0.01][lv]) { // 실수
          const a = shuffle([...Array(G.cards.length).keys()]).slice(0, 3); if (!isSet(...a.map(i => G.cards[i]))) return claim(1, a);
        }
        if (left.length) return claim(1, left[rnd(left.length)]);
        scheduleAI();
      }
      function claim(p, s) {
        if (G.over) return;
        G.busy = true; G.lastAct = Date.now();
        const who = p ? 'AI' : '나', names = s.map(i => i + 1).sort((a, b) => a - b).join('·');
        const k = key(s), ok = isSet(...s.map(i => G.cards[i])), d = big() ? 2 : 1;
        let msg;
        if (ok && G.found.includes(k)) msg = `${who}: ${names}번 — 이미 나온 조합 (변동 없음)`;
        else if (ok) { G.found.push(k); G.score[p] += d; msg = `${who}: ${names}번 검거 성공 +${d}`; G.foundBy = G.foundBy || {}; G.foundBy[k] = p; }
        else { G.score[p] -= d; msg = `${who}: ${names}번 검거 실패 −${d}`; }
        G.log.push(`${G.round}R ${msg}`); G.msg = msg; if (p === 0) G.sel = [];
        G.busy = false; render(); if (p === 1) scheduleAI();
      }
      function claimNone(p) {
        if (G.over) return;
        G.lastAct = Date.now();
        const who = p ? 'AI' : '나', left = G.sets.filter(s => !G.found.includes(key(s))).length;
        const d = big() ? 3 : 2;
        if (left === 0 && (!G.seq || G.shown >= G.cards.length)) {
          G.score[p] += d; G.log.push(`${G.round}R ${who}: 검거 불가 정답 +${d}`); G.msg = `${who} 검거 불가 정답 +${d}`; render();
          T.clear(); T.set(nextRound, 2200);
        } else {
          G.score[p] -= d; G.log.push(`${G.round}R ${who}: 검거 불가 오답 −${d} (남은 조합 ${left}개)`); G.msg = `${who} 검거 불가 오답 −${d}`; render();
          if (p === 1) scheduleAI();
        }
      }
      function finish() { G.over = true; T.clear(); render(); const w = G.score[0] > G.score[1]; LAB.end(w ? '승리' : '패배', `최종 ${G.score[0]} : ${G.score[1]}`, start); }
      function render(light) {
        if (!G) return;
        $('sMe').textContent = G.score[0]; $('sAi').textContent = G.score[1];
        $('sRound').textContent = G.overtime ? '연장전' : `${setOf(G.round)}세트 · ${G.round}/${ROUNDS} 라운드`;
        const leftMs = 180000 - (Date.now() - G.lastAct);
        $('sTimer').textContent = G.seq ? '검거 불가 정답이 나와야 끝나요' : `라운드 종료까지 ${Math.max(0, Math.ceil(leftMs / 1000))}초`;
        if (light) return;
        $('sGrid').className = 'sus-grid n' + G.cards.length;
        $('sGrid').innerHTML = G.cards.map((c, i) => {
          if (i >= G.shown) return `<div class="sus wait"><b>${i + 1}</b></div>`;
          const hid = G.hidden.has(i);
          return `<button type="button" class="sus ${G.sel.includes(i) ? 'sel' : ''} ${hid ? 'flip' : ''}" data-i="${i}" title="${hid ? '' : c.map((v, k) => ATTR[k][v]).join(' · ')}"><b>${i + 1}</b>${hid ? '<span class="q">?</span>' : face(c)}</button>`;
        }).join('');
        $('sGrid').querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const i = +b.dataset.i; const k = G.sel.indexOf(i); if (k >= 0) G.sel.splice(k, 1); else if (G.sel.length < 3) G.sel.push(i); render(); });
        $('sClaim').disabled = G.sel.length !== 3 || G.over;
        $('sClaim').textContent = G.sel.length === 3 ? `${G.sel.map(i => i + 1).sort((a, b) => a - b).join('·')}번 검거` : `검거 (${G.sel.length}/3 선택)`;
        $('sMsg').textContent = G.msg || '';
        $('sFound').innerHTML = G.found.length ? G.found.map(k => `<span><b>${G.foundBy[k] ? 'AI' : '나'}</b> ${k.split('-').map(x => +x + 1).join('·')}번</span>`).join('') : '<span>아직 없어요</span>';
        $('sLog').innerHTML = G.log.slice().reverse().map(x => `<span>${esc(x)}</span>`).join('') || '<span>—</span>';
      }
      LAB.ready(root, start); // 설정을 고르고 "게임 시작"을 눌러야 시작
      return () => T.clear();
    }
  });
})();
