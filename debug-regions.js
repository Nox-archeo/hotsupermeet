const fs = require('fs');

// Lire le fichier regions-europe.js
const regionsContent = fs.readFileSync('public/js/regions-europe.js', 'utf8');

// Extraire la liste des pays de profile-clean.html
const profileContent = fs.readFileSync('public/pages/profile-clean.html', 'utf8');
const countryMatches = profileContent.match(/option value="([a-z-]+)"[^>]*>(?!Choisir)/g);

console.log('=== PAYS DANS LA PAGE PROFIL ===');
const profileCountries = [];
if (countryMatches) {
  countryMatches.forEach(match => {
    const country = match.match(/value="([^"]+)"/)[1];
    if (country && country !== '') {
      profileCountries.push(country);
      console.log(`📍 ${country}`);
    }
  });
}

console.log('\n=== VÉRIFICATION DANS REGIONS-EUROPE.JS ===');
profileCountries.forEach(country => {
  const regex = new RegExp(`\\s+${country}:\\s*\\[`, 'g');
  const exists = regex.test(regionsContent);
  console.log(`${exists ? '✅' : '❌'} ${country}: ${exists ? 'TROUVÉ' : 'MANQUANT'}`);
});
