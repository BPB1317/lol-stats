-- ============================================================
-- Onglets personnalisés par utilisateur : ordre et onglets masqués.
-- Forme : { "order": ["/paris", "/paris/recap", ...], "hidden": ["/kelicful/wta", ...] }
-- NULL = disposition par défaut.
-- ============================================================

ALTER TABLE user_prefs
  ADD COLUMN IF NOT EXISTS tab_layout JSONB;
