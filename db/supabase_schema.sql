-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'investigator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create investigations table
CREATE TABLE IF NOT EXISTS investigations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  overall_trust_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create forensic_results table
CREATE TABLE IF NOT EXISTS forensic_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investigation_id UUID REFERENCES investigations ON DELETE CASCADE NOT NULL,
  layer_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own investigations" ON investigations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own investigations" ON investigations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investigations" ON investigations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view results for their investigations" ON forensic_results FOR SELECT 
USING (EXISTS (SELECT 1 FROM investigations WHERE investigations.id = forensic_results.investigation_id AND investigations.user_id = auth.uid()));

-- Realtime enablement
ALTER PUBLICATION supabase_realtime ADD TABLE investigations;
ALTER PUBLICATION supabase_realtime ADD TABLE forensic_results;
