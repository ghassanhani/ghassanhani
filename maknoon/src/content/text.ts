/**
 * Display-only tashkeel removal for the «إخفاء التشكيل» setting. Never applied to
 * Quran text (plan §10.3) or to ND-licensed tafsir (must be shown as published).
 */
const HARAKAT = /[ً-ٰٟ]/g;
export const stripTashkeel = (s: string) => s.replace(HARAKAT, '');
