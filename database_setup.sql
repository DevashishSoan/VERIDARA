-- Copy and paste this directly into the Supabase SQL Editor

-- Create the Analysis Jobs Table
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    media_type TEXT,
    s3_key TEXT,
    status TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the Analysis Results Table
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
    trust_score INT,
    verdict TEXT,
    visual_score INT,
    temporal_score INT,
    audio_score INT,
    metadata_score INT,
    semantic_score INT,
    explanation TEXT,
    model_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) so users can only see their own jobs
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

-- Allow users to insert and select their own jobs
CREATE POLICY "Users can insert their own jobs" 
    ON public.analysis_jobs FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can view their own jobs" 
    ON public.analysis_jobs FOR SELECT 
    USING (true);

-- Allow anyone to read the results
CREATE POLICY "Users can view results" 
    ON public.analysis_results FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert results" 
    ON public.analysis_results FOR INSERT 
    WITH CHECK (true);

-- Create System Config Table for dynamic discovery
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anyone to read the config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read config" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Allow anyone to upsert config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

-- Insert initial empty tunnel key
INSERT INTO public.system_config (key, value) VALUES ('active_tunnel_url', '') ON CONFLICT (key) DO NOTHING;
