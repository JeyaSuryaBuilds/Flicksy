"""
Flickzy transactional email service using Brevo REST API.

Brevo sends:
- Email verification OTP
- Password reset OTP
- Password changed notification
"""

import json
import os
import urllib.error
import urllib.request


BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "").strip()
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Flickzy").strip()

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def is_brevo_configured() -> bool:
    return bool(
        BREVO_API_KEY
        and BREVO_SENDER_EMAIL
    )


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send a transactional email through Brevo.

    Returns:
        True  -> Brevo accepted the email
        False -> email was not sent

    Authentication, OTP generation, OTP storage and OTP verification
    remain completely inside Flickzy.
    """

    if not is_brevo_configured():
        print(
            "[Flickzy email] Brevo is not configured.\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Body: {body}\n",
            flush=True,
        )
        return False

    payload = {
        "sender": {
            "name": BREVO_SENDER_NAME,
            "email": BREVO_SENDER_EMAIL,
        },
        "to": [
            {
                "email": to_email,
            }
        ],
        "subject": subject,
        "textContent": body,
    }

    request = urllib.request.Request(
        BREVO_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response_body = response.read().decode("utf-8")

        print(
            f"[Flickzy email] Brevo accepted email to {to_email}: "
            f"{response_body}",
            flush=True,
        )

        return True

    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")

        print(
            f"[Flickzy email] Brevo HTTP {error.code}: "
            f"{error_body}",
            flush=True,
        )

        return False

    except Exception as error:
        print(
            f"[Flickzy email] Failed to send to {to_email}: {error}",
            flush=True,
        )

        return False