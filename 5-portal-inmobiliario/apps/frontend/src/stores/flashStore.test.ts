import { beforeEach, describe, expect, it } from "vitest";
import { MAX_VISIBLE_FLASH_MESSAGES, useFlashStore } from "./flashStore";

describe("flashStore", () => {
  beforeEach(() => useFlashStore.setState({ messages: [] }));

  it("agrega y cierra mensajes", () => {
    useFlashStore.getState().show("success", "Hecho");
    const [message] = useFlashStore.getState().messages;
    expect(message).toMatchObject({ kind: "success", text: "Hecho" });

    useFlashStore.getState().dismiss(message.id);
    expect(useFlashStore.getState().messages).toEqual([]);
  });

  it("conserva solo los más recientes", () => {
    for (let index = 1; index <= MAX_VISIBLE_FLASH_MESSAGES + 2; index += 1) {
      useFlashStore.getState().show("info", `Mensaje ${index}`);
    }
    const texts = useFlashStore.getState().messages.map((message) => message.text);
    expect(texts).toHaveLength(MAX_VISIBLE_FLASH_MESSAGES);
    expect(texts.at(-1)).toBe(`Mensaje ${MAX_VISIBLE_FLASH_MESSAGES + 2}`);
  });
});
