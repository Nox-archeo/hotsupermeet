// HotMeet - Script pour la page d'annuaire
class DirectoryPage {
  constructor() {
    this.currentPage = 1;
    this.limit = 12;
    this.filters = {};
    this.sortBy = 'lastActive';
    this.init();
  }

  async init() {
    // Toujours charger l'interface de l'annuaire
    this.setupEventListeners();
    this.setupLocationFilters();

    // 🤖 DÉTECTION BOT GOOGLE pour indexation SEO
    const isGoogleBot = this.isGoogleBot();
    if (isGoogleBot) {
      console.log('🤖 Bot Google détecté - Chargement contenu pour indexation');
      this.isUserPremium = true; // Considérer comme premium pour SEO
      this.loadUsers();
      return;
    }

    // 🌍 ACCÈS PUBLIC - Vérifier le statut de l'utilisateur (connecté ou non)
    const token = localStorage.getItem('hotmeet_token');
    let isUserPremium = false;

    if (token) {
      // Utilisateur connecté - vérifier son statut premium
      console.log(
        '🔄 Utilisateur connecté - Vérification du statut premium...'
      );
      isUserPremium = await this.checkPremiumStatus();
      console.log(`👤 Utilisateur connecté - Premium: ${isUserPremium}`);
    } else {
      console.log("🌍 Visiteur anonyme - Accès public à l'annuaire");
    }

    // 📱 Charger l'annuaire pour TOUS (connectés ou non)
    console.log("📱 Chargement public de l'annuaire");
    this.isUserPremium = isUserPremium; // Stocker le statut premium
    this.isLoggedIn = !!token; // Stocker le statut de connexion
    this.loadUsers();
  }

  // 🤖 DÉTECTION BOT GOOGLE pour SEO
  isGoogleBot() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isBot =
      userAgent.includes('googlebot') ||
      userAgent.includes('bingbot') ||
      userAgent.includes('slurp') ||
      userAgent.includes('duckduckbot') ||
      userAgent.includes('baiduspider') ||
      userAgent.includes('yandexbot') ||
      userAgent.includes('facebookexternalhit') ||
      userAgent.includes('twitterbot') ||
      userAgent.includes('rogerbot') ||
      userAgent.includes('linkedinbot') ||
      userAgent.includes('embedly') ||
      userAgent.includes('quora link preview') ||
      userAgent.includes('showyoubot') ||
      userAgent.includes('outbrain') ||
      userAgent.includes('pinterest/0.') ||
      userAgent.includes('developers.google.com/+/web/snippet') ||
      userAgent.includes('www.google.com/webmasters/tools/richsnippets') ||
      userAgent.includes('slackbot') ||
      userAgent.includes('vkshare') ||
      userAgent.includes('w3c_validator') ||
      userAgent.includes('redditbot') ||
      userAgent.includes('applebot') ||
      userAgent.includes('whatsapp') ||
      userAgent.includes('flipboard') ||
      userAgent.includes('tumblr') ||
      userAgent.includes('bitlybot') ||
      userAgent.includes('skypeuripreview') ||
      userAgent.includes('nuzzel') ||
      userAgent.includes('discordbot') ||
      userAgent.includes('google page speed') ||
      userAgent.includes('qwantify');

