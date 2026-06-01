import os
import shutil
from pathlib import Path
from uuid import uuid4
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
import models, schemas, auth
from database import engine, get_db
import time

BASE_DIR = Path(__file__).resolve().parent
if (BASE_DIR / "frontend").exists():
    FRONTEND_DIR = BASE_DIR / "frontend"
    UPLOAD_DIR = BASE_DIR / "uploads"
else:
    FRONTEND_DIR = BASE_DIR.parent / "frontend"
    UPLOAD_DIR = BASE_DIR.parent / "uploads"

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "avif"}
MAX_FILE_SIZE_MB = 15

app = FastAPI(title="Colección Visual API")


@app.on_event("startup")
def startup_event():
    retries = 10
    delay = 3
    for attempt in range(1, retries + 1):
        try:
            models.Base.metadata.create_all(bind=engine)
            # Migrate: add bio column if it doesn't exist yet
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN bio VARCHAR"))
                    conn.commit()
                except Exception:
                    pass
            break
        except OperationalError:
            if attempt == retries:
                raise
            time.sleep(delay)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not UPLOAD_DIR.exists():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open(FRONTEND_DIR / "index.html", "r", encoding="utf-8") as f:
        return f.read()


# --- Auth Endpoints ---

@app.post("/api/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if len(user.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="El nombre de usuario debe tener al menos 3 caracteres")
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    db_user = db.query(models.User).filter(
        (models.User.username == user.username.strip()) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El usuario o correo ya está registrado")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username.strip(),
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- User Endpoints ---
# NOTE: /users/me MUST be declared before /users/{username} to avoid route conflict

@app.get("/api/users/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.patch("/api/users/me", response_model=schemas.UserResponse)
def update_profile(
    update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if update.bio is not None:
        current_user.bio = update.bio.strip() or None
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/api/users/search", response_model=list[schemas.UserSearchResponse])
def search_users(q: str = None, limit: int = 20, db: Session = Depends(get_db)):
    if not q or not q.strip():
        return []
    search_term = f"%{q.strip()}%"
    users = db.query(models.User).filter(
        models.User.username.ilike(search_term)
    ).limit(limit).all()

    result = []
    for user in users:
        image_count = db.query(models.Image).filter(models.Image.user_id == user.id).count()
        result.append({
            "id": user.id,
            "username": user.username,
            "bio": user.bio,
            "image_count": image_count,
        })
    return result


@app.get("/api/users/{username}", response_model=schemas.UserGalleryResponse)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    images = db.query(models.Image).filter(
        models.Image.user_id == user.id
    ).order_by(models.Image.created_at.desc()).all()
    return {"user": user, "images": images}


# --- Image Endpoints ---

@app.post("/api/images/", response_model=schemas.ImageResponse)
async def upload_image(
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Formato no permitido. Usa: {', '.join(ALLOWED_EXTENSIONS)}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"La imagen no puede superar {MAX_FILE_SIZE_MB}MB")

    filename = f"{uuid4()}.{ext}"
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    new_image = models.Image(
        title=title.strip(),
        description=description.strip() if description else None,
        filename=filename,
        user_id=current_user.id
    )
    db.add(new_image)
    db.commit()
    db.refresh(new_image)
    return new_image


@app.get("/api/images/", response_model=list[schemas.ImageResponse])
def get_images(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    sort_by: str = "newest",
    db: Session = Depends(get_db)
):
    query = db.query(models.Image)
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (models.Image.title.ilike(search_term)) |
            (models.Image.description.ilike(search_term))
        )
    if sort_by == "oldest":
        query = query.order_by(models.Image.created_at.asc())
    else:
        query = query.order_by(models.Image.created_at.desc())
    return query.offset(skip).limit(min(limit, 200)).all()


@app.get("/api/images/user/{user_id}", response_model=list[schemas.ImageResponse])
def get_user_images(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Image).filter(
        models.Image.user_id == user_id
    ).order_by(models.Image.created_at.desc()).all()


@app.get("/api/images/{image_id}", response_model=schemas.ImageResponse)
def get_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return image


@app.get("/api/images/{image_id}/download")
def download_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    file_path = UPLOAD_DIR / image.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")
    return FileResponse(
        path=str(file_path),
        filename=f"{image.title}.{image.filename.rsplit('.', 1)[-1]}",
        media_type="application/octet-stream"
    )


@app.delete("/api/images/{image_id}")
def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    if image.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta imagen")
    file_path = UPLOAD_DIR / image.filename
    if file_path.exists():
        file_path.unlink()
    db.delete(image)
    db.commit()
    return {"message": "Imagen eliminada exitosamente"}


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    return {
        "total_images": db.query(models.Image).count(),
        "total_users": db.query(models.User).count(),
    }


@app.get("/uploads/{filename}")
def serve_image(filename: str):
    safe_name = os.path.basename(filename)
    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(str(file_path))
