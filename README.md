# سوقنا — تطبيقان ولوحة تحكم وواجهة API

مشروع أولي لسوق إلكتروني عربي. يتضمن تطبيق المشتري وتطبيق البائع بـFlutter/Dart، ولوحة تحكم ويب عربية بـNode.js/Express، وواجهة API مركزية بأدوار منفصلة، ومخطط PostgreSQL. عند غياب `DATABASE_URL` تعمل لوحة المعاينة ببيانات demo في الذاكرة فقط.

## محتويات ZIP

- `apps/user_flutter/`: مصدر تطبيق المشتري.
- `apps/seller_flutter/`: مصدر تطبيق البائع.
- `server/`: Express API والمصادقة والتخزين التجريبي/قاعدة البيانات.
- `public/`: لوحة الإدارة العربية RTL.
- `database/schema.sql`: بنية PostgreSQL.
- `api/index.js` و`vercel.json`: مدخل نشر Vercel.

## معاينة لوحة الإدارة محليًا

1. استخدم Node.js 20 أو أحدث.
2. انسخ `.env.example` إلى `.env`، ثم اضبط `JWT_SECRET` و`DATABASE_URL` للإنتاج.
3. نفّذ `npm install` ثم `npm start`.
4. افتح `http://localhost:3000`.
5. في وضع demo المحلي، بيانات الدخول هي `admin@souqna.demo` وكلمة المرور `SouqnaDemo1!`.

حسابات المعاينة الأخرى: `seller@souqna.demo` و`user@souqna.demo`، وكلمة المرور نفسها. لا تستخدم كلمات مرور المعاينة في الإنتاج. شاشة الإدارة تتطلب دور `admin`؛ التطبيق البائع يتطلب `seller`؛ وواجهات الطلبات للمشتري تتطلب `user`. التسجيل العام لا يسمح بإنشاء مسؤول.

## قاعدة البيانات والاستضافة

أنشئ PostgreSQL وشغّل `psql "$DATABASE_URL" -f database/schema.sql`. بعد ذلك `npm run seed` ينشئ حسابات معاينة ينبغي تغييرها قبل الإنتاج. اضبط `DATABASE_URL` و`JWT_SECRET` (32 حرفًا أو أكثر) في متغيرات البيئة على Vercel أو خادم Node.js. لا تعمل ذاكرة demo في `NODE_ENV=production` عمدًا. استضافة Vercel تحتاج خدمة PostgreSQL خارجية متوافقة مع الاتصالات السحابية. يمكن تشغيل المشروع على خادم Node.js دائم باستخدام `npm start`.

## تشغيل تطبيقي Flutter

ثبّت Flutter SDK حديثًا، ثم من داخل كل مجلد تطبيق نفّذ `flutter create --platforms=android,ios .` لإنشاء ملفات منصات Android وiOS القياسية، وبعدها `flutter pub get`. شغّل التطبيق مع عنوان الـAPI مثل:

```sh
flutter run --dart-define=API_BASE_URL=https://your-api.example.com/api
```

قد يتطلب الاختبار على جهاز فعلي عنوانًا عامًا أو عنوان الشبكة المحلية بدل `10.0.2.2` الافتراضي لمحاكي Android. يُبنى APK/AAB من Flutter/Android، أما IPA/TestFlight فيحتاج macOS وXcode وحساب Apple. لم تتوفر أدوات Flutter وAndroid SDK وXcode في بيئة إعداد هذا الأرشيف، لذلك لا يتضمن ZIP APK أو IPA.

## نقاط التكامل التي تحتاج إعدادًا

FCM وحفظ الصور السحابي موثقان كمواضع إعداد، لكن يلزم إنشاء مشروع Firebase/Cloud Storage وإضافة بيانات اعتماد الخادم في البيئة الآمنة. لا يوضع مفتاح خاص داخل تطبيق Flutter. إنشاء الإشعارات في النسخة الأولية يحفظها كمسودات فقط. الدفع الحقيقي غير مفعّل؛ الطلبات في الواجهة معنونة كتجريبية.

## إنشاء ZIP من المصدر

من جذر المشروع: `npm run zip`. يستبعد الملف الحزم المثبتة ومخرجات البناء والأسرار المحلية.
