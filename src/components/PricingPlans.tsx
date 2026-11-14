"use client";

import Link from "next/link";
import { useState } from "react";

const FREE = ["مشروعين و 100 حالة اختبار", "تنفيذ Runs بلا حد", "تصدير PDF بعلامة صغيرة", "رابط عميل واحد نشط", "10 توليدات AI في الشهر"];
const PRO = ["مشاريع وحالات بلا حد", "PDF بشعارك واسمك", "روابط عملاء بلا حد + موافقة الاستلام", "المكتبة الشخصية والحزم العربية كاملة", "100 توليدة AI في الشهر"];
const TEAM = ["5 مستخدمين في مساحة عمل واحدة", "أدوار وصلاحيات", "Traceability Matrix", "قوالب تقارير وقوالب حالات للفريق", "500 توليدة AI في الشهر"];

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6B5C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-1 shrink-0">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Features({ items, lead }: { items: string[]; lead?: string }) {
  return (
    <ul className="flex flex-col gap-3 text-[15px]">
      {lead ? <li className="text-[13px] font-semibold text-muted">{lead}</li> : null}
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2.5 leading-7">
          <Check />
          {f}
        </li>
      ))}
    </ul>
  );
}

export function PricingPlans({ signedIn }: { signedIn: boolean }) {
  const [yearly, setYearly] = useState(true);
  const pro = yearly ? { price: "$10", note: "بتدفع $120 مرة واحدة في السنة" } : { price: "$12", note: "بتدفع كل شهر · وفّر $24 بالسنوي" };
  const team = yearly ? { price: "$32.5", note: "بتدفع $390 مرة واحدة في السنة" } : { price: "$39", note: "بتدفع كل شهر · وفّر $78 بالسنوي" };
  const toggle = (on: boolean) =>
    `flex h-11 items-center gap-2 rounded-full px-[18px] text-[15px] font-semibold ${on ? "bg-ink text-white" : "text-ink"}`;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex justify-center">
        <div role="group" aria-label="طريقة الدفع" className="flex items-center gap-1 rounded-full border border-line-strong bg-white p-1">
          <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} className={toggle(yearly)}>
            سنوي
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn-ink">شهرين ببلاش</span>
          </button>
          <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} className={toggle(!yearly)}>
            شهري
          </button>
        </div>
      </div>

      <div className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-white p-7">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold">Free</h2>
            <span className="text-sm text-muted">تجرّب بيها مشروع حقيقي</span>
          </div>
          <div className="flex min-h-16 items-baseline gap-1.5">
            <span className="text-[44px] font-bold tracking-tight">$0</span>
          </div>
          <Link href={signedIn ? "/dashboard" : "/signup"} className="btn-secondary min-h-12 rounded-xl text-[15px]">
            {signedIn ? "إنت مشترك فيها" : "ابدأ مجانًا"}
          </Link>
          <Features items={FREE} />
        </div>

        <div className="relative flex flex-col gap-5 rounded-[20px] border-2 border-brand bg-white p-7">
          <span className="absolute -top-3.5 start-6 rounded-full bg-brand px-3 py-1 text-[13px] font-bold text-white">الأنسب للفريلانسر</span>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold">Pro</h2>
            <span className="text-sm text-muted">لشخص واحد بيسلّم لأكتر من عميل</span>
          </div>
          <div className="flex min-h-16 flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[44px] font-bold tracking-tight">{pro.price}</span>
              <span className="text-[15px] text-muted">في الشهر</span>
            </div>
            <span className="text-[13px] text-muted">{pro.note}</span>
          </div>
          <Link href="/#join" className="btn-primary min-h-12 rounded-xl text-[15px]">بلّغني لما يفتح</Link>
          <Features items={PRO} lead="كل اللي في Free، وكمان:" />
        </div>

        <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-white p-7">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold">Team</h2>
            <span className="text-sm text-muted">لشركات الاختبار الصغيرة · 5 مستخدمين</span>
          </div>
          <div className="flex min-h-16 flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[44px] font-bold tracking-tight">{team.price}</span>
              <span className="text-[15px] text-muted">في الشهر</span>
            </div>
            <span className="text-[13px] text-muted">{team.note}</span>
          </div>
          <Link href="/#join" className="btn-secondary min-h-12 rounded-xl border-ink text-[15px]">بلّغني لما يفتح</Link>
          <Features items={TEAM} lead="كل اللي في Pro، وكمان:" />
        </div>
      </div>
    </div>
  );
}
