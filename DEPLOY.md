# Guide de Déploiement HotSuperMeet

## Étapes de déploiement FTP

### 1. Ouvrir la palette de commandes

- **Mac**: `Cmd+Shift+P`
- **Windows/Linux**: `Ctrl+Shift+P`

### 2. Commandes FTP Simple disponibles

- `FTP-Simple: Config` - Vérifier/modifier la config
- `FTP-Simple: Open` - Se connecter au serveur
- `FTP-Simple: Upload` - Uploader le fichier/dossier courant
- `FTP-Simple: Upload All` - Uploader tout le projet

### 3. Se connecter au serveur

1. Tapez `FTP-Simple: Open`
2. Sélectionnez "HotSuperMeet Deploy"
3. Entrez le mot de passe: `Lilith66.666`

### 4. Uploader les fichiers

- **Fichier spécifique**: Clic droit → Upload
- **Tout le projet**: `Cmd+Shift+P` → `FTP-Simple: Upload All`

### 5. Upload automatique

L'upload automatique est activé (`uploadOnSave: true`).
Chaque sauvegarde uploade automatiquement le fichier.

## Dépannage

- Si connexion échoue → Tester avec FileZilla
- Mode passif activé (résout 90% des problèmes)
- Vérifier que `/sites/hotsupermeet.com/` existe sur le serveur

## Identifiants FTP

- **Host**: al6rd7.ftp.infomaniak.com
- **Port**: 21
- **Username**: al6rd7_system
- **Password**: [MOVED TO SECURE ENVIRONMENT VARIABLES - Contact admin]
- **Remote Path**: /sites/hotsupermeet.com/
