import type { Metadata } from "next";
import { AccountEditor } from "@/components/account/AccountEditor";

export const metadata: Metadata = {
  title: "Editar mi cuenta | Portal Inmobiliario",
  robots: { index: false },
};

export default function EditAccountPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-12 focus:outline-none sm:px-6">
      <AccountEditor />
    </main>
  );
}
