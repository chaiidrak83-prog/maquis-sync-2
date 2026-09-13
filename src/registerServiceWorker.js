// Service Worker Registration Helper for MaquisSync
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✓ MaquisSync ServiceWorker enregistré avec succès:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('⚡ Nouvelle version de MaquisSync disponible. Rechargement...');
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
    });
  }
}
