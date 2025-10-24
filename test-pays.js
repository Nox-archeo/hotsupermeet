const fs = require('fs');
const content = fs.readFileSync('public/js/regions-europe.js', 'utf8');
eval(content);

console.log('=== TEST PAYS ===');
const paysTests = ['france', 'suisse', 'belgique', 'allemagne', 'italie', 'espagne'];
paysTests.forEach(pays => {
  const existe = !!europeanRegions[pays];
  const regions = existe ? europeanRegions[pays].length : 0;
  console.log(`${existe ? '✅' : '❌'} ${pays}: ${existe ? regions + ' régions' : 'MANQUANT'}`);
});
