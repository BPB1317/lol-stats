-- ============================================================
-- LoL Stats — Schéma Supabase
-- Coller ce SQL dans l'éditeur SQL de ton projet Supabase
-- ============================================================

-- Ligues
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  season TEXT NOT NULL,
  threshold FLOAT NOT NULL DEFAULT 0.85,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Équipes
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, name)
);

-- Baselines manuelles (équivalent des lignes "Input" dans l'Excel)
-- Permet de réinitialiser le rating d'une équipe à une date donnée
CREATE TABLE team_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rating FLOAT NOT NULL CHECK (rating >= 0 AND rating <= 1),
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matchs
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team1_id UUID NOT NULL REFERENCES teams(id),
  team2_id UUID NOT NULL REFERENCES teams(id),
  winner_id UUID REFERENCES teams(id),
  score TEXT,
  stage TEXT NOT NULL DEFAULT 'WEEK1',
  match_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes de match (équivalent des colonnes V-Z dans l'Excel)
-- note_team1 ∈ [0, threshold] ; note_team2 = 1 - note_team1
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

-- ============================================================
-- Row Level Security : tous les users authentifiés peuvent tout faire
-- ============================================================
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON leagues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON teams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON team_baselines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON matches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON match_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Données d'exemple (ligues de l'Excel original — optionnel)
-- ============================================================
INSERT INTO leagues (name, short_name, season, threshold, sort_order) VALUES
  ('CBLOL SP26', 'CBLOL', 'SP26', 0.85, 1),
  ('LEC SP26',   'LEC',   'SP26', 0.85, 2),
  ('LCK R1-R2',  'LCK',   'R1-R2', 0.90, 3),
  ('LCS SP26',   'LCS',   'SP26', 0.85, 4),
  ('LFL SP26',   'LFL',   'SP26', 0.85, 5),
  ('LPL SP26',   'LPL',   'SP26', 0.90, 6),
  ('PRM SP26',   'PRM',   'SP26', 0.85, 7),
  ('EMEA Masters W26', 'EMEA', 'W26', 0.85, 8);
