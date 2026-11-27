// 게임 화면 공통 연출 (모든 게임 페이지에서 같이 씀)
// - GameFX.countdown(sub): "잠시 후 게임이 시작돼요" 타이틀 → 3·2·1 카운트다운
// - GameFX.ask(title, sub, [[label, cls], ...]): 화면 안 확인 창 → 고른 번호 (닫으면 -1)
// - GameFX.rules(name, slides | html): 규칙을 한 장씩 넘겨 보는 창 (RULES · 점 · 이전/다음/확인)
// - GameFX.firstTime(key, show): 처음 하는 게임이면 "규칙 보기 / 건너뛰기"를 물어봄
(function () {
  if (window.GameFX) return;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const quick = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  const css = `
  .fx-ov { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; background: rgba(3, 10, 9, .78);
    padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
    font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; color: #f1eee4; animation: fxIn .16s ease-out; }
  @keyframes fxIn { from { opacity: 0; } }
  .fx-box { width: 100%; max-width: 380px; background: #0b2420; border: 1px solid rgba(241,238,228,.16); border-radius: 14px; padding: 20px; display: grid; gap: 10px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
  .fx-box .fx-t { font-size: 18px; font-weight: 700; margin: 0; word-break: keep-all; }
  .fx-box .fx-s { margin: 0; font-size: 14px; color: #a7bcb2; line-height: 1.5; word-break: keep-all; }
  .fx-btns { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-top: 6px; }
  .fx-ov button { font: inherit; font-weight: 700; font-size: 15px; cursor: pointer; border-radius: 10px; padding: 11px 14px; border: 1px solid rgba(241,238,228,.18); background: #163d35; color: #f1eee4; }
  .fx-ov button.primary { background: #f3b641; border-color: #f3b641; color: #1a1405; }
  .fx-ov button:focus-visible { outline: 2px solid #f3b641; outline-offset: 2px; }
  .fx-ov button:disabled { opacity: .35; cursor: default; }
  /* 규칙 슬라이드 */
  .fx-rules { max-width: 560px; padding: 0; overflow: hidden; gap: 0; max-height: 100%; display: flex; flex-direction: column; }
  .fx-rh { position: relative; text-align: center; padding: 18px 54px 12px; }
  .fx-rh small { display: inline-block; font: 600 11px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: .2em; color: #f3b641; border: 1px solid rgba(243,182,65,.5); border-radius: 4px; padding: 4px 7px 3px; }
  .fx-rh h2 { margin: 8px 0 0; font: 400 24px/1.15 "Black Han Sans", "Noto Sans KR", sans-serif; word-break: keep-all; }
  .fx-x { position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; padding: 0 !important; border-radius: 50% !important; font-size: 18px !important; }
  .fx-stage { margin: 0 16px; background: #10302a; border: 1px solid rgba(241,238,228,.1); border-radius: 12px; min-height: 210px; display: grid; align-content: center; padding: 20px 22px; overflow-y: auto; }
  .fx-step { font: 600 12px/1 "IBM Plex Mono", ui-monospace, monospace; color: #a7bcb2; letter-spacing: .12em; margin-bottom: 10px; }
  .fx-step b { color: #f3b641; font-size: 26px; font-family: "Black Han Sans", sans-serif; font-weight: 400; letter-spacing: 0; margin-right: 6px; }
  .fx-sh { font-size: 15px; font-weight: 700; color: #f3b641; margin: 0 0 8px; }
  .fx-body { font-size: 16px; line-height: 1.65; word-break: keep-all; }
  .fx-body b { color: #f3b641; }
  .fx-body ul, .fx-body ol { margin: 0; padding-left: 1.2em; display: grid; gap: 6px; }
  .fx-body p { margin: 0 0 6px; } .fx-body dl { margin: 0; } .fx-body dt { font-weight: 700; margin-top: 6px; } .fx-body dd { margin: 0; color: #d7dfd8; }
  .fx-body .note, .fx-body .rb-note { font-size: 13.5px; color: #a7bcb2; border-left: 3px solid #f3b641; padding: 4px 10px; margin-top: 10px; }
  .fx-foot { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 14px 16px 16px; }
  .fx-foot .prev { justify-self: start; } .fx-foot .next { justify-self: end; }
  .fx-dots { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; max-width: 180px; }
  .fx-dots i { width: 7px; height: 7px; transform: rotate(45deg); background: rgba(241,238,228,.25); }
  .fx-dots i.on { background: #f3b641; }
  @media (prefers-reduced-motion: no-preference) { .fx-stage.go { animation: fxSlide .22s ease-out; } }
  @keyframes fxSlide { from { opacity: 0; transform: translateX(14px); } }
  @media (max-width: 480px) { .fx-stage { min-height: 46vh; } .fx-rh h2 { font-size: 21px; } }
  /* 카운트다운 */
  .fx-cd { position: fixed; inset: 0; z-index: 1200; display: grid; place-content: center; justify-items: center; gap: 12px; color: #f1eee4;
    background: radial-gradient(circle at 50% 45%, #163d35 0, #071815 70%); transition: opacity .2s ease; font-family: "Noto Sans KR", sans-serif; }
  .fx-cd.out { opacity: 0; }
  .fx-card { display: grid; justify-items: center; gap: 8px; padding: 20px 34px 18px; border: 1px solid rgba(243,182,65,.55); outline: 1px solid rgba(243,182,65,.25); outline-offset: 4px; background: rgba(11,36,32,.9); text-align: center; }
  .fx-card b { font: 400 clamp(22px, 6vw, 30px)/1.2 "Black Han Sans", "Noto Sans KR", sans-serif; word-break: keep-all; }
  .fx-card span { font-size: 13px; color: #a7bcb2; display: flex; align-items: center; gap: 10px; }
  .fx-card span::before, .fx-card span::after { content: ""; width: 40px; height: 1px; background: rgba(243,182,65,.5); }
  .fx-num { font: 400 clamp(120px, 34vw, 220px)/1 "Black Han Sans", "Noto Sans KR", sans-serif; color: #f3b641; text-shadow: 0 0 40px rgba(243,182,65,.45); }
  .fx-ready { font: 600 12px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: .3em; color: #a7bcb2; display: flex; align-items: center; gap: 10px; }
  .fx-ready::before, .fx-ready::after { content: ""; width: 34px; height: 1px; background: rgba(241,238,228,.2); }
  @media (prefers-reduced-motion: no-preference) { .fx-num.pop { animation: fxPop .62s ease-out; } .fx-card { animation: fxCard .9s ease-out; } }
  @keyframes fxPop { 0% { opacity: 0; transform: scale(1.5); } 30% { opacity: 1; transform: scale(1); } 85% { opacity: 1; } 100% { opacity: .25; transform: scale(.92); } }
  @keyframes fxCard { 0% { opacity: 0; transform: scale(.94); } 25% { opacity: 1; transform: none; } }
  `;
  const st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  let busy = null; // 카운트다운이 겹치지 않게
  const GameFX = {
    countdown(sub) {
      if (busy) return busy;
      busy = new Promise(res => {
        const q = quick();
        const ov = el(`<div class="fx-cd" role="status" aria-live="assertive"><div class="fx-card"><b>잠시 후 게임이 시작돼요</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div></div>`);
        document.body.appendChild(ov);
        const nums = () => {
          ov.innerHTML = '<div class="fx-num"></div><div class="fx-ready">준비하세요</div>';
          const num = ov.querySelector('.fx-num');
          let n = 3;
          const step = () => {
            if (n === 0) { ov.classList.add('out'); setTimeout(() => { ov.remove(); busy = null; res(); }, q ? 0 : 200); return; }
            num.textContent = n; num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); n--;
            setTimeout(step, q ? 250 : 620);
          };
          step();
        };
        setTimeout(nums, q ? 300 : 1100);
      });
      return busy;
    },
    ask(title, sub, btns) {
      return new Promise(res => {
        const ov = el(`<div class="fx-ov" role="dialog" aria-modal="true"><div class="fx-box"><p class="fx-t">${esc(title)}</p>${sub ? `<p class="fx-s">${esc(sub)}</p>` : ''}<div class="fx-btns">${btns.map(([l, c], i) => `<button type="button" class="${c || ''}" data-i="${i}">${esc(l)}</button>`).join('')}</div></div></div>`);
        const done = i => { ov.remove(); document.removeEventListener('keydown', key, true); res(i); };
        const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(-1); } };
        ov.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) done(+b.dataset.i); else if (e.target === ov) done(-1); });
        document.addEventListener('keydown', key, true); document.body.appendChild(ov);
        const p = ov.querySelector('button.primary') || ov.querySelector('button'); p && p.focus();
      });
    },
    // 규칙 HTML을 슬라이드로 나눔: <section>·<h3> 단위, 아니면 목록 한 줄씩. 덧붙임(p.note 등)은 마지막 장에
    split(html) {
      const box = document.createElement('div'); box.innerHTML = html;
      const out = [];
      const secs = box.querySelectorAll(':scope > section');
      if (secs.length) { secs.forEach(s => { const h = s.querySelector(':scope > h3'); const t = h ? h.textContent : ''; if (h) h.remove(); out.push({ h: t, html: s.innerHTML }); }); return out; }
      let cur = null;
      [...box.childNodes].forEach(n => {
        if (n.nodeType === 3) { if (n.textContent.trim()) out.push({ html: esc(n.textContent) }); return; }
        if (n.nodeType !== 1) return;
        if (n.tagName === 'H3' || n.tagName === 'H4') { cur = { h: n.textContent, html: '' }; out.push(cur); return; }
        if ((n.tagName === 'UL' || n.tagName === 'OL') && !(cur && cur.h)) { [...n.children].forEach(li => out.push({ html: li.innerHTML })); cur = null; return; }
        if (cur) { cur.html += n.outerHTML; return; }
        const last = out[out.length - 1];
        if (last && /note|muted|rb-note/.test(n.className || '')) last.html += n.outerHTML; else out.push({ html: n.outerHTML });
      });
      return out.filter(s => s.html.trim() || s.h);
    },
    rules(name, src) {
      const slides = typeof src === 'string' ? GameFX.split(src) : src;
      if (!slides.length) return Promise.resolve();
      return new Promise(res => {
        let i = 0;
        const ov = el(`<div class="fx-ov" role="dialog" aria-modal="true" aria-label="${esc(name)} 규칙"><div class="fx-box fx-rules">
          <div class="fx-rh"><small>RULES</small><h2>${esc(name)}</h2><button type="button" class="fx-x" aria-label="규칙 닫기">✕</button></div>
          <div class="fx-stage" aria-live="polite"></div>
          <div class="fx-foot"><button type="button" class="prev">‹ 이전</button><div class="fx-dots"></div><button type="button" class="next primary">다음 ›</button></div></div></div>`);
        const stage = ov.querySelector('.fx-stage'), dots = ov.querySelector('.fx-dots'), prev = ov.querySelector('.prev'), next = ov.querySelector('.next');
        dots.innerHTML = slides.map(() => '<i></i>').join('');
        const draw = () => {
          const s = slides[i];
          stage.innerHTML = `<div class="fx-step"><b>${i + 1}</b>/ ${slides.length}</div>${s.h ? `<p class="fx-sh">${esc(s.h)}</p>` : ''}<div class="fx-body">${s.html}</div>`;
          stage.classList.remove('go'); void stage.offsetWidth; stage.classList.add('go'); stage.scrollTop = 0;
          dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i));
          prev.style.visibility = i ? 'visible' : 'hidden';
          next.textContent = i === slides.length - 1 ? '확인' : '다음 ›';
        };
        const done = () => { ov.remove(); document.removeEventListener('keydown', key, true); res(); };
        const go = d => { if (d > 0 && i === slides.length - 1) return done(); i = Math.max(0, Math.min(slides.length - 1, i + d)); draw(); };
        const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(); } else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
        ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.fx-x')) done(); else if (e.target.closest('.prev')) go(-1); else if (e.target.closest('.next')) go(1); });
        let sx = null; stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
        stage.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
        document.addEventListener('keydown', key, true); document.body.appendChild(ov); draw(); next.focus();
      });
    },
    seen(key) { return !!store.get('fx-seen:' + key); },
    async firstTime(key, show) {
      if (store.get('fx-seen:' + key)) return;
      store.set('fx-seen:' + key, '1');
      const i = await GameFX.ask('처음 하는 게임인가요?', '규칙을 한 장씩 넘겨 보며 익힐 수 있어요.', [['건너뛰기'], ['규칙 보기', 'primary']]);
      if (i === 1) await show();
    },
    // 처음 하는 게임이면, 시작 버튼(selector)을 누를 때 먼저 규칙 안내를 띄우고 이어서 원래 버튼을 눌러 줌
    gate(key, selector, show) {
      document.addEventListener('click', async e => {
        const t = e.target.closest && e.target.closest(selector);
        if (!t || t.disabled || GameFX.seen(key)) return;
        e.preventDefault(); e.stopImmediatePropagation();
        await GameFX.firstTime(key, show);
        if (t.isConnected) t.click();
      }, true);
    },
    // 게임 중 나가기 버튼(selector)을 누르면 확인 창. active()가 참일 때만 물어봄
    guardLeave(selector, active, sub) {
      let pass = false;
      document.addEventListener('click', async e => {
        const t = e.target.closest && e.target.closest(selector);
        if (!t || pass || !active()) return;
        e.preventDefault(); e.stopImmediatePropagation();
        const i = await GameFX.ask('게임을 그만두시겠어요?', typeof sub === 'function' ? sub() : sub, [['계속하기'], ['그만하기', 'primary']]);
        if (i === 1 && t.isConnected) { pass = true; try { t.click(); } finally { pass = false; } }
      }, true);
    },
  };
  window.GameFX = GameFX;
})();
