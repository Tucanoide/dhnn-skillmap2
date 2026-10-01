-- Agrega soporte de login y rol admin a la tabla people existente.
-- Ejecutar con skillmapdba (altera estructura de tabla).

ALTER TABLE people ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS es_admin BOOLEAN NOT NULL DEFAULT false;
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

-- Quién es admin ("People" en REQUIREMENTS.md sección 2) queda a
-- decisión del cliente, no se asigna automáticamente. Ejecutar a mano
-- cuando se confirme, por ejemplo:
-- UPDATE people SET es_admin = true WHERE email = 'alguien@dhnn.com';
