/**
 * ══════════════════════════════════════════════════════════
 *  My Digital Career — Google Apps Script Web App
 * ══════════════════════════════════════════════════════════
 *
 *  Ce fichier est une RÉFÉRENCE. Il ne s'exécute pas dans
 *  le projet Next.js. Vous devez le copier dans Google
 *  Apps Script pour qu'il fonctionne.
 *
 *  INSTRUCTIONS :
 *  1. Allez sur https://script.google.com et ouvrez votre projet
 *  2. Collez tout ce code dans Code.gs
 *  3. Remplacez les constantes de configuration ci-dessous
 *  4. Déployez → Nouveau déploiement → Application Web
 *     - Exécuter en tant que : Moi
 *     - Qui a accès : Tout le monde
 *  5. Copiez l'URL obtenue dans .env.local → NEXT_PUBLIC_APPS_SCRIPT_URL
 *
 * ══════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════
// CONFIGURATION — À REMPLACER PAR VOS VALEURS
// ═══════════════════════════════════════════════

var SPREADSHEET_COMMANDE = 'REPLACE_WITH_SPREADSHEET_ID';
var SPREADSHEET_ID_CLIENT = 'REPLACE_WITH_SPREADSHEET_ID';
var ADMIN_SECRET_KEY = 'REPLACE_WITH_ADMIN_SECRET';
var DISCORD_WEBHOOK_NOTIFICATIONS_URL = 'REPLACE_WITH_DISCORD_NOTIFICATIONS_WEBHOOK';
var DISCORD_WEBHOOK_QUESTIONNAIRES_URL = 'REPLACE_WITH_DISCORD_QUESTIONNAIRES_WEBHOOK';
var DISCORD_WEBHOOK_CHAT_URL = 'REPLACE_WITH_DISCORD_CHAT_WEBHOOK';
var DRIVE_EWORKLIFE_FOLDER_ID = 'REPLACE_WITH_DRIVE_ROOT_FOLDER_ID';
var DRIVE_COMMANDES_CLIENT_FOLDER_ID = 'REPLACE_WITH_DRIVE_COMMANDES_FOLDER_ID';
var DRIVE_PJ_CLIENT_FOLDER_ID = 'REPLACE_WITH_DRIVE_PJ_FOLDER_ID';
var DRIVE_PJ_CLIENT_FOLDER_NAME = 'PJ CLIENT';

// ═══════════════════════════════════════════════
// NOMS DES ONGLETS
// ═══════════════════════════════════════════════

var SHEET_QUESTIONNAIRE = 'Questionnaire';
var SHEET_COMMANDES = 'Suivie des commandes';
var SHEET_ID_CLIENT = 'ID client';
var SHEET_MESSAGES = 'Message';
var SHEET_APPOINTMENTS = 'Rendez-vous';

// ═══════════════════════════════════════════════
// HANDLER POST (écriture de données)
// ═══════════════════════════════════════════════

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    switch (action) {
      case 'submitQuestionnaire':
        return handleSubmitQuestionnaire(data);
      case 'submitOrder':
        return handleSubmitOrder(data);
      case 'registerClient':
        return handleRegisterClient(data);
      case 'sendMessage':
        return handleSendMessage(data);
      case 'updateOrderStatus':
        return handleUpdateOrderStatus(data);
      case 'sendFirstVersionEmail':
        return handleSendFirstVersionEmail(data);
      case 'trackClientEvent':
        return handleTrackClientEvent(data);
      case 'sendAccountCreationEmail':
        return handleSendAccountCreationEmail(data);
      case 'sendOrderConfirmationEmail':
        return handleSendOrderConfirmationEmail(data);
      case 'sendPaymentConfirmationEmail':
        return handleSendPaymentConfirmationEmail(data);
      case 'sendAppointmentConfirmationEmail':
        return handleSendAppointmentConfirmationEmail(data);
      case 'saveAppointment':
        return handleSaveAppointment(data);
      case 'contactForm':
        return handleContactForm(data);
      default:
        return jsonResponse({ error: 'Action inconnue: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ═══════════════════════════════════════════════
// HANDLER GET (lecture de données)
// ═══════════════════════════════════════════════

function doGet(e) {
  try {
    var action = e.parameter.action;

    switch (action) {
      case 'getMessages':
        return handleGetMessages(e.parameter.email);
      case 'checkEligibility':
        return handleCheckEligibility(e.parameter.email);
      case 'getAllConversations':
        return handleGetAllConversations(e.parameter.adminKey);
      case 'getClients':
        return handleGetClients(e.parameter.adminKey);
      case 'getOrders':
        return handleGetOrders(e.parameter.adminKey);
      case 'getOrderByEmail':
        return handleGetOrderByEmail(e.parameter.email);
      case 'getQuestionnaires':
        return handleGetQuestionnaires(e.parameter.adminKey);
      case 'getAppointments':
        return handleGetAppointments(e.parameter.adminKey);
      default:
        return jsonResponse({ error: 'Action inconnue: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ═══════════════════════════════════════════════
// NUMÉRO DE COMMANDE
// ═══════════════════════════════════════════════

function generateOrderId() {
  var now = new Date();
  var y = now.getFullYear().toString().slice(-2);
  var m = ('0' + (now.getMonth() + 1)).slice(-2);
  var d = ('0' + now.getDate()).slice(-2);
  var rand = ('0000' + Math.floor(Math.random() * 10000)).slice(-4);
  return 'EW-' + y + m + d + '-' + rand;
}

// ═══════════════════════════════════════════════
// QUESTIONNAIRE → Onglet QUESTIONNAIRE
// ═══════════════════════════════════════════════

function handleSubmitQuestionnaire(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var headers = [
    'Dates', 'N° Commande', 'Nom', 'Prénom', 'Adresse mail', 'Mot de passe', 'Profession / milieu', 'Recherche d\u2019emploi',
    'Poste(s) recherché(s)', 'Objectif du E-CV', 'Requête particulière', 'Palette de couleurs', 'Style du site',
    'Réseaux sociaux', 'CV', 'Photo', 'Éléments supplémentaires', 'Autorisation', 'Dossier client', 'URL Dossier client',
    'URL CV', 'URL Photo', 'URL Extra'
  ];
  var sheet = getOrCreateSheet(ss, SHEET_QUESTIONNAIRE, headers);
  ensureSheetHeaders(sheet, headers);

  var folderDetails = getOrCreateClientAttachmentFolderDetails(data.lastName, data.firstName);
  var clientFolder = folderDetails.folder;
  var cvFile = saveUploadToFolder(clientFolder, data.cvUpload);
  var photoFile = saveUploadToFolder(clientFolder, data.photoUpload);
  var extraFiles = saveUploadsToFolder(clientFolder, data.extraUploads);
  var uploadedFiles = [];
  if (cvFile) uploadedFiles.push(cvFile.name);
  if (photoFile) uploadedFiles.push(photoFile.name);
  for (var i = 0; i < extraFiles.length; i++) {
    uploadedFiles.push(extraFiles[i].name);
  }

  sheet.appendRow([
    formatSheetDate(data.date),
    data.orderId || '',
    data.lastName || '',
    data.firstName || '',
    data.email || '',
    data.password || '',
    data.profession || '',
    data.seekingJob || '',
    data.positionsSearched || '',
    [data.motivations || '', data.motivationOther || ''].filter(Boolean).join(' | '),
    data.customRequestEnabled === 'Oui' ? (data.customRequest || 'Oui') : 'Non',
    data.colorPalette || '',
    data.siteStyle || '',
    data.socialLinks || '',
    cvFile ? cvFile.name : (data.cvFile || ''),
    photoFile ? photoFile.name : (data.photoFile || ''),
    extraFiles.length ? extraFiles.map(function (file) { return file.name; }).join(' | ') : (data.extraFile || ''),
    data.authorization || 'Non',
    clientFolder.getName(),
    clientFolder.getUrl(),
    cvFile ? cvFile.url : '',
    photoFile ? photoFile.url : '',
    extraFiles.length ? extraFiles.map(function (file) { return file.url; }).join(' | ') : ''
  ]);

  sendDiscordNotification(DISCORD_WEBHOOK_QUESTIONNAIRES_URL, 'Questionnaire reçu', [
    'Client : ' + buildClientFolderDisplayName(data.lastName, data.firstName),
    'Email : ' + (data.email || 'Non renseigné'),
    'Commande : ' + (data.orderId || 'Non renseignée'),
    'Profession : ' + (data.profession || 'Non renseignée'),
    'Recherche emploi : ' + (data.seekingJob || 'Non renseignée'),
    'Postes recherchés : ' + (data.positionsSearched || 'Non renseignés'),
    'Motivations : ' + ([data.motivations || '', data.motivationOther || ''].filter(Boolean).join(' | ') || 'Non renseignées'),
    'Palette : ' + (data.colorPalette || 'Non renseignée'),
    'Style : ' + (data.siteStyle || 'Non renseigné'),
    'Requête particulière : ' + (data.customRequestEnabled === 'Oui' ? (data.customRequest || 'Oui') : 'Non'),
    'Dossier Drive : ' + clientFolder.getUrl(),
    'CV : ' + (cvFile ? cvFile.url : 'Aucun'),
    'Photo : ' + (photoFile ? photoFile.url : 'Aucune'),
    'Extra : ' + (extraFiles.length ? extraFiles.map(function (file) { return file.url; }).join(' | ') : 'Aucun')
  ]);

  if (folderDetails.created) {
    sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'Dossier client créé', [
      'Client : ' + clientFolder.getName(),
      'Email : ' + (data.email || 'Non renseigné'),
      'Dossier Drive : ' + clientFolder.getUrl()
    ]);
  }

  if (uploadedFiles.length) {
    sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'PJ client reçues', [
      'Client : ' + clientFolder.getName(),
      'Email : ' + (data.email || 'Non renseigné'),
      'Fichiers : ' + uploadedFiles.join(', '),
      'Dossier Drive : ' + clientFolder.getUrl()
    ]);
  }

  return jsonResponse({
    success: true,
    message: 'Questionnaire enregistré',
    driveFolderName: clientFolder.getName(),
    driveFolderUrl: clientFolder.getUrl(),
    cvUrl: cvFile ? cvFile.url : '',
    photoUrl: photoFile ? photoFile.url : '',
    extraUrl: extraFiles.length ? extraFiles.map(function (file) { return file.url; }).join(' | ') : ''
  });
}

// ═══════════════════════════════════════════════
// COMMANDE → Onglet suivie commandes
// ═══════════════════════════════════════════════

function handleSubmitOrder(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = getOrCreateSheet(ss, SHEET_COMMANDES, [
    'N° Commande', 'Date', 'Nom', 'Prénom', 'Email', 'Statut',
    'Montant', 'Devise', 'Profession', 'Poste(s) recherché(s)',
    'Palette', 'Style', 'Chat Activé', 'Première Version Envoyée', 'URL Site'
  ]);

  var orderId = data.orderId || generateOrderId();
  var status = data.status || 'En attente';

  sheet.appendRow([
    orderId,
    formatSheetDate(data.date),
    data.lastName || '',
    data.firstName || '',
    data.email || '',
    status,
    data.amount || '',
    data.currency || '€',
    data.profession || '',
    data.positionsSearched || '',
    data.colorPalette || '',
    data.siteStyle || '',
    data.chatEnabled || 'Non',
    data.premierVersionEnvoyee || 'Non',
    data.siteUrl || ''
  ]);

  sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'Nouvelle commande', [
    'Commande : ' + orderId,
    'Client : ' + buildClientFolderDisplayName(data.lastName, data.firstName),
    'Email : ' + (data.email || 'Non renseigné'),
    'Montant : ' + (data.amount || '20') + ' ' + (data.currency || '€'),
    'Style : ' + (data.siteStyle || 'Non renseigné')
  ]);

  return jsonResponse({ success: true, orderId: orderId, message: 'Commande enregistrée' });
}

// ═══════════════════════════════════════════════
// CLIENT → Onglet ID client
// ═══════════════════════════════════════════════

function handleRegisterClient(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLIENT);
  var sheet = getOrCreateSheet(ss, SHEET_ID_CLIENT, [
    'Numéro de commande', 'Dates', 'Nom', 'Prénom', 'Adresse mail', 'Mot de passe'
  ]);

  var firstName = data.firstName || '';
  var lastName = data.lastName || '';
  if (!firstName && !lastName && data.name) {
    var parts = data.name.trim().split(' ');
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  sheet.appendRow([
    data.orderId || '',
    formatSheetDate(data.date),
    lastName,
    firstName,
    data.email || '',
    data.password || ''
  ]);

  return jsonResponse({ success: true, message: 'Client enregistré' });
}

// ═══════════════════════════════════════════════
// MESSAGES — Onglet message (chat)
// ═══════════════════════════════════════════════

function handleSendMessage(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var headers = [
    'ID', 'Date', 'Client Email', 'Client Nom', 'Auteur', 'Message', 'Lu', 'PJ', 'URL PJ'
  ];
  var sheet = getOrCreateSheet(ss, SHEET_MESSAGES, headers);
  ensureSheetHeaders(sheet, headers);

  var id = Utilities.getUuid();
  var chatAttachments = [];
  if (data.attachments && data.attachments.length) {
    var clientFolder = getOrCreateClientAttachmentFolderByEmail(data.clientEmail, data.clientName);
    chatAttachments = saveUploadsToFolder(clientFolder, data.attachments);
  }

  sheet.appendRow([
    id,
    data.timestamp || new Date().toISOString(),
    data.clientEmail || '',
    data.clientName || '',
    data.author || 'client',
    data.message || '',
    'Non',
    chatAttachments.length ? chatAttachments.map(function (file) { return file.name; }).join(' | ') : '',
    chatAttachments.length ? chatAttachments.map(function (file) { return file.url; }).join(' | ') : ''
  ]);

  if ((data.author || 'client') === 'client') {
    sendDiscordNotification(DISCORD_WEBHOOK_CHAT_URL, 'Nouveau message client dans le chat', [
      'Client : ' + (data.clientName || 'Client'),
      'Email : ' + (data.clientEmail || 'Non renseigné'),
      'Message : ' + truncateForDiscord(data.message || '(message vide)')
    ]);
  }

  if (chatAttachments.length) {
    sendDiscordNotification(DISCORD_WEBHOOK_CHAT_URL, 'PJ ajoutées dans le chat client', [
      'Client : ' + (data.clientName || 'Client'),
      'Email : ' + (data.clientEmail || 'Non renseigné'),
      'Fichiers : ' + chatAttachments.map(function (file) { return file.name; }).join(', '),
      'Liens : ' + chatAttachments.map(function (file) { return file.url; }).join(' | ')
    ]);
    sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'PJ client reçues', [
      'Client : ' + (data.clientName || 'Client'),
      'Email : ' + (data.clientEmail || 'Non renseigné'),
      'Fichiers : ' + chatAttachments.map(function (file) { return file.name; }).join(', ')
    ]);
  }

  return jsonResponse({
    success: true,
    id: id,
    attachments: chatAttachments
  });
}

function handleGetMessages(email) {
  if (!email) return jsonResponse({ error: 'Email requis', messages: [] });

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = ss.getSheetByName(SHEET_MESSAGES);

  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ messages: [] });
  }

  var data = sheet.getDataRange().getValues();
  var messages = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[2].toString().toLowerCase() === email.toLowerCase()) {
      messages.push({
        id: row[0],
        timestamp: row[1],
        clientEmail: row[2],
        clientName: row[3],
        author: row[4],
        message: row[5],
        read: row[6] === 'Oui',
        attachments: parseAttachmentsFromRow(row)
      });
    }
  }

  messages.sort(function (a, b) {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return jsonResponse({ messages: messages });
}

// ═══════════════════════════════════════════════
// MISE À JOUR STATUT COMMANDE (admin)
// ═══════════════════════════════════════════════

function handleUpdateOrderStatus(data) {
  if (data.adminKey !== ADMIN_SECRET_KEY) {
    return jsonResponse({ error: 'Non autorisé' });
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = ss.getSheetByName(SHEET_COMMANDES);
  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ error: 'Aucune commande' });
  }

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.orderId) {
      if (data.status) sheet.getRange(i + 1, 6).setValue(data.status);
      if (data.chatEnabled !== undefined) sheet.getRange(i + 1, 13).setValue(data.chatEnabled ? 'Oui' : 'Non');
      if (data.firstVersionSent !== undefined) sheet.getRange(i + 1, 14).setValue(data.firstVersionSent ? 'Oui' : 'Non');
      if (data.siteUrl) sheet.getRange(i + 1, 15).setValue(data.siteUrl);
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ error: 'Commande non trouvée: ' + data.orderId });
}

// ═══════════════════════════════════════════════
// EMAIL — Notification première version prête
// ═══════════════════════════════════════════════

function handleSendFirstVersionEmail(data) {
  if (data.adminKey !== ADMIN_SECRET_KEY) {
    return jsonResponse({ error: 'Non autorisé' });
  }

  var email = data.clientEmail;
  var name = data.clientName || 'Client';
  var siteUrl = data.siteUrl || '';

  var subject = 'My Digital Career — Votre E-CV est prêt !';
  var htmlBody = buildEmailTemplate(
    'Votre E-CV est prêt !',
    'Bonjour ' + name + ',',
    [
      'Votre première version de E-CV est maintenant disponible !',
      'Connectez-vous à votre espace <strong>« Mon site »</strong> avec les identifiants renseignés lors de votre commande pour découvrir votre E-CV en ligne.',
      siteUrl ? 'Votre site est accessible ici : <a href="' + siteUrl + '" style="color:#2563EB">' + siteUrl + '</a>' : ''
    ],
    'Accéder à Mon site',
    'https://mydigitalcareer.com/mon-site'
  );

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'My Digital Career'
    });

    var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
    var sheet = ss.getSheetByName(SHEET_COMMANDES);
    if (sheet && sheet.getLastRow() > 1) {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][4].toString().toLowerCase() === email.toLowerCase()) {
          sheet.getRange(i + 1, 6).setValue('Première version');
          sheet.getRange(i + 1, 13).setValue('Oui');
          sheet.getRange(i + 1, 14).setValue('Oui');
          if (data.siteUrl) sheet.getRange(i + 1, 15).setValue(data.siteUrl);
          break;
        }
      }
    }

    sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'Première version envoyée', [
      'Client : ' + name,
      'Email : ' + email,
      'URL site : ' + (siteUrl || 'Non renseignée')
    ]);

    return jsonResponse({ success: true, message: 'Email envoyé à ' + email });
  } catch (err) {
    return jsonResponse({ error: 'Erreur envoi email: ' + err.toString() });
  }
}

// ═══════════════════════════════════════════════
// EMAIL — Création de compte client
// ═══════════════════════════════════════════════

function handleSendAccountCreationEmail(data) {
  var email = data.email;
  var name = data.name || data.firstName || 'Client';
  var password = data.password || '';

  if (!email) {
    return jsonResponse({ error: 'Email requis' });
  }

  var subject = 'My Digital Career — Votre espace client est prêt';
  var htmlBody = buildEmailTemplate(
    'Bienvenue chez My Digital Career',
    'Bonjour ' + name + ',',
    [
      'Votre compte a été créé avec succès. Vous pouvez dès maintenant accéder à votre espace <strong>« Mon site »</strong> pour suivre l\'avancement de votre E-CV.',
      '<div style="background:#F8F8F6;border-radius:12px;padding:20px;margin:8px 0">'
      + '<p style="margin:0 0 8px;font-size:13px;color:#888">Vos identifiants de connexion :</p>'
      + '<p style="margin:0;font-size:15px"><strong>Email :</strong> ' + email + '</p>'
      + '<p style="margin:4px 0 0;font-size:15px"><strong>Mot de passe :</strong> ' + password + '</p>'
      + '</div>',
      'Conservez précieusement ces identifiants. Vous en aurez besoin pour accéder à votre E-CV une fois prêt.'
    ],
    'Accéder à Mon site',
    'https://mydigitalcareer.com/mon-site'
  );

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'My Digital Career'
    });

    sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'Email de bienvenue envoyé', [
      'Client : ' + name,
      'Email : ' + email
    ]);

    return jsonResponse({ success: true, message: 'Email de bienvenue envoyé à ' + email });
  } catch (err) {
    return jsonResponse({ error: 'Erreur envoi email bienvenue: ' + err.toString() });
  }
}

// ═══════════════════════════════════════════════
// EMAIL — Confirmation de commande
// ═══════════════════════════════════════════════

function handleSendOrderConfirmationEmail(data) {
  var email = data.email;
  var name = data.name || data.firstName || 'Client';
  var orderId = data.orderId || '';
  var amount = data.amount || '20';
  var currency = data.currency || '€';
  var colorPalette = data.colorPalette || '';
  var siteStyle = data.siteStyle || '';

  if (!email) {
    return jsonResponse({ error: 'Email requis' });
  }

  var subject = 'My Digital Career — Confirmation de commande' + (orderId ? ' ' + orderId : '');
  var htmlBody = buildEmailTemplate(
    'Commande confirmée' + (orderId ? ' — ' + orderId : ''),
    'Bonjour ' + name + ',',
    [
      'Votre commande de E-CV a bien été enregistrée. Merci pour votre confiance !',
      '<div style="background:#F8F8F6;border-radius:12px;padding:20px;margin:8px 0">'
      + '<p style="margin:0 0 6px;font-size:13px;color:#888">Récapitulatif :</p>'
      + (orderId ? '<p style="margin:0 0 4px;font-size:14px"><strong>N° Commande :</strong> ' + orderId + '</p>' : '')
      + '<p style="margin:0 0 4px;font-size:14px"><strong>Montant :</strong> ' + amount + ' ' + currency + '</p>'
      + (colorPalette ? '<p style="margin:0 0 4px;font-size:14px"><strong>Palette :</strong> ' + colorPalette + '</p>' : '')
      + (siteStyle ? '<p style="margin:0;font-size:14px"><strong>Style :</strong> ' + siteStyle + '</p>' : '')
      + '</div>',
      '<strong>Prochaine étape :</strong> nous commençons la création de votre E-CV. Vous recevrez un email dès que la première version sera prête (sous 24 h).',
      'En attendant, vous pouvez suivre l\'avancement depuis votre espace <strong>« Mon site »</strong>.'
    ],
    'Suivre ma commande',
    'https://mydigitalcareer.com/mon-site'
  );

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'My Digital Career'
    });

    return jsonResponse({ success: true, message: 'Email de confirmation envoyé à ' + email });
  } catch (err) {
    return jsonResponse({ error: 'Erreur envoi email confirmation: ' + err.toString() });
  }
}

// ═══════════════════════════════════════════════
// EMAIL — Confirmation de paiement
// ═══════════════════════════════════════════════

function handleSendPaymentConfirmationEmail(data) {
  var email = data.email;
  var name = data.name || data.firstName || 'Client';
  var orderId = data.orderId || '';
  var amount = data.amount || '20';
  var currency = data.currency || '€';

  if (!email) {
    return jsonResponse({ error: 'Email requis' });
  }

  var subject = 'My Digital Career — Paiement confirmé' + (orderId ? ' ' + orderId : '');
  var htmlBody = buildEmailTemplate(
    'Paiement confirmé' + (orderId ? ' — ' + orderId : ''),
    'Bonjour ' + name + ',',
    [
      'Votre paiement a bien été reçu. Merci pour votre confiance.',
      '<div style="background:#F8F8F6;border-radius:12px;padding:20px;margin:8px 0">'
      + '<p style="margin:0 0 6px;font-size:13px;color:#888">Récapitulatif :</p>'
      + (orderId ? '<p style="margin:0 0 4px;font-size:14px"><strong>N° Commande :</strong> ' + orderId + '</p>' : '')
      + '<p style="margin:0;font-size:14px"><strong>Montant réglé :</strong> ' + amount + ' ' + currency + '</p>'
      + '</div>',
      'Votre commande passe maintenant en traitement. Vous recevrez un email dès que la première version sera prête.',
      'Vous pouvez suivre l’avancement à tout moment depuis votre espace <strong>« Mon site »</strong>.'
    ],
    'Suivre ma commande',
    'https://mydigitalcareer.com/mon-site'
  );

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'My Digital Career'
    });

    return jsonResponse({ success: true, message: 'Email de confirmation paiement envoyé à ' + email });
  } catch (err) {
    return jsonResponse({ error: 'Erreur envoi email paiement: ' + err.toString() });
  }
}

// ═══════════════════════════════════════════════
// EMAIL — Confirmation de rendez-vous
// ═══════════════════════════════════════════════

function handleSendAppointmentConfirmationEmail(data) {
  var email = data.email;
  var name = data.name || data.firstName || 'Client';
  var dateLabel = data.dateLabel || '';
  var timeLabel = data.timeLabel || '';
  var meetLink = data.meetLink || '';
  var durationMinutes = data.durationMinutes || 60;

  if (!email) {
    return jsonResponse({ error: 'Email requis' });
  }

  var subject = 'My Digital Career — Rendez-vous confirmé';
  var htmlBody = buildEmailTemplate(
    'Rendez-vous confirmé',
    'Bonjour ' + name + ',',
    [
      'Votre rendez-vous a bien été enregistré.',
      '<div style="background:#F8F8F6;border-radius:12px;padding:20px;margin:8px 0">'
      + '<p style="margin:0 0 6px;font-size:13px;color:#888">Détails du rendez-vous :</p>'
      + (dateLabel ? '<p style="margin:0 0 4px;font-size:14px"><strong>Date :</strong> ' + dateLabel + '</p>' : '')
      + (timeLabel ? '<p style="margin:0 0 4px;font-size:14px"><strong>Heure :</strong> ' + timeLabel + '</p>' : '')
      + '<p style="margin:0 0 4px;font-size:14px"><strong>Durée :</strong> ' + durationMinutes + ' minutes</p>'
      + '<p style="margin:0;font-size:14px"><strong>Mode :</strong> Google Meet</p>'
      + '</div>',
      meetLink
        ? 'Rejoignez la réunion le jour J : <a href="' + meetLink + '" style="color:#2563EB;font-weight:600">' + meetLink + '</a>'
        : 'Le lien Google Meet vous sera communiqué par email avant le rendez-vous.',
      'Si vous avez besoin de modifier votre créneau, contactez-nous directement.'
    ],
    meetLink ? 'Rejoindre le Meet' : 'Mon espace client',
    meetLink || 'https://mydigitalcareer.com/mon-site'
  );

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'My Digital Career'
    });

    return jsonResponse({ success: true, message: 'Email de confirmation RDV envoyé à ' + email });
  } catch (err) {
    return jsonResponse({ error: 'Erreur envoi email RDV: ' + err.toString() });
  }
}

// ═══════════════════════════════════════════════
// RENDEZ-VOUS → Onglet Rendez-vous + Discord
// ═══════════════════════════════════════════════

function handleSaveAppointment(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var headers = [
    'ID', 'Date création', 'Email', 'Nom', 'Prénom',
    'Début (UTC)', 'Fin (UTC)', 'Durée (min)',
    'Mode', 'Lien Meet', 'Event ID', 'N° Commande'
  ];
  var sheet = getOrCreateSheet(ss, SHEET_APPOINTMENTS, headers);
  ensureSheetHeaders(sheet, headers);

  sheet.appendRow([
    data.id || Utilities.getUuid(),
    formatSheetDate(data.createdAt),
    data.email || '',
    data.lastName || '',
    data.firstName || '',
    data.startAt || '',
    data.endAt || '',
    data.durationMinutes || 60,
    data.mode || 'google_meet',
    data.meetLink || '',
    data.eventId || '',
    data.orderId || ''
  ]);

  // Notification Discord pour chaque nouveau rendez-vous
  var clientName = ((data.firstName || '') + ' ' + (data.lastName || '')).trim();
  var dateDisplay = data.dateLabel || data.startAt || '';
  var timeDisplay = data.timeLabel || '';

  sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'Nouveau rendez-vous réservé', [
    'Client : ' + (clientName || 'Non renseigné'),
    'Email : ' + (data.email || 'Non renseigné'),
    'Date : ' + dateDisplay,
    'Heure : ' + (timeDisplay || 'Voir Calendar'),
    'Mode : Google Meet',
    'Lien : ' + (data.meetLink || 'En attente'),
    'Commande : ' + (data.orderId || 'Non renseignée')
  ]);

  return jsonResponse({ success: true, message: 'Rendez-vous enregistré' });
}

function handleGetAppointments(adminKey) {
  if (adminKey !== ADMIN_SECRET_KEY) {
    return jsonResponse({ error: 'Non autorisé' });
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = ss.getSheetByName(SHEET_APPOINTMENTS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ appointments: [] });
  }

  var data = sheet.getDataRange().getValues();
  var appointments = [];

  for (var i = 1; i < data.length; i++) {
    appointments.push({
      id: data[i][0],
      createdAt: data[i][1],
      email: data[i][2],
      lastName: data[i][3],
      firstName: data[i][4],
      startAt: data[i][5],
      endAt: data[i][6],
      durationMinutes: data[i][7],
      mode: data[i][8],
      meetLink: data[i][9],
      eventId: data[i][10],
      orderId: data[i][11]
    });
  }

  return jsonResponse({ appointments: appointments });
}

// ═══════════════════════════════════════════════
// FORMULAIRE DE CONTACT
// ═══════════════════════════════════════════════

function handleContactForm(data) {
  var name = data.name || 'Anonyme';
  var email = data.email || '';
  var message = data.message || '';

  if (!email || !message) {
    return jsonResponse({ error: 'Email et message requis' });
  }

  sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'Nouveau message de contact', [
    'Nom : ' + name,
    'Email : ' + email,
    'Message : ' + truncateForDiscord(message)
  ]);

  // Optionnel : notifier l'admin par email
  try {
    MailApp.sendEmail({
      to: 'mydigitalcareer.support@gmail.com',
      subject: 'My Digital Career — Nouveau message de contact de ' + name,
      htmlBody: '<p><strong>De :</strong> ' + name + ' (' + email + ')</p><p><strong>Message :</strong></p><p>' + message.replace(/\n/g, '<br>') + '</p>',
      replyTo: email,
      name: 'My Digital Career Contact'
    });
  } catch (err) {
    Logger.log('Erreur envoi email contact: ' + err);
  }

  return jsonResponse({ success: true, message: 'Message envoyé' });
}

// ═══════════════════════════════════════════════
// TRACK CLIENT EVENT
// ═══════════════════════════════════════════════

function handleTrackClientEvent(data) {
  var eventName = (data.event || '').toString();
  var email = (data.email || '').toString();
  var clientName = (data.clientName || 'Client').toString();
  var orderId = (data.orderId || '').toString();

  if (!eventName || !email) {
    return jsonResponse({ error: 'Event et email requis' });
  }

  if (eventName === 'preview_viewed') {
    sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'Première version visionnée', [
      'Client : ' + clientName,
      'Email : ' + email,
      'Commande : ' + (orderId || 'Non renseignée')
    ]);
  } else if (eventName === 'site_approved') {
    sendDiscordNotification(DISCORD_WEBHOOK_NOTIFICATIONS_URL, 'Validation finale du client', [
      'Client : ' + clientName,
      'Email : ' + email,
      'Commande : ' + (orderId || 'Non renseignée')
    ]);
  } else {
    return jsonResponse({ error: 'Event inconnu: ' + eventName });
  }

  return jsonResponse({ success: true, event: eventName });
}

// ═══════════════════════════════════════════════
// ÉLIGIBILITÉ CHAT
// ═══════════════════════════════════════════════

function handleCheckEligibility(email) {
  if (!email) return jsonResponse({ eligible: false });

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = ss.getSheetByName(SHEET_COMMANDES);

  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ eligible: false });
  }

  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowEmail = row[4].toString().toLowerCase();
    var chatEnabled = row[12].toString().toLowerCase();

    if (rowEmail === email.toLowerCase() && (chatEnabled === 'oui' || chatEnabled === 'yes')) {
      return jsonResponse({
        eligible: true,
        chatEnabled: true,
        clientName: (row[3] + ' ' + row[2]).trim(),
        orderStatus: row[5]
      });
    }
  }

  return jsonResponse({ eligible: false });
}

// ═══════════════════════════════════════════════
// ADMIN — Toutes les conversations
// ═══════════════════════════════════════════════

function handleGetAllConversations(adminKey) {
  if (adminKey !== ADMIN_SECRET_KEY) {
    return jsonResponse({ error: 'Non autorisé' });
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);

  var msgSheet = ss.getSheetByName(SHEET_MESSAGES);
  var allMessages = [];

  if (msgSheet && msgSheet.getLastRow() > 1) {
    var msgData = msgSheet.getDataRange().getValues();
    for (var i = 1; i < msgData.length; i++) {
      allMessages.push({
        id: msgData[i][0],
        timestamp: msgData[i][1],
        clientEmail: msgData[i][2],
        clientName: msgData[i][3],
        author: msgData[i][4],
        message: msgData[i][5],
        read: msgData[i][6] === 'Oui',
        attachments: parseAttachmentsFromRow(msgData[i])
      });
    }
  }

  var orderSheet = ss.getSheetByName(SHEET_COMMANDES);
  var orderMap = {};

  if (orderSheet && orderSheet.getLastRow() > 1) {
    var orderData = orderSheet.getDataRange().getValues();
    for (var j = 1; j < orderData.length; j++) {
      var oEmail = orderData[j][4].toString().toLowerCase();
      orderMap[oEmail] = {
        status: orderData[j][5],
        chatEnabled: orderData[j][12]
      };
    }
  }

  var convMap = {};

  for (var k = 0; k < allMessages.length; k++) {
    var msg = allMessages[k];
    var key = msg.clientEmail.toLowerCase();

    if (!convMap[key]) {
      var order = orderMap[key] || {};
      convMap[key] = {
        clientEmail: msg.clientEmail,
        clientName: msg.clientName,
        orderStatus: order.status || 'Inconnu',
        chatEnabled: (order.chatEnabled || '').toString().toLowerCase() === 'oui',
        messages: [],
        unreadCount: 0
      };
    }

    convMap[key].messages.push(msg);
    if (msg.author === 'client' && !msg.read) {
      convMap[key].unreadCount++;
    }
  }

  var conversations = [];
  for (var email in convMap) {
    var conv = convMap[email];
    conv.messages.sort(function (a, b) {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    if (conv.messages.length > 0) {
      var last = conv.messages[conv.messages.length - 1];
      conv.lastMessage = last.message;
      conv.lastMessageDate = last.timestamp;
    }

    conversations.push(conv);
  }

  conversations.sort(function (a, b) {
    return new Date(b.lastMessageDate || 0).getTime() - new Date(a.lastMessageDate || 0).getTime();
  });

  return jsonResponse({ conversations: conversations });
}

// ═══════════════════════════════════════════════
// ADMIN — Liste des clients
// ═══════════════════════════════════════════════

function handleGetClients(adminKey) {
  if (adminKey !== ADMIN_SECRET_KEY) {
    return jsonResponse({ error: 'Non autorisé' });
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CLIENT);
  var sheet = ss.getSheetByName(SHEET_ID_CLIENT);

  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ clients: [] });
  }

  var data = sheet.getDataRange().getValues();
  var clients = [];

  for (var i = 1; i < data.length; i++) {
    clients.push({
      orderId: data[i][0],
      date: data[i][1],
      lastName: data[i][2],
      firstName: data[i][3],
      name: ((data[i][3] || '') + ' ' + (data[i][2] || '')).trim(),
      email: data[i][4],
      siteUrl: '',
      status: 'Actif'
    });
  }

  return jsonResponse({ clients: clients });
}

// ═══════════════════════════════════════════════
// ADMIN — Liste des commandes
// ═══════════════════════════════════════════════

function handleGetOrders(adminKey) {
  if (adminKey !== ADMIN_SECRET_KEY) {
    return jsonResponse({ error: 'Non autorisé' });
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = ss.getSheetByName(SHEET_COMMANDES);

  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ orders: [] });
  }

  var data = sheet.getDataRange().getValues();
  var orders = [];

  for (var i = 1; i < data.length; i++) {
    orders.push({
      orderId: data[i][0],
      date: data[i][1],
      lastName: data[i][2],
      firstName: data[i][3],
      name: ((data[i][3] || '') + ' ' + (data[i][2] || '')).trim(),
      email: data[i][4],
      status: data[i][5],
      amount: data[i][6],
      currency: data[i][7],
      profession: data[i][8],
      positionsSearched: data[i][9],
      colorPalette: data[i][10],
      siteStyle: data[i][11],
      chatEnabled: data[i][12] === 'Oui',
      firstVersionSent: data[i][13] === 'Oui',
      siteUrl: data[i][14] || ''
    });
  }

  return jsonResponse({ orders: orders });
}

// ═══════════════════════════════════════════════
// CLIENT — Récupérer sa commande par email
// ═══════════════════════════════════════════════

function handleGetOrderByEmail(email) {
  if (!email) return jsonResponse({ error: 'Email requis' });

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = ss.getSheetByName(SHEET_COMMANDES);

  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ order: null });
  }

  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][4].toString().toLowerCase() === email.toLowerCase()) {
      return jsonResponse({
        order: {
          orderId: data[i][0],
          date: data[i][1],
          status: data[i][5],
          firstVersionSent: data[i][13] === 'Oui',
          siteUrl: data[i][14] || ''
        }
      });
    }
  }

  return jsonResponse({ order: null });
}


// ===============================================
// ADMIN - Liste des questionnaires
// ===============================================

function handleGetQuestionnaires(adminKey) {
  if (adminKey !== ADMIN_SECRET_KEY) {
    return jsonResponse({ error: 'Non autorise' });
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = ss.getSheetByName(SHEET_QUESTIONNAIRE);

  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ questionnaires: [] });
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var headerMap = buildHeaderMap(headers);
  var questionnaires = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    questionnaires.push({
      date: getRowValue(row, headerMap, ['Dates', 'Date']).toString(),
      orderId: getRowValue(row, headerMap, ['N° Commande', 'Numero de commande']).toString(),
      lastName: getRowValue(row, headerMap, ['Nom']).toString(),
      firstName: getRowValue(row, headerMap, ['Prénom']).toString(),
      email: getRowValue(row, headerMap, ['Adresse mail', 'Email']).toString(),
      profession: getRowValue(row, headerMap, ['Profession / milieu', 'Profession']).toString(),
      seekingJob: getRowValue(row, headerMap, ['Recherche d\u2019emploi', "Recherche d'emploi"]).toString(),
      positionsSearched: getRowValue(row, headerMap, ['Poste(s) recherché(s)', 'Postes recherches']).toString(),
      motivations: getRowValue(row, headerMap, ['Objectif du E-CV', 'Motivations']).toString(),
      customRequest: getRowValue(row, headerMap, ['Requête particulière', 'Requete']).toString(),
      colorPalette: getRowValue(row, headerMap, ['Palette de couleurs', 'Palette']).toString(),
      siteStyle: getRowValue(row, headerMap, ['Style du site', 'Style']).toString(),
      socialLinks: getRowValue(row, headerMap, ['Réseaux sociaux']).toString(),
      cv: getRowValue(row, headerMap, ['CV']).toString(),
      photo: getRowValue(row, headerMap, ['Photo']).toString(),
      extras: getRowValue(row, headerMap, ['Éléments supplémentaires', 'Extras']).toString(),
      authorization: getRowValue(row, headerMap, ['Autorisation']).toString(),
      driveFolderName: getRowValue(row, headerMap, ['Dossier client']).toString(),
      driveFolderUrl: getRowValue(row, headerMap, ['URL Dossier client']).toString(),
      cvUrl: getRowValue(row, headerMap, ['URL CV']).toString(),
      photoUrl: getRowValue(row, headerMap, ['URL Photo']).toString(),
      extraUrl: getRowValue(row, headerMap, ['URL Extra']).toString()
    });
  }

  return jsonResponse({ questionnaires: questionnaires });
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f4f6');
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange2 = sheet.getRange(1, 1, 1, headers.length);
    headerRange2.setFontWeight('bold');
    headerRange2.setBackground('#f3f4f6');
  }
  return sheet;
}

function ensureSheetHeaders(sheet, headers) {
  for (var i = 0; i < headers.length; i++) {
    var cell = sheet.getRange(1, i + 1);
    if (!cell.getValue()) {
      cell.setValue(headers[i]);
      cell.setFontWeight('bold');
      cell.setBackground('#f3f4f6');
    }
  }
}

function getClientAttachmentsRootFolder() {
  if (DRIVE_PJ_CLIENT_FOLDER_ID) {
    return DriveApp.getFolderById(DRIVE_PJ_CLIENT_FOLDER_ID);
  }

  var commandesFolder = DriveApp.getFolderById(DRIVE_COMMANDES_CLIENT_FOLDER_ID);
  var folders = commandesFolder.getFoldersByName(DRIVE_PJ_CLIENT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return commandesFolder.createFolder(DRIVE_PJ_CLIENT_FOLDER_NAME);
}

function getOrCreateClientAttachmentFolder(lastName, firstName) {
  return getOrCreateClientAttachmentFolderDetails(lastName, firstName).folder;
}

function getOrCreateClientAttachmentFolderDetails(lastName, firstName) {
  var rootFolder = getClientAttachmentsRootFolder();
  var folderName = buildClientFolderDisplayName(lastName, firstName);
  var folders = rootFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return {
      folder: folders.next(),
      created: false
    };
  }

  return {
    folder: rootFolder.createFolder(folderName),
    created: true
  };
}

function getOrCreateClientAttachmentFolderByEmail(email, clientName) {
  var folderFromSheet = findClientAttachmentFolderByEmail(email);
  if (folderFromSheet) {
    return folderFromSheet;
  }

  var fallbackName = (clientName || '').toString().trim().split(' ');
  var firstName = fallbackName.length ? fallbackName[0] : '';
  var lastName = fallbackName.length > 1 ? fallbackName.slice(1).join(' ') : '';
  return getOrCreateClientAttachmentFolder(lastName, firstName);
}

function findClientAttachmentFolderByEmail(email) {
  if (!email) {
    return null;
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_COMMANDE);
  var sheet = ss.getSheetByName(SHEET_QUESTIONNAIRE);
  if (!sheet || sheet.getLastRow() <= 1) {
    return null;
  }

  var rows = sheet.getDataRange().getValues();
  var headerMap = buildHeaderMap(rows[0] || []);
  for (var i = rows.length - 1; i >= 1; i--) {
    var rowEmail = getRowValue(rows[i], headerMap, ['Adresse mail', 'Email']);
    if (rowEmail.toString().toLowerCase() === email.toLowerCase()) {
      var folderName = getRowValue(rows[i], headerMap, ['Dossier client', 'Dossier PJ']);
      if (folderName) {
        var rootFolder = getClientAttachmentsRootFolder();
        var folders = rootFolder.getFoldersByName(folderName.toString());
        if (folders.hasNext()) {
          return folders.next();
        }
      }
      return getOrCreateClientAttachmentFolder(
        getRowValue(rows[i], headerMap, ['Nom']) || '',
        getRowValue(rows[i], headerMap, ['Prénom']) || ''
      );
    }
  }

  return null;
}

function buildHeaderMap(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var key = (headers[i] || '').toString().trim();
    if (key) {
      map[key] = i;
    }
  }
  return map;
}

function getRowValue(row, headerMap, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var header = candidates[i];
    if (Object.prototype.hasOwnProperty.call(headerMap, header)) {
      return row[headerMap[header]];
    }
  }
  return '';
}

function buildClientFolderDisplayName(lastName, firstName) {
  var safeLastName = (lastName || '').toString().trim();
  var safeFirstName = (firstName || '').toString().trim();
  var fullName = (safeLastName + ' ' + safeFirstName).trim();
  return fullName || 'Client sans nom';
}

function saveUploadToFolder(folder, upload) {
  if (!folder || !upload || !upload.base64 || !upload.name) {
    return null;
  }

  var bytes = Utilities.base64Decode(upload.base64);
  var contentType = upload.mimeType || 'application/octet-stream';
  var blob = Utilities.newBlob(bytes, contentType, upload.name);
  var file = folder.createFile(blob);

  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl()
  };
}

function saveUploadsToFolder(folder, uploads) {
  if (!uploads || !uploads.length) {
    return [];
  }

  var files = [];
  for (var i = 0; i < uploads.length; i++) {
    var saved = saveUploadToFolder(folder, uploads[i]);
    if (saved) {
      files.push(saved);
    }
  }
  return files;
}

function parseAttachmentsFromRow(row) {
  var names = (row[7] || '').toString();
  var urls = (row[8] || '').toString();

  if (!names) {
    return [];
  }

  var namesList = names.split(' | ');
  var urlsList = urls ? urls.split(' | ') : [];
  var attachments = [];

  for (var i = 0; i < namesList.length; i++) {
    attachments.push({
      name: namesList[i],
      url: urlsList[i] || ''
    });
  }

  return attachments;
}

function formatSheetDate(input) {
  var date = input ? new Date(input) : new Date();
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yy');
}

function authorizeMyDigitalCareerServices() {
  SpreadsheetApp.openById(SPREADSHEET_COMMANDE).getSheets();
  DriveApp.getFolderById(DRIVE_PJ_CLIENT_FOLDER_ID).getName();
  UrlFetchApp.fetch('https://discord.com', {
    method: 'get',
    muteHttpExceptions: true,
  });
  return 'Autorisations My Digital Career validées';
}

function truncateForDiscord(value) {
  var text = (value || '').toString().trim();
  if (!text) {
    return 'Aucun texte';
  }
  if (text.length <= 180) {
    return text;
  }
  return text.slice(0, 177) + '...';
}

function sendDiscordNotification(webhookUrl, title, lines) {
  if (!webhookUrl || webhookUrl.indexOf('REMPLACER_PAR_WEBHOOK') === 0) {
    return;
  }

  var cleanedLines = [];
  for (var i = 0; i < lines.length; i++) {
    if (lines[i]) {
      cleanedLines.push(lines[i]);
    }
  }

  if (!cleanedLines.length) {
    return;
  }

  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        username: 'My Digital Career Bot',
        embeds: [{
          title: title,
          description: cleanedLines.join('\n'),
          color: 9868950,
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    Logger.log('Discord webhook error: ' + err);
  }
}

// ═══════════════════════════════════════════════
// TEMPLATE EMAIL RÉUTILISABLE
// ═══════════════════════════════════════════════

function buildEmailTemplate(title, greeting, paragraphs, ctaLabel, ctaUrl) {
  var bodyParagraphs = '';
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i]) {
      bodyParagraphs += '<p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 16px">' + paragraphs[i] + '</p>';
    }
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
    + '<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#F5F5F0;padding:40px 20px">'
    + '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">'
    + '<div style="background:#0D0D0D;padding:32px 40px;text-align:center">'
    + '<h1 style="color:#fff;font-size:22px;margin:0;font-weight:600">My Digital Career</h1>'
    + '</div>'
    + '<div style="padding:40px">'
    + '<h2 style="color:#0D0D0D;font-size:20px;margin:0 0 8px">' + title + '</h2>'
    + '<p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px">' + greeting + '</p>'
    + bodyParagraphs
    + (ctaLabel && ctaUrl
      ? '<a href="' + ctaUrl + '" style="display:inline-block;background:#0D0D0D;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px">'
        + ctaLabel + '</a>'
      : '')
    + '<p style="color:#999;font-size:13px;margin:32px 0 0;line-height:1.6">'
    + 'Si vous avez des questions, répondez directement à cet email ou utilisez la messagerie intégrée.</p>'
    + '</div>'
    + '<div style="background:#FAFAF8;padding:20px 40px;text-align:center;border-top:1px solid #eee">'
    + '<p style="color:#999;font-size:12px;margin:0">My Digital Career — Votre image professionnelle, réinventée.</p>'
    + '</div></div></body></html>';
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
