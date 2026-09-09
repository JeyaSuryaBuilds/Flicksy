"""
Email sending abstraction. Configure via environment variables (see .env.example):

  SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_USE_TLS

If SMTP_HOST is unset, emails are logged to the backend console instead of sent — this is a
development fallback, not a claim that the email was delivered. The API response for anything
that triggers an email never reveals whether real SMTP is configured, to avoid leaking that
detail to the frontend/client.
"""
import os
import smtplib
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@flicksy.dev")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"


def is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD)


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Returns True if the email was actually sent via SMTP, False if it only hit the dev
    console log. Callers should not tell the user "email sent" based on this return value —
    for security (not leaking account existence / SMTP config), API responses stay generic
    either way; this return value is only for internal/ops logging."""
    if not is_smtp_configured():
        print(f"[Flicksy dev email — SMTP not configured, not actually sent]\nTo: {to_email}\nSubject: {subject}\n\n{body}\n")
        return False

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM_EMAIL
        msg["To"] = to_email

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())
        return True
    except Exception as e:  # noqa: BLE001 — email delivery failure must never crash the request
        print(f"[Flicksy email] Failed to send to {to_email}: {e}")
        return False
