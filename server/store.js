const { demoMode, query } = require('./db');
const mock = require('./mock-data');

const asUser = ({ password_hash, ...user }) => user;

async function findUserByEmail(email) {
  if (demoMode) return mock.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  const { rows } = await query('SELECT u.*, sp.store_name FROM users u LEFT JOIN seller_profiles sp ON sp.user_id=u.id WHERE lower(u.email)=lower($1) LIMIT 1', [email]);
  return rows[0] || null;
}
async function findUserById(id) {
  if (demoMode) return mock.users.find((u) => u.id === id) || null;
  const { rows } = await query('SELECT u.id,u.name,u.email,u.role,u.status,u.created_at,sp.store_name FROM users u LEFT JOIN seller_profiles sp ON sp.user_id=u.id WHERE u.id=$1', [id]);
  return rows[0] || null;
}
async function createUser({ name, email, passwordHash, role, storeName }) {
  if (demoMode) {
    const user = { id: `${role}-${Date.now()}`, name, email, password_hash: passwordHash, role, status: role === 'seller' ? 'pending' : 'active', created_at: new Date().toISOString(), store_name: storeName };
    mock.users.push(user);
    if (role === 'seller') mock.vendors.push({ ...user, commission_rate: 10, sales: 0 });
    return user;
  }
  const { rows } = await query('INSERT INTO users(name,email,password_hash,role,status) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role,status,created_at', [name, email, passwordHash, role, role === 'seller' ? 'pending' : 'active']);
  const user = rows[0];
  if (role === 'seller') await query('INSERT INTO seller_profiles(user_id,store_name,status) VALUES($1,$2,$3)', [user.id, storeName, 'pending']);
  return user;
}

async function overview() {
  if (demoMode) return {
    revenue: 248500, revenue_change: 12, orders: 1284, orders_change: 8,
    sellers: 348, customers: 8620, products: 1942, pending_orders: 38,
    sales: mock.sales,
    order_status: [{ label: 'مكتمل', value: 847 }, { label: 'قيد التنفيذ', value: 321 }, { label: 'ملغي', value: 116 }],
    recent_orders: mock.orders.slice(0, 5),
  };
  const [{ rows: sums }, { rows: orderCounts }, { rows: users }, { rows: products }, { rows: sales }] = await Promise.all([
    query("SELECT COALESCE(SUM(total),0)::numeric AS revenue, count(*)::int AS orders FROM orders WHERE status <> 'cancelled'"),
    query("SELECT status,count(*)::int AS count FROM orders GROUP BY status"),
    query("SELECT role,count(*)::int AS count FROM users GROUP BY role"),
    query('SELECT count(*)::int AS count FROM products'),
    query("SELECT to_char(date_trunc('day',created_at),'Dy') AS day, sum(total)::numeric AS value FROM orders WHERE created_at >= now()-interval '7 days' GROUP BY 1 ORDER BY min(created_at)")
  ]);
  const statusLabels = { completed: 'مكتمل', processing: 'قيد التنفيذ', new: 'جديد', cancelled: 'ملغي' };
  const orderMap = Object.fromEntries(orderCounts.map((x) => [x.status, x.count]));
  const roleMap = Object.fromEntries(users.map((x) => [x.role, x.count]));
  const { rows: recent } = await query('SELECT o.id,o.total,o.status,o.created_at,u.name AS customer_name FROM orders o JOIN users u ON u.id=o.customer_id ORDER BY o.created_at DESC LIMIT 6');
  return { revenue: Number(sums[0].revenue), orders: sums[0].orders, sellers: roleMap.seller || 0, customers: roleMap.user || 0, products: products[0].count, pending_orders: orderMap.new || 0, sales, order_status: Object.entries(orderMap).map(([status,value]) => ({ label: statusLabels[status] || status, value })), recent_orders: recent };
}

