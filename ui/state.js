import { getDefaults } from './defaults.js';
import { getDerivedUIState } from './rulesEngine.js';

export const state = {
    sequenceType: 'protein',
    alignmentType: 'global',
    scoringMode: 'MATRIX',
    gapMode: 'affine',
    parameters: {
        matchScore: 1,
        mismatchPenalty: -3,
        matrix: 'BLOSUM62',
        gapOpen: 10,
        gapExtend: 0.5,
        wordSize: 3,
        thresholdT: 11,
        xDropoff: 20,
        expectThreshold: 0.05,
        dbSize: null,
        penalizeEndGaps: false,
        endGapOpen: 10,
        endGapExtend: 0.5
    },
    ui: {
        userModifiedGap: false,
        hasSeenAdvanced: false
    }
};

const listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
}

export function getState() {
    return state;
}

export function updateState(action, payload) {
    // 1. Process explicit user change
    switch (action) {
        case 'INIT':
            break;
        case 'SET_SEQUENCE_TYPE':
            state.ui.userModifiedGap = false;
            state.sequenceType = payload;
            if (state.sequenceType === 'dna') {
                state.scoringMode = state.alignmentType === 'blast' ? 'CUSTOM' : 'CUSTOM';
                state.parameters.matrix = state.alignmentType === 'blast' ? 'BLASTN' : 'DNAFULL';
            } else if (state.sequenceType === 'protein') {
                state.scoringMode = 'MATRIX';
                state.parameters.matrix = 'BLOSUM62';
            }
            break;
        case 'SET_ALIGNMENT_TYPE':
            state.ui.userModifiedGap = false;
            state.alignmentType = payload;
            if (payload === 'blast' && state.sequenceType === 'dna') state.parameters.matrix = 'BLASTN';
            break;
        case 'SET_SCORING_MODE':
            if (state.sequenceType === 'dna') {
                state.scoringMode = payload;
                if (payload === 'MATRIX') {
                    state.parameters.matrix = state.alignmentType === 'blast' ? 'BLASTN' : 'DNAFULL';
                } else if (payload === 'CUSTOM') {
                    state.parameters.matrix = 'CUSTOM';
                }
            }
            break;
        case 'SET_GAP_MODE':
            state.ui.userModifiedGap = false;
            state.gapMode = payload;
            break;
        case 'SET_PARAMETER':
            state.parameters[payload.key] = payload.value;
            if (payload.key === 'gapOpen' || payload.key === 'gapExtend') {
                state.ui.userModifiedGap = true;
            } else if (payload.key === 'matrix') {
                state.ui.userModifiedGap = false; // allow auto-updates when matrix changes
            }
            break;
        case 'TOGGLE_ADVANCED_OPTIONS':
            state.ui.hasSeenAdvanced = true;
            break;
        case 'RESET_GAP_OVERRIDES':
            // Clear user override flag so defaults engine re-applies matrix-recommended values
            state.ui.userModifiedGap = false;
            break;
    }

    // 2. Resolve Constraints (Preserve user explicit choices)
    if (state.sequenceType === 'protein') {
        state.scoringMode = 'MATRIX';
        if (state.parameters.matrix === 'DNAFULL' || state.parameters.matrix === 'BLASTN') {
            state.parameters.matrix = 'BLOSUM62';
        }
    } else if (state.sequenceType === 'dna') {
        if (!['CUSTOM', 'DNAFULL', 'BLASTN'].includes(state.parameters.matrix)) {
            state.parameters.matrix = state.scoringMode === 'CUSTOM' ? 'CUSTOM' : 'DNAFULL';
        }
    }

    // 3. Apply Defaults for structural changes
    const structActions = [
        'INIT',
        'SET_SEQUENCE_TYPE',
        'SET_ALIGNMENT_TYPE',
        'SET_SCORING_MODE',
        'RESET_GAP_OVERRIDES',
        'SET_GAP_MODE'
    ];
    if (structActions.includes(action) || (action === 'SET_PARAMETER' && payload?.key === 'matrix')) {
        const d = getDefaults(state);
        Object.assign(state.parameters, d);
    }

    // 4. Determine UI output and Emit
    const derivedUI = getDerivedUIState(state);
    listeners.forEach((fn) => fn(state, derivedUI));
}
