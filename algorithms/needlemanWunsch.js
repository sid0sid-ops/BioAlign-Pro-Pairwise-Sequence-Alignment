/**
 * @file algorithms/needlemanWunsch.js
 * @description Implements exactly the Needleman-Wunsch algorithm for global sequence alignment using affine gap penalties.
 * @pipelineLocation Lower-tier computational engine. Called within Web Workers to execute the full matrix DP fill.
 * @changeImpact Altering the mathematical DP recurrence relations here will invalidate the global optimal alignment warranty and could break traceback pathfinding.
 */

/**
 * @file algorithms/needlemanWunsch.js
 * @description Wraps the core DP implementation to enforce Global alignment metrics.
 * @pipeline Called exclusively by alignmentEngine.js when the user requests 'Global'. Configures the DP matrix routine with boundary penalty requirements to force end-to-end alignments.
 */
import { buildDPMatrix } from '../core/dpMatrix.js?v=27';
import { performTraceback } from '../core/traceback.js?v=27';

export function needlemanWunsch(s1, s2, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, onProgress = null) {
    const isLocal = false;
    const dp = buildDPMatrix(s1, s2, isLocal, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, onProgress);
    if (onProgress) onProgress('Traceback (Global)', 100);
    return { dp, tb: performTraceback(s1, s2, dp, matrixName, customMatch, customMismatch) };
}

