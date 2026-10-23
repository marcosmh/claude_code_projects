import { sheet } from "@/components/ui";

type Tone = "neutral" | "good" | "warn" | "bad";

const TONES: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700",
  good: "bg-green-100 text-green-700",
  warn: "bg-amber-100 text-amber-700",
  bad: "bg-red-50 text-red-700 border border-red-300",
};

/** Cifra clave: etiqueta, valor, insignia de contexto y un icono grande de fondo. */
export function StatCard({
  label,
  value,
  badge,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
  tone?: Tone;
  icon: React.ReactNode;
}) {
  return (
    <div className={`${sheet} flex items-center justify-between gap-3 p-4`}>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">{label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-xl font-bold tabular-nums">{value}</p>
          {badge && <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{badge}</span>}
        </div>
      </div>
      <svg aria-hidden viewBox="0 0 24 24" className="size-10 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
    </div>
  );
}
