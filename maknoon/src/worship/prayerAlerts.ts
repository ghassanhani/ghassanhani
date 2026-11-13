/** Web: no local notifications. */
export async function syncPrayerAlerts(): Promise<void> {}
export async function askAlertPermission(): Promise<boolean> {
  return false;
}
export async function previewAdhan(): Promise<void> {}
