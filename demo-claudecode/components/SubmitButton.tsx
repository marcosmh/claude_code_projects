"use client";

import { useFormStatus } from "react-dom";
import { button } from "@/components/ui";

export function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={button("secondary", "sm")}>
      {pending ? pendingText : children}
    </button>
  );
}
