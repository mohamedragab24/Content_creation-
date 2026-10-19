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

void main() => runApp(const SouqnaBuyerApp());

class SouqnaBuyerApp extends StatelessWidget {
  const SouqnaBuyerApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'سوقنا',
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
    home: const BuyerHome(),
  );
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.image,
  });

  final String id;
  final String name;
  final String category;
  final num price;
  final String image;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
    id: '${json['id'] ?? ''}',
    name: '${json['name'] ?? 'منتج'}',
    category: '${json['category'] ?? 'عام'}',
    price: num.tryParse('${json['price']}') ?? 0,
    image: '${json['image_url'] ?? ''}',
  );
}

const demoProducts = <Product>[
  Product(
    id: 'P-1042',
    name: 'سماعات لاسلكية',
    category: 'إلكترونيات',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=640&q=85',
  ),
  Product(
    id: 'P-1041',
    name: 'ساعة ذكية رياضية',
    category: 'إلكترونيات',
    price: 1799,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=640&q=85',
  ),
  Product(
    id: 'P-1039',
    name: 'حذاء رياضي',
    category: 'أزياء',
    price: 999,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=640&q=85',
  ),
  Product(
    id: 'P-1040',
    name: 'حقيبة يومية',
    category: 'أزياء',
    price: 799,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=640&q=85',
  ),
];

class BuyerHome extends StatefulWidget {
  const BuyerHome({super.key});

  @override
  State<BuyerHome> createState() => _BuyerHomeState();
}

class _BuyerHomeState extends State<BuyerHome> {
  final categories = const ['الكل', 'إلكترونيات', 'أزياء', 'المنزل', 'الجمال'];
  final cart = <String, int>{};
  List<Product> products = demoProducts;
  int selectedTab = 0;
  String selectedCategory = 'الكل';
  String search = '';
  String? token;
  String? userName;

