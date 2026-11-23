// 야구 게임 → 랠리픽(app.rallypick.com) 랜딩 배너
// 쓰는 법: <script src="/rallypick.js?v=1"></script> 후 rallypickCTA('blackwhite') 가 돌려주는 HTML을 화면에 넣기
// 링크에는 UTM(어느 게임·어느 자리에서 눌렀는지)이 붙고, 누르면 /api/pv 로 '→ 랠리픽' 방문 기록이 남아요.
(function () {
  var BASE = 'https://app.rallypick.com/';
  var SPOTS = { home: '홈 야구 폴더', auction: '연봉 경매', 'auction-ai': '연봉 경매 AI', blackwhite: '흑과 백 AI', 'blackwhite-online': '흑과 백 온라인' };
  var css = '' +
    '.rpk{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:linear-gradient(135deg,rgba(243,182,65,.16),rgba(243,182,65,.04));border:1px solid rgba(243,182,65,.55);border-radius:12px;padding:14px 16px;margin:12px 0;color:var(--chalk,#f1eee4);text-align:left}' +
    '.rpk .rpk-t{flex:1;min-width:200px}' +
    '.rpk .rpk-e{font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.14em;color:var(--amber,#f3b641);text-transform:uppercase}' +
    '.rpk b{display:block;font-size:16px;line-height:1.35;margin:2px 0;word-break:keep-all}' +
    '.rpk span.rpk-s{display:block;font-size:13px;color:var(--chalk-dim,#a7bcb2);word-break:keep-all}' +
    '.rpk a.rpk-go{flex:none;display:inline-flex;align-items:center;gap:6px;background:var(--amber,#f3b641);color:#1a1405;font-weight:700;text-decoration:none;border-radius:999px;padding:10px 18px;font-size:15px;white-space:nowrap}' +
    '.rpk a.rpk-go:hover{filter:brightness(1.08)}' +
    '.rpk a.rpk-go:focus-visible{outline:2px solid #fff;outline-offset:3px}';
  function addCss() {
    if (document.getElementById('rpk-css')) return;
    var s = document.createElement('style'); s.id = 'rpk-css'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }
  function url(spot) {
    return BASE + '?utm_source=1x1match&utm_medium=game&utm_campaign=baseball_games&utm_content=' + encodeURIComponent(spot);
  }
  var COPY = {
    home: ['KBO 판타지야구 랠리픽', '이 야구 게임들은 랠리픽이 만들었어요', 'KBO 선수로 내 팀을 꾸려 친구들과 매주 순위를 겨뤄요.'],
    result: ['KBO 판타지야구 랠리픽', '야구 좀 아시네요? 그 실력, 랠리픽에서 겨뤄 보세요', 'KBO 선수로 내 팀을 꾸리고, 실제 경기 기록으로 친구들과 매주 순위를 다퉈요.']
  };
  window.rallypickCTA = function (spot, kind) {
    addCss();
    var c = COPY[kind || (spot === 'home' ? 'home' : 'result')];
    return '<div class="rpk"><div class="rpk-t"><span class="rpk-e">' + c[0] + '</span><b>' + c[1] + '</b><span class="rpk-s">' + c[2] + '</span></div>' +
      '<a class="rpk-go" href="' + url(spot) + '" target="_blank" rel="noopener" data-rpk="' + spot + '">랠리픽 하러 가기 →</a></div>';
  };
  // 클릭 기록 (새 탭으로 열리므로 지금 하던 게임·방은 그대로 남아요)
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-rpk]') : null;
    if (!a) return;
    var spot = a.getAttribute('data-rpk');
    if (!SPOTS[spot]) return;
    try { fetch('/api/pv', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/out/rallypick/' + spot }), keepalive: true, credentials: 'same-origin' }).catch(function () {}); } catch (err) {}
  }, true);
  window.RALLYPICK_SPOTS = SPOTS;
})();
