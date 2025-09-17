-- Remover job boards duplicados, mantendo apenas o mais recente por workspace
WITH ranked_boards AS (
  SELECT id, workspace_id,
         ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at DESC) as rn
  FROM job_boards
  WHERE name = 'Board Padrão'
),
boards_to_delete AS (
  SELECT id FROM ranked_boards WHERE rn > 1
)
-- Primeiro, mover jobs dos boards que serão removidos para NULL
UPDATE jobs 
SET board_id = NULL 
WHERE board_id IN (SELECT id FROM boards_to_delete);

-- Depois remover os boards duplicados
DELETE FROM job_boards 
WHERE id IN (SELECT id FROM boards_to_delete);

-- Garantir que o board restante seja marcado como padrão se for o único
UPDATE job_boards 
SET is_default = true 
WHERE name = 'Board Padrão' 
AND workspace_id IN (
  SELECT workspace_id 
  FROM job_boards 
  WHERE name = 'Board Padrão'
  GROUP BY workspace_id 
  HAVING COUNT(*) = 1
);