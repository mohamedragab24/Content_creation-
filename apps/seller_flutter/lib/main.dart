import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:http/http.dart' as http;

const apiBase = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api',
);
const navy = Color(0xFF102A43);
const teal = Color(0xFF0F9D91);
const coral = Color(0xFFF27558);

void main() => runApp(const SouqnaSellerApp());

class SouqnaSellerApp extends StatelessWidget {
  const SouqnaSellerApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'سوقنا للبائع',
    debugShowCheckedModeBanner: false,
    locale: const Locale('ar'),
    supportedLocales: const [Locale('ar'), Locale('en')],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: teal),
      scaffoldBackgroundColor: const Color(0xFFF6F8FA),
      fontFamily: 'Arial',
      useMaterial3: true,
    ),
    home: const SellerHome(),
  );
}

const demoSellerProducts = <Map<String, dynamic>>[
  {
    'id': 'P-1042',
    'name': 'سماعات لاسلكية',
    'category': 'إلكترونيات',
    'price': 1299,
    'stock': 24,
    'status': 'active',
  },
  {
    'id': 'P-1041',
    'name': 'ساعة ذكية رياضية',
    'category': 'إلكترونيات',
    'price': 1799,
    'stock': 12,
    'status': 'active',
  },
  {
    'id': 'P-1038',
    'name': 'مصباح مكتبي',
    'category': 'المنزل',
    'price': 549,
    'stock': 0,
    'status': 'paused',
  },
];
const demoSellerOrders = <Map<String, dynamic>>[
  {
    'id': 'ORD-10421',
    'customer_name': 'سارة أحمد',
    'total': 1299,
    'status': 'completed',
  },
  {
    'id': 'ORD-10420',
    'customer_name': 'محمد علي',
    'total': 849,
    'status': 'processing',
  },
  {
    'id': 'ORD-10418',
    'customer_name': 'سارة أحمد',
    'total': 459,
    'status': 'new',
  },
];

class SellerHome extends StatefulWidget {
  const SellerHome({super.key});

  @override
  State<SellerHome> createState() => _SellerHomeState();
}

class _SellerHomeState extends State<SellerHome> {
  Map<String, dynamic> overview = {
    'sales_today': 12450,
    'growth': 18,
    'products': 3,
    'orders': 3,
    'new_orders': 1,
    'processing': 1,
  };
  List<Map<String, dynamic>> products = List.of(demoSellerProducts);
  List<Map<String, dynamic>> orders = List.of(demoSellerOrders);
  String? token;
  String? name;
  int tab = 0;
  bool loading = false;

  Future<void> _load() async {
    if (token == null) return;
    setState(() => loading = true);
    try {
      final headers = {'Authorization': 'Bearer $token'};
      final overviewResponse = await http.get(
        Uri.parse('$apiBase/seller/overview'),
        headers: headers,
      );
      if (overviewResponse.statusCode == 200) {
        overview = Map<String, dynamic>.from(jsonDecode(overviewResponse.body));
        orders = (overview['recent_orders'] as List? ?? [])
            .map((row) => Map<String, dynamic>.from(row))
            .toList();
      }
      final productsResponse = await http.get(
        Uri.parse('$apiBase/seller/products'),
        headers: headers,
      );
      if (productsResponse.statusCode == 200) {
        products = (jsonDecode(productsResponse.body)['items'] as List)
            .map((row) => Map<String, dynamic>.from(row))
            .toList();
      }
    } catch (_) {
      // Keep the sample cards in preview if the API is not configured.
    }
    if (mounted) setState(() => loading = false);
  }

