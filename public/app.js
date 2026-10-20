const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let toastTimer;
function toast(message, error = false) {
  const node = $('#toast'); node.textContent = message; node.classList.toggle('error', error); node.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3400);
}
function goTo(page) {
  const target = $(`#page-${page}`); if (!target) return;
  $$('.page').forEach((section) => section.classList.toggle('active', section === target));
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === page));
  $('#welcome-title').textContent = page === 'overview' ? 'مساء الخير، سارة' : target.dataset.pageTitle || 'فيديو فلو';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'settings') refreshSettings();
}
function openModal(id) { const modal = $(`#${id}`); modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal(modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { openModal('auth-modal'); throw new Error('سجّل الدخول للمتابعة.'); }
  if (!response.ok) throw new Error(data.error || 'حدث خطأ أثناء تنفيذ الطلب.');
  return data;
}

$$('[data-page]').forEach((button) => button.addEventListener('click', () => goTo(button.dataset.page)));
$$('[data-goto]').forEach((button) => button.addEventListener('click', () => goTo(button.dataset.goto)));
$$('[data-toast]').forEach((button) => button.addEventListener('click', () => toast(button.dataset.toast)));
$$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop'))));
$$('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(backdrop); }));
$('.notice-close')?.addEventListener('click', () => $('.notice-banner').remove());
$$('.reply-button').forEach((button) => button.addEventListener('click', () => goTo('comments')));
$$('[data-config-provider]').forEach((button) => button.addEventListener('click', () => { goTo('accounts'); }));
$('#search-input')?.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  if (query) goTo('overview');
  $$('.post-card').forEach((card) => { card.style.display = !query || card.dataset.search.toLowerCase().includes(query) ? '' : 'none'; });
});
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); } if (event.key === 'Escape') $$('.modal-backdrop.open').forEach(closeModal); });
$('#chart-range')?.addEventListener('change', () => toast('تظل بيانات الرسم توضيحية حتى ربط حساباتك.'));

async function showComments() {
  try {
    const data = await api('/api/dashboard');
    $('#comments-list').innerHTML = data.comments.map((comment) => `<article class="panel"><div class="comment-author"><span class="mini-avatar">${escapeHtml(comment.name.slice(0,1))}</span><div><strong>${escapeHtml(comment.name)}</strong><small>${escapeHtml(comment.time)} · ${escapeHtml(comment.platform)}</small></div></div><p style="line-height:1.9;color:#737783;font-size:11px">${escapeHtml(comment.text)}</p><div class="suggestion-box"><span class="suggestion-label">✦ رد مقترح</span>${escapeHtml(comment.suggestion)}</div><div class="comment-actions"><button class="button button-quiet button-sm" data-reply-preview="${escapeHtml(comment.suggestion)}">نسخ الرد المقترح</button><button class="button button-primary button-sm" data-send-comment="${escapeHtml(comment.platform)}">إرسال الرد</button></div></article>`).join('');
    $$('[data-reply-preview]').forEach((button) => button.addEventListener('click', async () => { try { await navigator.clipboard.writeText(button.dataset.replyPreview); toast('تم نسخ الرد المقترح.'); } catch { toast(button.dataset.replyPreview); } }));
    $$('[data-send-comment]').forEach((button) => button.addEventListener('click', async () => { try { await api(`/api/comments/demo/reply`, { method: 'POST', body: JSON.stringify({ platform: button.dataset.sendComment }) }); } catch (error) { toast(error.message, true); } }));
  } catch (error) { if (!error.message.includes('سجّل الدخول')) toast(error.message, true); }
}
const originalGoTo = goTo;
goTo = function(page) { originalGoTo(page); if (page === 'comments') showComments(); };

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]); }
async function refreshSettings() {
  try {
    const data = await api('/api/settings');
    const provider = $('#settings-provider').value;
    const ready = data.providers[provider];
    $('#key-status').innerHTML = `<span class="status-dot" style="background:${ready ? '#36ae82' : '#e5ad50'}"></span><span>${ready ? 'مفتاح مضبوط على الخادم' : (data.demo ? 'وضع تجريبي — الحفظ معطل' : 'لا يوجد مفتاح مضبوط')}</span>`;
  } catch (error) { if (!error.message.includes('سجّل الدخول')) toast(error.message, true); }
}
$('#settings-provider')?.addEventListener('change', refreshSettings);
$('#save-api-key')?.addEventListener('click', async () => {
  const provider = $('#settings-provider').value; const apiKey = $('#api-key-input').value.trim();
  if (!apiKey) return toast('أدخل مفتاح API أولًا.', true);
  try { await api(`/api/settings/keys/${provider}`, { method: 'PUT', body: JSON.stringify({ apiKey }) }); $('#api-key-input').value = ''; toast('تم حفظ المفتاح مشفرًا على الخادم.'); refreshSettings(); }
  catch (error) { toast(error.message, true); }
});

