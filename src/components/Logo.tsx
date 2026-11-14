export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-[10px]";
  const text = size === "lg" ? "text-2xl" : "text-[22px]";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`inline-flex items-center justify-center bg-brand ${box}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
      </span>
      <span className={`font-bold ${text}`}>تسليم</span>
    </span>
  );
}
