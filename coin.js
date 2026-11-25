// 선후공 정하기 연출: 2명이면 동전 던지기, 3명 이상이면 이름을 돌려 고르는 추첨
// 사용: CoinFlip.show({ names: ['나', 'AI'], winner: 0, title: '선공 정하기', suffix: '선공' })  → Promise (끝나면 resolve)
// 결과는 이미 정해져 있고(게임/서버가 정함) 그걸 보여 주기만 함
(function () {
  const DUR = 1700, HOLD = 900; // 도는 시간, 결과 보여 주는 시간
  const css = `
  .cf-ov{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;background:rgba(4,14,12,.93);padding:20px;font-family:"Noto Sans KR","Apple SD Gothic Neo",sans-serif;animation:cfIn .2s ease}
  @keyframes cfIn{from{opacity:0}to{opacity:1}}
  .cf-box{display:grid;gap:14px;justify-items:center;text-align:center;color:#f1eee4}
  .cf-t{font-size:14px;letter-spacing:.12em;color:#a7bcb2;font-weight:700}
  .cf-stage{perspective:700px;width:150px;height:150px}
  .cf-coin{position:relative;width:150px;height:150px;transform-style:preserve-3d}
  .cf-face{position:absolute;inset:0;border-radius:50%;display:grid;place-items:center;backface-visibility:hidden;font-weight:800;font-size:22px;padding:14px;word-break:keep-all;line-height:1.15;box-shadow:inset 0 0 0 6px rgba(0,0,0,.18),0 10px 30px rgba(0,0,0,.45)}
  .cf-a{background:radial-gradient(circle at 35% 30%,#ffe29a,#f3b641 55%,#b9821c);color:#2a1a00}
  .cf-b{background:radial-gradient(circle at 35% 30%,#d9f3ff,#6fc4ea 55%,#2c7ea3);color:#06222e;transform:rotateY(180deg)}
  .cf-res{font-size:24px;font-weight:800;min-height:34px;opacity:0;transition:opacity .25s}
  .cf-res.on{opacity:1}
  .cf-lots{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:420px}
  .cf-lots span{padding:10px 14px;border-radius:999px;background:#163d35;border:2px solid rgba(241,238,228,.14);font-weight:700;font-size:16px;transition:background .08s,border-color .08s,transform .08s}
  .cf-lots span.hi{background:#f3b641;color:#1a1405;border-color:#f3b641;transform:scale(1.08)}
  @media (prefers-reduced-motion:reduce){.cf-coin{transition:none!important}}`;
  function addCss() { if (document.getElementById('cf-css')) return; const s = document.createElement('style'); s.id = 'cf-css'; s.textContent = css; document.head.appendChild(s); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const josa = w => { const c = String(w).trim().slice(-1).charCodeAt(0); if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 ? '이' : '가'; return /[0-9]$/.test(w) ? ((/[013678]$/.test(w)) ? '이' : '가') : '가'; };
  let busyUntil = 0;
  function show({ names, winner, title = '선공 정하기', suffix = '선공' }) {
    addCss();
    const ov = document.createElement('div'); ov.className = 'cf-ov'; ov.setAttribute('role', 'status'); ov.setAttribute('aria-live', 'polite');
    const two = names.length === 2;
    ov.innerHTML = `<div class="cf-box"><div class="cf-t">${esc(title)}</div>${two
      ? `<div class="cf-stage"><div class="cf-coin"><div class="cf-face cf-a">${esc(names[0])}</div><div class="cf-face cf-b">${esc(names[1])}</div></div></div>`
      : `<div class="cf-lots">${names.map((n, i) => `<span data-i="${i}">${esc(n)}</span>`).join('')}</div>`}<div class="cf-res"></div></div>`;
    document.body.appendChild(ov);
    const res = ov.querySelector('.cf-res');
    const total = DUR + HOLD; busyUntil = Date.now() + total + 250;
    return new Promise(done => {
      if (two) {
        const coin = ov.querySelector('.cf-coin');
        const turns = 6 + (winner === 1 ? .5 : 0); // 반 바퀴 더 돌면 뒷면(두 번째 이름)
        coin.animate([{ transform: 'rotateY(0deg) translateY(0)' }, { transform: `rotateY(${turns * 180}deg) translateY(-60px)`, offset: .5 }, { transform: `rotateY(${turns * 360}deg) translateY(0)` }], { duration: DUR, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      } else {
        const spans = [...ov.querySelectorAll('.cf-lots span')], n = spans.length; let k = 0, step = 0;
        const steps = n * 3 + ((winner - (n * 3) % n) % n + n) % n; // winner에서 멈추도록
        const tick = () => { spans.forEach(s => s.classList.remove('hi')); spans[k % n].classList.add('hi'); if (step >= steps) return; step++; k++; setTimeout(tick, 40 + step * step * (DUR / (steps * steps * 2.2))); };
        tick();
      }
      setTimeout(() => { res.textContent = names[winner] === '나' ? `내가 ${suffix}!` : `${names[winner]}${josa(names[winner])} ${suffix}!`; res.classList.add('on'); }, DUR);
      setTimeout(() => { ov.style.transition = 'opacity .25s'; ov.style.opacity = '0'; setTimeout(() => { ov.remove(); done(); }, 250); }, total);
    });
  }
  window.CoinFlip = { show, josa, get busyUntil() { return busyUntil; } };
})();
