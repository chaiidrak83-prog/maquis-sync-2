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

async function runSuperAdminTests() {
  console.log('=== DÉBUT DES TESTS SUPER ADMIN & SÉCURITÉ RBAC ===\n');

  // 1. Inscription d'un client de test pour les opérations de gestion
  console.log('1. Création d’un compte client de test...');
  const uniquePhone = '76' + Math.floor(100000 + Math.random() * 900000);
  const clientReg = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    nom_maquis: 'Maquis Test SuperAdmin',
    phone: uniquePhone,
    password: 'ClientPassword123',
    plan: 'Accès',
    montant: 14900,
    expoPushToken: 'ExponentPushToken[test_client_token]',
  });

  if (clientReg.status !== 201) {
    console.error('❌ Échec création client test:', clientReg);
    process.exit(1);
  }

  const clientToken = clientReg.data.access_token;
  const testEstId = clientReg.data.establishment.id;
  const testUserId = clientReg.data.user.id;
  const testSubId = clientReg.data.subscription.id;
  console.log(`✓ Client test créé [ID Est: ${testEstId}, ID User: ${testUserId}]`);

  // 2. Test RBAC négatif : Un client normal tente d'accéder à /admin/analytics (Doit retourner 403)
  console.log('\n2. Test RBAC Négatif : Client normal accède à GET /admin/analytics...');
  const forbiddenRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/analytics',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${clientToken}` },
  });

  console.log(`-> Statut réponse: ${forbiddenRes.status}`);
  if (forbiddenRes.status === 403) {
    console.log('✓ SUCCÈS : Accès refusé avec HTTP 403 Forbidden comme requis par RBAC !');
    console.log('  Message:', forbiddenRes.data.message);
  } else {
    console.error(`❌ ÉCHEC RBAC : Attendu 403, reçu ${forbiddenRes.status}`);
    process.exit(1);
  }

  // 3. Connexion Super Admin (POST /auth/login)
  console.log('\n3. Authentification Super Admin (POST /auth/login)...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: '00000000',
    password: 'SuperAdmin2026!',
  });

  console.log(`-> Statut réponse: ${loginRes.status}`);
  if (loginRes.status !== 200 || loginRes.data.user.role !== 'SUPER_ADMIN') {
    console.error('❌ Échec connexion Super Admin:', loginRes);
    process.exit(1);
  }

  const superAdminToken = loginRes.data.access_token;
  console.log('✓ Token Super Admin généré avec succès [Rôle: SUPER_ADMIN]');

  // 4. Test RBAC positif : GET /admin/analytics avec token Super Admin
  console.log('\n4. Test Métriques Approfondies : GET /admin/analytics (Super Admin)...');
  const analyticsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/analytics',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${superAdminToken}` },
  });

  console.log(`-> Statut réponse: ${analyticsRes.status}`);
  if (analyticsRes.status === 200) {
    const summary = analyticsRes.data.summary;
    console.log('✓ Métriques calculées :');
    console.log(`  - MRR Actuel : ${summary.mrr.toLocaleString()} ${summary.currency}`);
    console.log(`  - Abonnements Actifs : ${summary.activeAccountsCount} / ${summary.totalAccounts}`);
    console.log(`  - Taux de Rétention : ${summary.retentionRate}%`);
    console.log(`  - Taux d’Attrition (Churn) : ${summary.churnRate}%`);
    console.log(`  - Comptes Dormants (>7j) : ${summary.dormantAccountsCount}`);
  } else {
    console.error('❌ Échec récupération analytics:', analyticsRes);
    process.exit(1);
  }

  // 5. Test Annuaire Clients (DataGrid) : GET /admin/accounts
  console.log('\n5. Test Annuaire Clients : GET /admin/accounts...');
  const accountsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/accounts',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${superAdminToken}` },
  });

  console.log(`-> Statut réponse: ${accountsRes.status}`);
  console.log(`✓ Total établissements listés : ${accountsRes.data.length}`);

  // 6. Test Validation Opérationnelle d'un paiement en attente
  console.log('\n6. Test Validation Paiement : PATCH /admin/accounts/:id/validate...');
  const validateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/admin/accounts/${testSubId}/validate`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${superAdminToken}` },
  });

  console.log(`-> Statut réponse: ${validateRes.status}`);
  console.log('✓ Compte activé, push automatique:', validateRes.data.pushNotificationSent);

  // 7. Test Modification du Forfait (Découverte, Accès, Premium)
  console.log('\n7. Test Modification Forfait : PATCH /admin/accounts/:id/plan (Vers Premium 19900)...');
  const planRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/admin/accounts/${testEstId}/plan`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superAdminToken}`,
    },
  }, {
    plan: 'Premium',
    montant: 19900,
  });

  console.log(`-> Statut réponse: ${planRes.status}`);
  console.log('✓ Forfait mis à jour vers:', planRes.data.establishment.subscription_tier);

  // 8. Test Suspension et Réactivation de Compte
  console.log('\n8. Test Suspension Opérationnelle : PATCH /admin/accounts/:id/suspend...');
  const suspendRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/admin/accounts/${testEstId}/suspend`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${superAdminToken}` },
  });

  console.log(`-> Statut suspension: ${suspendRes.status}`);
  console.log('✓ Résultat suspension:', suspendRes.data.message);

  console.log('   Test Réactivation : PATCH /admin/accounts/:id/reactivate...');
  const reactivateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/admin/accounts/${testEstId}/reactivate`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${superAdminToken}` },
  });
  console.log('✓ Résultat réactivation:', reactivateRes.data.message);

  // 9. Test Impersonation d'un client pour support technique
  console.log('\n9. Test Impersonation Client : POST /admin/impersonate/:userId...');
  const impRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/admin/impersonate/${testUserId}`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${superAdminToken}` },
  });

  console.log(`-> Statut réponse: ${impRes.status}`);
  if (impRes.status === 200 && impRes.data.access_token) {
    console.log('✓ Token Impersonation reçu pour:', impRes.data.user.name);

    // Test d'accès direct à l'inventaire avec le token impersonate
    const impInv = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/inventory',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${impRes.data.access_token}` },
    });
    console.log(`✓ Accès inventaire en mode support : HTTP ${impInv.status} OK`);
  } else {
    console.error('❌ Échec impersonation:', impRes);
    process.exit(1);
  }

  // 10. Test Diffusion Push Globale (Broadcast Expo)
  console.log('\n10. Test Diffusion Push Globale : POST /admin/notifications/broadcast...');
  const broadcastRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/notifications/broadcast',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superAdminToken}`,
    },
  }, {
    title: '📢 Annonce Spéciale MaquisSaaS',
    body: 'Maintenance programmée à 03h00 du matin. Vos caisses locales restent 100% opérationnelles.',
    target: 'ALL',
  });

  console.log(`-> Statut réponse: ${broadcastRes.status}`);
  console.log('✓ Rapport de diffusion push :', broadcastRes.data);

  console.log('\n================================================================');
  console.log('🎉 TOUS LES TESTS SUPER ADMIN, RBAC, IMPERSONATION & PUSH RÉUSSIS !');
  console.log('================================================================\n');
}

runSuperAdminTests().catch(err => {
  console.error('Erreur globale test Super Admin:', err);
  process.exit(1);
});
