const icons={spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>',calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6"/></svg>',bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>',pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m5 12 4 4L19 6"/></svg>',search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'};

const eventFilters = window.EventlyFilters;
const memberPages=['events','profile','friends','inbox','activity'];
const state = {
  token: localStorage.getItem('evently-token') || '', user: null, page: memberPages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home',
  events: [], friends: [], users: [], invitations: [], friendRequests: [], joinRequests: [], activity: [],
  activityPage:1,activityFilter:'all',friendTab:'friends',friendPage:1,friendSort:'name', query: '', eventPeriod: 'upcoming', eventSelection: eventFilters.emptySelection(), eventFilterDraft: null, eventFilterGroup: 'categories', inboxTab: 'all', authMode: 'login', authOpen: false, authIntent: null, eventsLoading: false, eventsError: ''
};
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
let toastTimer, returnFocus, publicLoadId = 0;
const arrowRight = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const logoutIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 4H5v16h5m4-12 4 4-4 4m-6-4h10"/></svg>';
async function api(action, payload = {}) {
  const requestToken=state.token;
  const response = await fetch('/api', { method: 'POST', headers: {'content-type':'application/json', ...(state.token ? {authorization:`Bearer ${state.token}`} : {})}, body:JSON.stringify({action,payload}) });
  const result = await response.json();
  if (!result.ok) {
    if(response.status===401 && requestToken && requestToken===state.token && !['login','register','me'].includes(action)) {
      closeModal();resetMemberState();state.page='events';routeURL('events');render();authModal('login');
    }
    const error=Error(result.error || 'Có lỗi xảy ra. Vui lòng thử lại.');error.status=response.status;throw error;
  }
  return result.data;
}
function esc(value = '') { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function initials(name = '') { return String(name || '?').trim().split(/\s+/).slice(-2).map(n => n[0]).join('').toUpperCase(); }
function toast(message, error = false) {
  clearTimeout(toastTimer);
  const el = document.querySelector('#toast'); el.textContent = message; el.className = `toast show${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => el.className = 'toast', 3500);
}
function dateParts(value) {
  const d = new Date(value), valid = Number.isFinite(d.getTime());
  if (!valid) return {day:'—', month:'', short:'Chưa có thời gian', full:'Chưa có thời gian', time:'', weekday:''};
  return {day:d.toLocaleDateString('vi-VN',{day:'2-digit'}), month:`THÁNG ${d.getMonth()+1}`, short:d.toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'}), full:d.toLocaleDateString('vi-VN',{day:'numeric',month:'long',year:'numeric'}), time:d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}), weekday:d.toLocaleDateString('vi-VN',{weekday:'long'})};
}
function localInputTime(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16) : ''; }
function brand() { return '<span class="brand"><span class="brand-name">evently</span></span>'; }
function meadowArt() {
  return '<video id="meadow-film" class="meadow-film" muted loop playsinline preload="metadata" poster="/assets/meadow-poster.jpg" aria-hidden="true"><source src="/assets/meadow-loop.mp4" type="video/mp4"></video><div class="meadow-wildlife" aria-hidden="true"><canvas class="meadow-creature" width="1920" height="690" aria-hidden="true"></canvas><span class="meadow-butterfly butterfly-one"><img src="/assets/voxel-butterfly.svg" alt="" draggable="false" width="40" height="32"></span><span class="meadow-butterfly butterfly-two"><img src="/assets/voxel-butterfly.svg" alt="" draggable="false" width="40" height="32"></span></div>';
}
function avatar(user, size = '') { return `<span class="avatar ${size}" aria-hidden="true">${esc(initials(user?.name))}</span>`; }
function emptyState(title, copy, action = '', label = '') {
  return `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">${icons.calendar}</span><h3>${esc(title)}</h3><p>${esc(copy)}</p>${action ? `<button class="btn secondary" data-action="${action}">${esc(label)} ${arrowRight}</button>` : ''}</div>`;
}
function landing() {
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  return `<main class="landing">
    <header class="landing-nav">
      ${brand()}
      <nav aria-label="Điều hướng chính">
        <a class="current" href="#hero-heading" aria-current="page">Khám phá</a>
        <button data-action="browse-events">Sự kiện</button>
      </nav>
      <button class="black-pill nav-cta" data-action="open-login">Đăng nhập</button>
    </header>
    <section class="landing-hero" aria-labelledby="hero-heading">
      <div class="hero-copy">
        <h1 id="hero-heading">Hẹn nhau nhé.</h1>
        <p class="hero-description">Sự kiện nhỏ. Kỷ niệm dài.</p>
        <button class="black-pill hero-cta" data-action="open-login">Đăng nhập ${arrow}</button>
      </div>
      <div class="meadow-wrap">${meadowArt()}</div>
    </section>
  </main>`;
}
const eyeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOffIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 3 18 18M10.6 5.1c.5-.1.9-.1 1.4-.1 6.5 0 10 7 10 7a18 18 0 0 1-3.2 3.8M6.1 6.1A20 20 0 0 0 2 12s3.5 7 10 7c2 0 3.8-.6 5.3-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
// Code-native blocks share the meadow's stepped geometry and warm light.
function voxelBlock(x, y, w, h, d, front, top, side) {
  const rise = d * .6;
  return `<path d="M${x} ${y}l${d} ${-rise}h${w}l${-d} ${rise}Z" fill="${top}"/><path d="M${x+w} ${y}l${d} ${-rise}v${h}l${-d} ${rise}Z" fill="${side}"/><path d="M${x} ${y}h${w}v${h}h${-w}Z" fill="${front}"/>`;
}
function voxelFlower(x, y, unit, palette, stem = 0) {
  const [front, top, side] = palette;
  const depth = unit * .32;
  let shapes = stem ? voxelBlock(x+unit*1.3,y+unit*2.4,unit*.38,stem,depth*.65,'#70843c','#9bab52','#53682a') : '';
  if(stem>unit)shapes += voxelBlock(x+unit*.35,y+unit*2.4+stem*.55,unit,unit*.3,depth,'#839b45','#a6ba62','#637d32');
  for(const [a,b] of [[1,0],[0,1],[2,1],[1,2]])shapes+=voxelBlock(x+a*unit,y+b*unit,unit,unit,depth,front,top,side);
  shapes+=voxelBlock(x+unit,y+unit,unit,unit,depth*1.15,'#d9b343','#f5d66c','#b6922b');
  return shapes;
}
function meadowBloom() {
  return `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">${voxelFlower(7,8,10,['#f3eddb','#fffcef','#cec9b7'])}</svg>`;
}
function meadowSprig() {
  const violet = voxelFlower(7,35,11,['#9874b7','#b99ace','#73528f'],42);
  const cream = voxelFlower(47,13,12,['#eee8d3','#fff9e8','#c7c3af'],64);
  const pink = voxelFlower(92,50,9,['#c77796','#df9cb2','#9e5874'],35);
  const grass = voxelBlock(13,111,28,10,6,'#8c9d4e','#afbd6f','#6f813b') + voxelBlock(46,105,35,15,7,'#92a554','#b3c77a','#748842') + voxelBlock(84,112,29,9,6,'#879c48','#adbf6b','#687e33');
  return `<svg viewBox="0 0 128 128" fill="none" aria-hidden="true" focusable="false">${grass}${violet}${cream}${pink}</svg>`;
}
function isOwner(e) { return !!state.user && e.owner === state.user.id; }
function attendeeCount(e) { return e.attendeeCount ?? e.attendees?.length ?? 0; }
function authGardenArt() {
  const palettes={cream:['#fff8dd','#fffef0','#cdc9a8'],lilac:['#a17ac2','#cfafe7','#795797'],gold:['#dfba53','#f7dc8c','#b19036'],pink:['#d68a9e','#efb6c5','#af687f']};
  const bloom=(x,y,size,tone,height,index)=>{
    const u=size/5,colors=palettes[tone];
    let art=voxelBlock(x-u*.2,y+u,u*.42,height,u*.4,'#6f8441','#a8bc71','#50682e');
    art+=voxelBlock(x-u*1.7,y+height*.65,u*1.5,u*.42,u*.35,'#90a858','#bfd18c','#70873e');
    art+=voxelBlock(x+u*.2,y+height*.45,u*1.2,u*.35,u*.3,'#90a858','#bfd18c','#70873e');
    for(const [dx,dy] of [[0,-2],[-1,-1],[1,-1],[-2,0],[2,0],[-1,1],[1,1],[0,2]])art+=voxelBlock(x+dx*u-u/2,y+dy*u-u/2,u,u,u*.38,...colors);
    art+=voxelBlock(x-u*.7,y-u*.7,u*1.4,u*1.4,u*.5,'#d6ae3d','#f4d674','#ac892b');
    return `<g class="auth-flower" style="--flower-root:${x}px ${y+height+u}px;--flower-delay:${index*-.85}s;--flower-speed:${5.4+index*.6}s">${art}</g>`;
  };
  let grass='';
  for(const [x,y,w,h] of [[-5,182,47,11],[49,175,38,18],[96,188,43,9],[147,182,34,14],[194,189,39,8],[245,179,43,17],[297,186,32,11],[339,174,41,21],[391,182,53,15]])grass+=voxelBlock(x,y,w,h,5,'#afbf7f','#d0dca4','#91a563');
  const butterfly=`<g class="auth-art-butterfly"><g class="auth-art-wings"><path d="M221 69h-11l-4 6 5 12h9l6-11Z" fill="#9972b8"/><path d="M229 69h11l4 6-5 12h-9l-6-11Z" fill="#bb9ad5"/><path d="M211 72h6v5h-6ZM232 72h6v5h-6Z" fill="#edd68d"/><path d="M210 69h11l-4 3h-9ZM229 69h11l2 3h-10Z" fill="#dfc8ee"/></g><path d="M223 71h4v16h-4ZM221 66h3v6h-3ZM227 65h3v7h-3Z" fill="#667844"/></g>`;
  return `<svg viewBox="0 0 440 204" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden="true" focusable="false"><path d="M0 159h46v-8h60v9h51v-9h59v9h69v-10h47v9h57v-8h51v53H0Z" fill="#d5dfb7"/><path d="M0 176h68v-6h48v7h65v-9h52v9h76v-9h55v8h76v28H0Z" fill="#bfce94"/>${grass}${bloom(52,94,49,'cream',79,0)}${bloom(123,132,33,'lilac',48,1)}${bloom(190,154,24,'gold',30,2)}${bloom(287,105,44,'cream',72,3)}${bloom(356,133,39,'pink',47,4)}${bloom(416,153,28,'lilac',30,5)}${butterfly}</svg>`;
}
function authModal(mode = 'login', values = {}) {
  state.authMode = mode;
  state.authOpen = true;
  const register = mode === 'register';
  const authField = (name, label, type, autocomplete, extra = '') => `<div class="field auth-field"><div class="auth-input-wrap"><label for="auth-${name}">${label}</label><input id="auth-${name}" name="${name}" type="${type}" placeholder="${name==='email'?'ban@email.com':name==='name'?'Họ tên của bạn':'Nhập mật khẩu'}" autocomplete="${autocomplete}" ${name !== 'password' ? `value="${esc(values[name] || '')}"` : ''} ${extra} required>${name === 'password' ? `<button class="password-toggle" type="button" data-action="toggle-password" aria-label="Hiện mật khẩu" aria-pressed="false" aria-controls="auth-password">${eyeIcon}</button>` : ''}</div></div>`;
  showDialog(`<div class="overlay auth-overlay" data-action="overlay-close">
    <section class="modal auth-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">
      <div class="auth-garden-art" aria-hidden="true">${authGardenArt()}</div>
      <button class="auth-close" type="button" data-action="close-modal" aria-label="Đóng ${register ? 'đăng ký' : 'đăng nhập'}">${closeIcon}</button>
      <header class="auth-garden-header"><h2 id="dialog-title" tabindex="-1">${register ? 'Tạo tài khoản.' : 'Hẹn nhau nhé.'}</h2><p id="dialog-description" class="${state.authIntent?.action==='join'?'auth-intent-note':'auth-sr-only'}">${state.authIntent?.action==='join' ? 'Đăng nhập để tham gia cuộc hẹn.' : register ? 'Tạo tài khoản bằng họ tên, email và mật khẩu.' : 'Đăng nhập bằng email và mật khẩu.'}</p></header>
      <form id="auth-form" class="auth-form" aria-label="${register ? 'Đăng ký tài khoản' : 'Đăng nhập'}">
        ${register ? authField('name', 'Họ và tên', 'text', 'name', 'maxlength="80"') : ''}
        ${authField('email', 'Email', 'email', register ? 'email' : 'username')}
        ${authField('password', 'Mật khẩu', 'password', register ? 'new-password' : 'current-password', register ? 'minlength="8" aria-describedby="password-hint"' : '')}
        ${register ? '<small id="password-hint" class="password-hint">Mật khẩu gồm ít nhất 8 ký tự.</small>' : ''}
        ${!register ? '<div class="auth-divider"><span>hoặc đăng nhập với</span></div><button class="google-signin" type="button" data-action="google-login"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.4-4.55H24v9.02h12.9c-.58 2.96-2.25 5.47-4.73 7.16l7.64 5.92c4.46-4.12 7.17-10.2 7.17-17.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.9l-7.64-5.92c-2.13 1.43-4.86 2.27-8.26 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.2C6.51 42.62 14.62 48 24 48Z"/></svg><span>Tiếp tục với Google</span></button>' : ''}
        <p class="form-error" role="alert" tabindex="-1" hidden></p>
        <div class="auth-submit-wrap"><button class="btn auth-submit" type="submit"><span>${register ? 'Tạo tài khoản' : 'Đăng nhập'}</span>${arrowRight}</button></div>
      </form>
      <p class="auth-switch"><span>${register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span><button type="button" data-action="toggle-auth">${register ? 'Đăng nhập' : 'Đăng ký tài khoản'}</button></p>
    </section>
  </div>`, '#dialog-title');
  window.EventlyMeadow?.stop();
}
function navButton(page, label, icon, count = 0, mobile = false) {
  return `<button class="app-nav-link ${state.page===page?'active':''}" data-page="${page}" ${state.page===page?'aria-current="page"':''}>${mobile ? icons[icon] : ''}<span>${label}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
}
function interfaceAccents() {
  return '<div class="interface-accents" aria-hidden="true"><span class="interface-butterfly butterfly-near"><img src="/assets/voxel-butterfly.svg" alt="" width="24" height="20"></span><span class="interface-butterfly butterfly-far"><img src="/assets/voxel-butterfly.svg" alt="" width="18" height="15"></span></div>';
}
function shell(content) {
  const pending = state.invitations.length + state.friendRequests.length + state.joinRequests.length;
  const nav = mobile => `${navButton('home','Tổng quan','spark',0,mobile)}${navButton('events','Sự kiện','calendar',0,mobile)}${navButton('friends','Bạn bè','users',0,mobile)}${navButton('inbox','Lời mời','bell',pending,mobile)}`;
  app.innerHTML = `<div class="workspace"><header class="app-header"><button class="wordmark-button" data-page="home" aria-label="Evently · Tổng quan">${brand()}</button><nav class="app-nav" aria-label="Điều hướng chính">${nav(false)}</nav><button class="profile-button" data-action="account" aria-label="Tài khoản của ${esc(state.user.name)}">${avatar(state.user)}<span>${esc(state.user.name.split(' ').slice(-2).join(' '))}</span></button></header>
    <main class="workspace-main ${state.page==='events'?'events-main':''}">${interfaceAccents()}${content}</main><footer class="app-footer"><span class="footer-wordmark">evently</span><span></span><button class="quiet-link" data-action="account">Tài khoản ${arrowRight}</button></footer><nav class="mobile-app-nav" aria-label="Điều hướng trên điện thoại">${nav(true)}</nav></div>`;
}
function publicShell(content) {
  app.innerHTML = `<div class="workspace public-workspace"><header class="landing-nav public-nav"><button class="wordmark-button" data-action="landing-home" aria-label="Evently · Trang chủ">${brand()}</button><nav aria-label="Điều hướng chính"><button data-action="landing-home">Trang chủ</button><button class="current" data-action="browse-events" aria-current="page">Sự kiện</button></nav><button class="black-pill nav-cta" data-action="open-login">Đăng nhập</button></header><main class="workspace-main events-main">${interfaceAccents()}${content}</main><footer class="app-footer"><span class="footer-wordmark">evently</span></footer></div>`;
}
function pageIntro(kicker, title, copy, action = true) {
  if (kicker === 'KẾT NỐI / HỘP THƯ') { kicker='HỘP THƯ'; title='Lời mời'; copy=''; }
  return `<header class="page-intro"><div><p class="overline">${kicker}</p><h1>${title}</h1>${copy?`<p class="page-description">${copy}</p>`:''}</div>${action ? `<button class="btn" data-action="create">Tạo mới ${icons.plus}</button>` : ''}</header>`;
}
function upcoming() { return state.events.filter(e => new Date(e.startsAt) >= new Date()).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt)); }
function eventStatus(e) { if(!state.user) return ''; return e.owner===state.user.id ? 'Bạn tổ chức' : e.joined ? 'Đã tham gia' : e.request==='pending' ? 'Chờ duyệt' : e.invitation==='pending' ? 'Bạn được mời' : ''; }
function eventRow(e) {
  const d = dateParts(e.startsAt);
  return `<article class="schedule-row"><div class="schedule-date"><b>${d.day}</b><span>${d.month}</span></div><div class="schedule-copy"><button class="title-button" data-action="detail" data-id="${e.id}">${esc(e.title)}</button><p>${esc(d.time)}<span>·</span>${esc(e.location)}</p></div><span class="status-label">${eventStatus(e)}</span><button class="round-arrow" data-action="detail" data-id="${e.id}" aria-label="Xem ${esc(e.title)}">${arrowRight}</button></article>`;
}
function featuredEvent(e) {
  if (!e) return `<section class="featured-event vacant-feature"><div class="feature-image"><img src="/assets/meadow-poster.jpg" alt="Đồng hoa trong ánh hoàng hôn"></div><div class="feature-copy"><p class="overline">DÀNH MỘT NGÀY CHO NHAU</p><h2>Cuộc hẹn đầu tiên<br>bắt đầu từ bạn.</h2><p>Một buổi cà phê, một chuyến đi hay chỉ là dịp để ngồi lại cùng nhau.</p><button class="btn" data-action="create">Tạo cuộc hẹn đầu tiên ${arrowRight}</button></div></section>`;
  const d = dateParts(e.startsAt);
  return `<section class="featured-event"><button class="feature-image" data-action="detail" data-id="${e.id}" aria-label="Xem ${esc(e.title)}"><img src="/assets/meadow-poster.jpg" alt=""><span class="feature-date"><b>${d.day}</b><span>${d.month}</span></span></button><div class="feature-copy"><p class="overline">${e.joined || e.owner===state.user.id ? 'CUỘC HẸN GẦN NHẤT' : 'KHÁM PHÁ MỘT CUỘC HẸN'}</p><h2>${esc(e.title)}</h2><p class="feature-summary">${esc(e.description || 'Một dịp để gặp gỡ và dành thời gian cho nhau.')}</p><div class="feature-meta"><span>${icons.clock}${esc(d.weekday)}, ${esc(d.time)}</span><span>${icons.pin}${esc(e.location)}</span></div><div class="feature-bottom"><span class="status-label">${eventStatus(e) || (e.visibility==='public'?'Công khai':'Riêng tư')}</span><button class="quiet-link" data-action="detail" data-id="${e.id}">Xem cuộc hẹn ${arrowRight}</button></div></div></section>`;
}
function activityList(items = state.activity.slice(0,4)) {
  const labels = {'account.register':'Tạo tài khoản Evently','auth.login':'Đăng nhập vào không gian của bạn','auth.logout':'Đăng xuất','event.create':'Tạo một cuộc hẹn mới','event.update':'Cập nhật thông tin sự kiện','event.delete':'Xóa một sự kiện','friend.request':'Gửi lời mời kết bạn','friend.accept':'Chấp nhận lời mời kết bạn','friend.reject':'Từ chối lời mời kết bạn','friend.remove':'Cập nhật danh sách bạn bè','event.invite':'Mời bạn bè tham gia sự kiện','event.invitation.respond':'Phản hồi lời mời tham gia','event.join.request':'Gửi yêu cầu tham gia','event.join.respond':'Phản hồi yêu cầu tham gia'};
  return items.map(a=>`<li><span class="activity-dot" aria-hidden="true"></span><div><p>${labels[a.action] || 'Cập nhật hoạt động'}</p><time datetime="${esc(a.at)}">${dateParts(a.at).short} · ${dateParts(a.at).time}</time></div></li>`).join('') || '<li class="muted-copy">Những hoạt động mới sẽ xuất hiện ở đây.</li>';
}
function activityPage() {
  const items=state.activity.filter(a=>state.activityFilter==='all'||a.action.startsWith(state.activityFilter));
  const pages=Math.max(1,Math.ceil(items.length/20));state.activityPage=Math.min(pages,Math.max(1,state.activityPage));
  return `${pageIntro('NHẬT KÝ','Hoạt động','',false)}<div class="activity-history-controls"><label>Loại hoạt động <select id="activity-filter">${[['all','Tất cả'],['event.','Sự kiện'],['friend.','Bạn bè'],['auth.','Đăng nhập'],['account.','Tài khoản']].map(([value,label])=>`<option value="${value}" ${value===state.activityFilter?'selected':''}>${label}</option>`).join('')}</select></label><span role="status">${items.length} hoạt động</span></div><ol class="activity-history">${activityList(items.slice((state.activityPage-1)*20,state.activityPage*20))}</ol>${pages>1?`<nav class="connections-pagination" aria-label="Trang hoạt động"><button class="btn secondary small" data-action="activity-page" data-index="${state.activityPage-1}" ${state.activityPage===1?'disabled':''}>Trước</button><span>${state.activityPage} / ${pages}</span><button class="btn secondary small" data-action="activity-page" data-index="${state.activityPage+1}" ${state.activityPage===pages?'disabled':''}>Sau</button></nav>`:''}`;
}

function home() {
  const own = upcoming().filter(e=>e.joined || e.owner===state.user.id), displayEvents=own.length?own:upcoming();
  const pending = state.invitations.length + state.friendRequests.length + state.joinRequests.length;
  return `${pageIntro('TỔNG QUAN',`Chào ${esc(state.user.name.split(' ').slice(-1)[0])}.`, '')}
    <div class="overview-metrics"><div><span class="metric-value">${own.length}</span><span>Sắp tới</span></div><div><span class="metric-value">${state.friends.length}</span><span>Bạn bè</span></div><div><span class="metric-value">${pending}</span><span>Đang chờ</span></div><div><span class="metric-value">${state.events.filter(e=>e.owner===state.user.id).length}</span><span>Đã tạo</span></div></div>
    <section class="home-upcoming-section"><div class="section-heading"><h2>Sắp tới</h2><button class="quiet-link" data-page="events">Tất cả ${arrowRight}</button></div>${displayEvents.length?`<div class="home-event-grid">${displayEvents.slice(0,3).map(eventListCard).join('')}</div>`:emptyState('Chưa có sự kiện','Tạo mới để bắt đầu.','create','Tạo mới')}</section>
    <div class="home-columns"><aside class="invitation-note"><p class="overline">HỘP THƯ</p><h2>${pending ? `${pending} đang chờ` : 'Không có lời mời'}</h2><button class="quiet-link" data-page="${pending?'inbox':'friends'}">${pending?'Xem lời mời':'Tìm bạn'} ${arrowRight}</button></aside>
    <section class="activity-section"><div><p class="overline">HOẠT ĐỘNG</p><h2>Gần đây</h2><button class="quiet-link" data-page="activity">Xem nhật ký ${arrowRight}</button></div><ol class="activity-list">${activityList()}</ol></section></div>`;
}
function eventPoster(e) {
  const theme = [...e.title].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 4;
  const d = dateParts(e.startsAt);
  return `<span class="event-poster poster-${theme}" aria-hidden="true"><span class="poster-shape"></span><span class="poster-bloom">${meadowBloom()}</span><span class="poster-label">EVENTLY / ${d.month}</span><span class="poster-title">${esc(e.title)}</span><span class="poster-mark">e.</span></span>`;
}
function dateKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function normalizeSearch(value) { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d'); }
function eventMatches(e, selection = state.eventSelection) {
  const scope = !selection.scopes.length || selection.scopes.some(value =>
    value === 'mine' ? isOwner(e) : value === 'joined' ? state.user && (e.joined || isOwner(e)) :
    value === 'invited' && (e.invitation === 'pending' || state.invitations.some(i => i.eventId === e.id)));
  return scope && (!selection.visibility.length || selection.visibility.includes(e.visibility))
    && eventFilters.matches(e, {...selection, query:state.query});
}
function eventFilterResults(selection) {
  const now = Date.now();
  return state.events.filter(e => eventMatches(e, selection) && (state.eventPeriod === 'past' ? new Date(e.startsAt) < now : new Date(e.startsAt) >= now));
}
function eventCover(e) {
  return typeof e.cover==='string' && /^\/assets\/events\/[a-z0-9-]+\.svg$/.test(e.cover) ? `<img class="event-cover" src="${esc(e.cover)}" alt="" loading="lazy" width="600" height="480">` : '';
}
function eventListCard(e) {
  const d = dateParts(e.startsAt), status = eventStatus(e), past = new Date(e.startsAt).getTime() < Date.now();
  return `<article class="event-list-card">
    <button type="button" class="event-poster-button event-theme-${eventFilters.category(e)}" data-action="detail" data-id="${e.id}" aria-label="Xem ${esc(e.title)}">${eventCover(e)||`<span class="event-card-icon">${icons.calendar}</span>`}</button>
    <div class="event-list-copy"><p class="event-card-top"><span>${esc(d.short)} · ${esc(d.time)}</span><span class="event-type-label">${eventFilters.categoryLabel(e)}</span></p>
      <h3><button type="button" data-action="detail" data-id="${e.id}">${esc(e.title)}</button></h3>
      <p class="event-location">${icons.pin}<span>${esc(e.location)}</span></p>
      <div class="event-card-bottom"><span class="event-rsvp ${past ? 'is-past' : status ? 'has-status' : ''}">${past ? 'Đã qua' : status || (e.visibility==='private' ? 'Riêng tư' : 'Công khai')}</span><span class="event-attendees">${attendeeCount(e)}</span></div>
    </div>
  </article>`;
}
function eventTimeline(events) {
  const groups = new Map();
  for (const event of events) {
    const key = dateKey(event.startsAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return `<div class="event-timeline">${[...groups].map(([key,items])=>{
    const date=new Date(items[0].startsAt);
    return `<section class="event-day-group"><h2 class="event-day-heading"><time datetime="${key}"><strong>${esc(date.toLocaleDateString('vi-VN',{day:'numeric',month:'long'}))}</strong><span>${esc(date.toLocaleDateString('vi-VN',{weekday:'long'}))}</span></time></h2><div class="event-day-cards">${items.map(eventListCard).join('')}</div></section>`;
  }).join('')}</div>`;
}
function searchBox(id, placeholder) { return `<label class="editorial-search">${icons.search}<span class="sr-only">${placeholder}</span><input id="${id}" type="search" placeholder="${placeholder}" value="${esc(state.query)}" autocomplete="off"></label>`; }
const filterIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg>';
function eventFilterGroups() {
  return [
    {key:'categories',label:'Loại hoạt động',icon:icons.spark,options:eventFilters.categories},
    {key:'dates',label:'Thời gian',icon:icons.calendar,options:eventFilters.dateOptions(state.eventPeriod).filter(([key])=>key!=='any')},
    {key:'areas',label:'Khu vực',icon:icons.pin,options:eventFilters.areas(state.events)},
    ...(state.user ? [
      {key:'visibility',label:'Quyền tham gia',icon:icons.users,options:[['public','Công khai'],['private','Riêng tư']]},
      {key:'scopes',label:'Trạng thái',icon:icons.check,options:[['joined','Bạn tham gia'],['mine','Bạn tổ chức'],['invited','Được mời']]}
    ] : [])
  ];
}
function eventFilterButton() {
  const count = eventFilters.selectionCount(state.eventSelection);
  return `<button type="button" class="event-filter-trigger ${count?'has-filters':''}" data-action="open-event-filters" aria-haspopup="dialog" aria-expanded="false" aria-controls="event-filter-dialog">${filterIcon}Bộ lọc${count?`<span class="event-filter-badge" aria-label="${count} điều kiện đang áp dụng">${count}</span>`:''}</button>`;
}
function eventFilterSummary() {
  const active = eventFilterGroups().flatMap(group => state.eventSelection[group.key].map(value => ({group:group.key,value,label:group.options.find(([key])=>key===value)?.[1]||value})));
  return active.length ? `<div class="event-active-filters" aria-label="Bộ lọc đang áp dụng">${active.slice(0,3).map(item=>`<button type="button" data-action="remove-event-filter" data-group="${item.group}" data-value="${esc(item.value)}" aria-label="Bỏ bộ lọc ${esc(item.label)}">${esc(item.label)}${closeIcon}</button>`).join('')}${active.length>3?`<button type="button" data-action="open-event-filters" aria-label="Xem thêm ${active.length-3} điều kiện lọc">+${active.length-3}</button>`:''}</div>` : '';
}
function eventFilterNav() {
  return eventFilterGroups().map(group => {
    const count = state.eventFilterDraft[group.key].length, active = state.eventFilterGroup === group.key;
    return `<button type="button" id="filter-tab-${group.key}" role="tab" aria-controls="event-filter-panel" aria-selected="${active}" tabindex="${active?0:-1}" data-action="event-filter-group" data-group="${group.key}"><span class="filter-group-icon" aria-hidden="true">${group.icon}</span><span>${group.label}</span><span class="filter-group-count" data-count-group="${group.key}" ${count?'':'hidden'} aria-label="${count} mục đã chọn">${count}</span></button>`;
  }).join('');
}
function eventFilterOptions() {
  const group = eventFilterGroups().find(item=>item.key===state.eventFilterGroup);
  const candidates = eventFilterResults({...state.eventFilterDraft,[group.key]:[]});
  return `<fieldset><legend>${group.label}</legend><p class="filter-option-hint">Chọn nhiều mục. Bỏ chọn hết để xem tất cả.</p><div class="filter-option-list">${group.options.map(([value,label],index)=>{
    const count = candidates.filter(e=>eventMatches(e,{...state.eventFilterDraft,[group.key]:[value]})).length;
    return `<label class="filter-option" for="filter-option-${group.key}-${index}"><input type="checkbox" id="filter-option-${group.key}-${index}" data-event-filter="${group.key}" value="${esc(value)}" ${state.eventFilterDraft[group.key].includes(value)?'checked':''}><span>${esc(label)}</span><small aria-label="${count} sự kiện">${count}</small></label>`;
  }).join('') || '<p class="filter-option-empty">Chưa có khu vực để lọc.</p>'}</div></fieldset>`;
}
function updateEventFilterDialog(refreshOptions = false, focusSelector = '') {
  if (!state.eventFilterDraft) return;
  for (const group of eventFilterGroups()) {
    const badge = modalRoot.querySelector(`[data-count-group="${group.key}"]`), count = state.eventFilterDraft[group.key].length;
    if (badge) {badge.textContent=count;badge.hidden=!count;badge.setAttribute('aria-label',`${count} mục đã chọn`);}
  }
  if (refreshOptions) {
    modalRoot.querySelector('.event-filter-groups').innerHTML = eventFilterNav();
    const panel = modalRoot.querySelector('#event-filter-panel');
    panel.setAttribute('aria-labelledby',`filter-tab-${state.eventFilterGroup}`);
    panel.innerHTML = eventFilterOptions();panel.scrollTop=0;
  }
  const count = eventFilterResults(state.eventFilterDraft).length;
  modalRoot.querySelector('#event-filter-result').textContent = state.eventsLoading ? 'Đang tải sự kiện…' : state.eventsError ? 'Chưa tải được sự kiện' : `${count} cuộc hẹn phù hợp`;
  modalRoot.querySelector('[data-action="reset-event-filter-draft"]').disabled = !eventFilters.selectionCount(state.eventFilterDraft);
  if (focusSelector) modalRoot.querySelector(focusSelector)?.focus({preventScroll:true});
}
function showEventFilters() {
  state.eventFilterDraft = eventFilters.copySelection(state.eventSelection);
  state.eventFilterGroup = 'categories';
  document.querySelector('.event-filter-trigger')?.setAttribute?.('aria-expanded','true');
  showDialog(`<div class="overlay event-filter-overlay" data-action="overlay-close"><section class="event-filter-dialog" id="event-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">
    <header class="event-filter-header"><div><p class="overline">TÌM CUỘC HẸN CỦA BẠN</p><h2 id="dialog-title" tabindex="-1">Bộ lọc sự kiện<span>.</span></h2><p id="dialog-description">Một vài lựa chọn, những cuộc hẹn hợp ý.</p></div><button type="button" class="event-filter-close" data-action="close-modal" aria-label="Đóng bộ lọc">${closeIcon}</button></header>
    <div class="event-filter-body"><nav class="event-filter-groups" role="tablist" aria-label="Nhóm bộ lọc" aria-orientation="vertical">${eventFilterNav()}</nav><div class="event-filter-panel" id="event-filter-panel" role="tabpanel" aria-labelledby="filter-tab-categories">${eventFilterOptions()}</div></div>
    <footer class="event-filter-footer"><p id="event-filter-result" role="status" aria-live="polite"></p><div><button type="button" class="filter-reset-draft" data-action="reset-event-filter-draft">Đặt lại</button><button type="button" class="filter-apply" data-action="apply-event-filters">Áp dụng ${arrowRight}</button></div></footer>
  </section></div>`, '#dialog-title');
  updateEventFilterDialog();
}
function eventsPage() {
  const now = Date.now(), matched = state.events.filter(e => eventMatches(e));
  const periods = {upcoming:matched.filter(e => new Date(e.startsAt).getTime() >= now),past:matched.filter(e => new Date(e.startsAt).getTime() < now)};
  const events = periods[state.eventPeriod].slice().sort((a,b) => (new Date(a.startsAt)-new Date(b.startsAt)) * (state.eventPeriod==='past' ? -1 : 1));
  const hasFilters = state.query.trim() || eventFilters.selectionCount(state.eventSelection);
  return `<section class="events-page"><header class="events-heading"><div class="events-title-block"><p class="overline">EVENTLY</p><div class="events-title-line"><h1>Sự kiện</h1></div></div><button class="btn" data-action="create">${icons.plus} Tạo mới</button></header>
    <div class="events-navigation"><div class="event-periods" aria-label="Thời gian sự kiện">${[['upcoming','Sắp tới'],['past','Đã qua']].map(([value,label])=>`<button type="button" data-period="${value}" class="${state.eventPeriod===value?'active':''}" aria-pressed="${state.eventPeriod===value}">${label}<span>${periods[value].length}</span></button>`).join('')}</div><div class="events-tools">${searchBox('event-search','Tìm sự kiện, địa điểm...')}${eventFilterButton()}</div></div>
    ${!state.user ? '<aside class="events-login-note"><span>Đăng nhập để gửi yêu cầu tham gia và theo dõi lời mời.</span><button type="button" data-action="open-login">Đăng nhập</button></aside>' : ''}
    ${state.user?`<div class="event-shortcuts" aria-label="Lọc theo vai trò">${[['all','Tất cả'],['mine','Bạn tổ chức'],['joined','Đã tham gia'],['invited','Được mời']].map(([key,label])=>`<button type="button" data-action="event-scope" data-scope="${key}" aria-pressed="${key==='all'?!state.eventSelection.scopes.length:state.eventSelection.scopes.includes(key)}">${label}</button>`).join('')}</div>`:''}
    ${eventFilterSummary()}
    <div class="event-results-bar"><p class="event-results" role="status">${state.eventsLoading ? 'Đang tải các cuộc hẹn…' : state.eventsError ? 'Kết nối đang gián đoạn' : events.length ? `${events.length} cuộc hẹn ${state.eventPeriod==='past'?'đã qua':'đang chờ bạn'}` : 'Chưa có cuộc hẹn phù hợp'}</p>${hasFilters?'<button class="event-reset" type="button" data-action="clear-event-filters">Xóa bộ lọc</button>':''}</div>
    ${state.eventsLoading ? '<div class="events-loading" role="status" aria-label="Đang tải sự kiện"><span></span><span></span><span></span><p>Đang tìm những cuộc hẹn dành cho bạn…</p></div>' : state.eventsError ? emptyState('Chưa thể tải danh sách sự kiện.',state.eventsError,'retry-events','Thử lại') : events.length ? eventTimeline(events) : emptyState(hasFilters ? 'Chưa tìm thấy cuộc hẹn phù hợp.' : state.eventPeriod==='past' ? 'Những kỷ niệm đang ở phía trước.' : 'Cuộc hẹn tiếp theo bắt đầu từ bạn.', hasFilters ? 'Thử một từ khóa khác hoặc bỏ bớt bộ lọc để khám phá thêm.' : state.eventPeriod==='past' ? 'Các sự kiện đã qua sẽ được lưu lại tại đây.' : 'Tạo sự kiện và rủ những người bạn yêu quý cùng tham gia.',hasFilters ? 'clear-event-filters' : state.eventPeriod==='past' ? 'upcoming-events' : 'create',hasFilters ? 'Xóa bộ lọc' : state.eventPeriod==='past' ? 'Khám phá sự kiện sắp tới' : 'Tạo cuộc hẹn đầu tiên')}
  </section>`;
}
function friendCard(user, connected) {
  const request=state.friendRequests.find(r=>r.from===user.id);
  const actions=connected ? `<button class="quiet-link connection-remove" data-action="unfriend" data-id="${user.id}" aria-label="Hủy kết bạn với ${esc(user.name)}">Hủy kết bạn</button>` : user.friendship==='sent' ? '<span class="status-label">Đã gửi lời mời</span>' : request ? `<button class="btn secondary small" data-action="friend-reject" data-id="${request.id}">Từ chối</button><button class="btn small" data-action="friend-accept" data-id="${request.id}">Chấp nhận</button>` : `<button class="btn secondary small" data-action="friend-add" data-id="${user.id}">${icons.plus} Kết bạn</button>`;
  return `<li class="connection-row">${avatar(user)}<div class="connection-copy"><h3>${esc(user.name)}</h3><p>${esc(user.email)}</p></div><div class="connection-actions">${actions}</div></li>`;
}
function friendsPage() {
  const query=normalizeSearch(state.query.trim());
  const requests=state.friendRequests.map(r=>r.user);
  const discover=state.users.filter(u=>u.friendship!=='friends'&&!requests.some(r=>r.id===u.id));
  const sets={friends:state.friends,requests,discover};
  const matched=sets[state.friendTab].filter(u=>normalizeSearch(u.name+' '+u.email).includes(query)).slice().sort((a,b)=>a.name.localeCompare(b.name,'vi')*(state.friendSort==='reverse'?-1:1));
  const pages=Math.max(1,Math.ceil(matched.length/12));state.friendPage=Math.min(pages,Math.max(1,state.friendPage));
  const start=(state.friendPage-1)*12,visible=matched.slice(start,start+12);
  return `<section class="connections-page"><header class="connections-heading"><div><h1>Kết nối</h1><p>Những người bạn, những cuộc hẹn.</p></div><span class="connections-total">${state.friends.length} bạn bè</span></header>
    <div class="connections-panel"><div class="connections-controls"><div class="connections-tabs" aria-label="Nhóm kết nối">${[['friends','Bạn bè'],['requests','Lời mời'],['discover','Khám phá']].map(([key,label])=>`<button type="button" data-action="friend-tab" data-tab="${key}" class="${key===state.friendTab?'active':''}" aria-pressed="${key===state.friendTab}">${label}<span>${sets[key].length}</span></button>`).join('')}</div>${searchBox('friend-search','Tìm tên hoặc email')}</div>
    <div class="connections-list-heading"><p role="status">${matched.length?`${start+1}–${Math.min(start+12,matched.length)} / ${matched.length} người`:'0 người'}</p><label>Sắp xếp <select id="friend-sort"><option value="name" ${state.friendSort==='name'?'selected':''}>Tên A–Z</option><option value="reverse" ${state.friendSort==='reverse'?'selected':''}>Tên Z–A</option></select></label></div>
    ${visible.length?`<ul class="connections-list">${visible.map(u=>friendCard(u,state.friendTab==='friends')).join('')}</ul>`:emptyState(query?'Không tìm thấy kết nối':state.friendTab==='requests'?'Chưa có lời mời':state.friendTab==='friends'?'Chưa có bạn bè':'Chưa có gợi ý',query?'Thử tên hoặc email khác.':'')}
    ${pages>1?`<nav class="connections-pagination" aria-label="Trang kết nối"><button class="btn secondary small" data-action="friend-page" data-page-number="${state.friendPage-1}" ${state.friendPage===1?'disabled':''}>Trước</button><span>Trang ${state.friendPage} / ${pages}</span><button class="btn secondary small" data-action="friend-page" data-page-number="${state.friendPage+1}" ${state.friendPage===pages?'disabled':''}>Sau</button></nav>`:''}</div></section>`;
}

function inboxItems() {
  return [...state.invitations.map(i=>({...i,type:'events',person:i.from,title:i.event?.title || 'Lời mời tham gia sự kiện',copy:`${i.from?.name || 'Một người bạn'} mời bạn tham gia`,event:i.event,accept:'invite-accept',reject:'invite-reject'})),...state.friendRequests.map(r=>({...r,type:'friends',person:r.user,title:r.user.name,copy:'Muốn kết nối và trở thành bạn bè với bạn',accept:'friend-accept',reject:'friend-reject'})),...state.joinRequests.map(r=>({...r,type:'requests',person:r.user,title:r.event.title,copy:`${r.user.name} muốn tham gia cuộc hẹn của bạn`,event:r.event,accept:'join-accept',reject:'join-reject'}))].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
}
function inboxPage() {
  const items=inboxItems(), visible=items.filter(i=>state.inboxTab==='all'||i.type===state.inboxTab);
  return `${pageIntro('KẾT NỐI / HỘP THƯ','Những lời hẹn <span>dành cho bạn.</span>','Phản hồi một lời mời, bắt đầu một cuộc gặp gỡ.',false)}<div class="collection-toolbar"><div class="editorial-tabs" aria-label="Lọc lời mời">${[['all','Tất cả'],['events','Sự kiện'],['friends','Kết bạn'],['requests','Xin tham gia']].map(([key,label])=>`<button data-inbox="${key}" class="${key===state.inboxTab?'active':''}" aria-pressed="${key===state.inboxTab}">${label} <small>${items.filter(i=>key==='all'||i.type===key).length}</small></button>`).join('')}</div></div><div class="inbox-list">${visible.length?visible.map(i=>`<article class="invitation-row">${avatar(i.person,'large')}<div class="invitation-copy"><p class="overline">${{events:'LỜI MỜI THAM GIA',friends:'LỜI MỜI KẾT BẠN',requests:'YÊU CẦU THAM GIA'}[i.type]}</p><h2>${esc(i.title)}</h2>${i.event?`<button class="quiet-link" data-action="detail" data-id="${i.event.id}">Xem sự kiện ${arrowRight}</button>`:''}<p>${esc(i.copy)}</p>${i.event?`<p class="invitation-meta">${esc(dateParts(i.event.startsAt).full)}<span>·</span>${esc(i.event.location)}</p>`:''}</div><div class="invitation-actions"><button class="btn small" data-action="${i.accept}" data-id="${i.id}">${i.type==='requests'?'Duyệt yêu cầu':i.type==='events'?'Tham gia':'Chấp nhận'} ${arrowRight}</button><button class="quiet-link muted" data-action="${i.reject}" data-id="${i.id}">Từ chối</button></div></article>`).join(''):emptyState('Hộp thư đã được xem hết.','Những lời mời và yêu cầu mới sẽ xuất hiện ở đây.','browse-events','Khám phá sự kiện')}</div>`;
}
function render() {
  window.EventlyMeadow?.stop();
  if (!state.user) { if(state.page==='events')publicShell(eventsPage());else {app.innerHTML=landing();requestAnimationFrame(()=>{if(!state.authOpen)window.EventlyMeadow?.mount();});}return; }
  shell(({home,events:eventsPage,friends:friendsPage,inbox:inboxPage,profile:profilePage,activity:activityPage})[state.page]());
}
async function refresh() {
  const [events,friends,users,friendRequests,joinRequests,activity,inbox] = await Promise.all(['events','friends','users','friend-requests','join-requests','activity','inbox'].map(action=>api(action)));
  Object.assign(state,{events,friends,users,friendRequests,joinRequests,activity,invitations:inbox.invitations});
  render();
}
function closeModal() {
  const wasAuth = state.authOpen;
  state.authOpen = false;
  state.authIntent = null;
  state.eventFilterDraft = null;
  document.querySelector('.event-filter-trigger')?.setAttribute?.('aria-expanded','false');
  modalRoot.innerHTML = '';
  document.body.classList.remove('dialog-open');
  document.body.style.paddingRight = modalRoot.dataset.bodyPadding || '';
  app.inert = false;
  if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  if (wasAuth && !state.user) window.EventlyMeadow?.mount();
}
function showDialog(html, focusSelector = 'input:not([type=radio]),textarea,select') {
  if (!modalRoot.innerHTML) {
    returnFocus = document.activeElement;
    modalRoot.dataset.bodyPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
  }
  modalRoot.innerHTML = html;
  document.body.classList.add('dialog-open');
  app.inert = true;
  requestAnimationFrame(() => (modalRoot.querySelector(focusSelector) || modalRoot.querySelector('button'))?.focus({preventScroll:true}));
}
function modal(title, subtitle, html) {
  showDialog(`<div class="overlay" data-action="overlay-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description"><header class="modal-top"><div><p class="overline">EVENTLY</p><h2 id="dialog-title">${esc(title)}</h2><p id="dialog-description">${esc(subtitle)}</p></div><button class="icon-btn plain" data-action="close-modal" aria-label="Đóng">${closeIcon}</button></header>${html}</section></div>`);
}
function createModal(e) {
  modal(e?'Chỉnh sửa cuộc hẹn.':'Tạo một cuộc hẹn mới.',e?'Thay đổi một chút, để mọi người dễ dàng gặp nhau hơn.':'Một chút thông tin để bạn bè cùng lên lịch.',`<form id="event-form" data-id="${e?.id||''}"><div class="form-grid"><div class="field full"><label for="event-title">Tên cuộc hẹn</label><input id="event-title" name="title" placeholder="Ví dụ: Một chiều cà phê cùng nhau" maxlength="160" required value="${esc(e?.title||'')}"></div><div class="field"><label for="event-date">Thời gian</label><input id="event-date" name="startsAt" type="datetime-local" value="${e?localInputTime(e.startsAt):''}" required></div><div class="field"><label for="event-location">Địa điểm</label><input id="event-location" name="location" placeholder="Mình sẽ gặp nhau ở đâu?" value="${esc(e?.location||'')}" required></div><div class="field"><label for="event-category">Loại hoạt động</label><select id="event-category" name="category">${eventFilters.categories.map(([key,label])=>`<option value="${key}" ${eventFilters.category(e||{})===key?'selected':''}>${label}</option>`).join('')}</select></div><div class="field"><label for="event-area">Khu vực</label><input id="event-area" name="area" maxlength="80" placeholder="Ví dụ: Tây Hồ, Hà Nội" value="${esc(e?.area||'')}"></div><fieldset class="visibility-field full"><legend>Ai có thể tham gia?</legend><div class="visibility-options"><label><input type="radio" name="visibility" value="public" ${e?.visibility!=='private'?'checked':''}><span><b>Công khai</b><small>Mọi người có thể gửi yêu cầu tham gia.</small></span></label><label><input type="radio" name="visibility" value="private" ${e?.visibility==='private'?'checked':''}><span><b>Riêng tư</b><small>Chia sẻ cuộc hẹn với bạn bè được mời.</small></span></label></div></fieldset><div class="field full"><label for="event-description">Lời nhắn cho mọi người</label><textarea id="event-description" name="description" rows="4" placeholder="Kể thêm một chút về cuộc hẹn...">${esc(e?.description||'')}</textarea></div></div><p class="form-error" role="alert" hidden></p><div class="form-actions">${e?`<button class="quiet-link danger" type="button" data-action="delete-event" data-id="${e.id}">Xóa sự kiện</button>`:''}<span class="action-spacer"></span><button class="btn secondary" type="button" data-action="close-modal">Để sau</button><button class="btn">${e?'Lưu thay đổi':'Tạo cuộc hẹn'} ${arrowRight}</button></div></form>`);
}
function detailModal(e) {
  if (!e) return;
  const d=dateParts(e.startsAt), owned=isOwner(e), invitation=state.invitations.find(i=>i.eventId===e.id);
  const action=!owned&&new Date(e.startsAt)<new Date()?'<span class="status-label">Sự kiện đã kết thúc.</span>':!state.user?`<button class="btn" data-action="join" data-id="${e.id}">Tham gia sự kiện ${arrowRight}</button>`:owned?`<button class="btn secondary" data-action="edit-event" data-id="${e.id}">Chỉnh sửa</button><button class="btn" data-action="invite-friend" data-id="${e.id}">Mời bạn bè ${icons.plus}</button>`:invitation?`<button class="btn" data-action="invite-accept" data-id="${invitation.id}">Chấp nhận lời mời ${arrowRight}</button>`:e.joined?'<span class="status-label">Bạn sẽ tham gia cuộc hẹn này.</span>':e.request==='pending'?'<button class="btn secondary" disabled>Đã gửi yêu cầu</button>':e.visibility==='public'?`<button class="btn" data-action="join" data-id="${e.id}">Gửi yêu cầu tham gia ${arrowRight}</button>`:'<span class="status-label">Sự kiện riêng tư · cần lời mời để tham gia.</span>';
  const people=(e.attendees||[]).map(id=>id===state.user?.id?state.user:state.users.find(u=>u.id===id)).filter(Boolean);
  const host=e.ownerName||state.users.find(u=>u.id===e.owner)?.name||(owned?state.user.name:'Thành viên Evently');
  showDialog(`<div class="overlay event-detail-overlay" data-action="overlay-close"><section class="modal event-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <header class="event-detail-header"><div><div class="event-detail-tags"><span>${esc(eventFilters.categoryLabel(e))}</span><span>${e.visibility==='private'?'Riêng tư':'Công khai'}</span></div><h2 id="dialog-title" tabindex="-1">${esc(e.title)}</h2></div><button type="button" class="icon-btn plain" data-action="close-modal" aria-label="Đóng chi tiết sự kiện">${closeIcon}</button></header>
    <div class="event-detail-scroll"><div class="event-detail-layout">
      <figure class="event-detail-image">${eventCover(e)||eventPoster(e)}<figcaption class="sr-only">Ảnh sự kiện ${esc(e.title)}</figcaption></figure>
      <section class="event-detail-info" aria-labelledby="event-info-heading"><h3 id="event-info-heading">Thông tin sự kiện</h3>
        <div class="event-info-row"><span class="event-info-icon">${icons.calendar}</span><div><h4>Thời gian</h4><time datetime="${esc(e.startsAt)}">${esc(d.weekday)}, ${esc(d.full)}</time><p>${esc(d.time)}</p></div></div>
        <div class="event-info-row"><span class="event-info-icon">${icons.pin}</span><div><h4>Địa điểm</h4><p>${esc(e.location)}</p></div></div>
        <div class="event-info-row"><span class="event-info-icon">${icons.users}</span><div><h4>Người tổ chức</h4><p>${esc(host)}</p></div></div>
        <div class="event-detail-people"><div class="avatar-stack">${people.slice(0,4).map(u=>avatar(u)).join('')}</div><span>${attendeeCount(e)} người tham gia</span></div>
      </section>
      <section class="event-detail-intro" aria-labelledby="event-intro-heading"><h3 id="event-intro-heading">Giới thiệu</h3><p>${esc(e.description||'Chưa có mô tả cho sự kiện này.')}</p></section>
    </div></div>
    <footer class="event-detail-footer"><span class="event-detail-footer-note">${e.visibility==='private'?'Tham gia qua lời mời':'Sự kiện công khai'}</span><div class="event-detail-actions">${action}</div></footer>
  </section></div>`, '#dialog-title');
}
function inviteModal(eventId) {
  const event=state.events.find(e=>e.id===eventId); if (!event) return;
  const friends=state.friends.filter(f=>!event.attendees.includes(f.id));
  modal('Thêm bạn, thêm niềm vui.',`Mời bạn bè đến ${event.title}.`,friends.length?`<div class="invite-friends-list">${friends.map(f=>`<div class="invite-friend-row">${avatar(f)}<div><strong>${esc(f.name)}</strong><small>${esc(f.email)}</small></div><button class="btn secondary small" data-action="send-invite" data-event="${eventId}" data-id="${f.id}">Gửi lời mời ${icons.plus}</button></div>`).join('')}</div>`:emptyState('Chưa có người bạn nào để mời.','Kết nối thêm bạn bè hoặc mọi người đã tham gia cuộc hẹn.'));
}
function accountModal() { navigate('profile'); }
function profilePage() {
  const owned=state.events.filter(e=>isOwner(e));
  const joined=state.events.filter(e=>e.joined&&!isOwner(e));
  const next=upcoming().filter(e=>isOwner(e)||e.joined);
  return `<section class="profile-page"><header class="profile-cover" aria-hidden="true"></header><div class="profile-layout"><aside class="profile-identity">${avatar(state.user,'profile-avatar')}<h1>${esc(state.user.name)}</h1><p class="profile-email">${esc(state.user.email)}</p>${state.user.bio?`<p class="profile-bio">${esc(state.user.bio)}</p>`:''}<button class="btn secondary" data-action="edit-profile">Sửa hồ sơ</button><button class="quiet-link muted" data-action="logout">Đăng xuất ${logoutIcon}</button></aside><div class="profile-content"><div class="profile-stats"><div><strong>${owned.length}</strong><span>Tổ chức</span></div><div><strong>${joined.length}</strong><span>Tham gia</span></div><button data-page="friends"><strong>${state.friends.length}</strong><span>Bạn bè</span></button></div><section><div class="section-heading"><h2>Lịch của bạn</h2><button class="quiet-link" data-page="events">Sự kiện ${arrowRight}</button></div>${next.length?eventTimeline(next):emptyState('Lịch còn trống','','browse-events','Khám phá sự kiện')}</section></div></div></section>`;
}
function editProfile() {
  modal('Sửa hồ sơ','',`<form id="profile-form"><div class="field"><label for="profile-name">Họ và tên</label><input id="profile-name" name="name" maxlength="80" required value="${esc(state.user.name)}"></div><div class="field"><label for="profile-bio">Giới thiệu</label><textarea id="profile-bio" name="bio" maxlength="200" rows="3" placeholder="Một chút về bạn">${esc(state.user.bio||'')}</textarea></div><p class="form-error" role="alert" hidden></p><div class="form-actions"><button type="button" class="btn secondary" data-action="close-modal">Hủy</button><button type="submit" class="btn">Lưu</button></div></form>`);
}
function routeURL(page) {
  const hash = memberPages.includes(page) ? `#${page}` : '';
  if(location.hash!==hash)history.pushState(null,'',`${location.pathname}${location.search}${hash}`);
}
async function browseEvents(updateURL = true) {
  state.page = 'events';
  if(updateURL)routeURL('events');
  window.scrollTo({top:0,behavior:'instant'});
  if(state.user){render();return;}
  const request = ++publicLoadId;
  state.eventsLoading = true;state.eventsError='';state.eventSelection.scopes=[];state.eventSelection.visibility=[];
  render();
  try { const events=await api('public-events');if(request===publicLoadId&&!state.user)state.events=events; }
  catch(error){if(request===publicLoadId&&!state.user)state.eventsError=error.message;}
  finally{if(request===publicLoadId&&!state.user){state.eventsLoading=false;if(state.page==='events')render();}}
}
function navigate(page, updateURL = true) {
  if(page==='events'&&!state.user)return browseEvents(updateURL);
  state.page=page;state.query='';if(updateURL)routeURL(page);render();window.scrollTo({top:0,behavior:'instant'});
}
function requireAccount(intent) { state.authIntent=intent;authModal('login'); }
function resetMemberState() {
  ++publicLoadId;
  Object.assign(state,{token:'',user:null,authOpen:false,authIntent:null,events:[],friends:[],users:[],invitations:[],friendRequests:[],joinRequests:[],activity:[],activityPage:1,activityFilter:'all',friendTab:'friends',friendPage:1,query:'',eventSelection:eventFilters.emptySelection(),eventFilterDraft:null,eventFilterGroup:'categories',eventsLoading:false,eventsError:''});
  localStorage.removeItem('evently-token');
}
async function routeFromLocation() {
  const page=memberPages.includes(location.hash.slice(1))?location.hash.slice(1):'home';
  if(page===state.page)return;
  closeModal();await navigate(page,false);
}
window.addEventListener('popstate',routeFromLocation);
window.addEventListener('hashchange',routeFromLocation);
document.addEventListener('click', async event => {
  const button=event.target.closest('[data-action],[data-page],[data-inbox],[data-period]');
  if (!button || button.disabled) return;
  if (button.dataset.page) { navigate(button.dataset.page); return; }
  if (button.dataset.inbox) { state.inboxTab=button.dataset.inbox;render();return; }
  if (button.dataset.period) { state.eventPeriod=button.dataset.period;state.eventSelection.dates=[];render();document.querySelector(`[data-period="${state.eventPeriod}"]`)?.focus({preventScroll:true});return; }
  const action=button.dataset.action,id=button.dataset.id;
  try {
    if (action==='open-login'||action==='open-register') {state.authIntent=null;authModal(action==='open-login'?'login':'register');}
    else if (action==='toggle-auth') {
      const form = document.querySelector('#auth-form');
      if (form?.querySelector('[type=submit]')?.disabled) return;
      authModal(state.authMode==='login'?'register':'login', Object.fromEntries(new FormData(form)));
    }
    else if(action==='friend-tab'){state.friendTab=button.dataset.tab;state.friendPage=1;render();document.querySelector(`[data-tab="${state.friendTab}"]`)?.focus({preventScroll:true});}
    else if(action==='friend-page'){state.friendPage=Number(button.dataset.pageNumber);render();document.querySelector('.connections-controls')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    else if(action==='activity-page'){state.activityPage=Number(button.dataset.index);render();}
    else if(action==='event-scope'){state.eventSelection.scopes=button.dataset.scope==='all'?[]:[button.dataset.scope];render();}
    else if (action==='google-login') toast('Đăng nhập Google chưa được cấu hình OAuth.',true);
    else if (action==='toggle-password') {
      const input = document.querySelector('#auth-password'), visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.innerHTML = visible ? eyeOffIcon : eyeIcon;
      button.setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      button.setAttribute('aria-pressed', String(visible));
    }
    else if (action==='close-modal'||(action==='overlay-close'&&event.target===button)) closeModal();
    else if (action==='browse-events'||action==='retry-events') await browseEvents();
    else if (action==='landing-home') navigate('home');
    else if (action==='join'&&!state.user) requireAccount({action:'join',eventId:id});
    else if (action==='open-event-filters') showEventFilters();
    else if (action==='event-filter-group' && state.eventFilterDraft) {
      if (!eventFilterGroups().some(group=>group.key===button.dataset.group)) return;
      state.eventFilterGroup=button.dataset.group;updateEventFilterDialog(true,`#filter-tab-${state.eventFilterGroup}`);
    }
    else if (action==='reset-event-filter-draft' && state.eventFilterDraft) {
      state.eventFilterDraft=eventFilters.emptySelection();updateEventFilterDialog(true,`#filter-tab-${state.eventFilterGroup}`);
    }
    else if (action==='apply-event-filters' && state.eventFilterDraft) {
      state.eventSelection=eventFilters.copySelection(state.eventFilterDraft);closeModal();render();document.querySelector('.event-filter-trigger')?.focus({preventScroll:true});
    }
    else if (action==='remove-event-filter') {
      const values=state.eventSelection[button.dataset.group];if(!values)return;
      state.eventSelection[button.dataset.group]=values.filter(value=>value!==button.dataset.value);render();document.querySelector('.event-filter-trigger')?.focus({preventScroll:true});
    }
    else if (action==='clear-event-filters') { state.query='';state.eventSelection=eventFilters.emptySelection();render();document.querySelector('.event-filter-trigger')?.focus(); }
    else if (action==='upcoming-events') { state.eventPeriod='upcoming';render(); }
    else if (action==='create') {if(state.user)createModal();else requireAccount({action:'create'});}
    else if (action==='detail') detailModal(state.events.find(e=>e.id===id)||inboxItems().find(i=>i.event?.id===id)?.event);
    else if (action==='edit-event') createModal(state.events.find(e=>e.id===id));
    else if (action==='invite-friend') inviteModal(id);
    else if (action==='account') accountModal();
    else if (action==='edit-profile') editProfile();
    else if (action==='logout') {await api('logout').catch(()=>{});closeModal();resetMemberState();state.page='events';await browseEvents();}
    else if (action==='delete-event') { const e=state.events.find(e=>e.id===id);modal('Xóa cuộc hẹn này?',e?.title||'Sự kiện sẽ được xóa khỏi lịch hẹn.',`<p class="muted-copy">Thông tin cuộc hẹn và các lời mời liên quan sẽ được gỡ bỏ.</p><div class="form-actions"><button class="btn secondary" data-action="edit-event" data-id="${id}">Quay lại</button><button class="btn" data-action="delete-confirm" data-id="${id}">Xóa cuộc hẹn</button></div>`); }
    else if (action==='unfriend') { const person=state.friends.find(u=>u.id===id);modal('Hủy kết nối bạn bè?',`Bạn và ${person?.name||'người bạn này'} sẽ không còn trong danh sách bạn bè của nhau.`,`<div class="form-actions"><button class="btn secondary" data-action="close-modal">Giữ kết nối</button><button class="btn" data-action="unfriend-confirm" data-id="${id}">Hủy kết bạn</button></div>`); }
    else {
      const requests={
        'join':['join-request',{eventId:id},'Đã gửi yêu cầu tham gia.'],
        'friend-add':['friend-request',{userId:id},'Đã gửi lời mời kết bạn.'],
        'friend-accept':['friend-respond',{requestId:id,accept:true},'Hai bạn đã kết nối.'],
        'friend-reject':['friend-respond',{requestId:id,accept:false},'Đã từ chối lời mời.'],
        'invite-accept':['invitation-respond',{invitationId:id,accept:true},'Bạn đã tham gia cuộc hẹn.'],
        'invite-reject':['invitation-respond',{invitationId:id,accept:false},'Đã từ chối lời mời tham gia.'],
        'join-accept':['join-respond',{requestId:id,accept:true},'Đã duyệt yêu cầu tham gia.'],
        'join-reject':['join-respond',{requestId:id,accept:false},'Đã từ chối yêu cầu tham gia.'],
        'unfriend-confirm':['friend-remove',{userId:id},'Đã cập nhật danh sách bạn bè.'],
        'delete-confirm':['event-delete',{id},'Đã xóa cuộc hẹn.'],
        'send-invite':['invite',{eventId:button.dataset.event,userId:id},'Đã gửi lời mời tham gia.']
      };
      if (!requests[action]) return;
      button.disabled=true;
      const [method,payload,message]=requests[action]; await api(method,payload);
      if(action==='send-invite') { button.textContent='Đã gửi lời mời'; button.setAttribute('aria-label','Đã gửi lời mời');toast(message);return; }
      closeModal(); await refresh(); toast(message);
    }
  } catch (error) { toast(error.message,true); if(button.isConnected)button.disabled=false; }
});
document.addEventListener('submit', async event => {
  const form=event.target;if(!['auth-form','event-form','profile-form'].includes(form.id))return;event.preventDefault();
  const submit=form.querySelector('button:not([type="button"])'),errorBox=form.querySelector('.form-error'),oldLabel=submit.innerHTML;
  if(submit.disabled)return;submit.disabled=true;submit.textContent='Đang lưu…';errorBox.hidden=true;
  try {
    const data=Object.fromEntries(new FormData(form));
    if(form.id==='profile-form') {
      state.user=await api('profile-update',data);closeModal();await refresh();toast('Đã lưu hồ sơ.');
    } else if(form.id==='auth-form') {
      submit.textContent=state.authMode==='login'?'Đang đăng nhập…':'Đang tạo tài khoản…';
      const result=await api(state.authMode==='login'?'login':'register',data);
      if (!form.isConnected) return;
      const intent=state.authIntent;
      ++publicLoadId;
      state.token=result.token;state.user=await api('me');state.eventsLoading=false;state.eventsError='';state.page=intent||state.page==='events'?'events':'home';localStorage.setItem('evently-token',state.token);closeModal();routeURL(state.page);await refresh();
      if(intent?.action==='join'){const selected=state.events.find(e=>e.id===intent.eventId);if(selected)detailModal(selected);else toast('Cuộc hẹn này không còn có sẵn.',true);}
      else if(intent?.action==='create')createModal();
      else window.scrollTo(0,0);
    } else {
      await api(form.dataset.id?'event-update':'event-create',{...data,id:form.dataset.id,startsAt:new Date(data.startsAt).toISOString()});closeModal();await refresh();toast(form.dataset.id?'Đã cập nhật cuộc hẹn.':'Cuộc hẹn đã được tạo.');
    }
  } catch(error) { if (form.isConnected) { errorBox.textContent=error.message;errorBox.hidden=false;if(form.id==='auth-form')errorBox.focus(); } }
  finally { if(submit.isConnected){submit.disabled=false;submit.innerHTML=oldLabel;} }
});
app.addEventListener('input', event => {
  if(!['event-search','friend-search'].includes(event.target.id))return;
  const {id,value,selectionStart}=event.target;state.query=value;if(id==='friend-search')state.friendPage=1;render();
  const input=document.getElementById(id);input.focus();if(Number.isInteger(selectionStart)){try{input.setSelectionRange(selectionStart,selectionStart);}catch{}}
});
document.addEventListener('change', event => {
  if(event.target.id==='activity-filter'){state.activityFilter=event.target.value;state.activityPage=1;render();document.querySelector('#activity-filter')?.focus({preventScroll:true});return;}
  if(event.target.id==='friend-sort'){state.friendSort=event.target.value;state.friendPage=1;render();document.querySelector('#friend-sort')?.focus({preventScroll:true});return;}
  const input=event.target,group=eventFilterGroups().find(item=>item.key===input.dataset?.eventFilter);
  if(!state.eventFilterDraft || !group || !group.options.some(([key])=>key===input.value))return;
  const values=state.eventFilterDraft[group.key].filter(value=>value!==input.value);
  state.eventFilterDraft[group.key]=input.checked?[...values,input.value]:values;
  updateEventFilterDialog();
});
document.addEventListener('focusin', event => {
  const dialog=event.target.closest?.('.auth-dialog');
  if(dialog)dialog.classList.toggle('auth-is-editing',!!event.target.closest('#auth-form'));
});
document.addEventListener('keydown', event => {
  const dialog=modalRoot.querySelector('[role="dialog"]');if(!dialog)return;
  if(event.key==='Escape'){event.preventDefault();closeModal();return;}
  if(state.eventFilterDraft && event.target.closest?.('[role="tablist"]') && ['ArrowUp','ArrowDown','Home','End'].includes(event.key)) {
    event.preventDefault();const groups=eventFilterGroups(),current=groups.findIndex(group=>group.key===state.eventFilterGroup);
    const index=event.key==='Home'?0:event.key==='End'?groups.length-1:(current+(event.key==='ArrowDown'?1:-1)+groups.length)%groups.length;
    state.eventFilterGroup=groups[index].key;updateEventFilterDialog(true,`#filter-tab-${state.eventFilterGroup}`);return;
  }
  if(event.key==='Tab'){
    const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,a[href]')].filter(el=>el.tabIndex!==-1&&el.getClientRects().length);
    if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&(document.activeElement===first||!focusable.includes(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
async function init() {
  if(!state.token){if(state.page==='events')await browseEvents(false);else render();return;}
  try{state.user=await api('me');await refresh();}
  catch{resetMemberState();if(state.page==='events')await browseEvents(false);else render();}
}
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('effects-paused',document.hidden));
init();
