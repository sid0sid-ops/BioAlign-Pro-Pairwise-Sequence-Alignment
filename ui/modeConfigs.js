/**
 * @file ui/modeConfigs.js
 * @description Contains predefined UI presets (e.g. DNA vs Protein defaults, standard gap open/extend values) that populate form fields on mode switch.
 * @pipelineLocation Frontend state phase. Handles UX/UI ease-of-use functionalities.
 * @changeImpact Changing values here alters what a user sees by default, potentially steering them toward using sub-optimal penalty matrices.
 */

/**
 * @file ui/modeConfigs.js
 * @description Strict parameter standardization and mode-checking lookup logic.
 * @pipeline Assesses input conditions (DNA/Protein, Affine/Linear, Local/Global) and strictly standardizes the string format (e.g., protein_needle, dna_blast) used for scientific statistics output mapping.
 */
export const modeConfigs = {
    protein_needle: {
        algorithm: 'needleman_wunsch',
        gapModel: 'affine',
        matrix: 'BLOSUM62',
        gapOpen: 10,
        gapExtend: 0.5,
        local: false
    },
    protein_ncbi_global: {
        algorithm: 'needleman_wunsch',
        gapModel: 'linear',
        matrix: 'BLOSUM62',
        gapOpen: 11,
        gapExtend: 1,
        local: false
    },
    protein_water: {
        algorithm: 'smith_waterman',
        gapModel: 'affine',
        matrix: 'BLOSUM62',
        gapOpen: 10,
        gapExtend: 0.5,
        local: true
    },
    blastp_like: {
        algorithm: 'smith_waterman',
        gapModel: 'linear',
        matrix: 'BLOSUM62',
        gapOpen: 11,
        gapExtend: 1,
        local: true
    },
    dna_needle: {
        algorithm: 'needleman_wunsch',
        gapModel: 'affine',
        matrix: 'EDNAFULL',
        gapOpen: 10,
        gapExtend: 0.5,
        local: false
    },
    dna_water: {
        algorithm: 'smith_waterman',
        gapModel: 'affine',
        matrix: 'DNAFULL',
        gapOpen: 10,
        gapExtend: 0.5,
        local: true
    },
    blastn: {
        algorithm: 'smith_waterman',
        gapModel: 'linear',
        matrix: 'BLASTN',
        match: 2,
        mismatch: -3,
        gapOpen: 5,
        gapExtend: 2,
        local: true
    }
};

export function determineMode(seqType, isLocal, gapMath, matrix) {
    if (seqType === 'protein') {
        if (!isLocal) {
            return gapMath === 'affine' ? 'protein_needle' : 'protein_ncbi_global';
        } else {
            return gapMath === 'affine' ? 'protein_water' : 'blastp_like';
        }
    } else {
        if (!isLocal) {
            return 'dna_needle'; // Assuming affine for DNA global
        } else {
            return matrix === 'BLASTN' ? 'blastn' : 'dna_water';
        }
    }
}
