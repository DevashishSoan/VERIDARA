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
                visual: 0.60,    // Primary forensic signal
                metadata: 0.20,  // Secondary (easy to strip)
                semantic: 0.20,  // Contextual/Format check
                temporal: 0.00,
                audio: 0.00
            },
            video: {
                visual: 0.35,
                temporal: 0.35,
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

        // 1. Compute a weighted score using only layers that actually reported signals.
        //    We explicitly skip layers that are exactly 50 AND were never emitted
        //    by specialists to avoid "flattening" everything to 50.
        for (const [layer, rawScore] of Object.entries(layerScores)) {
            const weight = layerWeights[layer];
            if (weight === undefined) continue;

            const score = typeof rawScore === 'number' ? rawScore : 50;

            // Treat perfect "unknown / default" scores as missing for aggregation.
            if (score === 50 && (layer === 'temporal' || layer === 'audio' || layer === 'semantic')) {
                continue;
            }

            totalScore += score * weight;
            totalWeight += weight;
        }

        let finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

        // 2. Hard fail-safe: if any critical layer is extremely low, clamp the score down.
        const visual = typeof layerScores.visual === 'number' ? layerScores.visual : null;
        const metadata = typeof layerScores.metadata === 'number' ? layerScores.metadata : null;

        const criticalSignals = [visual, metadata].filter(v => v !== null);
        const minCritical = criticalSignals.length ? Math.min(...criticalSignals) : null;

        if (minCritical !== null && minCritical < 40) {
            // Aggressive Clamping: If visual or metadata is < 40, the final score
            // is strictly bounded to prevent "lucky" masks from other layers.
            finalScore = Math.min(finalScore, minCritical + 10);
        }

        return {
            trust_score: finalScore,
            verdict: this.getVerdict(finalScore),
            explanation: this.generateExplanation(finalScore, layerScores)
        };
    }

    getVerdict(score) {
        if (score >= 90) return 'authentic';
        if (score >= 82) return 'probably_authentic'; // Increased from 75
        if (score >= 60) return 'inconclusive'; // Tightened inconclusive range
        if (score >= 40) return 'likely_synthetic';
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
