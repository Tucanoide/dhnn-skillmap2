-- Alinea una base existente con backend/main.py.
-- Ejecutar con skillmapdba después de schema.sql y schema_auth.sql.
-- Es idempotente y no modifica ni elimina datos existentes.

ALTER TABLE people ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'interno';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'people_tipo_check'
      AND conrelid = 'people'::regclass
  ) THEN
    ALTER TABLE people ADD CONSTRAINT people_tipo_check CHECK (tipo IN ('interno', 'freelance'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_people_tipo ON people(tipo);

CREATE TABLE IF NOT EXISTS people_cv (
  id              SERIAL PRIMARY KEY,
  person_id       INTEGER NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
  archivo_nombre  TEXT NOT NULL,
  texto_extraido  TEXT NOT NULL DEFAULT '',
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_people_cv_person ON people_cv(person_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON people_cv TO skillmapuser;
GRANT USAGE, SELECT ON SEQUENCE people_cv_id_seq TO skillmapuser;