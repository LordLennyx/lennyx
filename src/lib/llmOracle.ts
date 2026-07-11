// ── Pont vers l'Oracle en ligne : Google Gemini ou Groq, paliers gratuits ─
// Aucun coût : l'utilisateur fournit sa propre clé API gratuite. La clé ne
// quitte jamais l'appareil sauf pour l'appel direct à l'API du fournisseur.
//
// ⚠ Le palier gratuit de Google Gemini n'est PAS disponible dans l'Union
// Européenne, au Royaume-Uni ni en Suisse (restriction Google, pas un bug
// de Lennyx — vérifié empiriquement : la clé s'authentifie, mais le quota
// gratuit vaut 0 pour ces régions). Groq n'a pas cette restriction et est
// recommandé par défaut.
//
// CORS : les deux API acceptent le fetch direct depuis le navigateur/WebView
// (vérifié). Sur Electron, on passe quand même par le proxy IPC principal
// par prudence (aucune restriction CORS possible côté Node) ; sur Android,
// CapacitorHttp est activé en secours.

import { buildDossier, type OracleAction, type OracleContext } from '../game/oracle';
import type { OracleMessage } from '../game/types';

interface LLMBridge {
  request: (opts: { url: string; body: string; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; text: string }>;
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

async function rawFetch(url: string, body: string, headers: Record<string, string>): Promise<{ status: number; text: string }> {
  const bridge = (window as unknown as { lennyxLLM?: LLMBridge }).lennyxLLM;
  if (bridge) {
    const res = await bridge.request({ url, body, headers });
    return { status: res.status, text: res.text };
  }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
  return { status: res.status, text: await res.text() };
}

export class OracleOfflineError extends Error {}
export class OracleQuotaError extends Error {}

interface ProviderResult {
  text: string;
}

async function callGemini(system: string, history: OracleMessage[], userText: string, apiKey: string, model: string): Promise<ProviderResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = [
    ...history.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: userText }] },
  ];
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.9, maxOutputTokens: 500 },
  });
  const { status, text: raw } = await rawFetch(url, body, {});
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Réponse illisible de Gemini.");
  }
  if (status === 429) {
    throw new OracleQuotaError(
      'Google Gemini : quota gratuit épuisé (ou indisponible dans ta région — le palier gratuit de Gemini n’est pas proposé dans l’UE/UK/Suisse). Essaie le fournisseur Groq dans Réglages.',
    );
  }
  if (data?.error) throw new Error(data.error.message ?? 'Erreur de l’API Gemini');
  const textOut: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('');
  if (!textOut) throw new Error("L'Oracle est resté silencieux — réessaie dans un instant.");
  return { text: textOut };
}

async function callGroq(system: string, history: OracleMessage[], userText: string, apiKey: string, model: string): Promise<ProviderResult> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const messages = [
    { role: 'system', content: system },
    ...history.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: userText },
  ];
  const body = JSON.stringify({ model, messages, temperature: 0.9, max_tokens: 500 });
  const { status, text: raw } = await rawFetch(url, body, { Authorization: `Bearer ${apiKey}` });
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Réponse illisible de Groq.');
  }
  if (status === 401) throw new Error('Clé Groq invalide ou expirée — vérifie-la dans Réglages.');
  if (status === 429) throw new OracleQuotaError('Groq : quota atteint pour l’instant, réessaie dans un instant.');
  if (data?.error) throw new Error(data.error.message ?? 'Erreur de l’API Groq');
  const textOut: string | undefined = data?.choices?.[0]?.message?.content;
  if (!textOut) throw new Error("L'Oracle est resté silencieux — réessaie dans un instant.");
  return { text: textOut };
}

export async function askCloudOracle(
  userText: string,
  ctx: OracleContext,
  history: OracleMessage[],
): Promise<{ text: string; actions?: OracleAction[] }> {
  const { apiKey, model, provider } = ctx.profile.llm;
  if (!apiKey) throw new OracleOfflineError('no-key');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OracleOfflineError('offline');

  const system = systemPrompt(ctx);
  let result: ProviderResult;
  try {
    result = provider === 'groq'
      ? await callGroq(system, history, userText, apiKey, model)
      : await callGemini(system, history, userText, apiKey, model);
  } catch (e) {
    if (e instanceof OracleQuotaError || e instanceof OracleOfflineError) throw e;
    throw new OracleOfflineError(e instanceof Error ? e.message : 'network');
  }
  return parseAction(result.text);
}

export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (recommandé)' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (ultra-rapide)' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
];

export function defaultModelFor(provider: 'gemini' | 'groq'): string {
  return provider === 'groq' ? GROQ_MODELS[0].id : GEMINI_MODELS[0].id;
}
