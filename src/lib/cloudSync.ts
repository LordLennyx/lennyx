// ── Sauvegarde cloud (v0.6) : compte personnel, palier gratuit Supabase ───
// Aucun serveur Lennyx : l'utilisateur connecte son PROPRE projet Supabase
// gratuit (auth + base de données, aucune carte requise). Le contenu de la
// sauvegarde est chiffré (AES-GCM, mot de passe local) AVANT l'envoi — même
// Supabase ne peut pas lire les données. Résolution de conflit simple :
// on compare les horodatages et on demande confirmation avant d'écraser.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let clientKey = '';

function getClient(url: string, anonKey: string): SupabaseClient {
  const key = `${url}|${anonKey}`;
  if (!client || clientKey !== key) {
    client = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    clientKey = key;
  }
  return client;
}

export interface CloudAuthResult {
  ok: boolean;
  message: string;
  needsEmailConfirm?: boolean;
}

export async function signUp(url: string, anonKey: string, email: string, password: string): Promise<CloudAuthResult> {
  try {
    const c = getClient(url, anonKey);
    const { data, error } = await c.auth.signUp({ email, password });
    if (error) return { ok: false, message: error.message };
    if (!data.session) return { ok: true, message: 'Compte créé — vérifie tes emails pour confirmer.', needsEmailConfirm: true };
    return { ok: true, message: 'Compte créé et connecté.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur de connexion à Supabase' };
  }
}

export async function signIn(url: string, anonKey: string, email: string, password: string): Promise<CloudAuthResult> {
  try {
    const c = getClient(url, anonKey);
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Connecté.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur de connexion à Supabase' };
  }
}

export async function signOut(url: string, anonKey: string): Promise<void> {
  try {
    await getClient(url, anonKey).auth.signOut();
  } catch {
    /* non bloquant */
  }
}

export async function currentUserEmail(url: string, anonKey: string): Promise<string | null> {
  try {
    const { data } = await getClient(url, anonKey).auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export interface RemoteSave {
  payload: string; // JSON chiffré (EncryptedPayload sérialisé)
  updatedAt: number;
}

export async function pushSave(url: string, anonKey: string, encryptedPayloadJson: string): Promise<{ ok: boolean; message: string }> {
  try {
    const c = getClient(url, anonKey);
    const { data: userData } = await c.auth.getUser();
    if (!userData.user) return { ok: false, message: 'Non connecté.' };
    const { error } = await c
      .from('lennyx_saves')
      .upsert({ user_id: userData.user.id, payload: encryptedPayloadJson, updated_at: new Date().toISOString() });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Sauvegarde envoyée au cloud.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur réseau' };
  }
}

export async function pullSave(url: string, anonKey: string): Promise<{ ok: boolean; message: string; save?: RemoteSave }> {
  try {
    const c = getClient(url, anonKey);
    const { data: userData } = await c.auth.getUser();
    if (!userData.user) return { ok: false, message: 'Non connecté.' };
    const { data, error } = await c
      .from('lennyx_saves')
      .select('payload, updated_at')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: 'Aucune sauvegarde cloud pour ce compte pour l’instant.' };
    return { ok: true, message: 'Sauvegarde récupérée.', save: { payload: data.payload, updatedAt: new Date(data.updated_at).getTime() } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur réseau' };
  }
}

/** SQL à exécuter une seule fois dans l'éditeur SQL du projet Supabase de l'utilisateur. */
export const SETUP_SQL = `create table if not exists public.lennyx_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now()
);

alter table public.lennyx_saves enable row level security;

create policy "lennyx_own_save" on public.lennyx_saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);`;
