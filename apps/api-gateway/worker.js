/**
 * Mock ML Worker
 * 
 * Simulates a worker picking up jobs from the queue and "processing" them.
 */
const queue = require('./src/services/queue.service');

async function startWorker() {
    console.log('Worker started. Listening for jobs...');

    while (true) {
        const job = await queue.popJob();

        if (job) {
            console.log(`[Worker] Picking up job: ${job.jobId}`);

            // Simulate processing time
            await new Promise(res => setTimeout(res, 5000));

            console.log(`[Worker] Job ${job.jobId} processed. Trust Score generated.`);

            // In production: write results to DB and emit notification
        }

        await new Promise(res => setTimeout(res, 2000)); // Poll every 2s
    }
}

module.exports = { startWorker };
