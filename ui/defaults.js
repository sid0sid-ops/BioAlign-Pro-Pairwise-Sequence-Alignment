export function getDefaults(state) {
    const defaults = {};

    if (state.alignmentType === 'blast') {
        defaults.wordSize = (state.sequenceType === 'dna') ? 11 : 3;
    }

    // Default matrix presets for EMPOSS (affine)
    const matrixGaps = {
        'BLOSUM90': { gapOpen: 12, gapExtend: 1 },
        'BLOSUM80': { gapOpen: 11, gapExtend: 1 },
        'BLOSUM62': { gapOpen: 10, gapExtend: 0.5 },
        'BLOSUM50': { gapOpen: 9, gapExtend: 0.5 },
        'BLOSUM45': { gapOpen: 8, gapExtend: 0.5 },
        'PAM30': { gapOpen: 12, gapExtend: 2 },
        'PAM70': { gapOpen: 10, gapExtend: 1 },
        'PAM250': { gapOpen: 8, gapExtend: 0.5 },
        'DNAFULL': { gapOpen: 10, gapExtend: 0.5 },
        'BLASTN': { gapOpen: 5, gapExtend: 2 }
    };

    const targetMatrix = state.parameters.matrix;

    // Determine defaults based on math mode (NCBI vs EMBOSS)
    let defaultGaps = { gapOpen: 10, gapExtend: 0.5 };
    let defaultMatch = 1;
    let defaultMismatch = -3;

    if (state.gapMode === 'linear') { // NCBI limits
        if (state.sequenceType === 'protein') {
            defaultGaps = { gapOpen: 11, gapExtend: 1 };
            defaultMatch = 1; defaultMismatch = -3;
        } else { // DNA
            defaultGaps = { gapOpen: 5, gapExtend: 2 };
            defaultMatch = 2; defaultMismatch = -3;
        }
    } else { // EMBOSS/Affine limits
        if (matrixGaps[targetMatrix]) defaultGaps = matrixGaps[targetMatrix];
        if (state.sequenceType === 'dna') {
            defaultMatch = 5; defaultMismatch = -4; // typical EMBOSS ednafull
        } else {
            defaultMatch = 1; defaultMismatch = -3;
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
