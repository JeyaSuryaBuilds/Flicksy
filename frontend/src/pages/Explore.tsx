import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { SearchBar } from "../components/SearchBar";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { MediaGrid } from "../components/MediaGrid";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { SearchIcon } from "../components/icons";
import * as searchApi from "../services/search";
import { getFeed } from "../services/posts";
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
            {filteredPosts.length > 0 && <MediaGrid posts={filteredPosts} />}
          </div>
        )
      ) : (
        <MediaGrid posts={trending} />
      )}
    </AppLayout>
  );
}
