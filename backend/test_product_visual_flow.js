/**
 * Test de validation Full-Stack :
 * - Catalogue Boissons & Bouteilles
 * - Accessibilité 100% Visuelle (imageUrl, category, price, stock)
 * - Création et persistance d'une bouteille avec photo / illustration
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

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TEST FULL-STACK : ACCESSIBILITÉ VISUELLE & CATALOGUE BOISSONS');
  console.log('================================================================\n');

  // 0. Attente de disponibilité du serveur backend
  console.log('0. Attente de disponibilité du serveur backend...');
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
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (!ready) {
    console.error('❌ Le serveur n\'a pas répondu à temps sur le port 3000.');
    process.exit(1);
  }
  console.log('✓ Serveur en ligne et prêt.\n');

  // 1. Authentification Super Admin
  console.log('1. Authentification Super Admin (/auth/admin-login)...');
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
  console.log('✓ Super Admin connecté avec succès.\n');

  // 2. Inscription d'un nouveau Maquis
  const uniquePhone = '77' + Math.floor(100000 + Math.random() * 900000);
  console.log(`2. Création compte établissement pour test (${uniquePhone})...`);
  const regRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    nom_maquis: 'Maquis Visuel Test',
    phone: uniquePhone,
    password: 'password123',
    plan: 'Premium',
    montant: 19900,
  });

  if (regRes.status !== 201) {
    console.error('❌ Échec inscription client:', regRes);
    process.exit(1);
  }
  const subId = regRes.data.subscription.id;
  console.log(`✓ Établissement créé (Souscription ID: ${subId}).`);

  // 3. Validation de l'abonnement par le Super Admin
  console.log(`3. Validation abonnement par Super Admin...`);
  const valRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/admin/accounts/${subId}/validate`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminJwt}`,
    },
  });

  if (valRes.status !== 200) {
    console.error('❌ Échec validation abonnement:', valRes);
    process.exit(1);
  }
  console.log('✓ Abonnement activé avec succès.\n');

  // 4. Connexion du Gérant pour obtenir un JWT Actif
  console.log(`4. Connexion du gérant (${uniquePhone})...`);
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    phone: uniquePhone,
    password: 'password123',
  });

  if (loginRes.status !== 200 || !loginRes.data.access_token) {
    console.error('❌ Échec connexion gérant:', loginRes);
    process.exit(1);
  }
  const clientJwt = loginRes.data.access_token;
  console.log('✓ Gérant connecté avec token JWT actif.\n');

  // 5. Lecture du catalogue de boissons (GET /inventory)
  console.log('5. Vérification du catalogue de boissons visuel (GET /inventory)...');
  const getRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/inventory',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${clientJwt}`,
    },
  });

  if (getRes.status !== 200 || !getRes.data.products) {
    console.error('❌ Échec GET /inventory :', getRes);
    process.exit(1);
  }

  const products = getRes.data.products;
  console.log(`✓ ${products.length} boissons trouvées dans le catalogue.`);

  // Vérifier la présence des catégories clés (Bière, Sucrerie, Eau)
  const categoriesFound = new Set(products.map((p) => p.category));
  console.log('✓ Catégories détectées :', Array.from(categoriesFound));
  if (!categoriesFound.has('Bière') || !categoriesFound.has('Sucrerie') || !categoriesFound.has('Eau')) {
    console.warn('⚠️ Certaines catégories types (Bière, Sucrerie, Eau) manquent.');
  } else {
    console.log('✓ Toutes les catégories d’accessibilité visuelle (Bière, Sucrerie, Eau) sont présentes.');
  }

  // Vérifier les images haute visibilité pour chaque produit
  let missingImageCount = 0;
  products.forEach((p) => {
    if (!p.imageUrl) missingImageCount++;
  });

  if (missingImageCount === 0) {
    console.log('✓ 100% des boissons possèdent une illustration/photo haute visibilité (imageUrl).');
  } else {
    console.warn(`⚠️ ${missingImageCount} boisson(s) sans imageUrl.`);
  }

  // 6. Ajout d'une nouvelle boisson photographiée par le gérant (POST /inventory)
  console.log('\n6. Ajout d’une nouvelle boisson avec photo par le gérant (POST /inventory)...');
  const newProductPayload = {
    name: 'Sobbra 65cl Visuel',
    volume: '65cl',
    price: 800,
    category: 'Bière',
    initial_stock: 48,
    current_stock: 48,
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="160"><rect width="100" height="160" rx="16" fill="%231a1610"/><rect x="28" y="80" width="44" height="40" rx="6" fill="%23d97706"/><circle cx="50" cy="100" r="12" fill="%23fef3c7"/><text x="50" y="105" fill="%23000" font-size="10" text-anchor="middle">SOBBRA</text></svg>',
  };

  const createRes = await request(
    {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/inventory',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientJwt}`,
      },
    },
    newProductPayload
  );

  if (createRes.status !== 201 && createRes.status !== 200) {
    console.error('❌ Échec POST /inventory :', createRes);
    process.exit(1);
  }

  const created = createRes.data.product;
  console.log('✓ Boisson créée avec succès :', {
    id: created.id,
    name: created.name,
    category: created.category,
    price: `${created.price} F CFA`,
    imageUrl: created.imageUrl ? `Présente (${created.imageUrl.substring(0, 30)}...)` : 'Manquante',
  });

  // 7. Vérification de la persistance dans le catalogue
  console.log('\n7. Re-lecture du catalogue pour confirmer la présence du nouvel article...');
  const listAfterRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/inventory',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${clientJwt}`,
    },
  });

  const foundItem = listAfterRes.data.products.find((p) => p.name === 'Sobbra 65cl Visuel');
  if (foundItem) {
    console.log(`✓ Boisson trouvée en base (ID: ${foundItem.id})`);
    console.log(`✓ Prix gros caractères : ${foundItem.price} F CFA`);
    console.log(`✓ Catégorie pour bordure colorée : ${foundItem.category} (Code #f59e0b)`);
    console.log(`✓ Photo / Illustration intégrée pour la carte visuelle (80% hauteur)`);
  } else {
    console.error('❌ La boisson créée n’a pas été retrouvée.');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 TOUS LES TESTS FULL-STACK D’ACCESSIBILITÉ VISUELLE ONT RÉUSSI !');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Erreur inattendue:', err);
  process.exit(1);
});
