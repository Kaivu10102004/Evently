const icons={spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>',calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6"/></svg>',bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>',pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m5 12 4 4L19 6"/></svg>',search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'};

const state = {
  token: localStorage.getItem('evently-token') || '', user: null, page: location.hash === '#events' ? 'events' : 'home',
  events: [], friends: [], users: [], invitations: [], friendRequests: [], joinRequests: [], activity: [],
  filter: 'all', query: '', eventPeriod: 'upcoming', eventVisibility: 'all', inboxTab: 'all', authMode: 'login', authOpen: false, authIntent: null, eventsLoading: false, eventsError: ''
};
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
let toastTimer, returnFocus, publicLoadId = 0;
const arrowRight = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const logoutIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 4H5v16h5m4-12 4 4-4 4m-6-4h10"/></svg>';
async function api(action, payload = {}) {
  const response = await fetch('/api', { method: 'POST', headers: {'content-type':'application/json', ...(state.token ? {authorization:`Bearer ${state.token}`} : {})}, body:JSON.stringify({action,payload}) });
  const result = await response.json();
  if (!result.ok) throw Error(result.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
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
        <button data-action="open-login">Bạn bè</button>
        <button data-action="open-register">Đăng ký</button>
      </nav>
      <button class="black-pill nav-cta" data-action="open-login">Đăng nhập</button>
    </header>
    <section class="landing-hero" aria-labelledby="hero-heading">
      <div class="hero-copy">
        <h1 id="hero-heading">Hẹn nhau, <span>tạo nên</span> kỷ niệm.</h1>
        <p class="hero-description">Nơi bạn tạo sự kiện, kết nối những người thân quen<br>và cùng nhau lưu giữ những khoảnh khắc đáng nhớ.</p>
        <button class="black-pill hero-cta" data-action="open-login">ĐĂNG NHẬP ${arrow}</button>
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
        <p class="form-error" role="alert" tabindex="-1" hidden></p>
        <div class="auth-submit-wrap"><button class="btn auth-submit" type="submit"><span>${register ? 'Tạo tài khoản' : 'Đăng nhập'}</span>${arrowRight}</button></div>
      </form>
      <p class="auth-switch"><button type="button" data-action="toggle-auth">${register ? 'Quay lại đăng nhập' : 'Đăng ký tài khoản'}</button></p>
    </section>
  </div>`, '#dialog-title');
  window.EventlyMeadow?.stop();
}
function navButton(page, label, icon, count = 0, mobile = false) {
  return `<button class="app-nav-link ${state.page===page?'active':''}" data-page="${page}" ${state.page===page?'aria-current="page"':''}>${mobile ? icons[icon] : ''}<span>${label}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
}
function shell(content) {
  const pending = state.invitations.length + state.friendRequests.length + state.joinRequests.length;
  const nav = mobile => `${navButton('home','Tổng quan','spark',0,mobile)}${navButton('events','Sự kiện','calendar',0,mobile)}${navButton('friends','Bạn bè','users',0,mobile)}${navButton('inbox','Lời mời','bell',pending,mobile)}`;
  app.innerHTML = `<div class="workspace"><header class="app-header"><button class="wordmark-button" data-page="home" aria-label="Evently · Tổng quan">${brand()}</button><nav class="app-nav" aria-label="Điều hướng chính">${nav(false)}</nav><button class="profile-button" data-action="account" aria-label="Tài khoản của ${esc(state.user.name)}">${avatar(state.user)}<span>${esc(state.user.name.split(' ').slice(-2).join(' '))}</span></button></header>
    <main class="workspace-main ${state.page==='events'?'events-main':''}">${content}</main><footer class="app-footer"><span class="footer-wordmark">evently</span><span>Cho những lần gặp gỡ thật.</span><button class="quiet-link" data-action="account">Không gian của ${esc(state.user.name.split(' ').slice(-1)[0])} ${arrowRight}</button></footer><nav class="mobile-app-nav" aria-label="Điều hướng trên điện thoại">${nav(true)}</nav></div>`;
}
function publicShell(content) {
  app.innerHTML = `<div class="workspace public-workspace"><header class="landing-nav public-nav"><button class="wordmark-button" data-action="landing-home" aria-label="Evently · Trang chủ">${brand()}</button><nav aria-label="Điều hướng chính"><button data-action="landing-home">Trang chủ</button><button class="current" data-action="browse-events" aria-current="page">Sự kiện</button><button data-action="open-register">Đăng ký</button></nav><button class="black-pill nav-cta" data-action="open-login">Đăng nhập</button></header><main class="workspace-main events-main">${content}</main><footer class="app-footer"><span class="footer-wordmark">evently</span><span>Cho những lần gặp gỡ thật.</span></footer></div>`;
}
function pageIntro(kicker, title, copy, action = true) {
  return `<header class="page-intro"><div><p class="overline">${kicker}</p><h1>${title}</h1><p class="page-description">${copy}</p></div>${action ? `<button class="btn" data-action="create">Tạo sự kiện ${icons.plus}</button>` : ''}</header>`;
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
function activityList() {
  const labels = {'account.register':'Tạo tài khoản Evently','auth.login':'Đăng nhập vào không gian của bạn','auth.logout':'Đăng xuất','event.create':'Tạo một cuộc hẹn mới','event.update':'Cập nhật thông tin sự kiện','event.delete':'Xóa một sự kiện','friend.request':'Gửi lời mời kết bạn','friend.accept':'Chấp nhận lời mời kết bạn','friend.reject':'Từ chối lời mời kết bạn','friend.remove':'Cập nhật danh sách bạn bè','event.invite':'Mời bạn bè tham gia sự kiện','event.invitation.respond':'Phản hồi lời mời tham gia','event.join.request':'Gửi yêu cầu tham gia','event.join.respond':'Phản hồi yêu cầu tham gia'};
  return state.activity.slice(0,4).map(a=>`<li><span class="activity-dot" aria-hidden="true"></span><div><p>${labels[a.action] || 'Cập nhật hoạt động'}</p><time datetime="${esc(a.at)}">${dateParts(a.at).short} · ${dateParts(a.at).time}</time></div></li>`).join('') || '<li class="muted-copy">Những hoạt động mới sẽ xuất hiện ở đây.</li>';
}
function home() {
  const own = upcoming().filter(e=>e.joined || e.owner===state.user.id), featured=own[0] || upcoming()[0];
  const pending = state.invitations.length + state.friendRequests.length + state.joinRequests.length;
  return `${pageIntro('KHÔNG GIAN CỦA BẠN',`Chào ${esc(state.user.name.split(' ').slice(-1)[0])}, <span>hẹn nhau nhé.</span>`, 'Dành một chút thời gian cho những điều và những người bạn mong đợi.')}
    <div class="overview-metrics"><div><span class="metric-value">${String(own.length).padStart(2,'0')}</span><span>Cuộc hẹn sắp tới</span></div><div><span class="metric-value">${String(state.friends.length).padStart(2,'0')}</span><span>Người bạn kết nối</span></div><div><span class="metric-value">${String(pending).padStart(2,'0')}</span><span>Lời mời & yêu cầu</span></div><div><span class="metric-value">${String(state.events.filter(e=>e.owner===state.user.id).length).padStart(2,'0')}</span><span>Sự kiện bạn tổ chức</span></div></div>
    ${featuredEvent(featured)}
    <div class="home-columns"><section class="editorial-section"><div class="section-heading"><div><p class="overline">TRÊN LỊCH CỦA BẠN</p><h2>Những lần gặp sắp tới.</h2></div><button class="quiet-link" data-page="events">Tất cả sự kiện ${arrowRight}</button></div>${own.length ? own.slice(0,3).map(eventRow).join('') : emptyState('Lịch hẹn vẫn còn trống.','Tạo một sự kiện và rủ bạn bè cùng tham gia.','create','Tạo cuộc hẹn')}</section>
    <aside class="invitation-note"><p class="overline">MỘT LỜI MỜI, MỘT KẾT NỐI</p><h2>${pending ? `${pending} lời hẹn<br>đang chờ bạn.` : 'Có nhau,<br>ngày nào cũng vui.'}</h2><p>${pending ? 'Phản hồi những lời mời và yêu cầu tham gia mới nhất của bạn.' : 'Kết nối với bạn bè và tạo thêm những dịp để gặp nhau.'}</p><button class="quiet-link" data-page="${pending?'inbox':'friends'}">${pending?'Mở hộp thư':'Kết nối bạn bè'} ${arrowRight}</button></aside></div>
    <section class="activity-section"><div><p class="overline">NHẬT KÝ NHỎ</p><h2>Gần đây.</h2><p class="muted-copy">Những thay đổi trong không gian của bạn.</p></div><ol class="activity-list">${activityList()}</ol></section>`;
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
function eventMatches(e) {
  const scope = state.filter === 'all' || (state.filter === 'mine' && isOwner(e)) || (state.filter === 'joined' && state.user && (e.joined || isOwner(e))) || (state.filter === 'invited' && (e.invitation === 'pending' || state.invitations.some(i => i.eventId === e.id)));
  const visibility = state.eventVisibility === 'all' || state.eventVisibility === e.visibility;
  return scope && visibility && normalizeSearch(`${e.title} ${e.location} ${e.ownerName || ''}`).includes(normalizeSearch(state.query.trim()));
}
function eventListCard(e) {
  const d = dateParts(e.startsAt), status = eventStatus(e), past = new Date(e.startsAt).getTime() < Date.now();
  const owner = isOwner(e) ? state.user : state.users.find(u => u.id === e.owner) || {name:e.ownerName || 'Thành viên Evently'};
  return `<article class="event-list-card">
    <div class="event-list-copy"><div class="event-card-top"><time datetime="${esc(e.startsAt)}">${esc(d.time)}</time><span class="event-privacy ${e.visibility==='private'?'is-private':''}">${e.visibility==='private' ? 'Riêng tư' : 'Công khai'}</span></div>
      <h3><button type="button" data-action="detail" data-id="${e.id}">${esc(e.title)}</button></h3>
      <p class="event-organizer">${avatar(owner)}<span>Bởi ${esc(owner.name)}</span></p>
      <p class="event-location">${icons.pin}<span>${esc(e.location)}</span></p>
      <div class="event-card-bottom"><span class="event-rsvp ${past ? 'is-past' : status ? 'has-status' : ''}">${past ? 'Đã kết thúc' : status ? `${e.joined || isOwner(e) ? icons.check : ''}${status}` : e.visibility==='private' ? 'Qua lời mời' : 'Nhận yêu cầu tham gia'}</span><span class="event-attendees">${attendeeCount(e)} người tham gia</span></div>
    </div>
    <button type="button" class="event-poster-button" data-action="detail" data-id="${e.id}" aria-label="Xem chi tiết ${esc(e.title)}">${eventPoster(e)}</button>
  </article>`;
}
function eventTimeline(events) {
  const groups = new Map();
  for (const e of events) { const key = dateKey(e.startsAt); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e); }
  const today = dateKey(new Date()), tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const tomorrow = dateKey(tomorrowDate);
  return `<div class="event-timeline">${[...groups].map(([key, items]) => {
    const d = new Date(items[0].startsAt), short = d.toLocaleDateString('vi-VN',{day:'numeric',month:'long'});
    const relative = key === today ? 'Hôm nay' : key === tomorrow ? 'Ngày mai' : d.toLocaleDateString('vi-VN',{weekday:'long'});
    return `<section class="event-day-group" aria-labelledby="day-${key}"><h2 id="day-${key}" class="event-day-heading"><time datetime="${key}"><strong>${esc(short)}</strong><span>${esc(relative)}</span>${d.getFullYear() !== new Date().getFullYear() ? `<small>${d.getFullYear()}</small>` : ''}</time></h2><div class="event-day-cards">${items.map(eventListCard).join('')}</div></section>`;
  }).join('')}</div>`;
}
function searchBox(id, placeholder) { return `<label class="editorial-search">${icons.search}<span class="sr-only">${placeholder}</span><input id="${id}" type="search" placeholder="${placeholder}" value="${esc(state.query)}" autocomplete="off"></label>`; }
function eventsPage() {
  const now = Date.now(), matched = state.events.filter(eventMatches);
  const periods = {upcoming:matched.filter(e => new Date(e.startsAt).getTime() >= now),past:matched.filter(e => new Date(e.startsAt).getTime() < now)};
  const events = periods[state.eventPeriod].slice().sort((a,b) => (new Date(a.startsAt)-new Date(b.startsAt)) * (state.eventPeriod==='past' ? -1 : 1));
  const hasFilters = state.query.trim() || state.filter !== 'all' || state.eventVisibility !== 'all';
  const scopes = [['all','Khám phá'],['joined','Bạn tham gia'],['mine','Bạn tổ chức'],['invited','Được mời']];
  return `<section class="events-page"><header class="events-heading"><div class="events-title-block"><p class="overline">DÀNH THỜI GIAN CHO NHỮNG ĐIỀU BẠN THÍCH</p><div class="events-title-line"><h1>Sự kiện<span>.</span></h1><span class="events-bouquet" aria-hidden="true">${meadowSprig()}</span></div><p>Tìm một cuộc hẹn. Mang về những kỷ niệm.</p></div><button class="btn" data-action="create">${icons.plus} Tạo sự kiện</button></header>
    <div class="events-navigation"><div class="event-periods" aria-label="Thời gian sự kiện">${[['upcoming','Sắp tới'],['past','Đã qua']].map(([value,label])=>`<button type="button" data-period="${value}" class="${state.eventPeriod===value?'active':''}" aria-pressed="${state.eventPeriod===value}">${label}<span>${periods[value].length}</span></button>`).join('')}</div>${searchBox('event-search','Tìm sự kiện, địa điểm...')}</div>
    <div class="events-filters">${state.user ? `<div class="event-scope-tabs" aria-label="Lọc sự kiện">${scopes.map(([value,label])=>`<button type="button" data-filter="${value}" class="${state.filter===value?'active':''}" aria-pressed="${state.filter===value}">${label}</button>`).join('')}</div><label class="event-visibility"><span class="sr-only">Loại sự kiện</span><select id="event-visibility" aria-label="Loại sự kiện">${[['all','Mọi loại sự kiện'],['public','Công khai'],['private','Riêng tư']].map(([value,label])=>`<option value="${value}" ${state.eventVisibility===value?'selected':''}>${label}</option>`).join('')}</select>${icons.arrow}</label>` : '<p class="public-events-note"><span aria-hidden="true"></span>Khám phá tự do. Đăng nhập khi bạn muốn tham gia.</p>'}</div>
    <p class="event-results" role="status">${state.eventsLoading ? 'Đang tải các cuộc hẹn…' : state.eventsError ? 'Kết nối đang gián đoạn' : events.length ? `${events.length} cuộc hẹn ${state.eventPeriod==='past'?'đã qua':'đang chờ bạn'}` : 'Chưa có cuộc hẹn phù hợp'}</p>
    ${state.eventsLoading ? '<div class="events-loading" role="status" aria-label="Đang tải sự kiện"><span></span><span></span><span></span><p>Đang tìm những cuộc hẹn dành cho bạn…</p></div>' : state.eventsError ? emptyState('Chưa thể tải danh sách sự kiện.',state.eventsError,'retry-events','Thử lại') : events.length ? eventTimeline(events) : emptyState(hasFilters ? 'Chưa tìm thấy cuộc hẹn phù hợp.' : state.eventPeriod==='past' ? 'Những kỷ niệm đang ở phía trước.' : 'Cuộc hẹn tiếp theo bắt đầu từ bạn.', hasFilters ? 'Thử một từ khóa khác hoặc bỏ bớt bộ lọc để khám phá thêm.' : state.eventPeriod==='past' ? 'Các sự kiện đã qua sẽ được lưu lại tại đây.' : 'Tạo sự kiện và rủ những người bạn yêu quý cùng tham gia.',hasFilters ? 'clear-event-filters' : state.eventPeriod==='past' ? 'upcoming-events' : 'create',hasFilters ? 'Xóa bộ lọc' : state.eventPeriod==='past' ? 'Khám phá sự kiện sắp tới' : 'Tạo cuộc hẹn đầu tiên')}
  </section>`;
}
function friendCard(user, connected) {
  const request=state.friendRequests.find(r=>r.from===user.id || r.user?.id===user.id);
  const actions=connected ? `<span class="connected-label">${icons.check} Bạn bè</span><button class="icon-btn plain" data-action="unfriend" data-id="${user.id}" aria-label="Hủy kết bạn với ${esc(user.name)}">${closeIcon}</button>` : user.friendship==='sent' ? '<span class="status-label">Đang chờ phản hồi</span>' : request ? `<button class="btn small" data-action="friend-accept" data-id="${request.id}">Chấp nhận</button>` : `<button class="btn secondary small" data-action="friend-add" data-id="${user.id}">Kết bạn ${icons.plus}</button>`;
  return `<article class="connection-card">${avatar(user,'large')}<div class="connection-copy"><h3>${esc(user.name)}</h3><p>${esc(user.email)}</p></div><div class="connection-actions">${actions}</div></article>`;
}
function friendsPage() {
  const query=state.query.toLowerCase(), match=u=>(u.name+' '+u.email).toLowerCase().includes(query);
  const friends=state.friends.filter(match), discover=state.users.filter(u=>u.friendship!=='friends'&&match(u));
  return `${pageIntro('KẾT NỐI / BẠN BÈ','Những người <span>bạn thương.</span>','Một lời kết bạn, thêm một người để chia sẻ những ngày vui.',false)}<div class="connections-toolbar"><p>${state.friends.length} người bạn trong không gian của bạn</p>${searchBox('friend-search','Tìm tên hoặc email')}</div><section class="editorial-section"><div class="section-heading"><h2>Bạn bè của bạn <small>${state.friends.length}</small></h2><button class="quiet-link" data-page="inbox">Lời mời kết bạn ${arrowRight}</button></div>${friends.length?`<div class="connection-grid">${friends.map(u=>friendCard(u,true)).join('')}</div>`:emptyState(state.query?'Chưa tìm thấy người bạn này.':'Cùng nhau bắt đầu một kết nối.','Tìm kiếm mọi người bên dưới và gửi lời mời kết bạn.')}</section><section class="editorial-section discover-section"><div class="section-heading"><div><p class="overline">THÊM NHỮNG NGƯỜI CÙNG QUAN TÂM</p><h2>Khám phá mọi người.</h2></div><span class="muted-copy">${discover.length} người</span></div>${discover.length?`<div class="connection-grid">${discover.map(u=>friendCard(u,false)).join('')}</div>`:emptyState('Bạn đã xem hết mọi người.','Những thành viên mới sẽ xuất hiện tại đây.')}</section>`;
}
function inboxItems() {
  return [...state.invitations.map(i=>({...i,type:'events',person:i.from,title:i.event?.title || 'Lời mời tham gia sự kiện',copy:`${i.from?.name || 'Một người bạn'} mời bạn tham gia`,event:i.event,accept:'invite-accept',reject:'invite-reject'})),...state.friendRequests.map(r=>({...r,type:'friends',person:r.user,title:r.user.name,copy:'Muốn kết nối và trở thành bạn bè với bạn',accept:'friend-accept',reject:'friend-reject'})),...state.joinRequests.map(r=>({...r,type:'requests',person:r.user,title:r.event.title,copy:`${r.user.name} muốn tham gia cuộc hẹn của bạn`,event:r.event,accept:'join-accept',reject:'join-reject'}))].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
}
function inboxPage() {
  const items=inboxItems(), visible=items.filter(i=>state.inboxTab==='all'||i.type===state.inboxTab);
  return `${pageIntro('KẾT NỐI / HỘP THƯ','Những lời hẹn <span>dành cho bạn.</span>','Phản hồi một lời mời, bắt đầu một cuộc gặp gỡ.',false)}<div class="collection-toolbar"><div class="editorial-tabs" aria-label="Lọc lời mời">${[['all','Tất cả'],['events','Sự kiện'],['friends','Kết bạn'],['requests','Xin tham gia']].map(([key,label])=>`<button data-inbox="${key}" class="${key===state.inboxTab?'active':''}" aria-pressed="${key===state.inboxTab}">${label} <small>${items.filter(i=>key==='all'||i.type===key).length}</small></button>`).join('')}</div></div><div class="inbox-list">${visible.length?visible.map(i=>`<article class="invitation-row">${avatar(i.person,'large')}<div class="invitation-copy"><p class="overline">${{events:'LỜI MỜI THAM GIA',friends:'LỜI MỜI KẾT BẠN',requests:'YÊU CẦU THAM GIA'}[i.type]}</p><h2>${esc(i.title)}</h2><p>${esc(i.copy)}</p>${i.event?`<p class="invitation-meta">${esc(dateParts(i.event.startsAt).full)}<span>·</span>${esc(i.event.location)}</p>`:''}</div><div class="invitation-actions"><button class="btn small" data-action="${i.accept}" data-id="${i.id}">${i.type==='requests'?'Duyệt yêu cầu':i.type==='events'?'Tham gia':'Chấp nhận'} ${arrowRight}</button><button class="quiet-link muted" data-action="${i.reject}" data-id="${i.id}">Từ chối</button></div></article>`).join(''):emptyState('Hộp thư đã được xem hết.','Những lời mời và yêu cầu mới sẽ xuất hiện ở đây.','browse-events','Khám phá sự kiện')}</div>`;
}
function render() {
  window.EventlyMeadow?.stop();
  if (!state.user) { if(state.page==='events')publicShell(eventsPage());else {app.innerHTML=landing();requestAnimationFrame(()=>{if(!state.authOpen)window.EventlyMeadow?.mount();});}return; }
  shell(({home,events:eventsPage,friends:friendsPage,inbox:inboxPage})[state.page]());
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
  showDialog(`<div class="overlay" data-action="overlay-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description"><header class="modal-top"><div><p class="overline">EVENTLY / MỖI CUỘC HẸN LÀ MỘT KỶ NIỆM</p><h2 id="dialog-title">${esc(title)}</h2><p id="dialog-description">${esc(subtitle)}</p></div><button class="icon-btn plain" data-action="close-modal" aria-label="Đóng hộp thoại">${closeIcon}</button></header>${html}</section></div>`);
}
function createModal(e) {
  modal(e?'Chỉnh sửa cuộc hẹn.':'Tạo một cuộc hẹn mới.',e?'Thay đổi một chút, để mọi người dễ dàng gặp nhau hơn.':'Một chút thông tin để bạn bè cùng lên lịch.',`<form id="event-form" data-id="${e?.id||''}"><div class="form-grid"><div class="field full"><label for="event-title">Tên cuộc hẹn</label><input id="event-title" name="title" placeholder="Ví dụ: Một chiều cà phê cùng nhau" maxlength="160" required value="${esc(e?.title||'')}"></div><div class="field"><label for="event-date">Thời gian</label><input id="event-date" name="startsAt" type="datetime-local" value="${e?localInputTime(e.startsAt):''}" required></div><div class="field"><label for="event-location">Địa điểm</label><input id="event-location" name="location" placeholder="Mình sẽ gặp nhau ở đâu?" value="${esc(e?.location||'')}" required></div><fieldset class="visibility-field full"><legend>Ai có thể tham gia?</legend><div class="visibility-options"><label><input type="radio" name="visibility" value="public" ${e?.visibility!=='private'?'checked':''}><span><b>Công khai</b><small>Mọi người có thể gửi yêu cầu tham gia.</small></span></label><label><input type="radio" name="visibility" value="private" ${e?.visibility==='private'?'checked':''}><span><b>Riêng tư</b><small>Chia sẻ cuộc hẹn với bạn bè được mời.</small></span></label></div></fieldset><div class="field full"><label for="event-description">Lời nhắn cho mọi người</label><textarea id="event-description" name="description" rows="4" placeholder="Kể thêm một chút về cuộc hẹn...">${esc(e?.description||'')}</textarea></div></div><p class="form-error" role="alert" hidden></p><div class="form-actions">${e?`<button class="quiet-link danger" type="button" data-action="delete-event" data-id="${e.id}">Xóa sự kiện</button>`:''}<span class="action-spacer"></span><button class="btn secondary" type="button" data-action="close-modal">Để sau</button><button class="btn">${e?'Lưu thay đổi':'Tạo cuộc hẹn'} ${arrowRight}</button></div></form>`);
}
function detailModal(e) {
  if (!e) return;
  const d=dateParts(e.startsAt), owned=isOwner(e), invitation=state.invitations.find(i=>i.eventId===e.id);
  const action=!owned&&new Date(e.startsAt)<new Date()?'<span class="status-label">Sự kiện đã kết thúc.</span>':!state.user?`<button class="btn" data-action="join" data-id="${e.id}">Tham gia sự kiện ${arrowRight}</button>`:owned?`<button class="btn secondary" data-action="edit-event" data-id="${e.id}">Chỉnh sửa</button><button class="btn" data-action="invite-friend" data-id="${e.id}">Mời bạn bè ${icons.plus}</button>`:invitation?`<button class="btn" data-action="invite-accept" data-id="${invitation.id}">Chấp nhận lời mời ${arrowRight}</button>`:e.joined?'<span class="status-label">Bạn sẽ tham gia cuộc hẹn này.</span>':e.request==='pending'?'<button class="btn secondary" disabled>Đã gửi yêu cầu</button>':e.visibility==='public'?`<button class="btn" data-action="join" data-id="${e.id}">Gửi yêu cầu tham gia ${arrowRight}</button>`:'<span class="status-label">Sự kiện riêng tư · cần lời mời để tham gia.</span>';
  const people=(e.attendees||[]).map(id=>id===state.user?.id?state.user:state.users.find(u=>u.id===id)).filter(Boolean);
  modal(e.title,e.ownerName?`Được tổ chức bởi ${e.ownerName}.`:'Một dịp để dành thời gian cho nhau.',`<div class="detail-calendar"><span class="detail-date">${d.day}<small>${d.month}</small></span><div><p>${esc(d.weekday)}, ${esc(d.full)}</p><span>${esc(d.time)} · ${e.visibility==='private'?'Riêng tư':'Công khai'}</span></div></div><div class="detail-location">${icons.pin}<div><span>ĐỊA ĐIỂM</span><p>${esc(e.location)}</p></div></div><p class="detail-description">${esc(e.description||'Một cuộc hẹn đáng nhớ đang chờ mọi người.')}</p><div class="detail-participants"><div class="avatar-stack">${people.slice(0,5).map(u=>avatar(u)).join('')}</div><span>${attendeeCount(e)} người sẽ tham gia</span></div><div class="form-actions">${action}</div>`);
}
function inviteModal(eventId) {
  const event=state.events.find(e=>e.id===eventId); if (!event) return;
  const friends=state.friends.filter(f=>!event.attendees.includes(f.id));
  modal('Thêm bạn, thêm niềm vui.',`Mời bạn bè đến ${event.title}.`,friends.length?`<div class="invite-friends-list">${friends.map(f=>`<div class="invite-friend-row">${avatar(f)}<div><strong>${esc(f.name)}</strong><small>${esc(f.email)}</small></div><button class="btn secondary small" data-action="send-invite" data-event="${eventId}" data-id="${f.id}">Gửi lời mời ${icons.plus}</button></div>`).join('')}</div>`:emptyState('Chưa có người bạn nào để mời.','Kết nối thêm bạn bè hoặc mọi người đã tham gia cuộc hẹn.'));
}
function accountModal() { modal('Không gian của bạn.', 'Những kết nối và cuộc hẹn bắt đầu từ đây.', `<div class="account-details">${avatar(state.user,'large')}<h3>${esc(state.user.name)}</h3><p>${esc(state.user.email)}</p></div><div class="account-summary"><span><b>${state.friends.length}</b> bạn bè</span><span><b>${state.events.filter(e=>e.owner===state.user.id).length}</b> sự kiện tổ chức</span></div><div class="form-actions"><button class="btn secondary" data-action="logout">Đăng xuất ${logoutIcon}</button></div>`); }
function routeURL(page) {
  const hash = page === 'events' ? '#events' : '';
  if(location.hash!==hash)history.pushState(null,'',`${location.pathname}${location.search}${hash}`);
}
async function browseEvents(updateURL = true) {
  state.page = 'events';
  if(updateURL)routeURL('events');
  window.scrollTo({top:0,behavior:'instant'});
  if(state.user){render();return;}
  const request = ++publicLoadId;
  state.eventsLoading = true;state.eventsError='';state.filter='all';state.eventVisibility='all';
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
  Object.assign(state,{token:'',user:null,authOpen:false,authIntent:null,events:[],friends:[],users:[],invitations:[],friendRequests:[],joinRequests:[],activity:[],filter:'all',query:'',eventVisibility:'all',eventsLoading:false,eventsError:''});
  localStorage.removeItem('evently-token');
}
async function routeFromLocation() {
  const page=location.hash==='#events'?'events':'home';
  if(page===state.page)return;
  closeModal();await navigate(page,false);
}
window.addEventListener('popstate',routeFromLocation);
window.addEventListener('hashchange',routeFromLocation);
document.addEventListener('click', async event => {
  const button=event.target.closest('[data-action],[data-page],[data-filter],[data-inbox],[data-period]');
  if (!button || button.disabled) return;
  if (button.dataset.page) { navigate(button.dataset.page); return; }
  if (button.dataset.filter) { state.filter=button.dataset.filter;render();return; }
  if (button.dataset.inbox) { state.inboxTab=button.dataset.inbox;render();return; }
  if (button.dataset.period) { state.eventPeriod=button.dataset.period;render();return; }
  const action=button.dataset.action,id=button.dataset.id;
  try {
    if (action==='open-login'||action==='open-register') {state.authIntent=null;authModal(action==='open-login'?'login':'register');}
    else if (action==='toggle-auth') {
      const form = document.querySelector('#auth-form');
      if (form?.querySelector('[type=submit]')?.disabled) return;
      authModal(state.authMode==='login'?'register':'login', Object.fromEntries(new FormData(form)));
    }
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
    else if (action==='clear-event-filters') { state.filter='all';state.query='';state.eventVisibility='all';render();document.querySelector('#event-search')?.focus(); }
    else if (action==='upcoming-events') { state.eventPeriod='upcoming';render(); }
    else if (action==='create') {if(state.user)createModal();else requireAccount({action:'create'});}
    else if (action==='detail') detailModal(state.events.find(e=>e.id===id));
    else if (action==='edit-event') createModal(state.events.find(e=>e.id===id));
    else if (action==='invite-friend') inviteModal(id);
    else if (action==='account') accountModal();
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
  const form=event.target;if(!['auth-form','event-form'].includes(form.id))return;event.preventDefault();
  const submit=form.querySelector('button:not([type="button"])'),errorBox=form.querySelector('.form-error'),oldLabel=submit.innerHTML;
  if(submit.disabled)return;submit.disabled=true;submit.textContent='Đang lưu…';errorBox.hidden=true;
  try {
    const data=Object.fromEntries(new FormData(form));
    if(form.id==='auth-form') {
      submit.textContent=state.authMode==='login'?'Đang đăng nhập…':'Đang tạo tài khoản…';
      const result=await api(state.authMode==='login'?'login':'register',data);
      if (!form.isConnected) return;
      const intent=state.authIntent;
      ++publicLoadId;
      state.token=result.token;state.user=result.user;state.eventsLoading=false;state.eventsError='';state.page=intent||state.page==='events'?'events':'home';localStorage.setItem('evently-token',state.token);closeModal();routeURL(state.page);await refresh();
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
  const {id,value,selectionStart}=event.target;state.query=value;render();
  const input=document.getElementById(id);input.focus();if(Number.isInteger(selectionStart)){try{input.setSelectionRange(selectionStart,selectionStart);}catch{}}
});
app.addEventListener('change', event => {
  if(event.target.id==='event-visibility'){state.eventVisibility=event.target.value;render();document.querySelector('#event-visibility')?.focus();}
});
document.addEventListener('focusin', event => {
  const dialog=event.target.closest?.('.auth-dialog');
  if(dialog)dialog.classList.toggle('auth-is-editing',!!event.target.closest('#auth-form'));
});
document.addEventListener('keydown', event => {
  const dialog=modalRoot.querySelector('[role="dialog"]');if(!dialog)return;
  if(event.key==='Escape'){event.preventDefault();closeModal();return;}
  if(event.key==='Tab'){
    const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,a[href]')].filter(el=>el.getClientRects().length);
    if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
async function init() {
  if(!state.token){if(state.page==='events')await browseEvents(false);else render();return;}
  try{state.user=await api('me');await refresh();}
  catch{resetMemberState();if(state.page==='events')await browseEvents(false);else render();}
}
init();
