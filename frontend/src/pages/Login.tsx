import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { Button } from "../components/Button";
import { EnvelopeIcon } from "../components/icons";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import styles from "./AuthForm.module.css";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/home");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Incorrect email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@flickzy.dev");
    setPassword("password123");
    showToast("Demo credentials filled in", "info");
  };

  return (
    <AuthLayout>
      <div className={styles.topSpace} />
      <div className={styles.wordmark}>
        flick<span>zy</span>
      </div>

      <h1 className={styles.heading}>Welcome back</h1>
      <p className={styles.subheading}>Log in to keep up with your world.</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label="Email address"
          type="email"
          icon={<EnvelopeIcon />}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <PasswordInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && (
          <p role="alert" className={styles.formError}>
            {error}
          </p>
        )}

        <div className={styles.forgotRow}>
          <Link to="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={isLoading}>
          Log In
        </Button>

        <button type="button" className={styles.demoBtn} onClick={fillDemo}>
          Use demo account
        </button>
      </form>

      <div className={styles.bottomArea}>
        <span className={styles.switchText}>
          Don't have an account? <Link to="/signup"><b>Sign up</b></Link>
        </span>
      </div>
    </AuthLayout>
  );
}
