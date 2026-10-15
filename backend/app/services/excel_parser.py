import io
import csv
import unicodedata
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import openpyxl

from app.models.escuela import Escuela
from app.models.user import User, UserRole
from app.models.propuesta import PropuestaFormativa
from app.models.alumno import Alumno


def normalize_text(text: Any) -> str:
    """Normalize text by stripping whitespace, converting to lowercase and removing accents."""
    if text is None:
        return ""
    s = str(text).strip()
    norm = unicodedata.normalize("NFKD", s)
    return "".join(c for c in norm if not unicodedata.combining(c)).strip().lower()


def clean_str(val: Any) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() == "none" or s.lower() == "nan":
        return None
    return s


def to_int(val: Any, default: Optional[int] = None) -> Optional[int]:
    if val is None:
        return default
    s = str(val).strip()
    if not s or s.lower() == "none" or s.lower() == "nan":
        return default
    try:
        return int(float(s.replace(",", ".")))
    except (ValueError, TypeError):
        return default


def to_float(val: Any, default: Optional[float] = None) -> Optional[float]:
    if val is None:
        return default
    s = str(val).strip()
    if not s or s.lower() == "none" or s.lower() == "nan":
        return default
    try:
        return float(s.replace(",", "."))
    except (ValueError, TypeError):
        return default


def extract_rows_from_xlsx(file_bytes: bytes) -> List[List[str]]:
    try:
        wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
        sheet = wb.active
        rows = []
        for row in sheet.iter_rows(values_only=True):
            rows.append([str(c).strip() if c is not None and str(c).strip() != "None" else "" for c in row])
        return rows
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al leer el archivo Excel (.xlsx): {str(e)}"
        )


def extract_rows_from_csv(file_bytes: bytes) -> List[List[str]]:
    text = None
    for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252", "iso-8859-1"]:
        try:
            text = file_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = file_bytes.decode("utf-8", errors="replace")

    # Detect delimiter
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return []
    
    sample = "\n".join(lines[:10])
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except Exception:
        if ";" in sample and "," not in sample:
            delimiter = ";"
        elif "\t" in sample:
            delimiter = "\t"

    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    rows = []
    for row in reader:
        rows.append([str(c).strip() for c in row])
    return rows


def extract_rows(file_bytes: bytes, filename: str) -> List[List[str]]:
    fname_lower = filename.lower()
    if fname_lower.endswith(".xlsx") or fname_lower.endswith(".xlsm") or fname_lower.endswith(".xls"):
        return extract_rows_from_xlsx(file_bytes)
    elif fname_lower.endswith(".csv") or fname_lower.endswith(".txt"):
        return extract_rows_from_csv(file_bytes)
    else:
        # Try xlsx first, then fallback to csv
        try:
            return extract_rows_from_xlsx(file_bytes)
        except Exception:
            return extract_rows_from_csv(file_bytes)


