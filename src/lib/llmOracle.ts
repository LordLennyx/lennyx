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

═══ RÈGLE ABSOLUE : TU AGIS, TU NE DÉCRIS PAS ═══
Tu n'es pas un conseiller extérieur : tu PILOTES l'application. Dès que tu évoques
une tâche, une quête, une routine ou un programme que l'utilisateur devrait faire,
tu dois la CRÉER RÉELLEMENT en émettant une ligne d'action. Sinon l'utilisateur ne
verra jamais rien apparaître dans ses menus et ta réponse sera un mensonge.

Format exact, une ligne par tâche, à la toute fin de ta réponse :
[ACTION:add-quest:{"title":"...","difficulty":"easy|normal|hard|epic","isEvent":false}]
[ACTION:add-daily:{"title":"...","difficulty":"easy|normal|hard|epic","timeLimit":"HH:MM","days":[1,2,3]}]

- add-quest = tâche ponctuelle. add-daily = routine répétée.
- "days" : 0=dimanche … 6=samedi. Omets-le pour "tous les jours".
- "timeLimit" : uniquement si une heure limite a du sens (ex. "avant 8h" → "08:00").
- Tu peux émettre PLUSIEURS lignes d'affilée (ex. un programme de 4 tâches = 4 lignes).
- Dans ton texte, parle au passé accompli : « C'est ajouté », « Je te l'ai créée ».
- N'annonce JAMAIS une tâche sans émettre sa ligne d'action correspondante.

Émets ces lignes dès que l'utilisateur demande d'ajouter/créer/planifier quelque
chose, OU dès que tu proposes toi-même un programme ou des tâches concrètes.
N'émets rien si la conversation est purement bavarde, informative ou émotionnelle.

Dossier de l'utilisateur (données réelles, à jour) :
${buildDossier(ctx)}`;
}

const ACTION_RE = /\[ACTION:\s*(add-quest|add-daily)\s*:\s*(\{[\s\S]*?\})\s*\]/g;

/**
 * Extrait TOUTES les actions du texte, où qu'elles soient (les modèles les
 * placent parfois au milieu, ou en émettent plusieurs). Tolère les variations
 * d'espacement et les blocs de code markdown autour.
 */
function parseAction(raw: string): { text: string; actions?: OracleAction[] } {
  const actions: OracleAction[] = [];
  let text = raw;
  for (const m of raw.matchAll(ACTION_RE)) {
    try {
      const payload = JSON.parse(m[2]);
      if (payload && typeof payload.title === 'string' && payload.title.trim()) {
        actions.push({ kind: m[1] as 'add-quest' | 'add-daily', payload });
      }
    } catch {
      /* payload illisible : on retire quand même le marqueur du texte affiché */
    }
    text = text.replace(m[0], '');
  }
  // nettoyage des résidus de markdown/ponctuation laissés par le retrait
  text = text
    .replace(/```[a-z]*\s*```/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return actions.length > 0 ? { text, actions } : { text };
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
