import fs from 'fs';

const NEG_INF = -1e9;

import { parsedMatrices } from './core/scoringMatricesData.js';

// Use BLOSUM45 exactly as generated
const BLOSUM45 = parsedMatrices['BLOSUM45'];

function getScore(a, b) {
    if (BLOSUM45[a] && BLOSUM45[a][b] !== undefined) return BLOSUM45[a][b];
    return 0;
}

const s1 = "MWVPVVFLTLSVTWIGAAPLILSRIVGGWECEKHSQPWQVLVASRGRAVCGGVLVHPQWVLTAAHCIRNKSVILLGRHSLFHPEDTGQVFQVSHSFPHPLYDMSLLKNRFLRPGDDSSHDLMLLRLSEPAELTDAVKVMDLPTQEPALGTTCYASGWGSIEPEEFLTPKKLQCVDLHVISNDVCAQVHPQKVTKFMLCAGRWTGGKSTCSGDSGGPLVCNGVLQGITSWGSEPCALPERPSLYTKVVHYRKWIKDTIVANP";
const s2 = "MLTLASKLKRDDGLKGSRTAATASDSTRRVSVRDKLLVKEVAELEANLPCTCKVHFPDPNKLHCFQLTVTPDEGYYQGGKFQFETEVPDAYNMVPPKVKCLTKIWHPNITETGEICLSLLREHSIDGTGWAPTRTLKDVVWGLNSLFTDLLNFDDPLNIEAAEHHLRDKED";

const n = s1.length;
const m = s2.length;
const gapOp = 10;
const gapEx = 0.5;

function testDP() {
    const W = m + 1;
    const sz = (n + 1) * W;

    const H = new Float32Array(sz);
    const TB = new Uint8Array(sz);

    const M_mat = new Float32Array(sz);
    const Ix = new Float32Array(sz);
    const Iy = new Float32Array(sz);

    const openPenalty = gapOp;
    const extendPenalty = gapEx;

    M_mat[0] = 0;
    Ix[0] = NEG_INF;
    Iy[0] = NEG_INF;
    H[0] = 0;

    for (let i = 1; i <= n; i++) {
        const idx = i * W;
        M_mat[idx] = NEG_INF;
        Ix[idx] = 0; // Free end gap
        Iy[idx] = NEG_INF;
        H[idx] = 0;
        let tbM = 0; 
        let tbIx = (i === 1) ? 0 : 1; 
        let tbIy = 0;
        let tbH = 1; // from Ix
        TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);
    }
    
    for (let j = 1; j <= m; j++) {
        const idx = j;
        M_mat[idx] = NEG_INF;
        Ix[idx] = NEG_INF; 
        Iy[idx] = 0; // Free end gap
        H[idx] = 0;
        let tbM = 0; 
        let tbIx = 0;
        let tbIy = (j === 1) ? 0 : 1;
        let tbH = 2; // from Iy
        TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);
    }

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const idx = i * W + j;
            const diagI = (i - 1) * W + (j - 1);
            const upI = (i - 1) * W + j;
            const leftI = i * W + (j - 1);

            let mVal = M_mat[diagI];
            let ixVal = Ix[diagI];
            let iyVal = Iy[diagI];
            let bestDiag = Math.max(mVal, ixVal, iyVal);
            
            const sc = getScore(s1[i - 1], s2[j - 1]);
            M_mat[idx] = bestDiag + sc;
            
            let tbM = 0;
            if (bestDiag === mVal) tbM = 0;
            else if (bestDiag === ixVal) tbM = 1;
            else tbM = 2;

            let ixOpen = M_mat[upI] - openPenalty;
            let ixExt = Ix[upI] - extendPenalty;
            Ix[idx] = Math.max(ixOpen, ixExt);
            let tbIx = (Ix[idx] === ixExt && ixExt >= ixOpen) ? 1 : 0;

            let iyOpen = M_mat[leftI] - openPenalty;
            let iyExt = Iy[leftI] - extendPenalty;
            Iy[idx] = Math.max(iyOpen, iyExt);
            let tbIy = (Iy[idx] === iyExt && iyExt >= iyOpen) ? 1 : 0;

            let best = Math.max(M_mat[idx], Ix[idx], Iy[idx]);
            H[idx] = best;

            let tbH = 0;
            if (best === M_mat[idx]) tbH = 0; // Match
            else if (best === Ix[idx]) tbH = 1; // Ix
            else tbH = 2; // Iy
            
            TB[idx] = tbH | (tbIx << 2) | (tbIy << 3) | (tbM << 4);
        }
    }

    let maxScore = NEG_INF;
    let maxI = n;
    let maxJ = m;

    for (let i = 0; i <= n; i++) {
        const val = H[i * W + m];
        if (val > maxScore) { maxScore = val; maxI = i; maxJ = m; }
    }
    for (let j = 0; j <= m; j++) {
        const val = H[n * W + j];
        if (val > maxScore) { maxScore = val; maxI = n; maxJ = j; }
    }

    let aligned1 = '';
    let aligned2 = '';

    // Pad trailing unaligned ends with gaps
    for (let i = n; i > maxI; i--) {
        aligned1 = s1[i - 1] + aligned1;
        aligned2 = '-' + aligned2;
    }
    for (let j = m; j > maxJ; j--) {
        aligned1 = '-' + aligned1;
        aligned2 = s2[j - 1] + aligned2;
    }
    
    let i = maxI;
    let j = maxJ;
    let tbStart = TB[maxI * W + maxJ];
    let currentState = tbStart & 3; 

    while (i > 0 || j > 0) {
        const idx = i * W + j;
        const tb = TB[idx];

        const tbIx = (tb >> 2) & 1;
        const tbIy = (tb >> 3) & 1;
        const tbM = (tb >> 4) & 3;

        if (i === 0 && j === 0) break;

        if (currentState === 0) { 
            const a = s1[i - 1]; const b = s2[j - 1];
            aligned1 = a + aligned1; aligned2 = b + aligned2;
            currentState = tbM; 
            i--; j--;
        } 
        else if (currentState === 1) { 
            aligned1 = s1[i - 1] + aligned1; aligned2 = '-' + aligned2;
            currentState = tbIx === 1 ? 1 : 0; 
            i--;
        } 
        else if (currentState === 2) { 
            aligned1 = '-' + aligned1; aligned2 = s2[j - 1] + aligned2;
            currentState = tbIy === 1 ? 2 : 0; 
            j--;
        } else { break; }
    }

    console.log("Score:", maxScore);
    console.log("Aligned1:", aligned1.length, aligned1.replace(/-/g, '').length, "\n" + aligned1);
    console.log("Aligned2:", aligned2.length, aligned2.replace(/-/g, '').length, "\n" + aligned2);
}

testDP();
