-- ============================================================
-- Moins de friction + aucune perte de données
-- 1. Le nom du match devient facultatif (seuls position, mise et cote sont obligatoires).
-- 2. Historique des modifications : chaque ajout, modification ou suppression de pari,
--    mouvement d'argent, réglage ou ligne de compta est copié dans data_history.
--    On peut ainsi retrouver et restaurer n'importe quelle version, comme l'historique de Google Sheets.
-- ============================================================

ALTER TABLE bets ALTER COLUMN game DROP NOT NULL;
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_game_check;

CREATE TABLE IF NOT EXISTS data_history (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_row JSONB,          -- version avant le changement (NULL pour un ajout)
  new_row JSONB,          -- version après le changement (NULL pour une suppression)
  changed_by UUID DEFAULT auth.uid(),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS data_history_row_idx ON data_history (table_name, row_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS data_history_time_idx ON data_history (changed_at DESC);

CREATE OR REPLACE FUNCTION record_history() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO data_history (table_name, row_id, action, old_row, new_row, changed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(to_jsonb(NEW) ->> 'id', to_jsonb(OLD) ->> 'id'),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS bets_history ON bets;
CREATE TRIGGER bets_history AFTER INSERT OR UPDATE OR DELETE ON bets FOR EACH ROW EXECUTE FUNCTION record_history();
DROP TRIGGER IF EXISTS money_moves_history ON money_moves;
CREATE TRIGGER money_moves_history AFTER INSERT OR UPDATE OR DELETE ON money_moves FOR EACH ROW EXECUTE FUNCTION record_history();
DROP TRIGGER IF EXISTS app_settings_history ON app_settings;
CREATE TRIGGER app_settings_history AFTER UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION record_history();
DROP TRIGGER IF EXISTS compta_legacy_history ON compta_legacy;
CREATE TRIGGER compta_legacy_history AFTER INSERT OR UPDATE OR DELETE ON compta_legacy FOR EACH ROW EXECUTE FUNCTION record_history();

-- L'historique se lit et s'ajoute, mais ne se modifie ni ne s'efface depuis le site
ALTER TABLE data_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_read" ON data_history;
CREATE POLICY "auth_read" ON data_history FOR SELECT TO authenticated USING (true);
-- (les insertions passent par la fonction record_history, exécutée avec les droits du propriétaire)
