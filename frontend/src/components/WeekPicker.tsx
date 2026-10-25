import { useMemo } from "react";

const HARI = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Picker minggu (SEN-SAB) + navigasi minggu, nilai berupa string YYYY-MM-DD. */
export default function WeekPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (d: string) => void;
}) {
  const base = useMemo(() => {
    const d = new Date(value ? value + "T00:00:00" : Date.now());
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const weekDates = useMemo(() => {
    const monday = startOfWeek(base);
    return Array.from({ length: 6 }, (_, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      return x;
    });
  }, [base]);

  const label = `${weekDates[0].getDate()} - ${weekDates[5].getDate()} ${weekDates[0].toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`;

  const shift = (days: number) => {
    const x = new Date(base);
    x.setDate(x.getDate() + days);
    onChange(toDateStr(x));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => shift(-7)}
          className="w-9 h-9 rounded-lg border border-black/10 hover:bg-black/5 text-body flex items-center justify-center"
          aria-label="Minggu sebelumnya"
        >
          <i className="ri-arrow-left-s-line" />
        </button>
        <div className="text-sm font-semibold text-ink whitespace-nowrap">{label}</div>
        <button
          onClick={() => shift(7)}
          className="w-9 h-9 rounded-lg border border-black/10 hover:bg-black/5 text-body flex items-center justify-center"
          aria-label="Minggu berikutnya"
        >
          <i className="ri-arrow-right-s-line" />
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {weekDates.map((d, i) => {
          const ds = toDateStr(d);
          const active = value === ds;
          return (
            <button
              key={ds}
              onClick={() => onChange(ds)}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] px-3 py-2 rounded-xl border transition ${
                active ? "bg-primary text-white border-transparent" : "bg-white text-body border-black/10 hover:bg-black/5"
              }`}
            >
              <span className="text-[11px] font-semibold opacity-80">{HARI[i]}</span>
              <span className="text-sm font-bold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
