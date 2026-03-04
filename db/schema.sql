-- VERIDARA Initial Schema

CREATE TYPE job_status AS ENUM ('queued', 'processing', 'complete', 'failed', 'expired');
CREATE TYPE media_type AS ENUM ('image', 'video', 'audio', 'url');
CREATE TYPE verdict_type AS ENUM ('authentic', 'probably_authentic', 'inconclusive', 'likely_synthetic', 'synthetic');
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'business', 'enterprise');

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    plan plan_type DEFAULT 'free',
    api_quota INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan plan_type DEFAULT 'free',
    org_id UUID REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    media_type media_type NOT NULL,
    s3_key TEXT,
    status job_status DEFAULT 'queued',
    priority SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES analysis_jobs(id) UNIQUE,
    trust_score SMALLINT CHECK (trust_score >= 0 AND trust_score <= 100),
    verdict verdict_type,
    visual_score NUMERIC(5,2),
    temporal_score NUMERIC(5,2),
    audio_score NUMERIC(5,2),
    metadata_score NUMERIC(5,2),
    semantic_score NUMERIC(5,2),
    explanation TEXT,
    model_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jobs_user_status ON analysis_jobs(user_id, status);
CREATE INDEX idx_jobs_created_at ON analysis_jobs(created_at DESC);
CREATE INDEX idx_results_trust_score ON analysis_results(trust_score);
