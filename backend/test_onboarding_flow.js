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

async function runTests() {
  console.log('=== DÉBUT DES TESTS ONBOARDING & SÉCURITÉ JWT ===\n');
  const uniquePhone = '77' + Math.floor(100000 + Math.random() * 900000);

  // 1. TEST POST /auth/register
  console.log('1. Test Inscription (/auth/register)...');
  const registerPayload = {
    nom_maquis: 'Maquis Le Phénix Test',
    phone: uniquePhone,
    password: 'passwordSuperSecure123',
    plan: 'Accès',
    montant: 14900,
    expoPushToken: 'ExponentPushToken[mock_token_test_123]',
  };

  const regRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, registerPayload);

  console.log(`-> Statut réponse: ${regRes.status}`);
  if (regRes.status !== 201) {
    console.error('ERREUR Inscription:', regRes);
    process.exit(1);
  }

  const token = regRes.data.access_token;
  const subId = regRes.data.subscription.id;
  console.log('✓ Token JWT généré:', token.substring(0, 35) + '...');
  console.log('✓ Statut compte initial:', regRes.data.subscription.statut_paiement);
  console.log('✓ ID Souscription:', subId);

  // 2. TEST RESTRICTION: GET /inventory avec statut en_attente (Doit retourner 403)
  console.log('\n2. Test Restriction JWT -> GET /inventory (Statut en_attente)...');
  const invRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/inventory',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  console.log(`-> Statut réponse: ${invRes.status}`);
  if (invRes.status === 403) {
    console.log('✓ SUCCÈS : Accès refusé avec HTTP 403 Forbidden comme requis !');
    console.log('  Message:', invRes.data.message);
  } else {
    console.error(`❌ ÉCHEC : Attendu 403, reçu ${invRes.status}`);
    process.exit(1);
  }

  // 3. TEST RESTRICTION: GET /orders avec statut en_attente (Doit retourner 403)
  console.log('\n3. Test Restriction JWT -> GET /orders (Statut en_attente)...');
  const ordRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/orders',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  console.log(`-> Statut réponse: ${ordRes.status}`);
  if (ordRes.status === 403) {
    console.log('✓ SUCCÈS : Accès aux commandes refusé avec HTTP 403 Forbidden !');
  } else {
    console.error(`❌ ÉCHEC : Attendu 403, reçu ${ordRes.status}`);
    process.exit(1);
  }

  // 4. TEST ACCÈS AUTORISÉ EN ATTENTE: GET /auth/me (Doit retourner 200)
  console.log('\n4. Test Endpoint Autorisé en attente -> GET /auth/me...');
  const meRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  console.log(`-> Statut réponse: ${meRes.status}`);
  if (meRes.status === 200) {
    console.log('✓ SUCCÈS : Profil utilisateur accessible [Nom: ' + meRes.data.name + ']');
  } else {
    console.error(`❌ ÉCHEC : Attendu 200, reçu ${meRes.status}`);
    process.exit(1);
  }

  // 5. TEST ACCÈS STATUT: GET /subscriptions/status/:id (Doit retourner 200)
  console.log('\n5. Test Vérification Statut -> GET /subscriptions/status/' + subId + '...');
  const statusRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/subscriptions/status/${subId}`,
    method: 'GET',
  });

  console.log(`-> Statut réponse: ${statusRes.status}`);
  console.log('✓ Statut souscription reçu:', statusRes.data.statut_paiement);

  // 6. TEST ACTIVATION ADMIN: PATCH /admin/subscriptions/:id/activate
  console.log('\n6. Test Validation Manuelle Admin (Simulation Preuve WhatsApp)...');
  const actRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/admin/subscriptions/${subId}/activate`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'admin-secret-key-maquis-2026',
    },
  });

  console.log(`-> Statut réponse: ${actRes.status}`);
  console.log('✓ Résultat activation:', actRes.data.success ? 'ACTIF' : 'ÉCHEC');
  console.log('✓ Push Notification déclenchée:', actRes.data.pushNotificationSent);

  // 7. TEST DÉBLOCAGE DYNAMIQUE: GET /inventory (Doit maintenant retourner 200 OK !)
  console.log('\n7. Test Déblocage dynamique -> GET /inventory après activation...');
  const invRes2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/inventory',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  console.log(`-> Statut réponse: ${invRes2.status}`);
  if (invRes2.status === 200) {
    console.log('✓ SUCCÈS : Inventaire débloqué avec succès ! Total boissons: ' + invRes2.data.products.length);
    console.log('  Message serveur:', invRes2.data.message);
  } else {
    console.error(`❌ ÉCHEC : Attendu 200 après activation, reçu ${invRes2.status}`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🎉 TOUS LES TESTS ONBOARDING ET RESTRICTION JWT ONT RÉUSSI !');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Erreur globale test:', err);
  process.exit(1);
});
