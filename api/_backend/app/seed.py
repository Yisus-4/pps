import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.escuela import Escuela
from app.models.user import User, UserRole
from app.models.propuesta import PropuestaFormativa
from app.models.carga import CargaHistorial
from app.models.alumno import Alumno
from app.utils.security import hash_password

OFICIAL_ESCUELAS = [
    "Escuela de Ingeniería",
    "Escuela de Ciencias Naturales",
    "Escuela de Ciencias Sociales",
    "Escuela de Ciencias Humanas y de la Salud",
]


def _parse_dt(val: Optional[str]) -> datetime:
    if not val:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def migrate_sqlite_snapshot_to_db(db: Session) -> None:
    """
    If the target database (e.g., Vercel Postgres / Neon) has 0 students,
    automatically seed initial propuestas, cargas_historial, and alumnos
    from the bundled alumnos.db snapshot.
    """
    if db.query(Alumno).count() > 0:
        return

    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.normpath(os.path.join(base_dir, "..", "alumnos.db")),
        os.path.normpath(os.path.join(base_dir, "..", "..", "alumnos.db")),
        os.path.normpath(os.path.join(base_dir, "..", "..", "backend", "alumnos.db")),
    ]
    sqlite_path = next((p for p in candidates if os.path.exists(p)), None)
    if not sqlite_path:
        return

    try:
        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Map sqlite escuela_id -> target db Escuela.id by name
        sqlite_escuelas = {
            row["id"]: row["nombre"]
            for row in cur.execute("SELECT id, nombre FROM escuelas").fetchall()
        }
        target_escuelas = {
            e.nombre: e.id for e in db.query(Escuela).all()
        }
        escuela_id_map = {}
        for sq_id, nombre in sqlite_escuelas.items():
            if nombre in target_escuelas:
                escuela_id_map[sq_id] = target_escuelas[nombre]

        # Migrate propuestas_formativas
        propuesta_id_map = {}
        for row in cur.execute("SELECT * FROM propuestas_formativas").fetchall():
            target_esc_id = escuela_id_map.get(row["escuela_id"])
            if not target_esc_id:
                continue
            existing_prop = (
                db.query(PropuestaFormativa)
                .filter(
                    PropuestaFormativa.escuela_id == target_esc_id,
                    PropuestaFormativa.nombre == row["nombre"],
                )
                .first()
            )
            if not existing_prop:
                existing_prop = PropuestaFormativa(
                    nombre=row["nombre"],
                    escuela_id=target_esc_id,
                    plan_codigo=row["plan_codigo"],
                    version_plan=row["version_plan"],
                    ubicacion=row["ubicacion"],
                    updated_at=_parse_dt(row["updated_at"]),
                )
                db.add(existing_prop)
                db.flush()
            propuesta_id_map[row["id"]] = existing_prop.id

        # Migrate cargas_historial
        admin_user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER_EMAIL).first()
        carga_id_map = {}
        try:
            cargas_rows = cur.execute("SELECT * FROM cargas_historial").fetchall()
        except Exception:
            cargas_rows = []

        for row in cargas_rows:
            target_esc_id = escuela_id_map.get(row["escuela_id"])
            if not target_esc_id:
                continue
            nueva_carga = CargaHistorial(
                filename=row["filename"],
                escuela_id=target_esc_id,
                propuesta_id=propuesta_id_map.get(row["propuesta_id"]),
                usuario_id=admin_user.id if admin_user else None,
                fecha_carga=_parse_dt(row["fecha_carga"]),
                total_filas=row["total_filas"] or 0,
                nuevos=row["nuevos"] or 0,
                actualizados=row["actualizados"] or 0,
            )
            db.add(nueva_carga)
            db.flush()
            carga_id_map[row["id"]] = nueva_carga.id

        # Migrate alumnos
        alumnos_rows = cur.execute("SELECT * FROM alumnos").fetchall()
        for row in alumnos_rows:
            target_prop_id = propuesta_id_map.get(row["propuesta_id"])
            if not target_prop_id:
                continue
            row_keys = row.keys()
            sq_carga_id = row["carga_id"] if "carga_id" in row_keys else None
            nuevo_alumno = Alumno(
                propuesta_id=target_prop_id,
                carga_id=carga_id_map.get(sq_carga_id) if sq_carga_id else None,
                apellido_nombre=row["apellido_nombre"],
                documento=row["documento"],
                fecha_nacimiento=row["fecha_nacimiento"],
                email=row["email"],
                telefono=row["telefono"],
                legajo=row["legajo"],
                plan=row["plan"],
                anio_ingreso=row["anio_ingreso"],
                fecha_ingreso=row["fecha_ingreso"],
                ultimo_examen=row["ultimo_examen"],
                ultima_reinscripcion=row["ultima_reinscripcion"],
                promedio_con_aplazos=row["promedio_con_aplazos"],
                promedio_sin_aplazos=row["promedio_sin_aplazos"],
                actividades_aprobadas=row["actividades_aprobadas"] or 0,
                total_actividades=row["total_actividades"] or 0,
                estado_inscripcion=row["estado_inscripcion"],
                pais_origen=row["pais_origen"],
                coeficiente=row["coeficiente"],
                updated_at=_parse_dt(row["updated_at"]),
            )
            db.add(nuevo_alumno)

        db.commit()
        conn.close()
    except Exception:
        db.rollback()


def seed_database(db: Session) -> None:
    # 1. Seed Escuelas
    for esc_nombre in OFICIAL_ESCUELAS:
        exists = db.query(Escuela).filter(Escuela.nombre == esc_nombre).first()
        if not exists:
            nueva_escuela = Escuela(nombre=esc_nombre)
            db.add(nueva_escuela)
    db.commit()

    # 2. Seed Default Admin User
    admin_email = settings.FIRST_SUPERUSER_EMAIL
    admin_exists = db.query(User).filter(User.email == admin_email).first()
    if not admin_exists:
        admin_user = User(
            email=admin_email,
            full_name="Administrador UNdeC",
            hashed_password=hash_password(settings.FIRST_SUPERUSER_PASSWORD),
            role=UserRole.ADMIN.value,
            escuela_id=None,
            is_active=True
        )
        db.add(admin_user)
        db.commit()

    # 3. Auto-migrate initial dataset from bundled alumnos.db when running outside unit tests
    try:
        bind_url = str(db.get_bind().url)
    except Exception:
        bind_url = ""
    if ":memory:" not in bind_url and not os.environ.get("PYTEST_CURRENT_TEST"):
        migrate_sqlite_snapshot_to_db(db)
