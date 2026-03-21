/**
 * @file core/dpMatrix.js
 * @description Low-level Dynamic Programming (DP) matrix initialization and scoring math.
 * @pipeline Used universally by Smith-Waterman and Needleman-Wunsch algorithms to generate the dense H-score and TB-traceback arrays needed for optimal pathway reconstruction.
 * 
 * Traceback Constants (TB codes):
 * 0 = STOP (Local Boundary)
 * 1 = DIAGONAL (Match/Mismatch)
 * 2 = UP (Gap in Sequence 2)
 * 3 = LEFT (Gap in Sequence 1)
 */
import { getMatrixScore } from './scoringMatrix.js?v=27';
import { linearGapPenalty, affineGapPenalty } from './gap.js?v=27';
import { ALIGNMENT_TB } from './contracts.js?v=27';

const NEG_INF = -1e9;

export function buildDPMatrix(s1, s2, isLocal, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch) {
    const n = s1.length;
    const m = s2.length;
    const W = m + 1;
    const sz = (n + 1) * W;

    const H = new Float32Array(sz);
    const TB = new Uint8Array(sz);

    let globalMax = 0;
    let maxI = 0, maxJ = 0;

    if (gapMath === 'linear') {
        for (let i = 1; i <= n; i++) {
            const idx = i * W;
            if (isLocal) { H[idx] = 0; TB[idx] = ALIGNMENT_TB.STOP; }
            else { H[idx] = -linearGapPenalty(i, gapOp, gapEx); TB[idx] = ALIGNMENT_TB.UP; }
        }
        for (let j = 1; j <= m; j++) {
            if (isLocal) { H[j] = 0; TB[j] = ALIGNMENT_TB.STOP; }
            else { H[j] = -linearGapPenalty(j, gapOp, gapEx); TB[j] = ALIGNMENT_TB.LEFT; }
        }

        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                const idx = i * W + j;
                const diagI = (i - 1) * W + (j - 1);
                const upI = (i - 1) * W + j;
                const leftI = i * W + (j - 1);

                const sc = getMatrixScore(s1[i - 1], s2[j - 1], matrixName, customMatch, customMismatch);
                const matchSc = H[diagI] + sc;
                const gapCost = gapOp + gapEx; // Corrected to just gapOp in core/gap.js for linear soon, but for now leave as is assuming gapOp is open/extend combi
                const delSc = H[upI] - gapCost;
                const insSc = H[leftI] - gapCost;

                let best = Math.max(matchSc, delSc, insSc);
                if (isLocal && best < 0) best = 0;
                H[idx] = best;

                let tb = ALIGNMENT_TB.STOP;
                if (isLocal && best === 0) tb = ALIGNMENT_TB.STOP;
                else if (best === matchSc) tb = ALIGNMENT_TB.DIAGONAL;
                else if (best === delSc) tb = ALIGNMENT_TB.UP;
                else tb = ALIGNMENT_TB.LEFT;
                TB[idx] = tb;

                if (isLocal && best >= globalMax) { globalMax = best; maxI = i; maxJ = j; }
            }
        }
    } else {
        const M_mat = new Float32Array(sz);
        const Ix = new Float32Array(sz);
        const Iy = new Float32Array(sz);

        const openPenalty = gapOp;
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
                Ix[idx] = 0; // Free end gap in EMBOSS Needle
                Iy[idx] = NEG_INF;
                H[idx] = 0;
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
                Iy[idx] = 0; // Free end gap in EMBOSS Needle
                H[idx] = 0;
                let tbM = 0;
                let tbIx = 0;
                let tbIy = (j === 1) ? 0 : 1;
                let tbH = ALIGNMENT_TB.LEFT;
                TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);
            }
        }

        for (let i = 1; i <= n; i++) {
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

                if (isLocal && best >= globalMax) { globalMax = best; maxI = i; maxJ = j; }
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
    } else if (gapMath === 'affine') {
        // Find best score for free trailing end gaps (semi-global) just like EMBOSS Needle
        for (let i = 0; i <= n; i++) {
            if (H[i * W + m] > maxScore) { maxScore = H[i * W + m]; startI = i; startJ = m; }
        }
        for (let j = 0; j <= m; j++) {
            if (H[n * W + j] > maxScore) { maxScore = H[n * W + j]; startI = n; startJ = j; }
        }
    } else {
        startI = n; startJ = m; maxScore = H[n * W + m];
    }

    return {
        H, TB, n, m, isLocal, maxI: startI, maxJ: startJ, rawScore: maxScore, gapMath
    };
}

