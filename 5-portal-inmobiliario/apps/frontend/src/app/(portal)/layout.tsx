import type { ReactNode } from "react";
import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

/** Experiencia del usuario final: header, contenido y pie. El área /admin tiene su propio layout. */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* usePathname() es dato de runtime en rutas dinámicas (/properties/[id]). */}
      <Suspense
        fallback={
          <div className="h-[65px] border-b border-foreground/10 bg-surface" aria-hidden="true" />
        }
      >
        <Header />
      </Suspense>
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
