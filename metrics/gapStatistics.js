/**
 * @file metrics/gapStatistics.js
 * @description Traverses generated alignment strings to count total gaps, contiguous gap blocks, and average gap lengths.
 * @pipelineLocation Post-computation metrics phase. Reads the final assembled strings from traceback.js.
 * @changeImpact Modifying the gap regex or counting logic here will result in UI stat panels displaying wildly inaccurate insertion/deletion metrics.
 */

/**
 * @file metrics/gapStatistics.js
 * @description Formatter for indels (gaps) counting and mismatch extraction.
 * @pipeline Used in the post-processing phase inside alignmentEngine.js to derive the absolute tally of mismatches vs gaps based on the parsed sequence length against theoretical max match arrays.
 */
export function calculateGapPercentage(gaps, length) {
    if (length === 0) return '0.00';
    return ((gaps / length) * 100).toFixed(2);
}

export function calculateMismatches(length, matches, gaps) {
    return length - matches - gaps;
}
