import os
import shutil
from pathlib import Path
from uuid import uuid4
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from fastapi.responses import FileResponse, HTMLResponse
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

app = FastAPI()

@app.on_event("startup")
def startup_event():
    retries = 10
    delay = 3
    for attempt in range(1, retries + 1):
        try:
            models.Base.metadata.create_all(bind=engine)
            break
        except OperationalError:
            if attempt == retries:
                raise
            time.sleep(delay)

# Allow CORS for development (if frontend served separately)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not UPLOAD_DIR.exists():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Mount static directories
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open(FRONTEND_DIR / "index.html", "r", encoding="utf-8") as f:
        return f.read()

# --- Auth Endpoints ---

@app.post("/api/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter((models.User.username == user.username) | (models.User.email == user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

from fastapi.security import OAuth2PasswordRequestForm

@app.post("/api/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Image Endpoints ---

@app.post("/api/images/", response_model=schemas.ImageResponse)
async def upload_image(
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Generate unique filename
    ext = file.filename.split('.')[-1]
    filename = f"{uuid4()}.{ext}"
    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    new_image = models.Image(
        title=title,
        description=description,
        filename=filename,
        user_id=current_user.id
    )
    db.add(new_image)
    db.commit()
    db.refresh(new_image)
    return new_image

@app.get("/api/images/", response_model=list[schemas.ImageResponse])
def get_images(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    images = db.query(models.Image).order_by(models.Image.created_at.desc()).offset(skip).limit(limit).all()
    return images

@app.get("/api/images/{image_id}/download")
def download_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    file_path = UPLOAD_DIR / image.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(path=str(file_path), filename=image.filename, media_type="application/octet-stream")

@app.get("/uploads/{filename}")
def serve_image(filename: str):
    safe_name = os.path.basename(filename)
    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))
