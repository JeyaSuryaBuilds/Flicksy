import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Avatar } from "./Avatar";
import {
  CloseIcon,
} from "./icons";

import {
  addMomentEcho,
  deleteMoment,
  getMomentViewers,
  reportMoment,
  viewMoment,
} from "../services/moments";

import type {
  MomentAuthorGroup,
} from "../types";

import type {
  MomentViewer as MomentViewerUser,
} from "../services/moments";

import styles from "./MomentViewer.module.css";

interface MomentViewerProps {
  groups: MomentAuthorGroup[];
  startGroupIndex: number;
  onClose: () => void;
}

const PHOTO_DURATION_MS = 5000;

const FILTER_CSS: Record<string, string> = {
  none: "none",
  warm: "sepia(0.35) saturate(1.3) brightness(1.05)",
  cool: "hue-rotate(180deg) saturate(1.2)",
  mono: "grayscale(1) contrast(1.1)",
  vivid: "saturate(1.6) contrast(1.15)",
};

interface ParsedOverlay {
  textOverlays: {
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
  }[];

  drawings: {
    id: string;
    points: { x: number; y: number }[];
    color: string;
    strokeWidth: number;
  }[];

  filter: string;

  caption?: string;

  shareTarget?: string;
}

function parseOverlayData(
  raw?: string | null,
): ParsedOverlay {
  if (!raw) {
    return {
      textOverlays: [],
      drawings: [],
      filter: "none",
    };
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      textOverlays: parsed.textOverlays || [],
      drawings: parsed.drawings || [],
      filter: parsed.filter || "none",
      caption: parsed.caption || "",
      shareTarget: parsed.shareTarget || "",
    };
  } catch {
    return {
      textOverlays: [],
      drawings: [],
      filter: "none",
    };
  }
}

