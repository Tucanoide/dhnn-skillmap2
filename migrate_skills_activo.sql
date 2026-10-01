-- Curva el catálogo de skills sin borrar nada: agrega un flag "activo" para
-- decidir qué skills se ofrecen para asignar de acá en más. Las skills ya
-- asignadas a personas (person_skills) siguen existiendo e intactas sin
-- importar este flag.
-- Ejecutar con skillmapdba. Es idempotente y no borra datos.

ALTER TABLE skills ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_skills_activo ON skills(activo);

-- Catálogo curado (2026-10-01): 6 blandas + 4 core + 4 "a desarrollar" (IA).
-- Todo lo demás pasa a inactivo (sigue existiendo, solo no se ofrece).
UPDATE skills SET activo = false;
UPDATE skills SET activo = true WHERE id IN (
  12, 9, 10, 13, 20, 18,   -- blandas: Comunicación asertiva, Trabajo en equipo, Adaptabilidad,
                           -- Gestión del tiempo, Liderazgo, Pensamiento estratégico
  66, 37, 105, 1,          -- core: Gestión de stakeholders y clientes, Figma avanzado,
                           -- Dirección de arte, Desarrollo de negocio
  21, 23, 22, 24           -- a desarrollar: Prompting efectivo, Integración de IA al flujo
                           -- de trabajo, Evaluación crítica del output de IA,
                           -- Automatización de tareas repetitivas
);
