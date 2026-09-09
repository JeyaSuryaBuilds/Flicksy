import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/Button";
import { RushIcon, TagIcon, CloseIcon, SparkleIcon, PlayIcon } from "../components/icons";
import { uploadMedia } from "../services/media";
import { createRush } from "../services/rush";
import { generateCaption, suggestTopicTags } from "../services/ai";
import { SoundPicker, SelectedSoundChip } from "../components/SoundPicker";
import type { Sound } from "../services/soundbox";
import { useToast } from "../components/Toast";
import styles from "./RushCompose.module.css";

const MAX_RUSH_SECONDS = 90;

export function RushCompose() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationOk, setDurationOk] = useState(true);
  const [caption, setCaption] = useState("");
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("video")) {
      showToast("Rush needs a video file", "error");
      return;
    }
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);

    const probe = document.createElement("video");
    probe.src = url;
    probe.onloadedmetadata = () => {
      setDurationOk(probe.duration <= MAX_RUSH_SECONDS);
    };
  };

  const handleAiCaption = async () => {
    setIsAiWorking(true);
    try {
      const result = await generateCaption("A short-form Rush video", "casual", caption.trim().length > 0);
      setCaption(result.caption);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Flicksy AI is unavailable right now", "error");
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
      showToast(err?.response?.data?.detail || "Flicksy AI is unavailable right now", "error");
    } finally {
      setIsAiWorking(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      showToast("Select a video for your Rush", "error");
      return;
    }
    if (!durationOk) {
      showToast(`Rush videos must be ${MAX_RUSH_SECONDS} seconds or shorter`, "error");
      return;
    }

    setIsPosting(true);
    try {
      const uploaded = await uploadMedia(file, "video");
      const fullCaption = topicTags.length > 0 ? `${caption}\n\n${topicTags.map((t) => `#${t}`).join(" ")}` : caption;
      await createRush({ caption: fullCaption, location: "", media_tag: "", media_urls: [uploaded.url], sound_id: selectedSound?.id || null });
      showToast("Rush posted!", "success");
      navigate("/rush");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Couldn't post your Rush", "error");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <AppLayout>
      <form className={styles.wrap} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <RushIcon size={22} />
          <h1 className={styles.title}>New Rush</h1>
        </div>
        <p className={styles.sub}>Short, vertical, high-energy — up to {MAX_RUSH_SECONDS}s.</p>

        {previewUrl ? (
          <div className={styles.previewWrap}>
            <video src={previewUrl} className={styles.previewVideo} controls />
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
              }}
              aria-label="Remove video"
            >
              <CloseIcon size={16} />
            </button>
            {!durationOk && <div className={styles.durationWarning}>This video is longer than {MAX_RUSH_SECONDS}s</div>}
          </div>
        ) : (
          <label className={styles.uploadBox}>
            <RushIcon size={30} />
            <span>Tap to select a video for your Rush</span>
            <input type="file" accept="video/*" onChange={handleFileChange} className={styles.hiddenInput} />
          </label>
        )}

        <textarea
          className={styles.textarea}
          placeholder="Write a caption…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={2200}
          rows={3}
        />

        <div className={styles.aiRow}>
          <button type="button" className={styles.aiBtn} onClick={handleAiCaption} disabled={isAiWorking}>
            <SparkleIcon size={15} />
            {caption.trim() ? "Improve with Flicksy AI" : "Write caption with Flicksy AI"}
          </button>
          <button type="button" className={styles.aiBtn} onClick={handleAiTopicTags} disabled={isAiWorking}>
            <SparkleIcon size={15} />
            Suggest Topic Tags
          </button>
        </div>

        {topicTags.length > 0 && (
          <div className={styles.tagChips}>
            {topicTags.map((tag) => (
              <span key={tag} className={styles.tagChip}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {selectedSound ? (
          <SelectedSoundChip sound={selectedSound} onRemove={() => setSelectedSound(null)} />
        ) : (
          <button type="button" className={styles.aiBtn} onClick={() => setIsSoundPickerOpen(true)}>
            <PlayIcon size={12} />
            Add a sound
          </button>
        )}

        <div className={styles.metaRow}>
          <TagIcon size={17} />
          <input className={styles.metaInput} placeholder="Tag FlickTags (comma separated)" />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPosting}>
            Post Rush
          </Button>
        </div>
      </form>

      <SoundPicker
        isOpen={isSoundPickerOpen}
        onClose={() => setIsSoundPickerOpen(false)}
        onSelect={(sound) => {
          setSelectedSound(sound);
          setIsSoundPickerOpen(false);
        }}
      />
    </AppLayout>
  );
}
