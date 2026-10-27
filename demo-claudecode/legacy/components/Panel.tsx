import { sheet } from "@/components/ui";

/** Panel con cabecera separada por un filete, como las tarjetas del dashboard de referencia. */
export function Panel({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${sheet} ${className}`}>
      <header className="border-b border-zinc-200 px-5 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
