type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-dark",
  secondary: "border border-zinc-300 bg-surface hover:bg-zinc-100",
  danger: "border border-red-300 bg-surface text-red-700 hover:bg-red-50",
};
const sizes: Record<Size, string> = { md: "px-4 py-2", sm: "px-3 py-1.5" };

/** Clases de botón/enlace-botón compartidas, para que todas las acciones se vean igual. */
export const button = (variant: Variant = "primary", size: Size = "md") =>
  `${base} ${variants[variant]} ${sizes[size]}`;

/** Panel: recuadro con borde; cabecera y cuerpo se separan con un filete. */
export const sheet = "rounded-md border border-zinc-200 bg-surface";

/** Cifras de dinero con numerales alineados. */
export const money = "tabular-nums";
