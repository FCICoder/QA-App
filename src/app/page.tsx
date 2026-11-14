import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingHeader";
import { WaitlistForm } from "@/components/WaitlistForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "تسليم · من اليوزر ستوري لتقرير موقّع من العميل",
  description: "اكتب حالات الاختبار أو ولّدها، نفّذها، وابعت لعميلك رابط تقرير بالعربي يوافق عليه بضغطة.",
};

const PAINS = [
  ["بتعيد نفس الحالات مع كل عميل", "تسجيل الدخول والدفع والسلة بتكتبهم من الأول في كل مشروع، أو بتنسخهم من شيت قديم."],
  ["التقرير بياخد يوم لوحده", "تنسيق النتايج في Word أو PDF، وبعدين الأدوات الأجنبية بتبوّظ العربي."],
  ["مفيش لحظة «استلمت»", "المرحلة بتفضل مفتوحة، والعميل يرجع بملاحظات بعد أسبوعين، والفاتورة مستنية."],
];

const STEPS = [
  ["اكتب أو ولّد الحالات", "الصق اليوزر ستوري وولّد منها حالات، أو هات حالات جاهزة من مكتبتك والحزم العربية."],
  ["نفّذ وسجّل", "نجح أو فشل لكل خطوة، ولو فشلت يطلعلك Bug Report جاهز بالخطوات والنتيجة الفعلية."],
  ["ابعت الرابط واقفل المرحلة", "العميل يراجع التقرير ويوافق بضغطة، وتنزل للطرفين نسخة PDF فيها محضر الاستلام."],
];

const FEATURES = [
  ["موافقة العميل بضغطة", "العميل يوافق على التقرير باسمه وإيميله، ويتسجّل وقت الموافقة في محضر استلام PDF."],
  ["العميل مش محتاج حساب", "ابعت الرابط لفريق العميل كله على واتساب أو الإيميل. تقدر تحط كلمة سر وتاريخ انتهاء."],
  ["مكتبة بتتنقل معاك", "احفظ أي حالة في مكتبتك وانسخها لمشروع العميل الجاي بضغطة."],
  ["حزم اختبار عربية جاهزة", "تسجيل الدخول، الدفع، البحث بالعربي، RTL، الأرقام الهندية وأرقام الموبايل."],
  ["توليد بالذكاء الاصطناعي", "من اليوزر ستوري لحالات إيجابية وسلبية وحدود، بالعربي أو الإنجليزي، وإنت تراجع قبل الحفظ."],
  ["PDF عربي سليم", "الحروف متوصلة، والاتجاه صح، والكلام الإنجليزي جوه الجمل العربي في مكانه."],
];

