// ── Lanceur des tests de logique pure ─────────────────────────────────────
// Le projet n'embarque pas de framework de test : les modules concernés sont
// volontairement PURS et injectables (`today`, `nowMinutes`), donc il suffit de
// les compiler en CommonJS et de les exécuter avec Node.
//
// Couverture : le parseur de dictée française (src/lib/voiceParse.ts, avec
// src/lib/frenchNumbers.ts) et le moteur d'humeur (src/game/mood.ts). Ce sont
// les deux endroits où une régression serait invisible à l'œil nu — un titre
// mal découpé ou une icône injustement maussade ne font planter personne.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const build = mkdtempSync(join(tmpdir(), 'lennyx-tests-'));
// ⚠️ On n'appelle PAS `npx` : sous Windows, Node refuse de lancer un .cmd sans
// shell (EINVAL) depuis la v20. On exécute directement l'entrée JS de tsc.
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');

try {
  // Les deux entrées sont compilées ENSEMBLE : la racine commune est `src`,
  // donc les modules atterrissent en `lib/…` et `game/…`.
  execFileSync(process.execPath, [
    tsc, 'src/lib/voiceParse.ts', 'src/game/mood.ts',
    '--outDir', build,
    '--module', 'commonjs', '--target', 'es2020',
    '--moduleResolution', 'node', '--skipLibCheck',
  ], { stdio: 'inherit' });

  for (const suite of ['voice', 'mood']) {
    execFileSync(process.execPath, [join('scripts', 'tests', `${suite}.cjs`)], {
      stdio: 'inherit',
      env: { ...process.env, LENNYX_TEST_BUILD: build },
    });
  }
  console.log('\nTout est conforme.');
} finally {
  rmSync(build, { recursive: true, force: true });
}
