// SOLUTION SIMPLE GÉOLOCALISATION
async detectUserCountry() {
  try {
    const response = await fetch('https://ipinfo.io/json');
    const data = await response.json();
    
    this.userProfile.countryCode = data.country ? data.country.toLowerCase() : 'fr';
    this.userProfile.country = this.getCountryName(this.userProfile.countryCode);
    
    console.log('🌍 PAYS DÉTECTÉ:', this.userProfile.country, this.userProfile.countryCode);
    this.updateUserInfo();
  } catch (error) {
    console.log('⚠️ Fallback France');
    this.userProfile.countryCode = 'fr';
    this.userProfile.country = 'France';
    this.updateUserInfo();
  }
}