async function generateScript() {
  const topic = $('#video-topic').value.trim(); if (!topic) { toast('اكتب فكرة الفيديو أولًا.', true); $('#video-topic').focus(); return; }
  const button = $('#generate-script'); button.classList.add('loading'); button.textContent = 'جارٍ إعداد النص...';
  try { const data = await api('/api/ai/script', { method: 'POST', body: JSON.stringify({ topic, provider: $('#ai-provider').value }) }); $('#script-output').value = data.script; toast('تم إنشاء نص الفيديو. راجعه وعدّله قبل النشر.'); }
  catch (error) { toast(error.message, true); }
  finally { button.classList.remove('loading'); button.innerHTML = '✦ إنشاء نص الفيديو'; }
}
$('#generate-script')?.addEventListener('click', generateScript);
$('#generate-video')?.addEventListener('click', async () => { try { await api('/api/videos/generate', { method: 'POST', body: JSON.stringify({ topic: $('#video-topic').value }) }); } catch (error) { toast(error.message, true); } });
$$('.post-card').forEach((card) => card.addEventListener('click', () => toast('بيانات المنشور الحالية للتوضيح فقط.')));
$$('.stat-card').forEach((card) => card.addEventListener('click', () => goTo('analytics')));

$('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: $('#login-password').value }) }); closeModal($('#auth-modal')); $('#login-password').value = ''; toast('تم تسجيل الدخول.'); if ($('.page.active')?.id === 'page-settings') refreshSettings(); }
  catch (error) { toast(error.message, true); }
});
$$('.nav-item').forEach((button) => button.addEventListener('dblclick', () => { if (button.dataset.page === 'create') openModal('video-modal'); }));
$('#modal-create')?.addEventListener('click', () => { const topic = $('#modal-topic').value.trim(); if (!topic) return toast('اكتب فكرة الفيديو أولًا.', true); $('#video-topic').value = topic; closeModal($('#video-modal')); goTo('create'); setTimeout(() => $('#video-topic').focus(), 100); });

(async () => {
  try { const status = await api('/api/auth/session'); if (!status.demo && !status.authenticated) openModal('auth-modal'); }
  catch (error) { console.warn(error); }
  const date = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  $('#today-label').textContent = date;
})();


async function refreshMetaPages() {
  try {
    const data = await api('/api/meta/pages');
    const status = $('#meta-status');
    if (status) status.textContent = data.connected ? `مربوط (${data.pages.length} صفحة)` : 'غير مربوط';
    const select = $('#meta-page-select');
    const list = $('#meta-pages-list');
    if (select) select.innerHTML = '<option value="">اختر الصفحة</option>' + data.pages.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}${p.instagram ? ' — Instagram متاح' : ''}</option>`).join('');
    if (list) list.innerHTML = data.pages.length ? data.pages.map(p => `<div class="social-row"><span class="social-logo facebook">f</span><div class="social-name"><strong>${escapeHtml(p.name)}</strong><small>Page ID: ${escapeHtml(p.id)}${p.instagram ? ` · Instagram: ${escapeHtml(p.instagram.username || p.instagram.id)}` : ''}</small></div><span class="connection-label">متصلة</span></div>`).join('') : '<p class="panel-description">لا توجد صفحات متاحة. تأكد أنك مدير صفحة وأن التطبيق لديه الصلاحيات المطلوبة.</p>';
  } catch (error) { if (!error.message.includes('سجّل الدخول')) toast(error.message, true); }
}
$('#meta-connect')?.addEventListener('click', async () => {
  try { const session = await api('/api/auth/session'); if (!session.authenticated && !session.demo) return openModal('auth-modal'); window.location.href = '/api/meta/connect'; }
  catch (error) { toast(error.message, true); }
});
$('#meta-refresh')?.addEventListener('click', refreshMetaPages);
$('#meta-disconnect')?.addEventListener('click', async () => { if (!confirm('هل تريد فصل حساب Meta وحذف الرموز المحفوظة؟')) return; try { await api('/api/meta/disconnect', { method: 'DELETE' }); await refreshMetaPages(); toast('تم فصل حساب Meta.'); } catch (error) { toast(error.message, true); } });
$('#meta-publish')?.addEventListener('click', async () => {
  const button = $('#meta-publish'); button.disabled = true; button.textContent = 'جارٍ النشر...';
  try {
    const result = await api('/api/meta/publish', { method: 'POST', body: JSON.stringify({ pageId: $('#meta-page-select').value, platform: $('#meta-platform-select').value, message: $('#meta-message').value, imageUrl: $('#meta-image-url').value, videoUrl: $('#meta-video-url').value, link: $('#meta-link-url').value }) });
    toast(`${result.message}${result.id ? ` (ID: ${result.id})` : ''}`);
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; button.textContent = 'نشر الآن'; }
});
const previousGoToForMeta = goTo;
goTo = function(page) { previousGoToForMeta(page); if (page === 'accounts') refreshMetaPages(); };
if (location.hash.includes('meta=connected')) { history.replaceState({}, '', location.pathname); toast('تم ربط Meta. حدّث قائمة الصفحات إذا لم تظهر.'); goTo('accounts'); }
