import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/AccountOverview";

export const metadata: Metadata = {
  title: "Mi cuenta | Portal Inmobiliario",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-12 focus:outline-none sm:px-6">
      <AccountOverview />
    </main>
  );
}
