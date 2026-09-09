import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { BackIcon, EnvelopeIcon, LockIcon } from "../components/icons";
import { forgotPassword } from "../services/auth";
import { useToast } from "../components/Toast";
import styles from "./ForgotPassword.module.css";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      showToast("Reset code sent — check your email", "success");
      navigate("/reset-password", { state: { email } });
    } catch {
      showToast("Something went wrong, please try again", "error");
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

      <div className={styles.iconCircle}>
        <LockIcon size={32} />
      </div>

      <h1 className={styles.heading}>
        Forgot your
        <br />
        password?
      </h1>
      <p className={styles.desc}>
        No worries, it happens. Enter the email linked to your account and we'll send you a reset code.
      </p>

      <form onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <Input
            label="Email address"
            type="email"
            icon={<EnvelopeIcon />}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.submitBtn}>
          <Button type="submit" isLoading={isLoading}>
            Send Reset Code
          </Button>
        </div>
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
