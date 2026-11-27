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
    const F = o.front || null;
    const post = async (path, body) => {
      const r = await fetch('/api/duel' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || '연결에 실패했어요.'); return d;
    };
    const link = () => `${location.origin}${location.pathname}?room=${code}#${game}`;
    function connect() {
      if (es) es.close();
      es = new EventSource(`/api/duel/${code}/events?token=${token}`);
      es.onmessage = e => { const v = JSON.parse(e.data); last = v; if (!v.st) (F ? F.room(v, net) : o.onWait ? o.onWait(v) : waitRoom(v)); else if (F) F.playing(v); o.onView(v); };
      es.onerror = () => { if (closed) return; };
      store.set('duel:' + code, token);
      if (!LAB.roomParam()) history.replaceState(null, '', `${location.pathname}?room=${code}${location.hash}`);
    }
    function waitRoom(v) {
      o.el.hidden = false;
      if (v.multi) { // 여럿이 하는 방: 들어온 사람 목록 + 방장 시작 버튼
        const joined = v.players.filter(Boolean).length;
        o.el.innerHTML = `<div class="dn-box"><b>참가자를 기다리는 중… (${joined}/${v.n})</b>
          <p>아래 링크나 방 코드를 보내세요. 자리가 다 차면 바로 시작해요.${v.seat === 0 ? ' 먼저 시작하면 빈자리는 AI가 채워요.' : ''}</p>
          <div class="dn-code">방 코드 <span>${esc(code)}</span></div>
          <div class="dn-link"><input readonly value="${esc(link())}"><button type="button" class="primary" data-copy>링크 복사</button></div>
          <ol class="dn-seats">${v.players.map((p, k) => `<li class="${p ? '' : 'empty'}">${p ? esc(p.name) + (k === v.seat ? ' (나)' : '') + (k === 0 ? ' · 방장' : '') : '빈자리'}</li>`).join('')}</ol>
          ${v.seat === 0 ? `<button type="button" class="primary" data-start ${joined < 2 ? 'disabled' : ''}>지금 시작 (빈자리 ${v.n - joined}개는 AI)</button>` : '<p class="muted">방장이 시작하기를 기다리는 중…</p>'}
          <button type="button" data-leave>나가기</button><p class="dn-err"></p></div>`;
        const st = o.el.querySelector('[data-start]'); if (st) st.onclick = async () => { const e = await net.act({ type: 'start' }); if (e) o.el.querySelector('.dn-err').textContent = e; };
      } else
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
        const nameField = ME ? `<p class="muted">${esc(ME.nickname)} 님으로 들어가요</p>` : `<label class="dn-name">이름 <input id="dnName" maxlength="10" placeholder="다른 사람에게 보일 이름" value="${esc(store.get('duel:name') || '')}"></label>`;
        o.el.innerHTML = `<div class="dn-box"><b>${esc(o.title || '사람과 1:1 대결')}</b>
          <p>각자 자기 폰이나 컴퓨터로 같은 방에 들어와서 해요. 내 패는 ${o.title ? '다른 사람' : '상대'} 화면에 보이지 않아요.</p>
          ${nameField}
          <button type="button" class="primary" data-make>방 만들기</button>
          <div class="dn-join"><input id="dnCode" maxlength="4" placeholder="방 코드 4자리" autocapitalize="characters"><button type="button" data-join>들어가기</button></div>
          <p class="dn-err">${msg ? esc(msg) : ''}</p></div>`;
        const nm = () => { const i = o.el.querySelector('#dnName'); const v = i ? i.value.trim() : ''; if (i) store.set('duel:name', v); return v || '손님'; };
        o.el.querySelector('[data-make]').onclick = async () => { try { const d = await post('', { game, name: nm(), opts: o.opts ? o.opts() : {} }); code = d.code; token = d.token; connect(); } catch (e) { net.lobby(e.message); } };
        o.el.querySelector('[data-join]').onclick = () => net.join(o.el.querySelector('#dnCode').value.trim().toUpperCase(), nm());
      },
      async create(name) { const d = await post('', { game, name: name || '손님', opts: o.opts ? o.opts() : {} }); code = d.code; token = d.token; connect(); }, // 직접 만든 시작 화면용
      link, me: () => ME,
      async join(c, name) {
        if (!/^[A-Za-z0-9]{4}$/.test(c || '')) return F ? F.menu('방 코드 4자리를 넣어 주세요.') : net.lobby('방 코드 4자리를 넣어 주세요.');
        try { const d = await post(`/${c.toUpperCase()}/join`, { game, token: store.get('duel:' + c.toUpperCase()), name: name || (ME ? ME.nickname : store.get('duel:name')) || '손님' }); code = d.code; token = d.token; connect(); }
        catch (e) { history.replaceState(null, '', location.pathname + location.hash); if (F) F.menu(e.message); else if (o.onJoinFail) o.onJoinFail(e.message); else net.lobby(e.message); }
      },
      start() {
        if (F) { // 시작 화면(LAB.duelFront)에서 고른 행동 실행
          F.net = net; const p = F.take();
          if (p && p.create) { o.el.hidden = false; net.create(p.name).catch(e => F.menu(e.message)); return; }
          if (p && p.join) { net.join(p.join, p.name); return; }
        }
        const r = LAB.roomParam(); if (r) { o.el.hidden = false; o.el.innerHTML = '<div class="dn-box"><b>방에 들어가는 중…</b></div>'; setTimeout(() => net.join(r), ME === null ? 300 : 0); } else net.lobby(); },
      async act(body) { try { await post(`/${code}/act`, { token, ...body }); return ''; } catch (e) { if (o.onError) o.onError(e.message); return e.message; } },
      close() { closed = true; if (es) es.close(); es = null; if (LAB.roomParam()) history.replaceState(null, '', location.pathname + location.hash); code = null; token = null; },
      hideLobby() { o.el.hidden = true; o.el.innerHTML = ''; },
    };
    return net;
  };

  // 모든 대결 게임 공통 시작 화면 (무거운13·슬리더링크와 같은 흐름)
  // 시작 화면: [친구와 하기: 방 만들기 / 코드로 참가] [혼자 AI와 연습: 옵션 + AI와 바로 시작] → 대기실(방장이 설정·시작) → 게임
  // c = { el, gameEl, friendLabel, soloLabel, modeOpt:{key,label,opts,def,desc:{값:설명}}(맨 위 게임 모드, 선택), alone:{label,desc}(상대 없이 혼자 하는 칸, 선택), soloOpts:[{key,label,opts:[[v,l]],def}], roomOpts:[...], onStart(mode 'ai'|'alone'|'net', cfg), onLeave() }
  LAB.duelFront = c => {
    const solo = {}, roomCfg = {}; (c.soloOpts || []).forEach(x => { solo[x.key] = x.def; }); (c.roomOpts || []).forEach(x => { roomCfg[x.key] = x.def; });
    const mode = c.modeOpt ? { [c.modeOpt.key]: c.modeOpt.def } : {}; // 모든 방식에 공통으로 붙는 게임 모드(선택)
    let pending = null, err = '', lastRoom = null;
    const segRow = (key, opts, cur, dis) => `<div class="seg" data-fk="${key}">${opts.map(([v, l]) => `<button type="button" class="${v === cur ? 'on' : ''}" data-v="${v}" ${dis ? 'disabled' : ''}>${l}</button>`).join('')}</div>`;
    const nameOf = () => ME ? ME.nickname : (store.get('duel:name') || '');
    // 게임 화면 위 막대: 지금 판 이름 + 나가기
    // 게임 화면 위 막대 (common.js LAB.gameBar): 게임 이름 · 판 정보 | 규칙 · 나가기
    const gw = c.gameEl.closest('.g-wrap');
    const GB = LAB.gameBar(gw || c.gameEl, Object.assign(() => F.leave(), { net: () => !!F.net }));
    const bar = GB.el;
    let lobby = false; // 방 대기실을 거쳐 게임이 시작될 때만 카운트다운
    const focus = on => GB.show(on);
    const F = {
      net: null,
      take() { const p = pending; pending = null; return p; },
      label(t) { GB.label(t); },
      menu(msg) {
        err = msg || ''; lastRoom = null;
        if (F.net) { try { F.net.close(); } catch {} F.net = null; }
        c.gameEl.hidden = true; c.el.hidden = false; focus(false); lobby = false;
        const mo = c.modeOpt, mv = mo && mode[mo.key];
        c.el.innerHTML = `<div class="df-menu">
          ${mo ? `<div class="df-box"><div class="df-lab">${esc(mo.label)}</div>${segRow('m:' + mo.key, mo.opts, mv)}${mo.desc && mo.desc[mv] ? `<p class="muted">${esc(mo.desc[mv])}</p>` : ''}</div>` : ''}
          <div class="df-box">${ME ? `<p class="muted">${esc(ME.nickname)} 님으로 참가해요</p>` : `<label class="df-lab" for="dfNm">내 이름</label><input id="dfNm" maxlength="10" placeholder="게임에서 보일 이름" value="${esc(nameOf())}" autocomplete="nickname">`}
            <div class="df-lab">${esc(c.friendLabel || '친구와 1:1 대결')}</div>
            <button type="button" class="primary" data-fm="create">방 만들기</button>
            <div class="df-join"><input id="dfCode" maxlength="4" placeholder="방 코드 4자리" autocomplete="off"><button type="button" data-fm="join">참가</button></div></div>
          ${c.alone ? `<div class="df-box"><div class="df-lab">${esc(c.alone.label || '혼자 하기')}</div>${c.alone.desc ? `<p class="muted">${esc(c.alone.desc)}</p>` : ''}<button type="button" data-fm="alone">혼자 시작</button></div>` : ''}
          <div class="df-box"><div class="df-lab">${esc(c.soloLabel || '혼자 AI와 연습')}</div>
            ${(c.soloOpts || []).map(x => `<div class="df-lab sub">${esc(x.label)}</div>${segRow('s:' + x.key, x.opts, solo[x.key])}`).join('')}
            <button type="button" data-fm="solo">AI와 바로 시작</button></div>
          <p class="dn-err">${esc(err)}</p></div>`;
        const nm = c.el.querySelector('#dfNm'); if (nm) nm.oninput = () => store.set('duel:name', nm.value.trim());
      },
      room(v, net) {
        F.net = net; lastRoom = v; c.gameEl.hidden = true; c.el.hidden = false; focus(false); lobby = true;
        const host = v.seat === 0, o = v.opts || {};
        const people = v.multi ? v.players : [{ name: v.me, online: true }, v.opp ? { name: v.opp, online: v.oppOnline } : null];
        const joined = people.filter(Boolean).length, ready = v.multi || joined >= 2;
        c.el.innerHTML = `<div class="df-menu">
          <div class="df-box"><div class="df-code"><small>방 코드</small><b>${esc(v.code)}</b><button type="button" data-fm="copy">초대 링크 복사</button></div>
            <p class="muted">코드나 초대 링크를 보내면 같이 할 수 있어요.${v.multi ? ' 빈자리는 시작할 때 AI가 채워요.' : ''}</p></div>
          <div class="df-box"><div class="df-lab">참가자 ${joined}명${v.multi ? ` · AI ${v.n - joined}명` : ' / 2명'}</div>
            <div class="df-mems">${people.map((p, k) => p ? `<div class="df-mem"><span class="dot ${p.online ? 'on' : ''}"></span>${esc(p.name)}${(v.multi ? k === v.seat : k === 0) ? ' <span class="muted">(나)</span>' : ''}${(v.multi ? k === 0 : host === (k === 0)) ? '<span class="tag">방장</span>' : ''}</div>` : `<div class="df-mem ai">${v.multi ? '빈자리 → AI' : '상대를 기다리는 중…'}</div>`).join('')}</div></div>
          <div class="df-box">${(c.roomOpts || []).map(x => `<div class="df-lab sub">${esc(x.label)}</div>${segRow('r:' + x.key, x.opts, o[x.key] ?? x.def, !host)}`).join('')}
            ${host ? `<button type="button" class="primary" data-fm="start" ${ready ? '' : 'disabled'}>게임 시작</button>${ready ? '' : '<p class="muted">상대가 들어오면 시작할 수 있어요</p>'}` : '<p class="muted">방장이 시작하기를 기다리는 중…</p>'}
            <button type="button" data-fm="leave">방 나가기</button></div>
          <p class="dn-err" data-ferr></p></div>`;
      },
      playing(v) { lastRoom = v; const fresh = c.gameEl.hidden; c.el.hidden = true; c.gameEl.hidden = false; focus(true); F.label(`방 ${v.code}${v.multi ? ` · ${v.n}인` : ' · 1:1'}`); if (fresh) LAB.ended = false; if (fresh && lobby) { lobby = false; LAB.countdown(`방 ${v.code}${v.multi ? ` · ${v.n}인` : ' · 1:1'}`); } },
      solo(text) { c.el.hidden = true; c.gameEl.hidden = false; focus(true); LAB.ended = false; F.label(text || 'AI와 연습'); },
      leave() {
        if (F.net && lastRoom && !lastRoom.st && lastRoom.seat !== 0) F.net.act({ type: 'leave' });
        c.onLeave && c.onLeave(); F.menu();
      },
    };
    const needName = () => { if (ME || nameOf()) return false; F.menu('이름을 입력하세요'); const i = c.el.querySelector('#dfNm'); i && i.focus(); return true; };
    const onClick = async e => {
      const sg = e.target.closest('[data-fk] [data-v]');
      if (sg && !sg.disabled) { const [kind, key] = sg.parentElement.dataset.fk.split(':'), raw = sg.dataset.v, val = isNaN(+raw) ? raw : +raw;
        if (kind === 's') { solo[key] = val; sg.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === sg)); }
        else if (kind === 'm') { mode[key] = val; roomCfg[key] = val; F.menu(err); }
        else if (F.net) { const er = await F.net.act({ type: 'settings', [key]: val }); const box = c.el.querySelector('[data-ferr]'); if (er && box) box.textContent = er; }
        return; }
      const b = e.target.closest('[data-fm]'); if (!b || b.disabled) return;
      const k = b.dataset.fm;
      if ((k === 'solo' || k === 'alone' || k === 'create' || k === 'join') && LAB.beforeStart && !(await LAB.beforeStart())) return; // 공개 페이지: 비회원은 게임마다 한 판
      if (k === 'solo' || k === 'alone' || k === 'create' || k === 'join') await LAB.firstTime(); // 처음 하는 게임이면 규칙 안내
      if (k === 'solo') { F.solo(); await LAB.countdown(bar.querySelector('[data-lab]').textContent); c.onStart('ai', { ...solo, ...mode }); }
      else if (k === 'alone') { F.solo((c.alone && c.alone.label) || '혼자 하기'); await LAB.countdown(bar.querySelector('[data-lab]').textContent); c.onStart('alone', { ...solo, ...mode }); }
      else if (k === 'create') { if (needName()) return; pending = { create: true, name: nameOf() || '손님' }; c.onStart('net', { ...roomCfg, ...mode }); }
      else if (k === 'join') { if (needName()) return; const code = (c.el.querySelector('#dfCode').value || '').trim().toUpperCase(); if (!/^[A-Z0-9]{4}$/.test(code)) return F.menu('4자리 코드를 입력하세요'); pending = { join: code, name: nameOf() || '손님' }; c.onStart('net', { ...roomCfg }); }
      else if (k === 'start' && F.net) { const er = await F.net.act({ type: 'start' }); const box = c.el.querySelector('[data-ferr]'); if (er && box) box.textContent = er; }
      else if (k === 'leave') F.leave();
      else if (k === 'copy' && F.net) { const url = F.net.link(); try { await navigator.clipboard.writeText(url); b.textContent = '복사했어요'; } catch { b.textContent = url; } }
    };
    c.el.addEventListener('click', onClick);
    return F;
  };
  // 게임 끝난 뒤 '다시 하기'(두 사람 모두 눌러야 새 판) 표시
  LAB.duelAgain = (v, net) => {
    const [mine, theirs] = v.again;
    return `<div class="dn-again">${mine ? '<span class="muted">상대가 다시 하기를 누르면 새 판이 시작돼요</span>' : `<button type="button" class="primary" data-again>다시 하기</button>`}${theirs && !mine ? '<span class="muted">상대가 한 판 더 원해요</span>' : ''}</div>`;
  };
})();
