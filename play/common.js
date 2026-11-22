// 테스트장 공통 도구: 게임 등록, 작은 DOM 헬퍼, 결과 창
(function () {
  const LAB = window.LAB = { games: [] };
  LAB.add = g => LAB.games.push(g);
  LAB.h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  LAB.esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  LAB.rnd = n => Math.floor(Math.random() * n);
  LAB.pick = a => a[Math.floor(Math.random() * a.length)];
  LAB.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  LAB.sleep = ms => new Promise(r => setTimeout(r, ms));
  // 세그먼트 버튼: opts = [[value,label],...]
  LAB.seg = (opts, value, onChange) => {
    const box = document.createElement('div'); box.className = 'seg';
    for (const [v, l] of opts) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.className = v === value ? 'on' : '';
      b.onclick = () => { box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onChange(v); };
      box.appendChild(b);
    }
    return box;
  };
  // 결과 창 (index.html 의 #endOv 재사용)
  LAB.end = (title, sub, again) => {
    const ov = document.getElementById('endOv');
    document.getElementById('endTitle').textContent = title;
    document.getElementById('endSub').textContent = sub || '';
    ov.hidden = false;
    document.getElementById('againBtn').onclick = () => { ov.hidden = true; again && again(); };
    document.getElementById('closeBtn').onclick = () => { ov.hidden = true; };
  };
  // 처음 열면 바로 시작하지 않고, 설정을 고른 뒤 '게임 시작'을 누르게 함. 옆 칸의 '새 게임'을 눌러도 시작돼요.
  LAB.beforeStart = null; // 공개 페이지에서 비회원 한 판 확인용
  LAB.ready = (root, start) => {
    const main = root.querySelector('.g-main'); if (!main) { start(); return; }
    const ov = LAB.h(`<div class="ready-ov"><div class="ready-box"><b>설정을 고르고 시작하세요</b><span>AI 난이도나 규칙은 <span class="rw">오른쪽</span><span class="rn">아래</span> 설정 칸에서 바꿀 수 있어요.</span><button type="button" class="primary ready-go">게임 시작</button></div></div>`);
    main.appendChild(ov);
    root.querySelectorAll('.g-side button.primary').forEach(b => b.addEventListener('click', () => ov.remove()));
    ov.querySelector('.ready-go').onclick = async () => { if (LAB.beforeStart && !(await LAB.beforeStart())) return; ov.remove(); start(); };
  };
  // 게임마다 정리할 타이머 모음
  LAB.timers = () => {
    const ids = new Set();
    return {
      set(fn, ms) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; },
      every(fn, ms) { const id = setInterval(fn, ms); ids.add(id); return id; },
      clear() { ids.forEach(id => { clearTimeout(id); clearInterval(id); }); ids.clear(); }
    };
  };
})();
