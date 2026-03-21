/**
 * @file core/contracts.js
 * @description Defines shared application constants, configuration enums, and default parameter specifications (effectively acting as TypeScript interfaces/types).
 * @pipelineLocation Global utility. Imported by nearly all modules (UI, Engine, and Algorithms) to ensure type and configuration consistency.
 * @changeImpact Changing enum values or default parameters here will cascade across the entire application, fundamentally altering how scores are parsed and UI modes are initialized.
 */

/**
 * @file core/contracts.js
 * @description Central data contracts for BioAlign-Pro. 
 * Enforces strict object shapes between the Engine, UI, and Export layers.
 */

/**
 * @typedef {Object} AlignmentRequest
 * @property {string} seq1 - First sequence (Query)
 * @property {string} seq2 - Second sequence (Subject)
 * @property {('protein'|'dna')} seqType - Type of chemical sequence
 * @property {string} algorithm - needleman_wunsch, smith_waterman, or blast
 * @property {('affine'|'linear')} gapModel - Gap penalty algorithm
 * @property {number} gapOpen - Penalty to open a gap
 * @property {number} gapExtend - Penalty to extend a gap
 * @property {string} matrixName - Name of the scoring matrix (e.g., BLOSUM62)
 * @property {number} [match] - Match score for linear DNA
 * @property {number} [mismatch] - Mismatch score for linear DNA
 * @property {number} [dbSize] - Effective database size for E-value
 * @property {boolean} [debug] - Enable scoring breakdowns
 */

/**
 * @typedef {Object} AlignmentResult
 * @property {string} alignedSeq1 - Aligned Query string
 * @property {string} alignedSeq2 - Aligned Subject string
 * @property {string} matchLine - Visualization symbols (| : .)
 * @property {Object} stats - Computed metrics
 * @property {number} stats.rawScore - Mathematical DP score
 * @property {number|null} stats.bitScore - Normalized bit score
 * @property {number|null} stats.eValue - Expect value
 * @property {number} stats.identity - Matches / Length
 * @property {number} stats.positives - Positive score residues / Length
 * @property {number} stats.gaps - Total gap characters
 * @property {number} stats.alignmentLength - Total columns in alignment
 * @property {number} stats.queryCoverage - Non-gap query residues / original query length
 * @property {boolean} stats.statsAvailable - Whether K-A stats were computed
 * @property {string|null} stats.statsReason - Explanation if stats are missing
 * @property {Object} metadata - Reproducibility data
 * @property {string} metadata.algorithm
 * @property {string} metadata.matrix
 * @property {string} metadata.gapModel
 * @property {number} metadata.gapOpen
 * @property {number} metadata.gapExtend
 * @property {string} metadata.timestamp
 * @property {Object} [debugInfo] - Optional breakdown for troubleshooting
 * @property {Array<[number, number]>} tracePath - Coordinate array for visualization
 * @property {Object} dp - Raw matrix data for renderers
 * @property {Float32Array} dp.H - Score matrix
 * @property {Uint8Array} dp.TB - Traceback matrix (0-3 codes)
 * @property {number} dp.n - Sequence 1 length
 * @property {number} dp.m - Sequence 2 length
 */

export const ALIGNMENT_TB = {
    STOP: 0,
    DIAGONAL: 1,
    UP: 2,
    LEFT: 3
};
