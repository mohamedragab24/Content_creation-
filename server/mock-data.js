const bcrypt = require('bcryptjs');

const users = [
  { id: 'admin-1', name: 'أحمد محمد', email: 'admin@souqna.demo', password_hash: bcrypt.hashSync('SouqnaDemo1!', 8), role: 'admin', status: 'active', created_at: '2026-02-03' },
  { id: 'seller-1', name: 'محمد علي', email: 'seller@souqna.demo', password_hash: bcrypt.hashSync('SouqnaDemo1!', 8), role: 'seller', status: 'active', created_at: '2026-03-12', store_name: 'متجر التقنية' },
  { id: 'user-1', name: 'سارة أحمد', email: 'user@souqna.demo', password_hash: bcrypt.hashSync('SouqnaDemo1!', 8), role: 'user', status: 'active', created_at: '2026-04-01' },
];
const products = [
  { id: 'P-1042', seller_id: 'seller-1', name: 'سماعات لاسلكية', category: 'إلكترونيات', price: 1299, stock: 24, status: 'active', image_url: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=640&q=85', created_at: '2026-04-13' },
  { id: 'P-1041', seller_id: 'seller-1', name: 'ساعة ذكية رياضية', category: 'إلكترونيات', price: 1799, stock: 12, status: 'active', image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=640&q=85', created_at: '2026-04-12' },
  { id: 'P-1040', seller_id: 'seller-2', name: 'حقيبة يومية', category: 'أزياء', price: 799, stock: 6, status: 'review', image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=640&q=85', created_at: '2026-04-12' },
  { id: 'P-1039', seller_id: 'seller-2', name: 'حذاء رياضي', category: 'أزياء', price: 999, stock: 31, status: 'active', image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=640&q=85', created_at: '2026-04-11' },
  { id: 'P-1038', seller_id: 'seller-1', name: 'مصباح مكتبي', category: 'المنزل', price: 549, stock: 0, status: 'paused', image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=640&q=85', created_at: '2026-04-10' },
];
const orders = [
  { id: 'ORD-10421', customer_id: 'user-1', customer_name: 'سارة أحمد', total: 1299, status: 'completed', created_at: '2026-04-15T09:30:00Z', seller_id: 'seller-1' },
  { id: 'ORD-10420', customer_id: 'user-2', customer_name: 'محمد علي', total: 849, status: 'processing', created_at: '2026-04-15T08:15:00Z', seller_id: 'seller-1' },
  { id: 'ORD-10419', customer_id: 'user-3', customer_name: 'نورهان خالد', total: 2499, status: 'completed', created_at: '2026-04-14T11:30:00Z', seller_id: 'seller-2' },
  { id: 'ORD-10418', customer_id: 'user-1', customer_name: 'سارة أحمد', total: 459, status: 'new', created_at: '2026-04-14T10:10:00Z', seller_id: 'seller-1' },
  { id: 'ORD-10417', customer_id: 'user-4', customer_name: 'عمر حسن', total: 1170, status: 'cancelled', created_at: '2026-04-13T13:00:00Z', seller_id: 'seller-2' },
];
const vendors = [
  { id: 'seller-1', name: 'محمد علي', store_name: 'متجر التقنية', email: 'seller@souqna.demo', status: 'active', commission_rate: 10, sales: 12450, created_at: '2026-03-12' },
  { id: 'seller-2', name: 'نورهان خالد', store_name: 'بيت الأناقة', email: 'nour@example.demo', status: 'pending', commission_rate: 12, sales: 8350, created_at: '2026-04-14' },
  { id: 'seller-3', name: 'عمر حسن', store_name: 'لمسة منزل', email: 'omar@example.demo', status: 'active', commission_rate: 8, sales: 6900, created_at: '2026-04-10' },
];
const customers = [
  { id: 'user-1', name: 'سارة أحمد', email: 'sara@example.demo', status: 'active', orders_count: 12, total_spent: 8450, created_at: '2026-04-01' },
  { id: 'user-2', name: 'محمد علي', email: 'mohamed@example.demo', status: 'active', orders_count: 8, total_spent: 5190, created_at: '2026-03-28' },
  { id: 'user-3', name: 'نورهان خالد', email: 'nour@example.demo', status: 'active', orders_count: 4, total_spent: 2399, created_at: '2026-04-04' },
  { id: 'user-4', name: 'عمر حسن', email: 'omar@example.demo', status: 'blocked', orders_count: 2, total_spent: 1170, created_at: '2026-03-21' },
];
const offers = [
  { id: 'OFF-07', title: 'خصم نهاية الأسبوع', code: 'WEEKEND15', discount_percent: 15, status: 'active', ends_at: '2026-04-30' },
  { id: 'OFF-06', title: 'تخفيضات المنزل', code: 'HOME10', discount_percent: 10, status: 'scheduled', ends_at: '2026-05-10' },
];
const notifications = [
  { id: 'NTF-22', title: 'عروض نهاية الأسبوع', body: 'خصم يصل إلى ١٥٪ على منتجات مختارة', audience: 'all', status: 'sent', created_at: '2026-04-14' },
  { id: 'NTF-21', title: 'تذكير بإكمال الطلب', body: 'لديك منتجات بانتظار إتمام الشراء', audience: 'customers', status: 'draft', created_at: '2026-04-12' },
];
const commissions = vendors.map(v => ({ seller_id:v.id,store_name:v.store_name,commission_rate:v.commission_rate,sales:v.sales,commission:Math.round(v.sales*v.commission_rate)/100 }));
const reports = [
  { period:'2026-04', orders:1284, sales:248500 }, { period:'2026-03', orders:1140, sales:221300 },
  { period:'2026-02', orders:986, sales:194200 }, { period:'2026-01', orders:902, sales:176900 },
];
const permissions = [
  { role:'admin', accounts:4, access:'كامل إدارة المتجر والتقارير والإعدادات' },
  { role:'seller', accounts:348, access:'متجره ومنتجاته وطلباته فقط' },
  { role:'user', accounts:8620, access:'التصفح وسلة المشتريات وطلباته' },
];
const settings = { currency: 'EGP', commission_default: 10, store_name: 'سوقنا', support_email: 'support@souqna.example', allow_seller_registration: true, maintenance_mode: false };
const sales = [
  { day: 'السبت', value: 28500 }, { day: 'الأحد', value: 19000 }, { day: 'الاثنين', value: 25800 },
  { day: 'الثلاثاء', value: 16500 }, { day: 'الأربعاء', value: 23700 }, { day: 'الخميس', value: 19800 }, { day: 'الجمعة', value: 33200 },
];
module.exports = { users, products, orders, vendors, sellers:vendors, customers, offers, notifications, commissions, reports, permissions, settings, sales };
