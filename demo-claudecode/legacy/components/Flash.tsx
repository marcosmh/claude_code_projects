import { FlashAlert } from "@/components/FlashAlert";
import { readFlash } from "@/lib/flash";

/** Lee el mensaje flash de la solicitud actual (si hay) y lo muestra. */
export async function Flash() {
  const flash = await readFlash();
  return flash ? <FlashAlert key={flash.id} flash={flash} /> : null;
}
