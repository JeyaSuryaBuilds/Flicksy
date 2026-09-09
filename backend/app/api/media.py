from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, FlashMessage
from app.auth.dependencies import get_current_user
from app.services.media_service import save_upload, resolve_private_file_path, MEDIA_PUBLIC_BASE_URL

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    kind: str = Form(...),  # "image" | "video" — validated inside save_upload
    visibility: str = Form("public"),  # "public" | "private" — private is used for Flash
    current_user: User = Depends(get_current_user),
):
    """
    Real multipart upload used by New Flick, Rush, Moment, Avatar, and Flash upload flows.
    Returns a persisted URL — never a browser-local object URL — that can be saved
    directly onto a Post/Story/User/FlashMessage row.
    """
    result = await save_upload(file, kind, visibility)
    return result


@router.get("/private/{filename}")
def get_private_media(filename: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Authorized-only access to private media (Flash). Unlike /media/<file> (public, served
    directly via StaticFiles), this checks the requester is actually the sender or recipient
    of the FlashMessage referencing this file before streaming it.
    """
    file_url_suffix = f"{MEDIA_PUBLIC_BASE_URL}/private/{filename}"
    flash = db.query(FlashMessage).filter(FlashMessage.media_url == file_url_suffix).first()
    if not flash:
        raise HTTPException(status_code=404, detail="File not found")
    if current_user.id not in (flash.sender_id, flash.recipient_id):
        raise HTTPException(status_code=403, detail="You don't have access to this Flash")

    path = resolve_private_file_path(filename)
    return FileResponse(path)
