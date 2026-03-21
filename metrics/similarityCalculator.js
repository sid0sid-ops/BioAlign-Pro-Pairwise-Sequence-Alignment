/**
 * @file metrics/similarityCalculator.js
 * @description Utility to compute total functional similarity for protein translations.
 * @pipeline Scans an aligned sequence combination and references substitution data to determine if chemically similar mismatches warrant a 'positive' alignment hit contribution.
 */
import { getMatrixScore } from '../core/scoringMatrix.js?v=27';

export function calculateSimilarity(alignedSeq1, alignedSeq2, matrixName) {
    let positives = 0;
    let length = alignedSeq1.length;
    
    for (let i = 0; i < length; i++) {
        const a = alignedSeq1[i];
        const b = alignedSeq2[i];
        
        if (a !== '-' && b !== '-') {
            const score = getMatrixScore(a, b, matrixName);
            if (score > 0) {
                positives++;
            }
        }
    }
    
    if (length === 0) return '0.00';
    return ((positives / length) * 100).toFixed(2);
}

