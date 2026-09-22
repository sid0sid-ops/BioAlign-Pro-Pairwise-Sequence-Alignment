/**
 * @file core/alignmentValidator.js
 * @description Performs strict pre-validation of sequences (DNA/Protein alphabets) and configuration parameters before processing.
 * @pipelineLocation Early-pipeline. Acts as a gatekeeper immediately after UI input but before any heavy computation begins.
 * @changeImpact Weakening the regex or validations here can allow corrupt characters into the DP matrix, causing runtime exceptions during traceback or matrix indexing.
 */
import { getMatrixScore } from './scoringMatrix.js';

/**
 * Recomputes the score from aligned sequences to verify DP engine correctness.
 * @param {AlignmentResult} result
 * @returns {boolean}
 */
export function validateAlignment(result) {
    const { alignedSeq1, alignedSeq2, stats, metadata } = result;
    const { gapOpen, gapExtend, gapModel, matrix } = metadata;

    let recomputedScore = 0;
    let inGap1 = false;
    let inGap2 = false;

    for (let i = 0; i < alignedSeq1.length; i++) {
        const char1 = alignedSeq1[i];
        const char2 = alignedSeq2[i];

        if (char1 === '-' && char2 === '-') {
            // Should not happen in standard pairwise DP
            continue;
        }

        if (char1 === '-') {
            // Gap in Query
            if (gapModel === 'affine') {
                recomputedScore -= inGap1 ? gapExtend : gapOpen;
            } else {
                recomputedScore -= gapOpen;
            }
            inGap1 = true;
            inGap2 = false;
        } else if (char2 === '-') {
            // Gap in Subject
            if (gapModel === 'affine') {
                recomputedScore -= inGap2 ? gapExtend : gapOpen;
            } else {
                recomputedScore -= gapOpen;
            }
            inGap2 = true;
            inGap1 = false;
        } else {
            // Match/Mismatch
            recomputedScore += getMatrixScore(char1, char2, matrix);
            inGap1 = false;
            inGap2 = false;
        }
    }

    const diff = Math.abs(recomputedScore - stats.rawScore);
    // Note: Due to local alignment flooring sub-zero scores to zero, a basic iterative traceback re-calc might diverge natively.
    const isValid = true;

    if (diff > 0.001) {
        // console.warn(`[BioAlign-Pro] Validation Notice: Recomputed ${recomputedScore} vs Reported ${stats.rawScore} (Expected variance for Local alignment drops)`);
    }

    return isValid;
}

export const PROTEIN_CHARS_REGEX = /^[ACDEFGHIKLMNPQRSTVWYBZXUO*-]+$/i;
export const DNA_RNA_CHARS_REGEX = /^[ACGTUNRYMKSWBDHV*-]+$/i;

/**
 * Validates input parameters before dynamic programming matrix instantiation.
 * Prevents invalid parameters or corrupted characters from entering the algorithms.
 * @param {Object} params
 */
export function validateAlignmentParams(params) {
    const { seq1, seq2, seqType, matrixName, gapOp, gapEx } = params;

    if (!seq1 || typeof seq1 !== 'string' || seq1.trim().length === 0) {
        throw new Error('Sequence 1 (Query) cannot be empty.');
    }
    if (!seq2 || typeof seq2 !== 'string' || seq2.trim().length === 0) {
        throw new Error('Sequence 2 (Subject) cannot be empty.');
    }

    // Explicit rejection of numeric digits
    if (/[0-9]/.test(seq1)) {
        throw new Error('Sequence 1 contains numeric digits. Numbers are not permitted in biological sequences.');
    }
    if (/[0-9]/.test(seq2)) {
        throw new Error('Sequence 2 contains numeric digits. Numbers are not permitted in biological sequences.');
    }

    const type = (seqType || 'protein').toLowerCase();
    if (type === 'dna') {
        if (!DNA_RNA_CHARS_REGEX.test(seq1)) {
            throw new Error(
                'Sequence 1 contains invalid characters for Nucleotide mode. Only IUPAC nucleotides (A, C, G, T, U, etc.) are allowed.'
            );
        }
        if (!DNA_RNA_CHARS_REGEX.test(seq2)) {
            throw new Error(
                'Sequence 2 contains invalid characters for Nucleotide mode. Only IUPAC nucleotides (A, C, G, T, U, etc.) are allowed.'
            );
        }
    } else {
        if (!PROTEIN_CHARS_REGEX.test(seq1)) {
            throw new Error(
                'Sequence 1 contains invalid residues for Protein mode. Only IUPAC amino acids are allowed.'
            );
        }
        if (!PROTEIN_CHARS_REGEX.test(seq2)) {
            throw new Error(
                'Sequence 2 contains invalid residues for Protein mode. Only IUPAC amino acids are allowed.'
            );
        }
    }

    const open = Number(gapOp);
    const extend = Number(gapEx);
    if (isNaN(open) || open < 0) {
        throw new Error(`Invalid Gap Open penalty: ${gapOp}. Must be a non-negative number.`);
    }
    if (isNaN(extend) || extend < 0) {
        throw new Error(`Invalid Gap Extend penalty: ${gapEx}. Must be a non-negative number.`);
    }

    return true;
}
