// Script pour identifier les utilisateurs suspects par pays
// À exécuter dans MongoDB ou via ton admin

db.users
  .find(
    {
      location: {
        $regex: /(algeria|algerie|benin|côte|cote|cameroon|cameroun)/i,
      },
    },
    {
      _id: 1,
      email: 1,
      pseudo: 1,
      location: 1,
      createdAt: 1,
      lastLogin: 1,
      profilePhoto: 1,
    }
  )
  .sort({ createdAt: -1 });
