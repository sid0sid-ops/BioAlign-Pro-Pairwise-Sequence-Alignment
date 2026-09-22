/**
 * @file core/alignmentEngine.js
 * @description Orchestrates the sequence analysis process. Routes inputs to specific algorithms, manages Web Workers, and aggregates results.
 * @pipelineLocation Middle-tier controller. Sits between the UI (main.js / resultsController) and the lower-level algorithms.
 * @changeImpact Modifying worker instantiation or message passing logic here will disrupt the asynchronous non-blocking UI flow and could cause race conditions.
 */

import { blastSeedExtend } from '../algorithms/blastSeedExtend.js';
import { needlemanWunsch } from '../algorithms/needlemanWunsch.js';
import { smithWaterman } from '../algorithms/smithWaterman.js';
import { calculateStatistics, isStatsValid } from '../metrics/blastStatistics.js';
import { calculateIdentity } from '../metrics/identityCalculator.js';
import { jukesCantorDistance, poissonDistance } from '../metrics/phylogenetics.js';
import { calculateSimilarity } from '../metrics/similarityCalculator.js';
import { determineMode } from '../ui/modeConfigs.js';
import { validateAlignment, validateAlignmentParams } from './alignmentValidator.js';

const VISUAL_LIMIT = 160_000;

let _worker = null;
let _workerOk = true;

function _getWorker() {
    if (!_workerOk) return null;
    if (_worker) return _worker;
    try {
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
            _workerOk = false;
            return null;
        }
        _worker = new Worker(new URL('../core/alignmentWorker.js', import.meta.url), { type: 'module' });
        _worker.onerror = () => {
            _workerOk = false;
            _worker = null;
        };
        return _worker;
    } catch {
        _workerOk = false;
        return null;
    }
}

/**
 * Normalizes input parameters from either a structured configuration object or positional arguments.
 * Ensures modularity and decoupling across the entire application.
 */
export function normalizeAlignmentParams(arg1, ...rest) {
    if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
        return {
            seq1: arg1.seq1 || '',
            seq2: arg1.seq2 || '',
            seqType: arg1.seqType || arg1.sequenceType || 'protein',
            gapMath: arg1.gapMath || arg1.gapModel || 'affine',
            gapOp: arg1.gapOp ?? arg1.gapOpen ?? 10,
            gapEx: arg1.gapEx ?? arg1.gapExtend ?? 0.5,
            matrixName: arg1.matrixName || arg1.matrix || 'BLOSUM62',
            customMatch: arg1.customMatch ?? arg1.match,
            customMismatch: arg1.customMismatch ?? arg1.mismatch,
            algoType: arg1.algoType || arg1.algorithm || 'global',
            databaseSize: arg1.databaseSize ?? arg1.dbSize ?? null,
            expectThresh: arg1.expectThresh ?? arg1.expectThreshold ?? null,
            wordSize: arg1.wordSize ? Number(arg1.wordSize) : null,
            thresholdT: arg1.thresholdT ? Number(arg1.thresholdT) : null,
            xDropoff: arg1.xDropoff ? Number(arg1.xDropoff) : null,
            onProgress: arg1.onProgress || null
        };
    }

    return {
        seq1: arg1 || '',
        seq2: rest[0] || '',
        seqType: rest[1] || 'protein',
        gapMath: rest[2] || 'affine',
        gapOp: rest[3] ?? 10,
        gapEx: rest[4] ?? 0.5,
        matrixName: rest[5] || 'BLOSUM62',
        customMatch: rest[6],
        customMismatch: rest[7],
        algoType: rest[8] || 'global',
        databaseSize: rest[9] ?? null,
        expectThresh: rest[10] ?? null,
        wordSize: rest[11] ? Number(rest[11]) : null,
        thresholdT: rest[12] ? Number(rest[12]) : null,
        xDropoff: rest[13] ? Number(rest[13]) : null,
        onProgress: rest[14] || null
    };
}

