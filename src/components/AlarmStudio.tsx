// ── Studio de réveil : le son, l'extrait, l'image ─────────────────────────
// L'utilisateur choisit un morceau à lui, délimite à la main la portion qui
// servira de réveil, et lui associe une photo de sa galerie. Le couple
// image + son est ensuite déposé côté natif : c'est Android qui l'affichera
// en plein écran, y compris téléphone verrouillé.

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import {
  putMedia, getMedia, deleteMedia, shrinkImage, peaksFrom, type MediaKey,
} from '../lib/mediaStore';
import {
  alarmNativeSupported, saveAlarmMedia, previewAlarm, stopNativeAlarm,
} from '../lib/alarmBridge';

/**
 * Le fichier transite vers le natif encodé en base64 : il existe alors en
 * plusieurs exemplaires en mémoire (blob, chaîne, tableau d'octets). Sur un
 * téléphone d'entrée de gamme, viser large reviendrait à risquer un plantage
 * au moment le plus bête. Douze mégaoctets couvrent un morceau de quatre
 * minutes encodé en 320 kb/s.
 */
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const WAVE_HEIGHT = 78;

function fmtMs(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function AlarmStudio({ kind }: { kind: 'wake' | 'lullaby' }) {
  const alarm = useStore((s) => s.profile.alarms[kind]);
  const setAlarm = useStore((s) => s.setAlarm);
  const pushToast = useStore((s) => s.pushToast);

  const audioRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef<'start' | 'end' | null>(null);

  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0); // position de lecture, en ms

  const audioKey = `${kind}-audio` as MediaKey;
  const imageKey = `${kind}-image` as MediaKey;
  const duration = alarm.audio?.durationMs ?? 0;
  const startMs = alarm.audio?.startMs ?? 0;
  const endMs = alarm.audio?.endMs ?? duration;

  // ── Chargement de ce qui a déjà été choisi ──────────────────────────────
  useEffect(() => {
    let revoked: string | null = null;
    let alive = true;
    void (async () => {
      const img = await getMedia(imageKey);
      if (alive && img) {
        revoked = URL.createObjectURL(img);
        setImageUrl(revoked);
      }
      const audio = await getMedia(audioKey);
      if (alive && audio) await computePeaks(audio);
    })();
    return () => {
      alive = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const computePeaks = async (blob: Blob) => {
    try {
      const ctx = new AudioContext();
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      setPeaks(peaksFrom(buffer, 220));
      void ctx.close();
      return buffer.duration * 1000;
    } catch {
      // Format non décodable par le navigateur : on garde le fichier (Android
      // sait souvent le lire quand même), on se prive juste de la forme d'onde.
      setPeaks(null);
      return 0;
    }
  };

  // ── Dessin de la forme d'onde ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    canvas.width = w * dpr;
    canvas.height = WAVE_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, WAVE_HEIGHT);

    const style = getComputedStyle(document.documentElement);
    const gold = style.getPropertyValue('--gold').trim() || '#d4af37';
    const muted = style.getPropertyValue('--muted').trim() || '#8f8a80';

    const a = duration > 0 ? (startMs / duration) * w : 0;
    const b = duration > 0 ? (endMs / duration) * w : w;

    if (peaks) {
      const step = w / peaks.length;
      for (let i = 0; i < peaks.length; i++) {
        const x = i * step;
        // Hors de l'extrait, l'onde s'efface : la zone retenue doit sauter aux yeux.
        ctx.fillStyle = x >= a && x <= b ? gold : muted;
        ctx.globalAlpha = x >= a && x <= b ? 0.95 : 0.28;
        const h = Math.max(1.5, peaks[i] * (WAVE_HEIGHT - 8));
        ctx.fillRect(x, (WAVE_HEIGHT - h) / 2, Math.max(1, step - 0.6), h);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = muted;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(0, WAVE_HEIGHT / 2 - 1, w, 2);
      ctx.globalAlpha = 1;
    }

    // Poignées
    for (const x of [a, b]) {
      ctx.fillStyle = gold;
      ctx.fillRect(x - 1.5, 0, 3, WAVE_HEIGHT);
      ctx.beginPath();
      ctx.arc(x, WAVE_HEIGHT / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tête de lecture
    if (playing && duration > 0) {
      const x = (cursor / duration) * w;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x - 0.5, 0, 1, WAVE_HEIGHT);
      ctx.globalAlpha = 1;
    }
  }, [peaks, startMs, endMs, duration, cursor, playing]);

  // ── Poignées de découpe ─────────────────────────────────────────────────
  const msFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    return Math.round(ratio * duration);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (duration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ms = msFromEvent(e);
    // On saisit la poignée la plus proche : au doigt, viser au pixel près
    // serait intenable.
    dragRef.current = Math.abs(ms - startMs) <= Math.abs(ms - endMs) ? 'start' : 'end';
    applyDrag(ms);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    applyDrag(msFromEvent(e));
  };

  const onPointerUp = () => { dragRef.current = null; };

  const applyDrag = (ms: number) => {
    if (!alarm.audio) return;
    const MIN = 3000; // un extrait plus court qu'une inspiration ne réveille personne
    if (dragRef.current === 'start') {
      setAlarm(kind, { audio: { ...alarm.audio, startMs: Math.min(ms, endMs - MIN) } });
    } else {
      setAlarm(kind, { audio: { ...alarm.audio, endMs: Math.max(ms, startMs + MIN) } });
    }
  };

  // ── Écoute de l'extrait ─────────────────────────────────────────────────
  const togglePlay = async () => {
    if (playing) {
      playerRef.current?.pause();
      setPlaying(false);
      return;
    }
    const blob = await getMedia(audioKey);
    if (!blob) return;
    const el = playerRef.current ?? new Audio();
    playerRef.current = el;
    el.src = URL.createObjectURL(blob);
    el.volume = alarm.volume;
    el.currentTime = startMs / 1000;
    el.onended = () => setPlaying(false);
    // Boucle sur la seule portion délimitée : c'est exactement ce que le
    // service Android jouera, autant l'entendre tel quel.
    el.ontimeupdate = () => {
      setCursor(el.currentTime * 1000);
      if (el.currentTime * 1000 >= endMs) el.currentTime = startMs / 1000;
    };
    await el.play().catch(() => undefined);
    setPlaying(true);
  };

  useEffect(() => () => {
    playerRef.current?.pause();
    playerRef.current = null;
  }, []);

  // ── Sélection des fichiers ──────────────────────────────────────────────
  const onAudioFile = async (f: File) => {
    if (f.size > MAX_AUDIO_BYTES) {
      pushToast('warning', 'Fichier trop lourd (12 Mo max) — choisis un morceau plus court', 'warn');
      return;
    }
    setBusy('Analyse du morceau…');
    try {
      await putMedia(audioKey, f);
      const ms = await computePeaks(f);
      const durationMs = ms || 60_000;
      // Par défaut : les trente premières secondes. L'utilisateur affine ensuite.
      const end = Math.min(durationMs, 30_000);
      setBusy('Transfert vers le réveil…');
      const nativePath = await saveAlarmMedia(`${kind}-audio-${Date.now()}.snd`, f);
      setAlarm(kind, {
        melody: 'file',
        audio: { name: f.name, startMs: 0, endMs: end, durationMs, nativePath: nativePath ?? undefined },
      });
      pushToast('check', `« ${f.name} » prêt — délimite ta zone`, 'info');
    } catch {
      pushToast('warning', 'Ce fichier n’a pas pu être enregistré', 'warn');
    } finally {
      setBusy('');
    }
  };

  const onImageFile = async (f: File) => {
    setBusy('Préparation de l’image…');
    try {
      const small = await shrinkImage(f);
      await putMedia(imageKey, small);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(URL.createObjectURL(small));
      const nativePath = await saveAlarmMedia(`${kind}-image-${Date.now()}.jpg`, small);
      setAlarm(kind, { image: { name: f.name, nativePath: nativePath ?? undefined } });
      pushToast('check', 'Fond du réveil enregistré', 'info');
    } catch {
      pushToast('warning', 'Cette image n’a pas pu être enregistrée', 'warn');
    } finally {
      setBusy('');
    }
  };

  const clearAudio = async () => {
    playerRef.current?.pause();
    setPlaying(false);
    await deleteMedia(audioKey);
    setPeaks(null);
    setAlarm(kind, { audio: undefined, melody: kind === 'wake' ? 'aube' : 'lune' });
  };

  const clearImage = async () => {
    await deleteMedia(imageKey);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setAlarm(kind, { image: undefined });
  };

  const isWake = kind === 'wake';

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted" style={{ letterSpacing: '0.08em', fontSize: 11, textTransform: 'uppercase' }}>
          Ton {isWake ? 'réveil' : 'endormissement'} sur mesure
        </span>
        {busy && <span className="badge">{busy}</span>}
      </div>

      {/* ── Le son ── */}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn small" onClick={() => audioRef.current?.click()}>
          <Icon name="music" size={13} /> {alarm.audio ? 'Changer de morceau' : 'Choisir un son de l’appareil'}
        </button>
        {alarm.audio && (
          <>
            <button className="btn small" onClick={() => void togglePlay()}>
              <Icon name={playing ? 'close' : 'bolt'} size={13} /> {playing ? 'Stop' : 'Écouter l’extrait'}
            </button>
            <button className="btn small danger" onClick={() => void clearAudio()}>Retirer</button>
          </>
        )}
        <input
          ref={audioRef} type="file" accept="audio/*" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onAudioFile(f); e.target.value = ''; }}
        />
      </div>

      {alarm.audio && (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            ♪ {alarm.audio.name}
          </div>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%', height: WAVE_HEIGHT, display: 'block', touchAction: 'none',
              borderRadius: 10, background: 'var(--panel-2, rgba(255,255,255,0.03))',
              border: '1px solid var(--border)', cursor: 'ew-resize',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Début {fmtMs(startMs)} · Fin {fmtMs(endMs)} · Durée de l’extrait {fmtMs(endMs - startMs)}
            </span>
          </div>
          <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>
            Fais glisser les deux poignées pour choisir le passage. Il tournera en boucle
            jusqu’à ce que tu arrêtes le {isWake ? 'réveil' : 'son'}.
          </p>
        </div>
      )}

      {/* ── L'image ── */}
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn small" onClick={() => imageRef.current?.click()}>
          <Icon name="image" size={13} /> {alarm.image ? 'Changer l’image' : 'Choisir une image de fond'}
        </button>
        {alarm.image && (
          <button className="btn small danger" onClick={() => void clearImage()}>Retirer</button>
        )}
        <input
          ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImageFile(f); e.target.value = ''; }}
        />
      </div>

      {imageUrl && (
        <div style={{ marginTop: 10, position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img src={imageUrl} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
          {/* Aperçu fidèle de l'écran natif : voile, filet or, monogramme */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.8))' }} />
          <div style={{ position: 'absolute', inset: 8, border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)', borderRadius: 8 }} />
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.4em', color: 'var(--gold)' }}>
            LENNYX
          </div>
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.08em' }}>
            {alarm.time}
          </div>
        </div>
      )}

      {/* ── La phrase affichée ── */}
      <input
        className="input"
        style={{ marginTop: 12, width: '100%' }}
        placeholder={isWake ? 'Phrase affichée au réveil (optionnel)' : 'Phrase du soir (optionnel)'}
        maxLength={80}
        value={alarm.label ?? ''}
        onChange={(e) => setAlarm(kind, { label: e.target.value })}
      />

      {/* ── Relance ── */}
      {isWake && (
        <div className="row" style={{ marginTop: 12, alignItems: 'center' }}>
          <span className="muted" style={{ width: 130 }}>Insister toutes les</span>
          <select
            className="input" style={{ maxWidth: 130 }}
            value={alarm.repeatMin}
            onChange={(e) => setAlarm(kind, { repeatMin: Number(e.target.value) })}
          >
            <option value={2}>2 minutes</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={0}>ne pas insister</option>
          </select>
        </div>
      )}

      {alarmNativeSupported() && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => void previewAlarm(kind)}>
            <Icon name="bolt" size={13} /> Essayer maintenant
          </button>
          <button className="btn small" onClick={() => void stopNativeAlarm()}>Arrêter l’essai</button>
        </div>
      )}
    </div>
  );
}
