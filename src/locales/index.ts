import type { Language, Translations } from "@/lib/i18n";

import { ar } from "./ar";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { hi } from "./hi";
import { it } from "./it";
import { ja } from "./ja";
import { ko } from "./ko";
import { pt } from "./pt";
import { ru } from "./ru";
import { zh } from "./zh";

/**
 * Complete translations mapping for all supported languages
 *
 * Contains translation objects for all supported languages in the application.
 * Used by the i18n system to provide localized content.
 */
export const translations: Record<Language, Translations> = {
  en,
  zh,
  ja,
  es,
  ko,
  fr,
  de,
  ru,
  pt,
  it,
  ar,
  hi,
};

/**
 * Get translations for a specific language
 *
 * Retrieves the translation object for the specified language.
 * Falls back to English if the requested language is not available.
 *
 * @param language - Language code to get translations for
 * @returns Translation object for the specified language
 *
 * @example
 * ```typescript
 * const zhTranslations = getTranslations('zh');
 * const fallbackTranslations = getTranslations('unsupported' as Language);
 * // Returns English translations as fallback
 * ```
 */
export const getTranslations = (language: Language): Translations => {
  return translations[language] || translations.en;
};
