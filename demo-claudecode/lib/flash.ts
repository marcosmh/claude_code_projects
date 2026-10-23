import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

/**
 * Mensajes flash: una Server Action los guarda en una cookie de corta vida y la
 * página siguiente los lee. El cliente borra la cookie al mostrarlos (`DELETE /flash`),
 * así el mensaje sobrevive a una sola solicitud.
 */
const NAME = "flash";

const flashSchema = z.object({
  id: z.string(),
  type: z.enum(["success", "error"]),
  message: z.string(),
});
export type Flash = z.infer<typeof flashSchema>;

export async function setFlash(type: Flash["type"], message: string) {
  const value = Buffer.from(JSON.stringify({ id: randomUUID(), type, message })).toString("base64url");
  (await cookies()).set(NAME, value, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 });
}

export async function readFlash(): Promise<Flash | null> {
  const value = (await cookies()).get(NAME)?.value;
  if (!value) return null;
  try {
    const parsed = flashSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function clearFlash() {
  (await cookies()).delete(NAME);
}
