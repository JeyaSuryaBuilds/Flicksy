import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, PasswordResetToken, EmailVerificationToken, normalize_flicktag
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, ForgotPasswordRequest,
    ResetPasswordRequest, UserPublic,
)
from app.auth.security import hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user
from app.utils.serializers import serialize_user, user_initials
from app.services.email_service import send_email

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFICATION_CODE_TTL_MINUTES = 30
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60


def _create_and_send_verification_email(db: Session, user: User):
    code = f"{random.randint(0, 999999):06d}"
    # TEMPORARY: print OTP to Render logs for testing.
    print(f"[Flickzy OTP] {user.email} -> {code}", flush=True)
    db.add(EmailVerificationToken(
        user_id=user.id, code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES),
    ))
    send_email(
        user.email,
        "Verify your Flicksy account",
        f"Your Flicksy verification code is {code}. It expires in {VERIFICATION_CODE_TTL_MINUTES} minutes.",
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    flicktag = normalize_flicktag(payload.username)

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    if db.query(User).filter(User.username == flicktag).first():
        raise HTTPException(status_code=409, detail=f"@{flicktag} is already taken — try another FlickTag")

    user = User(
        email=payload.email,
        username=flicktag,
        display_name=payload.display_name,
        hashed_password=hash_password(payload.password),
        avatar_initials=user_initials(payload.display_name),
        is_email_verified=False,
    )
    db.add(user)
    db.flush()
    _create_and_send_verification_email(db, user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=serialize_user(db, user, user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated")

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=serialize_user(db, user, user))


@router.post("/logout")
def logout():
    # JWTs are stateless; logout is handled client-side by discarding the token.
    # A production build would maintain a token blocklist keyed by jti for immediate revocation.
    return {"detail": "Logged out"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return 200 regardless of whether the email exists, to avoid leaking account existence.
    if user:
        code = f"{random.randint(0, 999999):06d}"
        db.add(PasswordResetToken(user_id=user.id, code=code, expires_at=datetime.utcnow() + timedelta(minutes=15)))
        db.commit()
        send_email(user.email, "Reset your Flicksy password", f"Your Flicksy password reset code is {code}. It expires in 15 minutes.")

    return {"detail": "If that email exists, a reset code has been sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid code or email")

    reset = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.code == payload.code,
            PasswordResetToken.used == False,  # noqa: E712
        )
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )
    if not reset or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user.hashed_password = hash_password(payload.new_password)
    reset.used = True
    db.commit()
    return {"detail": "Password updated successfully"}


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_user(db, current_user, current_user)


# ---------- Email verification ----------
class VerifyEmailRequest(BaseModel):
    code: str


@router.post("/resend-verification")
def resend_verification(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.is_email_verified:
        return {"detail": "Your email is already verified"}

    recent = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.user_id == current_user.id)
        .order_by(EmailVerificationToken.created_at.desc())
        .first()
    )
    if recent and (datetime.utcnow() - recent.created_at).total_seconds() < VERIFICATION_RESEND_COOLDOWN_SECONDS:
        wait = VERIFICATION_RESEND_COOLDOWN_SECONDS - int((datetime.utcnow() - recent.created_at).total_seconds())
        raise HTTPException(status_code=429, detail=f"Please wait {wait}s before requesting another code")

    _create_and_send_verification_email(db, current_user)
    db.commit()
    return {"detail": "Verification code sent"}


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.is_email_verified:
        return {"detail": "Your email is already verified"}

    token = (
        db.query(EmailVerificationToken)
        .filter(
            EmailVerificationToken.user_id == current_user.id,
            EmailVerificationToken.code == payload.code,
            EmailVerificationToken.used == False,  # noqa: E712
        )
        .order_by(EmailVerificationToken.created_at.desc())
        .first()
    )
    if not token or token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    token.used = True
    current_user.is_email_verified = True
    db.commit()
    return {"detail": "Email verified"}


# ---------- Account security ----------
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.put("/change-password")
def change_password(
    payload: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    send_email(current_user.email, "Your Flicksy password was changed", "If this wasn't you, reset your password immediately and contact support.")
    return {"detail": "Password updated"}


@router.put("/deactivate")
def deactivate_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.is_active = False
    db.commit()
    return {"detail": "Account deactivated"}


@router.delete("/me")
def delete_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Permanently deletes the account and cascades to owned Flicks/comments/Moments
    via the existing SQLAlchemy relationship cascades."""
    db.delete(current_user)
    db.commit()
    return {"detail": "Account deleted"}
