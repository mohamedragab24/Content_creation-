const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken, authenticate, allowRoles } = require('./auth');
const store = require('./store');

const router = express.Router();
const admin = [authenticate, allowRoles('admin')];
const seller = [authenticate, allowRoles('seller'), async (req,res,next) => { try { const user=await store.findUserById(req.auth.sub); if(!user||user.status!=='active')return res.status(403).json({error:'حساب البائع بانتظار مراجعة الإدارة.'}); next(); } catch(e) { next(e); } }];
const customer = [authenticate, allowRoles('user')];
const cleanUser = (user) => ({ id:user.id, name:user.name, email:user.email, role:user.role, status:user.status, store_name:user.store_name });

router.get('/health', (_req,res) => res.json({ ok:true, service:'souqna-api', mode:store.demoMode?'demo':'postgresql' }));
router.post('/auth/register', async (req,res,next) => {
  try {
    const { name,email,password,role='user',store_name } = req.body || {};
    if (!name || !/^\S+@\S+\.\S+$/.test(String(email||'')) || String(password||'').length<8) return res.status(400).json({ error:'أدخل الاسم وبريدًا صحيحًا وكلمة مرور لا تقل عن ٨ أحرف.' });
    if (!['user','seller'].includes(role)) return res.status(400).json({ error:'الدور غير مسموح بالتسجيل العام.' });
    if (role==='seller' && !String(store_name||'').trim()) return res.status(400).json({ error:'اسم المتجر مطلوب لحساب البائع.' });
    if (await store.findUserByEmail(email)) return res.status(409).json({ error:'هذا البريد مسجل بالفعل.' });
    const user = await store.createUser({ name:String(name).trim(),email:String(email).trim().toLowerCase(),passwordHash:await bcrypt.hash(password,12),role,storeName:String(store_name||'').trim() });
    res.status(201).json({ token:signToken(user), user:cleanUser(user), message:role==='seller'?'تم إنشاء الحساب، ويظهر متجرك بانتظار المراجعة.':'تم إنشاء الحساب.' });
  } catch(e) { next(e); }
});
router.post('/auth/login', async (req,res,next) => {
  try {
    const { email,password } = req.body || {};
    const user = await store.findUserByEmail(String(email||''));
    if (!user || !await bcrypt.compare(String(password||''),user.password_hash)) return res.status(401).json({ error:'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
    if (user.status==='blocked') return res.status(403).json({ error:'الحساب موقوف. تواصل مع الإدارة.' });
    res.json({ token:signToken(user), user:cleanUser(user) });
  } catch(e) { next(e); }
});
router.get('/auth/me', authenticate, async (req,res,next) => { try { const user=await store.findUserById(req.auth.sub); if(!user)return res.status(404).json({error:'الحساب غير موجود.'}); res.json({user:cleanUser(user)}); } catch(e){next(e);} });

router.get('/products', async (req,res,next) => { try { res.json({items:await store.getProducts({q:String(req.query.q||''),category:String(req.query.category||'')})}); } catch(e){next(e);} });
router.get('/orders/mine', ...customer, async (req,res,next) => { try { res.json({items:await store.listCustomerOrders(req.auth.sub)}); } catch(e){next(e);} });
router.post('/orders', ...customer, async (req,res,next) => {
  try { const items=req.body?.items; if(!Array.isArray(items)||!items.length||items.length>30||items.some(i=>!i?.product_id||!Number.isInteger(Number(i.quantity))||Number(i.quantity)<1))return res.status(400).json({error:'قائمة المنتجات أو الكميات غير صالحة.'}); const order=await store.createOrder(req.auth.sub,items); if(!order)return res.status(400).json({error:'تعذر إنشاء الطلب.'}); res.status(201).json({order,message:'تم إنشاء طلب تجريبي، ولا يوجد دفع إلكتروني في هذه النسخة.'}); }
  catch(e){ if(e.message.includes('غير متاحة'))return res.status(409).json({error:e.message}); next(e); }
});

router.get('/seller/overview', ...seller, async (req,res,next) => { try { res.json(await store.sellerOverview(req.auth.sub)); } catch(e){next(e);} });
router.get('/seller/products', ...seller, async (req,res,next) => { try { res.json({items:await store.sellerProducts(req.auth.sub)}); } catch(e){next(e);} });
router.post('/seller/products', ...seller, async (req,res,next) => {
  try { const {name,category='عام',description='',price,stock=0,image_url=''}=req.body||{}; if(!name||!Number.isFinite(Number(price))||Number(price)<0||!Number.isInteger(Number(stock))||Number(stock)<0)return res.status(400).json({error:'تحقق من اسم المنتج والسعر والمخزون.'}); const row=await store.addProduct(req.auth.sub,{name:String(name),category:String(category),description:String(description),price:Number(price),stock:Number(stock),image_url:String(image_url)}); res.status(201).json({product:row}); }
  catch(e){next(e);}
});
router.patch('/seller/products/:id', ...seller, async (req,res,next) => { try { const row=await store.updateProduct(req.auth.sub,req.params.id,req.body||{}); if(!row)return res.status(404).json({error:'المنتج غير موجود ضمن منتجات متجرك.'}); res.json({product:row}); } catch(e){next(e);} });
router.get('/seller/orders', ...seller, async (req,res,next) => { try { res.json({items:await store.listSellerOrders(req.auth.sub)}); } catch(e){next(e);} });

router.get('/admin/overview', ...admin, async (_req,res,next) => { try { res.json(await store.overview()); } catch(e){next(e);} });
const sections = new Set(['orders','products','sellers','customers','offers','notifications','commissions','reports','permissions','settings']);
router.get('/admin/:section', ...admin, async (req,res,next) => { try { if(!sections.has(req.params.section))return res.status(404).json({error:'القسم غير موجود.'}); if(req.params.section==='settings')return res.json({settings:await store.getSettings()}); const items=await store.listSection(req.params.section); res.json({items:items||[]}); } catch(e){next(e);} });
router.patch('/admin/:section/:id/status', ...admin, async (req,res,next) => { try { const valid={orders:['new','processing','completed','cancelled'],products:['active','review','paused','rejected'],sellers:['active','pending','blocked'],customers:['active','blocked'],offers:['active','scheduled','expired','paused'],notifications:['draft','sent','scheduled']}; const {section}=req.params; const {status}=req.body||{}; if(!valid[section]||!valid[section].includes(status))return res.status(400).json({error:'حالة غير مدعومة.'}); const row=await store.updateStatus(section,req.params.id,status); if(!row)return res.status(404).json({error:'السجل غير موجود.'}); res.json({item:row}); } catch(e){next(e);} });
router.post('/admin/offers', ...admin, async (req,res,next) => { try { const {title,code,discount_percent,ends_at}=req.body||{}; const percent=Number(discount_percent); if(!title||!code||!Number.isFinite(percent)||percent<1||percent>100)return res.status(400).json({error:'تحقق من عنوان العرض والرمز ونسبة الخصم.'}); const row=await store.createOffer({title,code:String(code).toUpperCase(),discount_percent:percent,ends_at}); res.status(201).json({offer:row}); } catch(e){next(e);} });
router.post('/admin/notifications', ...admin, async (req,res,next) => { try { const {title,body='',audience='all'}=req.body||{}; if(!title)return res.status(400).json({error:'عنوان الإشعار مطلوب.'}); const row=await store.createNotification({title,body,audience}); res.status(201).json({notification:row,message:'تم حفظ الإشعار كمسودة؛ إرسال FCM يحتاج إعداد Firebase.'}); } catch(e){next(e);} });
router.get('/admin/settings', ...admin, async (_req,res,next) => { try { res.json({settings:await store.getSettings()}); } catch(e){next(e);} });
router.put('/admin/settings', ...admin, async (req,res,next) => { try { const allowed=['currency','commission_default','store_name','support_email','allow_seller_registration','maintenance_mode']; const patch=Object.fromEntries(Object.entries(req.body||{}).filter(([k])=>allowed.includes(k))); if(!Object.keys(patch).length)return res.status(400).json({error:'لا توجد إعدادات صالحة.'}); if(patch.commission_default!==undefined&&(!Number.isFinite(Number(patch.commission_default))||patch.commission_default<0||patch.commission_default>100))return res.status(400).json({error:'نسبة العمولة بين ٠ و١٠٠.'}); res.json({settings:await store.setSettings(patch)}); } catch(e){next(e);} });

module.exports=router;
