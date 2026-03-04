-- View definitions of the functions triggering on user registration
SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_name IN ('handle_new_user', 'check_first_user_admin', 'match_employee_email');
