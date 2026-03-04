/**
 * MetaAggregator Service
 * 
 * Aggregates scores from all 5 forensic layers using weighted logic.
 */
class MetaAggregator {
    constructor() {
        // Weights based on media type (Simplified)
        this.weights = {
            image: {
                visual: 0.50,
                metadata: 0.30,
                semantic: 0.20,
                temporal: 0.00,
                audio: 0.00
            },
            video: {
                visual: 0.30,
                temporal: 0.40,
                audio: 0.20,
                metadata: 0.10,
                semantic: 0.00
            }
        };
    }

    /**
     * Calculates the final Trust Score
     */
    calculateTrustScore(mediaType, layerScores) {
        const layerWeights = this.weights[mediaType] || this.weights.image;
        let totalScore = 0;
        let totalWeight = 0;

        for (const [layer, score] of Object.entries(layerScores)) {
            if (layerWeights[layer] !== undefined) {
                totalScore += score * layerWeights[layer];
                totalWeight += layerWeights[layer];
            }
        }

        // Normalize if weights don't sum to 1
        const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

        return {
            trust_score: finalScore,
            verdict: this.getVerdict(finalScore),
            explanation: this.generateExplanation(finalScore, layerScores)
        };
    }

    getVerdict(score) {
        if (score >= 90) return 'authentic';
        if (score >= 70) return 'probably_authentic';
        if (score >= 40) return 'inconclusive';
        if (score >= 20) return 'likely_synthetic';
        return 'synthetic';
    }

    generateExplanation(score, layers) {
        if (score < 40) {
            const failingLayer = Object.entries(layers).sort((a, b) => a[1] - b[1])[0];
            return `Critical manipulation detected in ${failingLayer[0]} layer. Trust score reflects high probability of synthetic origins.`;
        }
        return 'Majority of authentication layers show consistent signals. Content appears likely authentic.';
    }
}

module.exports = new MetaAggregator();
