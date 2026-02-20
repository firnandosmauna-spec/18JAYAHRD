-- Clean consumer progress data
-- "marketing_attachments" and "marketing_logs" might not exist in your database yet.
-- Using CASCADE on marketing_pipelines should clean up dependent rows if they exist and are linked.

truncate table public.marketing_pipelines cascade;
