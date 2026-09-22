/**
 * @file core/dpMatrix.js
 * @description Handles the high-performance memory allocation and 1D-array abstraction of 2D/3D dynamic programming matrices.
 * @pipelineLocation Lower-tier memory manager. Used extensively by Smith-Waterman and Needleman-Wunsch classes for scoring.
 * @changeImpact Altering the flat-array indexing logic (y * width + x) will immediately cause segmentation faults or silent array out-of-bounds corruption during alignment.
 */

import { ALIGNMENT_TB } from './contracts.js';
import { affineGapPenalty, linearGapPenalty } from './gap.js';
/**
 * Traceback Constants (TB codes):
 * 0 = STOP (Local Boundary)
 * 1 = DIAGONAL (Match/Mismatch)
 * 2 = UP (Gap in Sequence 2)
 * 3 = LEFT (Gap in Sequence 1)
 */
import { getMatrixScore } from './scoringMatrix.js';

const NEG_INF = -Infinity;

export function buildDPMatrix(
    s1,
    s2,
    isLocal,
    gapMath,
    gapOp,
    gapEx,
    matrixName,
    customMatch,
    customMismatch,
    onProgress = null
) {
    const n = s1.length;
    const m = s2.length;
    const W = m + 1;
    const sz = (n + 1) * W;

    const H = new Float64Array(sz);
    const TB = new Uint8Array(sz);

    let globalMax = 0;
    let maxI = 0,
        maxJ = 0;

    if (gapMath === 'linear') {
        const linearCost = gapOp; // Strict standard linear gap cost
        for (let i = 1; i <= n; i++) {
            const idx = i * W;
            if (isLocal) {
                H[idx] = 0;
                TB[idx] = ALIGNMENT_TB.STOP;
            } else {
                H[idx] = -linearGapPenalty(i, linearCost);
                TB[idx] = ALIGNMENT_TB.UP;
            }
        }
        for (let j = 1; j <= m; j++) {
            if (isLocal) {
                H[j] = 0;
                TB[j] = ALIGNMENT_TB.STOP;
            } else {
                H[j] = -linearGapPenalty(j, linearCost);
                TB[j] = ALIGNMENT_TB.LEFT;
            }
        }

        for (let i = 1; i <= n; i++) {
            if (onProgress && i % 250 === 0) onProgress('DP Matrix (Linear)', (i / n) * 100);
            for (let j = 1; j <= m; j++) {
                const idx = i * W + j;
                const diagI = (i - 1) * W + (j - 1);
                const upI = (i - 1) * W + j;
                const leftI = i * W + (j - 1);

                const sc = getMatrixScore(s1[i - 1], s2[j - 1], matrixName, customMatch, customMismatch);
                const matchSc = H[diagI] + sc;
                const delSc = H[upI] - linearCost;
                const insSc = H[leftI] - linearCost;

                let best = Math.max(matchSc, delSc, insSc);
                if (isLocal && best < 0) best = 0;
                H[idx] = best;

                let tb;
                if (isLocal && best === 0) tb = ALIGNMENT_TB.STOP;
                else if (best === matchSc) tb = ALIGNMENT_TB.DIAGONAL;
                else if (best === delSc) tb = ALIGNMENT_TB.UP;
                else tb = ALIGNMENT_TB.LEFT;
                TB[idx] = tb;

                if (isLocal && best > globalMax) {
                    globalMax = best;
                    maxI = i;
                    maxJ = j;
                }
            }
        }
    } else {
        const M_mat = new Float64Array(sz);
        const Ix = new Float64Array(sz);
        const Iy = new Float64Array(sz);

        const openPenalty = gapOp;
        const extendPenalty = gapEx;

        M_mat[0] = 0;
        Ix[0] = NEG_INF;
        Iy[0] = NEG_INF;
        if (!isLocal) H[0] = 0;

        for (let i = 1; i <= n; i++) {
            const idx = i * W;
            if (isLocal) {
                M_mat[idx] = 0;
                Ix[idx] = NEG_INF;
                Iy[idx] = NEG_INF;
                H[idx] = 0;
                TB[idx] = ALIGNMENT_TB.STOP;
            } else {
                M_mat[idx] = NEG_INF;
                Ix[idx] = -affineGapPenalty(i, openPenalty, extendPenalty); // Pure Needleman-Wunsch penalized end gap
                Iy[idx] = NEG_INF;
                H[idx] = Ix[idx];
                const tbM = 0;
                const tbIx = i === 1 ? 0 : 1;
                const tbIy = 0;
                const tbH = ALIGNMENT_TB.UP;
                TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);
            }
        }
        for (let j = 1; j <= m; j++) {
            const idx = j;
            if (isLocal) {
                M_mat[idx] = 0;
                Ix[idx] = NEG_INF;
                Iy[idx] = NEG_INF;
                H[idx] = 0;
                TB[idx] = ALIGNMENT_TB.STOP;
            } else {
                M_mat[idx] = NEG_INF;
                Ix[idx] = NEG_INF;
                Iy[idx] = -affineGapPenalty(j, openPenalty, extendPenalty); // Pure Needleman-Wunsch penalized end gap
                H[idx] = Iy[idx];
                const tbM = 0;
                const tbIx = 0;
                const tbIy = j === 1 ? 0 : 1;
                const tbH = ALIGNMENT_TB.LEFT;
                TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);
            }
        }

        for (let i = 1; i <= n; i++) {
            if (onProgress && i % 250 === 0) onProgress('DP Matrix (Affine)', (i / n) * 100);
            for (let j = 1; j <= m; j++) {
                const idx = i * W + j;
                const diagI = (i - 1) * W + (j - 1);
                const upI = (i - 1) * W + j;
                const leftI = i * W + (j - 1);

                // M_mat
                const mVal = M_mat[diagI];
                const ixVal = Ix[diagI];
                const iyVal = Iy[diagI];
                let bestDiag = Math.max(mVal, ixVal, iyVal);
                if (isLocal && bestDiag < 0) bestDiag = 0;

                const sc = getMatrixScore(s1[i - 1], s2[j - 1], matrixName, customMatch, customMismatch);
                M_mat[idx] = bestDiag + sc;

                let tbM; // Which matrix led to bestDiag?
                if (bestDiag === mVal) tbM = 0;
                else if (bestDiag === ixVal) tbM = 1;
                else tbM = 2;

                // Ix
                const ixOpen = M_mat[upI] - openPenalty;
                const ixExt = Ix[upI] - extendPenalty;
                let bestIx = Math.max(ixOpen, ixExt);
                if (isLocal && bestIx < 0) bestIx = 0;
                Ix[idx] = bestIx;
                const tbIx = Ix[idx] === ixExt && ixExt >= ixOpen ? 1 : 0;

                // Iy
                const iyOpen = M_mat[leftI] - openPenalty;
                const iyExt = Iy[leftI] - extendPenalty;
                let bestIy = Math.max(iyOpen, iyExt);
                if (isLocal && bestIy < 0) bestIy = 0;
                Iy[idx] = bestIy;
                const tbIy = Iy[idx] === iyExt && iyExt >= iyOpen ? 1 : 0;

                // Overall H for this cell (for plotting/max tracking)
                let best = Math.max(M_mat[idx], Ix[idx], Iy[idx]);
                if (isLocal && best < 0) best = 0;
                H[idx] = best;

                let tbH;
                if (isLocal && best === 0) tbH = ALIGNMENT_TB.STOP;
                else if (best === M_mat[idx]) tbH = ALIGNMENT_TB.DIAGONAL;
                else if (best === Ix[idx]) tbH = ALIGNMENT_TB.UP;
                else tbH = ALIGNMENT_TB.LEFT;

                TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);

                if (isLocal && best > globalMax) {
                    globalMax = best;
                    maxI = i;
                    maxJ = j;
                }
            }
        }
    }

    let maxScore;
    let startI;
    let startJ;

    if (isLocal) {
        maxScore = globalMax;
        startI = maxI;
        startJ = maxJ;
    } else {
        startI = n;
        startJ = m;
        maxScore = H[n * W + m];
    }

    return {
        H,
        TB,
        n,
        m,
        isLocal,
        maxI: startI,
        maxJ: startJ,
        rawScore: maxScore,
        gapMath
    };
}
