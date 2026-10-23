import { clearFlash } from "@/lib/flash";

// El cliente lo llama al mostrar un mensaje flash para que no aparezca en la siguiente solicitud.
export async function DELETE() {
  await clearFlash();
  return new Response(null, { status: 204 });
}
