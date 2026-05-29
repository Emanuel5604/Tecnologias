# 🎨 Colección Visual

Una plataforma moderna para descubrir y compartir imágenes inspiradoras. Diseñada con una interfaz elegante y funcionalidades intuitivas.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/python-3.9+-green)
![FastAPI](https://img.shields.io/badge/fastapi-0.100+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Características

### 📱 Frontend Moderno
- **Diseño Responsivo**: Funciona perfectamente en desktop, tablet y móvil
- **Tema Oscuro Elegante**: Interfaz visual moderna y cómoda para los ojos
- **Búsqueda en Tiempo Real**: Filtra imágenes por título y descripción
- **Navegación Intuitiva**: Barra de navegación sticky con acceso rápido
- **Animaciones Fluidas**: Transiciones suaves y efectos hover profesionales

### 🔐 Autenticación Segura
- Registro e ingreso de usuarios
- Tokens JWT para sesiones seguras
- Validación de contraseñas robusta
- Gestión de sesiones en el cliente

### 📸 Gestión de Imágenes
- Subir imágenes con título y descripción
- Galería de masonry responsive
- Descargar imágenes
- Visualización ordenada por fecha (más recientes primero)
- Interfaz de búsqueda avanzada

### 📊 Funcionalidades Adicionales
- Estadísticas del sitio
- Imágenes organizadas por usuario
- Interfaz de usuario amigable en español
- Validación de tipos de archivo
- Mensajes de error y éxito claros

## 🚀 Inicio Rápido

### Requisitos
- Docker y Docker Compose
- Python 3.9+ (para desarrollo local)
- Node.js (opcional, para frontend)

### Instalación con Docker

1. **Clonar o descargar el proyecto**
```bash
cd Tecnologias
```

2. **Ejecutar con Docker Compose**
```bash
docker-compose up --build
```

3. **Acceder a la aplicación**
```
http://localhost:8000
```

### Instalación Local (sin Docker)

#### Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

#### Frontend
El frontend se sirve automáticamente desde FastAPI en `http://localhost:8000`

## 📋 Estructura del Proyecto

```
Tecnologias/
├── backend/
│   ├── main.py              # Aplicación FastAPI
│   ├── models.py            # Modelos de base de datos
│   ├── schemas.py           # Esquemas de validación
│   ├── auth.py              # Autenticación JWT
│   ├── database.py          # Configuración de BD
│   ├── requirements.txt      # Dependencias Python
│   ├── Dockerfile
│   └── uploads/             # Almacenamiento de imágenes
├── frontend/
│   ├── index.html           # Estructura HTML
│   ├── app.js               # Lógica de la aplicación
│   ├── styles.css           # Estilos CSS
│   └── ...
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/register` - Registrar nuevo usuario
- `POST /api/login` - Iniciar sesión
- `POST /api/logout` - Cerrar sesión

### Imágenes
- `GET /api/images/` - Obtener todas las imágenes
  - Parámetros: `skip`, `limit`, `search`, `sort_by`
- `POST /api/images/` - Subir nueva imagen (autenticado)
- `GET /api/images/{id}` - Obtener imagen específica
- `GET /api/images/{id}/download` - Descargar imagen
- `DELETE /api/images/{id}` - Eliminar imagen (propietario)
- `GET /api/images/user/{user_id}` - Obtener imágenes de un usuario

### Estadísticas
- `GET /api/stats` - Obtener estadísticas del sitio

## 🎨 Paleta de Colores

- **Primario**: `#6366f1` (Indigo)
- **Secundario**: `#ec4899` (Pink)
- **Fondo**: `#0f172a` (Dark Blue)
- **Texto**: `#f1f5f9` (Slate Light)

## 🛠️ Tecnologías Utilizadas

### Backend
- **FastAPI** - Framework web moderno
- **SQLAlchemy** - ORM para base de datos
- **Pydantic** - Validación de datos
- **JWT** - Autenticación segura
- **PostgreSQL/SQLite** - Base de datos

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos y animaciones
- **JavaScript (Vanilla)** - Lógica de la aplicación
- **Font Awesome** - Iconos

## 📝 Uso

### Crear una Cuenta
1. Haz clic en "Registrarse"
2. Completa el formulario con usuario, correo y contraseña
3. Se iniciarán sesión automáticamente

### Subir una Imagen
1. Inicia sesión
2. Haz clic en "Subir" en la navegación
3. Completa título, descripción (opcional) y selecciona la imagen
4. Haz clic en "Subir Imagen"

### Buscar Imágenes
1. Usa la barra de búsqueda en la navegación
2. Escribe palabras clave del título o descripción
3. Los resultados se filtran en tiempo real

### Descargar una Imagen
1. Haz hover sobre una imagen
2. Haz clic en el botón de descargar
3. La imagen se descargará automáticamente

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración
- Validación de entrada en cliente y servidor
- Protección CORS configurada
- Validación de tipos de archivo

## 📱 Responsive Design

La aplicación está optimizada para:
- 📲 Teléfonos (320px - 600px)
- 📱 Tablets (600px - 1024px)
- 💻 Desktops (1024px+)

## 🐛 Solución de Problemas

### La aplicación no inicia
```bash
# Verificar que Docker esté corriendo
docker ps

# Recrear contenedores
docker-compose down
docker-compose up --build
```

### Base de datos no se conecta
```bash
# Verificar logs
docker-compose logs db

# Reiniciar servicios
docker-compose restart
```

### Imágenes no se cargan
- Verificar que la carpeta `uploads/` exista
- Comprobar permisos de la carpeta
- Verificar ruta en la configuración

## 📚 Documentación Adicional

### Swagger API
Accede a la documentación interactiva en:
```
http://localhost:8000/docs
```

## 👨‍💻 Desarrollo

### Ejecutar en modo desarrollo
```bash
# Backend con reload automático
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend con servidor local
python -m http.server 3000
```

### Ejecutar tests (si están disponibles)
```bash
pytest tests/
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para más detalles.

## 📧 Contacto

Para preguntas o sugerencias, por favor contacta a través de:
- Email: info@coleccionvisual.com
- Issues: Abre un issue en el repositorio

## 🙏 Agradecimientos

- FastAPI por su excelente framework
- La comunidad de código abierto
- Inspiración en plataformas modernas de compartir imágenes

---

**Hecho con ❤️ para amantes de las imágenes inspiradoras**

Última actualización: Mayo 2026
