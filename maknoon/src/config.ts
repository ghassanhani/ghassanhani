import Constants from 'expo-constants';

/**
 * The app name lives in ONE place: `expo.name` in app.json (the trademark check is
 * still open — CLAUDE.md). Every screen that prints the name reads APP_NAME.
 */
export const APP_NAME: string = Constants.expoConfig?.name ?? 'المكنون';

/**
 * Calculators ship only after the scholar-validated test cases pass (SPEC §2.10).
 * Flip to true together with the test suite the scholar signed off.
 */
export const CALCULATORS_REVIEWED = { zakat: false, inheritance: false } as const;
