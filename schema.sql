-- DHNN Skill Map — schema inicial (v1)
-- Ejecutar con el usuario admin (skillmapdba).
-- Basado en REQUIREMENTS.md sección 3 (Datos) y la maqueta preview.html.

CREATE TABLE IF NOT EXISTS people (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL UNIQUE,
  email           TEXT UNIQUE,
  rol_puesto      TEXT NOT NULL,
  area            TEXT NOT NULL,
  banda           TEXT NOT NULL,
  seniority       TEXT,
  tipo            TEXT NOT NULL DEFAULT 'interno' CHECK (tipo IN ('interno', 'freelance')),
  lider_id        INTEGER REFERENCES people(id),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  categoria       TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('dura', 'blanda', 'ia')),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nombre, categoria)
);

CREATE TABLE IF NOT EXISTS person_skills (
  id                       SERIAL PRIMARY KEY,
  person_id                INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  skill_id                 INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  bucket                   TEXT NOT NULL CHECK (bucket IN ('core', 'blandas', 'desarrollar')),
  nivel_actual             SMALLINT NOT NULL DEFAULT 0 CHECK (nivel_actual BETWEEN 0 AND 5),
  nivel_objetivo           SMALLINT NOT NULL CHECK (nivel_objetivo BETWEEN 1 AND 5),
  autoeval_fecha           DATE,
  lider_validacion_fecha   DATE,
  lider_ajusto             BOOLEAN,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_person_skills_person ON person_skills(person_id);
CREATE INDEX IF NOT EXISTS idx_person_skills_skill  ON person_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_people_lider          ON people(lider_id);
CREATE INDEX IF NOT EXISTS idx_people_tipo           ON people(tipo);

-- CV más reciente cargado para cada persona/freelancer.
CREATE TABLE IF NOT EXISTS people_cv (
  id              SERIAL PRIMARY KEY,
  person_id       INTEGER NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
  archivo_nombre  TEXT NOT NULL,
  texto_extraido  TEXT NOT NULL DEFAULT '',
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_people_cv_person ON people_cv(person_id);

-- El usuario de la app (skillmapuser) necesita permisos explícitos:
-- por defecto en Postgres solo el dueño (skillmapdba) puede leer/escribir.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO skillmapuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO skillmapuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO skillmapuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO skillmapuser;
