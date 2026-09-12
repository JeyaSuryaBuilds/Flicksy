import { useCallback, useEffect, useRef, useState } from "react";
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
  SpeakerIcon,
} from "../components/icons";
import * as rushApi from "../services/rush";
import * as postsApi from "../services/posts";
import { CommentsSheet } from "../components/CommentsSheet";
import { RushShareSheet } from "../components/RushShareSheet";
import { useToast } from "../components/Toast";
import { resolveMediaUrl } from "../utils/media";
import type { Post } from "../types";
import styles from "./Rush.module.css";

const PHOTO_DURATION_MS = 5000;
const DOUBLE_TAP_DELAY_MS = 280;

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

export function Rush() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activePost, setActivePost] =
    useState<Post | null>(null);

  /**
   * Post selected for Share Sheet.
   */
  const [sharePost, setSharePost] =
    useState<Post | null>(null);

  /**
   * Rush videos start with sound ON.
   */
  const [muted, setMuted] = useState(false);

  /**
   * Pause state per Rush.
   */
  const [pausedPosts, setPausedPosts] =
    useState<Record<string, boolean>>({});

  /**
   * Keep paused state in a ref so that
   * IntersectionObserver always has the
   * latest value.
   */
  const pausedPostsRef =
    useRef<Record<string, boolean>>({});

  /**
   * Double-tap detection.
   */
  const lastTapRef =
    useRef<Record<string, number>>({});

  /**
   * Pending single-tap timers.
   */
  const tapTimerRef =
    useRef<Record<string, number>>({});

  /**
   * Photo timing.
   */
  const photoStartedAtRef =
    useRef<Record<string, number>>({});

  const photoElapsedRef =
    useRef<Record<string, number>>({});

  const photoTimerRef =
    useRef<Record<string, number>>({});

  /**
   * Video references.
   */
  const videoRefs = useRef<
    Record<string, HTMLVideoElement | null>
  >({});

  const { showToast } = useToast();

  /**
   * Sync pause state ref.
   */
  useEffect(() => {
    pausedPostsRef.current = pausedPosts;
  }, [pausedPosts]);

  /**
   * Load Rush feed.
   */
  useEffect(() => {
    let cancelled = false;

    rushApi
      .getRushFeed()
      .then((res) => {
        if (!cancelled) {
          setPosts(res.posts);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updatePost = useCallback(
    (
      postId: string,
      patch: Partial<Post>,
    ) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, ...patch }
            : post,
        ),
      );
    },
    [],
  );

  /**
   * Love / Unlike.
   */
  const handleLike = useCallback(
    async (post: Post) => {
      const wasLiked = post.is_liked;

      updatePost(post.id, {
        is_liked: !wasLiked,
        like_count:
          post.like_count +
          (wasLiked ? -1 : 1),
      });

      try {
        if (wasLiked) {
          await postsApi.unlikePost(post.id);
        } else {
          await postsApi.likePost(post.id);
        }
      } catch {
        updatePost(post.id, {
          is_liked: wasLiked,
          like_count: post.like_count,
        });
      }
    },
    [updatePost],
  );

  /**
   * Keep / Unkeep.
   */
  const handleKeep = useCallback(
    async (post: Post) => {
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
    },
    [updatePost],
  );

  /**
   * Open Share Sheet.
   */
  const handleSendOn = useCallback(
    (post: Post) => {
      setSharePost(post);
    },
    [],
  );

  /**
   * Clear photo timer.
   */
  const clearPhotoTimer = useCallback(
    (postId: string) => {
      const timer =
        photoTimerRef.current[postId];

      if (timer !== undefined) {
        window.clearInterval(timer);

        delete photoTimerRef.current[
          postId
        ];
      }
    },
    [],
  );

  /**
   * Reset playback.
   */
  const resetPlayback = useCallback(
    (postId: string) => {
      clearPhotoTimer(postId);

      photoStartedAtRef.current[
        postId
      ] = 0;

      photoElapsedRef.current[
        postId
      ] = 0;

      pausedPostsRef.current = {
        ...pausedPostsRef.current,
        [postId]: false,
      };

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
    },
    [clearPhotoTimer],
  );

  /**
   * Move to next Rush.
   *
   * This is still used for photo Rushes.
   * Video Rushes now loop themselves.
   */
  const goNext = useCallback(
    (currentIndex: number) => {
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

      if (current) {
        resetPlayback(current.id);
      }

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
    },
    [posts, resetPlayback],
  );

  /**
   * Start photo timer.
   */
  const startPhotoTimer = useCallback(
    (postId: string) => {
      clearPhotoTimer(postId);

      if (
        pausedPostsRef.current[
          postId
        ]
      ) {
        return;
      }

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
        if (
          pausedPostsRef.current[
            postId
          ]
        ) {
          return;
        }

        const started =
          photoStartedAtRef.current[
            postId
          ];

        if (!started) {
          return;
        }

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

          const index =
            posts.findIndex(
              (post) =>
                post.id === postId,
            );

          if (index !== -1) {
            goNext(index);
          }
        }
      }, 50);
    },
    [
      clearPhotoTimer,
      goNext,
      posts,
    ],
  );

  /**
   * Pause / Resume.
   */
  const togglePause = useCallback(
    (post: Post) => {
      const currentlyPaused =
        Boolean(
          pausedPostsRef.current[
            post.id
          ],
        );

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

        const nextPaused =
          !currentlyPaused;

        if (video) {
          if (nextPaused) {
            video.pause();
          } else {
            video
              .play()
              .catch(() => {});
          }
        }

        pausedPostsRef.current = {
          ...pausedPostsRef.current,
          [post.id]:
            nextPaused,
        };

        setPausedPosts((prev) => ({
          ...prev,
          [post.id]:
            nextPaused,
        }));

        return;
      }

      /**
       * PHOTO
       */
      if (currentlyPaused) {
        pausedPostsRef.current = {
          ...pausedPostsRef.current,
          [post.id]: false,
        };

        setPausedPosts((prev) => ({
          ...prev,
          [post.id]: false,
        }));

        startPhotoTimer(post.id);

        return;
      }

      const started =
        photoStartedAtRef.current[
          post.id
        ];

      if (started) {
        photoElapsedRef.current[
          post.id
        ] =
          Date.now() - started;
      }

      clearPhotoTimer(post.id);

      pausedPostsRef.current = {
        ...pausedPostsRef.current,
        [post.id]: true,
      };

      setPausedPosts((prev) => ({
        ...prev,
        [post.id]: true,
      }));
    },
    [
      clearPhotoTimer,
      startPhotoTimer,
    ],
  );

  /**
   * Centre gesture:
   *
   * Single tap  -> Pause / Resume
   * Double tap  -> Love / Unlike
   */
  const handleMediaTap = useCallback(
    (post: Post) => {
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

        const timer =
          tapTimerRef.current[
            post.id
          ];

        if (timer !== undefined) {
          window.clearTimeout(timer);

          delete tapTimerRef.current[
            post.id
          ];
        }

        void handleLike(post);

        return;
      }

      lastTapRef.current[
        post.id
      ] = now;

      const timer =
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

          togglePause(post);

          delete tapTimerRef.current[
            post.id
          ];
        }, DOUBLE_TAP_DELAY_MS);

      tapTimerRef.current[
        post.id
      ] = timer;
    },
    [
      handleLike,
      togglePause,
    ],
  );

  /**
   * Observe visible Rush.
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

              if (!postId) {
                return;
              }

              const post =
                posts.find(
                  (item) =>
                    item.id ===
                    postId,
                );

              if (!post) {
                return;
              }

              const isVisible =
                entry.isIntersecting &&
                entry.intersectionRatio >=
                  0.6;

              if (isVisible) {
                /**
                 * VIDEO
                 *
                 * Always resume the video
                 * when it becomes visible,
                 * unless user explicitly paused it.
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
                    !pausedPostsRef.current[
                      post.id
                    ]
                  ) {
                    video
                      .play()
                      .catch(() => {
                        // Most browsers/WebViews block unmuted autoplay
                        // without a direct user gesture. Rather than the
                        // Rush silently freezing on first view, fall back
                        // to muted autoplay and keep the speaker icon
                        // honest about it — the user can still tap to
                        // unmute, which is a real gesture and always allowed.
                        if (!video.muted) {
                          video.muted = true;
                          setMuted(true);
                          video.play().catch(() => {});
                        }
                      });
                  }

                  return;
                }

                /**
                 * PHOTO
                 */
                if (
                  !pausedPostsRef.current[
                    post.id
                  ]
                ) {
                  startPhotoTimer(
                    post.id,
                  );
                }

                return;
              }

              /**
               * Not visible.
               */
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
            },
          );
        },
        {
          threshold: [0.6],
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
  }, [
    posts,
    clearPhotoTimer,
    startPhotoTimer,
  ]);

  /**
   * Synchronize mute state.
   */
  useEffect(() => {
    Object.entries(
      videoRefs.current,
    ).forEach(
      ([postId, video]) => {
        if (!video) {
          return;
        }

        video.muted = muted;

        if (
          pausedPostsRef.current[
            postId
          ]
        ) {
          video.pause();
        }
      },
    );
  }, [muted]);

  /**
   * Cleanup.
   */
  useEffect(() => {
    return () => {
      Object.values(
        tapTimerRef.current,
      ).forEach((timer) => {
        window.clearTimeout(timer);
      });

      Object.values(
        photoTimerRef.current,
      ).forEach((timer) => {
        window.clearInterval(timer);
      });
    };
  }, []);

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
                          ] = element;
                        }}
                        className={
                          styles.rushMedia
                        }
                        src={mediaUrl}
                        loop
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
                        draggable={false}
                      />
                    )
                  ) : (
                    <div
                      className={
                        styles.placeholderMedia
                      }
                    />
                  )}

                  {/* Speaker */}
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

                  {/* Pause indicator */}
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
                        borderRadius: "50%",
                        background:
                          "rgba(0, 0, 0, 0.45)",
                        display: "flex",
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

                {/* Top overlay */}
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

                {/* Bottom overlay */}
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

                {/* Actions */}
                <div
                  className={
                    styles.actionsRail
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.actionBtn
                    }
                    onClick={() =>
                      void handleLike(
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
                    type="button"
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
                    type="button"
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
                    type="button"
                    className={
                      styles.actionBtn
                    }
                    onClick={() =>
                      void handleKeep(
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

        {/* Echo / Comments */}
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

        {/* Rush Share Sheet */}
        {sharePost && (
          <RushShareSheet
            isOpen={true}
            onClose={() =>
              setSharePost(null)
            }
            postId={sharePost.id}
            mediaUrl={resolveMediaUrl(
              sharePost.media?.[0]?.url,
            )}
            caption={
              sharePost.caption
            }
          />
        )}
      </div>
    </AppLayout>
  );
}