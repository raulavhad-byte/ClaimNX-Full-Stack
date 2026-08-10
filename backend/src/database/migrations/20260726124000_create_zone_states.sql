BEGIN;

-- ============================================================================
-- TABLE: zone_states
-- Description: Maps operational zones to administrative states.
-- ============================================================================

CREATE TABLE zone_states (
    zone_id UUID NOT NULL,
    state_id UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    CONSTRAINT pk_zone_states
        PRIMARY KEY (zone_id, state_id),

    CONSTRAINT fk_zone_states_zone
        FOREIGN KEY (zone_id)
        REFERENCES zones(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_zone_states_state
        FOREIGN KEY (state_id)
        REFERENCES states(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE zone_states IS
'Maps operational zones to administrative states.';

COMMENT ON COLUMN zone_states.zone_id IS
'Reference to the operational zone.';

COMMENT ON COLUMN zone_states.state_id IS
'Reference to the administrative state.';

CREATE INDEX idx_zone_states_zone
    ON zone_states(zone_id);

CREATE INDEX idx_zone_states_state
    ON zone_states(state_id);

COMMIT;