import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingHeader";
import { PricingPlans } from "@/components/PricingPlans";
import { WaitlistForm } from "@/components/WaitlistForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "الأسعار · تسليم" };

const NO = "—";
const ROWS: [string, string, string, string][] = [
  ["المشاريع / الحالات", "2 / 100", "بلا حد", "بلا حد"],
  ["المستخدمين", "1", "1", "5"],
  ["مشاهدين من طرف العميل", "مجانًا", "مجانًا بلا حد", "مجانًا بلا حد"],
  ["روابط العملاء النشطة", "1", "بلا حد", "بلا حد"],
  ["موافقة الاستلام (Sign-off)", NO, "✓", "✓"],
  ["PDF بشعارك", NO, "✓", "قوالب مخصصة"],
  ["المكتبة والحزم العربية", "عيّنة", "كاملة", "كاملة + قوالب الفريق"],
  ["توليدات AI في الشهر", "10", "100", "500"],
  ["Traceability Matrix وأدوار", NO, NO, "✓"],
];

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader signedIn={Boolean(user)} />

      <main className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 pb-20 pt-14">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <h1 className="text-[32px] font-bold sm:text-[40px]">ادفع على اللي عميلك بيشوفه</h1>
          <p className="max-w-[620px] text-[17px] leading-8 text-ink-soft">
            كتابة وتنظيم الحالات مجاني. الباقات المدفوعة بتفتح تقارير بشعارك، وروابط عملاء من غير حد، وموافقة الاستلام.
          </p>
          <p role="note" className="rounded-full bg-brand-soft px-4 py-1.5 text-sm font-semibold text-brand-dark">
            إحنا في الفترة التجريبية: كل المميزات مفتوحة مجانًا لحد ما الدفع يفتح.
          </p>
        </div>

        <PricingPlans signedIn={Boolean(user)} />

        <section aria-labelledby="cmp-h" className="overflow-hidden rounded-2xl border border-line bg-white">
          <h2 id="cmp-h" className="border-b border-line px-5 py-4 text-xl font-bold">مقارنة الباقات</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-canvas">
                  <th scope="col" className="px-5 py-3.5 text-start text-sm font-semibold text-muted">الميزة</th>
                  <th scope="col" className="px-3 py-3.5 text-center font-bold">Free</th>
                  <th scope="col" className="px-3 py-3.5 text-center font-bold text-brand">Pro</th>
                  <th scope="col" className="px-3 py-3.5 text-center font-bold">Team</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([f, a, b, c]) => (
                  <tr key={f} className="border-t border-[#eef1ef]">
                    <th scope="row" className="px-5 py-3.5 text-start font-medium">{f}</th>
                    <td className="px-3 py-3.5 text-center text-ink-soft">{a}</td>
                    <td className="bg-[#f8fbfb] px-3 py-3.5 text-center text-ink-soft">{b}</td>
                    <td className="px-3 py-3.5 text-center text-ink-soft">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="notify-h" className="flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-white p-6">
          <div className="flex flex-[1_1_320px] flex-col gap-1">
            <h2 id="notify-h" className="text-lg font-bold">عايز تعرف أول ما الدفع يفتح؟</h2>
            <p className="text-sm leading-7 text-ink-soft">هنبعتلك إيميل واحد، وفيه سعر الإطلاق لأول المشتركين.</p>
          </div>
          <div className="flex-[1_1_320px]">
            <WaitlistForm source="pricing" />
          </div>
        </section>

        <p className="text-center text-sm leading-7 text-muted">
          الأسعار بالدولار، والضرايب حسب بلدك بتتحسب عند الدفع. تقدر تلغي في أي وقت، والاشتراك يفضل شغال لنهاية الفترة المدفوعة.
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
