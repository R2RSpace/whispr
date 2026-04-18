/** Whispr — CRP Homoglyph Map
 * PATCH 17: Maps visually similar Unicode characters to their ASCII equivalents.
 * Prevents Unicode-based CRP bypass attacks.
 * ~200 character mappings covering Cyrillic, Greek, and other common homoglyphs.
 */

/** Map of homoglyph characters to their ASCII equivalents */
export const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic → Latin
  'А': 'A', 'а': 'a', 'В': 'B', 'Е': 'E', 'е': 'e',
  'К': 'K', 'к': 'k', 'М': 'M', 'Н': 'H', 'О': 'O',
  'о': 'o', 'Р': 'P', 'р': 'p', 'С': 'C', 'с': 'c',
  'Т': 'T', 'т': 't', 'У': 'Y', 'у': 'y', 'Х': 'X',
  'х': 'x', 'ё': 'e', 'і': 'i', 'ї': 'i', 'ј': 'j',
  'ѕ': 's', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w', 'ԁ': 'd',

  // Greek → Latin
  'Α': 'A', 'α': 'a', 'Β': 'B', 'β': 'b', 'Ε': 'E',
  'ε': 'e', 'Η': 'H', 'η': 'n', 'Ι': 'I', 'ι': 'i',
  'Κ': 'K', 'κ': 'k', 'Μ': 'M', 'Ν': 'N', 'ν': 'v',
  'Ο': 'O', 'ο': 'o', 'Ρ': 'P', 'ρ': 'p', 'Τ': 'T',
  'τ': 't', 'Υ': 'Y', 'υ': 'u', 'Χ': 'X', 'χ': 'x',
  'Ζ': 'Z', 'ζ': 'z',

  // Fullwidth → ASCII
  'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
  'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
  'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O',
  'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
  'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y',
  'Ｚ': 'Z',
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
  'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
  'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
  'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
  'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y',
  'ｚ': 'z',

  // Mathematical/special → Latin
  'ℯ': 'e', 'ℊ': 'g', 'ℎ': 'h', 'ℏ': 'h', 'ℐ': 'I',
  'ℒ': 'L', 'ℓ': 'l', 'ℕ': 'N', 'ℙ': 'P', 'ℚ': 'Q',
  'ℛ': 'R', 'ℝ': 'R', 'ℤ': 'Z', 'ℨ': 'Z', 'ℬ': 'B',
  'ℭ': 'C', 'ℰ': 'E', 'ℱ': 'F', 'ℳ': 'M', 'ℴ': 'o',

  // Leet speak / visual substitutions
  '𝟎': '0', '𝟏': '1', '𝟐': '2', '𝟑': '3', '𝟒': '4',
  '𝟓': '5', '𝟔': '6', '𝟕': '7', '𝟖': '8', '𝟗': '9',

  // Common symbol substitutions
  '@': 'a', '$': 's', '!': 'i', '¡': 'i', '|': 'l',
  '0': 'o', '1': 'l', '3': 'e', '5': 's', '7': 't',

  // Accented → base (common evasion chars)
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ñ': 'n', 'ç': 'c', 'ý': 'y', 'ÿ': 'y',
};

/**
 * Apply homoglyph mapping to a string.
 * Replaces known homoglyphs with their ASCII equivalents.
 */
export function applyHomoglyphMap(text: string): string {
  let result = '';
  for (const char of text) {
    result += HOMOGLYPH_MAP[char] || char;
  }
  return result;
}