def parse_siu_guarani(file_bytes: bytes, filename: str) -> Tuple[Dict[str, str], List[Dict[str, Any]]]:
    rows = extract_rows(file_bytes, filename)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo proporcionado está vacío."
        )

    metadata: Dict[str, str] = {
        "responsable_academica": "",
        "propuesta_formativa": "",
        "plan_codigo": "",
        "version_plan": "",
        "ubicacion": ""
    }
    header_row_idx: Optional[int] = None

    for idx, row in enumerate(rows):
        if not row or not any(row):
            continue
        c0 = normalize_text(row[0]) if len(row) > 0 else ""
        c2 = row[2].strip() if len(row) > 2 else ""

        if c0.startswith("responsable acad"):
            metadata["responsable_academica"] = c2
        elif c0.startswith("propuesta formativa"):
            metadata["propuesta_formativa"] = c2
        elif c0.startswith("plan de estudios"):
            metadata["plan_codigo"] = c2
        elif "version" in c0 and "plan" in c0:
            metadata["version_plan"] = c2
        elif c0.startswith("ubicacion"):
            metadata["ubicacion"] = c2
        elif ("apellido" in c0 and "nombre" in c0) or (len(row) > 1 and "documento" in normalize_text(row[1])):
            header_row_idx = idx
            break

    if header_row_idx is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontró la fila de encabezados de alumnos ('Apellido y Nombre', 'Tipo y N° Documento') en el archivo."
        )

    if not metadata["propuesta_formativa"]:
        # Check if row above headers has the proposal name
        if header_row_idx > 0 and rows[header_row_idx - 1] and rows[header_row_idx - 1][0].strip():
            metadata["propuesta_formativa"] = rows[header_row_idx - 1][0].strip()

    if not metadata["propuesta_formativa"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo identificar la 'Propuesta Formativa' en el encabezado del archivo SIU Guaraní."
        )

    # Build column index mapping
    raw_headers = rows[header_row_idx]
    col_map: Dict[str, int] = {}
    for i, h in enumerate(raw_headers):
        nh = normalize_text(h)
        if "apellido" in nh:
            col_map["apellido_nombre"] = i
        elif "documento" in nh:
            col_map["documento"] = i
        elif "nacimiento" in nh:
            col_map["fecha_nacimiento"] = i
        elif "email" in nh or "correo" in nh:
            col_map["email"] = i
        elif "telefono" in nh:
            col_map["telefono"] = i
        elif "legajo" in nh:
            col_map["legajo"] = i
        elif nh == "plan":
            col_map["plan"] = i
        elif "ano ingreso" in nh or "anio ingreso" in nh:
            col_map["anio_ingreso"] = i
        elif "fecha ingreso" in nh:
            col_map["fecha_ingreso"] = i
        elif "ultimo examen" in nh:
            col_map["ultimo_examen"] = i
        elif "ultima reinscripcion" in nh:
            col_map["ultima_reinscripcion"] = i
        elif "con aplazos" in nh:
            col_map["promedio_con_aplazos"] = i
        elif "sin aplazos" in nh:
            col_map["promedio_sin_aplazos"] = i
        elif "actividades aprobadas" in nh:
            col_map["actividades_aprobadas"] = i
        elif "total actividades" in nh:
            col_map["total_actividades"] = i
        elif "estado" in nh:
            col_map["estado_inscripcion"] = i
        elif "pais" in nh:
            col_map["pais_origen"] = i
        elif "coeficiente" in nh:
            col_map["coeficiente"] = i

    if "documento" not in col_map or "apellido_nombre" not in col_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe contener las columnas obligatorias 'Apellido y Nombre' y 'Tipo y N° Documento'."
        )

    student_records: List[Dict[str, Any]] = []

    def get_cell(row_data: List[str], field_key: str) -> str:
        idx = col_map.get(field_key)
        if idx is not None and idx < len(row_data):
            return row_data[idx].strip()
        return ""

    for row in rows[header_row_idx + 1:]:
        if not row or not any(row):
            continue
        c0 = normalize_text(row[0]) if len(row) > 0 else ""
        if c0.startswith("total propuesta") or c0.startswith("total"):
            # Reached footer row summary, stop
            break

        doc = clean_str(get_cell(row, "documento"))
        ap_nom = clean_str(get_cell(row, "apellido_nombre"))
        if not doc or not ap_nom:
            continue

        student = {
            "apellido_nombre": ap_nom,
            "documento": doc,
            "fecha_nacimiento": clean_str(get_cell(row, "fecha_nacimiento")),
            "email": clean_str(get_cell(row, "email")),
            "telefono": clean_str(get_cell(row, "telefono")),
            "legajo": clean_str(get_cell(row, "legajo")),
            "plan": clean_str(get_cell(row, "plan")),
            "anio_ingreso": to_int(get_cell(row, "anio_ingreso")),
            "fecha_ingreso": clean_str(get_cell(row, "fecha_ingreso")),
            "ultimo_examen": clean_str(get_cell(row, "ultimo_examen")),
            "ultima_reinscripcion": clean_str(get_cell(row, "ultima_reinscripcion")),
            "promedio_con_aplazos": to_float(get_cell(row, "promedio_con_aplazos")),
            "promedio_sin_aplazos": to_float(get_cell(row, "promedio_sin_aplazos")),
            "actividades_aprobadas": to_int(get_cell(row, "actividades_aprobadas"), default=0) or 0,
            "total_actividades": to_int(get_cell(row, "total_actividades"), default=0) or 0,
            "estado_inscripcion": clean_str(get_cell(row, "estado_inscripcion")),
            "pais_origen": clean_str(get_cell(row, "pais_origen")),
            "coeficiente": to_float(get_cell(row, "coeficiente")),
        }
        student_records.append(student)

    return metadata, student_records


