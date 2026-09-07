-- Agrega soporte de login y rol admin a la tabla people existente.
-- Ejecutar con skillmapdba (altera estructura de tabla).

ALTER TABLE people ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS es_admin BOOLEAN NOT NULL DEFAULT false;

-- Quién es admin ("People" en REQUIREMENTS.md sección 2) queda a
-- decisión del cliente, no se asigna automáticamente. Ejecutar a mano
-- cuando se confirme, por ejemplo:
-- UPDATE people SET es_admin = true WHERE email = 'alguien@dhnn.com';
