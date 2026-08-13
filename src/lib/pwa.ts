// ── Ce que Lennyx sait de son propre hébergement ──────────────────────────
// Une PWA doit savoir si elle tourne dans un onglet ou en application
// installée : la marche à suivre pour l'installer, les capacités disponibles
// et jusqu'aux marges de sécurité en dépendent.

export type Host = 'browser' | 'installed' | 'electron' | 'capacitor';
export type AppleFlavor = 'macos' | 'ios' | 'none';

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent);

/** L'application tourne-t-elle hors du navigateur (Dock, écran d'accueil) ? */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // `navigator.standalone` est la seule réponse fiable sur iOS ; ailleurs,
  // c'est la media query qui fait foi.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches;
}

export function hostKind(): Host {
  if (typeof window === 'undefined') return 'browser';
  if ((window as unknown as { lennyxSync?: unknown }).lennyxSync) return 'electron';
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return 'capacitor';
  return isInstalled() ? 'installed' : 'browser';
}

/**
 * Distingue macOS d'iOS/iPadOS. L'iPad se présente comme un Mac depuis
 * iPadOS 13 : seul le nombre de points de contact les sépare encore.
 */
export function appleFlavor(): AppleFlavor {
  const s = ua();
  if (/iPhone|iPod/.test(s)) return 'ios';
  const touchMac = /Macintosh/.test(s) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
  if (/iPad/.test(s) || touchMac) return 'ios';
  if (/Macintosh|Mac OS X/.test(s)) return 'macos';
  return 'none';
}

export const isSafari = (): boolean =>
  /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua());

/** Marche à suivre pour installer, dans les mots du navigateur employé. */
export function installSteps(): { title: string; steps: string[] } | null {
  const flavor = appleFlavor();
  const safari = isSafari();

  if (flavor === 'macos') {
    return safari
      ? {
          title: 'Installer Lennyx dans ton Dock',
          steps: [
            'Menu « Fichier » → « Ajouter au Dock… »',
            'Garde le nom Lennyx, puis valide',
            'Lennyx devient une application à part entière : fenêtre propre, icône dans le Dock, et Cmd+Tab comme les autres',
          ],
        }
      : {
          title: 'Installer Lennyx comme application',
          steps: [
            'Clique sur l’icône d’installation dans la barre d’adresse (à droite)',
            'Ou : menu du navigateur → « Installer Lennyx… »',
            'Lennyx s’ouvre alors dans sa propre fenêtre, sans onglets ni barre d’adresse',
          ],
        };
  }

  if (flavor === 'ios') {
    return {
      title: 'Installer Lennyx sur ton écran d’accueil',
      steps: [
        'Ouvre cette page dans Safari (les autres navigateurs iOS ne savent pas installer)',
        'Bouton Partager (le carré avec la flèche), en bas',
        '« Sur l’écran d’accueil », puis « Ajouter »',
      ],
    };
  }

  return {
    title: 'Installer Lennyx comme application',
    steps: [
      'Menu du navigateur → « Installer Lennyx » ou « Ajouter à l’écran d’accueil »',
      'L’application s’ouvre ensuite dans sa propre fenêtre, et fonctionne hors ligne',
    ],
  };
}

/**
 * Ce que la version installée sait faire, et ce qu'elle ne saura pas faire.
 * Mieux vaut l'annoncer que laisser l'utilisateur le découvrir un matin où
 * son réveil n'a pas sonné.
 */
export function pwaCapabilities(): { ok: string[]; ko: string[] } {
  const apple = appleFlavor() !== 'none';
  return {
    ok: [
      'Toutes tes données, en local, sans compte',
      'Fonctionne hors ligne une fois installée',
      'Chronomètre et Pomodoro justes au retour, même après des heures',
      'Oracle, notes, finances, boutique, succès : rien ne manque',
    ],
    ko: apple
      ? [
          'Le podomètre ne compte que l’application ouverte — Safari ne donne pas accès au capteur de pas',
          'Le réveil ne sonne que si Lennyx est ouvert : il ne peut pas prendre l’écran verrouillé',
          'Les rappels n’arrivent pas application fermée',
        ]
      : [
          'Le podomètre ne compte que l’application ouverte',
          'Le réveil ne sonne que si Lennyx est ouvert',
        ],
  };
}
