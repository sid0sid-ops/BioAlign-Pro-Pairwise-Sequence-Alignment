/**
 * @file metrics/identityCalculator.js
 * @description Determines the exact percentage of identical residues versus similar (positive) residues between two aligned sequences.
 * @pipelineLocation Post-computation metrics phase. Feeds heavily into the visualization and summary UI panels.
 * @changeImpact Altering the denominator (e.g., shortest sequence vs aligned length) will violate standard identity reporting norms, leading to incorrect percent identity scores.
 */

/**
 * @file metrics/identityCalculator.js
 * @description Utility to compute total sequence identity mathematically.
 * @pipeline Post-processing logic returning 2-decimal rounded identity percentages for final UI results summary metrics.
 */
export function calculateIdentity(matches, length) {
    if (!length || length <= 0) return '0.00';
    if (!matches || matches < 0) matches = 0;

    const pct = (matches / length) * 100;
    return isFinite(pct) ? pct.toFixed(2) : '0.00';
}

export function calculateIdentityFromAlignment(seq1, seq2) {
    if (!seq1 || !seq2 || seq1.length !== seq2.length) {
        return { matches: 0, length: 0, identity: '0.00' };
    }

    let matches = 0;
    let length = seq1.length;

    for (let i = 0; i < length; i++) {
        if (seq1[i] === seq2[i]) matches++;
    }

    const identity = length > 0 ? ((matches / length) * 100).toFixed(2) : '0.00';
    return { matches, length, identity };
}
