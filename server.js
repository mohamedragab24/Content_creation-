require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const configuredDataDir = process.env.DATA_DIR || 'data';
const DATA_DIR = path.isAbsolute(configuredDataDir) ? configuredDataDir : path.join(ROOT, configuredDataDir);
const SECRET_FILE = path.join(DATA_DIR, 'api-secrets.enc');
const demoMode = process.env.DEMO_MODE !== 'false';
const providers = ['openai', 'gemini', 'manus'];
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0';
const META_REDIRECT_URI = () => `${String(process.env.OAUTH_CALLBACK_BASE_URL || '').replace(/\/$/, '')}/api/meta/callback`;
const META_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'];

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'self'", 'https:']
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(express.json({ limit: '1mb' }));
app.use(session({
  name: 'vidflow.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-change-this-session-secret-please',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));
app.use((req, _res, next) => {
  const publicHttps = req.get('x-forwarded-proto') === 'https' || req.protocol === 'https';
  req.session.cookie.secure = Boolean(publicHttps);
  req.session.cookie.sameSite = publicHttps ? 'none' : 'lax';
  next();
});

function readSecrets() {
  try {
    const envelope = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf8'));
    const key = crypto.createHash('sha256').update(process.env.SETTINGS_ENCRYPTION_KEY || '').digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    console.error('Could not decrypt stored provider keys. Check SETTINGS_ENCRYPTION_KEY.');
    return {};
  }
}
function writeSecrets(secrets) {
  if (!process.env.SETTINGS_ENCRYPTION_KEY || process.env.SETTINGS_ENCRYPTION_KEY.length < 32) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be configured (at least 32 characters).');
  }
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const key = crypto.createHash('sha256').update(process.env.SETTINGS_ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(secrets), 'utf8'), cipher.final()]);
  const envelope = { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
  fs.writeFileSync(SECRET_FILE, JSON.stringify(envelope), { mode: 0o600 });
}
function isAuthenticated(req) { return demoMode || req.session?.authenticated === true; }
function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'سجّل الدخول أولًا.' });
  next();
}
function keyStatuses() {
  const saved = readSecrets();
  const envKeys = {
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    manus: process.env.MANUS_API_KEY,
    meta: process.env.META_APP_ID && process.env.META_APP_SECRET,
  };
  return Object.fromEntries(providers.map((name) => [name, Boolean(saved[name] || envKeys[name])]));
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'vidflow', mode: demoMode ? 'demo' : 'production' }));
app.post('/api/auth/login', (req, res) => {
  if (demoMode) return res.json({ ok: true, demo: true });
  const password = String(req.body?.password || '');
  if (!process.env.ADMIN_PASSWORD || !crypto.timingSafeEqual(Buffer.from(password.padEnd(128).slice(0, 128)), Buffer.from(process.env.ADMIN_PASSWORD.padEnd(128).slice(0, 128)))) {
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
  }
  req.session.authenticated = true;
  res.json({ ok: true, demo: false });
});
app.post('/api/auth/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
app.get('/api/auth/session', (req, res) => res.json({ authenticated: isAuthenticated(req), demo: demoMode }));

app.get('/api/dashboard', requireAuth, (_req, res) => res.json({
  stats: { views: 248000, engagement: 8.6, posts: 32, comments: 1248 },
  chart: [
    { day: '١٦ أبريل', views: 30, engagement: 12 }, { day: '١٧ أبريل', views: 40, engagement: 20 },
    { day: '١٨ أبريل', views: 35, engagement: 18 }, { day: '١٩ أبريل', views: 54, engagement: 28 },
    { day: '٢٠ أبريل', views: 48, engagement: 24 }, { day: '٢١ أبريل', views: 66, engagement: 34 },
    { day: '٢٢ أبريل', views: 82, engagement: 54 }
  ],
  recentPosts: [
    { title: 'روتيني الصباحي للإنتاجية', platform: 'Instagram', status: 'تم النشر', views: 18400, image: '/assets/thumbnail-morning.jpg', duration: '00:45' },
    { title: '٥ وجهات سياحية مذهلة', platform: 'TikTok', status: 'قيد الجدولة', views: 12300, image: '/assets/thumbnail-travel.jpg', duration: '01:12' },
    { title: 'كيف تصنع محتوى بالذكاء الاصطناعي؟', platform: 'YouTube', status: 'مسودة', views: 8700, image: '/assets/thumbnail-creator.jpg', duration: '02:28' }
  ],
  comments: [
    { name: 'نور عبدالله', platform: 'Instagram', time: 'منذ ٣ ساعات', text: 'المحتوى رائع ومفيد جدًا! هل يمكن أن تشاركي مزيدًا من التفاصيل حول الأدوات المستخدمة؟', suggestion: 'سعيدة إن المحتوى عجبك! قريبًا هشارك تفاصيل أكثر عن الأدوات والخطوات.' },
    { name: 'محمد علي', platform: 'TikTok', time: 'منذ ٥ ساعات', text: 'ممكن تنزل الفيديو كامل؟', suggestion: 'أكيد! الفيديو الكامل هينزل قريبًا، تابعنا عشان يوصلك.' }
  ]
}));
app.get('/api/settings', requireAuth, (_req, res) => { const saved = readSecrets(); res.json({ demo: demoMode, providers: keyStatuses(), social: [{ id: 'meta', connected: Boolean(saved.metaPages?.length), pages: (saved.metaPages || []).map(({id,name,instagram}) => ({id,name,instagram: instagram || null})) }] }); });
app.put('/api/settings/keys/:provider', requireAuth, (req, res) => {
  if (demoMode) return res.status(403).json({ error: 'وضع العرض التوضيحي للقراءة فقط. عطّل DEMO_MODE واضبط تسجيل الدخول قبل حفظ المفاتيح.' });
  const provider = req.params.provider;
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!providers.includes(provider)) return res.status(404).json({ error: 'مزود غير معروف.' });
  if (apiKey.length < 8 || apiKey.length > 4096) return res.status(400).json({ error: 'قيمة المفتاح غير صالحة.' });
  const saved = readSecrets(); saved[provider] = apiKey;
  try { writeSecrets(saved); res.json({ ok: true, configured: true }); }
  catch (error) { res.status(503).json({ error: error.message }); }
});
app.delete('/api/settings/keys/:provider', requireAuth, (req, res) => {
  if (demoMode) return res.status(403).json({ error: 'عطّل DEMO_MODE لحذف المفاتيح.' });
  const saved = readSecrets(); delete saved[req.params.provider];
  try { writeSecrets(saved); res.json({ ok: true }); } catch (error) { res.status(503).json({ error: error.message }); }
});

