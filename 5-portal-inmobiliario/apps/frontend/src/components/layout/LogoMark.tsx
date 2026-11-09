/** Isotipo decorativo: edificio moderno con una casa en su base. Usa el color primario del tema. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M9 25V9.5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 18 9.5V25H9Z"
        className="fill-primary-foreground"
      />
      <path
        d="M18 14h4.5a1.5 1.5 0 0 1 1.5 1.5V25h-6V14Z"
        className="fill-primary-foreground"
        opacity="0.7"
      />
      <g className="fill-primary">
        <rect x="11.5" y="11" width="2" height="2" rx="0.5" />
        <rect x="14.5" y="11" width="2" height="2" rx="0.5" />
        <rect x="11.5" y="15" width="2" height="2" rx="0.5" />
        <rect x="14.5" y="15" width="2" height="2" rx="0.5" />
        <rect x="11.5" y="19" width="2" height="2" rx="0.5" />
        <rect x="14.5" y="19" width="2" height="2" rx="0.5" />
      </g>
    </svg>
  );
}
