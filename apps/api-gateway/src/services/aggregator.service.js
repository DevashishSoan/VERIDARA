/**
 * MetaAggregator Service
 * 
 * Aggregates scores from all 5 forensic layers using weighted logic.
 */
class MetaAggregator {
    constructor() {
        // Balanced Weights: Reducing over-reliance on a single model
        this.weights = {
            image: {
                visual: 0.50,    // Reduced from 0.70 to be more balanced
                metadata: 0.20,  // Increased from 0.10
                semantic: 0.30,  // Increased from 0.20
                temporal: 0.00,
                audio: 0.00
            },
            video: {
                visual: 0.30,
                temporal: 0.30,
                audio: 0.30,
                metadata: 0.10,
                semantic: 0.00
            },
            audio: {
                audio: 0.80,
                metadata: 0.20
            }
        };
    }

    /**
     * Calculates the final Trust Score using a weighted ensemble
     */
    calculateTrustScore(mediaType, layerScores) {
        const layerWeights = this.weights[mediaType] || this.weights.image;
        let totalWeightedScore = 0;
        let totalWeight = 0;
        let activeScores = [];

        // 1. Ensemble Calculation
        for (const [layer, rawScore] of Object.entries(layerScores)) {
            const weight = layerWeights[layer];
            if (weight === undefined || weight === 0) continue;

            const score = typeof rawScore === 'number' ? rawScore : 50;

            // Collect active signals for mean average fallback/comparison
            activeScores.push(score);

            totalWeightedScore += score * weight;
            totalWeight += weight;
        }

        // 2. Compute Weighted and Mean Results
        let weightedScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50;
        let meanScore = activeScores.length > 0
            ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length)
            : 50;

        // Final Score: A blend of weighted importance and raw mean consistency
        // This reduces the risk of one biased model dominating the result.
        let finalScore = Math.round((weightedScore * 0.7) + (meanScore * 0.3));

        // 3. Resilience Logic: High Inconsistency Check
        // If models wildly disagree (e.g., one says 90, another says 10), 
        // tilt towards caution (lower trust).
        if (activeScores.length > 1) {
            const maxScore = Math.max(...activeScores);
            const minScore = Math.min(...activeScores);
            if (maxScore - minScore > 60) {
                finalScore = Math.min(finalScore, 45); // Clamp to "Likely Synthetic"
            }
        }

        return {
            trust_score: finalScore,
            verdict: this.getVerdict(finalScore, layerScores),
            explanation: this.generateExplanation(finalScore, layerScores, activeScores)
        };
    }

    getVerdict(score, layers = {}) {
        if (score >= 85) return 'authentic';
        if (score >= 70) return 'probably_authentic';
        if (score >= 50) return 'inconclusive';
        if (score >= 30) return 'likely_synthetic';
        return 'synthetic';
    }

    generateExplanation(score, layers, activeScores) {
        if (score < 40) {
            return `Consensus amongst forensic layers indicates high probability of synthetic origins.`;
        }
        if (score >= 80) {
            return `Consistent natural signals detected across multiple forensic specialists. Support for authenticity is high.`;
        }
        return 'Forensic signals are mixed or lack strong diagnostic markers. Content is classified as inconclusive.';
    }
}

module.exports = new MetaAggregator();
