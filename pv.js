// 방문자 집계: 페이지가 실제로 화면에 열렸을 때만 서버에 알림 (링크 미리보기·주소창 미리 불러오기·접속 확인 봇은 스크립트를 실행하지 않아서 안 셈)
(function () {
  function send() {
    try { fetch('/api/pv', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: location.pathname }), keepalive: true, credentials: 'same-origin' }).catch(function () {}); } catch (e) {}
  }
  if (document.visibilityState === 'prerender') document.addEventListener('visibilitychange', function f() { if (document.visibilityState !== 'prerender') { document.removeEventListener('visibilitychange', f); send(); } });
  else send();
})();
