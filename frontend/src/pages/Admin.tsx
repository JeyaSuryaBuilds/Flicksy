import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { Button } from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import * as adminApi from "../services/admin";
import type { UserPublic } from "../types";
import styles from "./Admin.module.css";

const TABS = ["Overview", "Users", "Reports", "Ads"] as const;

export function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  // Frontend gate is a UX convenience only — every admin API call below is independently
  // enforced server-side via get_current_admin, so this is not the real security boundary.
  if (!user?.is_admin) {
    return <Navigate to="/home" replace />;
  }

  return (
    <AppLayout>
      <div className={styles.wrap}>
        <h1 className={styles.title}>Flicksy Admin</h1>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button key={t} className={t === tab ? styles.tabActive : styles.tab} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <OverviewTab />}
        {tab === "Users" && <UsersTab />}
        {tab === "Reports" && <ReportsTab />}
        {tab === "Ads" && <AdsTab />}
      </div>
    </AppLayout>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<adminApi.DashboardStats | null>(null);

  useEffect(() => {
    adminApi.getDashboard().then(setStats);
  }, []);

  if (!stats) return <LoadingSpinner />;

  const items: [string, number][] = [
    ["Total Users", stats.total_users],
    ["Active Users", stats.active_users],
    ["Verified Spaces", stats.verified_spaces],
    ["Flicks", stats.flicks],
    ["Rushes", stats.rushes],
    ["Moments", stats.moments],
    ["Pending Reports", stats.pending_reports],
    ["Active Ads", stats.active_ads],
  ];

  return (
    <div className={styles.statGrid}>
      {items.map(([label, value]) => (
        <div key={label} className={styles.statCard}>
          <div className={styles.statValue}>{value}</div>
          <div className={styles.statLabel}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const load = () => {
    setIsLoading(true);
    adminApi.searchAdminUsers(query || undefined).then(setUsers).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (u: UserPublic) => {
    try {
      await adminApi.setVerification(u.id, !u.is_verified);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_verified: !u.is_verified } : x)));
    } catch {
      showToast("Couldn't update verification", "error");
    }
  };

  const handleSuspendToggle = async (u: UserPublic, active: boolean) => {
    try {
      if (active) await adminApi.restoreUser(u.id);
      else await adminApi.suspendUser(u.id);
      showToast(active ? "User restored" : "User suspended", "success");
    } catch {
      showToast("Couldn't update user", "error");
    }
  };

  return (
    <div>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          placeholder="Search by FlickTag, name, or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <Button variant="secondary" fullWidth={false} onClick={load}>
          Search
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className={styles.userList}>
          {users.map((u) => (
            <div key={u.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  @{u.username} {u.is_verified && <VerifiedBadge size={13} />}
                </span>
                <span className={styles.userSub}>{u.display_name}</span>
              </div>
              <div className={styles.userActions}>
                <button className={styles.smallBtn} onClick={() => handleVerify(u)}>
                  {u.is_verified ? "Unverify" : "Verify"}
                </button>
                <button className={styles.smallBtn} onClick={() => handleSuspendToggle(u, false)}>
                  Suspend
                </button>
                <button className={styles.smallBtn} onClick={() => handleSuspendToggle(u, true)}>
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<adminApi.ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    adminApi.listReports("pending").then(setReports).finally(() => setIsLoading(false));
  }, []);

  const handleAction = async (r: adminApi.ReportItem, action: "dismiss" | "actioned") => {
    try {
      await adminApi.actionReport(r.id, action);
      setReports((prev) => prev.filter((x) => x.id !== r.id));
      showToast(action === "actioned" ? "Report actioned" : "Report dismissed", "success");
    } catch {
      showToast("Couldn't update report", "error");
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (reports.length === 0) return <p className={styles.emptyText}>No pending reports.</p>;

  return (
    <div className={styles.userList}>
      {reports.map((r) => (
        <div key={r.id} className={styles.userRow}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {r.target_type} · {r.reason}
            </span>
            <span className={styles.userSub}>ID: {r.target_id}</span>
          </div>
          <div className={styles.userActions}>
            <button className={styles.smallBtn} onClick={() => handleAction(r, "actioned")}>
              Remove
            </button>
            <button className={styles.smallBtn} onClick={() => handleAction(r, "dismiss")}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdsTab() {
  const [ads, setAds] = useState<adminApi.Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const { showToast } = useToast();

  const load = () => {
    setIsLoading(true);
    adminApi.listAds().then(setAds).finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!title.trim() || !advertiser.trim()) {
      showToast("Title and advertiser are required", "error");
      return;
    }
    try {
      await adminApi.createAd({ title, advertiser, destination_url: destinationUrl });
      setTitle("");
      setAdvertiser("");
      setDestinationUrl("");
      setShowForm(false);
      load();
    } catch {
      showToast("Couldn't create ad", "error");
    }
  };

  const handleToggle = async (ad: adminApi.Ad) => {
    try {
      if (ad.status === "active") await adminApi.pauseAd(ad.id);
      else await adminApi.resumeAd(ad.id);
      load();
    } catch {
      showToast("Couldn't update ad", "error");
    }
  };

  const handleDelete = async (ad: adminApi.Ad) => {
    try {
      await adminApi.deleteAd(ad.id);
      setAds((prev) => prev.filter((a) => a.id !== ad.id));
    } catch {
      showToast("Couldn't delete ad", "error");
    }
  };

  return (
    <div>
      <Button variant="secondary" fullWidth={false} onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Create Ad"}
      </Button>

      {showForm && (
        <div className={styles.adForm}>
          <input className={styles.searchInput} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={styles.searchInput} placeholder="Advertiser" value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} />
          <input
            className={styles.searchInput}
            placeholder="Destination URL"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
          />
          <Button onClick={handleCreate}>Save Ad</Button>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className={styles.userList}>
          {ads.map((ad) => (
            <div key={ad.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{ad.title}</span>
                <span className={styles.userSub}>
                  {ad.advertiser} · {ad.status} · {ad.impressions} impressions · {ad.clicks} clicks · {ad.ctr}% CTR
                </span>
              </div>
              <div className={styles.userActions}>
                <button className={styles.smallBtn} onClick={() => handleToggle(ad)}>
                  {ad.status === "active" ? "Pause" : "Resume"}
                </button>
                <button className={styles.smallBtn} onClick={() => handleDelete(ad)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