export function runAlignmentSync(arg1, ...rest) {
    const params = normalizeAlignmentParams(arg1, ...rest);
    validateAlignmentParams(params);

    const {
        seq1,
        seq2,
        seqType,
        gapMath,
        gapOp,
        gapEx,
        matrixName,
        customMatch,
        customMismatch,
        algoType,
        databaseSize,
        expectThresh,
        onProgress,
        wordSize,
        thresholdT,
        xDropoff
    } = params;

    const isLocal = algoType === 'local' || algoType === 'blast';
    const strictMode = determineMode(seqType, isLocal, gapMath, matrixName);

    const ALGORITHM_MAP = {
        global: needlemanWunsch,
        blast: blastSeedExtend,
        local: smithWaterman
    };

    const openNum = parseFloat(gapOp) || Number(gapOp);
    const exNum = parseFloat(gapEx) || Number(gapEx);

    const algorithmFn = ALGORITHM_MAP[algoType] ?? smithWaterman;
    const result =
        algoType === 'blast'
            ? blastSeedExtend(
                  seq1,
                  seq2,
                  gapMath,
                  openNum,
                  exNum,
                  matrixName,
                  customMatch,
                  customMismatch,
                  onProgress,
                  wordSize,
                  thresholdT,
                  xDropoff
              )
            : algorithmFn(seq1, seq2, gapMath, openNum, exNum, matrixName, customMatch, customMismatch, onProgress);

    const { dp, tb } = result;
    const cellCount = (dp.n + 1) * (dp.m + 1);
    const sendVisual = cellCount <= VISUAL_LIMIT;

    const identityPercent = calculateIdentity(tb.matches, tb.length);
    const phylogeneticDistance =
        seqType === 'dna' ? jukesCantorDistance(identityPercent / 100) : poissonDistance(identityPercent / 100);

    let similarityPercent = null;
    if (seqType === 'protein' && tb.length > 0) {
        similarityPercent = calculateSimilarity(tb.alignedSeq1, tb.alignedSeq2, matrixName);
    }

    let statsAvailable = false;
    let statsReason = 'Global alignment output metrics do not support E-values';
    let bitScoreVal = null;
    let eValueVal = null;

    if (isLocal) {
        const sv = isStatsValid(gapMath, algoType, matrixName, openNum, exNum, customMatch, customMismatch);
        statsAvailable = sv.valid;
        statsReason = sv.reason || null;

        if (sv.valid) {
            const stats = calculateStatistics(
                dp.rawScore,
                seq1.length,
                seq2.length,
                matrixName,
                openNum,
                exNum,
                databaseSize,
                customMatch,
                customMismatch
            );
            if (stats) {
                bitScoreVal = Number(stats.bitScore);
                eValueVal = Number(stats.eValue);

                if (expectThresh !== null && expectThresh !== undefined && eValueVal > expectThresh) {
                    throw new Error(
                        `No significant similarity found (E-value ${eValueVal.toExponential(2)} exceeds threshold ${expectThresh}).`
                    );
                }
            }
        }
    }

    // Core Research-Grade Contract
    const finalResult = {
        alignedSeq1: tb.alignedSeq1,
        alignedSeq2: tb.alignedSeq2,
        matchLine: tb.matchLine,
        stats: {
            rawScore: dp.rawScore,
            bitScore: bitScoreVal,
            eValue: eValueVal,
            identity: identityPercent,
            phylogeneticDistance: phylogeneticDistance,
            positives: tb.positives,
            gaps: tb.gaps,
            alignmentLength: tb.length,
            queryCoverage: tb.queryCoverage,
            statsAvailable: statsAvailable,
            statsReason: statsReason
        },
        metadata: {
            algorithm: strictMode,
            matrix: matrixName,
            gapModel: gapMath,
            gapOpen: openNum,
            gapExtend: exNum,
            customMatch: customMatch,
            customMismatch: customMismatch,
            timestamp: new Date().toISOString()
        },
        tracePath: sendVisual ? tb.tracePath : [],
        dp: {
            H: sendVisual ? dp.H : null,
            TB: sendVisual ? dp.TB : null,
            n: dp.n,
            m: dp.m,
            maxI: dp.maxI,
            maxJ: dp.maxJ
        }
    };

    validateAlignment(finalResult);

    // Provide legacy properties strictly for UI backwards compatibility logic during bridging phase.
    finalResult.algorithm = strictMode;
    finalResult.sequence_type = seqType;
    finalResult.alignment_score = dp.rawScore;
    finalResult.identity_percent = identityPercent;
    finalResult.gaps = tb.gaps;
    finalResult.alignment_length = tb.length;
    finalResult.similarity_percent = similarityPercent;
    finalResult.additional_metrics = {
        mathLength: tb.length,
        matches: tb.matches,
        positives: tb.positives,
        alignedSeq1: tb.alignedSeq1,
        alignedSeq2: tb.alignedSeq2,
        matchLine: tb.matchLine,
        // Raw original sequences for DP table header labels (never gap-stripped)
        rawSeq1: seq1,
        rawSeq2: seq2,
        startI: tb.startI,
        startJ: tb.startJ,
        H: sendVisual ? dp.H : null,
        TB: sendVisual ? dp.TB : null,
        n: dp.n,
        m: dp.m,
        maxI: dp.maxI,
        maxJ: dp.maxJ,
        statsAvailable,
        statsReason,
        bit_score: bitScoreVal,
        e_value: eValueVal,
        gapMath: gapMath,
        customMatch: customMatch,
        customMismatch: customMismatch,
        // Legacy UI fields
        matrixName: matrixName,
        algoType: algoType
    };

    return finalResult;
}

export const runAlignment = (arg1, ...rest) => {
    const params = normalizeAlignmentParams(arg1, ...rest);
    validateAlignmentParams(params);

    const worker = _getWorker();

    if (worker) {
        return new Promise((resolve, reject) => {
            const id = `${Date.now()}-${Math.random()}`;
            let settled = false;

            const settle = (fn) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                worker.removeEventListener('message', onMessage);
                fn();
            };

            const onMessage = (e) => {
                if (e.data.id !== id) return;
                if (e.data.type === 'progress') {
                    if (params.onProgress) params.onProgress(e.data.stage, e.data.percent);
                    return;
                }
                settle(() => {
                    if (e.data.success) resolve(e.data.result);
                    else reject(new Error(e.data.error));
                });
            };

            const timer = setTimeout(() => {
                settle(() => {
                    console.warn('BioAlign-Pro: worker timeout - falling back to sync computation.');
                    try {
                        resolve(runAlignmentSync(params));
                    } catch (err) {
                        reject(err);
                    }
                });
            }, 10000);

            worker.addEventListener('message', onMessage);
            worker.postMessage({ id, ...params });
        });
    }

    return Promise.resolve().then(() => runAlignmentSync(params));
};
