import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans } from "next/font/google";
import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Facturas",
  description: "Gestión de facturas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${notoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t!=="light")document.documentElement.classList.add("dark");if(localStorage.getItem("menu")==="collapsed")document.documentElement.classList.add("menu-collapsed")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TopBar />
        <div className="flex flex-1 flex-col md:flex-row">
          <Suspense fallback={<aside className="md:w-56 md:border-r md:border-zinc-200" />}>
            <Sidebar />
          </Suspense>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-10 md:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
