import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  RushIcon,
} from "../components/icons";
import * as rushApi from "../services/rush";
import * as postsApi from "../services/posts";
import { CommentsSheet } from "../components/CommentsSheet";
import { useToast } from "../components/Toast";
import type { Post } from "../types";
import styles from "./Rush.module.css";

const PHOTO_DURATION_MS = 5000;
const DOUBLE_TAP_DELAY_MS = 280;

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

function SpeakerIcon({
  muted,
}: {
  muted: boolean;
}) {
  if (muted) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={styles.speakerSvg}
      >
        <path
          d="M5 9v6h4l5 4V5l-5 4H5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        <path
          d="m18 9 3 6m0-6-3 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.speakerSvg}
    >
      <path
        d="M5 9v6h4l5 4V5l-5 4H5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="M17 8.5a5 5 0 0 1 0 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M19.5 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        width: 23,
        height: 23,
        fill: "currentColor",
      }}
    >
      <rect
        x="7"
        y="5"
        width="3.5"
        height="14"
        rx="1"
      />
      <rect
        x="13.5"
        y="5"
        width="3.5"
        height="14"
        rx="1"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        width: 23,
        height: 23,
        fill: "currentColor",
      }}
    >
      <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10-6.8c.6-.4.6-1.3 0-1.7l-10-6.8C8.9 3.9 8 4.4 8 5.2Z" />
    </svg>
  );
}