const FAQ = [
  ["هل العميل محتاج يعمل حساب؟", "لا. بيفتح الرابط ويراجع ويوافق. تقدر تحط كلمة سر للرابط وتاريخ انتهاء، وتوقفه في أي وقت."],
  ["إيه اللي متاح مجانًا؟", "دلوقتي إحنا في الفترة التجريبية وكل المميزات مفتوحة. لما الباقات المدفوعة تفتح، هيفضل فيه باقة مجانية تكفي تجرّب بيها مشروع حقيقي."],
  ["بدفع إزاي؟", "الدفع لسه مش متاح. سجّل إيميلك تحت وهنبعتلك أول ما يفتح، بسعر الإطلاق."],
  ["بياناتي وبيانات عملائي في أمان؟", "كل مساحة عمل معزولة عن التانية، وروابط العملاء للقراءة بس، وكلمات السر متخزنة مشفّرة."],
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="bg-white">
      <MarketingHeader signedIn={false} />

      <section className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 py-16 sm:py-20">
          <div className="flex flex-[1_1_460px] flex-col gap-5">
            <span className="self-start rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-dark">
              للـ QA الفريلانسر وشركات الاختبار الصغيرة
            </span>
            <h1 className="text-[36px] font-bold leading-[1.3] sm:text-[48px]">
              من اليوزر ستوري لتقرير <span className="text-brand">موقّع من العميل</span>، بالعربي، في نفس اليوم.
            </h1>
            <p className="max-w-[560px] text-lg leading-8 text-ink-soft">
              اكتب حالات الاختبار أو ولّدها، نفّذها، وابعت لعميلك رابط تقرير. العميل يراجع ويضغط «أوافق»، وإنت تقفل المرحلة بمحضر استلام.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary min-h-[54px] px-7 text-base">ابدأ مجانًا</Link>
              <Link href="#how" className="btn-secondary min-h-[54px] px-6 text-base">إزاي بيشتغل</Link>
            </div>
            <span className="text-sm text-muted">مجانًا خلال الفترة التجريبية · من غير كارت</span>
          </div>

          <div aria-hidden="true" className="flex flex-[1_1_380px] justify-center">
            <div className="w-full max-w-[440px] overflow-hidden rounded-[20px] border border-line-strong bg-white shadow-[0_24px_48px_rgba(22,32,31,0.10)]">
              <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] bg-ink text-sm font-bold text-white">ح</span>
                <div className="flex flex-col">
                  <span className="text-[13px] text-muted">تقرير اختبار · Run #5</span>
                  <span className="font-bold">بوابة الحجوزات</span>
                </div>
              </div>
              <div className="flex flex-col gap-3.5 px-5 py-4">
                <div className="flex items-center gap-2.5 rounded-[10px] bg-pass-soft px-3.5 py-3 text-sm font-semibold text-pass-ink">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pass text-xs text-white">✓</span>
                  جاهز للإطلاق مع ملاحظتين
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["الحالات", "54", ""],
                    ["نجح", "52", "text-pass"],
                    ["فشل", "2", "text-warn"],
                  ].map(([l, v, c]) => (
                    <div key={l} className="rounded-[10px] border border-line p-2.5">
                      <div className="text-xs text-muted">{l}</div>
                      <div className={`text-[22px] font-bold ${c}`}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-line">
                  <div className="bg-pass" style={{ width: "96.3%" }} />
                  <div className="bg-[#d9822b]" style={{ width: "3.7%" }} />
                </div>
                <div className="flex h-12 items-center justify-center rounded-[10px] bg-brand font-bold text-white">أوافق على التقرير</div>
                <span className="text-center text-xs text-muted">العميل مش محتاج حساب</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="pain-h" className="mx-auto flex max-w-[1200px] flex-col gap-7 px-6 pb-6 pt-20">
        <h2 id="pain-h" className="max-w-[760px] text-[28px] font-bold leading-[1.4] sm:text-[34px]">
          شغلك كويس، بس العميل بيشوف ملف Excel ورسايل واتساب متفرقة.
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PAINS.map(([t, d]) => (
            <div key={t} className="flex flex-col gap-2 rounded-2xl border border-line p-5">
              <span className="text-[17px] font-bold">{t}</span>
              <span className="leading-7 text-ink-soft">{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="how" aria-labelledby="how-h" className="mx-auto flex max-w-[1200px] scroll-mt-4 flex-col gap-7 px-6 py-[72px]">
        <h2 id="how-h" className="text-[28px] font-bold sm:text-[34px]">إزاي بيشتغل</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink font-bold text-white">{i + 1}</span>
              <span className="text-lg font-bold">{t}</span>
              <span className="leading-7 text-ink-soft">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" aria-labelledby="feat-h" className="scroll-mt-4 bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-20">
          <h2 id="feat-h" className="max-w-[720px] text-[28px] font-bold leading-[1.4] sm:text-[34px]">
            معمول للي بيسلّم شغل لعملاء، مش لفريق داخلي.
          </h2>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-ink-soft bg-ink-soft sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="flex flex-col gap-2 bg-ink p-6">
                <span className="text-lg font-bold">{t}</span>
                <span className="leading-7 text-[#c9d2d0]">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="join" aria-labelledby="join-h" className="mx-auto max-w-[1200px] scroll-mt-4 px-6 py-20">
        <div className="flex flex-wrap items-center gap-8 rounded-3xl border-2 border-brand p-8 sm:p-10">
          <div className="flex flex-[1_1_420px] flex-col gap-3">
            <span className="self-start rounded-full bg-warn-soft px-3 py-1 text-[13px] font-bold text-warn-ink">سعر الإطلاق</span>
            <h2 id="join-h" className="text-[26px] font-bold sm:text-[32px]">الباقات المدفوعة جاية قريب</h2>
            <p className="leading-8 text-ink-soft">
              دلوقتي كل حاجة مجانية. سجّل إيميلك وهنبعتلك أول ما الباقات تفتح، بخصم لأول المشتركين. <Link href="/pricing" className="font-semibold">شوف الأسعار</Link>
            </p>
          </div>
          <div className="flex-[1_1_320px]">
            <WaitlistForm source="landing" cta="احجز مكانك" />
          </div>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-h" className="mx-auto flex max-w-[860px] scroll-mt-4 flex-col gap-4 px-6 pb-20">
        <h2 id="faq-h" className="mb-2 text-[26px] font-bold sm:text-[30px]">أسئلة شائعة</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="rounded-[14px] border border-line px-5">
            <summary className="flex min-h-[60px] cursor-pointer items-center text-[17px] font-semibold">{q}</summary>
            <p className="mb-4 leading-8 text-ink-soft">{a}</p>
          </details>
        ))}
      </section>

      <MarketingFooter />
    </div>
  );
}
