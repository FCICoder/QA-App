# تسليم

أداة إدارة حالات الاختبار وتسليم تقارير الـ QA للعملاء. ده الأساس (المرحلة 1 من خطة الـ MVP):

- حساب ومساحة عمل، وكل البيانات معزولة على مستوى مساحة العمل
- مشاريع، Suites، يوزر ستوريز اختيارية، وTest Cases بخطوات
- سجل نسخ لكل حالة، وسلة محذوفات بالاسترجاع
- تصدير PDF عربي للمشروع كله أو Suite أو ستوري أو حالة واحدة

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
| `npm run db:migrate` | تطبيق تغييرات `prisma/schema.prisma` على قاعدة البيانات |
| `npm run db:seed` | الحساب التجريبي |
| `npm run db:studio` | واجهة تتصفح بيها الجداول |
| `npm run pdf:sample` | PDF تجريبي من غير قاعدة بيانات |

## هيكل المشروع

```
prisma/schema.prisma          الجداول
prisma/seed.ts                البيانات التجريبية
src/app/(auth)/               تسجيل الدخول والحساب الجديد
src/app/(app)/projects/       المشاريع والحالات (صفحات + server actions)
src/app/api/pdf/              روابط تحميل الـ PDF
src/components/               مكوّنات الواجهة (فورم الحالة، الأزرار…)
src/lib/auth.ts               الجلسات والكوكي
src/lib/access.ts             جلب البيانات مع التحقق من مساحة العمل
src/lib/pdf/                  قالب الـ PDF والخط والرندر
scripts/pdf-sample.ts         تجربة الـ PDF
```

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
- **ناقص قبل الإطلاق:** حد لعدد محاولات تسجيل الدخول، تأكيد الإيميل، ونسيت كلمة السر.

## الخطوة الجاية حسب الخطة

1. استيراد Test Cases من Excel و CSV
2. Test Run وتنفيذ الحالات خطوة بخطوة
3. رابط تقرير العميل والـ Sign-off
4. نقل توليد الـ PDF لـ worker بطابور