export function Rush() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState(false);
  const [activePost, setActivePost] =
    useState<Post | null>(null);

  /**
   * Default sound = ON
   */
  const [muted, setMuted] =
    useState(false);

  /**
   * Pause state per Rush.
   */
  const [pausedPosts, setPausedPosts] =
    useState<Record<string, boolean>>(
      {},
    );

  /**
   * Double-tap detection.
   */
  const lastTapRef =
    useRef<Record<string, number>>(
      {},
    );

  /**
   * Photo timing.
   */
  const photoStartedAtRef =
    useRef<Record<string, number>>(
      {},
    );

  const photoElapsedRef =
    useRef<Record<string, number>>(
      {},
    );

  const photoTimerRef =
    useRef<Record<string, number>>(
      {},
    );

  /**
   * Video references.
   */
  const videoRefs =
    useRef<
      Record<
        string,
        HTMLVideoElement | null
      >
    >({});

  const { showToast } = useToast();

  useEffect(() => {
    rushApi
      .getRushFeed()
      .then((res) =>
        setPosts(res.posts),
      )
      .catch(() => setError(true))
      .finally(() =>
        setIsLoading(false),
      );
  }, []);

  const updatePost = (
    postId: string,
    patch: Partial<Post>,
  ) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, ...patch }
          : p,
      ),
    );
  };

  const handleLike = async (
    post: Post,
  ) => {
    const wasLiked =
      post.is_liked;

    updatePost(post.id, {
      is_liked: !wasLiked,
      like_count:
        post.like_count +
        (wasLiked ? -1 : 1),
    });

    try {
      if (wasLiked) {
        await postsApi.unlikePost(
          post.id,
        );
      } else {
        await postsApi.likePost(
          post.id,
        );
      }
    } catch {
      updatePost(post.id, {
        is_liked: wasLiked,
        like_count:
          post.like_count,
      });
    }
  };

  const handleKeep = async (
    post: Post,
  ) => {
    const wasKept =
      post.is_bookmarked;

    updatePost(post.id, {
      is_bookmarked: !wasKept,
    });

    try {
      if (wasKept) {
        await postsApi.unbookmarkPost(
          post.id,
        );
      } else {
        await postsApi.bookmarkPost(
          post.id,
        );
      }
    } catch {
      updatePost(post.id, {
        is_bookmarked: wasKept,
      });
    }
  };

  const handleSendOn = (
    post: Post,
  ) => {
    navigator.clipboard?.writeText(
      `${window.location.origin}/r/${post.id}`,
    );

    showToast(
      "Link copied — ready to Send On",
      "success",
    );
  };

  const clearPhotoTimer = (
    postId: string,
  ) => {
    const timer =
      photoTimerRef.current[
        postId
      ];

    if (timer !== undefined) {
      window.clearInterval(timer);

      delete photoTimerRef.current[
        postId
      ];
    }
  };

  const resetPlayback = (
    postId: string,
  ) => {
    clearPhotoTimer(postId);

    photoStartedAtRef.current[
      postId
    ] = 0;

    photoElapsedRef.current[
      postId
    ] = 0;

    setPausedPosts((prev) => ({
      ...prev,
      [postId]: false,
    }));

    const video =
      videoRefs.current[postId];

    if (video) {
      video.pause();

      try {
        video.currentTime = 0;
      } catch {
        // Ignore unavailable video state.
      }
    }
  };

  const startPhotoTimer = (
    postId: string,
    goNext: () => void,
  ) => {
    clearPhotoTimer(postId);

    if (
      photoStartedAtRef.current[
        postId
      ] === 0
    ) {
      photoStartedAtRef.current[
        postId
      ] =
        Date.now() -
        (
          photoElapsedRef.current[
            postId
          ] || 0
        );
    }

    photoTimerRef.current[
      postId
    ] = window.setInterval(() => {
      const started =
        photoStartedAtRef.current[
          postId
        ];

      if (!started) return;

      const elapsed =
        Date.now() - started;

      if (
        elapsed >=
        PHOTO_DURATION_MS
      ) {
        clearPhotoTimer(postId);

        photoElapsedRef.current[
          postId
        ] = PHOTO_DURATION_MS;

        goNext();
      }
    }, 50);
  };

  /**
   * Single tap:
   * Pause / Resume
   */
  const togglePause = (
    post: Post,
  ) => {
    const currentlyPaused =
      Boolean(
        pausedPosts[post.id],
      );

    /**
     * VIDEO
     */
    if (
      post.media_type === "video"
    ) {
      const video =
        videoRefs.current[
          post.id
        ];

      if (video) {
        if (currentlyPaused) {
          video
            .play()
            .catch(() => {});
        } else {
          video.pause();
        }
      }

      setPausedPosts((prev) => ({
        ...prev,
        [post.id]:
          !currentlyPaused,
      }));

      return;
    }

    /**
     * PHOTO
     */
    if (currentlyPaused) {
      setPausedPosts((prev) => ({
        ...prev,
        [post.id]: false,
      }));

      return;
    }

    if (
      photoStartedAtRef.current[
        post.id
      ] !== 0
    ) {
      photoElapsedRef.current[
        post.id
      ] =
        Date.now() -
        photoStartedAtRef.current[
          post.id
        ];
    }

    clearPhotoTimer(post.id);

    setPausedPosts((prev) => ({
      ...prev,
      [post.id]: true,
    }));
  };

  /**
   * Centre media gesture:
   *
   * Single tap  -> Pause / Resume
   * Double tap  -> Love
   */
  const handleMediaTap = (
    post: Post,
  ) => {
    const now = Date.now();

    const previousTap =
      lastTapRef.current[
        post.id
      ] || 0;

    const isDoubleTap =
      now - previousTap <=
      DOUBLE_TAP_DELAY_MS;

    if (isDoubleTap) {
      lastTapRef.current[
        post.id
      ] = 0;

      /**
       * Double tap = Love.
       */
      handleLike(post);

      return;
    }

    lastTapRef.current[
      post.id
    ] = now;

    window.setTimeout(() => {
      const latestTap =
        lastTapRef.current[
          post.id
        ];

      if (latestTap !== now) {
        return;
      }

      lastTapRef.current[
        post.id
      ] = 0;

      /**
       * Single tap = Pause.
       */
      togglePause(post);
    }, DOUBLE_TAP_DELAY_MS);
  };

  /**
   * Go to next Rush.
   */
  const goNext = (
    currentIndex: number,
  ) => {
    if (
      currentIndex >=
      posts.length - 1
    ) {
      return;
    }

    const current =
      posts[currentIndex];

    const next =
      posts[currentIndex + 1];

    resetPlayback(current.id);

    if (next) {
      resetPlayback(next.id);

      const element =
        document.getElementById(
          `rush-${next.id}`,
        );

      element?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  /**
   * Observe which Rush is currently
   * visible.
   */
  useEffect(() => {
    if (!posts.length) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              const postId =
                entry.target.getAttribute(
                  "data-rush-id",
                );

              if (!postId) return;

              const post =
                posts.find(
                  (item) =>
                    item.id ===
                    postId,
                );

              if (!post) return;

              if (
                entry.isIntersecting &&
                entry.intersectionRatio >=
                  0.6
              ) {
                /**
                 * VIDEO
                 */
                if (
                  post.media_type ===
                  "video"
                ) {
                  const video =
                    videoRefs.current[
                      post.id
                    ];

                  if (
                    video &&
                    !pausedPosts[
                      post.id
                    ]
                  ) {
                    video
                      .play()
                      .catch(
                        () => {},
                      );
                  }
                } else {
                  /**
                   * PHOTO
                   */
                  if (
                    !pausedPosts[
                      post.id
                    ]
                  ) {
                    startPhotoTimer(
                      post.id,
                      () => {
                        const index =
                          posts.findIndex(
                            (item) =>
                              item.id ===
                              post.id,
                          );

                        if (
                          index !==
                          -1
                        ) {
                          goNext(
                            index,
                          );
                        }
                      },
                    );
                  }
                }
              } else {
                const video =
                  videoRefs.current[
                    post.id
                  ];

                if (video) {
                  video.pause();
                }

                clearPhotoTimer(
                  post.id,
                );
              }
            },
          );
        },
        {
          threshold: 0.6,
        },
      );

    posts.forEach((post) => {
      const element =
        document.getElementById(
          `rush-${post.id}`,
        );

      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();

      Object.keys(
        photoTimerRef.current,
      ).forEach((postId) => {
        clearPhotoTimer(postId);
      });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  /**
   * Keep videos synchronized with
   * muted / paused state.
   */
  useEffect(() => {
    Object.entries(
      videoRefs.current,
    ).forEach(
      ([postId, video]) => {
        if (!video) return;

        video.muted = muted;

        if (
          pausedPosts[postId]
        ) {
          video.pause();
        }
      },
    );
  }, [muted, pausedPosts]);

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (
    error ||
    posts.length === 0
  ) {
    return (
      <AppLayout>
        <EmptyState
          icon={<RushIcon />}
          title={
            error
              ? "Couldn't load Rush"
              : "No Rush yet"
          }
          description={
            error
              ? "Check that the backend is running."
              : "Be the first to post a Rush."
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.page}>
        <div className={styles.feed}>
          {posts.map((post) => {
            const mediaUrl =
              resolveMediaUrl(
                post.media?.[0]?.url,
              );

            const isPaused =
              Boolean(
                pausedPosts[
                  post.id
                ],
              );

            return (
              <div
                key={post.id}
                id={`rush-${post.id}`}
                data-rush-id={post.id}
                className={
                  styles.slide
                }
              >
                <div
                  className={
                    styles.mediaArea
                  }
                  onClick={() =>
                    handleMediaTap(
                      post,
                    )
                  }
                >
                  {mediaUrl ? (
                    post.media_type ===
                    "video" ? (
                      <video
                        ref={(element) => {
                          videoRefs.current[
                            post.id
                          ] =
                            element;
                        }}
                        className={
                          styles.rushMedia
                        }
                        src={mediaUrl}
                        autoPlay
                        loop={false}
                        muted={muted}
                        playsInline
                        controls={false}
                        preload="auto"
                      />
                    ) : (
                      <img
                        className={
                          styles.rushMedia
                        }
                        src={mediaUrl}
                        alt={
                          post.caption ||
                          "Rush"
                        }
                        draggable={
                          false
                        }
                      />
                    )
                  ) : (
                    <div
                      className={
                        styles.placeholderMedia
                      }
                    />
                  )}

                  {/* =================================================
                      SPEAKER BUTTON
                      ================================================= */}
                  {post.media_type ===
                    "video" && (
                    <button
                      type="button"
                      className={
                        styles.speakerButton
                      }
                      onClick={(event) => {
                        event.stopPropagation();

                        setMuted(
                          (value) =>
                            !value,
                        );
                      }}
                      aria-label={
                        muted
                          ? "Unmute Rush"
                          : "Mute Rush"
                      }
                    >
                      <SpeakerIcon
                        muted={
                          muted
                        }
                      />
                    </button>
                  )}

                  {/* =================================================
                      PAUSE INDICATOR
                      ================================================= */}
                  {isPaused && (
                    <div
                      style={{
                        position:
                          "absolute",
                        left: "50%",
                        top: "50%",
                        transform:
                          "translate(-50%, -50%)",
                        width: 52,
                        height: 52,
                        borderRadius:
                          "50%",
                        background:
                          "rgba(0,0,0,0.5)",
                        color: "#fff",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        zIndex: 5,
                        pointerEvents:
                          "none",
                      }}
                    >
                      <PauseIcon />
                    </div>
                  )}
                </div>

                <div
                  className={
                    styles.topOverlay
                  }
                >
                  <span
                    className={
                      styles.rushLabel
                    }
                  >
                    Rush
                  </span>
                </div>

                <div
                  className={
                    styles.bottomOverlay
                  }
                >
                  <Link
                    to={`/users/${post.author.id}`}
                    className={
                      styles.userRow
                    }
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <Avatar
                      url={
                        post.author
                          .avatar_url
                      }
                      initials={
                        post.author
                          .avatar_initials
                      }
                      size={38}
                    />

                    <span
                      className={
                        styles.username
                      }
                    >
                      {
                        post.author
                          .username
                      }

                      {post.author
                        .is_verified && (
                        <VerifiedBadge
                          size={13}
                        />
                      )}
                    </span>
                  </Link>

                  {post.caption && (
                    <p
                      className={
                        styles.caption
                      }
                    >
                      {post.caption}
                    </p>
                  )}
                </div>

                <div
                  className={
                    styles.actionsRail
                  }
                >
                  <button
                    className={
                      styles.actionBtn
                    }
                    onClick={() =>
                      handleLike(
                        post,
                      )
                    }
                    aria-label="Love"
                  >
                    <HeartIcon
                      size={26}
                      filled={
                        post.is_liked
                      }
                    />

                    <span>
                      {
                        post.like_count
                      }
                    </span>
                  </button>

                  <button
                    className={
                      styles.actionBtn
                    }
                    onClick={() =>
                      setActivePost(
                        post,
                      )
                    }
                    aria-label="Echo"
                  >
                    <CommentIcon
                      size={24}
                    />

                    <span>
                      {
                        post.comment_count
                      }
                    </span>
                  </button>

                  <button
                    className={
                      styles.actionBtn
                    }
                    onClick={() =>
                      handleSendOn(
                        post,
                      )
                    }
                    aria-label="Send On"
                  >
                    <ShareIcon
                      size={24}
                    />

                    <span>
                      Send
                    </span>
                  </button>

                  <button
                    className={
                      styles.actionBtn
                    }
                    onClick={() =>
                      handleKeep(
                        post,
                      )
                    }
                    aria-label="Keep"
                  >
                    <BookmarkIcon
                      size={24}
                      filled={
                        post.is_bookmarked
                      }
                    />

                    <span>
                      Keep
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {activePost && (
          <CommentsSheet
            post={activePost}
            onClose={() =>
              setActivePost(null)
            }
            onCommentCountChange={(
              count,
            ) =>
              updatePost(
                activePost.id,
                {
                  comment_count:
                    count,
                },
              )
            }
          />
        )}
      </div>
    </AppLayout>
  );
}