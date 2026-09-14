import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { Button } from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import * as adminApi from "../services/admin";
import * as founderApi from "../services/founder";
import type { UserPublic } from "../types";
import styles from "./Admin.module.css";

const TABS = ["Overview", "Users", "Reports", "Ads", "Founder"] as const;

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
        <h1 className={styles.title}>flickzy Admin</h1>
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
        {tab === "Founder" && <FounderTab />}
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

// ============================================================
// Founder Knowledge management — feeds Flickzy AI's founder
// question-answering (see backend app/services/founder_service.py).
// Only fields marked "Public" here are ever visible to Flickzy AI
// or to any user; everything else stays admin-only.
// ============================================================

const FOUNDER_SECTIONS = ["Profile", "Projects", "Skills", "Links", "Achievements"] as const;

function FounderTab() {
  const [section, setSection] = useState<(typeof FOUNDER_SECTIONS)[number]>("Profile");

  return (
    <div>
      <div className={styles.tabs}>
        {FOUNDER_SECTIONS.map((s) => (
          <button key={s} className={s === section ? styles.tabActive : styles.tab} onClick={() => setSection(s)}>
            {s}
          </button>
        ))}
      </div>

      {section === "Profile" && <FounderProfileSection />}
      {section === "Projects" && <FounderProjectsSection />}
      {section === "Skills" && <FounderSkillsSection />}
      {section === "Links" && <FounderLinksSection />}
      {section === "Achievements" && <FounderAchievementsSection />}
    </div>
  );
}

const FOUNDER_PROFILE_FIELD_GROUPS: { label: string; fields: [keyof founderApi.FounderProfile, string, boolean?][] }[] = [
  {
    label: "Basic Information",
    fields: [
      ["full_name", "Full name"],
      ["public_name", "Public / preferred name"],
      ["role", "Role"],
      ["professional_title", "Professional title"],
      ["short_bio", "Short bio", true],
      ["detailed_bio", "Detailed bio", true],
      ["description", "Description", true],
    ],
  },
  {
    label: "Professional Information",
    fields: [
      ["professional_background", "Professional background", true],
      ["education", "Education", true],
      ["professional_strengths", "Professional strengths", true],
      ["areas_of_expertise", "Areas of expertise", true],
    ],
  },
  {
    label: "Flickzy Information",
    fields: [
      ["role_in_flickzy", "Founder's role in Flickzy", true],
      ["why_flickzy_created", "Why Flickzy was created", true],
      ["flickzy_origin_story", "Flickzy origin story", true],
      ["flickzy_mission", "Flickzy mission", true],
      ["flickzy_vision", "Flickzy vision", true],
      ["flickzy_goals", "Flickzy goals", true],
      ["founder_responsibilities", "Founder responsibilities", true],
      ["flickzy_technologies", "Technologies used to build Flickzy", true],
      ["development_status", "Current development status", true],
      ["future_plans", "Future plans", true],
    ],
  },
  {
    label: "Additional Facts",
    fields: [
      ["interests", "Interests", true],
      ["development_focus", "Development focus", true],
      ["career_goals", "Career goals", true],
    ],
  },
];

