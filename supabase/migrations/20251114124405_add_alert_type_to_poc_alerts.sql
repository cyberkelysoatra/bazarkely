-- ============================================================================
-- MIGRATION: Ajout de la colonne alert_type à poc_alerts
-- Date: 2025-11-14
-- Agent: Agent 02 - Database Schema Fix
-- ============================================================================
-- Description:
-- Ajoute la colonne alert_type manquante à la table poc_alerts.
-- Cette colonne est requise par pocAlertService.ts mais n'existe pas
-- dans la base de données (probablement créée avant la migration Phase 3).
-- ============================================================================

BEGIN;

-- Vérifier si la colonne existe déjà (sécurité)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'poc_alerts' 
      AND column_name = 'alert_type'
  ) THEN
    -- Ajouter la colonne avec valeur par défaut temporaire
    ALTER TABLE public.poc_alerts
      ADD COLUMN alert_type TEXT NOT NULL DEFAULT 'threshold_exceeded';
    
    -- Ajouter la contrainte CHECK pour les valeurs valides
    ALTER TABLE public.poc_alerts
      ADD CONSTRAINT check_alert_type_values 
      CHECK (alert_type IN ('threshold_exceeded', 'consumption_warning', 'stock_low'));
    
    -- Supprimer la valeur par défaut (maintenant que la contrainte est en place)
    ALTER TABLE public.poc_alerts
      ALTER COLUMN alert_type DROP DEFAULT;
    
    -- Ajouter le commentaire
    COMMENT ON COLUMN public.poc_alerts.alert_type IS 
      'Type: threshold_exceeded, consumption_warning, stock_low';
    
    -- Créer l'index si nécessaire
    CREATE INDEX IF NOT EXISTS idx_poc_alerts_alert_type 
      ON public.poc_alerts(alert_type);
    
    RAISE NOTICE 'Colonne alert_type ajoutée avec succès à poc_alerts';
  ELSE
    RAISE NOTICE 'Colonne alert_type existe déjà, aucune action nécessaire';
  END IF;
END $$;

-- Mettre à jour les lignes existantes si nécessaire
-- (Si des alertes existent sans type, on peut les marquer comme threshold_exceeded par défaut)
-- Note: Cette section est optionnelle si aucune donnée n'existe encore
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Compter les lignes avec alert_type NULL (ne devrait pas arriver avec NOT NULL)
  -- Mais au cas où, on les met à jour
  UPDATE public.poc_alerts
  SET alert_type = 'threshold_exceeded'
  WHERE alert_type IS NULL;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  IF rows_updated > 0 THEN
    RAISE NOTICE 'Mise à jour de % lignes avec alert_type NULL', rows_updated;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-MIGRATION
-- ============================================================================
-- Pour vérifier que la colonne existe:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'poc_alerts' 
--   AND column_name = 'alert_type';
-- ============================================================================




