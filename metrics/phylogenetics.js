/**
 * @file metrics/phylogenetics.js
 * @description Computes evolutionary distance models (e.g. Jukes-Cantor, Poisson) based on sequence identity to infer evolutionary time.
 * @pipelineLocation Post-computation metrics phase. Supplements standard alignment stats with evolutionary context.
 * @changeImpact Altering logarithmic bounds here can easily introduce NaN errors if identity fractions approach 1.0 or 0.0 outside safe thresholds.
 */

/**
 * @file metrics/phylogenetics.js
 * @description Advanced evolutionary distance computations.
 * Calculates theoretical evolutionary distances from pairwise alignments
 * using Jukes-Cantor (DNA/RNA) and Poisson (Protein) correction models.
 */

function clampIdentity(identityFraction) {
    if (!isFinite(identityFraction)) return 0;
    return Math.max(0, Math.min(1, identityFraction));
}

/**
 * Calculates Jukes-Cantor evolutionary distance for nucleotide alignments.
 * Assuming equal base frequencies and uniform mutation rates.
 * Formula: d = -3/4 * ln(1 - 4/3 * p)
 * @param {number} identityFraction (0.0 to 1.0)
 * @returns {number|string} The distance d, or 'Undefined' if sequence divergence is too high.
 */
export function jukesCantorDistance(identityFraction) {
    const id = clampIdentity(identityFraction);
    const p = 1.0 - id;

    // Saturation threshold limit
    if (p >= 0.75) return '∞ (Saturation)';

    const inner = 1 - (4 / 3) * p;

    // Prevent log(0)
    if (inner <= 0) return '∞ (Saturation)';

    const d = -0.75 * Math.log(inner);
    return isFinite(d) ? parseFloat(d.toFixed(4)) : '∞ (Saturation)';
}

/**
 * Calculates Poisson structural distance for protein alignments.
 * Assuming uniform substitution rates across sites.
 * Formula: d = -ln(1 - p)
 * @param {number} identityFraction (0.0 to 1.0)
 * @returns {number|string} The distance d.
 */
export function poissonDistance(identityFraction) {
    const id = clampIdentity(identityFraction);
    const p = 1.0 - id;

    // Avoid log(0)
    if (p >= 0.999999) return '∞ (Saturation)';

    const inner = 1 - p;
    if (inner <= 0) return '∞ (Saturation)';

    const d = -Math.log(inner);
    return isFinite(d) ? parseFloat(d.toFixed(4)) : '∞ (Saturation)';
}

export function computeEvolutionaryDistance(identityFraction, seqType) {
    if (seqType === 'dna') {
        return {
            model: 'Jukes-Cantor',
            distance: jukesCantorDistance(identityFraction)
        };
    } else {
        return {
            model: 'Poisson',
            distance: poissonDistance(identityFraction)
        };
    }
}
