import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta | Portal Inmobiliario",
  description: "Regístrate en el Portal Inmobiliario.",
};

export default function RegisterPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-12 focus:outline-none sm:px-6">
      <RegisterForm />
    </main>
  );
}
