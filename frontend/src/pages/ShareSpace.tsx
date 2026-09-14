import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { QrScanner } from "../components/QrScanner";
import { BackIcon } from "../components/icons";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import styles from "./ShareSpace.module.css";

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3m12-4v3a1 1 0 0 1-1 1h-3M4 12h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M10 13.5 14 10m-7.2 7.2 1.4 1.4a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0 0-5.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m14 10.5-4 3.5m7.2-7.2-1.4-1.4a4 4 0 0 0-5.7 0L7.3 8.2a4 4 0 0 0 0 5.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Real, publicly-reachable QR image generator — this is a real QR code encoding
 *  the user's actual Space URL, not a static/fake placeholder. Rendered via <img>
 *  rather than a bundled QR library so this ships with zero new dependencies. */
function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(data)}`;
}

export function ShareSpace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  if (!user) return null;

  const spaceUrl = `${window.location.origin}/users/${user.id}`;
  const qrUrl = qrImageUrl(spaceUrl);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(spaceUrl);
      showToast("Space link copied", "success");
    } catch {
      showToast("Couldn't copy the link", "error");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${user.display_name} on flickzy`, url: spaceUrl });
      } catch {
        // User cancelled the native share sheet.
      }
      return;
    }
    await handleCopyLink();
  };

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `flickzy-space-${user.username}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      showToast("QR code saved", "success");
    } catch {
      showToast("Couldn't save the QR code", "error");
    }
  };

  const handleScan = (rawValue: string) => {
    setIsScannerOpen(false);

    // Expect a Flickzy Space URL like https://<host>/users/<id>. Extract the
    // user id from the path rather than assuming the origin matches (a QR
    // generated on a different deploy/host should still resolve correctly).
    const match = rawValue.match(/\/users\/([^/?#]+)/);
    if (!match) {
      showToast("That's not a Flickzy Space QR code", "error");
      return;
    }

    navigate(`/users/${match[1]}`);
  };

  return (
    <AppLayout hideBottomBar>
      <div className={styles.wrap}>
        <div className={styles.headerRow}>
          <button type="button" className={styles.iconBtn} onClick={() => navigate(-1)} aria-label="Back">
            <BackIcon size={20} />
          </button>
          <h1 className={styles.title}>Share Space</h1>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setIsScannerOpen(true)}
            aria-label="Scan a Space QR code"
          >
            <ScanIcon />
          </button>
        </div>

        <div className={styles.profileBlock}>
          <Avatar url={user.avatar_url} initials={user.avatar_initials} size={64} />
          <div className={styles.identity}>
            <span className={styles.username}>
              {user.username}
              {user.is_verified && <VerifiedBadge size={13} />}
            </span>
            <span className={styles.displayName}>{user.display_name}</span>
          </div>
        </div>

        <div className={styles.qrCard}>
          <img src={qrUrl} alt={`QR code for ${user.username}'s flickzy Space`} className={styles.qrImage} />
          <span className={styles.qrCaption}>Scan to visit @{user.username}'s Space</span>
        </div>

        <div className={styles.actionRow}>
          <button type="button" className={styles.action} onClick={handleShare}>
            <span className={styles.actionIcon}>
              <ShareIcon />
            </span>
            <span>Share</span>
          </button>
          <button type="button" className={styles.action} onClick={handleCopyLink}>
            <span className={styles.actionIcon}>
              <LinkIcon />
            </span>
            <span>Copy Link</span>
          </button>
          <button type="button" className={styles.action} onClick={handleDownloadQr}>
            <span className={styles.actionIcon}>
              <DownloadIcon />
            </span>
            <span>Download QR</span>
          </button>
        </div>
      </div>

      {isScannerOpen && <QrScanner onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
    </AppLayout>
  );
}