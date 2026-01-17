const fs = require('fs');

try {
  const report = JSON.parse(fs.readFileSync('lighthouse-scores.json', 'utf8'));

  console.log('🎯 AUDIT SEO COMPLET - www.hotsupermeet.com');
  console.log('==================================================');
  console.log('');

  // Scores principaux
  console.log('📊 SCORES PRINCIPAUX :');
  console.log('─────────────────────────────────────────────────');
  console.log(
    `📈 PERFORMANCE : ${Math.round(report.categories.performance.score * 100)}/100`
  );
  console.log(`🔍 SEO : ${Math.round(report.categories.seo.score * 100)}/100`);
  console.log(
    `♿ ACCESSIBILITÉ : ${Math.round(report.categories.accessibility.score * 100)}/100`
  );
  console.log(
    `✅ BONNES PRATIQUES : ${Math.round(report.categories['best-practices'].score * 100)}/100`
  );
  console.log('');

  // Core Web Vitals
  console.log('🚀 CORE WEB VITALS :');
  console.log('─────────────────────────────────────────────────');
  const lcp = report.audits['largest-contentful-paint'];
  const fid = report.audits['max-potential-fid'];
  const cls = report.audits['cumulative-layout-shift'];

  console.log(
    `⚡ LCP (Largest Contentful Paint) : ${lcp.displayValue} (${lcp.score >= 0.9 ? '✅' : lcp.score >= 0.5 ? '⚠️' : '❌'})`
  );
  console.log(
    `🖱️  FID (First Input Delay) : ${fid.displayValue} (${fid.score >= 0.9 ? '✅' : fid.score >= 0.5 ? '⚠️' : '❌'})`
  );
  console.log(
    `📏 CLS (Cumulative Layout Shift) : ${cls.displayValue} (${cls.score >= 0.9 ? '✅' : cls.score >= 0.5 ? '⚠️' : '❌'})`
  );
  console.log('');

  // Points d'amélioration critiques
  console.log("🚨 POINTS D'AMÉLIORATION PRIORITAIRES :");
  console.log('─────────────────────────────────────────────────');

  const criticalAudits = [];

  Object.keys(report.audits).forEach(auditKey => {
    const audit = report.audits[auditKey];
    if (
      audit.score !== null &&
      audit.score < 0.9 &&
      audit.details &&
      audit.details.items &&
      audit.details.items.length > 0
    ) {
      criticalAudits.push({
        title: audit.title,
        score: audit.score,
        description: audit.description,
      });
    }
  });

  // Tri par score (les plus problématiques en premier)
  criticalAudits
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)
    .forEach((audit, index) => {
      console.log(
        `${index + 1}. ${audit.score < 0.5 ? '❌' : '⚠️'} ${audit.title}`
      );
    });

  console.log('');
  console.log('📁 RAPPORT DÉTAILLÉ :');
  console.log('─────────────────────────────────────────────────');
  console.log(
    `📝 Rapport HTML : lighthouse-report.html (${Math.round(fs.statSync('lighthouse-report.html').size / 1024)}KB)`
  );
  console.log(
    `📊 Rapport JSON : lighthouse-scores.json (${Math.round(fs.statSync('lighthouse-scores.json').size / 1024)}KB)`
  );
  console.log('');
  console.log('🌐 Ouvrir le rapport complet dans le navigateur :');
  console.log('   open lighthouse-report.html');
} catch (error) {
  console.error('❌ Erreur lors de la lecture du rapport:', error.message);
}
