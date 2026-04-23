/**
 * @file core/dpMatrix.js
 * @description Handles the high-performance memory allocation and 1D-array abstraction of 2D/3D dynamic programming matrices.
 * @pipelineLocation Lower-tier memory manager. Used extensively by Smith-Waterman and Needleman-Wunsch classes for scoring.
 * @changeImpact Altering the flat-array indexing logic (y * width + x) will immediately cause segmentation faults or silent array out-of-bounds corruption during alignment.
 */

/**
 * Traceback Constants (TB codes):
 * 0 = STOP (Local Boundary)
 * 1 = DIAGONAL (Match/Mismatch)
 * 2 = UP (Gap in Sequence 2)
 * 3 = LEFT (Gap in Sequence 1)
 */
import { getMatrixScore } from './scoringMatrix.js';
import { linearGapPenalty, affineGapPenalty } from './gap.js';
import { ALIGNMENT_TB } from './contracts.js';

const NEG_INF = -Infinity;

export function buildDPMatrix(s1, s2, isLocal, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, onProgress = null) {
    const n = s1.length;
    const m = s2.length;
    const W = m + 1;
    const sz = (n + 1) * W;

    const H = new Float64Array(sz);
    const TB = new Uint8Array(sz);

    let globalMax = 0;
    let maxI = 0, maxJ = 0;

    if (gapMath === 'linear') {
        const linearCost = gapOp; // Strict standard linear gap cost
        for (let i = 1; i <= n; i++) {
            const idx = i * W;
            if (isLocal) { H[idx] = 0; TB[idx] = ALIGNMENT_TB.STOP; }
            else { H[idx] = -linearGapPenalty(i, linearCost); TB[idx] = ALIGNMENT_TB.UP; }
        }
        for (let j = 1; j <= m; j++) {
            if (isLocal) { H[j] = 0; TB[j] = ALIGNMENT_TB.STOP; }
            else { H[j] = -linearGapPenalty(j, linearCost); TB[j] = ALIGNMENT_TB.LEFT; }
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

                let tb = ALIGNMENT_TB.STOP;
                if (isLocal && best === 0) tb = ALIGNMENT_TB.STOP;
                else if (best === matchSc) tb = ALIGNMENT_TB.DIAGONAL;
                else if (best === delSc) tb = ALIGNMENT_TB.UP;
                else tb = ALIGNMENT_TB.LEFT;
                TB[idx] = tb;

                if (isLocal && best > globalMax) { globalMax = best; maxI = i; maxJ = j; }
            }
        }
    } else {
        const M_mat = new Float64Array(sz);
        const Ix = new Float64Array(sz);
        const Iy = new Float64Array(sz);

        const openPenalty = gapOp + gapEx;
        const extendPenalty = gapEx;

        M_mat[0] = 0;
        Ix[0] = NEG_INF;
        Iy[0] = NEG_INF;
        if (!isLocal) H[0] = 0;

        for (let i = 1; i <= n; i++) {
            const idx = i * W;
            if (isLocal) {
                M_mat[idx] = 0; Ix[idx] = NEG_INF; Iy[idx] = NEG_INF;
                H[idx] = 0; TB[idx] = ALIGNMENT_TB.STOP;
            } else {
                M_mat[idx] = NEG_INF;
                Ix[idx] = -affineGapPenalty(i, openPenalty, extendPenalty); // Pure Needleman-Wunsch penalized end gap
                Iy[idx] = NEG_INF;
                H[idx] = Ix[idx];
                let tbM = 0;
                let tbIx = (i === 1) ? 0 : 1;
                let tbIy = 0;
                let tbH = ALIGNMENT_TB.UP;
                TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);
            }
        }
        for (let j = 1; j <= m; j++) {
            const idx = j;
            if (isLocal) {
                M_mat[idx] = 0; Ix[idx] = NEG_INF; Iy[idx] = NEG_INF;
                H[idx] = 0; TB[idx] = ALIGNMENT_TB.STOP;
            } else {
                M_mat[idx] = NEG_INF;
                Ix[idx] = NEG_INF;
                Iy[idx] = -affineGapPenalty(j, openPenalty, extendPenalty); // Pure Needleman-Wunsch penalized end gap
                H[idx] = Iy[idx];
                let tbM = 0;
                let tbIx = 0;
                let tbIy = (j === 1) ? 0 : 1;
                let tbH = ALIGNMENT_TB.LEFT;
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
                let mVal = M_mat[diagI];
                let ixVal = Ix[diagI];
                let iyVal = Iy[diagI];
                let bestDiag = Math.max(mVal, ixVal, iyVal);
                if (isLocal && bestDiag < 0) bestDiag = 0;

                const sc = getMatrixScore(s1[i - 1], s2[j - 1], matrixName, customMatch, customMismatch);
                M_mat[idx] = bestDiag + sc;

                let tbM = 0; // Which matrix led to bestDiag?
                if (bestDiag === mVal) tbM = 0;
                else if (bestDiag === ixVal) tbM = 1;
                else tbM = 2;

                // Ix
                let ixOpen = M_mat[upI] - openPenalty;
                let ixExt = Ix[upI] - extendPenalty;
                Ix[idx] = Math.max(ixOpen, ixExt);
                let tbIx = (Ix[idx] === ixExt && ixExt >= ixOpen) ? 1 : 0;

                // Iy
                let iyOpen = M_mat[leftI] - openPenalty;
                let iyExt = Iy[leftI] - extendPenalty;
                Iy[idx] = Math.max(iyOpen, iyExt);
                let tbIy = (Iy[idx] === iyExt && iyExt >= iyOpen) ? 1 : 0;

                // Overall H for this cell (for plotting/max tracking)
                let best = Math.max(M_mat[idx], Ix[idx], Iy[idx]);
                if (isLocal && best < 0) best = 0;
                H[idx] = best;

                let tbH = ALIGNMENT_TB.STOP;
                if (isLocal && best === 0) tbH = ALIGNMENT_TB.STOP;
                else if (best === M_mat[idx]) tbH = ALIGNMENT_TB.DIAGONAL;
                else if (best === Ix[idx]) tbH = ALIGNMENT_TB.UP;
                else tbH = ALIGNMENT_TB.LEFT;

                TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);

                if (isLocal && best > globalMax) { globalMax = best; maxI = i; maxJ = j; }
            }
        }
    }

    let maxScore = NEG_INF;
    let startI = n;
    let startJ = m;

    if (isLocal) {
        maxScore = globalMax;
        startI = maxI;
        startJ = maxJ;
    } else {
        startI = n; startJ = m; maxScore = H[n * W + m];
    }

    return {
        H, TB, n, m, isLocal, maxI: startI, maxJ: startJ, rawScore: maxScore, gapMath
    };
}

