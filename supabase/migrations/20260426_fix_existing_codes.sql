-- Batch update existing consumer codes to CUST-YYMMDD-SEQ format
-- Sequence restarts every single day
WITH numbered_consumers AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (
      PARTITION BY TO_CHAR(created_at, 'YYMMDD') 
      ORDER BY created_at ASC
    ) as seq, 
    created_at
  FROM public.consumer_profiles
)
UPDATE public.consumer_profiles
SET code = 'CUST-' || TO_CHAR(nc.created_at, 'YYMMDD') || '-' || LPAD(nc.seq::text, 3, '0')
FROM numbered_consumers nc
WHERE public.consumer_profiles.id = nc.id;
