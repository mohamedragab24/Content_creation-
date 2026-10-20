# API ومخطط التكامل

Base URL: نفس عنوان التطبيق، بادئة `/api`. الردود JSON. `GET /api/health` عام لفحص التشغيل.

| الطريقة | المسار | الحالة |
|---|---|---|
| GET | `/api/dashboard` | إحصائيات ومحتوى تجريبي (خلف الجلسة خارج Demo) |
| GET | `/api/auth/session` | وضع الجلسة وDemo |
| POST | `/api/auth/login` | `{ "password": "..." }` |
| POST | `/api/auth/logout` | إنهاء الجلسة |
| GET | `/api/settings` | حالة إعداد المزودين دون إرجاع الأسرار |
| PUT | `/api/settings/keys/:provider` | `{ "apiKey": "..." }`؛ يُحفظ مشفرًا على الخادم، خارج Demo فقط |
| DELETE | `/api/settings/keys/:provider` | حذف مفتاح محفوظ |
| POST | `/api/ai/script` | `{ "provider": "openai|gemini", "topic": "..." }`؛ يولد نصًا حقيقيًا عند تهيئة المفتاح |
| POST | `/api/videos/generate` | نقطة هيكلية؛ تحتاج Video provider adapter |
| POST | `/api/social/:platform/publish` | نقطة هيكلية؛ تحتاج OAuth وصلاحية نشر معتمدة |
| POST | `/api/comments/:id/reply` | نقطة هيكلية؛ تحتاج صلاحية إدارة تعليقات |

## ملاحظات إنتاجية

الجلسات تستخدم MemoryStore افتراضيًا؛ استبدله بمخزن جلسات دائم/مشترك قبل تعدد النسخ. ملف المفاتيح المشفر `data/api-secrets.enc` يحتاج تخزينًا دائمًا وسريًا. استخدم HTTPS، إعدادات Cookie آمنة، وحدود معدل دخول، وسجلات تدقيق. لا تعرّض API إعداد المفاتيح دون مصادقة.

لإضافة منصة: أنشئ adapter مستقلًا يحوي OAuth authorization URL، callback يتحقق من `state`، تخزين access/refresh tokens مشفرًا مع انتهاء صلاحية وتجديد، ثم تنفيذ عمليات النشر والتعليقات مع معالجة حدود المعدل وأخطاء API. لا تطلب كلمات مرور حسابات التواصل مباشرة؛ OAuth الرسمي هو المسار الصحيح.
