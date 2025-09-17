-- Primeiro, identificar e remover jobs dos boards duplicados
UPDATE jobs 
SET board_id = NULL 
WHERE board_id IN (
  SELECT jb.id 
  FROM job_boards jb
  WHERE jb.name = 'Board Padrão'
  AND jb.id NOT IN (
    SELECT DISTINCT ON (workspace_id) id 
    FROM job_boards 
    WHERE name = 'Board Padrão'
    ORDER BY workspace_id, created_at DESC
  )
);

-- Remover boards duplicados, mantendo apenas o mais recente por workspace
DELETE FROM job_boards 
WHERE name = 'Board Padrão'
AND id NOT IN (
  SELECT DISTINCT ON (workspace_id) id 
  FROM job_boards 
  WHERE name = 'Board Padrão'
  ORDER BY workspace_id, created_at DESC
);

-- Marcar o board restante como padrão se for o único no workspace
UPDATE job_boards 
SET is_default = true 
WHERE name = 'Board Padrão';

-- Verificar quantos boards restaram por workspace
SELECT workspace_id, COUNT(*) as board_count 
FROM job_boards 
WHERE name = 'Board Padrão'
GROUP BY workspace_id;