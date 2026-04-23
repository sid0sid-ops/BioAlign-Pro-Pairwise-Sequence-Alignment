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
        forceAdvancedOptionsOpen: false,
        endGaps: false
    };

    const locks = {
        gapMode: false
    };

    const labels = {
        gapModeReason: "",
        matrixHint: ""
    };

    // ALIGNMENT TRUTH
    if (state.alignmentType === 'local') {
        locks.gapMode = true;
        labels.gapModeReason = "Locked to Affine by Smith-Waterman model";
        visibility.gapModeSelector = true; // Keep visible but locked
        visibility.forceAdvancedOptionsOpen = true; // Auto-open for expert mode
    } else if (state.alignmentType === 'blast') {
        locks.gapMode = true;
        labels.gapModeReason = "Locked to Linear by Karlin-Altschul statistics";
        visibility.gapModeSelector = true;
        visibility.wordSize = false;
        visibility.eValue = false;
        visibility.database = false;
        visibility.forceAdvancedOptionsOpen = true;
    }

    // SEQUENCE SCORING TRUTH
    if (state.gapMode === 'linear') {
        // NCBI Strict Mode (matches screenshots)
        visibility.scoringModeToggle = false;
        visibility.matrixSelector = false;
        visibility.dnaMatrices = false;
        visibility.proteinMatrices = false;

        if (state.sequenceType === 'dna') {
            visibility.matchMismatch = true;
        } else {
            visibility.matchMismatch = false;
        }
    } else {
        // EMBOSS / Typical Mode (Strict Matrix only)
        visibility.scoringModeToggle = false;
        visibility.matchMismatch = false;
        visibility.matrixSelector = true;

        if (state.sequenceType === 'dna') {
            visibility.proteinMatrices = false;
            visibility.dnaMatrices = true;
        } else { // protein
            visibility.proteinMatrices = true;
            visibility.dnaMatrices = false;
        }
    }

    // MATRIX DESCRIPTIONS
    const matrixHints = {
        'BLOSUM90': "Very strict — Closely related proteins",
        'BLOSUM80': "Strict — High similarity",
        'BLOSUM62': "Balanced (default) — General purpose",
        'BLOSUM50': "Relaxed — Moderate divergence",
        'BLOSUM45': "Very relaxed — Distant homologs",
        'PAM30': "Very strict — Short sequence alignments",
        'PAM70': "Medium strict — Moderate divergence",
        'PAM250': "Very relaxed — Highly divergent sequences",
        'DNAFULL': "Standard pure identity scoring model",
        'BLASTN': "Heuristic localized DNA scoring model"
    };
    labels.matrixHint = matrixHints[state.parameters.matrix] || "";

    visibility.endGaps = (state.gapMode === 'affine');

    return { visibility, locks, labels };
}
