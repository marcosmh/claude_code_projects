import type { ReactNode } from "react";

type AuthCardProps = {
  titleId: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({ titleId, title, description, children }: AuthCardProps) {
  return (
    <section
      aria-labelledby={titleId}
      className="mx-auto w-full max-w-md rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm sm:p-8"
    >
      <h1 id={titleId} className="text-2xl font-bold tracking-tight">
        {title}
      </h1>
      <p className="mt-1 text-foreground/70">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
