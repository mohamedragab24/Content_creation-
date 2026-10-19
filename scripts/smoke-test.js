const base = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api';
const assert = (condition, message) => { if (!condition) throw new Error(message); console.log(`✓ ${message}`); };
async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(body ? { 'Content-Type':'application/json' } : {}), ...(token ? { Authorization:`Bearer ${token}` } : {}) }, ...(body ? { body:JSON.stringify(body) } : {}) });
  let data = {}; try { data = await response.json(); } catch {}
  return { status:response.status, data };
}
async function login(email) {
  const {status,data}=await request('/auth/login',{method:'POST',body:{email,password:'SouqnaDemo1!'}});
  assert(status===200 && !!data.token,`تسجيل الدخول التجريبي: ${email}`); return data.token;
}
(async()=>{
  const health=await fetch(base.replace(/\/api$/,'/health'));
  assert(health.ok,'فحص جاهزية الخدمة');
  const admin=await login('admin@souqna.demo');
  const seller=await login('seller@souqna.demo');
  const user=await login('user@souqna.demo');
  const overview=await request('/admin/overview',{token:admin});
  assert(overview.status===200 && overview.data.revenue>0,'مؤشرات لوحة الإدارة');
  for(const section of ['orders','products','sellers','customers','commissions','reports','offers','notifications','permissions']){
    const result=await request(`/admin/${section}`,{token:admin});
    assert(result.status===200 && Array.isArray(result.data.items),`قسم الإدارة: ${section}`);
  }
  const settings=await request('/admin/settings',{token:admin});
  assert(settings.status===200 && !!settings.data.settings,'إعدادات الإدارة');
  const sellerOrders=await request('/seller/orders',{token:seller});
  assert(sellerOrders.status===200 && sellerOrders.data.items.every(x=>x.seller_id==='seller-1'),'حصر طلبات البائع على حسابه');
  const sellerProducts=await request('/seller/products',{token:seller});
  assert(sellerProducts.status===200 && sellerProducts.data.items.every(x=>x.seller_id==='seller-1'),'حصر منتجات البائع على حسابه');
  assert((await request('/admin/overview',{token:seller})).status===403,'رفض البائع عن الإدارة');
  assert((await request('/admin/overview',{token:user})).status===403,'رفض المستخدم عن الإدارة');
  assert((await request('/seller/overview',{token:user})).status===403,'رفض المستخدم عن صلاحيات البائع');
  assert((await request('/seller/products',{token:seller,method:'POST',body:{name:'محاولة تعديل',price:1,stock:1}})).status===201,'السماح للبائع بإضافة منتجه ضمن متجره');
  assert((await request('/seller/products/P-1040',{token:seller,method:'PATCH',body:{price:1}})).status===404,'رفض تعديل منتج يخص بائعًا آخر');
  const productRows=await request('/products');
  assert(productRows.status===200 && productRows.data.items.length>0,'كتالوج المنتجات العام');
  const order=await request('/orders',{token:user,method:'POST',body:{items:[{product_id:productRows.data.items[0].id,quantity:1}]}});
  assert(order.status===201 && order.data.order.status==='new','إنشاء طلب تجريبي للمستخدم');
  assert((await request('/orders',{token:user,method:'POST',body:{items:[{product_id:'P-1042',quantity:-1}]}})).status===400,'رفض كمية طلب غير صالحة');
  const newSeller=await request('/auth/register',{method:'POST',body:{name:'بائع جديد',email:`seller-${Date.now()}@souqna.demo`,password:'StrongDemo123!',role:'seller',store_name:'متجر تجريبي'}});
  assert(newSeller.status===201,'تسجيل بائع جديد بانتظار المراجعة');
  assert((await request('/seller/overview',{token:newSeller.data.token})).status===403,'منع البائع غير المعتمد من الوصول');
  console.log('اكتملت جميع اختبارات API التجريبية.');
})().catch((error)=>{console.error(error.message);process.exit(1);});
