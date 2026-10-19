# تطبيق سوقنا للمستخدم

تطبيق Flutter/Dart عربي RTL للمشتري. يتصل بواجهة API عبر `API_BASE_URL`، ويعرض الكتالوج والبحث والأقسام والسلة وإتمام طلب تجريبي. يتطلب تسجيل دخول للمستخدم قبل إرسال الطلب.

```sh
flutter create --platforms=android,ios .
flutter pub get
flutter run --dart-define=API_BASE_URL=https://your-api.example.com/api
```

الحساب التجريبي في وضع demo: `user@souqna.demo` وكلمة المرور `SouqnaDemo1!`. غيّر بيانات المعاينة قبل الإنتاج. يلزم ضبط عنوان API مناسب للمحاكي أو الجهاز الفعلي.
