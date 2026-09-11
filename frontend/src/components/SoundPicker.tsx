import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { LoadingSpinner } from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";
import { PlayIcon, CloseIcon } from "./icons";
import * as soundboxApi from "../services/soundbox";
import type { Sound } from "../services/soundbox";
import styles from "./SoundPicker.module.css";

interface SoundPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sound: Sound) => void;
}

export function SoundPicker({ isOpen, onClose, onSelect }: SoundPickerProps) {
  const [tab, setTab] = useState<"trending" | "recent" | "search">("trending");
  const [query, setQuery] = useState("");
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    const loader = tab === "trending" ? soundboxApi.getTrendingSounds() : tab === "recent" ? soundboxApi.getRecentSounds() : Promise.resolve([]);
    loader.then(setSounds).finally(() => setIsLoading(false));
  }, [isOpen, tab]);

  useEffect(() => {
    if (tab !== "search" || query.trim().length === 0) return;
    setIsLoading(true);
    const handle = setTimeout(() => {
      soundboxApi.searchSounds(query).then(setSounds).finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, tab]);

  const togglePreview = (sound: Sound) => {
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!sound.audio_url) return; // no real audio file attached to this catalog entry yet
    audioRef.current?.pause();
    const audio = new Audio(sound.audio_url);
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingId(sound.id);
    audio.onended = () => setPlayingId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SoundBox">
      <div className={styles.tabs}>
        {(["trending", "recent", "search"] as const).map((t) => (
          <button key={t} className={t === tab ? styles.tabActive : styles.tab} onClick={() => setTab(t)}>
            {t === "trending" ? "Trending" : t === "recent" ? "Recent" : "Search"}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <input
          className={styles.searchInput}
          placeholder="Search sounds"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : sounds.length === 0 ? (
        <EmptyState
          title="No sounds yet"
          description={tab === "search" ? "Try a different search term." : "flickzy's SoundBox catalog is still growing."}
        />
      ) : (
        <div className={styles.list}>
          {sounds.map((s) => (
            <div key={s.id} className={styles.row}>
              <button className={styles.playBtn} onClick={() => togglePreview(s)} aria-label="Preview">
                <PlayIcon size={12} />
              </button>
              <div className={styles.info}>
                <span className={styles.title}>{s.title}</span>
                <span className={styles.artist}>
                  {s.artist} {s.source === "original" && "· Original Sound"}
                </span>
              </div>
              <button className={styles.selectBtn} onClick={() => onSelect(s)}>
                Use
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function SelectedSoundChip({ sound, onRemove }: { sound: Sound; onRemove: () => void }) {
  return (
    <div className={styles.selectedChip}>
      <PlayIcon size={11} />
      <span>
        {sound.title} · {sound.artist}
      </span>
      <button onClick={onRemove} aria-label="Remove sound">
        <CloseIcon size={12} />
      </button>
    </div>
  );
}
