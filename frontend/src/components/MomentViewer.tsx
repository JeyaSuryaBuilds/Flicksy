import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { CloseIcon, BackIcon } from "./icons";
import { viewMoment } from "../services/moments";
import type { MomentAuthorGroup } from "../types";
import styles from "./MomentViewer.module.css";

interface MomentViewerProps {
  groups: MomentAuthorGroup[];
  startGroupIndex: number;
  onClose: () => void;
}

const MOMENT_DURATION_MS = 5000;

const FILTER_CSS: Record<string, string> = {
  none: "none",
  warm: "sepia(0.35) saturate(1.3) brightness(1.05)",
  cool: "hue-rotate(180deg) saturate(1.2)",
  mono: "grayscale(1) contrast(1.1)",
  vivid: "saturate(1.6) contrast(1.15)",
};

interface ParsedOverlay {
  textOverlays: { id: string; text: string; x: number; y: number; color: string; fontSize: number }[];
  drawings: { id: string; points: { x: number; y: number }[]; color: string; strokeWidth: number }[];
  filter: string;
}

function parseOverlayData(raw?: string | null): ParsedOverlay {
  if (!raw) return { textOverlays: [], drawings: [], filter: "none" };
  try {
    const parsed = JSON.parse(raw);
    return {
      textOverlays: parsed.textOverlays || [],
      drawings: parsed.drawings || [],
      filter: parsed.filter || "none",
    };
  } catch {
    return { textOverlays: [], drawings: [], filter: "none" };
  }
}

export function MomentViewer({ groups, startGroupIndex, onClose }: MomentViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [momentIndex, setMomentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const group = groups[groupIndex];
  const moment = group?.moments[momentIndex];

  useEffect(() => {
    if (!moment) return;
    viewMoment(moment.id).catch(() => {
      // non-critical — view tracking failing shouldn't block viewing
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment?.id]);

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / MOMENT_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        goNext();
      }
    }, 50);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, momentIndex]);

  const goNext = () => {
    if (!group) return;
    if (momentIndex < group.moments.length - 1) {
      setMomentIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setMomentIndex(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (momentIndex > 0) {
      setMomentIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setMomentIndex(prevGroup.moments.length - 1);
    }
  };

  if (!group || !moment) return null;

  const overlay = parseOverlayData(moment.overlay_data);
  const strokeToPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className={styles.overlay}>
      <div className={styles.progressRow}>
        {group.moments.map((m, i) => (
          <div key={m.id} className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: i < momentIndex ? "100%" : i === momentIndex ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Avatar url={group.author_avatar_url} initials={group.author_avatar_initials} size={34} />
          <span className={styles.username}>{group.author_username}</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close Moment View">
          <CloseIcon size={20} />
        </button>
      </div>

      <div className={styles.mediaArea}>
        <button className={styles.tapZoneLeft} onClick={goPrev} aria-label="Previous Moment" />
        <button className={styles.tapZoneRight} onClick={goNext} aria-label="Next Moment" />
        {moment.media_url ? (
          moment.media_type === "video" ? (
            <video src={moment.media_url} className={styles.realMedia} style={{ filter: FILTER_CSS[overlay.filter] }} autoPlay muted loop />
          ) : (
            <img src={moment.media_url} className={styles.realMedia} style={{ filter: FILTER_CSS[overlay.filter] }} alt="" />
          )
        ) : (
          <div className={styles.placeholderMedia} />
        )}

        <svg className={styles.drawLayer} viewBox="0 0 100 100" preserveAspectRatio="none">
          {overlay.drawings.map((s) => (
            <path key={s.id} d={strokeToPath(s.points)} stroke={s.color} strokeWidth={s.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>

        {overlay.textOverlays.map((o) => (
          <div key={o.id} className={styles.textOverlay} style={{ left: `${o.x}%`, top: `${o.y}%`, color: o.color, fontSize: o.fontSize }}>
            {o.text}
          </div>
        ))}
      </div>

      {(groupIndex > 0 || momentIndex > 0) && (
        <button className={styles.navHintLeft} onClick={goPrev} aria-hidden="true">
          <BackIcon size={22} />
        </button>
      )}
    </div>
  );
}
