-- Run after the negative test script. It must return zero rows.
SELECT hospital_code, id
FROM public.hospitals
WHERE hospital_code LIKE 'HOSP-ROLLBACK-%'
  AND deleted_at IS NULL
  AND COALESCE(is_deleted, FALSE) = FALSE;