app.post('/api/ai/script', requireAuth, async (req, res) => {
  const provider = ['openai', 'gemini'].includes(req.body?.provider) ? req.body.provider : 'openai';
  const topic = String(req.body?.topic || '').trim().slice(0, 500);
  if (!topic) return res.status(400).json({ error: 'اكتب فكرة الفيديو أولًا.' });
  const saved = readSecrets();
  const apiKey = saved[provider] || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);
  if (!apiKey) return res.status(409).json({ error: `أضف مفتاح ${provider === 'openai' ? 'OpenAI' : 'Gemini'} من صفحة الإعدادات أولًا.` });
  try {
    let script;
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: 'اكتب نص فيديو اجتماعي قصير وجذاب باللغة العربية المصرية، مع افتتاحية قوية ودعوة لطيفة للتفاعل.' }, { role: 'user', content: topic }], temperature: 0.8 }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message || 'تعذر الاتصال بـ OpenAI'); script = payload.choices?.[0]?.message?.content;
    } else {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `اكتب نص فيديو اجتماعي قصير وجذاب باللغة العربية المصرية عن: ${topic}. ابدأ بافتتاحية قوية وأنهِ بدعوة لطيفة للتفاعل.` }] }] }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message || 'تعذر الاتصال بـ Gemini'); script = payload.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n');
    }
    res.json({ ok: true, script: script || '' });
  } catch (error) { res.status(502).json({ error: error.message || 'تعذر إنشاء النص.' }); }
});
app.get('/api/meta/connect', requireAuth, (req, res) => {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !process.env.OAUTH_CALLBACK_BASE_URL) return res.status(503).send('أكمل إعداد META_APP_ID وMETA_APP_SECRET وOAUTH_CALLBACK_BASE_URL في متغيرات البيئة أولًا.');
  const state = crypto.randomBytes(24).toString('hex');
  req.session.metaOAuthState = state;
  const params = new URLSearchParams({ client_id: process.env.META_APP_ID, redirect_uri: META_REDIRECT_URI(), state, response_type: 'code', scope: META_SCOPES.join(',') });
  res.redirect(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`);
});

app.get('/api/meta/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;
  if (error) return res.status(400).send(`تم إلغاء ربط Meta: ${String(errorDescription || error)}`);
  if (!code || !state || !req.session.metaOAuthState || state !== req.session.metaOAuthState) return res.status(400).send('تعذر التحقق من طلب الربط. ارجع إلى لوحة التحكم وابدأ الربط من جديد.');
  delete req.session.metaOAuthState;
  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.search = new URLSearchParams({ client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, redirect_uri: META_REDIRECT_URI(), code: String(code) }).toString();
    let tokenResponse = await fetch(tokenUrl);
    let tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error?.message || 'فشل استبدال رمز Meta.');
    const longUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    longUrl.search = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, fb_exchange_token: tokenData.access_token }).toString();
    tokenResponse = await fetch(longUrl);
    const longData = await tokenResponse.json();
    if (tokenResponse.ok && longData.access_token) tokenData = longData;
    const pagesUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts`);
    pagesUrl.search = new URLSearchParams({ fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '100', access_token: tokenData.access_token }).toString();
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();
    if (!pagesResponse.ok) throw new Error(pagesData.error?.message || 'لم يتمكن Meta من إرجاع الصفحات. تأكد من صلاحيات التطبيق والحساب.');
    const saved = readSecrets();
    saved.metaUserToken = tokenData.access_token;
    saved.metaUserTokenExpiresIn = tokenData.expires_in || null;
    saved.metaPages = (pagesData.data || []).map((page) => ({ id: page.id, name: page.name, accessToken: page.access_token, instagram: page.instagram_business_account || null }));
    writeSecrets(saved);
    return res.redirect('/#accounts?meta=connected');
  } catch (e) {
    console.error('Meta OAuth callback failed:', e.message);
    return res.status(502).send(`فشل ربط Meta: ${e.message}. ارجع للوحة التحكم وتأكد من Redirect URI والصلاحيات.`);
  }
});

