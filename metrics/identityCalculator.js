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
    if (length === 0) return '0.00';
    return ((matches / length) * 100).toFixed(2);
}
