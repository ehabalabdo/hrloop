-- ============================================================
-- HR Loop - Database Schema for Neon PostgreSQL
-- A comprehensive HR system for a 40-branch mobile phone retail chain
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE TYPE shift_status AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED');
CREATE TYPE attendance_type AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END');

-- ============================================================
-- 1. BRANCHES TABLE
-- ============================================================
CREATE TABLE branches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    address         TEXT,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    geofence_radius INTEGER NOT NULL DEFAULT 50,  -- in meters
    manager_id      UUID,                          -- FK added after users table
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USERS TABLE
-- ============================================================
CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name               VARCHAR(200) NOT NULL,
    email                   VARCHAR(255) NOT NULL UNIQUE,
    password_hash           TEXT NOT NULL,
    role                    user_role NOT NULL DEFAULT 'STAFF',
    primary_branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
    phone_number            VARCHAR(20),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,

    -- WebAuthn fields for biometric authentication (FaceID / TouchID)
    webauthn_credential_id  TEXT,
    webauthn_public_key     TEXT,
    webauthn_sign_count     INTEGER DEFAULT 0,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now add the FK from branches.manager_id -> users.id
ALTER TABLE branches
    ADD CONSTRAINT fk_branches_manager
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 3. AVAILABILITY TABLE
-- Weekly availability submissions by employees
-- ============================================================
CREATE TABLE availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sunday, 6=Saturday
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate entries for the same user on the same day
    UNIQUE (user_id, day_of_week),
    -- Ensure start_time < end_time
    CHECK (start_time < end_time)
);

-- ============================================================
-- 4. SHIFTS TABLE
-- Master schedule for all 40 branches
-- ============================================================
CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end   TIMESTAMPTZ NOT NULL,
    status          shift_status NOT NULL DEFAULT 'DRAFT',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure scheduled_start < scheduled_end
    CHECK (scheduled_start < scheduled_end)
);

-- ============================================================
-- 5. ATTENDANCE_LOGS TABLE
-- High-frequency write-optimized table for clock events
-- ============================================================
CREATE TABLE attendance_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift_id        UUID REFERENCES shifts(id) ON DELETE SET NULL,
    type            attendance_type NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    is_within_fence BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- 6. PAYROLL_PROFILES TABLE
-- Financial settings per employee
-- ============================================================
CREATE TABLE payroll_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    base_salary             DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    hourly_rate             DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    overtime_rate           DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    late_penalty_per_minute DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. MONTHLY_PAYSLIPS TABLE
-- ============================================================
CREATE TABLE monthly_payslips (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month               SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                SMALLINT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
    total_hours_worked  DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    total_overtime_hours DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    total_late_minutes  DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    total_deductions    DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_bonuses       DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    final_net_salary    DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One payslip per user per month
    UNIQUE (user_id, month, year)
);

-- ============================================================
-- INDEXES - Optimized for 40 branches, high-frequency queries
-- ============================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_primary_branch ON users(primary_branch_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Branches indexes
CREATE INDEX idx_branches_manager ON branches(manager_id);

-- Availability indexes
CREATE INDEX idx_availability_user ON availability(user_id);
CREATE INDEX idx_availability_day ON availability(day_of_week);

-- Shifts indexes (critical for scheduling across 40 branches)
CREATE INDEX idx_shifts_user ON shifts(user_id);
CREATE INDEX idx_shifts_branch ON shifts(branch_id);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_branch_date ON shifts(branch_id, date);         -- Composite: get all shifts for a branch on a date
CREATE INDEX idx_shifts_user_date ON shifts(user_id, date);             -- Composite: get all shifts for a user on a date

-- Attendance_Logs indexes (optimized for high-frequency writes & reads)
CREATE INDEX idx_attendance_user ON attendance_logs(user_id);
CREATE INDEX idx_attendance_shift ON attendance_logs(shift_id);
CREATE INDEX idx_attendance_timestamp ON attendance_logs(timestamp);
CREATE INDEX idx_attendance_type ON attendance_logs(type);
CREATE INDEX idx_attendance_user_shift ON attendance_logs(user_id, shift_id);  -- Composite: fast lookup per user per shift

-- Payroll indexes
CREATE INDEX idx_payroll_user ON payroll_profiles(user_id);

-- Payslips indexes
CREATE INDEX idx_payslips_user ON monthly_payslips(user_id);
CREATE INDEX idx_payslips_month_year ON monthly_payslips(month, year);
CREATE INDEX idx_payslips_user_period ON monthly_payslips(user_id, year, month);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Auto-update updated_at on row modification
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_availability_updated_at
    BEFORE UPDATE ON availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payroll_updated_at
    BEFORE UPDATE ON payroll_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
