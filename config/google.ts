/**
 * Configuration Google Sheets & Apps Script.
 *
 * Les valeurs sensibles sont lues depuis les variables d'environnement.
 * Voir .env.local (ignoré par git) et .env.example (template).
 */

export const googleConfig = {
  appsScriptUrl: process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '',

  spreadsheetIds: {
    commandeClient: '1dxEE12fXMzXi2NPzviiy9jm1uiFDo0hRApCkiQFipw0',
    idClient: '1dxEE12fXMzXi2NPzviiy9jm1uiFDo0hRApCkiQFipw0',
  },
}