function FounderProfileSection() {
  const [profile, setProfile] = useState<founderApi.FounderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    founderApi.getAdminFounderProfile().then(setProfile).finally(() => setIsLoading(false));
  }, []);

  const handleFieldChange = (field: keyof founderApi.FounderProfile, value: string) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = await founderApi.updateAdminFounderProfile({ ...profile });
      setProfile(updated);
      showToast("Founder profile saved", "success");
    } catch {
      showToast("Couldn't save founder profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) return <LoadingSpinner />;

  return (
    <div className={styles.adForm}>
      <label className={styles.founderPublicToggle}>
        <input
          type="checkbox"
          checked={profile.is_public}
          onChange={(e) => setProfile({ ...profile, is_public: e.target.checked })}
        />
        <span>Public (visible to Flickzy AI and users)</span>
      </label>

      {FOUNDER_PROFILE_FIELD_GROUPS.map((group) => (
        <div key={group.label} className={styles.founderFieldGroup}>
          <div className={styles.founderGroupLabel}>{group.label}</div>
          {group.fields.map(([field, label, multiline]) =>
            multiline ? (
              <textarea
                key={field}
                className={styles.founderTextarea}
                placeholder={label}
                value={(profile[field] as string) || ""}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                rows={2}
              />
            ) : (
              <input
                key={field}
                className={styles.searchInput}
                placeholder={label}
                value={(profile[field] as string) || ""}
                onChange={(e) => handleFieldChange(field, e.target.value)}
              />
            )
          )}
        </div>
      ))}

      <Button onClick={handleSave} isLoading={isSaving}>
        Save Founder Profile
      </Button>
    </div>
  );
}

function FounderProjectsSection() {
  const [projects, setProjects] = useState<founderApi.FounderProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [technologies, setTechnologies] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const { showToast } = useToast();

  const load = () => {
    setIsLoading(true);
    founderApi.listAdminFounderProjects().then(setProjects).finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast("Project name is required", "error");
      return;
    }
    try {
      await founderApi.createAdminFounderProject({
        name,
        short_description: shortDescription,
        technologies,
        github_url: githubUrl,
        live_url: liveUrl,
      });
      setName("");
      setShortDescription("");
      setTechnologies("");
      setGithubUrl("");
      setLiveUrl("");
      setShowForm(false);
      load();
    } catch {
      showToast("Couldn't create project", "error");
    }
  };

  const handleTogglePublic = async (project: founderApi.FounderProject) => {
    try {
      await founderApi.updateAdminFounderProject(project.id, { is_public: !project.is_public });
      load();
    } catch {
      showToast("Couldn't update project", "error");
    }
  };

  const handleDelete = async (project: founderApi.FounderProject) => {
    try {
      await founderApi.deleteAdminFounderProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch {
      showToast("Couldn't delete project", "error");
    }
  };

  return (
    <div>
      <Button variant="secondary" fullWidth={false} onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add Project"}
      </Button>

      {showForm && (
        <div className={styles.adForm}>
          <input className={styles.searchInput} placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            className={styles.searchInput}
            placeholder="Short description"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
          <input
            className={styles.searchInput}
            placeholder="Technologies (comma separated)"
            value={technologies}
            onChange={(e) => setTechnologies(e.target.value)}
          />
          <input className={styles.searchInput} placeholder="GitHub URL" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
          <input className={styles.searchInput} placeholder="Live/Demo URL" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} />
          <Button onClick={handleCreate}>Save Project</Button>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : projects.length === 0 ? (
        <p className={styles.emptyText}>No projects recorded yet.</p>
      ) : (
        <div className={styles.userList}>
          {projects.map((p) => (
            <div key={p.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{p.name}</span>
                <span className={styles.userSub}>
                  {p.short_description || "No description"} {p.technologies && `· ${p.technologies}`} ·{" "}
                  {p.is_public ? "Public" : "Private"}
                </span>
              </div>
              <div className={styles.userActions}>
                <button className={styles.smallBtn} onClick={() => handleTogglePublic(p)}>
                  {p.is_public ? "Make Private" : "Make Public"}
                </button>
                <button className={styles.smallBtn} onClick={() => handleDelete(p)}>
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

function FounderSkillsSection() {
  const [skills, setSkills] = useState<founderApi.FounderSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [proficiency, setProficiency] = useState("");
  const { showToast } = useToast();

  const load = () => {
    setIsLoading(true);
    founderApi.listAdminFounderSkills().then(setSkills).finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast("Skill name is required", "error");
      return;
    }
    try {
      await founderApi.createAdminFounderSkill({
        name,
        category,
        proficiency: proficiency || undefined,
      });
      setName("");
      setCategory("");
      setProficiency("");
      setShowForm(false);
      load();
    } catch {
      showToast("Couldn't create skill", "error");
    }
  };

  const handleTogglePublic = async (skill: founderApi.FounderSkill) => {
    try {
      await founderApi.updateAdminFounderSkill(skill.id, { is_public: !skill.is_public });
      load();
    } catch {
      showToast("Couldn't update skill", "error");
    }
  };

  const handleDelete = async (skill: founderApi.FounderSkill) => {
    try {
      await founderApi.deleteAdminFounderSkill(skill.id);
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
    } catch {
      showToast("Couldn't delete skill", "error");
    }
  };

  return (
    <div>
      <Button variant="secondary" fullWidth={false} onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add Skill"}
      </Button>

      {showForm && (
        <div className={styles.adForm}>
          <input className={styles.searchInput} placeholder="Skill name (e.g. React)" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            className={styles.searchInput}
            placeholder="Category (e.g. Frontend, Backend, Database)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            className={styles.searchInput}
            placeholder="Proficiency (leave blank if unknown)"
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value)}
          />
          <Button onClick={handleCreate}>Save Skill</Button>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : skills.length === 0 ? (
        <p className={styles.emptyText}>No skills recorded yet.</p>
      ) : (
        <div className={styles.userList}>
          {skills.map((s) => (
            <div key={s.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {s.name} {s.proficiency && `(${s.proficiency})`}
                </span>
                <span className={styles.userSub}>
                  {s.category || "Uncategorized"} · {s.is_public ? "Public" : "Private"}
                </span>
              </div>
              <div className={styles.userActions}>
                <button className={styles.smallBtn} onClick={() => handleTogglePublic(s)}>
                  {s.is_public ? "Make Private" : "Make Public"}
                </button>
                <button className={styles.smallBtn} onClick={() => handleDelete(s)}>
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

function FounderLinksSection() {
  const [links, setLinks] = useState<founderApi.FounderLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [linkType, setLinkType] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const { showToast } = useToast();

  const load = () => {
    setIsLoading(true);
    founderApi.listAdminFounderLinks().then(setLinks).finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!linkType.trim() || !url.trim()) {
      showToast("Link type and URL are required", "error");
      return;
    }
    try {
      await founderApi.createAdminFounderLink({ link_type: linkType, title, url });
      setLinkType("");
      setTitle("");
      setUrl("");
      setShowForm(false);
      load();
    } catch {
      showToast("Couldn't create link", "error");
    }
  };

  const handleTogglePublic = async (link: founderApi.FounderLink) => {
    try {
      await founderApi.updateAdminFounderLink(link.id, { is_public: !link.is_public });
      load();
    } catch {
      showToast("Couldn't update link", "error");
    }
  };

  const handleDelete = async (link: founderApi.FounderLink) => {
    try {
      await founderApi.deleteAdminFounderLink(link.id);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch {
      showToast("Couldn't delete link", "error");
    }
  };

  return (
    <div>
      <Button variant="secondary" fullWidth={false} onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add Link"}
      </Button>

      {showForm && (
        <div className={styles.adForm}>
          <input
            className={styles.searchInput}
            placeholder="Type (github, portfolio, linkedin, freelance, website, demo, other)"
            value={linkType}
            onChange={(e) => setLinkType(e.target.value)}
          />
          <input className={styles.searchInput} placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={styles.searchInput} placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button onClick={handleCreate}>Save Link</Button>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : links.length === 0 ? (
        <p className={styles.emptyText}>No links recorded yet.</p>
      ) : (
        <div className={styles.userList}>
          {links.map((l) => (
            <div key={l.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{l.title || l.link_type}</span>
                <span className={styles.userSub}>
                  {l.link_type} · {l.url} · {l.is_public ? "Public" : "Private"}
                </span>
              </div>
              <div className={styles.userActions}>
                <button className={styles.smallBtn} onClick={() => handleTogglePublic(l)}>
                  {l.is_public ? "Make Private" : "Make Public"}
                </button>
                <button className={styles.smallBtn} onClick={() => handleDelete(l)}>
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

function FounderAchievementsSection() {
  const [achievements, setAchievements] = useState<founderApi.FounderAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dateAchieved, setDateAchieved] = useState("");
  const { showToast } = useToast();

  const load = () => {
    setIsLoading(true);
    founderApi.listAdminFounderAchievements().then(setAchievements).finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      showToast("Achievement title is required", "error");
      return;
    }
    try {
      await founderApi.createAdminFounderAchievement({ title, category, date_achieved: dateAchieved });
      setTitle("");
      setCategory("");
      setDateAchieved("");
      setShowForm(false);
      load();
    } catch {
      showToast("Couldn't create achievement", "error");
    }
  };

  const handleTogglePublic = async (achievement: founderApi.FounderAchievement) => {
    try {
      await founderApi.updateAdminFounderAchievement(achievement.id, { is_public: !achievement.is_public });
      load();
    } catch {
      showToast("Couldn't update achievement", "error");
    }
  };

  const handleDelete = async (achievement: founderApi.FounderAchievement) => {
    try {
      await founderApi.deleteAdminFounderAchievement(achievement.id);
      setAchievements((prev) => prev.filter((a) => a.id !== achievement.id));
    } catch {
      showToast("Couldn't delete achievement", "error");
    }
  };

  return (
    <div>
      <Button variant="secondary" fullWidth={false} onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add Achievement"}
      </Button>

      {showForm && (
        <div className={styles.adForm}>
          <input className={styles.searchInput} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input
            className={styles.searchInput}
            placeholder="Category (certification, award, accomplishment, milestone)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            className={styles.searchInput}
            placeholder="Date (optional, e.g. 2024)"
            value={dateAchieved}
            onChange={(e) => setDateAchieved(e.target.value)}
          />
          <Button onClick={handleCreate}>Save Achievement</Button>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : achievements.length === 0 ? (
        <p className={styles.emptyText}>No achievements recorded yet.</p>
      ) : (
        <div className={styles.userList}>
          {achievements.map((a) => (
            <div key={a.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{a.title}</span>
                <span className={styles.userSub}>
                  {a.category || "Uncategorized"} {a.date_achieved && `· ${a.date_achieved}`} ·{" "}
                  {a.is_public ? "Public" : "Private"}
                </span>
              </div>
              <div className={styles.userActions}>
                <button className={styles.smallBtn} onClick={() => handleTogglePublic(a)}>
                  {a.is_public ? "Make Private" : "Make Public"}
                </button>
                <button className={styles.smallBtn} onClick={() => handleDelete(a)}>
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