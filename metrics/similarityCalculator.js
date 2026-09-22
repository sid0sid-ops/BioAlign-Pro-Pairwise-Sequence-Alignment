/**
 * @file metrics/similarityCalculator.js
 * @description Determines 'similarity' (positives) by looking up aligned pairs in a scoring matrix and checking if their score is greater than zero.
 * @pipelineLocation Post-computation metrics phase. Relies on scoringMatrix.js to classify positive evolutionary substitutions.
 * @changeImpact Changing the >0 threshold assumption will blur the line between neutral mutations and conserved mutations.
 */
import { getMatrixScore } from '../core/scoringMatrix.js';

export function calculateSimilarity(alignedSeq1, alignedSeq2, matrixName) {
    let positives = 0;
    const totalLength = alignedSeq1.length;
    if (totalLength === 0) return '0.0';

    for (let i = 0; i < totalLength; i++) {
        const a = alignedSeq1[i];
        const b = alignedSeq2[i];

        if (a === '-' || b === '-') continue;

        try {
            const score = getMatrixScore(a, b, matrixName);
            if (score > 0) positives++;
        } catch (err) {}
    }

    const pct = (positives / totalLength) * 100;
    return isFinite(pct) ? pct.toFixed(1) : '0.0';
}

export function calculateSimilarityDetailed(alignedSeq1, alignedSeq2, matrixName) {
    let positives = 0;
    const totalLength = alignedSeq1.length;

    for (let i = 0; i < totalLength; i++) {
        const a = alignedSeq1[i];
        const b = alignedSeq2[i];

        if (a === '-' || b === '-') continue;

        try {
            const score = getMatrixScore(a, b, matrixName);
            if (score > 0) positives++;
        } catch {}
    }

    const similarity = totalLength > 0 ? ((positives / totalLength) * 100).toFixed(1) : '0.0';

    return { positives, totalLength, similarity };
}
