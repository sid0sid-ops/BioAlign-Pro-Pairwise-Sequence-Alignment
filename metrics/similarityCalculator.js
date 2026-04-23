/**
 * @file metrics/similarityCalculator.js
 * @description Determines 'similarity' (positives) by looking up aligned pairs in a scoring matrix and checking if their score is greater than zero.
 * @pipelineLocation Post-computation metrics phase. Relies on scoringMatrix.js to classify positive evolutionary substitutions.
 * @changeImpact Changing the >0 threshold assumption will blur the line between neutral mutations and conserved mutations.
 */
import { getMatrixScore } from '../core/scoringMatrix.js';

export function calculateSimilarity(alignedSeq1, alignedSeq2, matrixName) {
    let positives = 0;
    let validPositions = 0;

    for (let i = 0; i < alignedSeq1.length; i++) {
        const a = alignedSeq1[i];
        const b = alignedSeq2[i];

        if (a === '-' || b === '-') continue;

        validPositions++;

        try {
            const score = getMatrixScore(a, b, matrixName);
            if (score > 0) positives++;
        } catch (err) {
            continue;
        }
    }

    if (validPositions === 0) return '0.00';
    const pct = (positives / validPositions) * 100;
    return isFinite(pct) ? pct.toFixed(2) : '0.00';
}

export function calculateSimilarityDetailed(alignedSeq1, alignedSeq2, matrixName) {
    let positives = 0;
    let validPositions = 0;

    for (let i = 0; i < alignedSeq1.length; i++) {
        const a = alignedSeq1[i];
        const b = alignedSeq2[i];

        if (a === '-' || b === '-') continue;

        validPositions++;

        try {
            const score = getMatrixScore(a, b, matrixName);
            if (score > 0) positives++;
        } catch {
            continue;
        }
    }

    const similarity = validPositions > 0
        ? ((positives / validPositions) * 100).toFixed(2)
        : '0.00';

    return { positives, validPositions, similarity };
}