  Future<bool> _login() async {
    final email = TextEditingController(text: 'seller@souqna.demo');
    final password = TextEditingController(text: 'SouqnaDemo1!');
    final loggedIn = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('دخول البائع'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'البريد الإلكتروني'),
            ),
            TextField(
              controller: password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'كلمة المرور'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () async {
              try {
                final response = await http.post(
                  Uri.parse('$apiBase/auth/login'),
                  headers: {'Content-Type': 'application/json'},
                  body: jsonEncode({
                    'email': email.text,
                    'password': password.text,
                  }),
                );
                final data = jsonDecode(response.body);
                if (response.statusCode != 200 ||
                    data['user']?['role'] != 'seller') {
                  throw Exception('تحقق من بيانات حساب البائع.');
                }
                if (data['user']?['status'] != 'active') {
                  throw Exception('حساب البائع بانتظار اعتماد الإدارة.');
                }
                token = data['token'];
                name = data['user']['name'];
                if (dialogContext.mounted) Navigator.pop(dialogContext, true);
              } catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('تعذر الدخول: $error')),
                  );
                }
              }
            },
            child: const Text('دخول'),
          ),
        ],
      ),
    );
    if (loggedIn == true) {
      await _load();
      if (mounted) setState(() {});
      return true;
    }
    return false;
  }

  Future<void> _addProduct() async {
    if (token == null && !await _login()) return;
    final productName = TextEditingController();
    final category = TextEditingController(text: 'إلكترونيات');
    final price = TextEditingController();
    final stock = TextEditingController(text: '1');
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('إضافة منتج'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: productName,
                decoration: const InputDecoration(labelText: 'اسم المنتج'),
              ),
              TextField(
                controller: category,
                decoration: const InputDecoration(labelText: 'القسم'),
              ),
              TextField(
                controller: price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'السعر'),
              ),
              TextField(
                controller: stock,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'المخزون'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () async {
              try {
                final response = await http.post(
                  Uri.parse('$apiBase/seller/products'),
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer $token',
                  },
                  body: jsonEncode({
                    'name': productName.text,
                    'category': category.text,
                    'price': num.tryParse(price.text) ?? 0,
                    'stock': int.tryParse(stock.text) ?? 0,
                  }),
                );
                if (response.statusCode >= 300) {
                  final data = jsonDecode(response.body);
                  throw Exception(data['error'] ?? 'تعذر حفظ المنتج.');
                }
                if (dialogContext.mounted) Navigator.pop(dialogContext);
                await _load();
              } catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text('$error')));
                }
              }
            },
            child: const Text('حفظ للمراجعة'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.white,
      title: const Row(
        children: [
          Icon(Icons.storefront_outlined, color: teal),
          SizedBox(width: 8),
          Text(
            'سوقنا للبائع',
            style: TextStyle(color: navy, fontWeight: FontWeight.w800),
          ),
        ],
      ),
      actions: [
        IconButton(
          onPressed: token == null ? _login : () => setState(() => tab = 3),
          icon: const Icon(Icons.person_outline, color: navy),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: _load,
      child: tab == 0
          ? _dashboard()
          : tab == 1
          ? _ordersPage()
          : tab == 2
          ? _productsPage()
          : _profilePage(),
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: tab,
      onDestinationSelected: (value) {
        setState(() => tab = value);
        if (value == 3 && token == null) _login();
      },
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          label: 'الرئيسية',
        ),
        NavigationDestination(
          icon: Icon(Icons.receipt_long_outlined),
          label: 'الطلبات',
        ),
        NavigationDestination(
          icon: Icon(Icons.inventory_2_outlined),
          label: 'المنتجات',
        ),
        NavigationDestination(icon: Icon(Icons.person_outline), label: 'حسابي'),
      ],
    ),
  );

  Widget _dashboard() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'لوحة البائع',
                style: TextStyle(
                  color: navy,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                'أهلًا، ${name ?? 'بائع سوقنا'}',
                style: const TextStyle(color: Color(0xFF71869A)),
              ),
            ],
          ),
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      const SizedBox(height: 15),
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(19),
          gradient: const LinearGradient(
            colors: [Color(0xFF0F9D91), Color(0xFF087E77)],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('مبيعات اليوم', style: TextStyle(color: Colors.white70)),
            const SizedBox(height: 7),
            Text(
              '${overview['sales_today'] ?? 0} ج.م',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 30,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              '↗ نمو ${overview['growth'] ?? 0}%',
              style: const TextStyle(color: Colors.white),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      Row(
        children: [
          Expanded(
            child: _stat(
              'طلبات جديدة',
              '${overview['new_orders'] ?? 0}',
              Icons.fiber_new_outlined,
              coral,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _stat(
              'قيد التجهيز',
              '${overview['processing'] ?? 0}',
              Icons.inventory_outlined,
              teal,
            ),
          ),
        ],
      ),
      const SizedBox(height: 10),
      Row(
        children: [
          Expanded(
            child: _stat(
              'المنتجات',
              '${products.length}',
              Icons.category_outlined,
              navy,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _stat(
              'إجمالي الطلبات',
              '${overview['orders'] ?? 0}',
              Icons.receipt_long_outlined,
              teal,
            ),
          ),
        ],
      ),
      const SizedBox(height: 20),
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'أحدث الطلبات',
            style: TextStyle(
              fontSize: 17,
              color: navy,
              fontWeight: FontWeight.w800,
            ),
          ),
          TextButton(
            onPressed: () => setState(() => tab = 1),
            child: const Text('عرض الكل'),
          ),
        ],
      ),
      if (orders.isEmpty)
        const Card(
          child: Padding(
            padding: EdgeInsets.all(18),
            child: Text('ستظهر طلبات متجرك هنا.'),
          ),
        ),
      ...orders.take(4).map(_orderTile),
      if (loading)
        const Center(
          child: Padding(
            padding: EdgeInsets.all(12),
            child: CircularProgressIndicator(),
          ),
        ),
    ],
  );

  Widget _stat(String title, String value, IconData icon, Color color) => Card(
    color: Colors.white,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(15),
      side: const BorderSide(color: Color(0xFFE8EDF1)),
    ),
    child: Padding(
      padding: const EdgeInsets.all(15),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: color.withOpacity(.1),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF71869A),
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: navy,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );

  Widget _orderTile(Map<String, dynamic> order) => Card(
    color: Colors.white,
    elevation: 0,
    child: ListTile(
      leading: const CircleAvatar(
        backgroundColor: Color(0xFFE5F6F3),
        child: Icon(Icons.receipt_long, color: teal),
      ),
      title: Text(
        '#${order['id'] ?? ''}',
        style: const TextStyle(fontWeight: FontWeight.bold, color: navy),
      ),
      subtitle: Text(
        '${order['customer_name'] ?? 'عميل'} · ${order['status'] ?? 'جديد'}',
      ),
      trailing: Text(
        '${order['total'] ?? 0} ج.م',
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
    ),
  );

  Widget _ordersPage() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      const Text(
        'الطلبات',
        style: TextStyle(
          color: navy,
          fontSize: 22,
          fontWeight: FontWeight.w800,
        ),
      ),
      const SizedBox(height: 12),
      if (orders.isEmpty)
        const Card(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Text('لا توجد طلبات حتى الآن.'),
          ),
        ),
      ...orders.map(_orderTile),
    ],
  );

  Widget _productsPage() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'المنتجات',
            style: TextStyle(
              color: navy,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          FilledButton.icon(
            onPressed: _addProduct,
            icon: const Icon(Icons.add),
            label: const Text('إضافة'),
          ),
        ],
      ),
      const SizedBox(height: 10),
      if (products.isEmpty)
        const Card(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Text('ابدأ بإضافة منتجات متجرك.'),
          ),
        ),
      ...products.map(
        (product) => Card(
          color: Colors.white,
          elevation: 0,
          child: ListTile(
            leading: const CircleAvatar(
              backgroundColor: Color(0xFFE5F6F3),
              child: Icon(Icons.inventory_2_outlined, color: teal),
            ),
            title: Text(
              '${product['name'] ?? ''}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(
              '${product['category'] ?? 'عام'} · المخزون ${product['stock'] ?? 0} · ${product['status'] ?? '—'}',
            ),
            trailing: Text('${product['price'] ?? 0} ج.م'),
          ),
        ),
      ),
    ],
  );

  Widget _profilePage() => Center(
    child: Card(
      margin: const EdgeInsets.all(20),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(
              radius: 34,
              backgroundColor: Color(0xFFE5F6F3),
              child: Icon(Icons.storefront_outlined, color: teal, size: 32),
            ),
            const SizedBox(height: 12),
            Text(
              name ?? 'حساب البائع',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              token == null
                  ? 'سجّل الدخول لإدارة متجرك.'
                  : 'إدارة منتجاتك وطلبات متجرك.',
            ),
            const SizedBox(height: 16),
            if (token == null)
              FilledButton(onPressed: _login, child: const Text('تسجيل الدخول'))
            else
              OutlinedButton(
                onPressed: () => setState(() {
                  token = null;
                  name = null;
                  tab = 0;
                }),
                child: const Text('تسجيل الخروج'),
              ),
          ],
        ),
      ),
    ),
  );
}
