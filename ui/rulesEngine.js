export function getDerivedUIState(state) {
    const visibility = {
        gapModeSelector: true,
        wordSize: false,
        eValue: false,
        database: false,
        matchMismatch: false,
        proteinMatrices: false,
        dnaMatrices: false,
        scoringModeToggle: false,
        matrixSelector: true,
        gapOpenExtend: true,
        gapExtend: state.gapMode === 'affine',
        forceAdvancedOptionsOpen: false,
        endGaps: false
    };

    const locks = {
        gapMode: false
    };

    const labels = {
        gapModeReason: '',
        matrixHint: ''
    };

    // ALIGNMENT CONFIGURATION
    locks.gapMode = false;
    visibility.gapModeSelector = true;

    if (state.alignmentType === 'blast') {
        visibility.wordSize = true;
        visibility.eValue = true;
        visibility.database = true;
        visibility.forceAdvancedOptionsOpen = true;
    }

    // SEQUENCE SCORING TRUTH
    if (state.sequenceType === 'protein') {
        visibility.scoringModeToggle = false;
        visibility.matchMismatch = false;
        visibility.matrixSelector = true;
        visibility.proteinMatrices = true;
        visibility.dnaMatrices = false;
    } else {
        // dna
        visibility.proteinMatrices = false;
        visibility.dnaMatrices = true;
        visibility.scoringModeToggle = true;
        if (state.scoringMode === 'CUSTOM') {
            visibility.matchMismatch = true;
            visibility.matrixSelector = false;
        } else {
            visibility.matchMismatch = false;
            visibility.matrixSelector = true;
        }
    }

    // MATRIX DESCRIPTIONS
    const matrixHints = {
        BLOSUM90: 'Very strict — Closely related proteins',
        BLOSUM80: 'Strict — High similarity',
        BLOSUM62: 'Balanced (default) — General purpose',
        BLOSUM50: 'Relaxed — Moderate divergence',
        BLOSUM45: 'Very relaxed — Distant homologs',
        PAM30: 'Very strict — Short sequence alignments',
        PAM70: 'Medium strict — Moderate divergence',
        PAM250: 'Very relaxed — Highly divergent sequences',
        DNAFULL: 'Standard pure identity scoring model',
        BLASTN: 'Heuristic localized DNA scoring model'
    };
    labels.matrixHint = matrixHints[state.parameters.matrix] || '';

    // End gaps are strictly applicable to Global Alignment (Needleman-Wunsch) with affine gaps
    visibility.endGaps = state.alignmentType === 'global' && state.gapMode === 'affine';

    return { visibility, locks, labels };
}
