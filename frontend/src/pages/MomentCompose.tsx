import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/Button";
import { PlayIcon } from "../components/icons";
import { uploadMedia } from "../services/media";
import { createMoment } from "../services/moments";
import { resolveMediaUrl } from "../utils/media";
import { SoundPicker, SelectedSoundChip } from "../components/SoundPicker";
import { MentionInput } from "../components/MentionInput";
import type { Sound } from "../services/soundbox";
import { useToast } from "../components/Toast";
import styles from "./MomentCompose.module.css";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  rotation: number;
  scale: number;
}

interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  scale: number;
}

interface DrawStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

type EditorMode = "none" | "text" | "draw";

const FILTERS = [
  {
    id: "none",
    label: "Original",
    css: "none",
  },
  {
    id: "warm",
    label: "Warm",
    css: "sepia(0.35) saturate(1.3) brightness(1.05)",
  },
  {
    id: "cool",
    label: "Cool",
    css: "hue-rotate(180deg) saturate(1.2)",
  },
  {
    id: "mono",
    label: "Mono",
    css: "grayscale(1) contrast(1.1)",
  },
  {
    id: "vivid",
    label: "Vivid",
    css: "saturate(1.6) contrast(1.15)",
  },
];

const EFFECTS = [
  {
    id: "none",
    label: "None",
    css: "none",
  },
  {
    id: "soft",
    label: "Soft",
    css: "brightness(1.08) saturate(0.92)",
  },
  {
    id: "contrast",
    label: "Contrast",
    css: "contrast(1.18)",
  },
  {
    id: "dream",
    label: "Dream",
    css: "brightness(1.08) saturate(1.15)",
  },
];

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🔥",
  "❤️",
  "✨",
  "🎉",
  "👀",
  "💯",
  "😎",
  "🥹",
  "💫",
];

const DRAW_COLORS = [
  "#FF6B4A",
  "#F5EFE4",
  "#4AFFC3",
  "#FFD24A",
  "#000000",
];

