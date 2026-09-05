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

async function runSecurityTests() {
  console.log('=== TEST DE SÉCURITÉ DE L\'ENDPOINT /auth/admin-login ===\n');

  // Test 1: Inscription d'un compte client ordinaire pour tester le rejet
  console.log('1. Création d\'un compte client ordinaire (rôle OWNER)...');
  const clientPhone = '77' + Math.floor(100000 + Math.random() * 900000);
  const clientReg = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    nom_maquis: 'Maquis Client Test',
    phone: clientPhone,
    password: 'ClientPassword123!',
    plan: 'Accès',
    montant: 14900,
  });

  if (clientReg.status !== 201) {
    console.error('❌ Échec création compte client test:', clientReg);
    process.exit(1);
  }
  console.log(`✓ Compte client créé avec succès : ${clientPhone} [Rôle: OWNER]`);

  // Test 2: Le client tente de se connecter sur /auth/admin-login avec son bon mot de passe
  console.log('\n2. Test de Rejet : Client normal se connecte sur /auth/admin-login...');
  const normalUserAttempt = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/admin-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: clientPhone,
    password: 'ClientPassword123!',
  });

  console.log(`-> Statut HTTP reçu : ${normalUserAttempt.status}`);
  console.log(`-> Message réponse :`, normalUserAttempt.data.message);

  if (normalUserAttempt.status !== 403) {
    console.error(`❌ ÉCHEC : Le client aurait dû être rejeté en 403, reçu ${normalUserAttempt.status}`);
    process.exit(1);
  }
  console.log('✓ SUCCÈS : Rejeté avec HTTP 403 Forbidden (Accès refusé : privilèges insuffisants)');

  // Test 3: Numéro aléatoire inexistant
  console.log('\n3. Test Opaque : Numéro inexistant se connecte sur /auth/admin-login...');
  const fakePhoneAttempt = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/admin-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: '99999999',
    password: 'RandomPassword999',
  });

  console.log(`-> Statut HTTP reçu : ${fakePhoneAttempt.status}`);
  if (fakePhoneAttempt.status !== 403) {
    console.error(`❌ ÉCHEC : Attendu 403 Forbidden constant, reçu ${fakePhoneAttempt.status}`);
    process.exit(1);
  }
  console.log('✓ SUCCÈS : Réponse 403 identique sans révéler l\'inexistence du compte');

  // Test 4: Bon numéro Super Admin mais mauvais mot de passe
  console.log('\n4. Test Opaque : Super Admin avec mauvais mot de passe...');
  const wrongPwdAttempt = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/admin-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: '00000000',
    password: 'MauvaisMotDePasse!',
  });

  console.log(`-> Statut HTTP reçu : ${wrongPwdAttempt.status}`);
  if (wrongPwdAttempt.status !== 403) {
    console.error(`❌ ÉCHEC : Attendu 403, reçu ${wrongPwdAttempt.status}`);
    process.exit(1);
  }
  console.log('✓ SUCCÈS : Rejeté en 403 sans divulguer si le mot de passe était correct ou non');

  // Test 5: Bon numéro Super Admin et bon mot de passe
  console.log('\n5. Test d\'Autorisation : Super Admin avec mot de passe valide...');
  const validAdminLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/admin-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: '00000000',
    password: 'SuperAdmin2026!',
  });

  console.log(`-> Statut HTTP reçu : ${validAdminLogin.status}`);
  if (validAdminLogin.status !== 200 || !validAdminLogin.data.access_token || validAdminLogin.data.user.role !== 'SUPER_ADMIN') {
    console.error('❌ ÉCHEC : La connexion Super Admin valide a échoué:', validAdminLogin);
    process.exit(1);
  }
  console.log('✓ SUCCÈS : Connexion 200 OK autorisée ! Token JWT généré avec rôle SUPER_ADMIN');

  console.log('\n==========================================================');
  console.log('🎉 TOUS LES TESTS DE SÉCURITÉ /auth/admin-login SONT RÉUSSIS !');
  console.log('==========================================================\n');
}

runSecurityTests().catch(err => {
  console.error('Erreur test:', err);
  process.exit(1);
});
