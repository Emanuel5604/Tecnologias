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
    # Validate file
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    
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
def get_images(
    skip: int = 0, 
    limit: int = 100,
    search: str = None,
    sort_by: str = "newest",
    db: Session = Depends(get_db)
):
    query = db.query(models.Image)
    
    # Filter by search query
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (models.Image.title.ilike(search_term)) |
            (models.Image.description.ilike(search_term))
        )
    
    # Sort
    if sort_by == "oldest":
        query = query.order_by(models.Image.created_at.asc())
    else:  # newest (default)
        query = query.order_by(models.Image.created_at.desc())
    
    images = query.offset(skip).limit(limit).all()
    return images

@app.get("/api/images/user/{user_id}", response_model=list[schemas.ImageResponse])
def get_user_images(
    user_id: int,
    db: Session = Depends(get_db)
):
    images = db.query(models.Image).filter(
        models.Image.user_id == user_id
    ).order_by(models.Image.created_at.desc()).all()
    
    if not images:
        raise HTTPException(status_code=404, detail="No images found for this user")
    
    return images

@app.get("/api/images/{image_id}", response_model=schemas.ImageResponse)
def get_image(
    image_id: int,
    db: Session = Depends(get_db)
):
    image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return image

@app.get("/api/images/{image_id}/download")
def download_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    file_path = UPLOAD_DIR / image.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")
        
    return FileResponse(path=str(file_path), filename=image.filename, media_type="application/octet-stream")

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
    total_images = db.query(models.Image).count()
    total_users = db.query(models.User).count()
    
    return {
        "total_images": total_images,
        "total_users": total_users
    }

@app.get("/uploads/{filename}")
def serve_image(filename: str):
    safe_name = os.path.basename(filename)
    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(str(file_path))
