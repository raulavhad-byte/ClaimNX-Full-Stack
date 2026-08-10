BEGIN;

-- Phase 5 aggregate integrity.
-- A Hospital may select only an Address or Contact that belongs to that same Hospital.

DO $$
BEGIN
    IF to_regclass('public.hospital_address') IS NULL
       OR to_regclass('public.hospital_contact') IS NULL THEN
        RAISE EXCEPTION 'Hospital Address and Contact tables must exist before primary-child integrity is enforced.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.hospitals hospital
        LEFT JOIN public.hospital_address address
            ON address.hospital_address_id = hospital.primary_address_id
        WHERE hospital.primary_address_id IS NOT NULL
          AND (
              address.hospital_address_id IS NULL
              OR address.hospital_id <> hospital.id
          )
    ) THEN
        RAISE EXCEPTION 'A Hospital primary_address_id does not belong to the same Hospital.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.hospitals hospital
        LEFT JOIN public.hospital_contact contact
            ON contact.hospital_contact_id = hospital.primary_contact_id
        WHERE hospital.primary_contact_id IS NOT NULL
          AND (
              contact.hospital_contact_id IS NULL
              OR contact.hospital_id <> hospital.id
          )
    ) THEN
        RAISE EXCEPTION 'A Hospital primary_contact_id does not belong to the same Hospital.';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_address'::regclass
          AND conname = 'uq_hospital_address_hospital_address'
    ) THEN
        ALTER TABLE public.hospital_address
            ADD CONSTRAINT uq_hospital_address_hospital_address
            UNIQUE (hospital_id, hospital_address_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_contact'::regclass
          AND conname = 'uq_hospital_contact_hospital_contact'
    ) THEN
        ALTER TABLE public.hospital_contact
            ADD CONSTRAINT uq_hospital_contact_hospital_contact
            UNIQUE (hospital_id, hospital_contact_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'fk_hospitals_primary_address'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT fk_hospitals_primary_address
            FOREIGN KEY (id, primary_address_id)
            REFERENCES public.hospital_address (hospital_id, hospital_address_id)
            ON DELETE RESTRICT
            DEFERRABLE INITIALLY DEFERRED;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'fk_hospitals_primary_contact'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT fk_hospitals_primary_contact
            FOREIGN KEY (id, primary_contact_id)
            REFERENCES public.hospital_contact (hospital_id, hospital_contact_id)
            ON DELETE RESTRICT
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

COMMIT;
