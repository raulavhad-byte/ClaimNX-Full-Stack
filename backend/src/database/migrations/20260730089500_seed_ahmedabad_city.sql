BEGIN;

-- Phase 5 Location Management prerequisite for legacy Hospital address migration.
-- Ahmedabad is added only when it is absent under the existing Gujarat, India hierarchy.

DO $$
DECLARE
    migration_actor_id UUID := '09a6e607-4846-4d4d-9ad3-86ae90310f18';
    gujarat_state_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = migration_actor_id) THEN
        RAISE EXCEPTION 'Configured Phase 5 migration audit actor does not exist in public.users.';
    END IF;

    SELECT state.id
    INTO gujarat_state_id
    FROM states state
    JOIN countries country ON country.id = state.country_id
    WHERE LOWER(country.name) = 'india'
      AND LOWER(state.name) = 'gujarat';

    IF gujarat_state_id IS NULL THEN
        RAISE EXCEPTION 'Cannot seed Ahmedabad because Gujarat, India was not found in Location Management.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM cities city
        WHERE city.state_id = gujarat_state_id
          AND LOWER(city.name) = 'ahmedabad'
    ) THEN
        INSERT INTO cities (
            id,
            state_id,
            code,
            name,
            is_active,
            created_at,
            created_by,
            updated_at,
            updated_by,
            version
        )
        VALUES (
            gen_random_uuid(),
            gujarat_state_id,
            'AHMEDABAD',
            'Ahmedabad',
            TRUE,
            NOW(),
            migration_actor_id,
            NOW(),
            migration_actor_id,
            1
        );
    END IF;
END $$;

COMMIT;