export function MomentCompose() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  /**
   * Set when this editor was opened via "Add to Moments" from Rush,
   * Stream, or Discover — the media already lives on the backend, so
   * on publish we reuse this URL directly instead of re-uploading the
   * same file (see handlePublish below).
   */
  const [importedMediaUrl, setImportedMediaUrl] = useState<string | null>(null);
  const [importedFromLabel, setImportedFromLabel] = useState<string | null>(null);

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);

  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<DrawStroke | null>(null);

  const [mode, setMode] = useState<EditorMode>("none");

  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [filter, setFilter] = useState("none");
  const [effect, setEffect] = useState("none");

  const [caption, setCaption] = useState("");
  const [closeCrewOnly, setCloseCrewOnly] = useState(false);
  const [selectedSound, setSelectedSound] =
    useState<Sound | null>(null);

  const [isSoundPickerOpen, setIsSoundPickerOpen] =
    useState(false);

  const [isPublishing, setIsPublishing] = useState(false);

  const [showStickers, setShowStickers] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  /**
   * Inline text editor.
   *
   * null = no text currently being typed.
   */
  const [editingText, setEditingText] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);

  /**
   * Overlay currently being dragged.
   */
  const [draggingOverlay, setDraggingOverlay] = useState<{
    type: "text" | "sticker";
    id: string;
  } | null>(null);

  /**
   * Show delete area while dragging.
   */
  const [showDeleteZone, setShowDeleteZone] =
    useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const galleryInputRef =
    useRef<HTMLInputElement | null>(null);
  const videoCameraInputRef =
    useRef<HTMLInputElement | null>(null);
  const textInputRef =
    useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  /**
   * Preload media handed off from "Add to Moments" (Rush, Stream, Discover,
   * or any other supported post). Runs once on mount — if present, this
   * sends the component straight into the editor (the `if (!previewUrl)`
   * gate below only shows the empty upload picker) with no re-upload of
   * the same media required at publish time.
   */
  useEffect(() => {
    const media = searchParams.get("media");
    if (!media) return;

    const resolvedUrl = resolveMediaUrl(decodeURIComponent(media));
    if (!resolvedUrl) return;

    const type = searchParams.get("type") === "video" ? "video" : "image";
    const source = searchParams.get("source");
    const sourceLabels: Record<string, string> = {
      rush: "your Rush",
      post: "your Flick",
      stream: "your Flick",
      discover: "this Flick",
    };

    setImportedMediaUrl(resolvedUrl);
    setImportedFromLabel(source ? sourceLabels[source] || null : null);
    setMediaType(type);
    setPreviewUrl(resolvedUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Automatically focus the inline text input.
   */
  useEffect(() => {
    if (editingText) {
      requestAnimationFrame(() => {
        textInputRef.current?.focus();
      });
    }
  }, [editingText]);

  /**
   * Cleanup object URL.
   */
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Global drag handling.
   *
   * This makes text/stickers continue following the finger
   * even when the pointer leaves the overlay itself.
   */
  useEffect(() => {
    if (!draggingOverlay) {
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const rect =
        stageRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const x = Math.max(
        0,
        Math.min(
          100,
          ((event.clientX - rect.left) / rect.width) * 100
        )
      );

      const y = Math.max(
        0,
        Math.min(
          110,
          ((event.clientY - rect.top) / rect.height) * 100
        )
      );

      /**
       * Once the item reaches the bottom part of the screen,
       * show the delete zone.
       */
      setShowDeleteZone(y >= 88);

      if (draggingOverlay.type === "text") {
        setTextOverlays((previous) =>
          previous.map((item) =>
            item.id === draggingOverlay.id
              ? {
                  ...item,
                  x,
                  y: Math.min(y, 100),
                }
              : item
          )
        );
      } else {
        setStickerOverlays((previous) =>
          previous.map((item) =>
            item.id === draggingOverlay.id
              ? {
                  ...item,
                  x,
                  y: Math.min(y, 100),
                }
              : item
          )
        );
      }
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const rect =
        stageRef.current?.getBoundingClientRect();

      let y = 0;

      if (rect) {
        y =
          ((event.clientY - rect.top) / rect.height) *
          100;
      }

      /**
       * Drop in bottom delete zone.
       */
      if (y >= 88) {
        if (draggingOverlay.type === "text") {
          setTextOverlays((previous) =>
            previous.filter(
              (item) =>
                item.id !== draggingOverlay.id
            )
          );
        } else {
          setStickerOverlays((previous) =>
            previous.filter(
              (item) =>
                item.id !== draggingOverlay.id
            )
          );
        }
      }

      setDraggingOverlay(null);
      setShowDeleteZone(false);
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp
    );

    window.addEventListener(
      "pointercancel",
      handlePointerUp
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      window.removeEventListener(
        "pointercancel",
        handlePointerUp
      );
    };
  }, [draggingOverlay]);

  /**
   * Gallery
   */
  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleGalleryChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    setFile(selected);

    setMediaType(
      selected.type.startsWith("video")
        ? "video"
        : "image"
    );

    setPreviewUrl(
      URL.createObjectURL(selected)
    );

    resetEditorState();
  };

  /**
   * Native photo camera.
   */
  const handleCameraPhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (!photo.webPath) {
        showToast(
          "Couldn't open the captured photo",
          "error"
        );
        return;
      }

      const response = await fetch(
        photo.webPath
      );

      const blob = await response.blob();

      const cameraFile = new File(
        [blob],
        `flickzy-moment-${Date.now()}.jpg`,
        {
          type: blob.type || "image/jpeg",
        }
      );

      setFile(cameraFile);
      setMediaType("image");
      setPreviewUrl(photo.webPath);

      resetEditorState();
    } catch (error) {
      console.error(
        "Moment camera error:",
        error
      );

      showToast(
        "Camera was cancelled or couldn't be opened",
        "error"
      );
    }
  };

  /**
   * Native/browser video capture.
   */
  const handleCameraVideo = () => {
    videoCameraInputRef.current?.click();
  };

  const handleCameraVideoChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    setFile(selected);
    setMediaType("video");

    setPreviewUrl(
      URL.createObjectURL(selected)
    );

    resetEditorState();
  };

  /**
   * Reset editor only.
   */
  const resetEditorState = () => {
    setTextOverlays([]);
    setStickerOverlays([]);
    setStrokes([]);
    setActiveStroke(null);

    setMode("none");
    setFilter("none");
    setEffect("none");

    setEditingText(null);
    setDraggingOverlay(null);
    setShowDeleteZone(false);

    setShowStickers(false);
    setShowEffects(false);
  };

  /**
   * Convert pointer position to stage percentage.
   */
  const stagePercent = (
    clientX: number,
    clientY: number
  ) => {
    const rect =
      stageRef.current?.getBoundingClientRect();

    if (!rect) {
      return {
        x: 50,
        y: 50,
      };
    }

    return {
      x: Math.max(
        0,
        Math.min(
          100,
          ((clientX - rect.left) /
            rect.width) *
            100
        )
      ),
      y: Math.max(
        0,
        Math.min(
          100,
          ((clientY - rect.top) /
            rect.height) *
            100
        )
      ),
    };
  };

  /**
   * Stage click.
   *
   * When Type mode is active, tapping anywhere creates
   * an inline text cursor at that exact location.
   */
  const handleStageClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (mode !== "text") {
      return;
    }

    if (editingText) {
      return;
    }

    const { x, y } = stagePercent(
      event.clientX,
      event.clientY
    );

    setEditingText({
      x,
      y,
      value: "",
    });
  };

  /**
   * Finish inline text editing.
   */
  const commitEditingText = () => {
    if (!editingText) {
      return;
    }

    const value =
      editingText.value.trim();

    if (value) {
      setTextOverlays((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          text: value,
          x: editingText.x,
          y: editingText.y,
          color: "#F5EFE4",
          fontSize: 28,
          rotation: 0,
          scale: 1,
        },
      ]);
    }

    setEditingText(null);
    setMode("none");
  };

  /**
   * Cancel text editor.
   */
  const cancelEditingText = () => {
    setEditingText(null);
    setMode("none");
  };

  /**
   * Add sticker.
   */
  const addSticker = (emoji: string) => {
    setStickerOverlays((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        emoji,
        x: 50,
        y: 50,
        fontSize: 46,
        rotation: 0,
        scale: 1,
      },
    ]);

    setShowStickers(false);
    setMode("none");
  };

  /**
   * Start overlay dragging.
   */
  const startOverlayDrag = (
    type: "text" | "sticker",
    id: string,
    event: PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDraggingOverlay({
      type,
      id,
    });

    setShowDeleteZone(false);
  };

  /**
   * Drawing.
   */
  const handlePointerDown = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (mode !== "draw") {
      return;
    }

    const point = stagePercent(
      event.clientX,
      event.clientY
    );

    setActiveStroke({
      id: crypto.randomUUID(),
      points: [point],
      color: drawColor,
      strokeWidth: 1.2,
    });
  };

  const handlePointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!activeStroke || mode !== "draw") {
      return;
    }

    const point = stagePercent(
      event.clientX,
      event.clientY
    );

    setActiveStroke((previous) =>
      previous
        ? {
            ...previous,
            points: [
              ...previous.points,
              point,
            ],
          }
        : previous
    );
  };

  const handlePointerUp = () => {
    if (!activeStroke) {
      return;
    }

    setStrokes((previous) => [
      ...previous,
      activeStroke,
    ]);

    setActiveStroke(null);
  };

  /**
   * Drawing path.
   */
  const strokeToPath = (
    stroke: DrawStroke
  ) =>
    stroke.points
      .map(
        (point, index) =>
          `${
            index === 0 ? "M" : "L"
          }${point.x},${point.y}`
      )
      .join(" ");

  /**
   * Save copy.
   */
  const handleSaveCopy = async () => {
    if (!previewUrl) {
      showToast(
        "Add a photo or video first",
        "error"
      );
      return;
    }

    const extension =
      mediaType === "video"
        ? file?.name.split(".").pop() ||
          "mp4"
        : "jpg";

    const filename =
      `flickzy-moment-${Date.now()}.${extension}`;

    try {
      // Cross-origin URLs (imported media) ignore the `download` attribute
      // unless fetched as a same-origin blob first; local blob: previews
      // from a freshly picked file already download fine directly.
      const href = previewUrl.startsWith("blob:")
        ? previewUrl
        : URL.createObjectURL(
            await (await fetch(previewUrl)).blob()
          );

      const anchor =
        document.createElement("a");

      anchor.href = href;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      if (href !== previewUrl) {
        URL.revokeObjectURL(href);
      }

      showToast(
        "A copy of your Moment was saved",
        "success"
      );
    } catch {
      showToast(
        "Couldn't save the copy",
        "error"
      );
    }
  };

  /**
   * Tag.
   *
   * Until the Crew/Circles user-search API is connected,
   * this uses the same inline text system.
   */
  const handleTag = () => {
    setMode("text");

    const rect =
      stageRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setEditingText({
      x: 50,
      y: 50,
      value: "@",
    });
  };

  /**
   * Flickzy AI.
   */
  const handleFlickzyAI = () => {
    navigate("/flicksy-ai");
  };

  /**
   * Publish.
   */
  const handlePublish = async () => {
    if (!file && !importedMediaUrl) {
      showToast(
        "Add a photo or video first",
        "error"
      );
      return;
    }

    /**
     * Don't publish while user is still typing.
     */
    if (editingText) {
      commitEditingText();
      return;
    }

    setIsPublishing(true);

    try {
      // Media handed off via "Add to Moments" is already hosted on the
      // backend — reuse that URL directly rather than uploading the same
      // file a second time. Only a freshly picked file needs uploading.
      const mediaUrl = importedMediaUrl
        ?? (await uploadMedia(file!, mediaType)).url;

      const overlayData =
        JSON.stringify({
          textOverlays,
          stickerOverlays,
          drawings: strokes,
          filter,
          effect,
          caption,
        });

      await createMoment({
        media_url: mediaUrl,
        media_type: mediaType,
        overlay_data: overlayData,
        sound_id:
          selectedSound?.id,
        close_crew_only:
          closeCrewOnly,
      });

      showToast(
        "Moment shared successfully",
        "success"
      );

      navigate("/home");
    } catch (error: any) {
      showToast(
        error?.response?.data?.detail ||
          "Couldn't share your Moment",
        "error"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  /**
   * Start over.
   */
  const handleStartOver = () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl(null);
    setMediaType("image");
    setImportedMediaUrl(null);
    setImportedFromLabel(null);

    setTextOverlays([]);
    setStickerOverlays([]);
    setStrokes([]);
    setActiveStroke(null);

    setMode("none");

    setFilter("none");
    setEffect("none");

    setCaption("");
    setSelectedSound(null);

    setCloseCrewOnly(false);

    setEditingText(null);
    setDraggingOverlay(null);
    setShowDeleteZone(false);

    setShowStickers(false);
    setShowEffects(false);
  };

  /**
   * Source selection screen.
   */
  if (!previewUrl) {
    return (
      <AppLayout>
        <div className={styles.wrap}>
          <div className={styles.headerRow}>
            <button
              className={styles.cancelBtn}
              type="button"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>

            <h1 className={styles.title}>
              New Moment
            </h1>

            <span />
          </div>

          <div className={styles.sourceGrid}>
            <button
              type="button"
              className={styles.uploadBox}
              onClick={handleGalleryClick}
            >
              <span className={styles.sourceIcon}>
                🖼️
              </span>

              <strong>
                Photos & Videos
              </strong>

              <span>
                Choose from your gallery
              </span>
            </button>

            <button
              type="button"
              className={styles.uploadBox}
              onClick={handleCameraPhoto}
            >
              <span className={styles.sourceIcon}>
                📷
              </span>

              <strong>
                Take a Photo
              </strong>

              <span>
                Open your camera
              </span>
            </button>

            <button
              type="button"
              className={styles.uploadBox}
              onClick={handleCameraVideo}
            >
              <span className={styles.sourceIcon}>
                🎥
              </span>

              <strong>
                Record a Video
              </strong>

              <span>
                Capture a video
              </span>
            </button>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleGalleryChange}
            className={styles.hiddenInput}
          />

          <input
            ref={videoCameraInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleCameraVideoChange}
            className={styles.hiddenInput}
          />
        </div>
      </AppLayout>
    );
  }

  const selectedFilter =
    FILTERS.find(
      (item) => item.id === filter
    )?.css || "none";

  const selectedEffect =
    EFFECTS.find(
      (item) => item.id === effect
    )?.css || "none";

  const combinedFilter =
    selectedFilter === "none"
      ? selectedEffect
      : selectedEffect === "none"
      ? selectedFilter
      : `${selectedFilter} ${selectedEffect}`;

  return (
    <AppLayout>
      <div className={styles.wrap}>
        {/* Header */}
        <div className={styles.headerRow}>
          <button
            className={styles.cancelBtn}
            type="button"
            onClick={handleStartOver}
          >
            ← Back
          </button>

          <h1 className={styles.title}>
            {importedFromLabel ? `Add ${importedFromLabel} to Moments` : "New Moment"}
          </h1>

          <button
            className={styles.cancelBtn}
            type="button"
            onClick={handleSaveCopy}
          >
            Save
          </button>
        </div>

        {/* Main media stage */}
        <div
          ref={stageRef}
          className={styles.stage}
          onClick={handleStageClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {mediaType === "image" ? (
            <img
              src={previewUrl}
              alt="Moment preview"
              className={styles.stageMedia}
              style={{
                filter: combinedFilter,
              }}
            />
          ) : (
            <video
              src={previewUrl}
              className={styles.stageMedia}
              style={{
                filter: combinedFilter,
              }}
              muted
              loop
              autoPlay
              playsInline
              controls={false}
            />
          )}

          {/* Drawing */}
          <svg
            className={styles.drawLayer}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {[
              ...strokes,
              ...(activeStroke
                ? [activeStroke]
                : []),
            ].map((stroke) => (
              <path
                key={stroke.id}
                d={strokeToPath(stroke)}
                stroke={stroke.color}
                strokeWidth={stroke.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Existing text overlays */}
          {textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className={styles.textOverlay}
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                color: overlay.color,
                fontSize: overlay.fontSize,
                transform:
                  `translate(-50%, -50%) ` +
                  `rotate(${overlay.rotation}deg) ` +
                  `scale(${overlay.scale})`,
              }}
              onPointerDown={(event) =>
                startOverlayDrag(
                  "text",
                  overlay.id,
                  event
                )
              }
            >
              {overlay.text}
            </div>
          ))}

          {/* Sticker overlays */}
          {stickerOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className={styles.textOverlay}
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                fontSize: overlay.fontSize,
                transform:
                  `translate(-50%, -50%) ` +
                  `rotate(${overlay.rotation}deg) ` +
                  `scale(${overlay.scale})`,
              }}
              onPointerDown={(event) =>
                startOverlayDrag(
                  "sticker",
                  overlay.id,
                  event
                )
              }
            >
              {overlay.emoji}
            </div>
          ))}

          {/* INLINE TEXT INPUT */}
          {editingText && (
            <div
              className={styles.inlineTextEditor}
              style={{
                left: `${editingText.x}%`,
                top: `${editingText.y}%`,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
              onPointerDown={(event) =>
                event.stopPropagation()
              }
            >
              <input
                ref={textInputRef}
                className={styles.inlineTextInput}
                value={editingText.value}
                onChange={(event) =>
                  setEditingText((previous) =>
                    previous
                      ? {
                          ...previous,
                          value:
                            event.target.value,
                        }
                      : previous
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    event.preventDefault();
                    commitEditingText();
                  }

                  if (
                    event.key === "Escape"
                  ) {
                    event.preventDefault();
                    cancelEditingText();
                  }
                }}
                onBlur={commitEditingText}
                placeholder="Type..."
                autoComplete="off"
                autoCapitalize="sentences"
              />
            </div>
          )}

          {/* Type mode hint */}
          {mode === "text" &&
            !editingText && (
              <div
                className={
                  styles.editorHint
                }
              >
                Tap anywhere to type
              </div>
            )}

          {/* Delete zone */}
          {showDeleteZone && (
            <div
              className={
                styles.deleteZone
              }
            >
              <div
                className={
                  styles.deleteIcon
                }
              >
                🗑️
              </div>

              <span>
                Release to delete
              </span>
            </div>
          )}
        </div>

        {/* Tools */}
        <div className={styles.toolGrid}>
          <button
            type="button"
            className={
              mode === "text"
                ? styles.toolActive
                : styles.tool
            }
            onClick={() => {
              setMode(
                mode === "text"
                  ? "none"
                  : "text"
              );

              setShowStickers(false);
              setShowEffects(false);
            }}
          >
            <span>✍️</span>
            <span>Type</span>
          </button>

          <button
            type="button"
            className={
              showStickers
                ? styles.toolActive
                : styles.tool
            }
            onClick={() => {
              setShowStickers(
                (previous) => !previous
              );

              setShowEffects(false);
              setMode("none");
            }}
          >
            <span>😀</span>
            <span>Stickers</span>
          </button>

          <button
            type="button"
            className={styles.tool}
            onClick={() =>
              setIsSoundPickerOpen(true)
            }
          >
            <PlayIcon size={12} />
            <span>Sound</span>
          </button>

          <button
            type="button"
            className={
              showEffects
                ? styles.toolActive
                : styles.tool
            }
            onClick={() => {
              setShowEffects(
                (previous) => !previous
              );

              setShowStickers(false);
              setMode("none");
            }}
          >
            <span>✨</span>
            <span>Looks</span>
          </button>

          <button
            type="button"
            className={styles.tool}
            onClick={handleFlickzyAI}
          >
            <span>🤖</span>
            <span>Flickzy AI</span>
          </button>

          <button
            type="button"
            className={styles.tool}
            onClick={handleTag}
          >
            <span>@</span>
            <span>Tag</span>
          </button>

          <button
            type="button"
            className={
              mode === "draw"
                ? styles.toolActive
                : styles.tool
            }
            onClick={() => {
              setMode(
                mode === "draw"
                  ? "none"
                  : "draw"
              );

              setShowStickers(false);
              setShowEffects(false);
            }}
          >
            <span>✏️</span>
            <span>Draw</span>
          </button>

          <button
            type="button"
            className={styles.tool}
            onClick={handleSaveCopy}
          >
            <span>💾</span>
            <span>Save Copy</span>
          </button>
        </div>

        {/* Stickers */}
        {showStickers && (
          <div className={styles.emojiRow}>
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.emojiBtn}
                onClick={() =>
                  addSticker(emoji)
                }
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Drawing colors */}
        {mode === "draw" && (
          <div className={styles.colorRow}>
            {DRAW_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={
                  color === drawColor
                    ? styles.colorSwatchActive
                    : styles.colorSwatch
                }
                style={{
                  background: color,
                }}
                onClick={() =>
                  setDrawColor(color)
                }
              />
            ))}
          </div>
        )}

        {/* Looks */}
        {showEffects && (
          <div
            className={
              styles.effectPanel
            }
          >
            <div
              className={
                styles.filterRow
              }
            >
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    item.id === filter
                      ? styles.filterChipActive
                      : styles.filterChip
                  }
                  onClick={() =>
                    setFilter(item.id)
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div
              className={
                styles.filterRow
              }
            >
              {EFFECTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    item.id === effect
                      ? styles.filterChipActive
                      : styles.filterChip
                  }
                  onClick={() =>
                    setEffect(item.id)
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sound */}
        <div className={styles.soundOverlay}>
          {selectedSound ? (
            <SelectedSoundChip
              sound={selectedSound}
              onRemove={() =>
                setSelectedSound(null)
              }
            />
          ) : (
            <button
              type="button"
              className={styles.soundButton}
              onClick={() =>
                setIsSoundPickerOpen(true)
              }
            >
              <PlayIcon size={12} />
              <span>Add a sound</span>
            </button>
          )}
        </div>

        {/* Caption */}
        <MentionInput
          className={styles.captionInput}
          placeholder="Add a caption…"
          value={caption}
          onChange={setCaption}
          multiline
          rows={2}
        />

        {/* Destination / Privacy */}
        <div className={styles.destinationRow}>
          <button
            type="button"
            className={styles.destinationPrimary}
          >
            <span className={styles.destinationIcon}>✦</span>
            <span>
              <strong>Your Moment</strong>
              <small>Share with your followers</small>
            </span>
          </button>

          <button
            type="button"
            className={styles.closeCrewButton}
            disabled
            aria-label="Close Crew is coming in version 2"
          >
            <span className={styles.destinationIcon}>◉</span>
            <span>
              <strong>Close Crew</strong>
              <small>Coming in V2</small>
            </span>
          </button>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={handleStartOver}
          >
            Cancel
          </Button>

          <Button
            onClick={handlePublish}
            isLoading={isPublishing}
          >
            Share Moment
          </Button>
        </div>
      </div>

      <SoundPicker
        isOpen={isSoundPickerOpen}
        onClose={() =>
          setIsSoundPickerOpen(false)
        }
        onSelect={(sound) => {
          setSelectedSound(sound);
          setIsSoundPickerOpen(false);
        }}
      />
    </AppLayout>
  );
}