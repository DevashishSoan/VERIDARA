/**
 * JobQueueManager
 * 
 * Logic to push jobs to a message queue (Redis/SQS).
 */
class JobQueueManager {
    constructor() {
        this.queue = []; // Local queue for development without Redis
    }

    /**
     * Pushes a new analysis job to the queue
     */
    async pushJob(jobId, mediaData) {
        const job = {
            jobId,
            mediaData,
            status: 'queued',
            enqueuedAt: new Date().toISOString()
        };

        this.queue.push(job);
        console.log(`[JobQueue] Job ${jobId} pushed to queue.`);

        // In production: await redis.lpush('jobs', JSON.stringify(job));
        return job;
    }

    /**
     * Fetches the next available job
     */
    async popJob() {
        return this.queue.shift();
    }
}

module.exports = new JobQueueManager();
