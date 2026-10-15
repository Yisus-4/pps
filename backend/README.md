# UNdeC - Dashboard de Alumnos (Backend API)

API REST desarrollada con **FastAPI**, **SQLAlchemy** (SQLite) y **Pydantic** para la gestión y carga de datos académicos exportados desde **SIU Guaraní** en la **Universidad Nacional de Chilecito (UNdeC)**.

---

## 🚀 Requisitos y Configuración

### 1. Requisitos Previos
- Python 3.11 o superior (probado y verificado en Python 3.13)
- Entorno virtual (venv)

### 2. Instalación

Desde la carpeta raíz del proyecto o desde `backend/`:

```bash
cd backend
python -m venv venv

# En Windows:
.\venv\Scripts\activate

# En Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configuración de Variables de Entorno

Copie el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Variables disponibles:
- `DATABASE_URL`: URL de la base de datos (por defecto `sqlite:///./alumnos.db`).
- `SECRET_KEY`: Clave para firma de tokens JWT.
- `ALGORITHM`: Algoritmo JWT (`HS256`).
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Duración del token en minutos (`1440` = 24 horas).
- `FIRST_SUPERUSER_EMAIL`: Email del administrador inicial (`admin@undec.edu.ar`).
- `FIRST_SUPERUSER_PASSWORD`: Contraseña del administrador inicial (`admin123`).

### 4. Inicialización y Ejecución

Al iniciar la aplicación, las tablas de la base de datos y los datos semilla (las 4 Escuelas oficiales de la UNdeC y el usuario administrador) se crean automáticamente:

```bash
uvicorn app.main:app --reload --port 8000
```

- **Swagger UI interactivo**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🏛️ Estructura de Datos y Escuelas Semilla

Las 4 Escuelas oficiales creadas en la inicialización son:
1. **Escuela de Ingeniería**
2. **Escuela de Ciencias Naturales**
3. **Escuela de Ciencias Sociales**
4. **Escuela de Ciencias Humanas y de la Salud**

### Roles de Usuario
- `ADMIN`: Administrador global (puede ver todas las escuelas, crear usuarios y subir archivos para cualquier escuela).
- `RESPONSABLE_ACADEMICA`: Vinculado obligatoriamente a una `escuela_id`. Solo puede consultar y cargar datos pertenecientes a su escuela asignada.

---

## 📊 Parser SIU Guaraní y Lógica de Upsert

El servicio `app/services/excel_parser.py` procesa archivos `.xlsx` y `.csv` exportados por SIU Guaraní:

1. **Lectura de Metadatos del Encabezado**:
   - `Responsable Académica`
   - `Propuesta Formativa`
   - `Plan de Estudios`
   - `Versión del Plan de Estudios`
   - `Ubicación`
2. **Validaciones**:
   - Comprueba que la `Responsable Académica` del archivo coincida con la `escuela_id` seleccionada en el formulario (de lo contrario retorna `HTTP 400`).
   - Verifica permisos según el rol del usuario (usuarios de escuela no pueden subir a otra escuela, `HTTP 403`).
3. **Upsert Idempotente**:
   - Clave única de alumno: `(propuesta_id, documento)`.
   - Si el alumno ya existe en esa propuesta, se actualizan sus datos y fecha de modificación.
   - Si no existe, se inserta como nuevo alumno.
   - **No elimina ni modifica** alumnos de otras propuestas formativas.
   - Se ignora la fila de pie de página de totales (`Total Propuesta Formativa...`).
   - Retorna un resumen: `{ "escuela": "...", "propuesta": "...", "total_procesados": N, "nuevos": X, "actualizados": Y }`.

---

## 📡 Endpoints de la API

### Autenticación y Usuarios
- `POST /api/auth/login`: Inicia sesión (acepta JSON o formulario OAuth2). Retorna token JWT y perfil de usuario con su escuela.
- `GET /api/auth/me`: Retorna los datos del usuario autenticado.
- `GET /api/users`: *(Solo ADMIN)* Lista todos los usuarios.
- `POST /api/users`: *(Solo ADMIN)* Registra un nuevo usuario indicando rol y escuela.

### Escuelas y Propuestas
- `GET /api/escuelas`: Lista las 4 escuelas oficiales.
- `GET /api/escuelas/{id}/propuestas`: Lista las carreras / propuestas formativas registradas en una escuela con la cantidad de alumnos en cada una.

### Carga de Archivos
- `POST /api/upload`: Recibe `file` (.xlsx o .csv) y `escuela_id` (form-data). Aplica validación y ejecuta el upsert.

### Consulta de Alumnos
- `GET /api/alumnos`: Consulta paginada y filtrable de alumnos.
  - Parámetros query opcionales:
    - `escuela_id`: Filtro de escuela (solo ADMIN; usuarios de escuela están restringidos automáticamente a su escuela).
    - `propuesta_id`: Filtro por carrera / propuesta formativa.
    - `search`: Búsqueda textual por apellido/nombre, documento o legajo.
    - `estado_inscripcion`: Filtro por estado en la propuesta.
    - `page` (default: 1) y `limit` (default: 50, máx: 500).
  - Retorna `{ items: [...], total: N, page: 1, limit: 50, total_pages: M }`.

---

## 🧪 Pruebas Automatizadas

Para ejecutar la suite completa de pruebas:

```bash
cd backend
.\venv\Scripts\pytest -v
```

Suite de 15 pruebas cubriendo:
- Autenticación (login JSON y Form, contraseñas inválidas, perfil me).
- Control de acceso basado en roles (RBAC).
- Parseo de archivos reales `.xlsx` y `.csv`.
- Idempotencia del upsert (actualización de alumnos existentes sin duplicación).
- Detección de filas de pie de página de SIU.
- Rechazo por discordancia de Escuela.
- Paginación y búsqueda de alumnos.