    console.log('🤖 User-Agent:', userAgent);
    console.log('🤖 Is Bot:', isBot);
    return isBot;
  }

  // 🔒 VÉRIFICATION STATUT PREMIUM
  async checkPremiumStatus() {
    try {
      const token = localStorage.getItem('hotmeet_token');
      if (!token) {
        console.log('❌ Aucun token trouvé');
        return false;
      }

      console.log('📡 Vérification du statut premium via API...');
      const response = await fetch('/api/payments/status', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('❌ Réponse API non valide:', response.status);
        return false;
      }

      const data = await response.json();
      const isPremium =
        data.success && data.subscription && data.subscription.isPremium;

      console.log('📊 Résultat vérification premium:', {
        success: data.success,
        isPremium: isPremium,
        expiration: data.subscription?.expiration,
      });

      return isPremium;
    } catch (error) {
      console.error('❌ Erreur vérification premium:', error);
      return false;
    }
  }

  // � MESSAGE POUR UTILISATEURS NON CONNECTÉS
  showLoginRequiredMessage() {
    const profilesGrid =
      document.getElementById('profilesGrid') ||
      document.querySelector('.profiles-grid') ||
      document.querySelector('.directory-results');

    if (profilesGrid) {
      profilesGrid.innerHTML = `
        <div class="login-required-card">
          <div class="login-icon">�</div>
          <h3>Rejoignez la communauté</h3>
          <p>L'accès à l'annuaire est réservé aux membres inscrits.<br>
          Créez votre compte gratuitement pour voir les profils.</p>
          <div class="login-actions">
            <button class="btn btn-primary" onclick="window.location.href='/pages/auth.html'">
              🚀 Créer un compte
            </button>
            <button class="btn btn-secondary" onclick="window.location.href='/pages/auth.html#login'">
              Se connecter
            </button>
          </div>
          <p class="login-info">
            <small>C'est gratuit et ne prend que quelques minutes !</small>
          </p>
        </div>
      `;
    }

    // Ajouter les styles pour l'encart de connexion
    this.addLoginRequiredStyles();
  }

  // 🎨 STYLES POUR L'ENCART DE CONNEXION REQUIS
  addLoginRequiredStyles() {
    if (document.getElementById('login-required-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'login-required-styles';
    styles.innerHTML = `
      .login-required-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 600px;
        margin: 40px auto;
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
      }
      .login-required-card .login-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        display: block;
      }
      .login-required-card h3 {
        font-size: 2.2rem;
        margin-bottom: 15px;
        font-weight: 600;
      }
      .login-required-card > p {
        font-size: 1.2rem;
        margin-bottom: 25px;
        opacity: 0.95;
      }
      .login-benefits {
        text-align: left;
        margin: 30px 0;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }
      .login-benefits h4 {
        font-size: 1.1rem;
        margin: 20px 0 10px 0;
        font-weight: 600;
      }
      .login-benefits ul {
        list-style: none;
        padding: 0;
        margin: 0 0 15px 0;
      }
      .login-benefits li {
        padding: 5px 0;
        font-size: 1rem;
        opacity: 0.95;
      }
      .login-actions {
        display: flex;
        gap: 15px;
        margin: 30px 0 20px 0;
        justify-content: center;
        flex-wrap: wrap;
      }
      .login-actions .btn {
        padding: 15px 25px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: bold;
        text-decoration: none;
        font-size: 1.1rem;
        transition: transform 0.2s;
      }
      .login-actions .btn:hover {
        transform: translateY(-2px);
      }
      .login-actions .btn-primary {
        background: white;
        color: #667eea;
      }
      .login-actions .btn-secondary {
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
      }
      .login-info {
        margin-top: 15px;
        opacity: 0.8;
      }
    `;

    document.head.appendChild(styles);
  }

  // �🚫 AFFICHAGE MESSAGE PREMIUM DANS LA ZONE PROFILS
  showPremiumMessageInProfilesArea() {
    const profilesGrid =
      document.querySelector('.profiles-grid') ||
      document.querySelector('.directory-results');

    if (profilesGrid) {
      profilesGrid.innerHTML = `
        <div class="premium-upgrade-card">
          <div class="premium-icon">👑</div>
          <h3>Devenez Premium</h3>
          <div class="premium-price">5.75 CHF/mois</div>
          <div class="premium-explanation">
            <p class="premium-quality-message">
              🏆 L'accès complet à l'annuaire est réservé aux membres Premium. 
              Cela nous permet de limiter les faux profils et garantir des échanges sérieux.
            </p>
          </div>
          <ul class="premium-features">
            <li>✅ Accès illimité aux profils</li>
            <li>✅ Messages illimités avec tous</li>
            <li>🌟 Non-premium peuvent vous écrire sans limite</li>
            <li>✅ Visibilité accrue</li>
            <li>✅ Statut premium visible</li>
            <li>✅ Support prioritaire</li>
          </ul>
          <button class="btn btn-premium-upgrade" onclick="window.location.href='/premium'">
            🚀 S'abonner maintenant
          </button>
          <p class="premium-info">
            Vous serez redirigé vers PayPal pour finaliser l'abonnement<br>
            <small>Abonnement mensuel renouvelable. Annulation possible à tout moment.</small>
          </p>
        </div>
      `;
    }

    // Ajouter les styles pour l'encart premium
    this.addPremiumUpgradeStyles();
  }

  // 🎨 STYLES POUR L'ENCART PREMIUM
  addPremiumUpgradeStyles() {
    if (document.getElementById('premium-upgrade-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'premium-upgrade-styles';
    styles.innerHTML = `
      .premium-upgrade-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 500px;
        margin: 40px auto;
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
      }
      .premium-upgrade-card .premium-icon {
        font-size: 3rem;
        margin-bottom: 20px;
        display: block;
      }
      .premium-upgrade-card h3 {
        font-size: 2rem;
        margin-bottom: 10px;
        font-weight: 600;
      }
      .premium-quality-message {
        background: rgba(255, 255, 255, 0.15);
        border-left: 4px solid #ffd700;
        padding: 15px;
        margin: 20px 0;
        border-radius: 5px;
        font-size: 1.1rem;
        font-weight: 500;
        line-height: 1.4;
        text-align: left;
      }
      .premium-price {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 25px;
        color: #ffd700;
      }
      .premium-features {
        list-style: none;
        padding: 0;
        margin: 25px 0;
        text-align: left;
        max-width: 300px;
        margin-left: auto;
        margin-right: auto;
      }
      .premium-features li {
        padding: 8px 0;
        font-size: 1.1rem;
        opacity: 0.95;
      }
      .btn-premium-upgrade {
        background: white;
        color: #667eea !important;
        padding: 15px 35px;
        border-radius: 30px;
        text-decoration: none;
        font-weight: 700;
        font-size: 1.1rem;
        display: inline-block;
        margin: 25px 0 20px 0;
        transition: all 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      }
      .btn-premium-upgrade:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        text-decoration: none;
        color: #5a67d8 !important;
      }
      .premium-info {
        font-size: 0.95rem;
        opacity: 0.9;
        margin-top: 20px;
        line-height: 1.4;
      }
      .premium-info small {
        font-size: 0.85rem;
        opacity: 0.8;
      }
    `;
    document.head.appendChild(styles);
  }

  // 💎 MESSAGE PREMIUM UPGRADE (GROS CALL-TO-ACTION)
  showPremiumUpgradeMessage() {
    const profilesGrid =
      document.getElementById('profilesGrid') ||
      document.querySelector('.profiles-grid') ||
      document.querySelector('.directory-results');

    if (profilesGrid) {
      profilesGrid.innerHTML = `
        <div class="premium-upgrade-card">
          <div class="premium-icon">💎</div>
          <h3>Annuaire Premium Exclusif</h3>
          <p>L'accès complet à l'annuaire des membres est réservé aux abonnés Premium.<br>
          Débloquez tous les profils et fonctionnalités avancées !</p>
          
          <div class="premium-benefits">
            <h4>🚀 Avantages Premium :</h4>
            <ul>
              <li>✅ Accès complet à l'annuaire des membres</li>
              <li>✅ Voir et poster des annonces coquines</li>
              <li>✅ Voir tous les profils sans limite</li>
              <li>✅ Messages illimités avec tous</li>
              <li>🌟 Non-premium peuvent vous écrire sans limite</li>
              <li>✅ Recherche avancée par critères</li>
              <li>✅ Cam-to-cam prioritaire</li>
              <li>✅ Support prioritaire</li>
            </ul>
          </div>
          
          <div class="premium-quality-message">
            🛡️ <strong>Protection anti-arnaque</strong><br>
            L'abonnement Premium permet de filtrer les arnaqueurs et faux profils. Seuls les membres sérieux investissent dans un abonnement, garantissant des rencontres authentiques.
          </div>
          
          <div class="premium-actions">
            <button class="btn btn-premium" onclick="window.location.href='/premium'">
              💎 Devenir Premium
            </button>
            <button class="btn btn-info" onclick="window.location.href='/premium'">
              📋 Voir les tarifs
            </button>
          </div>

        </div>
      `;
    }

    // Ajouter les styles pour l'encart premium
    this.addPremiumUpgradeStyles();
  }

  // 🎨 STYLES POUR L'ENCART PREMIUM UPGRADE
  addPremiumUpgradeStyles() {
    if (document.getElementById('premium-upgrade-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'premium-upgrade-styles';
    styles.innerHTML = `
      .premium-upgrade-card {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 50px;
        border-radius: 25px;
        text-align: center;
        max-width: 700px;
        margin: 50px auto;
        box-shadow: 0 15px 40px rgba(240, 147, 251, 0.4);
        position: relative;
        overflow: hidden;
      }
      .premium-upgrade-card::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(255,255,255,0.05) 10px,
          rgba(255,255,255,0.05) 20px
        );
        animation: premium-shimmer 3s linear infinite;
      }
      @keyframes premium-shimmer {
        0% { transform: translateX(-100%) translateY(-100%); }
        100% { transform: translateX(100%) translateY(100%); }
      }
      .premium-upgrade-card > * {
        position: relative;
        z-index: 2;
      }
      .premium-upgrade-card .premium-icon {
        font-size: 5rem;
        margin-bottom: 25px;
        display: block;
        text-shadow: 0 0 20px rgba(255,255,255,0.5);
      }
      .premium-upgrade-card h3 {
        font-size: 2.5rem;
        margin-bottom: 20px;
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      .premium-upgrade-card > p {
        font-size: 1.3rem;
        margin-bottom: 30px;
        opacity: 0.95;
        line-height: 1.6;
      }
      .premium-benefits {
        text-align: left;
        margin: 35px 0;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
        background: rgba(255,255,255,0.1);
        padding: 25px;
        border-radius: 15px;
      }
      .premium-benefits h4 {
        font-size: 1.4rem;
        margin: 0 0 20px 0;
        font-weight: 600;
        text-align: center;
      }
      .premium-benefits ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .premium-benefits li {
        padding: 8px 0;
        font-size: 1.1rem;
        opacity: 0.95;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .premium-benefits li:last-child {
        border-bottom: none;
      }
      .premium-quality-message {
        background: rgba(255, 255, 255, 0.15);
        border-left: 4px solid #ffd700;
        padding: 20px;
        margin: 25px 0;
        border-radius: 10px;
        font-size: 1.1rem;
        font-weight: 500;
        line-height: 1.6;
        text-align: center;
        color: rgba(255,255,255,0.95);
      }
      .premium-actions {
        display: flex;
        gap: 20px;
        margin: 40px 0 25px 0;
        justify-content: center;
        flex-wrap: wrap;
      }
      .premium-actions .btn {
        padding: 18px 30px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: bold;
        text-decoration: none;
        font-size: 1.2rem;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .premium-actions .btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      }
      .premium-actions .btn-premium {
        background: linear-gradient(45deg, #FFD700, #FFA500);
        color: #333;
        border: 2px solid #FFD700;
        animation: pulse-premium 2s infinite;
      }
      @keyframes pulse-premium {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .premium-actions .btn-info {
        background: rgba(255,255,255,0.2);
        color: white;
        border: 2px solid rgba(255,255,255,0.4);
      }
      .premium-info {
        margin-top: 20px;
        font-size: 1.1rem;
        font-weight: 600;
        color: #FFD700;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(styles);
  }

  setupEventListeners() {
    // Formulaire de filtres
    document.getElementById('filtersForm').addEventListener('submit', e => {
      e.preventDefault();
      this.applyFilters();
    });

    // Réinitialisation des filtres
    document.getElementById('resetFilters').addEventListener('click', () => {
      this.resetFilters();
    });

    // Tri
    document.getElementById('sortBy').addEventListener('change', e => {
      this.sortBy = e.target.value;
      this.loadUsers();
    });

    // 🌍 FILTRE GENRE - ACCESSIBLE À TOUS (public et premium)
    document.getElementById('sexe').addEventListener('change', e => {
      console.log('🌍 Filtre genre accessible publiquement:', e.target.value);
      // Plus de restrictions - tous peuvent filtrer par genre
    });

    // Liaison pays-région
    document.getElementById('filtrePays').addEventListener('change', e => {
      console.log('Changement de pays:', e.target.value);
      this.updateRegions(e.target.value);
    });

    // Liaison région-villes
    document.getElementById('filtreRegion').addEventListener('change', e => {
      console.log('Changement de région:', e.target.value);
      this.updateCities(
        document.getElementById('filtrePays').value,
        e.target.value
      );
    });
  }

  setupLocationFilters() {
    // Initialiser les régions si un pays est déjà sélectionné
    const paysSelect = document.getElementById('filtrePays');
    const regionSelect = document.getElementById('filtreRegion');
    const villeSelect = document.getElementById('filtreVille');

    if (paysSelect.value) {
      this.updateRegions(paysSelect.value);

      // Restaurer les valeurs sauvegardées
      setTimeout(() => {
        const savedRegion = regionSelect.value;
        if (savedRegion) {
          regionSelect.value = savedRegion;
          this.updateCities(paysSelect.value, savedRegion);
        }

        const savedVille = villeSelect.value;
        if (savedVille) {
          setTimeout(() => {
            villeSelect.value = savedVille;
          }, 200);
        }
      }, 200);
    } else {
      // Si aucun pays n'est sélectionné, vider les listes
      regionSelect.innerHTML = '<option value="">Toutes les régions</option>';
      villeSelect.innerHTML = '<option value="">Toutes les villes</option>';
    }
  }

  updateCities(pays, regionValue) {
    const villeSelect = document.getElementById('filtreVille');

    console.log('updateCities appelé avec pays:', pays, 'région:', regionValue);

    // Vider la liste des villes
    villeSelect.innerHTML = '<option value="">Toutes les villes</option>';

    if (!pays) {
      console.log('Aucun pays sélectionné pour charger les villes');
      return;
    }

    // Vérifier que les données sont disponibles
    if (!window.europeanCities) {
      console.error('ERREUR: Données villes non chargées');
      return;
    }

    // Charger les villes principales du pays
    const cities = window.europeanCities[pays];
    console.log(`Villes trouvées pour ${pays}:`, cities);

    if (!cities || cities.length === 0) {
      console.warn(`Aucune ville trouvée pour le pays: ${pays}`);
      return;
    }

    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.value;
      option.textContent = city.name;
      villeSelect.appendChild(option);
    });

    console.log(
      `✅ Villes chargées pour ${pays}: ${cities.length} villes disponibles`
    );
  }

  updateRegions(pays) {
    const regionSelect = document.getElementById('filtreRegion');
    const villeSelect = document.getElementById('filtreVille');

    console.log('updateRegions appelé avec pays:', pays);

    // Vider les listes
    regionSelect.innerHTML = '<option value="">Toutes les régions</option>';
    villeSelect.innerHTML = '<option value="">Toutes les villes</option>';

    if (!pays) {
      console.log('Aucun pays sélectionné, retour');
      return;
    }

    // Vérifier que les données sont disponibles
    if (!window.europeanRegions) {
      console.error('ERREUR: Données régions non chargées');
      return;
    }

    // Charger les régions du pays sélectionné
    const regions = window.europeanRegions[pays];
    console.log(`Régions trouvées pour ${pays}:`, regions);

    if (!regions || regions.length === 0) {
      console.warn(`Aucune région trouvée pour le pays: ${pays}`);
      return;
    }

    regions.forEach(region => {
      const option = document.createElement('option');
      option.value = region.value;
      option.textContent = region.name;
      regionSelect.appendChild(option);
    });

    console.log(
      `✅ Régions chargées pour ${pays}: ${regions.length} régions disponibles`
    );

    // Charger aussi les villes pour ce pays
    this.updateCities(pays, '');
  }

  applyFilters() {
    const formData = new FormData(document.getElementById('filtersForm'));

    // 🆓 FILTRE GENRE DISPONIBLE POUR TOUS (ex-premium uniquement)
    const sexeValue = formData.get('sexe');
    // Suppression de la vérification premium - tous les utilisateurs peuvent filtrer par genre

    this.filters = {
      ageMin: formData.get('ageMin') || '',
      ageMax: formData.get('ageMax') || '',
      sexe: sexeValue || '',
      pays: formData.get('filtrePays') || '',
      region: formData.get('filtreRegion') || '',
      ville: formData.get('filtreVille') || '',
    };
    this.currentPage = 1;
    this.loadUsers();
  }

  resetFilters() {
    document.getElementById('filtersForm').reset();
    this.filters = {};
    this.currentPage = 1;
    this.loadUsers();
  }

  async loadUsers() {
    try {
      // Construire les paramètres de requête avec tous les filtres
      const params = new URLSearchParams();

      // Ajouter les filtres non vides
      Object.keys(this.filters).forEach(key => {
        if (this.filters[key]) {
          params.append(key, this.filters[key]);
        }
      });

      // Ajouter la pagination et le tri
      params.append('page', this.currentPage);
      params.append('limit', this.limit);
      params.append('sortBy', this.sortBy);

      // 🔐 Ajouter le token d'authentification si disponible
      const headers = {};
      const token = localStorage.getItem('hotmeet_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/users?${params}`, { headers });
      const result = await response.json();

      // 🔒 GESTION ÉCRAN PREMIUM (au lieu de redirection forcée)
      if (result.premiumRequired) {
        this.showPremiumBlocker(result.message);
        return;
      }

      if (result.success) {
        this.displayUsers(result.users);
        this.updatePagination(result.pagination);
        this.updateResultsCount(result.pagination.total);
      } else {
        this.showError('Erreur lors du chargement des profils');
      }
    } catch (error) {
      console.error('Erreur:', error);
      this.showError('Erreur de connexion');
    }
  }

  // 🔒 Nouvel écran de blocage premium avec bouton PayPal
  showPremiumBlocker(message) {
    const grid = document.getElementById('profilesGrid');
    grid.innerHTML = `
      <div class="premium-blocker">
        <div class="premium-icon">🔒</div>
        <h3>Fonctionnalité Premium</h3>
        <p>${message}</p>
        <div class="premium-benefits">
          <h4>Avec l'abonnement Premium :</h4>
          <ul>
            <li>✅ Accès complet à l'annuaire</li>
            <li>✅ Messages illimités avec tous</li>
            <li>🌟 Non-premium peuvent vous écrire sans limite</li>
            <li>✅ Voir toutes les annonces</li>
            <li>✅ Cam avec choix du genre</li>
          </ul>
        </div>
        <button class="btn-premium" onclick="window.location.href='/pages/premium.html'">
          🚀 S'abonner maintenant
        </button>
      </div>
    `;
  }

  displayUsers(users) {
    const grid = document.getElementById('profilesGrid');

    if (users.length === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <h4>Aucun profil trouvé</h4>
          <p>Essayez de modifier vos critères de recherche</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = users
      .map(
        user => `
      <div class="profile-card">
        <div class="profile-image">
          ${this.getProfileImage(user)}
          ${user.premium.isPremium ? '<span class="premium-badge">PREMIUM</span>' : ''}
          ${user.isOnline ? '<span class="online-indicator">🟢 En ligne</span>' : ''}
        </div>
        <div class="profile-info">
          <h4>${user.profile.nom}</h4>
          <p class="profile-age">${user.profile.age} ans</p>
          <p class="profile-location">${this.getLocationDisplay(user.profile.localisation)}</p>
          <p class="profile-gender">${this.getGenderLabel(user.profile.sexe)}</p>
          <div class="profile-actions">
            <button class="btn-primary view-profile-btn" data-user-id="${user.id}">
              Voir le profil
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    // CSP FIX: Ajouter les event listeners après insertion du HTML
    this.attachEventListeners();
  }

  getProfileImage(user) {
    // Vérifier si l'utilisateur a des photos
    if (user.profile.photos && user.profile.photos.length > 0) {
      // Trouver la photo de profil principale ou prendre la première
      const profilePhoto =
        user.profile.photos.find(photo => photo.isProfile) ||
        user.profile.photos[0];

      // Si la photo est floutée, afficher une version floutée avec indicateur clair
      if (profilePhoto.isBlurred) {
        return `
          <div class="blurred-photo-container" style="position: relative;">
            <img src="${profilePhoto.path}" alt="${user.profile.nom}" style="filter: blur(20px); width: 100%; height: 200px; object-fit: cover;">
            <div class="unblur-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; flex-direction: column;">
              <div style="color: white; font-weight: bold; margin-bottom: 10px;">🔒 Photo floutée</div>
              <button class="unblur-btn" onclick="directoryPage.requestUnblur('${user.id}', '${profilePhoto._id}')" style="background: #ff6b6b; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                👁️ Demander à dévoiler
              </button>
            </div>
          </div>
        `;
      } else {
        return `<img src="${profilePhoto.path}" alt="${user.profile.nom}" style="width: 100%; height: 200px; object-fit: cover;">`;
      }
    } else {
      // Photo par défaut si aucune photo n'est disponible
      return `<img src="/images/default-avatar.jpg" alt="${user.profile.nom}" style="width: 100%; height: 200px; object-fit: cover;">`;
    }
  }

  getGenderLabel(gender) {
    const labels = {
      homme: 'Homme',
      femme: 'Femme',
      autre: 'Autre',
    };
    return labels[gender] || gender;
  }

  // Fonction pour afficher la localisation avec drapeau
  getLocationDisplay(localisation) {
    if (!localisation) {
      return 'Localisation non renseignée';
    }

    // Si localisation est un objet (nouvelle structure)
    if (typeof localisation === 'object' && localisation.pays) {
      const flag = this.getCountryFlag(localisation.pays);
      let locationText = '';

      if (localisation.ville && localisation.region) {
        locationText = `${localisation.ville}, ${localisation.region}`;
      } else if (localisation.ville) {
        locationText = localisation.ville;
      } else if (localisation.region) {
        locationText = localisation.region;
      }

      return `${flag} ${localisation.pays}${locationText ? ` • ${locationText}` : ''}`;
    }

    // Si localisation est une chaîne (ancienne structure)
    return localisation;
  }

  // Fonction pour obtenir l'emoji drapeau selon le pays
  getCountryFlag(pays) {
    const flagMap = {
      france: '🇫🇷',
      suisse: '🇨🇭',
      belgique: '🇧🇪',
      allemagne: '🇩🇪',
      italie: '🇮🇹',
      espagne: '🇪🇸',
      portugal: '🇵🇹',
      'pays-bas': '🇳🇱',
      luxembourg: '🇱🇺',
      autriche: '🇦🇹',
      'royaume-uni': '🇬🇧',
      irlande: '🇮🇪',
      danemark: '🇩🇰',
      suede: '🇸🇪',
      norvege: '🇳🇴',
      finlande: '🇫🇮',
      pologne: '🇵🇱',
      'republique-tcheque': '🇨🇿',
      slovaquie: '🇸🇰',
      hongrie: '🇭🇺',
      roumanie: '🇷🇴',
      bulgarie: '🇧🇬',
      grece: '🇬🇷',
      croatie: '🇭🇷',
      slovenie: '🇸🇮',
      estonie: '🇪🇪',
      lettonie: '🇱🇻',
      lituanie: '🇱🇹',
      malte: '🇲🇹',
      chypre: '🇨🇾',
    };

    return flagMap[pays] || '🌍';
  }

  // Fonction pour demander le dévoilement d'une photo
  async requestUnblur(userId, photoId) {
    try {
      const token = localStorage.getItem('hotmeet_token');
      const response = await fetch(
        `/api/uploads/photo/${photoId}/unblur-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ targetUserId: userId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Demande de dévoilement envoyée');
        // Recharger les utilisateurs pour mettre à jour l'affichage
        this.loadUsers();
      } else {
        this.showError(result.error.message || 'Erreur lors de la demande');
      }
    } catch (error) {
      console.error('Erreur demande dévoilement:', error);
      this.showError('Erreur lors de la demande de dévoilement');
    }
  }

  updatePagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    const { page, pages, total } = pagination;

    if (pages <= 1) {
      paginationDiv.innerHTML = '';
      return;
    }

    let html = '<div class="pagination-controls">';

    // Bouton précédent
    if (page > 1) {
      html += `<button class="pagination-btn" onclick="directoryPage.goToPage(${page - 1})">← Précédent</button>`;
    }

    // Pages
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
      html += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="directoryPage.goToPage(${i})">${i}</button>`;
    }

    // Bouton suivant
    if (page < pages) {
      html += `<button class="pagination-btn" onclick="directoryPage.goToPage(${page + 1})">Suivant →</button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
  }

  // Navigation vers une page spécifique
  goToPage(pageNumber) {
    if (pageNumber < 1) return;

    // 🔒 FREEMIUM: Autoriser pages 1 et 2, bloquer à partir de la page 3
    if (pageNumber > 2 && !this.isUserPremium) {
      this.showPremiumPopup(
        "L'accès aux pages suivantes de l'annuaire est réservé aux membres Premium. Vous avez accès aux 2 premières pages - Passez Premium pour parcourir tous les profils !"
      );
      return;
    }

    this.currentPage = pageNumber;
    this.loadUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateResultsCount(total) {
    const resultsCount = document.getElementById('resultsCount');
    const resultsDescription = document.getElementById('resultsDescription');

    // ✅ AFFICHAGE RÉEL: Sans fausse multiplication
    resultsCount.textContent = `${total} profil${total > 1 ? 's' : ''} trouvé${total > 1 ? 's' : ''}`;

    // Mettre à jour la description avec les filtres actifs
    const activeFilters = [];
    if (this.filters.ageMin || this.filters.ageMax) {
      const ageRange = `${this.filters.ageMin || '18'}-${this.filters.ageMax || '100'}`;
      activeFilters.push(`Âge: ${ageRange} ans`);
    }
    if (this.filters.sexe) {
      const genderLabels = {
        homme: 'Homme',
        femme: 'Femme',
        autre: 'Autre',
      };
      activeFilters.push(`Genre: ${genderLabels[this.filters.sexe]}`);
    }
    if (this.filters.pays) {
      activeFilters.push(`Pays: ${this.filters.pays}`);
    }
    if (this.filters.ville) {
      activeFilters.push(`Ville: ${this.filters.ville}`);
    }

    if (activeFilters.length > 0) {
      resultsDescription.textContent = `Filtres actifs: ${activeFilters.join(', ')}`;
    } else {
      resultsDescription.textContent =
        'Aucun filtre actif - affichage de tous les profils';
    }
  }

  // CSP FIX: Attacher les event listeners après génération du HTML
  attachEventListeners() {
    // 💎 Boutons "Voir le profil" avec vérification premium
    const viewProfileBtns = document.querySelectorAll('.view-profile-btn');
    viewProfileBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        const userId = e.target.getAttribute('data-user-id');
        this.handleViewProfile(userId);
      });
    });
  }

  viewProfile(userId) {
    window.location.href = `/profile-view?id=${userId}`;
  }

  // 🌍 GESTION VOIR PROFIL - ACCÈS PUBLIC pour tous
  async handleViewProfile(userId) {
    console.log(`🌍 Voir profil utilisateur (accès public): ${userId}`);

    // TOUS peuvent voir les profils complets - plus de restriction premium
    console.log('✅ Accès public au profil - Redirection vers profil');
    window.location.href = `/pages/profile-view.html?userId=${userId}`;
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    console.log(`🔍 Tentative de contact utilisateur: ${userName} (${userId})`);

    // Vérifier si l'utilisateur actuel est premium
    if (!this.isUserPremium) {
      console.log('❌ Utilisateur non premium - Redirection vers page premium');
      // Afficher message et redirection
      this.showPremiumModal(userName);
      return;
    }

    // Si premium, rediriger vers la messagerie
    console.log('✅ Utilisateur premium - Redirection vers messagerie');
    window.location.href = `/pages/messages.html?contact=${userId}`;
  }

  // 💎 MODAL PREMIUM pour contact
  showPremiumModal(userName) {
    const modal = document.createElement('div');
    modal.className = 'premium-contact-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="premium-icon">👑</div>
          <h3>Premium Requis</h3>
          <p>Vous devez être membre premium pour contacter <strong>${userName}</strong></p>
          <div class="premium-price">Seulement 5.75 CHF/mois</div>
          <ul class="premium-features-compact">
            <li>✅ Messages illimités avec tous</li>
            <li>🌟 Non-premium peuvent vous écrire sans limite</li>
            <li>✅ Accès à tous les profils</li>
            <li>✅ Visibilité prioritaire</li>
          </ul>
          <div class="modal-actions">
            <button class="btn-premium-upgrade" onclick="window.location.href='/pages/premium.html'">
              🚀 Devenir Premium
            </button>
            <button class="btn-cancel" onclick="this.closest('.premium-contact-modal').remove()">
              Annuler
            </button>
          </div>
        </div>
      </div>
    `;

    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Styles pour le modal
    const styles = `
      .modal-overlay { background: rgba(0,0,0,0.8); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
      .modal-content { background: white; padding: 2rem; border-radius: 12px; text-align: center; max-width: 400px; margin: 1rem; }
      .premium-icon { font-size: 3rem; margin-bottom: 1rem; }
      .premium-price { color: #ff6b6b; font-size: 1.5rem; font-weight: bold; margin: 1rem 0; }
      .premium-features-compact { list-style: none; padding: 0; margin: 1rem 0; }
      .premium-features-compact li { margin: 0.5rem 0; }
      .modal-actions { display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; }
      .btn-premium-upgrade { background: linear-gradient(135deg, #ff6b6b, #ff8e8e); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: bold; }
      .btn-cancel { background: #ccc; color: #333; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    modal.appendChild(styleSheet);

    document.body.appendChild(modal);
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
      text-align: center;
    `;

    const resultsSection = document.querySelector('.results-section');
    resultsSection.insertBefore(errorDiv, resultsSection.firstChild);

    setTimeout(() => errorDiv.remove(), 5000);
  }

  // 🔒 POPUP PREMIUM pour bloquer fonctionnalités
  showPremiumPopup(message) {
    // Créer le popup
    const popup = document.createElement('div');
    popup.className = 'premium-popup-overlay';
    popup.innerHTML = `
      <div class="premium-popup">
        <div class="premium-popup-icon">🔒</div>
        <h3>Fonctionnalité Premium</h3>
        <p>${message}</p>
        <div class="premium-popup-buttons">
          <button class="btn-premium-popup" onclick="window.location.href='/pages/premium.html'">Passer Premium</button>
          <button class="btn-close-popup" onclick="this.parentElement.parentElement.parentElement.remove()">Fermer</button>
        </div>
      </div>
    `;

    // Ajouter styles inline
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const popupContent = popup.querySelector('.premium-popup');
    popupContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      max-width: 400px;
      margin: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      animation: popupScale 0.3s ease-out;
    `;

    // Ajouter animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes popupScale {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .premium-popup-icon { font-size: 3rem; margin-bottom: 1rem; }
      .premium-popup h3 { color: #ff6b6b; margin-bottom: 1rem; }
      .premium-popup p { margin-bottom: 2rem; line-height: 1.5; }
      .premium-popup-buttons { display: flex; gap: 1rem; justify-content: center; }
      .btn-premium-popup { background: linear-gradient(135deg, #ff6b6b, #ff8e8e); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: transform 0.2s; }
      .btn-premium-popup:hover { transform: translateY(-2px); }
      .btn-close-popup { background: #ccc; color: #333; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    document.body.appendChild(popup);

    // Auto-fermer après 8 secondes
    setTimeout(() => {
      if (popup.parentElement) {
        popup.remove();
      }
    }, 8000);
  }

  // 🏆 AFFICHER LE MESSAGE PREMIUM DANS LA PAGE
  showPremiumNotice() {
    const premiumNotice = document.getElementById('premiumNotice');
    if (premiumNotice) {
      premiumNotice.style.display = 'block';
    }
  }
}

// Initialisation avec vérification des données
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== INITIALISATION ANNUAIRE - DOM CHARGÉ ===');

  // Attendre que les données soient chargées
  const initDirectory = () => {
    console.log('Vérification des données...');
    console.log('europeanRegions:', window.europeanRegions);
    console.log('europeanCities:', window.europeanCities);

    if (!window.europeanRegions || !window.europeanCities) {
      console.log('❌ Données pas encore chargées, attente 200ms...');
      setTimeout(initDirectory, 200);
      return;
    }

    console.log('✅ Données géographiques chargées avec succès');
    console.log('Pays disponibles:', Object.keys(window.europeanRegions));
    console.log(
      'Villes disponibles pour France:',
      window.europeanCities.france?.length || 0
    );

    // Vérifier que les sélecteurs existent
    const paysSelect = document.getElementById('filtrePays');
    const regionSelect = document.getElementById('filtreRegion');
    const villeSelect = document.getElementById('filtreVille');

    if (!paysSelect || !regionSelect || !villeSelect) {
      console.error('❌ ERREUR: Sélecteurs non trouvés');
      return;
    }

    console.log('✅ Sélecteurs trouvés, initialisation DirectoryPage');

    // Lancer l'initialisation avec variable globale
    window.directoryPage = new DirectoryPage();
  };

  // Démarrer l'initialisation après un court délai
  setTimeout(initDirectory, 100);
});
