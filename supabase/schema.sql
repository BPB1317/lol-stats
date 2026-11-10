-- ============================================================
-- LoL Stats / BPB — Schéma Supabase complet (instantané)
-- Les évolutions passent par supabase/migrations/ (une migration par étape) ;
-- ce fichier reflète l'état de la base après toutes les migrations.
-- ============================================================

-- ─────────────── Modèles LoL (existant, inchangé) ───────────────

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  season TEXT NOT NULL,
  threshold FLOAT NOT NULL DEFAULT 0.85,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, name)
);

-- Baselines « Input » : Elo d'entrée d'une équipe à une date (plus de borne [0,1], ce sont des Elo)
CREATE TABLE team_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rating FLOAT NOT NULL,
  effective_date DATE NOT NULL,
  bo_type VARCHAR(3) NOT NULL DEFAULT 'BO3',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team1_id UUID NOT NULL REFERENCES teams(id),
  team2_id UUID NOT NULL REFERENCES teams(id),
  winner_id UUID REFERENCES teams(id),
  score TEXT,
  stage TEXT NOT NULL DEFAULT 'WEEK1',
  match_date DATE NOT NULL,
  source VARCHAR NOT NULL DEFAULT 'manual',   -- 'manual' (notes) ou 'calendar' (calendrier GDM)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- note_team1 ∈ [0, threshold] ; note_team2 = 1 − note_team1
CREATE TABLE match_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  note_team1 FLOAT NOT NULL CHECK (note_team1 >= 0 AND note_team1 <= 1),
  team1_id UUID NOT NULL REFERENCES teams(id),
  team2_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id)
);

CREATE TABLE gdm_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stage VARCHAR NOT NULL,
  gdm FLOAT NOT NULL DEFAULT 0,
  gd15 FLOAT,
  games INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id, stage)
);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdm_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON leagues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON teams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON team_baselines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON matches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON match_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON gdm_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────── Côté parieur (migration 20261110_01_paris) ───────────────

-- Lien compte Supabase → parieur (rempli hors migration : aucun e-mail dans le dépôt public)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  person TEXT NOT NULL UNIQUE CHECK (person IN ('Squawo', 'Kelicful')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal unique : tous les paris des deux, toutes années
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_date DATE NOT NULL DEFAULT CURRENT_DATE,
  game TEXT,                                 -- facultatif (migration 02)
  selection TEXT NOT NULL CHECK (length(trim(selection)) > 0),
  sport TEXT NOT NULL,                       -- liste éditable dans app_settings.sports
  stake NUMERIC(12, 2) NOT NULL CHECK (stake > 0),
  odds NUMERIC(10, 4) NOT NULL CHECK (odds > 1),
  result TEXT NOT NULL DEFAULT 'En cours'
    CHECK (result IN ('En cours', 'Gagnant', 'Perdant', '1/2 Gagnant', '1/2 Perdant', 'Remboursé')),
  status TEXT NOT NULL DEFAULT 'Pris' CHECK (status IN ('Pris', 'Vu pas pris')),
  portfolio TEXT NOT NULL DEFAULT 'commun' CHECK (portfolio IN ('commun', 'kelicful', 'squawo')),
  closing_odds NUMERIC(10, 4) CHECK (closing_odds IS NULL OR closing_odds > 1),
  clv NUMERIC(10, 6),
  clv_method TEXT CHECK (clv_method IS NULL OR clv_method IN ('ratio', 'legacy_margin5')),
  league TEXT,
  market TEXT CHECK (market IS NULL OR market IN ('Vainqueur', 'Handicap', 'Over/Under', 'Stats joueur', 'Combiné', 'Autre')),
  placed_by TEXT CHECK (placed_by IS NULL OR placed_by IN ('Squawo', 'Kelicful')),
  share_squawo NUMERIC(5, 2) CHECK (share_squawo IS NULL OR (share_squawo >= 0 AND share_squawo <= 100)),
  note TEXT,
  source TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'import_excel')),
  source_ref TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bets_portfolio_date_idx ON bets (portfolio, bet_date DESC);
CREATE INDEX IF NOT EXISTS bets_status_result_idx ON bets (status, result);

-- Mouvements d'argent : jamais mélangés avec les paris
CREATE TABLE IF NOT EXISTS money_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  move_date DATE NOT NULL DEFAULT CURRENT_DATE,
  kind TEXT NOT NULL CHECK (kind IN ('Retrait', 'Dépôt', 'Ajustement', 'Règlement')),  -- Règlement : migration 03
  person TEXT NOT NULL CHECK (person IN ('Squawo', 'Kelicful', 'Les deux')),
  amount NUMERIC(12, 2) NOT NULL,
  portfolio TEXT NOT NULL DEFAULT 'commun' CHECK (portfolio IN ('commun', 'kelicful', 'squawo')),
  note TEXT,
  source TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'import_excel')),
  source_ref TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS money_moves_portfolio_date_idx ON money_moves (portfolio, move_date);

