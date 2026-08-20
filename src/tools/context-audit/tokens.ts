export const CHARS_PER_TOKEN = 4;
export const TOKEN_METHOD = "char-approx-v1";

export function countTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
