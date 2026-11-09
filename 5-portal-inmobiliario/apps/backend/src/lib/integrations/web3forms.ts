import "server-only";

export type InquiryNotification = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  propertyId: string;
  propertyTitle: string;
};

export type InquiryNotifier = {
  /** Devuelve true si Web3Forms aceptó el envío. Nunca lanza. */
  send(notification: InquiryNotification): Promise<boolean>;
};

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const REQUEST_TIMEOUT_MS = 8000;

/** Notificador real. La clave vive solo en el servidor (WEB3FORMS_ACCESS_KEY). */
export const web3FormsNotifier: InquiryNotifier = {
  async send(notification) {
    const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      console.error("Web3Forms: falta WEB3FORMS_ACCESS_KEY; la consulta no se notificó.");
      return false;
    }

    try {
      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Nueva consulta: ${notification.propertyTitle}`,
          from_name: "Portal Inmobiliario",
          name: notification.name,
          email: notification.email,
          phone: notification.phone ?? "",
          message: notification.message,
          property_id: notification.propertyId,
          property_title: notification.propertyTitle,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const body = (await response.json().catch(() => null)) as { success?: boolean } | null;
      if (!response.ok || body?.success !== true) {
        console.error("Web3Forms rechazó el envío:", response.status);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Web3Forms: error de red o tiempo de espera agotado:", error);
      return false;
    }
  },
};
