-- List all triggers in the public schema
SELECT 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_schema,
    trigger_name,
    string_agg(event_manipulation, ',') as event,
    action_timing as activation,
    action_condition as condition,
    action_statement as definition
FROM information_schema.triggers
WHERE event_object_schema = 'public'
GROUP BY 1,2,3,4,6,7,8
ORDER BY table_schema, table_name;

-- List all functions
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
AND specific_schema = 'public';
