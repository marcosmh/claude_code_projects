import { buildInquirySubject } from "@portal/shared-types";

export type InquiryEmail = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  propertyId: string;
  propertyTitle: string;
};

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Envía el aviso de una consulta por correo con Web3Forms, desde el navegador: el plan gratuito
 * rechaza las llamadas desde servidores. La clave (NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY) es pública
 * por diseño: solo permite enviar al correo con el que se registró. Nunca lanza: devuelve true si
 * Web3Forms aceptó el envío y false en cualquier otro caso (sin clave, red, rechazo).
 */
export async function sendInquiryEmail(inquiry: InquiryEmail): Promise<boolean> {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return false;

  try {
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: buildInquirySubject(inquiry.propertyTitle),
        from_name: "Portal Inmobiliario",
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone ?? "",
        message: inquiry.message,
        property_id: inquiry.propertyId,
        property_title: inquiry.propertyTitle,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await response.json().catch(() => null)) as { success?: boolean } | null;
    return response.ok && body?.success === true;
  } catch {
    return false;
  }
}
