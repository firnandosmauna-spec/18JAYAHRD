-- Audit sumber kelebihan payroll non-tukang, terutama selisih 35.000.
-- Fokus cek:
-- 1. Setting payroll global
-- 2. Tunjangan manual di profil karyawan
-- 3. Breakdown payroll tersimpan per periode

-- 1. Cek setting payroll global yang bisa menambah gaji otomatis
SELECT
    key,
    value,
    description
FROM system_settings
WHERE key IN (
    'payroll_allowance_meal',
    'payroll_allowance_gasoline',
    'payroll_allowance_position',
    'payroll_allowance_thr',
    'payroll_reward_perfect_attendance',
    'payroll_reward_target_achievement'
)
ORDER BY key;

-- 2. Cek karyawan non-tukang yang punya tunjangan manual di profil
SELECT
    e.id,
    e.name,
    e.position,
    COALESCE(d.name, '') AS department_name,
    COALESCE(e.allowances, '[]'::jsonb) AS employee_manual_allowances,
    COALESCE(e.deductions, '[]'::jsonb) AS employee_manual_deductions
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
WHERE NOT (
    COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
    OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
)
AND (
    COALESCE(e.allowances, '[]'::jsonb) <> '[]'::jsonb
    OR COALESCE(e.deductions, '[]'::jsonb) <> '[]'::jsonb
)
ORDER BY e.name;

-- 3. Cek payroll non-tukang yang punya total tunjangan tepat 35.000
SELECT
    p.id,
    e.name,
    e.position,
    COALESCE(d.name, '') AS department_name,
    p.period_month,
    p.period_year,
    p.base_salary,
    COALESCE(p.allowances, 0) AS allowances,
    COALESCE(p.meal_allowance, 0) AS meal_allowance,
    COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
    COALESCE(p.position_allowance, 0) AS position_allowance,
    COALESCE(p.discretionary_allowance, 0) AS discretionary_allowance,
    COALESCE(p.thr_allowance, 0) AS thr_allowance,
    COALESCE(p.reward_allowance, 0) AS reward_allowance,
    COALESCE(p.manual_allowance_details, '[]'::jsonb) AS manual_allowance_details,
    COALESCE(p.deductions, 0) AS deductions,
    p.net_salary
FROM payroll p
JOIN employees e ON e.id = p.employee_id
LEFT JOIN departments d ON d.id = e.department_id
WHERE NOT (
    COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
    OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
)
AND COALESCE(p.allowances, 0) = 35000
ORDER BY p.period_year DESC, p.period_month DESC, e.name;

-- 4. Cek semua payroll non-tukang dengan breakdown tunjangan lengkap
SELECT
    p.id,
    e.name,
    e.position,
    COALESCE(d.name, '') AS department_name,
    p.period_month,
    p.period_year,
    COALESCE(p.allowances, 0) AS allowances,
    COALESCE(p.meal_allowance, 0) AS meal_allowance,
    COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
    COALESCE(p.position_allowance, 0) AS position_allowance,
    COALESCE(p.discretionary_allowance, 0) AS discretionary_allowance,
    COALESCE(p.thr_allowance, 0) AS thr_allowance,
    COALESCE(p.reward_allowance, 0) AS reward_allowance,
    COALESCE(p.manual_allowance_details, '[]'::jsonb) AS manual_allowance_details,
    (
        COALESCE(p.meal_allowance, 0) +
        COALESCE(p.gasoline_allowance, 0) +
        COALESCE(p.position_allowance, 0) +
        COALESCE(p.discretionary_allowance, 0) +
        COALESCE(p.thr_allowance, 0)
    ) AS structured_allowance_total
FROM payroll p
JOIN employees e ON e.id = p.employee_id
LEFT JOIN departments d ON d.id = e.department_id
WHERE NOT (
    COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
    OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
)
ORDER BY p.period_year DESC, p.period_month DESC, e.name;