app.get('/api/meta/pages', requireAuth, (_req, res) => {
  const saved = readSecrets();
  res.json({ connected: Boolean(saved.metaUserToken), pages: (saved.metaPages || []).map(({id,name,instagram}) => ({ id, name, instagram: instagram || null })) });
});
app.delete('/api/meta/disconnect', requireAuth, (_req, res) => {
  const saved = readSecrets(); delete saved.metaUserToken; delete saved.metaUserTokenExpiresIn; delete saved.metaPages;
  try { writeSecrets(saved); res.json({ ok: true }); } catch (e) { res.status(503).json({ error: e.message }); }
});

async function metaGraph(pathname, params, method = 'GET') {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pathname.replace(/^\/+/, '')}`);
  let options = { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
  if (method === 'GET') url.search = new URLSearchParams(params).toString();
  else options.body = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
  const response = await fetch(url, options); const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error?.message || `Meta API error (${response.status})`);
  return data;
}

app.post('/api/meta/publish', requireAuth, async (req, res) => {
  const { pageId, platform, message = '', imageUrl = '', videoUrl = '', link = '' } = req.body || {};
  const saved = readSecrets();
  const page = (saved.metaPages || []).find((item) => item.id === String(pageId || ''));
  if (!page) return res.status(400).json({ error: 'اختر صفحة مرتبطة أولًا.' });
  const text = String(message).trim().slice(0, 5000);
  const image = String(imageUrl).trim(); const video = String(videoUrl).trim(); const externalLink = String(link).trim();
  for (const candidate of [image, video, externalLink].filter(Boolean)) { try { const u = new URL(candidate); if (u.protocol !== 'https:') throw new Error(); } catch { return res.status(400).json({ error: 'روابط الصور والفيديو والروابط الخارجية يجب أن تكون روابط HTTPS عامة وصالحة.' }); } }
  try {
    let result;
    if (platform === 'instagram') {
      if (!page.instagram?.id) return res.status(400).json({ error: 'الصفحة المختارة لا تحتوي على حساب Instagram احترافي مربوط.' });
      if (!image && !video) return res.status(400).json({ error: 'نشر Instagram يحتاج رابط صورة أو فيديو HTTPS متاحًا للعامة.' });
      const media = await metaGraph(`${page.instagram.id}/media`, { access_token: page.accessToken, caption: text, ...(video ? { media_type: 'REELS', video_url: video } : { image_url: image }) }, 'POST');
      if (video) {
        let ready = false;
        for (let attempt = 0; attempt < 24; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 2500));
          const status = await metaGraph(media.id, { fields: 'status_code', access_token: page.accessToken });
          if (status.status_code === 'FINISHED') { ready = true; break; }
          if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') throw new Error('تعذر تجهيز فيديو Instagram. افحص رابط الفيديو وصيغته.');
        }
        if (!ready) throw new Error('استغرق تجهيز Reel وقتًا طويلًا؛ تحقق من حالة الوسيط في Meta وحاول مرة أخرى.');
      }
      result = await metaGraph(`${page.instagram.id}/media_publish`, { access_token: page.accessToken, creation_id: media.id }, 'POST');
      return res.json({ ok: true, platform, id: result.id, message: 'تم إرسال المحتوى إلى Instagram بنجاح.' });
    }
    if (platform !== 'facebook') return res.status(400).json({ error: 'المنصة غير مدعومة في هذا المسار.' });
    if (video) result = await metaGraph(`${page.id}/videos`, { access_token: page.accessToken, file_url: video, description: text }, 'POST');
    else if (image) result = await metaGraph(`${page.id}/photos`, { access_token: page.accessToken, url: image, caption: text }, 'POST');
    else result = await metaGraph(`${page.id}/feed`, { access_token: page.accessToken, message: text, ...(externalLink ? { link: externalLink } : {}) }, 'POST');
    res.json({ ok: true, platform, id: result.id || result.post_id || null, message: 'قبل Meta المنشور بنجاح.' });
  } catch (e) { res.status(502).json({ error: `تعذر النشر من Meta: ${e.message}` }); }
});

app.post('/api/videos/generate', requireAuth, (_req, res) => res.status(501).json({ error: 'توليد ملف فيديو كامل يحتاج مزود فيديو بالذكاء الاصطناعي ومفتاح API خاصًا به. إنشاء النص متاح من OpenAI أو Gemini.' }));
app.post('/api/social/:platform/publish', requireAuth, (req, res) => res.status(400).json({ error: 'استخدم واجهة Meta للنشر من /api/meta/publish، والمنصات الأخرى غير مفعلة في هذه النسخة.' }));
app.post('/api/comments/:id/reply', requireAuth, (_req, res) => res.status(501).json({ error: 'إرسال الردود على التعليقات يحتاج إضافة صلاحيات API ومعالج خاص بالتعليقات.' }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'المسار غير موجود.' }));
app.use(express.static(path.join(ROOT, 'public'), { maxAge: '1h' }));
app.get('*', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`VidFlow is listening on 0.0.0.0:${PORT} (${demoMode ? 'demo' : 'production'} mode)`));