  List<Product> get visibleProducts => products
      .where(
        (product) =>
            (selectedCategory == 'الكل' ||
                product.category == selectedCategory) &&
            (search.isEmpty || product.name.contains(search)),
      )
      .toList();

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    try {
      final response = await http.get(Uri.parse('$apiBase/products'));
      if (response.statusCode != 200) return;
      final rows = (jsonDecode(response.body)['items'] as List)
          .cast<Map<String, dynamic>>();
      if (mounted && rows.isNotEmpty) {
        setState(() => products = rows.map(Product.fromJson).toList());
      }
    } catch (_) {
      // Keep the local preview catalogue when the API is not configured.
    }
  }

  void _addToCart(Product product) {
    setState(
      () => cart.update(
        product.id,
        (quantity) => quantity + 1,
        ifAbsent: () => 1,
      ),
    );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تمت إضافة ${product.name} إلى السلة'),
        duration: const Duration(seconds: 1),
        backgroundColor: navy,
      ),
    );
  }

  Future<void> _showLogin() async {
    final email = TextEditingController();
    final password = TextEditingController();
    final success = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('تسجيل الدخول'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'البريد الإلكتروني',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: password,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'كلمة المرور',
                border: OutlineInputBorder(),
              ),
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
                    data['user']?['role'] != 'user') {
                  throw Exception('تحقق من بيانات حساب المستخدم.');
                }
                token = data['token'];
                userName = data['user']['name'];
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                }
              } catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('تعذر تسجيل الدخول: $error')),
                  );
                }
              }
            },
            child: const Text('دخول'),
          ),
        ],
      ),
    );
    if (success == true && mounted) setState(() {});
  }

  Future<void> _checkout() async {
    if (cart.isEmpty) return;
    if (token == null) {
      await _showLogin();
      if (token == null) return;
    }
    try {
      final items = cart.entries
          .map((entry) => {'product_id': entry.key, 'quantity': entry.value})
          .toList();
      final response = await http.post(
        Uri.parse('$apiBase/orders'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'items': items}),
      );
      if (response.statusCode >= 300) {
        final body = jsonDecode(response.body);
        throw Exception(body['error'] ?? 'تعذر إنشاء الطلب.');
      }
      setState(cart.clear);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إنشاء الطلب التجريبي بنجاح')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('تعذر إتمام الطلب: $error')));
      }
    }
  }

  void _showProduct(Product product) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 4, 18, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: Image.network(
                    product.image,
                    height: 230,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox(
                      height: 180,
                      child: ColoredBox(
                        color: Color(0xFFF0F3F5),
                        child: Icon(
                          Icons.image_outlined,
                          size: 48,
                          color: teal,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 15),
                Text(
                  product.name,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: navy,
                  ),
                ),
                Text(product.category, style: const TextStyle(color: teal)),
                const SizedBox(height: 9),
                const Row(
                  children: [
                    Icon(
                      Icons.star_rounded,
                      color: Color(0xFFFFB547),
                      size: 19,
                    ),
                    Text(' ٤٫٨  ·  تقييمات المشترين'),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '${product.price.toStringAsFixed(0)} ج.م',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: navy,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'منتج مختار من سوقنا. تتوفر تفاصيل إضافية لدى البائع.',
                  style: TextStyle(color: Color(0xFF71869A)),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(sheetContext);
                    _addToCart(product);
                  },
                  icon: const Icon(Icons.shopping_cart_outlined),
                  label: const Text('أضف إلى السلة'),
                  style: FilledButton.styleFrom(
                    backgroundColor: teal,
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final itemCount = cart.values.fold<int>(
      0,
      (sum, quantity) => sum + quantity,
    );
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: const Row(
          children: [
            Icon(Icons.shopping_bag_rounded, color: teal),
            SizedBox(width: 8),
            Text(
              'سوقنا',
              style: TextStyle(color: navy, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => selectedTab == 3 ? _showProfile() : _showLogin(),
            icon: Icon(
              userName == null
                  ? Icons.person_outline
                  : Icons.account_circle_outlined,
              color: navy,
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _body(itemCount),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedTab,
        onDestinationSelected: (index) {
          setState(() => selectedTab = index);
          if (index == 3 && userName == null) _showLogin();
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            label: 'الرئيسية',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            label: 'الأقسام',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_cart_outlined),
            label: 'السلة',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'حسابي',
          ),
        ],
      ),
    );
  }

  Widget _body(int itemCount) {
    if (selectedTab == 2) return _cartPage();
    if (selectedTab == 3) return _profilePage();
    return RefreshIndicator(
      onRefresh: _loadProducts,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                onChanged: (value) => setState(() => search = value),
                decoration: InputDecoration(
                  hintText: 'ابحث عن منتجك',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  const Icon(Icons.location_on_outlined, color: teal, size: 18),
                  const SizedBox(width: 4),
                  Text(
                    'التوصيل إلى القاهرة',
                    style: TextStyle(color: navy, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 90,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _category('إلكترونيات', Icons.devices),
                  _category('أزياء', Icons.checkroom_outlined),
                  _category('المنزل', Icons.chair_outlined),
                  _category('الجمال', Icons.spa_outlined),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
              child: Container(
                height: 150,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF087E77), Color(0xFF17B5A5)],
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'عروض الأسبوع',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'اكتشف اختياراتنا المميزة',
                            style: TextStyle(color: Colors.white70),
                          ),
                          const SizedBox(height: 10),
                          FilledButton.tonal(
                            onPressed: () =>
                                setState(() => selectedCategory = 'الكل'),
                            style: FilledButton.styleFrom(
                              backgroundColor: coral,
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('تسوق الآن'),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.local_offer_rounded,
                      size: 68,
                      color: Colors.white70,
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 5, 16, 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'الأكثر مبيعًا',
                    style: TextStyle(
                      color: navy,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    '$itemCount منتج في السلة',
                    style: const TextStyle(color: teal, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 43,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: categories
                    .map(
                      (category) => Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          label: Text(category),
                          selected: selectedCategory == category,
                          selectedColor: const Color(0xFFDDF4F0),
                          onSelected: (_) =>
                              setState(() => selectedCategory = category),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(14),
            sliver: SliverGrid.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: .72,
              ),
              itemCount: visibleProducts.length,
              itemBuilder: (context, index) =>
                  _productCard(visibleProducts[index]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _category(String title, IconData icon) => InkWell(
    onTap: () => setState(() => selectedCategory = title),
    child: SizedBox(
      width: 83,
      child: Column(
        children: [
          Container(
            width: 57,
            height: 57,
            margin: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F6F3),
              borderRadius: BorderRadius.circular(17),
            ),
            child: Icon(icon, color: teal),
          ),
          Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              color: navy,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    ),
  );

  Widget _productCard(Product product) => InkWell(
    onTap: () => _showProduct(product),
    borderRadius: BorderRadius.circular(16),
    child: Card(
      color: Colors.white,
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE8EDF1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  product.image,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const ColoredBox(
                    color: Color(0xFFF0F3F5),
                    child: Icon(Icons.image_outlined, size: 42, color: teal),
                  ),
                ),
                Positioned(
                  top: 7,
                  left: 7,
                  child: CircleAvatar(
                    radius: 16,
                    backgroundColor: Colors.white,
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      onPressed: () => ScaffoldMessenger.of(context)
                          .showSnackBar(
                            const SnackBar(
                              content: Text('تمت الإضافة للمفضلة'),
                            ),
                          ),
                      icon: const Icon(
                        Icons.favorite_border,
                        size: 17,
                        color: coral,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 2),
            child: Text(
              product.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: navy,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 1, 10, 5),
            child: Text(
              '${product.price.toStringAsFixed(0)} ج.م',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
            child: FilledButton.tonal(
              onPressed: () => _addToCart(product),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFE5F6F3),
                foregroundColor: teal,
                minimumSize: const Size.fromHeight(34),
              ),
              child: const Text(
                'أضف إلى السلة',
                style: TextStyle(fontSize: 11),
              ),
            ),
          ),
        ],
      ),
    ),
  );

  Widget _cartPage() {
    final items = products
        .where((product) => cart.containsKey(product.id))
        .toList();
    final total = items.fold<num>(
      0,
      (sum, product) => sum + product.price * (cart[product.id] ?? 0),
    );
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'سلة التسوق (${cart.values.fold<int>(0, (sum, quantity) => sum + quantity)})',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: navy,
            ),
          ),
          const SizedBox(height: 14),
          if (items.isEmpty)
            const Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.shopping_cart_outlined, size: 54, color: teal),
                    SizedBox(height: 12),
                    Text('سلتك فارغة'),
                  ],
                ),
              ),
            ),
          if (items.isNotEmpty)
            Expanded(
              child: ListView(
                children: items
                    .map(
                      (product) => ListTile(
                        leading: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            product.image,
                            width: 54,
                            height: 54,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                const Icon(Icons.image),
                          ),
                        ),
                        title: Text(product.name),
                        subtitle: Text('${product.price} ج.م'),
                        trailing: Text('× ${cart[product.id]}'),
                      ),
                    )
                    .toList(),
              ),
            ),
          if (items.isNotEmpty)
            Card(
              color: Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'الإجمالي',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${total.toStringAsFixed(0)} ج.م',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _checkout,
                      style: FilledButton.styleFrom(
                        backgroundColor: teal,
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: const Text('إتمام الطلب تجريبيًا'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _profilePage() => Center(
    child: Card(
      margin: const EdgeInsets.all(20),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 35,
              backgroundColor: const Color(0xFFE5F6F3),
              child: Icon(
                userName == null ? Icons.person_outline : Icons.person,
                color: teal,
                size: 32,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              userName ?? 'حساب المستخدم',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              userName == null
                  ? 'سجّل الدخول لمتابعة طلباتك.'
                  : 'حساب سوقنا للمستخدمين',
            ),
            const SizedBox(height: 16),
            if (userName == null)
              FilledButton(
                onPressed: _showLogin,
                child: const Text('تسجيل الدخول'),
              )
            else
              OutlinedButton(
                onPressed: () => setState(() {
                  token = null;
                  userName = null;
                }),
                child: const Text('تسجيل الخروج'),
              ),
          ],
        ),
      ),
    ),
  );
}
