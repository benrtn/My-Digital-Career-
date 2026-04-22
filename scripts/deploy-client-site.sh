#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  My Digital Career — Script de déploiement site client
# ═══════════════════════════════════════════════════════════
#
#  Ce script prend un fichier .zip contenant le site client,
#  le décompresse, et met à jour les fichiers nécessaires
#  pour rendre le site accessible via "Mon site".
#
#  USAGE :
#    ./scripts/deploy-client-site.sh <client-id> <chemin-du-zip> [url-netlify]
#
#  EXEMPLES :
#    ./scripts/deploy-client-site.sh azzeddine ~/Downloads/azzeddine-site.zip
#    ./scripts/deploy-client-site.sh nouveau-client ~/Downloads/site.zip https://mon-client.netlify.app
#
#  ACTIONS :
#    1. Décompresse le .zip dans public/clients-sites/<client-id>/
#    2. Copie le screenshot/preview si présent
#    3. Met à jour la redirection HTML dans public/client-downloads/
#    4. Affiche les instructions de finalisation admin
#
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ── Couleurs ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Arguments ──
if [ $# -lt 2 ]; then
  echo -e "${RED}Usage: $0 <client-id> <chemin-du-zip> [url-netlify]${NC}"
  echo ""
  echo "  client-id     : identifiant du client (ex: azzeddine, manon)"
  echo "  chemin-du-zip : chemin vers le fichier .zip du site client"
  echo "  url-netlify   : (optionnel) URL Netlify du site client"
  exit 1
fi

CLIENT_ID="$1"
ZIP_PATH="$2"
NETLIFY_URL="${3:-}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  My Digital Career — Déploiement client${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo -e "Client ID  : ${GREEN}${CLIENT_ID}${NC}"
echo -e "ZIP        : ${GREEN}${ZIP_PATH}${NC}"
echo -e "Netlify    : ${GREEN}${NETLIFY_URL:-non spécifié}${NC}"
echo ""

# ── Vérifications ──
if [ ! -f "$ZIP_PATH" ]; then
  echo -e "${RED}Erreur : fichier introuvable — ${ZIP_PATH}${NC}"
  exit 1
fi

# ── Création des répertoires ──
SITE_DIR="$PROJECT_ROOT/public/clients-sites/$CLIENT_ID"
DOWNLOAD_DIR="$PROJECT_ROOT/public/client-downloads"

mkdir -p "$SITE_DIR"
mkdir -p "$DOWNLOAD_DIR"

# ── Copie du zip dans clients-sites ──
echo -e "${YELLOW}→ Copie du zip...${NC}"
cp "$ZIP_PATH" "$PROJECT_ROOT/public/clients-sites/${CLIENT_ID}-site.zip"

# ── Décompression ──
echo -e "${YELLOW}→ Décompression dans ${SITE_DIR}...${NC}"
TEMP_DIR=$(mktemp -d)
unzip -q -o "$ZIP_PATH" -d "$TEMP_DIR"

# Trouver le dossier racine (parfois le zip contient un sous-dossier)
INNER=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)
if [ -n "$INNER" ] && [ -f "$INNER/index.html" ]; then
  cp -r "$INNER"/* "$SITE_DIR/"
else
  cp -r "$TEMP_DIR"/* "$SITE_DIR/"
fi
rm -rf "$TEMP_DIR"

# ── Copie du preview si existant ──
for ext in webp png jpg jpeg; do
  PREVIEW_FILE="$SITE_DIR/preview.$ext"
  if [ -f "$PREVIEW_FILE" ]; then
    echo -e "${YELLOW}→ Preview trouvé, copie vers /creation/...${NC}"
    cp "$PREVIEW_FILE" "$PROJECT_ROOT/public/creation/site${CLIENT_ID}.$ext"
    break
  fi
done

# ── Redirection HTML ──
if [ -n "$NETLIFY_URL" ]; then
  echo -e "${YELLOW}→ Création de la redirection HTML...${NC}"
  cat > "$DOWNLOAD_DIR/${CLIENT_ID}-site.html" <<EOF
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${NETLIFY_URL}">
  <title>Redirection — ${CLIENT_ID}</title>
</head>
<body>
  <p>Redirection vers <a href="${NETLIFY_URL}">${NETLIFY_URL}</a>...</p>
</body>
</html>
EOF
fi

# ── Résultat ──
echo ""
echo -e "${GREEN}✓ Déploiement terminé !${NC}"
echo ""
echo -e "${BLUE}Fichiers mis à jour :${NC}"
echo "  - public/clients-sites/${CLIENT_ID}-site.zip"
echo "  - public/clients-sites/${CLIENT_ID}/"
[ -n "$NETLIFY_URL" ] && echo "  - public/client-downloads/${CLIENT_ID}-site.html"
echo ""
echo -e "${YELLOW}Actions restantes :${NC}"
echo ""
echo "  1. Vérifier que le dossier client privé existe bien dans data/client-downloads/"
echo ""
echo "     puis attacher le bon site/ZIP au client depuis le back-office."
echo ""
echo "  2. Depuis l'admin, cliquer sur 'Envoyer 1ère version'"
echo "     pour notifier le client par email."
echo ""
echo "  3. Mettre le statut de la commande à 'Première version'."
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
