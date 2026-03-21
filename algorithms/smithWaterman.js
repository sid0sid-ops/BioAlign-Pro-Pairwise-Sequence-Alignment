/**
 * @file algorithms/smithWaterman.js
 * @description Implements the Smith-Waterman algorithm for local sequence alignment with support for affine gaps and zero-flooring.
 * @pipelineLocation Lower-tier computational engine. Computes optimal sub-segment alignments on a background thread.
 * @changeImpact Changing the zero-floor conditions or max-score tracking will directly break local alignment detection, causing it to behave erroneously like global alignment.
 */

/**
 * @file algorithms/smithWaterman.js
 * @description Wraps the core DP implementation to enforce Local alignment metrics.
 * @pipeline Called by alignmentEngine.js for 'Local' runs. Configures the DP matrix to floor negative scores to zero, ensuring optimal sub-region alignments without end-to-end penalization.
 */
import { buildDPMatrix } from '../core/dpMatrix.js?v=27';
import { performTraceback } from '../core/traceback.js?v=27';

export function smithWaterman(s1, s2, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, onProgress = null) {
    const isLocal = true;
    const dp = buildDPMatrix(s1, s2, isLocal, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, onProgress);
    if (onProgress) onProgress('Traceback (Local)', 100);
    return { dp, tb: performTraceback(s1, s2, dp, matrixName, customMatch, customMismatch) };
}

