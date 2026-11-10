import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión | Portal Inmobiliario",
  description: "Accede a tu cuenta del Portal Inmobiliario.",
};

export default function LoginPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-12 focus:outline-none sm:px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
