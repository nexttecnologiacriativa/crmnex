-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to process automation queue every minute
-- This runs independently of the frontend being open
SELECT cron.schedule(
  'process-automation-queue',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url := 'https://mqotdnvwyjhyiqzbefpm.supabase.co/functions/v1/automation-processor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xb3RkbnZ3eWpoeWlxemJlZnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzU1NDQsImV4cCI6MjA3MzcxMTU0NH0.FK5nOddI6jwc9yxwDt5QPO89Yg7YrtKUnHieEu1AIRg"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);