import type { RunCounts } from "@/lib/runs";

// Stacked bar: passed / failed / blocked over the run's total.
export function RunBar({ counts, className = "h-2" }: { counts: RunCounts; className?: string }) {
  const w = (n: number) => (counts.total === 0 ? "0%" : `${(n / counts.total) * 100}%`);
  const label = `نجح ${counts.passed}، فشل ${counts.failed}، محجوب ${counts.blocked}، متبقي ${counts.total - counts.done} من ${counts.total}`;
  return (
    <div role="img" aria-label={label} className={`flex overflow-hidden rounded-full bg-line ${className}`}>
      <div style={{ width: w(counts.passed) }} className="bg-pass" />
      <div style={{ width: w(counts.failed) }} className="bg-[#d9822b]" />
      <div style={{ width: w(counts.blocked) }} className="bg-[#7c8a87]" />
    </div>
  );
}

export function RunLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-pass" />نجح</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#d9822b]" />فشل</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#7c8a87]" />محجوب</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-line" />لم يُنفّذ</span>
    </div>
  );
}
