/**
 * @file core/traceback.js
 * @description Navigates completed DP matrix scoring trails (from bottom-right to top-left) to reconstruct the optimal string alignment.
 * @pipelineLocation Post-computation tier. Runs immediately after the DP matrix is filled to generate human-readable strings.
 * @changeImpact Modifying the directional prioritization (e.g. preferring diagonal over horizontal on ties) will alter the alignment aesthetic and might break edge-case alignments.
 */

/**
 * @file traceback.js
 * @description Reconstructs the optimal aligned sequence strings by walking backward
 *   through the TB (traceback) matrix produced by core/dpMatrix.js.
 */
import { getMatrixScore } from './scoringMatrix.js?v=27';
import { ALIGNMENT_TB } from './contracts.js?v=27';

export function performTraceback(s1, s2, dp, matrixName, customMatch, customMismatch) {
    const { H, TB, n, m, isLocal, maxI, maxJ, gapMath } = dp;
    const W = m + 1;

    let aligned1 = '';
    let aligned2 = '';
    let matchLine = '';
    let matches = 0;
    let gaps = 0;
    let positives = 0;
    let tracePath = [];

    let i = maxI;
    let j = maxJ;

    // get initial state: determine which affine matrix led to the final max score
    let tbStart = TB[maxI * W + maxJ];
    // In our encoded bits: state 1=M, 2=Ix, 3=Iy
    // Because we use tbH from 1 to 3 in affine gap (0 is STOP)
    let currentState = (tbStart & 3);
    if (currentState === ALIGNMENT_TB.STOP && !isLocal) currentState = ALIGNMENT_TB.DIAGONAL; // Fallback for global if 0 somehow

    // Pad trailing unaligned ends with gaps (from n,m to maxI,maxJ)
    if (!isLocal && gapMath === 'affine') {
        const trailingILen = n - maxI;
        const trailingJLen = m - maxJ;

        for (let k = 0; k < trailingILen; k++) {
            aligned1 = s1[n - 1 - k] + aligned1;
            aligned2 = '-' + aligned2;
            matchLine = ' ' + matchLine;
            gaps++;
        }
        for (let k = 0; k < trailingJLen; k++) {
            aligned1 = '-' + aligned1;
            aligned2 = s2[m - 1 - k] + aligned2;
            matchLine = ' ' + matchLine;
            gaps++;
        }

        let tmpI = n;
        let tmpJ = m;
        while (tmpI > maxI || tmpJ > maxJ) {
            tracePath.push([tmpI, tmpJ]);
            if (tmpI > maxI) tmpI--;
            else if (tmpJ > maxJ) tmpJ--;
        }
    }

    while (i > 0 || j > 0) {
        const idx = i * W + j;
        const tb = TB[idx];
        tracePath.push([i, j]);

        const tbH = tb & 3;

        if (isLocal && tbH === ALIGNMENT_TB.STOP) break;
        if (i === 0 && j === 0) break;

        if (gapMath === 'linear') {
            if (isLocal && tbH === ALIGNMENT_TB.STOP) break;
            if (tbH === ALIGNMENT_TB.DIAGONAL) {
                const a = s1[i - 1]; const b = s2[j - 1];
                aligned1 = a + aligned1; aligned2 = b + aligned2;
                const score = getMatrixScore(a, b, matrixName, customMatch, customMismatch);
                if (a === b) { matchLine = '|' + matchLine; matches++; }
                else if (score > 0) { matchLine = ':' + matchLine; }
                else { matchLine = ' ' + matchLine; }
                if (score > 0) positives++;
                i--; j--;
            } else if (tbH === ALIGNMENT_TB.UP) {
                aligned1 = s1[i - 1] + aligned1; aligned2 = '-' + aligned2;
                matchLine = ' ' + matchLine; gaps++; i--;
            } else if (tbH === ALIGNMENT_TB.LEFT) {
                aligned1 = '-' + aligned1; aligned2 = s2[j - 1] + aligned2;
                matchLine = ' ' + matchLine; gaps++; j--;
            } else { break; }
        } else {
            // Affine Gap Logic with true matrix states M, Ix, Iy
            const tbIx = (tb >> 2) & 1;
            const tbIy = (tb >> 3) & 1;
            const tbM = (tb >> 4) & 3;

            if (currentState === ALIGNMENT_TB.DIAGONAL) {
                const a = s1[i - 1]; const b = s2[j - 1];
                aligned1 = a + aligned1; aligned2 = b + aligned2;
                const score = getMatrixScore(a, b, matrixName, customMatch, customMismatch);
                if (a === b) { matchLine = '|' + matchLine; matches++; }
                else if (score > 0) { matchLine = ':' + matchLine; }
                else { matchLine = ' ' + matchLine; }
                if (score > 0) positives++;

                // Which matrix led us to M?
                // tbM is 0 (M), 1 (Ix), or 2 (Iy)
                currentState = tbM === 0 ? ALIGNMENT_TB.DIAGONAL : (tbM === 1 ? ALIGNMENT_TB.UP : ALIGNMENT_TB.LEFT);
                i--; j--;
            }
            else if (currentState === ALIGNMENT_TB.UP) {
                aligned1 = s1[i - 1] + aligned1; aligned2 = '-' + aligned2;
                matchLine = ' ' + matchLine; gaps++;
                currentState = tbIx === 1 ? ALIGNMENT_TB.UP : ALIGNMENT_TB.DIAGONAL;
                i--;
            }
            else if (currentState === ALIGNMENT_TB.LEFT) {
                aligned1 = '-' + aligned1; aligned2 = s2[j - 1] + aligned2;
                matchLine = ' ' + matchLine; gaps++;
                currentState = tbIy === 1 ? ALIGNMENT_TB.LEFT : ALIGNMENT_TB.DIAGONAL;
                j--;
            } else { break; }
        }
    }
    tracePath.push([i, j]);

    const length = aligned1.length;
    let queryCoverage = 0;
    if (s1.length > 0) {
        // Query Coverage: (non-gap residues aligned in query) / original query length
        const nonGapQueryResidues = aligned1.replace(/-/g, '').length;
        queryCoverage = (nonGapQueryResidues / s1.length) * 100;
    }

    return {
        alignedSeq1: aligned1,
        alignedSeq2: aligned2,
        matchLine: matchLine,
        matches,
        positives,
        gaps,
        length,
        queryCoverage,
        tracePath,
        startI: i,
        startJ: j
    };
}

