-- Force clean consumer progress data and verify

-- 1. Count before (for your reference in the results)
select count(*) as count_before from public.marketing_pipelines;

-- 2. Truncate (Force Clean)
truncate table public.marketing_pipelines cascade;

-- 3. Count after (should be 0)
select count(*) as count_after from public.marketing_pipelines;
