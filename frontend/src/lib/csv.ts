import { Alumno } from "@/types";

export function exportAlumnosToCsv(alumnos: Alumno[], filename: string = "alumnos_undec.csv"): void {
  if (!alumnos.length) return;

  const headers = [
    "ID",
    "Carrera",
    "Apellido y Nombre",
    "Documento",
    "Legajo",
    "Plan",
    "Año Ingreso",
    "Fecha Ingreso",
    "Estado Inscripción",
    "Promedio c/ Aplazos",
    "Promedio s/ Aplazos",
    "Actividades Aprobadas",
    "Total Actividades",
    "Último Examen",
    "Email",
    "Teléfono",
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = alumnos.map((a) => [
    a.id,
    a.propuesta_nombre || "",
    a.apellido_nombre,
    a.documento,
    a.legajo || "",
    a.plan || "",
    a.anio_ingreso || "",
    a.fecha_ingreso || "",
    a.estado_inscripcion || "",
    a.promedio_con_aplazos ?? "",
    a.promedio_sin_aplazos ?? "",
    a.actividades_aprobadas,
    a.total_actividades,
    a.ultimo_examen || "",
    a.email || "",
    a.telefono || "",
  ]);

  const csvContent =
    "\uFEFF" + // UTF-8 BOM for Microsoft Excel
    [headers.map(escapeCsv).join(",")]
      .concat(rows.map((row) => row.map(escapeCsv).join(",")))
      .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
