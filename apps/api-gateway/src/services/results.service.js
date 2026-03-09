const { supabase } = require('../config/supabase');

class ResultsService {
    /**
     * Saves a final analysis result to the database
     */
    async saveResult(jobId, stats, client = supabase) {
        const { trust_score, verdict, layers, explanation } = stats;

        try {
            // 1. Update job status
            const { error: invError } = await client
                .from('analysis_jobs')
                .update({
                    status: 'complete',
                    completed_at: new Date().toISOString()
                })
                .eq('id', jobId);

            if (invError) throw invError;

            // 2. Insert analysis result
            const { data, error: resError } = await client
                .from('analysis_results')
                .insert({
                    job_id: jobId,
                    trust_score: trust_score,
                    verdict: verdict,
                    visual_score: layers.visual || 0,
                    temporal_score: layers.temporal || 0,
                    audio_score: layers.audio || 0,
                    metadata_score: layers.metadata || 0,
                    semantic_score: layers.semantic || 0,
                    explanation: explanation,
                    model_version: 'v9'
                })
                .select();

            if (resError) throw resError;

            return data;
        } catch (err) {
            console.error('Error saving result to Supabase:', err.message);
            throw err;
        }
    }

    /**
     * Creates a new investigation record
     */
    async createInvestigation(userId, jobData, client = supabase) {
        try {
            const { data, error } = await client
                .from('analysis_jobs')
                .insert({
                    id: jobData.job_id,
                    user_id: userId,
                    media_type: jobData.media_type || 'image',
                    s3_key: jobData.s3_key || '',
                    status: 'processing'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error creating investigation in Supabase:', err.message);
            throw err;
        }
    }

    /**
     * Retrieves a result for a specific job
     */
    async getResultByJobId(jobId, client = supabase) {
        try {
            const { data: jobs, error } = await client
                .from('analysis_jobs')
                .select('*, analysis_results(*)')
                .eq('id', jobId)
                .limit(1);

            if (error) throw error;
            let data = jobs && jobs.length > 0 ? jobs[0] : null;

            // FALLBACK: If job metadata is missing but results exist (e.g. legacy or demo data)
            if (!data) {
                const { data: results, error: resError } = await client
                    .from('analysis_results')
                    .select('*')
                    .eq('job_id', jobId)
                    .limit(1);

                if (resError || !results || results.length === 0) return null;

                const res = results[0];
                data = {
                    id: jobId,
                    status: 'complete',
                    created_at: res.created_at,
                    analysis_results: [res]
                };
            }

            // Transform analysis_results into layers object for frontend
            if (data && data.analysis_results && data.analysis_results[0]) {
                const res = data.analysis_results[0];
                data.trust_score = res.trust_score;
                data.verdict = res.verdict;
                data.explanation = res.explanation; // Ensure explanation is carried over
                data.layers = {
                    visual: res.visual_score,
                    temporal: res.temporal_score,
                    audio: res.audio_score,
                    metadata: res.metadata_score,
                    semantic: res.semantic_score
                };
            }

            return data;
        } catch (err) {
            console.error('Error fetching result from Supabase:', err.message);
            return null;
        }
    }

    /**
     * Retrieves recent analysis jobs for a user
     */
    async getUserHistory(userId, limit = 10, client = supabase) {
        try {
            const { data, error } = await client
                .from('analysis_jobs')
                .select('*, analysis_results(trust_score, verdict)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error fetching history from Supabase:', err.message);
            return [];
        }
    }
}

module.exports = new ResultsService();
