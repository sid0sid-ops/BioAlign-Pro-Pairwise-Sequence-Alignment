/**
 * @file metrics/blastStatistics.js
 * @description Implementation of Karlin-Altschul statistics for calculating Bit Scores and E-values.
 * Accurately calibrated for NCBI BLAST and EMBOSS scoring matrices and nucleotide match/mismatch scales.
 */

const KA_PARAMS_TABLE = {
    BLOSUM62: {
        default: { lambda: 0.267, K: 0.041, H: 0.14 },
        table: [
            { open: 11, extend: 2, lambda: 0.297, K: 0.082, H: 0.27 },
            { open: 11, extend: 1, lambda: 0.267, K: 0.041, H: 0.14 },
            { open: 10, extend: 2, lambda: 0.291, K: 0.075, H: 0.23 },
            { open: 10, extend: 1, lambda: 0.243, K: 0.033, H: 0.1 },
            { open: 9, extend: 2, lambda: 0.279, K: 0.058, H: 0.19 },
            { open: 8, extend: 2, lambda: 0.261, K: 0.045, H: 0.15 }
        ]
    },
    BLOSUM45: {
        default: { lambda: 0.2, K: 0.033, H: 0.09 },
        table: [
            { open: 15, extend: 2, lambda: 0.2, K: 0.033, H: 0.09 },
            { open: 14, extend: 2, lambda: 0.21, K: 0.036, H: 0.09 },
            { open: 13, extend: 3, lambda: 0.207, K: 0.049, H: 0.14 }
        ]
    },
    BLOSUM50: {
        default: { lambda: 0.232, K: 0.048, H: 0.14 },
        table: [
            { open: 13, extend: 2, lambda: 0.246, K: 0.061, H: 0.18 },
            { open: 12, extend: 2, lambda: 0.243, K: 0.057, H: 0.16 }
        ]
    },
    BLOSUM80: {
        default: { lambda: 0.318, K: 0.087, H: 0.38 },
        table: [
            { open: 10, extend: 1, lambda: 0.299, K: 0.068, H: 0.25 },
            { open: 25, extend: 2, lambda: 0.342, K: 0.17, H: 0.67 }
        ]
    },
    BLOSUM90: { default: { lambda: 0.342, K: 0.111, H: 0.46 } },
    PAM30: { default: { lambda: 0.297, K: 0.11, H: 0.49 } },
    PAM70: { default: { lambda: 0.284, K: 0.076, H: 0.31 } },
    PAM250: { default: { lambda: 0.225, K: 0.038, H: 0.11 } },
    BLASTP: { default: { lambda: 0.267, K: 0.041, H: 0.14 } },
    BLASTN: {
        default: { lambda: 1.37, K: 0.711, H: 1.31 },
        table: [
            { open: 5, extend: 2, lambda: 1.37, K: 0.711, H: 1.31 },
            { open: 4, extend: 2, lambda: 1.37, K: 0.711, H: 1.31 },
            { open: 5, extend: 1, lambda: 1.37, K: 0.711, H: 1.31 }
        ]
    },
    // DNAFULL (EDNAFULL) operates on a (+5, -4) scoring scale; true asymptotic lambda = 0.1915
    DNAFULL: { default: { lambda: 0.1915, K: 0.045, H: 0.18 } }
};

/**
 * Numerically solves the Karlin-Altschul equation for nucleotide sequences:
 * 0.25 * e^(M * lambda) + 0.75 * e^(P * lambda) = 1
 */
function solveNucleotideLambda(match, mismatch) {
    const M = Number(match);
    const P = Number(mismatch);
    if (M <= 0 || P >= 0) return null;

    let low = 0.0001;
    let high = 10.0;
    for (let i = 0; i < 60; i++) {
        const mid = (low + high) / 2;
        const val = 0.25 * Math.exp(M * mid) + 0.75 * Math.exp(P * mid) - 1;
        if (val > 0) high = mid;
        else low = mid;
    }
    return (low + high) / 2;
}

export function getKAParams(matrixName, gapOpen, gapExtend, customMatch = 1, customMismatch = -3) {
    if (matrixName === 'CUSTOM') {
        const M = Number(customMatch) || 1;
        const P = Number(customMismatch) || -3;
        const lam = solveNucleotideLambda(M, P);
        if (lam !== null) {
            let K = 0.05;
            let H = 0.2;
            if (M === 1 && P === -3) {
                K = 0.711;
                H = 1.31;
            } else if (M === 1 && P === -2) {
                K = 0.46;
                H = 0.85;
            } else if (M === 2 && P === -3) {
                K = 0.284;
                H = 0.54;
            } else if (M === 5 && P === -4) {
                K = 0.045;
                H = 0.18;
            }
            return { lambda: lam, K, H };
        }
        return null;
    }

    const entry = KA_PARAMS_TABLE[matrixName];
    if (!entry) return null;
    if (entry.table) {
        const go = Math.round(gapOpen);
        const ge = Math.round(gapExtend * 10) / 10;
        const hit = entry.table.find((r) => r.open === go && r.extend === ge);
        if (hit) return { lambda: hit.lambda, K: hit.K, H: hit.H };
    }
    return entry.default || null;
}

export function isStatsValid(gapMath, algoType, matrixName, gapOpen, gapExtend, customMatch = 1, customMismatch = -3) {
    if (algoType === 'global' || algoType === 'needleman_wunsch') {
        return { valid: false, reason: 'Global alignment — Karlin-Altschul statistics not applicable' };
    }

    const ka = getKAParams(matrixName, gapOpen, gapExtend, customMatch, customMismatch);
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
    return effectiveSpace * 2 ** -bitScore;
}

export function calculateStatistics(
    rawScore,
    m,
    n,
    matrixName,
    gapOpen,
    gapExtend,
    databaseSize = null,
    customMatch = 1,
    customMismatch = -3
) {
    const ka = getKAParams(matrixName, gapOpen, gapExtend, customMatch, customMismatch);
    if (!ka || rawScore <= 0) return null;

    const { lambda, K, H } = ka;
    const bitScore = computeBitScore(rawScore, lambda, K);
    const eVal = computeEValue(bitScore, m, n, K, H, databaseSize);

    return {
        bitScore: bitScore > 0 ? bitScore.toFixed(1) : '0.0',
        eValue: eVal < 1e-99 ? '0.0' : eVal < 0.001 ? eVal.toExponential(2) : eVal.toFixed(4)
    };
}
