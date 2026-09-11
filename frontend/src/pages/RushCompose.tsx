import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/Button";
import {
  RushIcon,
  TagIcon,
  CloseIcon,
  SparkleIcon,
  PlayIcon,
} from "../components/icons";
import { uploadMedia } from "../services/media";
import { createRush } from "../services/rush";
import { generateCaption, suggestTopicTags } from "../services/ai";
import {
  SoundPicker,
  SelectedSoundChip,
} from "../components/SoundPicker";
import type { Sound } from "../services/soundbox";
import { useToast } from "../components/Toast";
import styles from "./RushCompose.module.css";

const MAX_RUSH_SECONDS = 90;

export function RushCompose() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalDuration, setOriginalDuration] = useState(0);

  const [caption, setCaption] = useState("");
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);

  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isAiWorking, setIsAiWorking] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  /*
   * Clean up the current preview URL when the component unmounts
   * or when a new preview URL replaces the old one.
   */
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("video")) {
      showToast("Rush needs a video file", "error");
      e.target.value = "";
      return;
    }

    /*
     * Remove the previous preview URL.
     */
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(selected);

    setFile(selected);
    setPreviewUrl(url);
    setOriginalDuration(0);

    /*
     * Read the duration only for UI information.
     *
     * IMPORTANT:
     * We do NOT trim the video on the frontend.
     * The backend will automatically trim anything over 90 seconds.
     */
    const probe = document.createElement("video");

    probe.preload = "metadata";
    probe.src = url;

    probe.onloadedmetadata = () => {
      const duration = Number.isFinite(probe.duration)
        ? probe.duration
        : 0;

      setOriginalDuration(duration);

      if (duration > MAX_RUSH_SECONDS) {
        showToast(
          `First ${MAX_RUSH_SECONDS} seconds will be used automatically`,
          "success"
        );
      }

      probe.removeAttribute("src");
      probe.load();
    };

    probe.onerror = () => {
      setOriginalDuration(0);

      showToast(
        "Couldn't read the video duration",
        "error"
      );

      probe.removeAttribute("src");
      probe.load();
    };

    /*
     * Reset the input so selecting the same video again
     * still triggers onChange.
     */
    e.target.value = "";
  };

  const handleAiCaption = async () => {
    setIsAiWorking(true);

    try {
      const result = await generateCaption(
        "A short-form Rush video",
        "casual",
        caption.trim().length > 0
      );

      setCaption(result.caption);
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail ||
          "flickzy AI is unavailable right now",
        "error"
      );
    } finally {
      setIsAiWorking(false);
    }
  };

  const handleAiTopicTags = async () => {
    if (!caption.trim()) {
      showToast("Write a caption first", "error");
      return;
    }

    setIsAiWorking(true);

    try {
      const result = await suggestTopicTags(caption);
      setTopicTags(result.tags);
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail ||
          "flickzy AI is unavailable right now",
        "error"
      );
    } finally {
      setIsAiWorking(false);
    }
  };

  const handleRemoveVideo = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl(null);
    setOriginalDuration(0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!file) {
      showToast(
        "Select a video for your Rush",
        "error"
      );
      return;
    }

    setIsPosting(true);

    try {
      /*
       * The selected file is uploaded as-is.
       *
       * If it is longer than 90 seconds, the backend Rush
       * endpoint automatically creates a first-90-second
       * version using FFmpeg.
       */
      const uploaded = await uploadMedia(
        file,
        "video"
      );

      const fullCaption =
        topicTags.length > 0
          ? `${caption}\n\n${topicTags
              .map((t) => `#${t}`)
              .join(" ")}`
          : caption;

      await createRush({
        caption: fullCaption,
        location: "",
        media_tag: "",
        media_urls: [uploaded.url],
        sound_id: selectedSound?.id || null,
      });

      showToast(
        "Rush posted!",
        "success"
      );

      navigate("/rush");
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail ||
          "Couldn't post your Rush",
        "error"
      );
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <AppLayout>
      <form
        className={styles.wrap}
        onSubmit={handleSubmit}
      >
        <div className={styles.header}>
          <RushIcon size={22} />

          <h1 className={styles.title}>
            New Rush
          </h1>
        </div>

        <p className={styles.sub}>
          Short, vertical, high-energy — up to{" "}
          {MAX_RUSH_SECONDS}s.
        </p>

        {previewUrl ? (
          <div className={styles.previewWrap}>
            <video
              src={previewUrl}
              className={styles.previewVideo}
              controls
              playsInline
              preload="metadata"
            />

            <button
              type="button"
              className={styles.removeBtn}
              onClick={handleRemoveVideo}
              aria-label="Remove video"
            >
              <CloseIcon size={16} />
            </button>

            {originalDuration > MAX_RUSH_SECONDS && (
              <div className={styles.durationWarning}>
                First {MAX_RUSH_SECONDS} seconds will be
                used automatically
              </div>
            )}
          </div>
        ) : (
          <label className={styles.uploadBox}>
            <RushIcon size={30} />

            <span>
              Tap to select a video for your Rush
            </span>

            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className={styles.hiddenInput}
              disabled={isPosting}
            />
          </label>
        )}

        <textarea
          className={styles.textarea}
          placeholder="Write a caption…"
          value={caption}
          onChange={(e) =>
            setCaption(e.target.value)
          }
          maxLength={2200}
          rows={3}
        />

        <div className={styles.aiRow}>
          <button
            type="button"
            className={styles.aiBtn}
            onClick={handleAiCaption}
            disabled={isAiWorking}
          >
            <SparkleIcon size={15} />

            {caption.trim()
              ? "Improve with flickzy AI"
              : "Write caption with flickzy AI"}
          </button>

          <button
            type="button"
            className={styles.aiBtn}
            onClick={handleAiTopicTags}
            disabled={isAiWorking}
          >
            <SparkleIcon size={15} />

            Suggest Topic Tags
          </button>
        </div>

        {topicTags.length > 0 && (
          <div className={styles.tagChips}>
            {topicTags.map((tag) => (
              <span
                key={tag}
                className={styles.tagChip}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

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
            className={styles.aiBtn}
            onClick={() =>
              setIsSoundPickerOpen(true)
            }
          >
            <PlayIcon size={12} />
            Add a sound
          </button>
        )}

        <div className={styles.metaRow}>
          <TagIcon size={17} />

          <input
            className={styles.metaInput}
            placeholder="Tag FlickTags (comma separated)"
          />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
            disabled={isPosting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            isLoading={isPosting}
          >
            Post Rush
          </Button>
        </div>
      </form>

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