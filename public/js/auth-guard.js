/**
 * Système de protection des pages - Auth Guard
 * Redirige vers la page de connexion si l'utilisateur n'est pas connecté
 * et tente d'accéder à une page protégée
 */

(function () {
  'use strict';

  // Pages publiques (accessibles sans connexion)
  const PUBLIC_PAGES = [
    '/',
    '/auth',
    '/index.html',
    '/pages/index.html',
    '/pages/auth.html',
    '/legal',
    '/pages/legal.html',
    '/cookies',
    '/mentions',
    '/pages/404.html',
  ];

  // Pages qui nécessitent une connexion
  const PROTECTED_PAGES = [
    '/profile',
    '/pages/profile.html',
    '/pages/profile-clean.html',
    '/messages',
    '/pages/messages.html',
    '/directory',
    '/pages/directory.html',
    '/ads',
    '/pages/ads.html',
    '/tonight',
    '/pages/tonight.html',
    '/cam',
    '/pages/cam.html',
  ];

  // Vérifier si l'utilisateur est connecté
  function isUserAuthenticated() {
    const token = localStorage.getItem('hotmeet_token');
    return token && token.trim().length > 10;
  }

  // Détecter si c'est Googlebot ou un autre crawler
  function isCrawler() {
    const userAgent = navigator.userAgent.toLowerCase();
    const crawlers = [
      'googlebot',
      'bingbot',
      'slurp',
      'duckduckbot',
      'baiduspider',
      'yandexbot',
      'facebookexternalhit',
      'twitterbot',
      'whatsapp',
    ];

    const isCrawlerUA = crawlers.some(crawler => userAgent.includes(crawler));

    // Log pour debug
    if (isCrawlerUA) {
      console.log('🤖 CRAWLER DÉTECTÉ:', userAgent);
    }

    return isCrawlerUA;
  }

  // Obtenir l'URL actuelle normalisée
  function getCurrentPath() {
    const path = window.location.pathname;
    console.log('🔒 URL actuelle:', path);
    return path;
  }

  // Vérifier si la page actuelle est publique
  function isPublicPage(path) {
    return PUBLIC_PAGES.some(publicPage => {
      return path === publicPage || path.endsWith(publicPage);
    });
  }

  // Vérifier si la page actuelle est protégée
  function isProtectedPage(path) {
    return PROTECTED_PAGES.some(protectedPage => {
      return path === protectedPage || path.includes(protectedPage);
    });
  }

  // Rediriger vers la page de connexion
  function redirectToAuth(reason = 'Accès non autorisé') {
    console.log('🚫 AUTH GUARD:', reason);
    console.log('🔄 Redirection vers /auth...');

    // Sauvegarder la page d'origine pour redirection après connexion
    const originalPage = window.location.pathname;
    if (originalPage !== '/auth' && originalPage !== '/') {
      localStorage.setItem('hotmeet_redirect_after_login', originalPage);
      console.log('💾 Page sauvegardée pour redirection:', originalPage);
    }

    // Redirection
    window.location.href = '/auth';
  }

  // Fonction principale de vérification
  function checkPageAccess() {
    const currentPath = getCurrentPath();
    const isAuthenticated = isUserAuthenticated();
    const isCrawlerBot = isCrawler();

    console.log('🔒 AUTH GUARD - Vérification accès:');
    console.log('  📍 Page:', currentPath);
    console.log('  👤 Connecté:', isAuthenticated);
    console.log('  🤖 Crawler:', isCrawlerBot);

    // NOUVEAU: Si c'est un crawler (Googlebot, etc.), laisser passer TOUTES les pages
    if (isCrawlerBot) {
      console.log('✅ 🤖 CRAWLER DÉTECTÉ - Accès autorisé pour indexation');
      return;
    }

    // Si c'est une page publique, laisser passer
    if (isPublicPage(currentPath)) {
      console.log('✅ Page publique - Accès autorisé');
      return;
    }

    // Si c'est une page protégée et l'utilisateur n'est pas connecté
    if (isProtectedPage(currentPath) && !isAuthenticated) {
      redirectToAuth('Page protégée - Connexion requise');
      return;
    }

    // Par défaut, si ce n'est ni public ni explicitement protégé
    // mais que l'utilisateur n'est pas connecté, on redirige quand même
    if (!isAuthenticated && currentPath !== '/' && currentPath !== '/auth') {
      redirectToAuth('Accès restreint - Connexion requise');
      return;
    }

    console.log('✅ Accès autorisé');
  }

  // Redirection après connexion réussie
  function handlePostLoginRedirect() {
    const redirectUrl = localStorage.getItem('hotmeet_redirect_after_login');
    if (redirectUrl) {
      console.log('🔄 Redirection post-connexion vers:', redirectUrl);
      localStorage.removeItem('hotmeet_redirect_after_login');
      window.location.href = redirectUrl; // Redirection immédiate, pas de setTimeout
    } else {
      // Pas de page sauvegardée, aller au profil
      window.location.href = '/profile';
    }
  }

  // Observer les changements de token pour déclencher la redirection post-login
  function observeAuthChanges() {
    let lastToken = localStorage.getItem('hotmeet_token');

    setInterval(() => {
      const currentToken = localStorage.getItem('hotmeet_token');

      // Si le token vient d'être ajouté (connexion réussie)
      if (!lastToken && currentToken && window.location.pathname === '/auth') {
        console.log('🎉 Connexion détectée - vérification redirection');
        handlePostLoginRedirect();
      }

      lastToken = currentToken;
    }, 1000);
  }

  // Fonction publique pour déclencher la vérification
  window.checkAuthGuard = checkPageAccess;

  // Fonction publique pour la redirection post-login
  window.handlePostLoginRedirect = handlePostLoginRedirect;

  // Initialisation
  function init() {
    // Vérifier immédiatement
    checkPageAccess();

    // Observer les changements pour la redirection post-login
    observeAuthChanges();

    console.log('🔒 AUTH GUARD initialisé');
  }

  // Démarrer quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
