const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, text: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runCompleteTestSuite() {
  console.log('================================================================');
  console.log('🧪 TEST FULL-STACK : ONBOARDING CLIENT & CONSOLE SUPER ADMIN');
  console.log('================================================================\n');

  // 0. Connexion préalable du Super Admin pour obtenir un JWT Admin
  console.log('0. Authentification Super Admin (/auth/admin-login)...');
  const adminLoginRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/admin-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: '00000000',
    password: 'SuperAdmin2026!',
  });

  if (adminLoginRes.status !== 200 || !adminLoginRes.data.access_token) {
    console.error('❌ Échec connexion Super Admin:', adminLoginRes);
    process.exit(1);
  }
  const adminJwt = adminLoginRes.data.access_token;
  console.log('✓ Super Admin connecté avec succès. JWT Admin obtenu.\n');

  // 1. Onboarding Client : Formulaire avec Nom maquis, Téléphone, Mot de passe et Formule
  const uniquePhone = '76' + Math.floor(100000 + Math.random() * 900000);
  const testMaquis = 'Maquis L\'Oasis du Sahel';
  console.log(`1. Inscription Onboarding Client (${testMaquis} - ${uniquePhone} - Formule Accès 14900 F)...`);
  
  const registerRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    nom_maquis: testMaquis,
    phone: uniquePhone,
    password: 'PasswordSecurise2026!',
    plan: 'Accès',
    montant: 14900,
    expoPushToken: 'ExponentPushToken[mock_client_device_token_777]',
  });

  console.log(`-> Statut HTTP création : ${registerRes.status}`);
  if (registerRes.status !== 201 || !registerRes.data.access_token) {
    console.error('❌ Échec inscription client:', registerRes);
    process.exit(1);
  }

  const clientJwt = registerRes.data.access_token;
  const establishmentId = registerRes.data.establishment.id;
  const userId = registerRes.data.user.id;
  const subId = registerRes.data.subscription.id;

  console.log(`✓ Établissement créé [ID: ${establishmentId}] avec statut_paiement = '${registerRes.data.user.statut_paiement}'`);
  console.log(`✓ Souscription créée [ID: ${subId}, Plan: Accès, Montant: 14900 F CFA]`);
  console.log(`✓ JWT Client généré avec restriction de paiement.\n`);

  // 2. Test du Verrouillage JWT : Vérification du rejet HTTP 403 sur /inventory et /orders
  console.log('2. Test de Sécurité : Tentative d\'accès aux routes opérationnelles avant paiement...');
  
  const inventoryAttempt = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/inventory',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${clientJwt}` },
  });

  console.log(`-> /inventory HTTP Status : ${inventoryAttempt.status}`);
  if (inventoryAttempt.status !== 403) {
    console.error(`❌ ÉCHEC : /inventory aurait dû être bloqué en 403, reçu ${inventoryAttempt.status}`);
    process.exit(1);
  }
  console.log(`✓ SUCCÈS : Route /inventory strictement bloquée en HTTP 403 Forbidden.`);
  console.log(`  Message de blocage : "${inventoryAttempt.data.message}"\n`);

  const orderAttempt = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/orders',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${clientJwt}` },
  });

  console.log(`-> /orders HTTP Status : ${orderAttempt.status}`);
  if (orderAttempt.status !== 403) {
    console.error(`❌ ÉCHEC : /orders aurait dû être bloqué en 403, reçu ${orderAttempt.status}`);
    process.exit(1);
  }
  console.log(`✓ SUCCÈS : Route /orders également bloquée en HTTP 403.\n`);

  // 3. Consultation du statut de paiement pour le polling de l'écran d'attente
  console.log('3. Test Polling Écran d\'attente (/subscriptions/status/:id)...');
  const statusPolling = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/subscriptions/status/${subId}`,
    method: 'GET',
  });

  console.log(`-> Statut polling reçu :`, statusPolling.data);
  if (statusPolling.status !== 200 || statusPolling.data.statut_paiement !== 'en_attente') {
    console.error('❌ Statut polling incorrect:', statusPolling);
    process.exit(1);
  }
  console.log('✓ Polling opérationnel : Confirme le statut "en_attente".\n');

  // 4. Centre de Validation Super Admin : Validation du compte (@Roles('SUPER_ADMIN'))
  console.log('4. Validation du compte par le Super Admin (PATCH /admin/accounts/:id/validate)...');
  const validateRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/admin/accounts/${establishmentId}/validate`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminJwt}`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`-> Statut validation : ${validateRes.status}`, validateRes.data);
  if (validateRes.status !== 200 || !validateRes.data.success) {
    console.error('❌ Échec validation du compte:', validateRes);
    process.exit(1);
  }
  console.log('✓ Compte activé par l\'administrateur. Notification push déclenchée au client.\n');

  // 5. Test du Déblocage Dynamique : L'accès aux routes opérationnelles doit maintenant être autorisé (HTTP 200)
  console.log('5. Vérification du déblocage opérationnel post-validation (/inventory)...');
  const inventoryUnlocked = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/inventory',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${clientJwt}` },
  });

  console.log(`-> /inventory HTTP Status débloqué : ${inventoryUnlocked.status}`);
  if (inventoryUnlocked.status !== 200 || !inventoryUnlocked.data.products) {
    console.error('❌ ÉCHEC : /inventory aurait dû être accessible en 200 après validation, reçu:', inventoryUnlocked);
    process.exit(1);
  }
  console.log(`✓ SUCCÈS : Catalogue débloqué ! Produits accessibles : ${inventoryUnlocked.data.products.length} articles disponibles.\n`);

  // 6. Impersonation Super Admin : Prise de contrôle support technique avec JWT temporaire
  console.log(`6. Test Impersonation (/admin/impersonate/${userId})...`);
  const impersonateRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/admin/impersonate/${userId}`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminJwt}`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`-> Statut Impersonation : ${impersonateRes.status}`);
  if (impersonateRes.status !== 200 || !impersonateRes.data.access_token) {
    console.error('❌ Échec impersonation:', impersonateRes);
    process.exit(1);
  }
  console.log(`✓ Token d'impersonation temporaire (2h) généré avec succès pour le client "${impersonateRes.data.user.name}".\n`);

  // 7. Dashboard Analyses Super Admin : MRR, Churn, Volumes par formule
  console.log('7. Test Dashboard Analytics (/admin/analytics)...');
  const analyticsRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/admin/analytics',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminJwt}` },
  });

  console.log(`-> Statut Analytics : ${analyticsRes.status}`);
  if (analyticsRes.status !== 200) {
    console.error('❌ Échec analytics:', analyticsRes);
    process.exit(1);
  }
  const { summary, planDistribution } = analyticsRes.data;
  console.log(`✓ MRR calculé : ${summary.mrr.toLocaleString('fr-FR')} F CFA`);
  console.log(`✓ Taux de Churn : ${summary.churnRate}% | Rétention : ${summary.retentionRate}%`);
  console.log(`✓ Répartition des Formules :`, planDistribution);

  console.log('\n================================================================');
  console.log('🎉 TOUS LES 7 TESTS FULL-STACK DU SYSTÈME SONT VALIDÉS À 100% !');
  console.log('================================================================\n');
}

runCompleteTestSuite().catch(err => {
  console.error('❌ ERREUR TEST SUITE:', err);
  process.exit(1);
});
