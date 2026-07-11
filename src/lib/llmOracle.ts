// ── Pont vers l'Oracle en ligne (Google Gemini, palier gratuit) ───────────
// Aucun coût : l'utilisateur fournit sa propre clé API gratuite (aistudio.
// google.com/apikey, aucune carte bancaire requise). La clé ne quitte jamais
// l'appareil sauf pour l'appel direct à l'API Google.
//
// CORS : sur Electron, la requête passe par le process principal (Node,
// aucune restriction CORS) via window.lennyxLLM. Sur Android, CapacitorHttp
// est activé (capacitor.config.ts) et patche fetch pour router nativement,
// contournant aussi le CORS. Sur web nu, on tente un fetch direct.

import { buildDossier, type OracleAction, type OracleContext } from '../game/oracle';
import type { OracleMessage } from '../game/types';

interface LLMBridge {
  request: (opts: { url: string; body: string }) => Promise<{ ok: boolean; status: number; text: string }>;
}

const PERSONAS: Record<string, string> = {
  chaleureux:
    "Ton ton est chaleureux, complice et rassurant. Tu tutoies. Tu n'es jamais culpabilisant ni moralisateur, sauf si on te le demande explicitement en plaisantant.",
  direct:
    'Ton ton est direct et concis : tu vas droit au but sans dorer la pilule, mais tu restes bienveillant et jamais froid.',
  motivant:
    "Ton ton est motivant et énergique, façon coach sportif affectueux — tu pousses gentiment à l'action, avec humour si besoin.",
};

function systemPrompt(ctx: OracleContext): string {
  const tone = ctx.profile.llm.tone;
  return `Tu es "l'Oracle", le compagnon intégré de l'application Lennyx (une to-do list gamifiée : quêtes, XP, streaks, or). ${PERSONAS[tone] ?? PERSONAS.chaleureux}
Tu parles français. L'utilisateur peut te raconter des anecdotes, des doutes, des histoires du quotidien : écoute, rebondis avec pertinence, ne génère aucun stress. Tu peux aussi répondre à des questions complexes et personnalisées en t'appuyant sur le dossier de données ci-dessous — utilise les chiffres pour être honnête, mais intègre-les dans une conversation naturelle plutôt que de les réciter mécaniquement. Reste concis (moins de 120 mots) sauf si on te demande un développement.

Si (et seulement si) l'utilisateur te demande explicitement de créer une tâche, une quête ou une routine, termine ta réponse par UNE ligne, exactement dans ce format, sans rien autour :
[ACTION:add-quest:{"title":"...","difficulty":"easy|normal|hard|epic","isEvent":false}]
ou
[ACTION:add-daily:{"title":"...","difficulty":"easy|normal|hard|epic","timeLimit":"HH:MM","days":[1,2,3]}]
(timeLimit et days sont optionnels, omets-les si non pertinents). N'ajoute cette ligne dans AUCUN autre cas.

Dossier de l'utilisateur (données réelles, à jour) :
${buildDossier(ctx)}`;
}

function parseAction(raw: string): { text: string; actions?: OracleAction[] } {
  const m = raw.match(/\[ACTION:(add-quest|add-daily):(\{[\s\S]*?\})\]\s*$/);
  if (!m) return { text: raw.trim() };
  try {
    const payload = JSON.parse(m[2]);
    return { text: raw.slice(0, m.index).trim(), actions: [{ kind: m[1] as 'add-quest' | 'add-daily', payload }] };
  } catch {
    return { text: raw.replace(m[0], '').trim() };
  }
}

async function rawFetch(url: string, body: string): Promise<string> {
  const bridge = (window as unknown as { lennyxLLM?: LLMBridge }).lennyxLLM;
  if (bridge) {
    const res = await bridge.request({ url, body });
    if (!res.ok) throw new Error(`L'Oracle n'a pas pu joindre le ciel (${res.status})`);
    return res.text;
  }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (!res.ok) throw new Error(`L'Oracle n'a pas pu joindre le ciel (${res.status})`);
  return await res.text();
}

export class OracleOfflineError extends Error {}

export async function askCloudOracle(
  userText: string,
  ctx: OracleContext,
  history: OracleMessage[],
): Promise<{ text: string; actions?: OracleAction[] }> {
  const { apiKey, model } = ctx.profile.llm;
  if (!apiKey) throw new OracleOfflineError('no-key');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OracleOfflineError('offline');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = [
    ...history.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: userText }] },
  ];
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt(ctx) }] },
    contents,
    generationConfig: { temperature: 0.9, maxOutputTokens: 500 },
  });

  let raw: string;
  try {
    raw = await rawFetch(url, body);
  } catch (e) {
    throw new OracleOfflineError(e instanceof Error ? e.message : 'network');
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Réponse illisible de l'Oracle en ligne.");
  }
  if (data?.error) throw new Error(data.error.message ?? 'Erreur de l’API Gemini');
  const textOut: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('');
  if (!textOut) throw new Error("L'Oracle est resté silencieux — réessaie dans un instant.");
  return parseAction(textOut);
}

export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (rapide, recommandé)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (plus lent, plus fin)' },
];