function resolveMediaUrl(
  mediaUrl?: string | null,
): string {
  if (!mediaUrl) return "";

  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl;
  }

  const apiBaseUrl = (
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");

  const normalizedPath = mediaUrl.startsWith("/")
    ? mediaUrl
    : `/${mediaUrl}`;

  return `${apiBaseUrl}${normalizedPath}`;
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.iconSvg}
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.iconSvg}
    >
      <path
        d="M2.8 12s3.4-5.2 9.2-5.2S21.2 12 21.2 12s-3.4 5.2-9.2 5.2S2.8 12 2.8 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function HeartIcon({
  filled = false,
}: {
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.iconSvg}
    >
      <path
        d="M20.8 8.9c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10C3.2 6 5.1 4.2 7.7 4.2c1.7 0 3.2.9 4.3 2.2 1.1-1.3 2.6-2.2 4.3-2.2 2.6 0 4.5 1.8 4.5 4.7Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.iconSvg}
    >
      <path
        d="m21 3-7.2 18-3.1-7.7L3 10.2 21 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m10.7 13.3 4.7-4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.menuIcon}
    >
      <path
        d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.menuIcon}
    >
      <path
        d="M6 20V5.5A1.5 1.5 0 0 1 7.5 4H19l-2.8 4L19 12H7.5A1.5 1.5 0 0 0 6 13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.menuIcon}
    >
      <path
        d="M5 9v6h4l5 4V5l-5 4H5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m18 9 3 6m0-6-3 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function strokeToPath(
  points: { x: number; y: number }[],
) {
  return points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${p.x},${p.y}`,
    )
    .join(" ");
}

function formatViewedAt(value: string) {
  const date = new Date(value);
  const diff =
    Date.now() - date.getTime();

  const minutes = Math.floor(
    diff / 60000,
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

export function MomentViewer({
  groups,
  startGroupIndex,
  onClose,
}: MomentViewerProps) {
  const [groupIndex, setGroupIndex] =
    useState(startGroupIndex);

  const [momentIndex, setMomentIndex] =
    useState(0);

  const [progress, setProgress] =
    useState(0);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [viewersOpen, setViewersOpen] =
    useState(false);

  const [viewers, setViewers] =
    useState<MomentViewerUser[]>([]);

  const [viewersLoading, setViewersLoading] =
    useState(false);

  const [reply, setReply] =
    useState("");

  const [sendingReply, setSendingReply] =
    useState(false);

  const [liked, setLiked] =
    useState(false);

  const [reporting, setReporting] =
    useState(false);

  const [muted, setMuted] =
    useState(false);

  /**
   * NEW:
   * Centre tap pause/resume state.
   */
  const [isPaused, setIsPaused] =
    useState(false);

  /**
   * NEW:
   * Photo timer timing refs.
   *
   * startedAtRef:
   *   when the current photo timer started/resumed.
   *
   * pausedElapsedRef:
   *   how much of the 5 seconds had already passed
   *   when the photo was paused.
   */
  const startedAtRef =
    useRef<number>(0);

  const pausedElapsedRef =
    useRef<number>(0);

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const group = groups[groupIndex];

  const moment =
    group?.moments[momentIndex];

  const isOwnMoment =
    Boolean(
      group &&
      moment &&
      group.author_id === moment.author_id,
    );

  const mediaUrl =
    resolveMediaUrl(moment?.media_url);

  const overlay = parseOverlayData(
    moment?.overlay_data,
  );

  /**
   * Reset pause/timer state whenever
   * the current Moment changes.
   */
  useEffect(() => {
    if (!moment) return;

    viewMoment(moment.id).catch(() => {});

    setMenuOpen(false);
    setViewersOpen(false);
    setProgress(0);

    /**
     * NEW:
     * Every new Moment starts playing.
     */
    setIsPaused(false);

    startedAtRef.current = 0;
    pausedElapsedRef.current = 0;

    const mutedAuthors = JSON.parse(
      localStorage.getItem(
        "flickzy_muted_moment_authors",
      ) || "[]",
    ) as string[];

    setMuted(
      mutedAuthors.includes(
        group.author_id,
      ),
    );
  }, [
    moment?.id,
    group?.author_id,
  ]);

  /**
   * Moment playback / progress.
   *
   * Video:
   *   progress comes from video's timeupdate.
   *
   * Photo:
   *   5 second timer.
   *
   * IMPORTANT:
   *   When isPaused === true, the photo timer
   *   does not run.
   */
  useEffect(() => {
    if (!moment) return;

    /**
     * VIDEO
     *
     * Video progress is controlled by the
     * actual video element.
     */
    if (moment.media_type === "video") {
      const video = videoRef.current;

      if (!video) return;

      const update = () => {
        if (!video.duration) return;

        setProgress(
          Math.min(
            100,
            (video.currentTime /
              video.duration) *
              100,
          ),
        );
      };

      const ended = () => {
        if (!isPaused) {
          goNext();
        }
      };

      video.addEventListener(
        "timeupdate",
        update,
      );

      video.addEventListener(
        "ended",
        ended,
      );

      /**
       * NEW:
       * Explicitly pause/play based on
       * centre tap state.
       */
      if (isPaused) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }

      return () => {
        video.removeEventListener(
          "timeupdate",
          update,
        );

        video.removeEventListener(
          "ended",
          ended,
        );
      };
    }

    /**
     * PHOTO
     *
     * If paused, don't start a timer.
     */
    if (isPaused) {
      return;
    }

    /**
     * Start/restart timer from the amount
     * already elapsed before pause.
     */
    if (startedAtRef.current === 0) {
      startedAtRef.current =
        Date.now() -
        pausedElapsedRef.current;
    }

    const interval = setInterval(() => {
      const elapsed =
        Date.now() -
        startedAtRef.current;

      const pct = Math.min(
        100,
        (elapsed /
          PHOTO_DURATION_MS) *
          100,
      );

      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        goNext();
      }
    }, 50);

    return () =>
      clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    groupIndex,
    momentIndex,
    moment?.media_type,
    isPaused,
  ]);

  /**
   * Go to next Moment.
   */
  const goNext = () => {
    if (!group) return;

    /**
     * NEW:
     * Reset pause timing before changing Moment.
     */
    setIsPaused(false);
    startedAtRef.current = 0;
    pausedElapsedRef.current = 0;
    setProgress(0);

    if (
      momentIndex <
      group.moments.length - 1
    ) {
      setMomentIndex(
        (index) => index + 1,
      );
      return;
    }

    if (
      groupIndex <
      groups.length - 1
    ) {
      setGroupIndex(
        (index) => index + 1,
      );
      setMomentIndex(0);
      return;
    }

    onClose();
  };

  /**
   * Go to previous Moment.
   */
  const goPrev = () => {
    /**
     * NEW:
     * Reset pause timing before changing Moment.
     */
    setIsPaused(false);
    startedAtRef.current = 0;
    pausedElapsedRef.current = 0;
    setProgress(0);

    if (momentIndex > 0) {
      setMomentIndex(
        (index) => index - 1,
      );
      return;
    }

    if (groupIndex > 0) {
      const previousGroup =
        groups[groupIndex - 1];

      setGroupIndex(
        (index) => index - 1,
      );

      setMomentIndex(
        previousGroup.moments.length - 1,
      );
    }
  };

  /**
   * NEW:
   * Centre tap pause/resume.
   */
  const togglePause = () => {
    if (!moment) return;

    /**
     * RESUME
     */
    if (isPaused) {
      /**
       * Photo:
       * continue from the exact elapsed time.
       */
      if (
        moment.media_type !== "video"
      ) {
        startedAtRef.current =
          Date.now() -
          pausedElapsedRef.current;
      }

      /**
       * Video:
       * actual video playback will resume
       * through the effect below.
       */
      setIsPaused(false);

      return;
    }

    /**
     * PAUSE
     */
    if (
      moment.media_type !== "video" &&
      startedAtRef.current !== 0
    ) {
      /**
       * Remember exactly how much time
       * has passed before pausing.
       */
      pausedElapsedRef.current =
        Date.now() -
        startedAtRef.current;
    }

    /**
     * Pause video immediately.
     */
    if (
      moment.media_type === "video" &&
      videoRef.current
    ) {
      videoRef.current.pause();
    }

    setIsPaused(true);
  };

  const openViewers = async () => {
    if (!isOwnMoment || !moment) return;

    setViewersOpen(true);
    setMenuOpen(false);
    setViewersLoading(true);

    try {
      const data =
        await getMomentViewers(
          moment.id,
        );

      setViewers(data);
    } finally {
      setViewersLoading(false);
    }
  };

  const handleReport = async () => {
    if (!moment || isOwnMoment) return;

    const reason =
      window.prompt(
        "Why are you reporting this Moment?",
      );

    if (!reason?.trim()) return;

    setReporting(true);

    try {
      await reportMoment(
        moment.id,
        reason.trim(),
      );

      setMenuOpen(false);

      window.alert(
        "Thanks. Your report has been submitted.",
      );
    } catch {
      window.alert(
        "Unable to submit the report right now.",
      );
    } finally {
      setReporting(false);
    }
  };

  const toggleMute = () => {
    if (!group) return;

    const key =
      "flickzy_muted_moment_authors";

    const current =
      JSON.parse(
        localStorage.getItem(key) || "[]",
      ) as string[];

    const next = muted
      ? current.filter(
          (id) =>
            id !== group.author_id,
        )
      : Array.from(
          new Set([
            ...current,
            group.author_id,
          ]),
        );

    localStorage.setItem(
      key,
      JSON.stringify(next),
    );

    setMuted(!muted);
    setMenuOpen(false);

    if (!muted) {
      goNext();
    }
  };

  const handleDelete = async () => {
    if (!moment || !isOwnMoment) return;

    const confirmed =
      window.confirm(
        "Delete this Moment?",
      );

    if (!confirmed) return;

    try {
      await deleteMoment(moment.id);
      onClose();
    } catch {
      window.alert(
        "Unable to delete this Moment.",
      );
    }
  };

  const handleReply = async () => {
    if (
      !moment ||
      !reply.trim() ||
      sendingReply
    ) {
      return;
    }

    setSendingReply(true);

    try {
      await addMomentEcho(
        moment.id,
        reply.trim(),
      );

      setReply("");
    } catch {
      window.alert(
        "Unable to send your reply.",
      );
    } finally {
      setSendingReply(false);
    }
  };

  const handleShare = async () => {
    if (!moment) return;

    const url =
      `${window.location.origin}/moment/${moment.id}`;

    if (
      navigator.share
    ) {
      try {
        await navigator.share({
          title: "Flickzy Moment",
          url,
        });
      } catch {
        // User cancelled share.
      }

      return;
    }

    await navigator.clipboard?.writeText(url);

    window.alert(
      "Moment link copied.",
    );
  };

  if (!group || !moment) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      onClick={() => {
        setMenuOpen(false);
      }}
    >
      <div className={styles.topArea}>
        <div className={styles.progressRow}>
          {group.moments.map(
            (item, index) => (
              <div
                key={item.id}
                className={
                  styles.progressTrack
                }
              >
                <div
                  className={
                    styles.progressFill
                  }
                  style={{
                    width:
                      index <
                      momentIndex
                        ? "100%"
                        : index ===
                            momentIndex
                          ? `${progress}%`
                          : "0%",
                  }}
                />
              </div>
            ),
          )}
        </div>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Avatar
              url={
                group.author_avatar_url
              }
              initials={
                group.author_avatar_initials
              }
              size={34}
            />

            <div className={styles.authorInfo}>
              <span
                className={
                  styles.username
                }
              >
                {group.author_username}
              </span>

              <span
                className={
                  styles.timeText
                }
              >
                {formatViewedAt(
                  moment.created_at,
                )}
              </span>
            </div>
          </div>

          <div
            className={
              styles.headerActions
            }
          >
            <button
              className={styles.iconButton}
              onClick={(event) => {
                event.stopPropagation();

                setMenuOpen(
                  (value) => !value,
                );
              }}
              aria-label="More options"
            >
              <MoreIcon />
            </button>

            <button
              className={styles.iconButton}
              onClick={onClose}
              aria-label="Close Moment"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      <div
        className={styles.mediaArea}
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <button
          className={styles.tapZoneLeft}
          onClick={goPrev}
          aria-label="Previous Moment"
        />

        <button
          className={styles.tapZoneRight}
          onClick={goNext}
          aria-label="Next Moment"
        />

        {mediaUrl ? (
          moment.media_type ===
          "video" ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className={styles.realMedia}
              style={{
                filter:
                  FILTER_CSS[
                    overlay.filter
                  ] || "none",
              }}
              autoPlay={!isPaused}
              muted={muted}
              playsInline
              onLoadedMetadata={(event) => {
                if (!isPaused) {
                  event.currentTarget
                    .play()
                    .catch(() => {});
                }
              }}
            />
          ) : (
            <img
              src={mediaUrl}
              className={styles.realMedia}
              style={{
                filter:
                  FILTER_CSS[
                    overlay.filter
                  ] || "none",
              }}
              alt=""
            />
          )
        ) : (
          <div
            className={
              styles.placeholderMedia
            }
          />
        )}

        <svg
          className={styles.drawLayer}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {overlay.drawings.map(
            (stroke) => (
              <path
                key={stroke.id}
                d={strokeToPath(
                  stroke.points,
                )}
                stroke={stroke.color}
                strokeWidth={
                  stroke.strokeWidth
                }
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}
        </svg>

        {overlay.textOverlays.map(
          (item) => (
            <div
              key={item.id}
              className={
                styles.textOverlay
              }
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                color: item.color,
                fontSize: item.fontSize,
              }}
            >
              {item.text}
            </div>
          ),
        )}

        {overlay.caption && (
          <div
            className={
              styles.caption
            }
          >
            {overlay.caption}
          </div>
        )}

        {/* =================================================
            CENTRE PAUSE / RESUME BUTTON
            ================================================= */}
        <button
          className={
            styles.centerTapZone
          }
          onClick={togglePause}
          aria-label={
            isPaused
              ? "Resume Moment"
              : "Pause Moment"
          }
          type="button"
        />

        {/* =================================================
            PAUSE INDICATOR
            ================================================= */}
        {isPaused && (
          <div
            className={
              styles.pauseIndicator
            }
            aria-hidden="true"
          >
            <span>Ⅱ</span>
          </div>
        )}
      </div>

      <div
        className={styles.bottomArea}
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {isOwnMoment ? (
          <button
            className={
              styles.activityButton
            }
            onClick={openViewers}
          >
            <EyeIcon />

            <span>
              Activity
            </span>

            <strong>
              {moment.view_count ?? 0}
            </strong>
          </button>
        ) : (
          <div className={styles.replyRow}>
            <div
              className={
                styles.replyInputWrap
              }
            >
              <input
                value={reply}
                onChange={(event) =>
                  setReply(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleReply();
                  }
                }}
                placeholder="Write a reply..."
                maxLength={500}
              />

              {reply.trim() && (
                <button
                  className={
                    styles.replySend
                  }
                  onClick={
                    handleReply
                  }
                  disabled={
                    sendingReply
                  }
                  aria-label="Send reply"
                >
                  <SendIcon />
                </button>
              )}
            </div>

            <button
              className={`${styles.bottomIconButton} ${
                liked
                  ? styles.liked
                  : ""
              }`}
              onClick={() =>
                setLiked(
                  (value) => !value,
                )
              }
              aria-label="React"
            >
              <HeartIcon
                filled={liked}
              />
            </button>

            <button
              className={
                styles.bottomIconButton
              }
              onClick={handleShare}
              aria-label="Send On"
            >
              <SendIcon />
            </button>
          </div>
        )}

        {isOwnMoment && (
          <div
            className={
              styles.ownerActions
            }
          >
            <button
              className={
                styles.ownerAction
              }
              onClick={handleShare}
            >
              <SendIcon />

              <span>
                Share
              </span>
            </button>

            <button
              className={
                styles.ownerActionDanger
              }
              onClick={handleDelete}
            >
              <DeleteIcon />

              <span>
                Delete
              </span>
            </button>
          </div>
        )}
      </div>

      {menuOpen && (
        <div
          className={styles.menu}
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          {!isOwnMoment && (
            <>
              <button
                className={styles.menuItem}
                onClick={handleReport}
                disabled={reporting}
              >
                <ReportIcon />

                <span>
                  {reporting
                    ? "Reporting..."
                    : "Report"}
                </span>
              </button>

              <button
                className={styles.menuItem}
                onClick={toggleMute}
              >
                <MuteIcon />

                <span>
                  {muted
                    ? "Unmute"
                    : "Mute"}
                </span>
              </button>
            </>
          )}

          {isOwnMoment && (
            <>
              <button
                className={styles.menuItem}
                onClick={openViewers}
              >
                <EyeIcon />

                <span>
                  View Activity
                </span>
              </button>

              <button
                className={
                  styles.menuItemDanger
                }
                onClick={handleDelete}
              >
                <DeleteIcon />

                <span>
                  Delete
                </span>
              </button>
            </>
          )}
        </div>
      )}

      {viewersOpen && (
        <div
          className={
            styles.viewersBackdrop
          }
          onClick={() =>
            setViewersOpen(false)
          }
        >
          <div
            className={
              styles.viewersSheet
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.sheetHandle
              }
            />

            <div
              className={
                styles.viewersHeader
              }
            >
              <div>
                <h3>
                  Activity
                </h3>

                <span>
                  {viewers.length} viewed
                </span>
              </div>

              <button
                className={
                  styles.sheetClose
                }
                onClick={() =>
                  setViewersOpen(false)
                }
                aria-label="Close viewers"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {viewersLoading ? (
              <div
                className={
                  styles.viewersLoading
                }
              >
                Loading...
              </div>
            ) : viewers.length === 0 ? (
              <div
                className={
                  styles.noViewers
                }
              >
                <EyeIcon />

                <span>
                  No views yet
                </span>
              </div>
            ) : (
              <div
                className={
                  styles.viewerList
                }
              >
                {viewers.map(
                  (viewer) => (
                    <div
                      key={
                        viewer.user_id
                      }
                      className={
                        styles.viewerRow
                      }
                    >
                      <Avatar
                        url={
                          viewer.avatar_url
                        }
                        initials={
                          viewer.avatar_initials
                        }
                        size={38}
                      />

                      <div
                        className={
                          styles.viewerInfo
                        }
                      >
                        <strong>
                          {
                            viewer.username
                          }
                        </strong>

                        <span>
                          {
                            viewer.display_name
                          }
                        </span>
                      </div>

                      <time>
                        {formatViewedAt(
                          viewer.viewed_at,
                        )}
                      </time>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}