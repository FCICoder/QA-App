# تسليم

أداة كتابة وتنفيذ حالات الاختبار وتسليم تقارير الـ QA للعملاء:

- حساب ومساحة عمل، وكل البيانات معزولة على مستوى مساحة العمل
- مشاريع، Suites، يوزر ستوريز اختيارية، وTest Cases بخطوات، مع سجل نسخ وسلة محذوفات
- **Test Runs:** تنفيذ خطوة بخطوة (نجح / فشل / محجوب)، النتيجة الفعلية، وBug Report جاهز للنسخ
- **رابط تقرير للعميل** `/r/<token>`: من غير حساب، بكلمة سر وتاريخ انتهاء اختياريين، عدّاد مشاهدات، موافقة الاستلام (Sign-off) ورسايل العميل
- **PDF عربي:** للحالات، ولنتايج الـ Run مع محضر الاستلام بعد موافقة العميل
- **المكتبة:** احفظ أي حالة وانسخها لأي مشروع، و6 حزم عربية جاهزة (دخول، تسجيل، دفع، بحث، RTL، نماذج)
- **التوليد بالذكاء الاصطناعي** من اليوزر ستوري (Claude Haiku)، بمراجعة قبل الحفظ وحد شهري
- لوحة تحكم، إعدادات، صفحة رئيسية تعريفية بقائمة انتظار، وصفحة أسعار (عرض بس، الدفع لسه مش متوصّل)

**التقنيات:** Next.js 16، React 19، Prisma 7 مع PostgreSQL، Tailwind CSS 4، وPuppeteer للـ PDF.

## التشغيل على Windows

محتاج:

- **Node.js 22 LTS أو أحدث** (من nodejs.org)
- **PostgreSQL**: أسهل طريقة Docker Desktop. لو مش عايز Docker، نزّل PostgreSQL من postgresql.org أو استخدم قاعدة مجانية على الإنترنت (Neon أو Supabase) وحط الرابط في `.env`.

افتح PowerShell أو Terminal في IntelliJ جوه فولدر المشروع:

```powershell
cd $HOME\IdeaProjects\tasleem

# 1. ملف الإعدادات
copy .env.example .env

# 2. المكتبات (بتنزّل كمان نسخة Chrome لـ Puppeteer، حوالي 150MB)
npm install

# 3. قاعدة البيانات (لو بتستخدم Docker)
npm run db:up

# 4. إنشاء الجداول
npm run db:migrate -- --name init

# 5. حساب تجريبي فيه مشروع وحالات
npm run db:seed

# 6. تشغيل
npm run dev
```

افتح http://localhost:3000 وادخل بـ:

- الإيميل: `demo@tasleem.local`
- كلمة السر: `Demo12345`

## تجربة الـ PDF لوحده

من غير قاعدة بيانات:

```powershell
npm run pdf:sample
```

بيطلّع `sample.pdf` و `sample.html` في فولدر المشروع، ببيانات فيها عربي وإنجليزي في نفس السطر وأرقام هندية وحالة طويلة بتتقسم على صفحتين.

## الأوامر

| الأمر | بيعمل إيه |
|---|---|
| `npm run dev` | تشغيل للتطوير على المنفذ 3000 |
| `npm run build` | بناء نسخة الإنتاج (وبيعمل type check) |
| `npm run typecheck` | فحص TypeScript بس |
| `npm run db:migrate` | إنشاء migration من تغييرات `prisma/schema.prisma` وتطبيقها محلياً |
| `npm run db:deploy` | تطبيق الـ migrations الموجودة بس (زي اللي بيحصل على Vercel) |
| `npm run db:seed` | الحساب التجريبي |
| `npm run db:studio` | واجهة تتصفح بيها الجداول |
| `npm run pdf:sample` | PDF تجريبي من غير قاعدة بيانات |

## هيكل المشروع

