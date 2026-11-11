import { CallToActionSection } from "@/components/landing/CallToActionSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { PropertySection } from "@/components/landing/PropertySection";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
      <HeroSection />
      <PropertySection
        id="featured"
        title="Propiedades destacadas"
        description="Una selección de nuestras mejores oportunidades."
        params={{ featured: true, pageSize: 6 }}
        viewAllHref="/properties"
        viewAllLabel="Ver todas"
      />
      <PropertySection
        id="sale"
        title="Propiedades en venta"
        description="Compra tu próximo hogar o inversión."
        params={{ operation: "SALE", pageSize: 3 }}
        viewAllHref="/properties?operation=SALE"
        viewAllLabel="Ver todas en venta"
      />
      <PropertySection
        id="rent"
        title="Propiedades en arriendo"
        description="Encuentra tu espacio para vivir o trabajar."
        params={{ operation: "RENT", pageSize: 3 }}
        viewAllHref="/properties?operation=RENT"
        viewAllLabel="Ver todas en arriendo"
      />
      <CallToActionSection />
    </main>
  );
}
