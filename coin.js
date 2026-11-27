// 선(먼저 하는 사람) 정하기 연출: 추첨 보따리를 흔들어 번호 공을 하나씩 꺼냄
// 사용: CoinFlip.show({ names: ['나', 'AI'], winner: 0, title: '선공 정하기', suffix: '선공' })  → Promise (끝나면 resolve)
// 결과는 이미 정해져 있고(게임/서버가 정함) 그걸 보여 주기만 함. 1번 = winner, 나머지는 winner 다음 자리부터 차례대로
(function () {
  const DUR = 1900, HOLD = 1000; // 뽑는 시간, 결과 보여 주는 시간
  const css = `
  .cf-ov{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#163d35,#05100e 75%);padding:20px;font-family:"Noto Sans KR","Apple SD Gothic Neo",sans-serif;animation:cfIn .2s ease;color:#f1eee4}
  @keyframes cfIn{from{opacity:0}to{opacity:1}}
  .cf-box{display:grid;gap:14px;justify-items:center;text-align:center;width:min(100%,420px)}
  .cf-t{font:400 clamp(22px,6vw,30px)/1.2 "Black Han Sans","Noto Sans KR",sans-serif}
  .cf-s{font-size:13px;color:#a7bcb2;margin-top:-8px}
  .cf-bag{width:120px;height:128px;transform-origin:50% 85%}
  .cf-bag.shake{animation:cfShake .5s ease-in-out 2}
  @keyframes cfShake{0%,100%{transform:rotate(0)}20%{transform:rotate(-9deg)}45%{transform:rotate(8deg)}70%{transform:rotate(-5deg)}}
  .cf-list{display:grid;gap:8px;width:100%}
  .cf-row{display:flex;align-items:center;gap:12px;padding:9px 14px;border-radius:12px;background:#0b2420;border:1px solid rgba(241,238,228,.12);font-weight:700;font-size:15px;text-align:left;transition:border-color .3s,box-shadow .3s}
  .cf-row .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cf-ball{width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;font:700 14px/1 "IBM Plex Mono",ui-monospace,monospace;background:#163d35;color:#6f8a80;border:1.5px dashed rgba(241,238,228,.2)}
  .cf-ball.on{background:radial-gradient(circle at 35% 30%,#ffe29a,#f3b641 55%,#b9821c);color:#2a1a00;border:0;box-shadow:0 3px 8px rgba(0,0,0,.4);animation:cfPop .45s cubic-bezier(.3,1.7,.5,1)}
  @keyframes cfPop{0%{transform:translateY(-60px) scale(.4);opacity:0}100%{transform:none;opacity:1}}
  .cf-row.win{border-color:#f3b641;box-shadow:0 0 0 2px rgba(243,182,65,.3)}
  .cf-res{font:400 clamp(20px,5vw,26px)/1.2 "Black Han Sans","Noto Sans KR",sans-serif;color:#f3b641;min-height:32px;opacity:0;transition:opacity .25s}
  .cf-res.on{opacity:1}
  @media (prefers-reduced-motion:reduce){.cf-bag.shake,.cf-ball.on{animation:none}}`;
  function addCss() { if (document.getElementById('cf-css')) return; const s = document.createElement('style'); s.id = 'cf-css'; s.textContent = css; document.head.appendChild(s); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const josa = w => { const c = String(w).trim().slice(-1).charCodeAt(0); if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 ? '이' : '가'; return /[0-9]$/.test(w) ? ((/[013678]$/.test(w)) ? '이' : '가') : '가'; };
  const BAG = `<svg class="cf-bag" viewBox="0 0 120 128" aria-hidden="true">
    <ellipse cx="60" cy="121" rx="38" ry="5" fill="rgba(0,0,0,.35)"/>
    <path d="M42 30 C20 46 10 70 14 92 C18 114 40 122 60 122 C80 122 102 114 106 92 C110 70 100 46 78 30 Z" fill="#6b3fa0"/>
    <path d="M30 56 C24 72 24 92 34 106" stroke="rgba(255,255,255,.22)" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M40 22 C46 12 74 12 80 22 C84 28 78 34 60 34 C42 34 36 28 40 22 Z" fill="#7e4fb8"/>
    <path d="M40 31 Q60 40 80 31" stroke="#f3b641" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="60" cy="36" r="4.5" fill="#f3b641"/></svg>`;
  let busyUntil = 0;
  function show({ names, winner, title = '선공 정하기', suffix = '선공' }) {
    addCss();
    const n = names.length, order = Array.from({ length: n }, (_, k) => (winner + k) % n); // 뽑히는 순서: winner가 1번
    const ov = document.createElement('div'); ov.className = 'cf-ov'; ov.setAttribute('role', 'status'); ov.setAttribute('aria-live', 'polite');
    ov.innerHTML = `<div class="cf-box"><div class="cf-t">${esc(title)}</div><div class="cf-s">보따리에서 번호 공을 뽑아요</div>${BAG}
      <div class="cf-list">${names.map((nm, i) => `<div class="cf-row" data-i="${i}"><span class="cf-ball">?</span><span class="nm">${esc(nm)}</span></div>`).join('')}</div><div class="cf-res"></div></div>`;
    document.body.appendChild(ov);
    const total = DUR + HOLD; busyUntil = Date.now() + total + 250;
    const q = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return new Promise(done => {
      ov.querySelector('.cf-bag').classList.add('shake');
      // 흔든 뒤 공이 하나씩 나와 각자 자리로: 1번(선)부터
      const start = q ? 100 : 900, gap = Math.min(260, (DUR - start - 150) / Math.max(1, n));
      order.forEach((i, k) => setTimeout(() => {
        const row = ov.querySelector(`.cf-row[data-i="${i}"]`), b = row.querySelector('.cf-ball');
        b.textContent = k + 1; b.classList.add('on'); if (k === 0) row.classList.add('win');
      }, start + k * gap));
      setTimeout(() => { const res = ov.querySelector('.cf-res'); res.textContent = names[winner] === '나' ? `내가 ${suffix}!` : `${names[winner]}${josa(names[winner])} ${suffix}!`; res.classList.add('on'); }, DUR);
      setTimeout(() => { ov.style.transition = 'opacity .25s'; ov.style.opacity = '0'; setTimeout(() => { ov.remove(); done(); }, 250); }, total);
    });
  }
  window.CoinFlip = { show, josa, get busyUntil() { return busyUntil; } };
})();
