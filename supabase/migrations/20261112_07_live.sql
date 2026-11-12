-- ============================================================
-- Paris en live : case dédiée (avant, simple mention « live » dans la note, reprise de l'onglet « Bilan Live Kelicful 2026»).
-- Peut être relancée sans risque.
-- ============================================================

ALTER TABLE bets ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE bets SET is_live = TRUE
WHERE is_live = FALSE AND note ~* '(^|,\s*)live(\s*,|$)';
