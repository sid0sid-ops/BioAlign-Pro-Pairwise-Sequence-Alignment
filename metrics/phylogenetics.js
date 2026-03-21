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

/**
 * Calculates Jukes-Cantor evolutionary distance for nucleotide alignments.
 * Assuming equal base frequencies and uniform mutation rates.
 * Formula: d = -3/4 * ln(1 - 4/3 * p)
 * @param {number} identityFraction (0.0 to 1.0)
 * @returns {number|string} The distance d, or 'Undefined' if sequence divergence is too high.
 */
export function jukesCantorDistance(identityFraction) {
    const p = 1.0 - identityFraction;

    // Theoretical limit: Jukes-Cantor is undefined if p >= 0.75 (75% divergence).
    // In pairwise logic, that means identity <= 25%.
    if (p >= 0.75) return '∞ (Saturation)';

    const d = -0.75 * Math.log(1 - (4 / 3) * p);
    return parseFloat(d.toFixed(4));
}

/**
 * Calculates Poisson structural distance for protein alignments.
 * Assuming uniform substitution rates across sites.
 * Formula: d = -ln(1 - p)
 * @param {number} identityFraction (0.0 to 1.0)
 * @returns {number|string} The distance d.
 */
export function poissonDistance(identityFraction) {
    const p = Math.max(0, Math.min(0.9999, 1.0 - identityFraction));

    // Saturated sequences
    if (p >= 1.0) return '∞ (Saturation)';

    const d = -Math.log(1 - p);
    return parseFloat(d.toFixed(4));
}
