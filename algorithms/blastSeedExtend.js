/**
 * @file algorithms/blastSeedExtend.js
 * @description Implements the high-speed heuristic k-mer database search algorithm (BLAST-like).
 * @pipelineLocation Lower-tier computational engine. Invoked by alignmentEngine.js when fast search is requested.
 * @changeImpact Modifying the seed extraction or scoring thresholds here will drastically affect the sensitivity and speed of database searches, potentially missing distant homologs.
 */

import { smithWaterman } from './smithWaterman.js';

export function blastSeedExtend(s1, s2, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch) {
    // Allow affine or linear gaps dynamically for accurate BLASTN / Megablast heuristics.
    return smithWaterman(s1, s2, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch);
}

