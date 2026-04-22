/**
 * Google configuration.
 *
 * All values are read from environment variables.
 * See .env.local (ignored by git) and .env.example (template).
 *
 * NOTE: appsScriptUrl is kept for backward compatibility during migration.
 * The target architecture uses direct Google Sheets API (lib/googleSheetsApi.ts).
 */

export const googleConfig = {
  /** @deprecated Use direct Sheets API instead. Kept only for legacy features not yet migrated. */
  appsScriptUrl:
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
    '',

  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',

  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
}
