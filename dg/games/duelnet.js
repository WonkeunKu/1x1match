// 1:1 온라인 대결 도우미: 방 만들기 · 링크/코드로 들어가기 · 실시간 화면 받기(SSE) · 행동 보내기
// 사용: const net = LAB.duel('gradation', { el: 대기실 넣을 칸, opts, onView(v), onError(msg) }); net.start(); net.act({...}); net.close();
(function () {
  if (typeof LAB === 'undefined') return;
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  let ME = null; fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json()).then(d => { ME = d.user || null; }).catch(() => {});
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  LAB.roomParam = () => new URLSearchParams(location.search).get('room');
  LAB.duel = (game, o) => {
    let code = null, token = null, es = null, closed = false, last = null;
    const post = async (path, body) => {
      const r = await fetch('/api/duel' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || '연결에 실패했어요.'); return d;
    };
    const link = () => `${location.origin}${location.pathname}?room=${code}#${game}`;
    function connect() {
      if (es) es.close();
      es = new EventSource(`/api/duel/${code}/events?token=${token}`);
      es.onmessage = e => { const v = JSON.parse(e.data); last = v; if (!v.st) waitRoom(v); o.onView(v); };
      es.onerror = () => { if (closed) return; };
      store.set('duel:' + code, token);
      if (!LAB.roomParam()) history.replaceState(null, '', `${location.pathname}?room=${code}${location.hash}`);
    }
    function waitRoom(v) {
      o.el.hidden = false;
      o.el.innerHTML = `<div class="dn-box"><b>상대를 기다리는 중…</b>
        <p>아래 링크나 방 코드를 상대에게 보내세요. 상대가 들어오면 바로 시작해요.</p>
        <div class="dn-code">방 코드 <span>${esc(code)}</span></div>
        <div class="dn-link"><input readonly value="${esc(link())}"><button type="button" class="primary" data-copy>링크 복사</button></div>
        <button type="button" data-leave>나가기</button></div>`;
      o.el.querySelector('[data-copy]').onclick = async e => { try { await navigator.clipboard.writeText(link()); e.target.textContent = '복사했어요'; } catch { const i = o.el.querySelector('input'); i.select(); e.target.textContent = '선택됐어요 · 복사하세요'; } };
      o.el.querySelector('[data-leave]').onclick = () => { net.close(); net.lobby(); };
    }
    const net = {
      get code() { return code; }, get last() { return last; },
      lobby(msg) {
        o.el.hidden = false;
        const nameField = ME ? `<p class="muted">${esc(ME.nickname)} 님으로 들어가요</p>` : `<label class="dn-name">이름 <input id="dnName" maxlength="10" placeholder="상대에게 보일 이름" value="${esc(store.get('duel:name') || '')}"></label>`;
        o.el.innerHTML = `<div class="dn-box"><b>사람과 1:1 대결</b>
          <p>각자 자기 폰이나 컴퓨터로 같은 방에 들어와서 해요. 내 패는 상대 화면에 보이지 않아요.</p>
          ${nameField}
          <button type="button" class="primary" data-make>방 만들기</button>
          <div class="dn-join"><input id="dnCode" maxlength="4" placeholder="방 코드 4자리" autocapitalize="characters"><button type="button" data-join>들어가기</button></div>
          <p class="dn-err">${msg ? esc(msg) : ''}</p></div>`;
        const nm = () => { const i = o.el.querySelector('#dnName'); const v = i ? i.value.trim() : ''; if (i) store.set('duel:name', v); return v || '손님'; };
        o.el.querySelector('[data-make]').onclick = async () => { try { const d = await post('', { game, name: nm(), opts: o.opts ? o.opts() : {} }); code = d.code; token = d.token; connect(); } catch (e) { net.lobby(e.message); } };
        o.el.querySelector('[data-join]').onclick = () => net.join(o.el.querySelector('#dnCode').value.trim().toUpperCase(), nm());
      },
      async join(c, name) {
        if (!/^[A-Za-z0-9]{4}$/.test(c || '')) return net.lobby('방 코드 4자리를 넣어 주세요.');
        try { const d = await post(`/${c.toUpperCase()}/join`, { game, token: store.get('duel:' + c.toUpperCase()), name: name || (ME ? ME.nickname : store.get('duel:name')) || '손님' }); code = d.code; token = d.token; connect(); }
        catch (e) { history.replaceState(null, '', location.pathname + location.hash); net.lobby(e.message); }
      },
      start() { const r = LAB.roomParam(); if (r) { o.el.hidden = false; o.el.innerHTML = '<div class="dn-box"><b>방에 들어가는 중…</b></div>'; setTimeout(() => net.join(r), ME === null ? 300 : 0); } else net.lobby(); },
      async act(body) { try { await post(`/${code}/act`, { token, ...body }); return ''; } catch (e) { if (o.onError) o.onError(e.message); return e.message; } },
      close() { closed = true; if (es) es.close(); es = null; if (LAB.roomParam()) history.replaceState(null, '', location.pathname + location.hash); code = null; token = null; },
      hideLobby() { o.el.hidden = true; o.el.innerHTML = ''; },
    };
    return net;
  };
  // 게임 끝난 뒤 '다시 하기'(두 사람 모두 눌러야 새 판) 표시
  LAB.duelAgain = (v, net) => {
    const [mine, theirs] = v.again;
    return `<div class="dn-again">${mine ? '<span class="muted">상대가 다시 하기를 누르면 새 판이 시작돼요</span>' : `<button type="button" class="primary" data-again>다시 하기</button>`}${theirs && !mine ? '<span class="muted">상대가 한 판 더 원해요</span>' : ''}</div>`;
  };
})();
