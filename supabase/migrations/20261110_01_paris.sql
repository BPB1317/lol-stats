-- ============================================================
-- Étape 3 — Côté parieur : journal de paris, mouvements d'argent, compta historique,
-- réglages, préférences, Elo tennis. Aucune table existante n'est modifiée.
-- ============================================================

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
  game TEXT NOT NULL CHECK (length(trim(game)) > 0),
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
  kind TEXT NOT NULL CHECK (kind IN ('Retrait', 'Dépôt', 'Ajustement')),
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
