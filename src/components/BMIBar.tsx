// src/components/BMIBar.tsx
interface BMIBarProps {
  weight: number; // kg
  height: number; // cm
}

export default function BMIBar({ weight, height }: BMIBarProps) {
  if (!weight || !height) return null;

  const bmi = weight / Math.pow(height / 100, 2);
  const pct = Math.min(100, Math.max(0, (bmi - 10) / 30 * 100));

  const label =
    bmi < 18.5 ? "Underweight" :
    bmi < 25   ? "Normal" :
    bmi < 30   ? "Overweight" : "Obese";

  const labelColor =
    bmi < 18.5 ? "text-blue-400" :
    bmi < 25   ? "text-emerald-400" :
    bmi < 30   ? "text-yellow-400" : "text-red-400";

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
      {/* Score row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          BMI Score
        </span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-white">
            {bmi.toFixed(1)}
          </span>
          <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10 ${labelColor}`}>
            {label}
          </span>
        </div>
      </div>

      {/* Color bar - proportional widths */}
      <div className="relative h-3 w-full flex rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 opacity-80" style={{ width: "28.3%" }} />
        <div className="h-full bg-emerald-500 opacity-80" style={{ width: "21.7%" }} />
        <div className="h-full bg-yellow-500 opacity-80" style={{ width: "16.7%" }} />
        <div className="h-full bg-red-500 opacity-80" style={{ width: "33.3%" }} />
        {/* Sliding indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500"
          style={{ left: `${pct}%` }}
        />
      </div>

      {/* Range labels — positioned at exact color boundaries */}
      <div className="relative h-4 w-full">
        <span className="absolute left-0 text-[10px] font-bold text-slate-600 uppercase">
          &lt;18.5
        </span>
        <span
          className="absolute -translate-x-1/2 text-[10px] font-bold text-slate-600 uppercase"
          style={{ left: "28.3%" }}
        >
          18.5
        </span>
        <span
          className="absolute -translate-x-1/2 text-[10px] font-bold text-slate-600 uppercase"
          style={{ left: "50%" }}
        >
          25
        </span>
        <span
          className="absolute -translate-x-1/2 text-[10px] font-bold text-slate-600 uppercase"
          style={{ left: "66.7%" }}
        >
          30
        </span>
        <span className="absolute right-0 text-[10px] font-bold text-slate-600 uppercase">
          ≥30
        </span>
      </div>
    </div>
  );
}
