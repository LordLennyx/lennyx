// ── Nombres dits en français → chiffres ───────────────────────────────────
// Brique indispensable de la dictée : à l'oral on dit « huit heures et demie »,
// « deux mille cinq cents francs », « quatre-vingt-dix pages ». Les moteurs de
// reconnaissance normalisent parfois en chiffres, parfois pas du tout — on ne
// peut pas parier dessus. Tout le reste du parseur travaille donc sur un texte
// où les nombres ont été réécrits en chiffres, une bonne fois pour toutes.
//
// 100 % local, aucune dépendance : c'est de l'arithmétique de mots.

/** Unités, adolescences et dizaines simples (y compris les formes belges/suisses). */
const WORDS: Record<string, number> = {
  zero: 0,
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
  huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14,
  quinze: 15, seize: 16,
  vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  septante: 70, huitante: 80, octante: 80, nonante: 90,
};

/** Multiplicateurs. `cent` multiplie le morceau courant, `mille` le solde. */
const SCALES: Record<string, number> = {
  cent: 100, cents: 100,
  mille: 1000, milles: 1000, mil: 1000,
  million: 1_000_000, millions: 1_000_000,
  milliard: 1_000_000_000, milliards: 1_000_000_000,
};

/** Minuscules sans accents, pour comparer des mots sans se soucier de la casse. */
export function deaccent(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function isNumberWord(w: string): boolean {
  return WORDS[w] !== undefined || SCALES[w] !== undefined;
}

/**
 * Convertit une suite de mots-nombres en valeur. Renvoie null si la suite ne
 * contient aucun nombre.
 *
 * La seule subtilité du français est que « vingt » devient multiplicateur quand
 * il suit « quatre » (quatre-vingt-dix-sept = 4×20 + 10 + 7). On corrige donc
 * le morceau courant au lieu d'y ajouter 20.
 */
export function frenchNumber(words: string[]): number | null {
  let total = 0;
  let chunk = 0;
  let prev = 0;
  let seen = false;

  for (const raw of words) {
    const w = deaccent(raw);
    if (w === 'et' || w === '') continue; // « vingt et un »
    const unit = WORDS[w];
    if (unit !== undefined) {
      if (unit === 20 && prev === 4) chunk = chunk - 4 + 80; // quatre-vingt(s)
      else chunk += unit;
      prev = unit;
      seen = true;
      continue;
    }
    const scale = SCALES[w];
    if (scale !== undefined) {
      if (scale === 100) chunk = (chunk === 0 ? 1 : chunk) * 100;
      else {
        total += (chunk === 0 ? 1 : chunk) * scale;
        chunk = 0;
      }
      prev = 0;
      seen = true;
      continue;
    }
    return null; // mot étranger : la suite n'est pas un nombre
  }
  return seen ? total + chunk : null;
}

/**
 * Réécrit en chiffres tous les nombres dits en lettres dans un texte.
 *
 * ⚠️ « un » et « une » restent intacts quand ils sont seuls : ce sont presque
 * toujours des articles (« ajoute une quête », « acheter un livre »), et les
 * transformer en « 1 » détruirait les titres. Dans une suite de plusieurs mots
 * (« vingt et un », « cent un »), ils comptent normalement.
 */
export function normalizeNumbers(text: string): string {
  // Les traits d'union font partie des nombres composés : on les traite comme
  // des espaces, puis on recolle. « quatre-vingt-dix » doit se lire en 3 mots.
  const tokens = text.split(/([^\p{L}\p{N}]+)/u); // alternance mots / séparateurs
  const out: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    // les index pairs sont des mots, les impairs des séparateurs
    if (i % 2 === 1 || !isNumberWord(deaccent(tok))) {
      out.push(tok);
      i++;
      continue;
    }

    // on avale la plus longue suite de mots-nombres (séparés par espaces,
    // traits d'union ou « et »)
    const words: string[] = [];
    let j = i;
    let lastWordIdx = i;
    while (j < tokens.length) {
      const w = tokens[j];
      if (j % 2 === 1) {
        // séparateur : seuls espaces et traits d'union prolongent un nombre
        if (!/^[\s-]+$/.test(w)) break;
        j++;
        continue;
      }
      const d = deaccent(w);
      if (isNumberWord(d)) {
        words.push(d);
        lastWordIdx = j;
        j++;
        continue;
      }
      if (d === 'et') {
        // « et » ne prolonge que s'il est suivi d'un mot-nombre
        const next = tokens[j + 2];
        if (next && isNumberWord(deaccent(next))) {
          words.push('et');
          j++;
          continue;
        }
      }
      break;
    }

    const soloArticle = words.length === 1 && (words[0] === 'un' || words[0] === 'une');
    const value = soloArticle ? null : frenchNumber(words);
    if (value === null) {
      out.push(tok);
      i++;
      continue;
    }
    out.push(String(value));
    // on saute jusqu'au dernier mot consommé ; le séparateur qui suit sera
    // réémis tel quel au tour d'après
    i = lastWordIdx + 1;
  }

  return out.join('');
}

/**
 * Lit un nombre écrit en chiffres tel que l'oral le produit : « 5 000 »,
 * « 2.500 », « 12,50 ». Les espaces et points de milliers sautent, la virgule
 * devient le séparateur décimal.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/\s/g, '');
  if (s.includes(',')) {
    // virgule décimale : les points restants sont des séparateurs de milliers
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, ''); // 1.234.567
  } else {
    // un seul point : milliers si trois chiffres suivent exactement (1.500)
    const m = s.match(/^(\d+)\.(\d{3})$/);
    if (m) s = m[1] + m[2];
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
