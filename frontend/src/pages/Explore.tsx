import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { SearchBar } from "../components/SearchBar";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { MediaGrid } from "../components/MediaGrid";
import { PostCard } from "../components/PostCard";
import { CommentsSheet } from "../components/CommentsSheet";
import { RushShareSheet } from "../components/RushShareSheet";
import { CloseIcon, SearchIcon } from "../components/icons";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import * as searchApi from "../services/search";
import { getFeed, likePost, unlikePost, bookmarkPost, unbookmarkPost } from "../services/posts";
import { resolveMediaUrl } from "../utils/media";
import type { Post, UserPublic } from "../types";
import styles from "./Explore.module.css";

const FILTERS = ["Top", "People", "Photos", "Videos"] as const;

export function Explore() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Top");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);

  useEffect(() => {
    getFeed().then((res) => setTrending(res.posts)).catch(() => {});
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setUsers([]);
      setPosts([]);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => {
      Promise.all([searchApi.searchUsers(trimmed), searchApi.searchPosts(trimmed)])
        .then(([u, p]) => {
          setUsers(u);
          setPosts(p);
        })
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const showResults = query.trim().length > 0;
  const filteredUsers = filter === "Photos" || filter === "Videos" ? [] : users;
  const filteredPosts =
    filter === "People" ? [] : filter === "Photos" ? posts.filter((p) => p.media_type === "image")
    : filter === "Videos" ? posts.filter((p) => p.media_type === "video")
    : posts;

  const patchPostEverywhere = (postId: string, patch: Partial<Post>) => {
    const apply = (list: Post[]) => list.map((p) => (p.id === postId ? { ...p, ...patch } : p));
    setTrending(apply);
    setPosts(apply);
    setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, ...patch } : prev));
  };

  const handleLikeToggle = async (post: Post) => {
    const wasLiked = post.is_liked;
    patchPostEverywhere(post.id, {
      is_liked: !wasLiked,
      like_count: post.like_count + (wasLiked ? -1 : 1),
    });
    try {
      if (wasLiked) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      patchPostEverywhere(post.id, { is_liked: wasLiked, like_count: post.like_count });
    }
  };

  const handleBookmarkToggle = async (post: Post) => {
    const wasBookmarked = post.is_bookmarked;
    patchPostEverywhere(post.id, { is_bookmarked: !wasBookmarked });
    try {
      if (wasBookmarked) await unbookmarkPost(post.id);
      else await bookmarkPost(post.id);
    } catch {
      patchPostEverywhere(post.id, { is_bookmarked: wasBookmarked });
    }
  };

  return (
    <AppLayout>
      <div className={styles.header}>
        <h1 className={styles.title}>Discover</h1>
        <SearchBar placeholder="Search Spaces or Flicks" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className={styles.chips}>
          {FILTERS.map((f) => (
            <button
              key={f}
              className={f === filter ? styles.chipActive : styles.chip}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {showResults ? (
        isSearching ? (
          <LoadingSpinner />
        ) : filteredUsers.length === 0 && filteredPosts.length === 0 ? (
          <EmptyState icon={<SearchIcon />} title="Nothing here" description={`Nothing matched "${query}"`} />
        ) : (
          <div className={styles.results}>
            {filteredUsers.length > 0 && (
              <div className={styles.userList}>
                {filteredUsers.map((u) => (
                  <Link key={u.id} to={`/users/${u.id}`} className={styles.userRow}>
                    <Avatar url={u.avatar_url} initials={u.avatar_initials} size={44} />
                    <div>
                      <div className={styles.userName}>
                        {u.username}
                        {u.is_verified && <VerifiedBadge size={12} />}
                      </div>
                      <div className={styles.userSub}>{u.display_name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {filteredPosts.length > 0 && <MediaGrid posts={filteredPosts} onSelect={setSelectedPost} />}
          </div>
        )
      ) : (
        <MediaGrid posts={trending} onSelect={setSelectedPost} />
      )}

      {selectedPost && (
        <div className={styles.detailBackdrop} onClick={() => setSelectedPost(null)}>
          <div className={styles.detailSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <button
                type="button"
                className={styles.detailClose}
                onClick={() => setSelectedPost(null)}
                aria-label="Close"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <div className={styles.detailScroll}>
              <PostCard
                post={selectedPost}
                onLikeToggle={handleLikeToggle}
                onBookmarkToggle={handleBookmarkToggle}
                onCommentClick={setCommentPost}
                onShareClick={setSharePost}
              />
            </div>
          </div>
        </div>
      )}

      {commentPost && (
        <CommentsSheet
          post={commentPost}
          onClose={() => setCommentPost(null)}
          onCommentCountChange={(count) => patchPostEverywhere(commentPost.id, { comment_count: count })}
        />
      )}

      {sharePost && (
        <RushShareSheet
          isOpen={true}
          onClose={() => setSharePost(null)}
          postId={sharePost.id}
          mediaUrl={resolveMediaUrl(sharePost.media?.[0]?.url)}
          mediaType={sharePost.media_type}
          caption={sharePost.caption}
          contentType="post"
        />
      )}
    </AppLayout>
  );
}