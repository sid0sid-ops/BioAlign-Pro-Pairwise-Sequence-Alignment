/**
 * @file core/gap.js
 * @description Centralizes the mathematical logic for gap penalty application, distinguishing between affine model states (gap open vs. extend) and linear models.
 * @pipelineLocation Lower-tier mathematical utility. Injected into DP algorithms during matrix initialization.
 * @changeImpact Changing how gap extension vs. gap opening is differentiated will destroy the biological accuracy of alignments, heavily favoring or punishing indels incorrectly.
 */

/**
 * linearGapPenalty — NCBI BLAST standard linear gap model
 * Formula: gap_open + k * gap_extend
 *
 * Note: Enforcing strict linear gap handling.
 * Often user passes raw gapOp which serves as the unit cost per gap.
 */
export const linearGapPenalty = (k, gapCost) => {
    if (k === 0) return 0;
    // Strict mathematical linear gap: gap = k * gapCost
    return k * gapCost;
};

/**
 * affineGapPenalty — EMBOSS (Gotoh) affine gap model
 * Formula: gap_open + (k - 1) * gap_extend
 */
export const affineGapPenalty = (k, gapOpen, gapExtend) => {
    if (k === 0) return 0;
    return gapOpen + (k - 1) * gapExtend;
};
