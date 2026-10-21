// "Rechercher une mise à jour": asks the PUDi service worker (scope /pudi/) to check the server.
// The worker calls skipWaiting itself, so a new version takes control at once: the page then
// reloads. Returns 'a_jour' when nothing new arrived within a few seconds.
export type ResultatMiseAJour = 'recharge' | 'a_jour' | 'indisponible';

export async function rechercherMiseAJour(): Promise<ResultatMiseAJour> {
  if (!('serviceWorker' in navigator)) return 'indisponible';
  const reg = await navigator.serviceWorker.getRegistration('/pudi/');
  if (!reg) return 'indisponible';
  return new Promise<ResultatMiseAJour>((resolve) => {
    let fini = false;
    const terminer = (r: ResultatMiseAJour) => {
      if (fini) return;
      fini = true;
      navigator.serviceWorker.removeEventListener('controllerchange', surChangement);
      clearTimeout(minuteur);
      if (r === 'recharge') window.location.reload();
      resolve(r);
    };
    const surChangement = () => terminer('recharge');
    navigator.serviceWorker.addEventListener('controllerchange', surChangement);
    const minuteur = setTimeout(() => terminer(reg.installing || reg.waiting ? 'recharge' : 'a_jour'), 6000);
    reg.update().catch(() => terminer('indisponible'));
  });
}

/** App version injected by the PUDi build ("dev" on the dev server). */
declare const __PUDI_VERSION__: string | undefined;
export const VERSION_PUDI: string = typeof __PUDI_VERSION__ === 'string' ? __PUDI_VERSION__ : 'dev';
