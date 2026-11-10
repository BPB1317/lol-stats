-- ============================================================
-- Règlement entre nous : un paiement de l'un à l'autre pour solder la compta.
-- C'est un mouvement d'argent de type « Règlement » : person = celui qui paie, amount = montant payé.
-- Il fait évoluer le solde « qui doit combien à qui », jamais la bankroll ni les bilans.
-- ============================================================

ALTER TABLE money_moves DROP CONSTRAINT IF EXISTS money_moves_kind_check;
ALTER TABLE money_moves ADD CONSTRAINT money_moves_kind_check
  CHECK (kind IN ('Retrait', 'Dépôt', 'Ajustement', 'Règlement'));
