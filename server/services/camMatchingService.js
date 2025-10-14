const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

class CamMatchingService {
  constructor() {
    this.onlineUsers = new Map(); // userId -> socketId
    this.waitingQueue = new Map(); // socketId -> search criteria
    this.activeConnections = new Map(); // connectionId -> { user1, user2 }
  }

  // Ajouter un utilisateur en ligne
  addOnlineUser(userId, socketId, userData) {
    this.onlineUsers.set(userId, {
      socketId,
      userData,
      lastSeen: new Date(),
      status: 'online',
    });
  }

  // Supprimer un utilisateur en ligne
  removeOnlineUser(userId) {
    this.onlineUsers.delete(userId);
  }

  // Ajouter un utilisateur à la file d'attente
  addToWaitingQueue(socketId, searchCriteria) {
    this.waitingQueue.set(socketId, {
      ...searchCriteria,
      joinedAt: new Date(),
      socketId,
      userData: searchCriteria.userData || {
        nom: 'Utilisateur Démo',
        age: 25,
        country: searchCriteria.country || 'fr',
        gender: searchCriteria.gender || 'all',
        language: searchCriteria.language || 'fr',
      },
    });
  }

  // Supprimer de la file d'attente
  removeFromWaitingQueue(socketId) {
    this.waitingQueue.delete(socketId);
  }

  // Trouver un partenaire compatible
  findCompatiblePartner(currentSocketId, currentCriteria) {
    const currentUser = this.waitingQueue.get(currentSocketId);
    if (!currentUser) {
      return null;
    }

    console.log(
      `🔍 Recherche partenaire pour ${currentSocketId} - File d'attente: ${this.waitingQueue.size}`
    );

    for (const [socketId, partnerCriteria] of this.waitingQueue.entries()) {
      if (socketId === currentSocketId) {
        continue;
      }

      console.log(`🤝 Test compatibilité avec ${socketId}:`, partnerCriteria);

      // Vérifier la compatibilité des critères
      if (this.areCriteriaCompatible(currentCriteria, partnerCriteria)) {
        console.log(`✅ Partenaire compatible trouvé: ${socketId}`);
        return {
          socketId,
          criteria: partnerCriteria,
          userId: partnerCriteria.userId,
          userData: partnerCriteria.userData,
        };
      }
    }

    console.log(
      `❌ Aucun partenaire compatible trouvé pour ${currentSocketId}`
    );
    return null;
  }

  // Vérifier la compatibilité des critères
  areCriteriaCompatible(criteria1, criteria2) {
    // En mode démo, accepter tous les partenaires pour faciliter les tests
    console.log('🔍 Comparaison critères:', criteria1, 'vs', criteria2);

    // Vérifier l'âge minimum
    const ageMin1 = parseInt(criteria1.ageMin) || 18;
    const ageMin2 = parseInt(criteria2.ageMin) || 18;
    const ageMax1 = parseInt(criteria1.ageMax) || 100;
    const ageMax2 = parseInt(criteria2.ageMax) || 100;

    // Vérifier que les tranches d'âge se chevauchent
    if (ageMin1 > ageMax2 || ageMin2 > ageMax1) {
      console.log(
        `❌ Âges incompatibles: ${ageMin1}-${ageMax1} vs ${ageMin2}-${ageMax2}`
      );
      return false;
    }

    // Vérifier le genre (plus permissif en mode démo)
    if (criteria1.gender && criteria2.gender) {
      if (criteria1.gender !== 'all' && criteria2.gender !== 'all') {
        if (criteria1.gender !== criteria2.gender) {
          console.log(
            `❌ Genres incompatibles: ${criteria1.gender} vs ${criteria2.gender}`
          );
          return false;
        }
      }
    }

    // Vérifier le pays (plus permissif en mode démo)
    if (criteria1.country && criteria2.country) {
      if (criteria1.country !== 'all' && criteria2.country !== 'all') {
        if (criteria1.country !== criteria2.country) {
          console.log(
            `❌ Pays incompatibles: ${criteria1.country} vs ${criteria2.country}`
          );
          return false;
        }
      }
    }

    console.log('✅ Critères compatibles');
    return true;
  }

  // Créer une connexion entre deux utilisateurs
  createConnection(user1SocketId, user2SocketId) {
    const connectionId = uuidv4();

    this.activeConnections.set(connectionId, {
      user1: user1SocketId,
      user2: user2SocketId,
      createdAt: new Date(),
      status: 'connected',
    });

    // Retirer des files d'attente
    this.removeFromWaitingQueue(user1SocketId);
    this.removeFromWaitingQueue(user2SocketId);

    return connectionId;
  }

  // Terminer une connexion
  endConnection(connectionId) {
    this.activeConnections.delete(connectionId);
  }

  // Récupérer les utilisateurs en ligne par critères
  getOnlineUsersByCriteria(criteria) {
    const compatibleUsers = [];

    for (const [userId, userData] of this.onlineUsers.entries()) {
      if (this.areCriteriaCompatible(criteria, userData.userData)) {
        compatibleUsers.push({
          userId,
          ...userData,
        });
      }
    }

    return compatibleUsers;
  }

  // Statistiques du service
  getStats() {
    return {
      onlineUsers: this.onlineUsers.size,
      waitingQueue: this.waitingQueue.size,
      activeConnections: this.activeConnections.size,
      totalConnections: this.activeConnections.size,
    };
  }

  // Nettoyer les utilisateurs inactifs
  cleanupInactiveUsers(timeoutMinutes = 30) {
    const now = new Date();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    for (const [userId, userData] of this.onlineUsers.entries()) {
      if (now - userData.lastSeen > timeoutMs) {
        this.onlineUsers.delete(userId);
      }
    }

    for (const [socketId, searchData] of this.waitingQueue.entries()) {
      if (now - searchData.joinedAt > timeoutMs) {
        this.waitingQueue.delete(socketId);
      }
    }
  }
}

module.exports = new CamMatchingService();