const sectionSql = {
  orders: 'SELECT o.id,o.total,o.status,o.created_at,u.name AS customer_name FROM orders o JOIN users u ON u.id=o.customer_id ORDER BY o.created_at DESC LIMIT 100',
  products: 'SELECT p.id,p.name,p.category,p.price,p.stock,p.status,p.image_url,u.name AS seller_name FROM products p JOIN users u ON u.id=p.seller_id ORDER BY p.created_at DESC LIMIT 100',
  sellers: "SELECT u.id,u.name,u.email,u.status,sp.store_name,sp.commission_rate,COALESCE(sum(o.total),0)::numeric AS sales,u.created_at FROM users u JOIN seller_profiles sp ON sp.user_id=u.id LEFT JOIN order_items oi ON oi.seller_id=u.id LEFT JOIN orders o ON o.id=oi.order_id WHERE u.role='seller' GROUP BY u.id,sp.store_name,sp.commission_rate ORDER BY u.created_at DESC LIMIT 100",
  customers: "SELECT u.id,u.name,u.email,u.status,count(o.id)::int AS orders_count,COALESCE(sum(o.total),0)::numeric AS total_spent,u.created_at FROM users u LEFT JOIN orders o ON o.customer_id=u.id WHERE u.role='user' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100",
  offers: 'SELECT id,title,code,discount_percent,status,ends_at FROM offers ORDER BY ends_at DESC NULLS LAST LIMIT 100',
  notifications: 'SELECT id,title,body,audience,status,created_at FROM notifications ORDER BY created_at DESC LIMIT 100',
  commissions: "SELECT u.id AS seller_id,sp.store_name,sp.commission_rate,COALESCE(sum(oi.quantity*oi.unit_price),0)::numeric AS sales,COALESCE(sum(oi.quantity*oi.unit_price*sp.commission_rate/100),0)::numeric AS commission FROM seller_profiles sp JOIN users u ON u.id=sp.user_id LEFT JOIN order_items oi ON oi.seller_id=u.id GROUP BY u.id,sp.store_name,sp.commission_rate ORDER BY sales DESC LIMIT 100",
  reports: "SELECT to_char(date_trunc('month',created_at),'YYYY-MM') AS period,count(*)::int AS orders,sum(total)::numeric AS sales FROM orders GROUP BY 1 ORDER BY 1 DESC LIMIT 12",
  permissions: "SELECT role,count(*)::int AS accounts FROM users GROUP BY role ORDER BY role",
};
async function listSection(section) {
  if (demoMode) return (mock[section] || []).map((x) => ({ ...x }));
  const sql = sectionSql[section];
  if (!sql) return null;
  const { rows } = await query(sql);
  return rows;
}
async function getProducts({ q = '', category = '' } = {}) {
  if (demoMode) return mock.products.filter((p) => p.status === 'active' && (!q || p.name.includes(q)) && (!category || p.category === category));
  const { rows } = await query("SELECT id,name,category,description,price,stock,image_url,status FROM products WHERE status='active' AND ($1='' OR name ILIKE '%'||$1||'%') AND ($2='' OR category=$2) ORDER BY created_at DESC LIMIT 100", [q, category]);
  return rows;
}
async function sellerOverview(sellerId) {
  if (demoMode) {
    const products = mock.products.filter((p) => p.seller_id === sellerId);
    const orders = mock.orders.filter((o) => o.seller_id === sellerId);
    return { sales_today: 12450, growth: 18, products: products.length, orders: orders.length, new_orders: orders.filter((o) => o.status === 'new').length, processing: orders.filter((o) => o.status === 'processing').length, recent_orders: orders };
  }
  const [{ rows: productRows }, { rows: orderRows }] = await Promise.all([
    query('SELECT id,name,category,price,stock,status FROM products WHERE seller_id=$1 ORDER BY created_at DESC LIMIT 100', [sellerId]),
    query('SELECT DISTINCT o.id,o.total,o.status,o.created_at FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE oi.seller_id=$1 ORDER BY o.created_at DESC LIMIT 20', [sellerId])
  ]);
  return { sales_today: orderRows.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).reduce((s,o) => s + Number(o.total),0), growth: 0, products: productRows.length, orders: orderRows.length, new_orders: orderRows.filter((o) => o.status==='new').length, processing: orderRows.filter((o) => o.status==='processing').length, recent_orders: orderRows };
}
async function sellerProducts(sellerId) {
  if (demoMode) return mock.products.filter((p) => p.seller_id === sellerId);
  const { rows } = await query('SELECT * FROM products WHERE seller_id=$1 ORDER BY created_at DESC', [sellerId]);
  return rows;
}
async function addProduct(sellerId, data) {
  if (demoMode) {
    const product = { id: `P-${Date.now()}`, seller_id: sellerId, ...data, status: 'review', created_at: new Date().toISOString() };
    mock.products.unshift(product);
    return product;
  }
  const { rows } = await query('INSERT INTO products(seller_id,name,category,description,price,stock,image_url,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [sellerId,data.name,data.category,data.description,data.price,data.stock,data.image_url,'review']);
  return rows[0];
}
async function updateProduct(sellerId, productId, patch) {
  if (demoMode) {
    const p = mock.products.find((x) => x.id===productId && x.seller_id===sellerId);
    if (!p) return null;
    for (const k of ['name','category','description','price','stock','image_url']) if (patch[k] !== undefined) p[k] = patch[k];
    return p;
  }
  const fields = ['name','category','description','price','stock','image_url'];
  const allowed = fields.filter((k) => patch[k] !== undefined);
  if (!allowed.length) return null;
  const values = allowed.map((k) => patch[k]);
  const sets = allowed.map((k,i) => `${k}=$${i+3}`).join(',');
  const { rows } = await query(`UPDATE products SET ${sets} WHERE id=$1 AND seller_id=$2 RETURNING *`, [productId,sellerId,...values]);
  return rows[0] || null;
}
async function updateStatus(section, id, status) {
  if (demoMode) {
    const collection = section === 'sellers' ? mock.vendors : mock[section];
    const item = (collection || []).find((x) => x.id === id);
    if (!item) return null;
    item.status = status;
    if (section === 'sellers') { const user = mock.users.find((x) => x.id === id); if (user) user.status = status; }
    return item;
  }
  const table = { orders: 'orders', products: 'products', sellers: 'users', customers: 'users', offers: 'offers', notifications: 'notifications' }[section];
  if (!table) return null;
  const roleClause = section === 'sellers' ? " AND role='seller'" : section === 'customers' ? " AND role='user'" : '';
  const { rows } = await query(`UPDATE ${table} SET status=$1 WHERE id=$2${roleClause} RETURNING id,status`, [status,id]);
  return rows[0] || null;
}
async function createOffer(input) {
  if (demoMode) { const row = { id: `OFF-${Date.now()}`, ...input, status: 'active', ends_at: input.ends_at || '' }; mock.offers.unshift(row); return row; }
  const { rows } = await query('INSERT INTO offers(title,code,discount_percent,status,ends_at) VALUES($1,$2,$3,$4,$5) RETURNING *', [input.title,input.code,input.discount_percent,'active',input.ends_at || null]);
  return rows[0];
}
async function createNotification(input) {
  if (demoMode) { const row = { id: `NTF-${Date.now()}`, ...input, status: 'draft', created_at: new Date().toISOString() }; mock.notifications.unshift(row); return row; }
  const { rows } = await query('INSERT INTO notifications(title,body,audience,status) VALUES($1,$2,$3,$4) RETURNING *', [input.title,input.body,input.audience || 'all','draft']);
  return rows[0];
}
async function getSettings() {
  if (demoMode) return mock.settings;
  const { rows } = await query('SELECT key,value FROM app_settings');
  return Object.fromEntries(rows.map((r) => [r.key,r.value]));
}
async function setSettings(values) {
  if (demoMode) { Object.assign(mock.settings, values); return mock.settings; }
  for (const [key,value] of Object.entries(values)) await query('INSERT INTO app_settings(key,value) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()', [key,JSON.stringify(value)]);
  return getSettings();
}
async function createOrder(customerId, items) {
  if (demoMode) {
    const total = items.reduce((sum,item) => { const p=mock.products.find((x)=>x.id===item.product_id); return sum+(p ? Number(p.price)*Number(item.quantity) : 0); },0);
    if (!total) return null;
    const row = { id:`ORD-${Date.now()}`, customer_id:customerId, customer_name:mock.users.find((u)=>u.id===customerId)?.name||'عميل', total, status:'new', created_at:new Date().toISOString(), seller_id:mock.products.find((p)=>p.id===items[0].product_id)?.seller_id };
    mock.orders.unshift(row); return row;
  }
  const client = await require('./db').pool.connect();
  try {
    await client.query('BEGIN');
    let total = 0; const validated = [];
    for (const item of items) {
      const { rows } = await client.query('SELECT id,seller_id,price,stock,status FROM products WHERE id=$1 FOR UPDATE', [item.product_id]);
      const p = rows[0]; const qty = Number(item.quantity);
      if (!p || p.status !== 'active' || !Number.isInteger(qty) || qty < 1 || p.stock < qty) throw new Error('المنتج أو الكمية غير متاحة.');
      total += Number(p.price)*qty; validated.push({ ...p, qty });
    }
    const { rows: orderRows } = await client.query("INSERT INTO orders(customer_id,total,status) VALUES($1,$2,'new') RETURNING *", [customerId,total]);
    for (const p of validated) {
      await client.query('INSERT INTO order_items(order_id,product_id,seller_id,quantity,unit_price) VALUES($1,$2,$3,$4,$5)', [orderRows[0].id,p.id,p.seller_id,p.qty,p.price]);
      await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [p.qty,p.id]);
    }
    await client.query('COMMIT'); return orderRows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function listCustomerOrders(customerId) {
  if (demoMode) return mock.orders.filter((o)=>o.customer_id===customerId);
  const { rows } = await query('SELECT id,total,status,created_at FROM orders WHERE customer_id=$1 ORDER BY created_at DESC', [customerId]); return rows;
}

async function listSellerOrders(sellerId) {
  if (demoMode) return mock.orders.filter((o) => o.seller_id === sellerId);
  const { rows } = await query('SELECT DISTINCT o.id,o.total,o.status,o.created_at,u.name AS customer_name FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN users u ON u.id=o.customer_id WHERE oi.seller_id=$1 ORDER BY o.created_at DESC LIMIT 100', [sellerId]);
  return rows;
}

module.exports = { demoMode, findUserByEmail, findUserById, createUser, overview, listSection, getProducts, sellerOverview, sellerProducts, listSellerOrders, addProduct, updateProduct, updateStatus, createOffer, createNotification, getSettings, setSettings, createOrder, listCustomerOrders, asUser };
