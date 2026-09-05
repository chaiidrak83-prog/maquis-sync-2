/**
 * Test Automatisé Full-Stack :
 * 1. Auto-inscription Gérants & Serveuses avec Code Établissement
 * 2. Blocage à la connexion des comptes EN_ATTENTE
 * 3. Validation Gérants par le Propriétaire & Contrôle Quotas (Découverte = max 2)
 * 4. Validation Serveuses par le Gérant
 * 5. Rejet & Messages d'erreur explicites
 */

const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runHierarchyTests() {
  console.log('================================================================');
  console.log('🧪 TEST AUTO-INSCRIPTION & HIÉRARCHIE DE VALIDATION STRICTE');
  console.log('================================================================\n');

  // 0. Attente du serveur backend
  console.log('0. Attente de démarrage du serveur backend...');
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      await request({
        hostname: '127.0.0.1',
        port: 3000,
        path: '/auth/admin-login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, { phone: '00000000', password: 'test' });
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  if (!ready) {
    console.error('❌ Le serveur n\'a pas répondu sur le port 3000.');
    process.exit(1);
  }
  console.log('✓ Serveur en ligne.\n');

  // 1. Connexion Super Admin
  console.log('1. Authentification Super Admin...');
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

  const adminJwt = adminLoginRes.data.access_token;
  console.log('✓ Super Admin authentifié.\n');

  // 2. Création d'un Maquis avec formule "Découverte" (Quota max: 2 gérants)
  const ownerPhone = '75' + Math.floor(100000 + Math.random() * 900000);
  console.log(`2. Inscription Propriétaire & Établissement (${ownerPhone} - Découverte)...`);
  const regRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    nom_maquis: 'Maquis du Peuple',
    phone: ownerPhone,
    password: 'ownerPassword123',
    plan: 'Découverte',
    montant: 9900,
  });

  if (regRes.status !== 201) {
    console.error('❌ Échec inscription propriétaire:', regRes);
    process.exit(1);
  }

  const subId = regRes.data.subscription.id;
  const establishmentId = regRes.data.establishment.id;
  const codeEtablissement = regRes.data.establishment.code_etablissement;
  console.log(`✓ Établissement créé avec Code Établissement : "${codeEtablissement}"`);

  // Activer le compte propriétaire
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/admin/accounts/${subId}/validate`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminJwt}`,
    },
  });

  // Connexion Propriétaire
  const ownerLoginRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: ownerPhone,
    password: 'ownerPassword123',
  });

  const ownerJwt = ownerLoginRes.data.access_token;
  console.log('✓ Propriétaire connecté avec succès.\n');

  // 3. Auto-inscription d'un Gérant avec Code Établissement
  const gerant1Phone = '71' + Math.floor(100000 + Math.random() * 900000);
  console.log(`3. Auto-inscription Gérant 1 (${gerant1Phone} avec Code: ${codeEtablissement})...`);
  const regGerant1Res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/register/gerant',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    name: 'Moussa Sanon',
    phone: gerant1Phone,
    password: 'gerantPassword1',
    code_etablissement: codeEtablissement,
  });

  if (regGerant1Res.status !== 201) {
    console.error('❌ Échec auto-inscription gérant:', regGerant1Res);
    process.exit(1);
  }
  const gerant1Id = regGerant1Res.data.user.id;
  console.log(`✓ Gérant 1 créé au statut : ${regGerant1Res.data.user.statut_approbation}`);

  // 4. Tentative de connexion Gérant 1 (Doit être BLOQUÉE avec message exact)
  console.log('4. Test blocage connexion Gérant 1 en attente...');
  const g1LoginAttempt = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: gerant1Phone,
    password: 'gerantPassword1',
  });

  console.log(`-> Statut HTTP : ${g1LoginAttempt.status}`);
  console.log(`-> Message reçu : "${g1LoginAttempt.data.message}"`);
  if (
    g1LoginAttempt.status === 403 &&
    g1LoginAttempt.data.message === 'Votre compte est en attente de validation par votre responsable.'
  ) {
    console.log('✓ SUCCÈS : Connexion strictement bloquée avec le message exact requis.\n');
  } else {
    console.error('❌ Le blocage de connexion du gérant a échoué !', g1LoginAttempt);
    process.exit(1);
  }

  // 5. Auto-inscription d'une Serveuse avec Code Établissement
  const serveuse1Phone = '72' + Math.floor(100000 + Math.random() * 900000);
  console.log(`5. Auto-inscription Serveuse 1 (${serveuse1Phone} avec Code: ${codeEtablissement})...`);
  const regServ1Res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/register/serveuse',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    name: 'Kadi Barry',
    phone: serveuse1Phone,
    password: 'serveusePassword1',
    code_etablissement: codeEtablissement,
  });

  if (regServ1Res.status !== 201) {
    console.error('❌ Échec auto-inscription serveuse:', regServ1Res);
    process.exit(1);
  }
  const serveuse1Id = regServ1Res.data.user.id;
  console.log(`✓ Serveuse 1 créée au statut : ${regServ1Res.data.user.statut_approbation}`);

  // 6. Tentative de connexion Serveuse 1 (Doit être BLOQUÉE)
  console.log('6. Test blocage connexion Serveuse 1 en attente...');
  const serv1LoginAttempt = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: serveuse1Phone,
    password: 'serveusePassword1',
  });

  if (
    serv1LoginAttempt.status === 403 &&
    serv1LoginAttempt.data.message === 'Votre compte est en attente de validation par votre responsable.'
  ) {
    console.log('✓ SUCCÈS : Connexion de la serveuse strictement bloquée avec le message exact requis.\n');
  } else {
    console.error('❌ Le blocage de connexion de la serveuse a échoué !', serv1LoginAttempt);
    process.exit(1);
  }

  // 7. Consultation de l'équipe Gérants par le Propriétaire (GET /gerants)
  console.log('7. Consultation des Gérants par le Propriétaire (GET /gerants)...');
  const listGerantsRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/gerants',
    method: 'GET',
    headers: { Authorization: `Bearer ${ownerJwt}` },
  });

  console.log(`✓ Quota actuel : ${listGerantsRes.data.quota_actuel} / ${listGerantsRes.data.quota_max}`);
  console.log(`✓ Demandes gérants en attente : ${listGerantsRes.data.en_attente.length}`);

  // 8. Approbation du Gérant 1 par le Propriétaire (PATCH /gerants/:id/approuver)
  console.log('\n8. Approbation de Gérant 1 par le Propriétaire...');
  const appG1Res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/gerants/${gerant1Id}/approuver`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerJwt}` },
  });

  if (appG1Res.status !== 200 || appG1Res.data.gerant.statut_approbation !== 'APPROUVE') {
    console.error('❌ Échec approbation Gérant 1:', appG1Res);
    process.exit(1);
  }
  console.log('✓ Gérant 1 approuvé avec succès.');

  // 9. Connexion Gérant 1 post-approbation
  console.log('9. Connexion Gérant 1 après approbation...');
  const g1LoginSuccess = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: gerant1Phone,
    password: 'gerantPassword1',
  });

  if (g1LoginSuccess.status !== 200 || !g1LoginSuccess.data.access_token) {
    console.error('❌ Échec connexion Gérant 1 approuvé:', g1LoginSuccess);
    process.exit(1);
  }
  const gerant1Jwt = g1LoginSuccess.data.access_token;
  console.log('✓ Gérant 1 connecté avec succès et JWT actif obtenu.\n');

  // 10. Test Quotas Gérants (Formule Découverte max 2 gérants)
  console.log('10. Test de la logique des quotas Gérants (Découverte = max 2)...');
  // Création Gérant 2
  const gerant2Phone = '73' + Math.floor(100000 + Math.random() * 900000);
  const regG2 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/register/gerant',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    name: 'Gérant Deux',
    phone: gerant2Phone,
    password: 'pass',
    code_etablissement: codeEtablissement,
  });
  const gerant2Id = regG2.data.user.id;

  // Propriétaire approuve Gérant 2 (Atteint le quota 2/2)
  const appG2Res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/gerants/${gerant2Id}/approuver`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerJwt}` },
  });
  console.log(`✓ Gérant 2 approuvé -> Quota atteint : ${appG2Res.data.quota_actuel}/${appG2Res.data.quota_max}`);

  // Création Gérant 3 (Tentative de dépasser le quota max 2)
  const gerant3Phone = '74' + Math.floor(100000 + Math.random() * 900000);
  const regG3 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/register/gerant',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    name: 'Gérant Trois En Trop',
    phone: gerant3Phone,
    password: 'pass',
    code_etablissement: codeEtablissement,
  });
  const gerant3Id = regG3.data.user.id;

  // Tentative d'approbation Gérant 3 (DOIT ÉCHOUER EN 403 avec message exact)
  const appG3Res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/gerants/${gerant3Id}/approuver`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerJwt}` },
  });

  console.log(`-> Statut HTTP tentative dépassement quota : ${appG3Res.status}`);
  console.log(`-> Message erreur reçu : "${appG3Res.data.message}"`);
  if (
    appG3Res.status === 403 &&
    appG3Res.data.message === 'Quota de gérants atteint. Veuillez passer à l\'offre supérieure.'
  ) {
    console.log('✓ SUCCÈS : Blocage strict du quota de gérants (403) avec message d\'upsell exact.\n');
  } else {
    console.error('❌ La vérification du quota de gérants a échoué !', appG3Res);
    process.exit(1);
  }

  // 11. Approbation de la Serveuse par le Gérant 1 (PATCH /serveuses/:id/approuver)
  console.log('11. Approbation de Serveuse 1 par Gérant 1 (PATCH /serveuses/:id/approuver)...');
  const appServ1Res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/serveuses/${serveuse1Id}/approuver`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${gerant1Jwt}` },
  });

  if (appServ1Res.status !== 200 || appServ1Res.data.serveuse.statut_approbation !== 'APPROUVE') {
    console.error('❌ Échec approbation Serveuse 1 par Gérant 1:', appServ1Res);
    process.exit(1);
  }
  console.log('✓ Serveuse 1 validée avec succès par son Gérant.');

  // 12. Connexion Serveuse 1 post-approbation
  console.log('12. Connexion de Serveuse 1 après validation...');
  const serv1LoginSuccess = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: serveuse1Phone,
    password: 'serveusePassword1',
  });

  if (serv1LoginSuccess.status !== 200 || !serv1LoginSuccess.data.access_token) {
    console.error('❌ Échec connexion Serveuse 1 approuvée:', serv1LoginSuccess);
    process.exit(1);
  }
  console.log('✓ Serveuse 1 connectée avec succès au menu de caisse.\n');

  console.log('================================================================');
  console.log('🎉 TOUS LES TESTS DE HIÉRARCHIE & QUOTAS ONT RÉUSSI À 100% !');
  console.log('================================================================');
}

runHierarchyTests().catch((err) => {
  console.error('Erreur inattendue:', err);
  process.exit(1);
});
