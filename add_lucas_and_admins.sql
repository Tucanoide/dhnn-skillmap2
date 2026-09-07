-- Completa el organigrama (Lucas Davison, CEO, no estaba en el roster de 18)
-- y asigna el rol admin ("People" en REQUIREMENTS.md) según lo indicado por el cliente.
-- Ya ejecutado manualmente; este archivo documenta el cambio para referencia futura.

INSERT INTO people (nombre, email, rol_puesto, area, banda, seniority)
VALUES ('Lucas Davison', 'lucas@dhnn.com', 'CEO', 'Liderazgo', 'Management', 'Líder')
ON CONFLICT (nombre) DO UPDATE SET email = EXCLUDED.email;

UPDATE people SET lider_id = (SELECT id FROM people WHERE nombre = 'Lucas Davison')
WHERE lider_id IS NULL AND nombre != 'Lucas Davison' AND nombre IN (
  'Diego Trefny','Patricio Euillades','Juan Pablo Da Rocha','Rocío Doukler',
  'María Julia Murua','Sabrina García Demestre','Pedro Astelarra',
  'Melisa Fernández','Rocio Castillo'
);

UPDATE people SET es_admin = true
WHERE nombre IN ('Melisa Fernández', 'Sabrina García Demestre', 'Lucas Davison');
