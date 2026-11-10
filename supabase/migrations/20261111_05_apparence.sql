-- ============================================================
-- Apparence mémorisée par utilisateur : style (suisse | terminal) et mode (clair | sombre).
-- NULL = pas encore choisi (le mode suit alors celui du système).
-- ============================================================

ALTER TABLE user_prefs
  ADD COLUMN IF NOT EXISTS ui_style TEXT CHECK (ui_style IS NULL OR ui_style IN ('suisse', 'terminal')),
  ADD COLUMN IF NOT EXISTS ui_mode TEXT CHECK (ui_mode IS NULL OR ui_mode IN ('clair', 'sombre'));
