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
                visual: 0.70,    // Heavier trust in visual forensics
                metadata: 0.10,  // Metadata is noisy in the wild
                semantic: 0.20,  // Contextual/format check
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
        const semantic = typeof layerScores.semantic === 'number' ? layerScores.semantic : null;

        const criticalSignals = [visual, metadata].filter(v => v !== null);
        const minCritical = criticalSignals.length ? Math.min(...criticalSignals) : null;

        if (minCritical !== null && minCritical < 30) {
            // Clamp only in truly critical cases, and even then
            // avoid forcing everything to the bottom.
            finalScore = Math.min(finalScore, Math.round((minCritical + finalScore) / 2));
        }

        // 3. If semantic layer is strongly suspicious (< 40),
        //    cap the overall trust score so clearly AI-like
        //    sizes/ratios cannot receive very high trust.
        if (semantic !== null && semantic < 40) {
            finalScore = Math.min(finalScore, Math.round((semantic + finalScore) / 2), 45);
        }

        return {
            trust_score: finalScore,
            verdict: this.getVerdict(finalScore, layerScores),
            explanation: this.generateExplanation(finalScore, layerScores)
        };
    }

    getVerdict(score, layers = {}) {
        const visual = typeof layers.visual === 'number' ? layers.visual : null;
        const metadata = typeof layers.metadata === 'number' ? layers.metadata : null;
        const semantic = typeof layers.semantic === 'number' ? layers.semantic : null;

        const strongVisualSuspicion = visual !== null && visual < 40;
        const strongMetaSuspicion = metadata !== null && metadata < 55;
        const strongSemanticSuspicion = semantic !== null && semantic < 50;

        // High-confidence synthetic: semantic + at least one other weak signal
        if (strongSemanticSuspicion && (strongVisualSuspicion || strongMetaSuspicion)) {
            return score < 60 ? 'synthetic' : 'likely_synthetic';
        }

        // Visual + metadata both weak (regardless of semantic)
        if (strongVisualSuspicion && strongMetaSuspicion) {
            return score < 55 ? 'synthetic' : 'likely_synthetic';
        }

        // If visual integrity is high and no other layer screams manipulation,
        // err on the side of "inconclusive" instead of "synthetic".
        if (visual !== null && visual >= 70 && !strongMetaSuspicion && !strongSemanticSuspicion) {
            if (score >= 90) return 'authentic';
            if (score >= 80) return 'probably_authentic';
            return 'inconclusive';
        }

        // Fallback purely numeric mapping (more conservative).
        if (score >= 90) return 'authentic';
        if (score >= 80) return 'probably_authentic';
        if (score >= 60) return 'inconclusive';
        if (score >= 45) return 'likely_synthetic';
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
