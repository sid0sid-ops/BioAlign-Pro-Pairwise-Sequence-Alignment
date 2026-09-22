// Official EMBOSS needle/water scoring matrix defaults
const EMBOSS_MATRIX_GAPS = {
    BLOSUM62: { gapOpen: 10.0, gapExtend: 0.5 },
    BLOSUM45: { gapOpen: 14.0, gapExtend: 2.0 },
    BLOSUM50: { gapOpen: 10.0, gapExtend: 0.5 },
    BLOSUM80: { gapOpen: 10.0, gapExtend: 0.5 },
    BLOSUM90: { gapOpen: 10.0, gapExtend: 0.5 },
    PAM30: { gapOpen: 9.0, gapExtend: 1.0 },
    PAM70: { gapOpen: 10.0, gapExtend: 1.0 },
    PAM250: { gapOpen: 14.0, gapExtend: 2.0 },
    DNAFULL: { gapOpen: 10.0, gapExtend: 0.5 }
};

// Official NCBI blastp matrix defaults (Standard NCBI integer pairs)
const NCBI_BLASTP_GAPS = {
    BLOSUM62: { gapOpen: 11, gapExtend: 1 },
    BLOSUM45: { gapOpen: 15, gapExtend: 2 },
    BLOSUM50: { gapOpen: 13, gapExtend: 2 },
    BLOSUM80: { gapOpen: 10, gapExtend: 1 },
    BLOSUM90: { gapOpen: 10, gapExtend: 1 },
    PAM30: { gapOpen: 9, gapExtend: 1 },
    PAM70: { gapOpen: 10, gapExtend: 1 },
    PAM250: { gapOpen: 14, gapExtend: 2 }
};

export function getDefaults(state) {
    const defaults = {};

    if (state.alignmentType === 'blast') {
        defaults.wordSize = state.sequenceType === 'dna' ? 11 : 3;
        defaults.xDropoff = state.sequenceType === 'dna' ? 30 : 20;
        defaults.thresholdT = 11;
        defaults.expectThreshold = 0.05;
    }

    const targetMatrix = state.parameters.matrix;
    let defaultGaps = { gapOpen: 10.0, gapExtend: 0.5 };
    let defaultMatch;
    let defaultMismatch;

    if (state.alignmentType === 'blast') {
        if (state.sequenceType === 'protein') {
            defaultGaps = NCBI_BLASTP_GAPS[targetMatrix] || { gapOpen: 11, gapExtend: 1 };
            defaultMatch = 1;
            defaultMismatch = -3;
        } else {
            // NCBI blastn standard
            defaultGaps = { gapOpen: 5, gapExtend: 2 };
            defaultMatch = 1;
            defaultMismatch = -2;
        }
    } else if (state.gapMode === 'linear') {
        // Linear gap model (single per-residue penalty)
        if (state.sequenceType === 'protein') {
            defaultGaps = { gapOpen: 10, gapExtend: 0 };
            defaultMatch = 1;
            defaultMismatch = -3;
        } else {
            defaultGaps = { gapOpen: 10, gapExtend: 0 };
            defaultMatch = 5;
            defaultMismatch = -4;
        }
    } else {
        // EMBOSS Affine mode (needle / water)
        if (EMBOSS_MATRIX_GAPS[targetMatrix]) {
            defaultGaps = EMBOSS_MATRIX_GAPS[targetMatrix];
        }
        if (state.sequenceType === 'dna') {
            defaultMatch = 5;
            defaultMismatch = -4; // EDNAFULL identity / mismatch
        } else {
            defaultMatch = 1;
            defaultMismatch = -3;
        }
    }

    if (!state.ui.userModifiedGap || (state.sequenceType === 'dna' && state.scoringMode === 'CUSTOM')) {
        defaults.gapOpen = defaultGaps.gapOpen;
        defaults.gapExtend = defaultGaps.gapExtend;
    }

    if (state.sequenceType === 'dna' && state.scoringMode === 'CUSTOM') {
        defaults.matchScore = defaultMatch;
        defaults.mismatchPenalty = defaultMismatch;
    } else if (state.sequenceType === 'protein') {
        defaults.matchScore = defaultMatch;
        defaults.mismatchPenalty = defaultMismatch;
    }

    return defaults;
}
