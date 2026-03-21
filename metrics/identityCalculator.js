/**
 * @file metrics/identityCalculator.js
 * @description Utility to compute total sequence identity mathematically.
 * @pipeline Post-processing logic returning 2-decimal rounded identity percentages for final UI results summary metrics.
 */
export function calculateIdentity(matches, length) {
    if (length === 0) return '0.00';
    return ((matches / length) * 100).toFixed(2);
}
