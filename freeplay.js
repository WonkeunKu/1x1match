// 비회원 무료 1판: 게임마다 한 판은 로그인 없이, 그다음부터는 로그인·회원가입 안내
// 사용: if (!(await FreePlay.ok('slither', FreePlay.newId()))) return;
// 친구 방에 초대받아 들어가는 건 여기를 거치지 않으므로 언제나 가능.
(function () {
  const okCache = {};
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const css = `
  .fp-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(4,14,12,.78);display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
  .fp-box{width:100%;max-width:360px;background:#0b2420;color:#f1eee4;border:1px solid rgba(241,238,228,.14);border-top:4px solid #f3b641;border-radius:14px;padding:22px 20px;display:grid;gap:10px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.45)}
  .fp-box h2{margin:0;font-size:20px;line-height:1.3;word-break:keep-all}
  .fp-box p{margin:0;font-size:14px;line-height:1.55;color:#a7bcb2;word-break:keep-all}
  .fp-box a,.fp-box button{display:block;font:inherit;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;padding:11px 14px;cursor:pointer;border:1px solid rgba(241,238,228,.14)}
  .fp-login{background:#f3b641;color:#1a1405;border-color:#f3b641!important}
  .fp-join{background:#163d35;color:#f1eee4}
  .fp-close{background:transparent;color:#a7bcb2;border:0!important;padding:6px!important;font-weight:500!important;font-size:13px!important}
  .fp-toast{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483000;background:#0b2420;color:#f1eee4;border:1px solid rgba(243,182,65,.6);border-radius:999px;padding:9px 16px;font:500 13px "Noto Sans KR","Apple SD Gothic Neo",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:calc(100vw - 32px);text-align:center;word-break:keep-all;transition:opacity .4s}
  .fp-toast a{color:#f3b641;font-weight:700;text-decoration:none;margin-left:6px}`;
  function addCss() { if (document.getElementById('fp-css')) return; const s = document.createElement('style'); s.id = 'fp-css'; s.textContent = css; document.head.appendChild(s); }
  const back = () => encodeURIComponent(location.pathname + location.search + location.hash);
  function show() {
    addCss(); if (document.querySelector('.fp-ov')) return;
    const ov = document.createElement('div'); ov.className = 'fp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="fp-box">
      <h2>무료 한 판을 다 했어요</h2>
      <p>로그인하지 않으면 게임마다 한 판씩만 해 볼 수 있어요. 로그인하면 계속 플레이하고 경기 기록도 남아요.</p>
      <a class="fp-login" href="/account/?next=${back()}">로그인하고 계속하기</a>
      <a class="fp-join" href="/account/?tab=signup&next=${back()}">회원가입 (1분)</a>
      <button type="button" class="fp-close">닫기</button>
      <p style="font-size:12px">친구가 보낸 방 링크로 들어가는 건 로그인 없이도 돼요.</p></div>`;
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.fp-close')) ov.remove(); });
    document.body.appendChild(ov);
    ov.querySelector('.fp-login').focus();
  }
  function toast() {
    addCss(); const t = document.createElement('div'); t.className = 'fp-toast';
    t.innerHTML = `로그인하지 않으면 게임마다 한 판씩 무료예요<a href="/account/?next=${back()}">로그인</a>`;
    document.body.appendChild(t); setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 4500);
  }
  async function ok(game, play) {
    const k = game + '|' + play; if (okCache[k]) return true;
    let d;
    try {
      const r = await fetch('/api/free', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ game, play }) });
      if (!r.ok) return true; // 서버 문제면 막지 않음
      d = await r.json();
    } catch (e) { return true; }
    if (d.ok) { okCache[k] = true; if (d.first) toast(); return true; }
    show(); return false;
  }
  window.FreePlay = { ok, newId, show };
})();
