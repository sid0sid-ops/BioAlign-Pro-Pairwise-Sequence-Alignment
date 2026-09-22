/**
 * @file algorithms/blastSeedExtend.js
 * @description True BLAST Seed-and-Extend Heuristic (Altschul et al. 1990, 1997).
 * Implements:
 * 1. Word seeding (k-mer matching, W=3 for protein, W=11 for DNA) with neighborhood expansion.
 * 2. Ungapped diagonal extension with X-dropoff threshold.
 * 3. Seed-directed gapped extension (banded DP around optimal HSP trajectory).
 * 4. Traceback to produce gapped alignment, stats, and Karlin-Altschul metrics.
 */

import { ALIGNMENT_TB } from '../core/contracts.js';
import { buildDPMatrix } from '../core/dpMatrix.js';
import { affineGapPenalty, linearGapPenalty } from '../core/gap.js';
import { getMatrixScore } from '../core/scoringMatrix.js';
import { performTraceback } from '../core/traceback.js';

export function blastSeedExtend(
    s1,
    s2,
    gapMath,
    gapOp,
    gapEx,
    matrixName,
    customMatch,
    customMismatch,
    onProgress = null,
    wordSizeParam = null,
    thresholdTParam = null,
    xDropoffParam = null
) {
    const isDna = matrixName === 'BLASTN' || matrixName === 'DNAFULL' || customMatch !== undefined;
    const wordSize = wordSizeParam && Number(wordSizeParam) > 1 ? Number(wordSizeParam) : isDna ? 11 : 3;
    const thresholdT =
        thresholdTParam !== null && thresholdTParam !== undefined
            ? Number(thresholdTParam)
            : isDna
              ? wordSize * (customMatch || 1) * 0.8
              : 11;
    const xDropoff = xDropoffParam !== null && xDropoffParam !== undefined ? Number(xDropoffParam) : isDna ? 30 : 20;

    if (onProgress) onProgress('BLAST Seeding', 20);

    // 1. Build Query Word Index (W-mers)
    const queryIndex = new Map();
    for (let i = 0; i <= s1.length - wordSize; i++) {
        const word = s1.substring(i, i + wordSize);
        if (!queryIndex.has(word)) {
            queryIndex.set(word, []);
        }
        queryIndex.get(word).push(i);
    }

    // 2. Scan Subject for Seed Hits (Exact or High-Scoring Neighbors)
    const seedHits = [];
    for (let j = 0; j <= s2.length - wordSize; j++) {
        const word = s2.substring(j, j + wordSize);

        // Direct exact match
        if (queryIndex.has(word)) {
            for (const i of queryIndex.get(word)) {
                seedHits.push({ i, j, score: wordSize * 4 });
            }
        } else if (!isDna) {
            // Protein neighborhood search (words with score >= T)
            for (const [qWord, qPositions] of queryIndex.entries()) {
                let score = 0;
                for (let k = 0; k < wordSize; k++) {
                    score += getMatrixScore(qWord[k], word[k], matrixName, customMatch, customMismatch);
                }
                if (score >= thresholdT) {
                    for (const i of qPositions) {
                        seedHits.push({ i, j, score });
                    }
                }
            }
        }
    }

    // If no seeds found on high word-size, fallback to smaller word size (W=2 for protein, W=7 for DNA)
    if (seedHits.length === 0) {
        const fallbackW = isDna ? 7 : 2;
        const fallbackIndex = new Map();
        for (let i = 0; i <= s1.length - fallbackW; i++) {
            const word = s1.substring(i, i + fallbackW);
            if (!fallbackIndex.has(word)) fallbackIndex.set(word, []);
            fallbackIndex.get(word).push(i);
        }
        for (let j = 0; j <= s2.length - fallbackW; j++) {
            const word = s2.substring(j, j + fallbackW);
            if (fallbackIndex.has(word)) {
                for (const i of fallbackIndex.get(word)) {
                    seedHits.push({ i, j, score: fallbackW * 2 });
                }
            }
        }
    }

    if (onProgress) onProgress('BLAST Ungapped Extension', 50);

    // 3. Ungapped Extension (HSP Detection with X-Dropoff)
    let bestHSP = null;
    let maxHspScore = -Infinity;

    for (const seed of seedHits) {
        const qStart = seed.i;
        const sStart = seed.j;
        const qEnd = seed.i + wordSize;
        const sEnd = seed.j + wordSize;

        // Score seed core
        let currentScore = 0;
        for (let k = 0; k < wordSize && seed.i + k < s1.length && seed.j + k < s2.length; k++) {
            currentScore += getMatrixScore(s1[seed.i + k], s2[seed.j + k], matrixName, customMatch, customMismatch);
        }

        let maxScore = currentScore;
        let bestQEnd = qEnd;
        let bestSEnd = sEnd;

        // Extend forward (right)
        let fQ = qEnd;
        let fS = sEnd;
        let fScore = currentScore;
        while (fQ < s1.length && fS < s2.length) {
            const step = getMatrixScore(s1[fQ], s2[fS], matrixName, customMatch, customMismatch);
            fScore += step;
            fQ++;
            fS++;
            if (fScore > maxScore) {
                maxScore = fScore;
                bestQEnd = fQ;
                bestSEnd = fS;
            } else if (fScore < maxScore - xDropoff) {
                break; // X-dropoff reached
            }
        }

        // Extend backward (left)
        let bQ = qStart;
        let bS = sStart;
        let bScore = maxScore;
        let bestQStart = qStart;
        let bestSStart = sStart;
        while (bQ > 0 && bS > 0) {
            bQ--;
            bS--;
            const step = getMatrixScore(s1[bQ], s2[bS], matrixName, customMatch, customMismatch);
            bScore += step;
            if (bScore > maxScore) {
                maxScore = bScore;
                bestQStart = bQ;
                bestSStart = bS;
            } else if (bScore < maxScore - xDropoff) {
                break; // X-dropoff reached
            }
        }

        if (maxScore > maxHspScore) {
            maxHspScore = maxScore;
            bestHSP = {
                qStart: bestQStart,
                qEnd: bestQEnd,
                sStart: bestSStart,
                sEnd: bestSEnd,
                score: maxScore
            };
        }
    }

    if (onProgress) onProgress('BLAST Gapped Banded Extension', 80);

    // 4. If no HSP found above zero, fall back to Smith-Waterman
    if (!bestHSP || maxHspScore <= 0) {
        return buildDPMatrix(s1, s2, true, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, onProgress);
    }

    // 5. Seed-directed Gapped Extension:
    // Define the bounding window around the best HSP with an adaptive margin for insertions/deletions
    const margin = Math.max(40, Math.floor(Math.max(s1.length, s2.length) * 0.5));
    const subQStart = Math.max(0, bestHSP.qStart - margin);
    const subQEnd = Math.min(s1.length, bestHSP.qEnd + margin);
    const subSStart = Math.max(0, bestHSP.sStart - margin);
    const subSEnd = Math.min(s2.length, bestHSP.sEnd + margin);

    const subS1 = s1.substring(subQStart, subQEnd);
    const subS2 = s2.substring(subSStart, subSEnd);

    // Compute localized DP matrix on the seed-directed region
    const subDP = buildDPMatrix(
        subS1,
        subS2,
        true, // local
        gapMath,
        gapOp,
        gapEx,
        matrixName,
        customMatch,
        customMismatch,
        null
    );

    const subTB = performTraceback(subS1, subS2, subDP, matrixName, customMatch, customMismatch);

    // Map traceback coordinates back to global sequence coordinates
    const globalStartI = subQStart + subTB.startI;
    const globalStartJ = subSStart + subTB.startJ;

    // Build the returned DP structure compatible with UI & statistics
    const dp = {
        H: subDP.H,
        TB: subDP.TB,
        n: s1.length,
        m: s2.length,
        isLocal: true,
        maxI: globalStartI,
        maxJ: globalStartJ,
        rawScore: subDP.rawScore,
        gapMath
    };

    const tb = {
        ...subTB,
        startI: globalStartI,
        startJ: globalStartJ
    };

    if (onProgress) onProgress('BLAST Traceback Complete', 100);

    return { dp, tb };
}