-- Onglet « Compta Kévin » importé tel quel (historique en lecture seule)
CREATE TABLE IF NOT EXISTS compta_legacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_by TEXT,
  paid_for TEXT,
  date DATE,
  bet TEXT,
  odds NUMERIC(10, 4),
  amount NUMERIC(12, 2),
  result TEXT,
  pl NUMERIC(12, 2),
  comment TEXT,
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Réglages communs (une seule ligne)
CREATE TABLE IF NOT EXISTS app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  default_share_squawo NUMERIC(5, 2) NOT NULL DEFAULT 50 CHECK (default_share_squawo >= 0 AND default_share_squawo <= 100),
  bankroll NUMERIC(12, 2) NOT NULL DEFAULT 5000,
  stake_exponent NUMERIC(6, 3) NOT NULL DEFAULT -0.7,
  reset_date_commun DATE,
  reset_date_kelicful DATE,
  tennis_elo_weight_overall NUMERIC(4, 3) NOT NULL DEFAULT 0.4,
  tennis_elo_weight_surface NUMERIC(4, 3) NOT NULL DEFAULT 0.6,
  series_concentration NUMERIC(8, 2) NOT NULL DEFAULT 40,
  tennis_w_dur NUMERIC(4, 3) NOT NULL DEFAULT 0.4 CHECK (tennis_w_dur BETWEEN 0 AND 1),      -- part de l'Elo général, par surface (migration 04)
  tennis_w_terre NUMERIC(4, 3) NOT NULL DEFAULT 0.4 CHECK (tennis_w_terre BETWEEN 0 AND 1),
  tennis_w_gazon NUMERIC(4, 3) NOT NULL DEFAULT 0.4 CHECK (tennis_w_gazon BETWEEN 0 AND 1),
  sports TEXT[] NOT NULL DEFAULT ARRAY['E-sport', 'Tennis', 'Football', 'Basket', 'F1', 'Cyclisme', 'Autre'],
  compta_legacy_balance NUMERIC(12, 2) NOT NULL DEFAULT 1584.48,  -- Kelicful doit cette somme à Squawo (positif = dû à Squawo)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO app_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- Préférences par utilisateur
CREATE TABLE IF NOT EXISTS user_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  hidden_seasons INT[] NOT NULL DEFAULT '{}',
  last_sport TEXT,
  last_portfolio TEXT CHECK (last_portfolio IS NULL OR last_portfolio IN ('commun', 'kelicful', 'squawo')),
  ui_style TEXT CHECK (ui_style IS NULL OR ui_style IN ('suisse', 'terminal')),   -- apparence (migration 05)
  ui_mode TEXT CHECK (ui_mode IS NULL OR ui_mode IN ('clair', 'sombre')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Elo tennis (remplacé par collage depuis Tennis Abstract)
CREATE TABLE IF NOT EXISTS tennis_elo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour TEXT NOT NULL CHECK (tour IN ('ATP', 'WTA')),
  player TEXT NOT NULL,
  elo NUMERIC(8, 1),
  helo NUMERIC(8, 1),
  celo NUMERIC(8, 1),
  gelo NUMERIC(8, 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tour, player)
);

-- updated_at automatique
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bets_updated_at ON bets;
CREATE TRIGGER bets_updated_at BEFORE UPDATE ON bets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS user_prefs_updated_at ON user_prefs;
CREATE TRIGGER user_prefs_updated_at BEFORE UPDATE ON user_prefs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS : même politique que l'existant (tout utilisateur authentifié ; inscriptions fermées)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE compta_legacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tennis_elo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON profiles;
CREATE POLICY "auth_all" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON bets;
CREATE POLICY "auth_all" ON bets FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON money_moves;
CREATE POLICY "auth_all" ON money_moves FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON compta_legacy;
CREATE POLICY "auth_all" ON compta_legacy FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON app_settings;
CREATE POLICY "auth_all" ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON user_prefs;
CREATE POLICY "auth_all" ON user_prefs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON tennis_elo;
CREATE POLICY "auth_all" ON tennis_elo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Temps réel (comme les tables existantes)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE bets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE money_moves; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE app_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tennis_elo; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ─────────────── Historique des modifications (migration 20261110_02_historique) ───────────────

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
