/**
 * @file metrics/karlinParams.js
 * @description Pre-computed Karlin-Altschul parameters for standard scoring matrices.
 * Source: NCBI BLAST documentation and NCBI Toolkit.
 */

export const KARLIN_PARAMS = {
    // Protein Matrices (λ and K)
    'BLOSUM62': { lambda: 0.318, k: 0.13, h: 0.40 },
    'BLOSUM45': { lambda: 0.224, k: 0.041, h: 0.12 },
    'BLOSUM80': { lambda: 0.342, k: 0.17, h: 0.53 },
    'PAM250': { lambda: 0.228, k: 0.046, h: 0.15 },
    'PAM70': { lambda: 0.339, k: 0.15, h: 0.48 },
    'PAM30': { lambda: 0.337, k: 0.16, h: 0.54 },

    // Nucleotide (λ and K typically vary with reward/penalty, but we use defaults)
    'BLASTN': { lambda: 1.28, k: 0.46, h: 0.85 },
    'DNAFULL': { lambda: 1.28, k: 0.46, h: 0.85 }
};

/**
 * Calculates E-value with numerical stability.
 * @param {number} rawScore 
 * @param {number} m - query length
 * @param {number} n - db size or subject length
 * @param {Object} params - {lambda, k}
 * @returns {number}
 */
export function calculateEValue(rawScore, m, n, params) {
    if (!params) return null;
    const { lambda, k } = params;

    // E = K * m * n * e^(-lambda * S)
    const exponent = -lambda * rawScore;

    // Numerical stability clamping
    if (exponent > 700) return 0; // Extremely high score
    if (exponent < -700) return Infinity; // Extremely low score

    const evalue = k * m * n * Math.exp(exponent);
    return evalue;
}

/**
 * Calculates Bit Score.
 * @param {number} rawScore 
 * @param {Object} params - {lambda, k}
 * @returns {number}
 */
export function calculateBitScore(rawScore, params) {
    if (!params) return null;
    const { lambda, k } = params;
    // B = (lambda * S - ln K) / ln 2
    return (lambda * rawScore - Math.log(k)) / Math.log(2);
}
