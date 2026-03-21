/**
 * @file metrics/blastStatistics.js
 * @description Computes E-values, Bit-scores, and P-values using Karlin-Altschul statistics to determine the probabilistic significance of an alignment.
 * @pipelineLocation Post-computation statistics phase. Runs independently after raw scores are generated.
 * @changeImpact Changing the logarithmic or exponential constants here will completely invalidate the E-value significance reports, misleading researchers.
 */

/**
 * @file metrics/blastStatistics.js
 * @description Implementation of Karlin-Altschul statistics for calculating Bit Scores and E-values.
 * @pipeline Engaged after an alignment succeeds. Assesses the raw Smith-Waterman score against lambda and K parameters derived from standard combinations of gap penalties and scoring matrices.
 */
const KA_PARAMS_TABLE = {
    'BLOSUM62': {
        default: { lambda: 0.267, K: 0.041, H: 0.14 },
        table: [
            { open: 11, extend: 2, lambda: 0.297, K: 0.082, H: 0.27 },
            { open: 11, extend: 1, lambda: 0.267, K: 0.041, H: 0.14 },
            { open: 10, extend: 2, lambda: 0.291, K: 0.075, H: 0.23 },
            { open: 10, extend: 1, lambda: 0.243, K: 0.033, H: 0.10 },
            { open: 9, extend: 2, lambda: 0.279, K: 0.058, H: 0.19 },
            { open: 8, extend: 2, lambda: 0.261, K: 0.045, H: 0.15 },
        ]
    },
    'BLOSUM45': {
        default: { lambda: 0.200, K: 0.033, H: 0.09 },
        table: [
            { open: 14, extend: 2, lambda: 0.210, K: 0.036, H: 0.09 },
            { open: 13, extend: 3, lambda: 0.207, K: 0.049, H: 0.14 },
        ]
    },
    'BLOSUM50': {
        default: { lambda: 0.232, K: 0.048, H: 0.14 },
        table: [
            { open: 13, extend: 2, lambda: 0.246, K: 0.061, H: 0.18 },
            { open: 12, extend: 2, lambda: 0.243, K: 0.057, H: 0.16 },
        ]
    },
    'BLOSUM80': {
        default: { lambda: 0.318, K: 0.087, H: 0.38 },
        table: [
            { open: 10, extend: 1, lambda: 0.299, K: 0.068, H: 0.25 },
            { open: 25, extend: 2, lambda: 0.342, K: 0.170, H: 0.67 },
        ]
    },
    'BLOSUM90': { default: { lambda: 0.342, K: 0.111, H: 0.46 } },
    'PAM30': { default: { lambda: 0.297, K: 0.110, H: 0.49 } },
    'PAM70': { default: { lambda: 0.284, K: 0.076, H: 0.31 } },
    'PAM250': { default: { lambda: 0.225, K: 0.038, H: 0.11 } },
    'BLASTP': { default: { lambda: 0.267, K: 0.041, H: 0.14 } },
    'BLASTN': {
        default: { lambda: 1.370, K: 0.711, H: 1.31 },
        table: [
            { open: 5, extend: 2, lambda: 1.370, K: 0.711, H: 1.310 },
            { open: 4, extend: 2, lambda: 1.370, K: 0.711, H: 1.310 },
            { open: 5, extend: 1, lambda: 1.370, K: 0.711, H: 1.310 },
        ]
    },
    'DNAFULL': { default: { lambda: 1.370, K: 0.711, H: 1.31 } }
};

export function getKAParams(matrixName, gapOpen, gapExtend) {
    const entry = KA_PARAMS_TABLE[matrixName];
    if (!entry) return null;
    if (entry.table) {
        const go = Math.round(gapOpen);
        const ge = Math.round(gapExtend * 10) / 10;
        const hit = entry.table.find(r => r.open === go && r.extend === ge);
        if (hit) return { lambda: hit.lambda, K: hit.K, H: hit.H };
    }
    return entry.default || null;
}

export function isStatsValid(gapMath, algoType, matrixName, gapOpen, gapExtend) {
    if (gapMath !== 'linear') return { valid: false, reason: 'EMBOSS affine gap model — KA stats undefined' };
    if (algoType === 'global' || algoType === 'needleman_wunsch') return { valid: false, reason: 'Global alignment — KA stats not applicable' };

    const ka = getKAParams(matrixName, gapOpen, gapExtend);
    if (!ka) return { valid: false, reason: `No published λ/K for ${matrixName}` };
    if (!ka.K || !ka.lambda) return { valid: false, reason: 'Invalid K or λ in lookup table' };

    return { valid: true, reason: '' };
}

export function computeEffectiveSearchSpace(m, n, K, H) {
    const expectedHSPLength = Math.log(K * m * n) / H;
    const effM = Math.max(1, m - expectedHSPLength);
    const effN = Math.max(1, n - expectedHSPLength);
    return effM * effN;
}

export function computeBitScore(rawScore, lambda, K) {
    return (lambda * rawScore - Math.log(K)) / Math.LN2;
}

export function computeEValue(bitScore, m, n, K, H, databaseSize = null) {
    const N = databaseSize ? databaseSize : n;
    const effectiveSpace = computeEffectiveSearchSpace(m, N, K, H);
    return effectiveSpace * Math.pow(2, -bitScore);
}

export function calculateStatistics(rawScore, m, n, matrixName, gapOpen, gapExtend, databaseSize = null) {
    const ka = getKAParams(matrixName, gapOpen, gapExtend);
    if (!ka || rawScore <= 0) return null;

    const { lambda, K, H } = ka;
    const bitScore = computeBitScore(rawScore, lambda, K);
    const eVal = computeEValue(bitScore, m, n, K, H, databaseSize);

    return {
        bitScore: bitScore > 0 ? bitScore.toFixed(1) : '0.0',
        eValue: eVal < 1e-99 ? '0.0' : eVal < 0.001 ? eVal.toExponential(2) : eVal.toFixed(4)
    };
}
