import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/Button";
import { ImageIcon, CloseIcon, PlayIcon } from "../components/icons";
import { uploadMedia } from "../services/media";
import { createMoment } from "../services/moments";
import { SoundPicker, SelectedSoundChip } from "../components/SoundPicker";
import type { Sound } from "../services/soundbox";
import { useToast } from "../components/Toast";
import styles from "./MomentCompose.module.css";

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percent
  y: number; // percent
  color: string;
  fontSize: number;
}

interface DrawStroke {
  id: string;
  points: { x: number; y: number }[]; // percent coordinates
  color: string;
  strokeWidth: number;
}

const FILTERS = [
  { id: "none", label: "Original", css: "none" },
  { id: "warm", label: "Warm", css: "sepia(0.35) saturate(1.3) brightness(1.05)" },
  { id: "cool", label: "Cool", css: "hue-rotate(180deg) saturate(1.2)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.15)" },
];

const EMOJIS = ["😀", "🔥", "❤️", "😂", "✨", "😍", "🎉", "👀", "💯", "😎"];
const DRAW_COLORS = ["#FF6B4A", "#F5EFE4", "#4AFFC3", "#FFD24A", "#000000"];

export function MomentCompose() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<DrawStroke | null>(null);
  const [mode, setMode] = useState<"none" | "text" | "draw" | "emoji">("none");
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [filter, setFilter] = useState("none");
  const [caption, setCaption] = useState("");
  const [closeCrewOnly, setCloseCrewOnly] = useState(false);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setMediaType(selected.type.startsWith("video") ? "video" : "image");
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const stagePercent = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  };

  const handleStageClick = (e: React.MouseEvent) => {
    if (mode !== "text") return;
    const { x, y } = stagePercent(e.clientX, e.clientY);
    const text = window.prompt("Text overlay:");
    if (!text) return;
    setTextOverlays((prev) => [...prev, { id: crypto.randomUUID(), text, x, y, color: "#F5EFE4", fontSize: 22 }]);
    setMode("none");
  };

  const addEmoji = (emoji: string) => {
    setTextOverlays((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: emoji, x: 50, y: 50, color: "#F5EFE4", fontSize: 34 },
    ]);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (mode !== "draw") return;
    const point = stagePercent(e.clientX, e.clientY);
    setActiveStroke({ id: crypto.randomUUID(), points: [point], color: drawColor, strokeWidth: 1.2 });
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (mode !== "draw" || !activeStroke) return;
    const point = stagePercent(e.clientX, e.clientY);
    setActiveStroke((prev) => (prev ? { ...prev, points: [...prev.points, point] } : prev));
  };

  const handlePointerUp = () => {
    if (activeStroke) {
      setStrokes((prev) => [...prev, activeStroke]);
      setActiveStroke(null);
    }
  };

  const removeOverlay = (id: string) => setTextOverlays((prev) => prev.filter((o) => o.id !== id));

  const strokeToPath = (s: DrawStroke) => s.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const handlePublish = async () => {
    if (!file) {
      showToast("Add a photo or video first", "error");
      return;
    }
    setIsPublishing(true);
    try {
      const uploaded = await uploadMedia(file, mediaType);
      const overlayData = JSON.stringify({ textOverlays, drawings: strokes, filter });
      await createMoment({
        media_url: uploaded.url,
        media_type: mediaType,
        overlay_data: overlayData,
        sound_id: selectedSound?.id,
        close_crew_only: closeCrewOnly,
      });
      showToast("Moment shared", "success");
      navigate("/home");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Couldn't share your Moment", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!previewUrl) {
    return (
      <AppLayout>
        <div className={styles.wrap}>
          <h1 className={styles.title}>New Moment</h1>
          <label className={styles.uploadBox}>
            <ImageIcon size={30} />
            <span>Choose a photo or video for your Moment</span>
            <input type="file" accept="image/*,video/*" onChange={handleFileChange} className={styles.hiddenInput} />
          </label>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.wrap}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>New Moment</h1>
          <button
            className={styles.cancelBtn}
            onClick={() => {
              setFile(null);
              setPreviewUrl(null);
            }}
          >
            Start over
          </button>
        </div>

        <div
          ref={stageRef}
          className={styles.stage}
          onClick={handleStageClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {mediaType === "image" ? (
            <img src={previewUrl} alt="" className={styles.stageMedia} style={{ filter: FILTERS.find((f) => f.id === filter)?.css }} />
          ) : (
            <video src={previewUrl} className={styles.stageMedia} style={{ filter: FILTERS.find((f) => f.id === filter)?.css }} muted loop autoPlay />
          )}

          <svg className={styles.drawLayer} viewBox="0 0 100 100" preserveAspectRatio="none">
            {[...strokes, ...(activeStroke ? [activeStroke] : [])].map((s) => (
              <path key={s.id} d={strokeToPath(s)} stroke={s.color} strokeWidth={s.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          {textOverlays.map((o) => (
            <div
              key={o.id}
              className={styles.textOverlay}
              style={{ left: `${o.x}%`, top: `${o.y}%`, color: o.color, fontSize: o.fontSize }}
              onClick={(e) => {
                e.stopPropagation();
                removeOverlay(o.id);
              }}
              title="Tap to remove"
            >
              {o.text}
            </div>
          ))}
        </div>

        <div className={styles.toolRow}>
          <button className={mode === "text" ? styles.toolActive : styles.tool} onClick={() => setMode(mode === "text" ? "none" : "text")}>
            Aa Text
          </button>
          <button className={mode === "draw" ? styles.toolActive : styles.tool} onClick={() => setMode(mode === "draw" ? "none" : "draw")}>
            ✏️ Draw
          </button>
          <button className={mode === "emoji" ? styles.toolActive : styles.tool} onClick={() => setMode(mode === "emoji" ? "none" : "emoji")}>
            😀 Emoji
          </button>
        </div>

        {mode === "draw" && (
          <div className={styles.colorRow}>
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                className={c === drawColor ? styles.colorSwatchActive : styles.colorSwatch}
                style={{ background: c }}
                onClick={() => setDrawColor(c)}
              />
            ))}
          </div>
        )}

        {mode === "emoji" && (
          <div className={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <button key={e} className={styles.emojiBtn} onClick={() => addEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        )}

        <div className={styles.filterRow}>
          {FILTERS.map((f) => (
            <button key={f.id} className={f.id === filter ? styles.filterChipActive : styles.filterChip} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {selectedSound ? (
          <SelectedSoundChip sound={selectedSound} onRemove={() => setSelectedSound(null)} />
        ) : (
          <button className={styles.tool} onClick={() => setIsSoundPickerOpen(true)}>
            <PlayIcon size={12} /> Add a sound
          </button>
        )}

        <input className={styles.captionInput} placeholder="Add a caption…" value={caption} onChange={(e) => setCaption(e.target.value)} />

        <label className={styles.privacyRow}>
          <input type="checkbox" checked={closeCrewOnly} onChange={(e) => setCloseCrewOnly(e.target.checked)} />
          Close Crew only
        </label>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} isLoading={isPublishing}>
            Share Moment
          </Button>
        </div>
      </div>

      <SoundPicker isOpen={isSoundPickerOpen} onClose={() => setIsSoundPickerOpen(false)} onSelect={(s) => { setSelectedSound(s); setIsSoundPickerOpen(false); }} />
    </AppLayout>
  );
}
