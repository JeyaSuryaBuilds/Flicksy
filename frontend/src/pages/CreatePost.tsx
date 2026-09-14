import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { Button } from "../components/Button";
import { ImageIcon, LocationIcon, CloseIcon, SparkleIcon, PlayIcon } from "../components/icons";
import { createPost } from "../services/posts";
import { uploadMedia } from "../services/media";
import { generateCaption, suggestTopicTags } from "../services/ai";
import { SoundPicker, SelectedSoundChip } from "../components/SoundPicker";
import { MentionInput } from "../components/MentionInput";
import type { Sound } from "../services/soundbox";
import { useToast } from "../components/Toast";
import styles from "./CreatePost.module.css";

export function CreatePost() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setMediaType(selected.type.startsWith("video") ? "video" : "image");
    setPreviewUrl(URL.createObjectURL(selected)); // local preview only — never persisted as-is
    setUploadProgress(0);
  };

  const handleAiCaption = async () => {
    setIsAiWorking(true);
    try {
      const description = caption.trim() || `A ${mediaType} Flick${location ? ` from ${location}` : ""}`;
      const result = await generateCaption(description, "casual", caption.trim().length > 0);
      setCaption(result.caption);
      showToast(`Caption drafted by flickzy AI (${result.provider})`, "success");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "flickzy AI is unavailable right now", "error");
    } finally {
      setIsAiWorking(false);
    }
  };

  const handleAiTopicTags = async () => {
    if (!caption.trim()) {
      showToast("Write a caption first so flickzy AI has something to work with", "error");
      return;
    }
    setIsAiWorking(true);
    try {
      const result = await suggestTopicTags(caption);
      setTopicTags(result.tags);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "flickzy AI is unavailable right now", "error");
    } finally {
      setIsAiWorking(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      showToast("Add a photo or video first", "error");
      return;
    }

    setIsPosting(true);
    setIsUploading(true);
    try {
      // Real multipart upload — the URL returned here is what actually gets persisted
      // on the Flick, never the local blob: preview URL.
      const uploaded = await uploadMedia(file, mediaType);
      setUploadProgress(100);
      setIsUploading(false);

      const fullCaption = topicTags.length > 0 ? `${caption}\n\n${topicTags.map((t) => `#${t}`).join(" ")}` : caption;

      await createPost({
        caption: fullCaption,
        location,
        media_type: mediaType,
        media_tag: mediaType === "video" ? "0:15" : "",
        media_urls: [uploaded.url],
        sound_id: selectedSound?.id || null,
      });
      showToast("Flick shared!", "success");
      navigate("/home");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Couldn't share your Flick, try again", "error");
    } finally {
      setIsPosting(false);
      setIsUploading(false);
    }
  };

  return (
    <AppLayout>
      <form className={styles.wrap} onSubmit={handleSubmit}>
        <h1 className={styles.title}>New Flick</h1>

        {previewUrl ? (
          <div className={styles.previewWrap}>
            {mediaType === "image" ? (
              <img src={previewUrl} alt="Selected upload preview" className={styles.previewImg} />
            ) : (
              <video src={previewUrl} className={styles.previewImg} controls />
            )}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
                setUploadProgress(0);
              }}
              aria-label="Remove media"
            >
              <CloseIcon size={16} />
            </button>
            {isUploading && (
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </div>
        ) : (
          <label className={styles.uploadBox}>
            <ImageIcon size={30} />
            <span>Tap to upload a photo or video</span>
            <input type="file" accept="image/*,video/*" onChange={handleFileChange} className={styles.hiddenInput} />
          </label>
        )}

        <MentionInput
          className={styles.textarea}
          placeholder="Write a caption… (type @ to mention someone from your Crew or Circles)"
          value={caption}
          onChange={setCaption}
          maxLength={2200}
          multiline
          rows={3}
        />

        <div className={styles.aiRow}>
          <button type="button" className={styles.aiBtn} onClick={handleAiCaption} disabled={isAiWorking}>
            <SparkleIcon size={15} />
            {caption.trim() ? "Improve with flickzy AI" : "Write caption with flickzy AI"}
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
          <LocationIcon size={17} />
          <input
            className={styles.metaInput}
            placeholder="Add location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPosting}>
            Share Flick
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