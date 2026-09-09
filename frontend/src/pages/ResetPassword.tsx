import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { Button } from "../components/Button";
import { BackIcon } from "../components/icons";
import { resetPassword } from "../services/auth";
import { useToast } from "../components/Toast";
import styles from "./ForgotPassword.module.css";
import formStyles from "./AuthForm.module.css";

export function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const initialEmail = (location.state as { email?: string } | null)?.email || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await resetPassword(email, code, newPassword);
      showToast("Password updated — please log in", "success");
      navigate("/login");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid or expired code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
          <BackIcon />
        </button>
        <div className={styles.wordmark}>
          flick<span>sy</span>
        </div>
        <div className={styles.spacer} />
      </div>

      <h1 className={styles.heading} style={{ marginTop: 40 }}>
        Enter reset code
      </h1>
      <p className={styles.desc}>Check your email for the 6-digit code we sent, then choose a new password.</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Reset code"
          inputMode="numeric"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <PasswordInput
          label="New password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className={formStyles.formError}>
            {error}
          </p>
        )}

        <Button type="submit" isLoading={isLoading}>
          Reset Password
        </Button>
      </form>

      <div className={styles.bottomArea}>
        <div className={styles.backLogin}>
          Remember your password?{" "}
          <Link to="/login">
            <b>Log in</b>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
