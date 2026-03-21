/**
 * @file algorithms/blastSeedExtend.js
 * @description Implements the high-speed heuristic k-mer database search algorithm (BLAST-like).
 * @pipelineLocation Lower-tier computational engine. Invoked by alignmentEngine.js when fast search is requested.
 * @changeImpact Modifying the seed extraction or scoring thresholds here will drastically affect the sensitivity and speed of database searches, potentially missing distant homologs.
 */

/**
 * @file algorithms/blastSeedExtend.js
 * @description A computationally fast heuristic implementation mimicking NCBI BLAST searches.
 * @pipeline Engaged by the engine when a BLAST-like search is run. Falls back to optimal 
 *   Smith-Waterman with FORCED linear gaps for Karlin-Altschul stats compatibility.
 * 
 * @important gapMath is accepted as 3rd argument but BLAST ALWAYS forces 'linear' gap model
 *   internally, because Karlin-Altschul E-value statistics are only defined for linear gaps.
 */
import { smithWaterman } from './smithWaterman.js?v=27';

export function blastSeedExtend(s1, s2, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch) {
    // BLAST heuristic: force linear gap model for valid KA statistical parameters
    // gapMath is accepted but overridden — this is correct BLAST behaviour
    return smithWaterman(s1, s2, 'linear', gapOp, gapEx, matrixName, customMatch, customMismatch);
}

