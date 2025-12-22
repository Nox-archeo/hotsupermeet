const camMatchingService = require('../services/camMatchingService');
const User = require('../models/User');

class CamController {
  // Récupérer les informations d'un utilisateur pour le cam-to-cam
  async getUserForCam(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId).select(
        'profile.nom profile.age profile.sexe profile.localisation profile.photos profile.bio'
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
        });
      }

      res.json({
        success: true,
        data: {
          _id: user._id,
          nom: user.profile.nom,
          age: user.profile.age,
          sexe: user.profile.sexe,
          localisation: user.profile.localisation,
          photos: user.profile.photos || [],
          bio: user.profile.bio || '',
        },
      });
    } catch (error) {
      console.error('Erreur récupération utilisateur cam:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des informations utilisateur',
        error: error.message,
      });
    }
  }

  // Récupérer les statistiques du service cam
  getCamStats(req, res) {
    try {
      const stats = camMatchingService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Erreur récupération stats cam:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message,
      });
    }
  }

  // Récupérer les utilisateurs en ligne compatibles
  async getCompatibleUsers(req, res) {
    try {
      const { gender, country, ageMin, ageMax } = req.query;
      const userId = req.user.id;

      // 🔒 VÉRIFICATION PREMIUM POUR FILTRES GENRE
      const requestedGender = gender || 'all';
      const isPremium = req.isPremium || false;

      // Si non-premium et essaie de filtrer par genre spécifique, bloquer
      if (
        !isPremium &&
        requestedGender !== 'all' &&
        requestedGender !== 'tous'
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PREMIUM_REQUIRED_FOR_GENDER_FILTER',
            message:
              'Abonnement premium requis pour filtrer par genre spécifique',
            isPremiumRequired: true,
          },
        });
      }

      const criteria = {
        gender: requestedGender === 'tous' ? 'all' : requestedGender,
        country: country || 'tous',
        ageMin: parseInt(ageMin) || 18,
        ageMax: parseInt(ageMax) || 100,
        userId: userId.toString(),
      };

      const compatibleUsers =
        camMatchingService.getOnlineUsersByCriteria(criteria);

      // Récupérer les informations détaillées des utilisateurs
      const usersWithDetails = await Promise.all(
        compatibleUsers.map(async user => {
          const userDetails = await User.findById(user.userId).select(
            'profile.nom profile.age profile.sexe profile.localisation profile.photos'
          );

          return {
            socketId: user.socketId,
            userData: {
              _id: userDetails._id,
              nom: userDetails.profile.nom,
              age: userDetails.profile.age,
              sexe: userDetails.profile.sexe,
              localisation: userDetails.profile.localisation,
              photos: userDetails.profile.photos || [],
            },
            lastSeen: user.lastSeen,
            status: user.status,
          };
        })
      );

      res.json({
        success: true,
        data: usersWithDetails,
      });
    } catch (error) {
      console.error('Erreur récupération utilisateurs compatibles:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des utilisateurs compatibles',
        error: error.message,
      });
    }
  }

  // Marquer un utilisateur comme étant en ligne pour le cam-to-cam
  async markUserOnline(req, res) {
    try {
      const userId = req.user.id;
      const { socketId } = req.body;

      const user = await User.findById(userId).select(
        'profile.nom profile.age profile.sexe profile.localisation profile.photos'
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
        });
      }

      const userData = {
        _id: user._id,
        nom: user.profile.nom,
        age: user.profile.age,
        sexe: user.profile.sexe,
        localisation: user.profile.localisation,
        photos: user.profile.photos || [],
      };

      camMatchingService.addOnlineUser(userId, socketId, userData);

      res.json({
        success: true,
        message: 'Utilisateur marqué comme en ligne',
        data: userData,
      });
    } catch (error) {
      console.error('Erreur marquage utilisateur en ligne:', error);
      res.status(500).json({
        success: false,
        message:
          'Erreur lors du marquage de l\\' + 'utilisateur comme en ligne',
        error: error.message,
      });
    }
  }

  // Marquer un utilisateur comme étant hors ligne
  markUserOffline(req, res) {
    try {
      const userId = req.user.id;

      camMatchingService.removeOnlineUser(userId);

      res.json({
        success: true,
        message: 'Utilisateur marqué comme hors ligne',
      });
    } catch (error) {
      console.error('Erreur marquage utilisateur hors ligne:', error);
      res.status(500).json({
        success: false,
        message:
          'Erreur lors du marquage de l\\' + 'utilisateur comme hors ligne',
        error: error.message,
      });
    }
  }

  // Nettoyer les utilisateurs inactifs
  cleanupInactiveUsers(req, res) {
    try {
      const { timeoutMinutes = 30 } = req.query;

      camMatchingService.cleanupInactiveUsers(parseInt(timeoutMinutes));

      res.json({
        success: true,
        message: 'Nettoyage des utilisateurs inactifs effectué',
      });
    } catch (error) {
      console.error('Erreur nettoyage utilisateurs inactifs:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du nettoyage des utilisateurs inactifs',
        error: error.message,
      });
    }
  }
}

module.exports = new CamController();
