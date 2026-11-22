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
