// Script SIMPLE pour gérer les régions du profil
console.log('🔧 profile-regions.js chargé');

document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 DOM loaded - setup régions');

  const paysSelect = document.getElementById('profilePays');
  const regionSelect = document.getElementById('profileRegion');

  if (!paysSelect || !regionSelect) {
    console.error('❌ Pas trouvé paysSelect ou regionSelect');
    return;
  }

  console.log('✅ Éléments trouvés');

  // Fonction simple pour charger régions
  function chargerRegions() {
    const pays = paysSelect.value;
    console.log('🏴 Pays sélectionné:', pays);

    // Vider régions
    regionSelect.innerHTML = '<option value="">Choisir une région...</option>';

    // Vérifier si europeanRegions existe
    if (typeof europeanRegions === 'undefined') {
      console.error('❌ europeanRegions non défini !');
      return;
    }

    console.log(
      '📋 europeanRegions OK, pays disponibles:',
      Object.keys(europeanRegions)
    );

    // Charger régions du pays
    if (europeanRegions[pays]) {
      console.log('🌍 Régions pour', pays, ':', europeanRegions[pays].length);

      europeanRegions[pays].forEach(function (regionData) {
        const option = document.createElement('option');
        option.value = regionData.value;
        option.textContent = regionData.name;
        regionSelect.appendChild(option);
      });

      console.log('✅ Régions chargées !');
    } else {
      console.log('❌ Pas de régions pour:', pays);
    }
  }

  // Event sur changement pays
  paysSelect.addEventListener('change', chargerRegions);

  // Charger régions au début si pays déjà sélectionné
  setTimeout(function () {
    if (paysSelect.value) {
      console.log(
        '🔄 Auto-chargement pour pays pré-sélectionné:',
        paysSelect.value
      );
      chargerRegions();
    }
  }, 1000);

  // Re-essayer après 3 secondes
  setTimeout(function () {
    if (paysSelect.value && regionSelect.options.length <= 1) {
      console.log('🔄 Retry chargement régions');
      chargerRegions();
    }
  }, 3000);

  // Fonction globale pour profile.js
  window.reloadRegionsAfterProfileLoad = function () {
    setTimeout(function () {
      if (paysSelect.value) {
        console.log(
          '🔄 Reload régions appelé par profile.js pour:',
          paysSelect.value
        );
        chargerRegions();
      }
    }, 100);
  };
});
