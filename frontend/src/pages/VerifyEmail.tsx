import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { Button } from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import * as authApi from "../services/auth";
import { useToast } from "../components/Toast";
import authFormStyles from "./AuthForm.module.css";
import styles from "./VerifyEmail.module.css";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmail() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Passed by SignUp right after registration so we can show which address
  // the code was sent to. Falls back to generic copy for the case where an
  // already-registered-but-unverified user is redirected here from login —
  // we deliberately never add `email` to the shared UserPublic type just to
  // support this one line of copy, since that type is also used to describe
  // OTHER users and would leak everyone's email address.
  const emailHint = (location.state as { email?: string } | null)?.email;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState<"idle" | "verifying" | "success">("idle");
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // If the user is already verified (e.g. they navigated back here manually),
  // there's nothing to do — send them on.
  useEffect(() => {
    if (user?.is_email_verified) {
      navigate("/home", { replace: true });
    }
  }, [user?.is_email_verified, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const setDigit = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const value = rawValue.replace(/\D/g, "");
    if (!value) {
      setDigit(index, "");
      return;
    }
    // Handles a fast typist/autofill dropping more than one character at once.
    const chars = value.split("");
    const next = [...digits];
    chars.forEach((char, offset) => {
      if (index + offset < CODE_LENGTH) next[index + offset] = char;
    });
    setDigits(next);
    const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const code = digits.join("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code`);
      return;
    }

    setStatus("verifying");
    try {
      await authApi.verifyEmail(code);
      await refreshUser();
      setStatus("success");
      showToast("Email verified", "success");
      setTimeout(() => navigate("/home", { replace: true }), 900);
    } catch (err: any) {
      setStatus("idle");
      const detail = err?.response?.data?.detail || "Invalid or expired code";
      setError(detail);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError("");
    try {
      await authApi.resendVerification();
      showToast("Verification code sent", "success");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      // Backend enforces the real cooldown/rate-limit — if it says wait, respect it.
      const detail = err?.response?.data?.detail || "Couldn't send verification code";
      setError(detail);
      if (err?.response?.status === 429) {
        const match = /(\d+)s/.exec(detail);
        if (match) setResendCooldown(parseInt(match[1], 10));
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleWrongAccount = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <AuthLayout>
      <div className={authFormStyles.topSpace} />
      <div className={authFormStyles.wordmark}>
        flick<span>zy</span>
      </div>

      {status === "success" ? (
        <div className={styles.successWrap}>
          <div className={styles.successBadge}>✓</div>
          <h1 className={authFormStyles.heading}>Email verified</h1>
          <p className={[authFormStyles.subheading, styles.successSubheading].join(" ")}>Taking you into flickzy…</p>
        </div>
      ) : (
        <>
          <h1 className={authFormStyles.heading}>Verify your email</h1>
          <p className={authFormStyles.subheading}>
            {emailHint
              ? <>We sent a {CODE_LENGTH}-digit code to <b>{emailHint}</b>. Enter it below to continue.</>
              : <>Enter the {CODE_LENGTH}-digit code we sent to your registered email to continue.</>}
          </p>

          <form className={authFormStyles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.codeRow} onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  className={[styles.codeBox, error ? styles.codeBoxError : ""].join(" ")}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={CODE_LENGTH}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  aria-label={`Digit ${i + 1} of verification code`}
                />
              ))}
            </div>

            {error && (
              <p role="alert" className={authFormStyles.formError}>
                {error}
              </p>
            )}

            <Button type="submit" isLoading={status === "verifying"}>
              Verify Email
            </Button>

            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
            >
              {isResending
                ? "Sending…"
                : resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Resend code"}
            </button>
          </form>

          <div className={authFormStyles.bottomArea}>
            <span className={authFormStyles.switchText}>
              Wrong account?{" "}
              <button type="button" className={styles.inlineLinkBtn} onClick={handleWrongAccount}>
                <b>Log in again</b>
              </button>
            </span>
          </div>
        </>
      )}
    </AuthLayout>
  );
}