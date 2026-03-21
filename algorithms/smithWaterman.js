/**
 * @file algorithms/smithWaterman.js
 * @description Wraps the core DP implementation to enforce Local alignment metrics.
 * @pipeline Called by alignmentEngine.js for 'Local' runs. Configures the DP matrix to floor negative scores to zero, ensuring optimal sub-region alignments without end-to-end penalization.
 */
import { buildDPMatrix } from '../core/dpMatrix.js?v=27';
import { performTraceback } from '../core/traceback.js?v=27';

export function smithWaterman(s1, s2, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch) {
    const isLocal = true;
    const dp = buildDPMatrix(s1, s2, isLocal, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch);
    return { dp, tb: performTraceback(s1, s2, dp, matrixName, customMatch, customMismatch) };
}

