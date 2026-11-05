import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';

const SRC = '/audio/theme.mp3';

/**
 * Muted by default, never autoplays. Hidden entirely if the audio file is absent.
 * (The SPA fallback returns index.html with 200 for missing files, so we check the content type.)
 */
export function MusicToggle({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(SRC, { method: 'HEAD' })
      .then((r) => {
        if (!cancelled && r.ok && (r.headers.get('content-type') ?? '').startsWith('audio')) setAvailable(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      audio.current?.pause();
    };
  }, []);

  if (!available) return null;

  const toggle = async () => {
    if (!audio.current) {
      audio.current = new Audio(SRC);
      audio.current.loop = true;
      audio.current.volume = 0.5;
    }
    if (playing) {
      audio.current.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.current.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const Icon = playing ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn btn-ghost !px-3 ${className}`}
      aria-pressed={playing}
      aria-label={playing ? t('common.musicOff') : t('common.musicOn')}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