def process_siu_upload(
    db: Session,
    file_bytes: bytes,
    filename: str,
    selected_escuela_id: int,
    current_user: User
) -> Dict[str, Any]:
    # 1. Verify selected escuela exists
    db_escuela = db.query(Escuela).filter(Escuela.id == selected_escuela_id).first()
    if not db_escuela:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La Escuela con ID {selected_escuela_id} no existe."
        )

    # 2. Permission check: Admin can upload for any escuela; school users only for their own
    if current_user.role != UserRole.ADMIN.value:
        if current_user.escuela_id != selected_escuela_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene permisos para subir datos a '{db_escuela.nombre}'."
            )

    # 3. Parse SIU Guaraní file
    metadata, student_records = parse_siu_guarani(file_bytes, filename)

    # 4. Validate Responsable Académica in file matches selected Escuela
    file_resp_acad = metadata.get("responsable_academica", "")
    if file_resp_acad:
        norm_file = normalize_text(file_resp_acad)
        norm_db = normalize_text(db_escuela.nombre)
        # Check if either contains the other or normalized match
        if norm_file != norm_db and norm_file not in norm_db and norm_db not in norm_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"El archivo corresponde a la Responsable Académica '{file_resp_acad}', "
                    f"pero seleccionó la Escuela '{db_escuela.nombre}'."
                )
            )

    # 5. Find or create PropuestaFormativa for this Escuela
    propuesta_nombre = metadata.get("propuesta_formativa", "").strip()
    propuesta = db.query(PropuestaFormativa).filter(
        PropuestaFormativa.escuela_id == db_escuela.id,
        PropuestaFormativa.nombre == propuesta_nombre
    ).first()

    now_utc = datetime.now(timezone.utc)

    if not propuesta:
        propuesta = PropuestaFormativa(
            nombre=propuesta_nombre,
            escuela_id=db_escuela.id,
            plan_codigo=clean_str(metadata.get("plan_codigo")),
            version_plan=clean_str(metadata.get("version_plan")),
            ubicacion=clean_str(metadata.get("ubicacion")),
            updated_at=now_utc
        )
        db.add(propuesta)
        db.flush()  # populate propuesta.id
    else:
        # Update metadata if present
        if metadata.get("plan_codigo"):
            propuesta.plan_codigo = clean_str(metadata.get("plan_codigo"))
        if metadata.get("version_plan"):
            propuesta.version_plan = clean_str(metadata.get("version_plan"))
        if metadata.get("ubicacion"):
            propuesta.ubicacion = clean_str(metadata.get("ubicacion"))
        propuesta.updated_at = now_utc

    # 6. Upsert students for this propuesta
    # Fetch existing students for this propuesta into memory indexed by documento
    existing_students = {
        alumno.documento: alumno
        for alumno in db.query(Alumno).filter(Alumno.propuesta_id == propuesta.id).all()
    }

    nuevos = 0
    actualizados = 0

    for s_data in student_records:
        doc = s_data["documento"]
        if doc in existing_students:
            # Update existing alumno
            alumno = existing_students[doc]
            alumno.apellido_nombre = s_data["apellido_nombre"]
            alumno.fecha_nacimiento = s_data["fecha_nacimiento"]
            alumno.email = s_data["email"]
            alumno.telefono = s_data["telefono"]
            alumno.legajo = s_data["legajo"]
            alumno.plan = s_data["plan"]
            alumno.anio_ingreso = s_data["anio_ingreso"]
            alumno.fecha_ingreso = s_data["fecha_ingreso"]
            alumno.ultimo_examen = s_data["ultimo_examen"]
            alumno.ultima_reinscripcion = s_data["ultima_reinscripcion"]
            alumno.promedio_con_aplazos = s_data["promedio_con_aplazos"]
            alumno.promedio_sin_aplazos = s_data["promedio_sin_aplazos"]
            alumno.actividades_aprobadas = s_data["actividades_aprobadas"]
            alumno.total_actividades = s_data["total_actividades"]
            alumno.estado_inscripcion = s_data["estado_inscripcion"]
            alumno.pais_origen = s_data["pais_origen"]
            alumno.coeficiente = s_data["coeficiente"]
            alumno.updated_at = now_utc
            actualizados += 1
        else:
            # Create new alumno
            new_alumno = Alumno(
                propuesta_id=propuesta.id,
                apellido_nombre=s_data["apellido_nombre"],
                documento=s_data["documento"],
                fecha_nacimiento=s_data["fecha_nacimiento"],
                email=s_data["email"],
                telefono=s_data["telefono"],
                legajo=s_data["legajo"],
                plan=s_data["plan"],
                anio_ingreso=s_data["anio_ingreso"],
                fecha_ingreso=s_data["fecha_ingreso"],
                ultimo_examen=s_data["ultimo_examen"],
                ultima_reinscripcion=s_data["ultima_reinscripcion"],
                promedio_con_aplazos=s_data["promedio_con_aplazos"],
                promedio_sin_aplazos=s_data["promedio_sin_aplazos"],
                actividades_aprobadas=s_data["actividades_aprobadas"],
                total_actividades=s_data["total_actividades"],
                estado_inscripcion=s_data["estado_inscripcion"],
                pais_origen=s_data["pais_origen"],
                coeficiente=s_data["coeficiente"],
                updated_at=now_utc
            )
            db.add(new_alumno)
            existing_students[doc] = new_alumno
            nuevos += 1

    db.commit()

    return {
        "escuela": db_escuela.nombre,
        "propuesta": propuesta.nombre,
        "total_procesados": nuevos + actualizados,
        "nuevos": nuevos,
        "actualizados": actualizados
    }
