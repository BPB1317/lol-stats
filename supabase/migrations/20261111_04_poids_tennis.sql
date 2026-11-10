-- ============================================================
-- Elo tennis : répartition Elo général / Elo surface réglable pour chaque surface.
-- tennis_w_<surface> = part de l'Elo général (la part de l'Elo surface est 1 − cette valeur).
-- Les colonnes tennis_elo_weight_overall / _surface restent pour compatibilité mais ne sont plus utilisées.
-- ============================================================

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS tennis_w_dur NUMERIC(4, 3) NOT NULL DEFAULT 0.4 CHECK (tennis_w_dur BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS tennis_w_terre NUMERIC(4, 3) NOT NULL DEFAULT 0.4 CHECK (tennis_w_terre BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS tennis_w_gazon NUMERIC(4, 3) NOT NULL DEFAULT 0.4 CHECK (tennis_w_gazon BETWEEN 0 AND 1);

-- Point de départ : la répartition commune actuelle
UPDATE app_settings SET
  tennis_w_dur = tennis_elo_weight_overall,
  tennis_w_terre = tennis_elo_weight_overall,
  tennis_w_gazon = tennis_elo_weight_overall;
