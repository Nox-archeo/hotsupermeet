// TEST CRITIQUE - Vérification variables PayPal
require('dotenv').config();

console.log('🔍 VÉRIFICATION VARIABLES PAYPAL...\n');

const requiredVars = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_SECRET',
  'PAYPAL_PLAN_MONTHLY_ID',
  'APP_URL',
  'MONGODB_URI',
];

const missing = [];
const present = [];

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    present.push(varName);
    console.log(`✅ ${varName}: ${process.env[varName].substring(0, 10)}...`);
  } else {
    missing.push(varName);
    console.log(`❌ ${varName}: MANQUANT`);
  }
});

console.log('\n📊 RÉSULTATS:');
console.log(`✅ Présent: ${present.length}/${requiredVars.length}`);
console.log(`❌ Manquant: ${missing.length}/${requiredVars.length}`);

if (missing.length > 0) {
  console.log('\n🚨 VARIABLES MANQUANTES - LE PAIEMENT NE FONCTIONNERA PAS:');
  missing.forEach(varName => console.log(`   - ${varName}`));
  process.exit(1);
} else {
  console.log('\n🎉 TOUTES LES VARIABLES SONT PRÉSENTES !');
}
