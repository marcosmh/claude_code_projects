// Pictogramas, banderas, modificadores de tono, uniones ZWJ, selector de variación, keycap y espacios.
const EMOJI_ONLY =
  /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\u200d|\ufe0f|\u20e3|\s)+$/u

// Por encima de este tamaño ya es un párrafo de emojis, no un "mensaje de emojis" destacable.
const MAX_JUMBO_CODE_POINTS = 24

// true si el mensaje son solo emojis (🔥🚀🎉): se muestra más grande, como en las apps de mensajería.
export function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.length > 0 && [...trimmed].length <= MAX_JUMBO_CODE_POINTS && EMOJI_ONLY.test(trimmed)
}
