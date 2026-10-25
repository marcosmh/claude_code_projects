import { Outlet, useNavigation } from "react-router";
import { ToastViewport } from "@/components/common/ToastViewport";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const navigation = useNavigation();

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
      >
        Saltar al contenido
      </a>
      <TopBar />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main
          id="contenido"
          aria-busy={navigation.state === "loading"}
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-10 md:py-10"
        >
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </>
  );
}
