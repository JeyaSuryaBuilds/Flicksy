import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { Button } from "../components/Button";
import { EnvelopeIcon, UserIcon } from "../components/icons";
import { useAuth } from "../hooks/useAuth";
import styles from "./AuthForm.module.css";

export function SignUp() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const next: Record<string, string> = {};
    if (displayName.trim().length < 1) next.displayName = "Enter your name";
    if (username.trim().length < 3) next.username = "At least 3 characters";
    if (password.length < 8) next.password = "At least 8 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register({ email, username: username.trim(), display_name: displayName.trim(), password });
      navigate("/home");
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Something went wrong, please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className={styles.topSpace} />
      <div className={styles.wordmark}>
        flick<span>zy</span>
      </div>

      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.subheading}>Join flickzy and start sharing your world.</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label="Full name"
          icon={<UserIcon />}
          placeholder="Surya B"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={errors.displayName}
          required
        />
        <Input
          label="Username"
          icon={<UserIcon />}
          placeholder="surya.codes"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          required
        />
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
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
          autoComplete="new-password"
        />

        {formError && (
          <p role="alert" className={styles.formError}>
            {formError}
          </p>
        )}

        <Button type="submit" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      <div className={styles.bottomArea}>
        <span className={styles.switchText}>
          Already have an account? <Link to="/login"><b>Log in</b></Link>
        </span>
      </div>
    </AuthLayout>
  );
}