```
prisma/schema.prisma          الجداول
prisma/seed.ts                البيانات التجريبية
src/app/(auth)/               تسجيل الدخول والحساب الجديد
src/app/(app)/dashboard/      لوحة التحكم
src/app/(app)/projects/       المشاريع والحالات والـ Runs والتوليد (صفحات + server actions)
src/app/(app)/library/        المكتبة والحزم الجاهزة
src/app/(app)/settings/       الإعدادات
src/app/r/[token]/            صفحة تقرير العميل العامة والـ PDF بتاعها
src/app/api/pdf/              روابط تحميل الـ PDF
src/app/page.tsx, pricing/    الصفحة الرئيسية والأسعار
src/components/               مكوّنات الواجهة (فورم الحالة، الأزرار…)
src/lib/auth.ts               الجلسات والكوكي
src/lib/access.ts             جلب البيانات مع التحقق من مساحة العمل
src/lib/pdf/                  قوالب الـ PDF والخط والرندر
src/lib/ai.ts                 التوليد بالذكاء الاصطناعي
src/lib/packs.ts              الحزم الجاهزة
scripts/pdf-sample.ts         تجربة الـ PDF
```

## النشر على Vercel

- Vercel بيشغّل `npm run vercel-build`، وده بيطبّق أي migration جديدة في `prisma/migrations` على قاعدة البيانات قبل البناء. يعني أي تعديل في الجداول بيوصل لوحده مع كل deploy.
- محتاج `DATABASE_URL` في Environment Variables بتاعة المشروع على Vercel.
- قاعدة البيانات على Vercel بتبدأ فاضية: اعمل حساب جديد من `/signup`. ماتشغّلش `db:seed` على قاعدة الإنتاج، لأن الحساب التجريبي كلمة سره مكتوبة هنا في الـ README.
- **الـ PDF على Vercel** بيستخدم `@sparticuz/chromium` (نسخة Chromium مضغوطة للسيرفرات)، ومحلياً بيستخدم Chrome اللي Puppeteer نزّله. التبديل أوتوماتيك حسب متغير `VERCEL`.
- **التوليد بالذكاء الاصطناعي:** ضيف `ANTHROPIC_API_KEY` في Environment Variables واعمل Redeploy. من غيره صفحة التوليد بتقول إنه مش متفعّل. اختياري: `AI_MODEL` (الافتراضي `claude-haiku-5-5`) و`AI_MONTHLY_LIMIT` (الافتراضي 30 توليدة لكل مساحة عمل في الشهر).

## مشاكل متوقعة

- **`DATABASE_URL` مش متعرّف:** تأكد إنك عملت `copy .env.example .env`.
- **المنفذ 5432 مشغول:** فيه PostgreSQL تاني شغال على جهازك. يا توقفه، يا تغيّر المنفذ في `docker-compose.yml` وفي `DATABASE_URL`.
- **تحميل Chrome فشل وقت `npm install`:** استخدم Chrome اللي على جهازك. في PowerShell:
  ```powershell
  $env:PUPPETEER_SKIP_DOWNLOAD="true"; npm install
  ```
  وبعدين ضيف السطر ده في `.env`:
  ```
  PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
  ```
- **غيّرت في `schema.prisma`:** شغّل `npm run db:migrate` تاني.

## الأمان في النسخة دي

- كلمات السر بـ scrypt، والكوكي فيه توكن عشوائي وقاعدة البيانات بتخزن الـ hash بس.
- كل استعلام بيتحقق إن المشروع أو الحالة تبع مساحة عمل المستخدم.
- صفحة الـ PDF بتتبني من نص متعمله escape، وChrome ممنوع يفتح أي رابط خارجي وهو بيرندر.
- رابط العميل توكن عشوائي 144 بت، الصفحة `noindex`، ولو عليها كلمة سر بتتحفظ بـ scrypt ويتعمل كوكي خاص بالرابط ده بس.
- **ناقص قبل الإطلاق:** حد لعدد محاولات تسجيل الدخول وكلمة سر الرابط، تأكيد الإيميل، ونسيت كلمة السر.

## الخطوة الجاية حسب الخطة

1. استيراد Test Cases من Excel و CSV
2. الدفع (Paddle) وحدود الباقات
3. شعار مساحة العمل في التقرير والـ PDF، وتقرير بالإنجليزي
4. نقل توليد الـ PDF لـ worker بطابور
