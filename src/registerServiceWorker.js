// Service Worker Registration Helper for MaquisSync
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✓ MaquisSync ServiceWorker enregistré avec succès:', registration.scope);

          // Force une vérification immédiate de mise à jour auprès du serveur
          registration.update().catch(() => {});

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('⚡ Nouvelle version de MaquisSync détectée. Activation...');
                    installingWorker.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    console.log('✓ Contenu mis en cache pour une utilisation 100% hors-ligne.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('Échec enregistrement ServiceWorker:', error);
        });

      // Recharger automatiquement la page dès que le nouveau ServiceWorker prend le contrôle
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }
}
