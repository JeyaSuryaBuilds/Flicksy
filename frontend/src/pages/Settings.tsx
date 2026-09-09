import { useContext, useEffect, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { Toggle } from "../components/Toggle";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { Modal } from "../components/Modal";
import * as settingsApi from "../services/settings";
import * as authApi from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import { ThemeContext } from "../contexts/ThemeContext";
import { useToast } from "../components/Toast";
import type { UserSettings } from "../types";
import styles from "./Settings.module.css";

const SUPPORT_CONTENT: Record<string, { title: string; body: string }> = {
  help: { title: "Help Center", body: "For help using Flicksy, reach out to support@flicksy.dev. We typically respond within 1–2 business days." },
  guidelines: { title: "Community Guidelines", body: "Be respectful. No harassment, hate speech, or spam. Report content that violates these guidelines using the Report option on any Flick, Rush, or Moment." },
  privacy: { title: "Privacy Policy", body: "Flicksy stores the content you post and the account details you provide. Media is preserved in original quality and only shared according to your Privacy settings." },
  terms: { title: "Terms of Service", body: "By using Flicksy you agree to use the platform respectfully and lawfully. Accounts violating these terms may be suspended by an administrator." },
  about: { title: "About Flicksy", body: "Flicksy — an original social platform for Flicks, Rush, Moments, and Flash. Version 1.0.0." },
};

export function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { logout, user, refreshUser } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const { showToast } = useToast();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [supportModalKey, setSupportModalKey] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .getSettings()
      .then(setSettings)
      .catch(() => showToast("Couldn't load Settings", "error"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const patch = async (update: Partial<UserSettings>) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, ...update });
    try {
      const saved = await settingsApi.updateSettings(update);
      setSettings(saved);
    } catch {
      setSettings(previous); // roll back — never claim a setting saved when it didn't
      showToast("Couldn't save that change", "error");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters", "error");
      return;
    }
    setIsSavingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      showToast("Password updated", "success");
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Couldn't update password", "error");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await authApi.resendVerification();
      showToast("Verification code sent", "success");
      setResendCooldown(60);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Couldn't send verification code", "error");
    }
  };

  const handleVerifyEmail = async () => {
    setIsVerifying(true);
    try {
      await authApi.verifyEmail(verifyCode);
      await refreshUser();
      showToast("Email verified", "success");
      setIsVerifyModalOpen(false);
      setVerifyCode("");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Invalid or expired code", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await authApi.deactivateAccount();
      showToast("Account deactivated", "success");
      await logout();
    } catch {
      showToast("Couldn't deactivate account", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await authApi.deleteAccount();
      await logout();
    } catch {
      showToast("Couldn't delete account", "error");
    }
  };

  if (isLoading || !settings) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.wrap}>
        <h1 className={styles.title}>Settings</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.rowStatic}>
            <span>FlickTag</span>
            <span className={styles.value}>@{user?.username}</span>
          </div>
          <div className={styles.rowStatic}>
            <span>Email verification</span>
            <span className={user?.is_email_verified ? styles.valueOk : styles.valueWarn}>
              {user?.is_email_verified ? "Verified" : "Not verified"}
            </span>
          </div>
          {!user?.is_email_verified && (
            <button className={styles.linkRow} onClick={() => setIsVerifyModalOpen(true)}>
              Verify your email
            </button>
          )}
          <button className={styles.linkRow} onClick={() => setIsPasswordModalOpen(true)}>
            Change password
          </button>
          <button className={styles.linkRowDanger} onClick={() => setIsDeactivateOpen(true)}>
            Deactivate account
          </button>
          <button className={styles.linkRowDanger} onClick={() => setIsDeleteOpen(true)}>
            Delete account
          </button>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Privacy</h2>
          <Toggle
            label="Private Space"
            description="Only your Crew can see your Flicks, Rush, and Moments"
            checked={settings.is_private}
            onChange={(v) => patch({ is_private: v })}
          />
          <div className={styles.selectRow}>
            <span className={styles.selectLabel}>Who can message you</span>
            <select
              className={styles.select}
              value={settings.who_can_message}
              onChange={(e) => patch({ who_can_message: e.target.value })}
            >
              <option value="everyone">Everyone</option>
              <option value="crew">Crew only</option>
              <option value="none">No one</option>
            </select>
          </div>
          <Toggle
            label="Show activity status"
            checked={settings.show_activity_status}
            onChange={(v) => patch({ show_activity_status: v })}
          />
          <Toggle
            label="Read receipts in Chats"
            checked={settings.show_read_receipts}
            onChange={(v) => patch({ show_read_receipts: v })}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notifications</h2>
          <p className={styles.sectionDesc}>Turning any of these off stops that Alert from being generated at all.</p>
          <Toggle label="Loves" checked={settings.notify_loves} onChange={(v) => patch({ notify_loves: v })} />
          <Toggle label="Echoes" checked={settings.notify_talks} onChange={(v) => patch({ notify_talks: v })} />
          <Toggle label="New Crew" checked={settings.notify_new_crew} onChange={(v) => patch({ notify_new_crew: v })} />
          <Toggle label="Mentions" checked={settings.notify_mentions} onChange={(v) => patch({ notify_mentions: v })} />
          <Toggle label="Moments" checked={settings.notify_moments} onChange={(v) => patch({ notify_moments: v })} />
          <Toggle label="Chats" checked={settings.notify_chats} onChange={(v) => patch({ notify_chats: v })} />
          <Toggle
            label="Marketing"
            checked={settings.notify_marketing}
            onChange={(v) => patch({ notify_marketing: v })}
          />
          <Toggle label="Push notifications" checked={settings.push_enabled} onChange={(v) => patch({ push_enabled: v })} />
          <Toggle label="Email notifications" checked={settings.email_enabled} onChange={(v) => patch({ email_enabled: v })} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Flicksy AI</h2>
          <Toggle
            label="AI assistance"
            description="Turn off to hide Flicksy AI suggestions everywhere"
            checked={settings.ai_enabled}
            onChange={(v) => patch({ ai_enabled: v })}
          />
          <Toggle
            label="Caption assistance"
            checked={settings.ai_caption_assistance}
            onChange={(v) => patch({ ai_caption_assistance: v })}
          />
          <Toggle
            label="Personalization"
            description="Let Flicksy AI use your content and activity for better suggestions"
            checked={settings.ai_personalization}
            onChange={(v) => patch({ ai_personalization: v })}
          />
          <Toggle
            label="Share data with AI providers"
            checked={settings.ai_data_sharing}
            onChange={(v) => patch({ ai_data_sharing: v })}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Content & Media</h2>
          <Toggle label="Rush autoplay" checked={settings.rush_autoplay} onChange={(v) => patch({ rush_autoplay: v })} />
          <Toggle label="Data saver" checked={settings.data_saver} onChange={(v) => patch({ data_saver: v })} />
          <Toggle
            label="Wi-Fi only uploads"
            checked={settings.wifi_only_upload}
            onChange={(v) => patch({ wifi_only_upload: v })}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <p className={styles.sectionDesc}>
            Applies across the whole app and persists to your account — separate from Space Theme,
            which only affects your own Space page.
          </p>
          <div className={styles.themeRow}>
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                className={themeCtx?.theme === t ? styles.themeChipActive : styles.themeChip}
                onClick={() => themeCtx?.setTheme(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <Toggle
            label="Reduce motion"
            checked={themeCtx?.reduceMotion ?? false}
            onChange={(v) => themeCtx?.setReduceMotion(v)}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Support</h2>
          {Object.entries(SUPPORT_CONTENT).map(([key, { title }]) => (
            <button key={key} className={styles.linkRow} onClick={() => setSupportModalKey(key)}>
              {title}
            </button>
          ))}
          <div className={styles.rowStatic}>
            <span>App version</span>
            <span className={styles.value}>1.0.0</span>
          </div>
        </section>

        <div className={styles.logoutWrap}>
          <Button variant="secondary" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </div>

      {/* Change password */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Change password">
        <div className={styles.modalForm}>
          <PasswordInput label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <PasswordInput label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Button onClick={handleChangePassword} isLoading={isSavingPassword}>
            Update password
          </Button>
        </div>
      </Modal>

      {/* Email verification */}
      <Modal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} title="Verify your email">
        <div className={styles.modalForm}>
          <p className={styles.sectionDesc}>
            Enter the code sent to {user?.username ? `your inbox` : "your email"}, or request a new one.
          </p>
          <Input label="Verification code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="123456" />
          <Button onClick={handleVerifyEmail} isLoading={isVerifying}>
            Verify
          </Button>
          <button className={styles.linkRow} onClick={handleResendVerification} disabled={resendCooldown > 0}>
            {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>
      </Modal>

      {/* Deactivate */}
      <Modal isOpen={isDeactivateOpen} onClose={() => setIsDeactivateOpen(false)} title="Deactivate account">
        <div className={styles.modalForm}>
          <p className={styles.sectionDesc}>
            Your Space and Flicks will be hidden until you log back in. This can be undone by logging in again.
          </p>
          <Button variant="secondary" onClick={handleDeactivate}>
            Deactivate my account
          </Button>
        </div>
      </Modal>

      {/* Delete */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete account">
        <div className={styles.modalForm}>
          <p className={styles.sectionDesc}>
            This permanently deletes your account, Flicks, comments, and Moments. This cannot be undone.
            Type DELETE to confirm.
          </p>
          <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" />
          <Button variant="secondary" onClick={handleDelete} disabled={deleteConfirmText !== "DELETE"}>
            Permanently delete my account
          </Button>
        </div>
      </Modal>

      {/* Support content */}
      <Modal isOpen={!!supportModalKey} onClose={() => setSupportModalKey(null)} title={supportModalKey ? SUPPORT_CONTENT[supportModalKey].title : ""}>
        <p className={styles.sectionDesc}>{supportModalKey ? SUPPORT_CONTENT[supportModalKey].body : ""}</p>
      </Modal>
    </AppLayout>
  );
}
