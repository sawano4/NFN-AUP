-- PostgreSQL Schema (ready to copy/paste)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- RACE REFERENTIAL
-- =====================================================
CREATE TABLE race_referential (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avg_fleece_weight_kg NUMERIC(6,3) NOT NULL,
    wool_type_default SMALLINT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TRANSPORTERS
-- =====================================================
CREATE TABLE transporter_referential (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    siret VARCHAR(20),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    vehicle_capacity_kg NUMERIC(10,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- THRESHOLDS
-- =====================================================
CREATE TABLE threshold_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transition VARCHAR(50) UNIQUE NOT NULL,
    weight_deviation_pct NUMERIC(5,2) NOT NULL,
    delay_hours INTEGER NOT NULL,
    temp_max_celsius NUMERIC(5,2),
    humidity_max_pct NUMERIC(5,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SOURCES
-- =====================================================
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    berger_number VARCHAR(100),
    siret VARCHAR(20),
    legal_form VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    department VARCHAR(100),
    gps_lat NUMERIC(10,8),
    gps_lon NUMERIC(11,8),
    email VARCHAR(255),
    phone VARCHAR(50),
    race_id UUID REFERENCES race_referential(id),
    num_heads INTEGER,
    estimated_volume_kg NUMERIC(10,2),
    shearing_frequency VARCHAR(20),
    avg_shearing_date VARCHAR(20),
    slaughterhouse_number VARCHAR(100),
    slaughterhouse_capacity INTEGER,
    status VARCHAR(20) NOT NULL,
    rejection_motive TEXT,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DEPOTS
-- =====================================================
CREATE TABLE depots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    department VARCHAR(100),
    gps_lat NUMERIC(10,8),
    gps_lon NUMERIC(11,8),
    capacity_kg NUMERIC(10,2),
    surface_m2 NUMERIC(10,2),
    manager_user_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id)
);

-- =====================================================
-- LAVERIES
-- =====================================================
CREATE TABLE laveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    capacity_kg_per_day NUMERIC(10,2),
    water_source VARCHAR(100),
    water_recycling BOOLEAN,
    detergent_type VARCHAR(100),
    manager_user_id UUID REFERENCES users(id)
);

-- =====================================================
-- TRANSFORMATEURS
-- =====================================================
CREATE TABLE transformateurs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    transformer_type VARCHAR(5) NOT NULL,
    capacity_kg_per_day NUMERIC(10,2),
    products_t1 TEXT[],
    products_t2 TEXT[],
    siret VARCHAR(20),
    manager_user_id UUID REFERENCES users(id)
);

-- =====================================================
-- LOTS
-- =====================================================
CREATE TABLE lots (
    id VARCHAR(20) PRIMARY KEY,
    source_id UUID REFERENCES sources(id),
    source_type VARCHAR(20) NOT NULL,
    stage VARCHAR(50) NOT NULL,

    collection_type VARCHAR(20),
    breed VARCHAR(255),
    shearing_date DATE,
    collection_date DATE,
    agent_id UUID REFERENCES users(id),

    estimated_weight_kg NUMERIC(10,3),
    wool_color VARCHAR(100),

    depot_temperature_celsius NUMERIC(5,2),
    depot_vm_rate_pct NUMERIC(5,2),

    washer_entry_date TIMESTAMPTZ,
    washer_net_dry_weight_kg NUMERIC(10,3),

    t1_entry_date TIMESTAMPTZ,
    t1_weight_received_kg NUMERIC(10,3),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- BDCs
-- =====================================================
CREATE TABLE bdcs (
    id VARCHAR(20) PRIMARY KEY,
    emitter_user_id UUID REFERENCES users(id),
    destination_type VARCHAR(50) NOT NULL,
    total_weight_sent_kg NUMERIC(10,3) NOT NULL,
    weight_received_kg NUMERIC(10,3),
    transporter_id UUID REFERENCES transporter_referential(id),

    deadline TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,

    pdf_url TEXT,
    qr_code_url TEXT,

    email_sent_at TIMESTAMPTZ,
    emitted_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,

    depot_id UUID REFERENCES depots(id),
    laverie_id UUID REFERENCES laveries(id),
    transformateur_id UUID REFERENCES transformateurs(id),

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- MANY TO MANY
-- =====================================================
CREATE TABLE bdc_lots (
    bdc_id VARCHAR(20) REFERENCES bdcs(id) ON DELETE CASCADE,
    lot_id VARCHAR(20) REFERENCES lots(id) ON DELETE CASCADE,
    PRIMARY KEY (bdc_id, lot_id)
);

-- =====================================================
-- WEIGHT CHECKS
-- =====================================================
CREATE TABLE weight_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_id VARCHAR(20) NOT NULL REFERENCES lots(id),
    bdc_id VARCHAR(20) REFERENCES bdcs(id),
    transition VARCHAR(50) NOT NULL,
    weight_in_kg NUMERIC(10,3) NOT NULL,
    weight_out_kg NUMERIC(10,3) NOT NULL,
    deviation_pct NUMERIC(8,4) NOT NULL,
    threshold_pct NUMERIC(5,2) NOT NULL,
    is_breached BOOLEAN NOT NULL
);

-- =====================================================
-- AUDIT LOG
-- =====================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL REFERENCES users(id),
    actor_role VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    correction_motive TEXT,
    ip_address INET,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);