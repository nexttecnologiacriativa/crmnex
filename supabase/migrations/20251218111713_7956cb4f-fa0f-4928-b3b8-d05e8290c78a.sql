-- Delete duplicate job_boards using CTE to properly identify duplicates
WITH ranked_boards AS (
  SELECT id, workspace_id, name,
         ROW_NUMBER() OVER (PARTITION BY workspace_id, name ORDER BY created_at ASC) as rn
  FROM job_boards
)
DELETE FROM job_boards WHERE id IN (
  SELECT id FROM ranked_boards WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE job_boards 
ADD CONSTRAINT job_boards_workspace_name_unique 
UNIQUE (workspace_id, name);