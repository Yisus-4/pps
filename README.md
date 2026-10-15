# UNdeC - Dashboard Académico de Alumnos (SIU Guaraní)

Sistema integral para la carga, gestión, seguimiento y visualización de datos de alumnos de la **Universidad Nacional de Chilecito (UNdeC)**, diseñado como base para la generación de dashboards inteligentes con **Bklit UI / shadcn/ui**.

---

## 🎨 Identidad Visual y Paleta Institucional (UNdeC)

El diseño visual sigue estrictamente las especificaciones oficiales de la UNdeC utilizando tokens en variables CSS nativas (`:root`):

*   **Malva Institucional (DS137-5C)**:
    *   Base: `#826170` (Color primario, botones, ítems activos de navegación)
    *   Oscuro: `#4F3A44` (Títulos de sección, texto contrastado, estados hover)
    *   Medio: `#A98B99`
    *   Claro: `#D5C3CC`
    *   Tenue: `#F1E9ED` (Fondos de fila seleccionada, bandas de tabla)
*   **Dorado Institucional (1245 C)**:
    *   Base: `#E5B115` (Acentos destacados, indicador superior de tarjetas clave)
    *   Oscuro: `#A07A0B` (Texto y badges sobre fondos claros para contraste WCAG AA)
    *   Texto sobre dorado: `#1A1A1A`
*   **Neutros Cálidos**:
    *   Fondo de página: `#FAF8F7`
    *   Superficie/Tarjeta: `#FFFFFF` con borde `1px #E6E0DD`
    *   Texto principal: `#1F1A1C` | Texto secundario: `#6B6166`
*   **Estados Funcionales**:
    *   *Cumple / Aceptada*: `#3F6B4F`
    *   *En observación / Aspirante*: `#A07A0B`
    *   *No cumple / Rechazado*: `#A33B2F`
*   **Series de Datos Bklit**:
    *   `--chart-1` a `--chart-6` configurados en el orden institucional.
    *   Namespace `@bklit` configurado en `frontend/components.json` listo para la fase de dashboards.

---

## 🏗️ Arquitectura del Sistema (Monorepo)

```
pps/
├── backend/                  # API Python con FastAPI y SQLAlchemy
│   ├── app/
│   │   ├── models/           # User, Escuela, PropuestaFormativa, Alumno
│   │   ├── routers/          # auth, escuelas, upload, alumnos, users
│   │   ├── schemas/          # Esquemas de validación Pydantic
│   │   ├── services/         # Parser SIU Guaraní con Upsert idempotente
│   │   ├── utils/            # Seguridad y Bcrypt nativo
│   │   ├── seed.py           # Creación automática de las 4 Escuelas y Admin
│   │   └── main.py           # Punto de entrada FastAPI con CORS y Lifespan
│   ├── tests/                # 15 tests automatizados con pytest
│   │   └── fixtures/         # Muestra real Alumnos_Meca_Agosto_2026 (.xlsx y .csv)
│   └── requirements.txt
├── frontend/                 # Aplicación Next.js 15 (App Router, TypeScript)
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/        # Inicio de sesión con JWT y diseño UNdeC
│   │   │   ├── cargar/       # Carga de archivos con selector de Responsable Académica
│   │   │   ├── alumnos/      # Tabla interactiva con filtros, búsqueda y exportación
│   │   │   └── usuarios/     # Administración de usuarios (solo ADMIN)
│   │   ├── components/       # Layout, Navbar y componentes de UI
│   │   ├── context/          # AuthContext con sesión reactiva
│   │   ├── lib/              # Cliente API y utilidades de exportación CSV
│   │   └── types/            # Tipos TypeScript
│   ├── components.json       # Configurado con namespace @bklit
│   └── tailwind.config.ts
├── .gitignore
└── README.md
```

---

## 🚀 Guía de Inicio Rápido

### Requisitos Previos
*   Python 3.11+ (Probado en Python 3.13)
*   Node.js 18+ (Probado en Node.js v22)

---

### 1. Iniciar el Backend (FastAPI)

1. Abrir una terminal en la carpeta `backend`:
   ```powershell
   cd backend
   ```
2. Activar el entorno virtual existente o crear uno nuevo:
   ```powershell
   .\venv\Scripts\activate
   ```
3. Iniciar el servidor de desarrollo:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
4. El backend estará disponible en:
   *   API: `http://localhost:8000`
   *   Documentación interactiva (Swagger UI): `http://localhost:8000/docs`

> **Nota:** Al iniciar por primera vez, el backend crea automáticamente la base de datos SQLite `alumnos.db`, precarga las 4 escuelas oficiales y genera el usuario administrador por defecto.

---

### 2. Iniciar el Frontend (Next.js)

1. En una nueva terminal, ingresar a la carpeta `frontend`:
   ```powershell
   cd frontend
   ```
2. Ejecutar el servidor de desarrollo:
   ```powershell
   npm run dev
   ```
3. Abrir en el navegador:
   *   `http://localhost:3000` (Redirige a `/login`)

---

## 🔐 Credenciales de Acceso

| Rol | Correo | Contraseña | Alcance |
| :--- | :--- | :--- | :--- |
| **Superadministrador** | `admin@undec.edu.ar` | `admin123` | Control total, gestión de usuarios, todas las escuelas y propuestas |

---

## 🏫 Escuelas Oficiales Precargadas

1. **Escuela de Ingeniería**
2. **Escuela de Ciencias Naturales**
3. **Escuela de Ciencias Sociales**
4. **Escuela de Ciencias Humanas y de la Salud**

Los administradores pueden dar de alta usuarios con el rol `RESPONSABLE_ACADEMICA` asignados a cualquiera de estas escuelas. Esos usuarios solo tendrán acceso para visualizar y subir archivos de su propia escuela.

---

## 🧪 Ejecución de Pruebas

Para correr la suite de 15 pruebas automatizadas del backend:
```powershell
.\backend\venv\Scripts\pytest -v
```

Para validar el build y linter del frontend:
```powershell
cd frontend
npm run lint
npm run build
```
