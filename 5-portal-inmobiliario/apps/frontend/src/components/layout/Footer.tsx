import Link from "next/link";
import { publicNavigationItems } from "@/lib/navigation";

export async function Footer() {
  "use cache";

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-foreground/10 bg-foreground/[0.03]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <p translate="no" className="font-bold">
            Portal Inmobiliario
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            Propiedades en venta y arriendo en México.
          </p>
        </div>
        <nav aria-label="Enlaces del pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {publicNavigationItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-foreground/10 py-4 text-center text-xs text-foreground/60">
        © {currentYear} Portal Inmobiliario. Todos los derechos reservados.
      </div>
    </footer>
  );
}
