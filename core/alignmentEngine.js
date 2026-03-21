/**
 * @file core/alignmentEngine.js
 * @description Orchestrates the sequence analysis process. Routes inputs to specific algorithms, manages Web Workers, and aggregates results.
 * @pipelineLocation Middle-tier controller. Sits between the UI (main.js / resultsController) and the lower-level algorithms.
 * @changeImpact Modifying worker instantiation or message passing logic here will disrupt the asynchronous non-blocking UI flow and could cause race conditions.
 */

/**
 * @file core/alignmentEngine.js
 * @description Central coordinator for dispatching DNA/Protein sequence alignments.
 * @pipeline Sits between the UI layer (which calls runAlignment) and the algorithm/metrics layers. Converts raw user input into robust worker requests or fallback synchronous computations, returning standardized Contract payloads.
 */
import { needlemanWunsch } from '../algorithms/needlemanWunsch.js?v=27';
import { smithWaterman } from '../algorithms/smithWaterman.js?v=27';
import { blastSeedExtend } from '../algorithms/blastSeedExtend.js?v=27';
import { calculateIdentity } from '../metrics/identityCalculator.js?v=27';
import { calculateSimilarity } from '../metrics/similarityCalculator.js?v=27';
import { isStatsValid, calculateStatistics } from '../metrics/blastStatistics.js?v=27';
import { determineMode } from '../ui/modeConfigs.js?v=27';
import { validateAlignment } from './alignmentValidator.js?v=27';
import { jukesCantorDistance, poissonDistance } from '../metrics/phylogenetics.js?v=27';

const VISUAL_LIMIT = 160_000;

let _worker = null;
let _workerOk = true;

function _getWorker() {
    if (!_workerOk) return null;
    if (_worker) return _worker;
    try {
        _worker = new Worker(new URL('../core/alignmentWorker.js', import.meta.url), { type: 'module' });
        _worker.onerror = () => { _workerOk = false; _worker = null; };
        return _worker;
    } catch {
        _workerOk = false;
        return null;
    }
}

export function runAlignmentSync(seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh = null, onProgress = null) {
    const isLocal = algoType === 'local' || algoType === 'blast';
    const strictMode = determineMode(seqType, isLocal, gapMath, matrixName);

    const ALGORITHM_MAP = {
        'global': needlemanWunsch,
        'blast': blastSeedExtend,
        'local': smithWaterman
    };

    const openNum = parseFloat(gapOp) || Number(gapOp);
    const exNum = parseFloat(gapEx) || Number(gapEx);

    const algorithmFn = ALGORITHM_MAP[algoType] ?? smithWaterman;
    const result = algorithmFn(seq1, seq2, gapMath, openNum, exNum, matrixName, customMatch, customMismatch, onProgress);

    const { dp, tb } = result;
    const cellCount = (dp.n + 1) * (dp.m + 1);
    const sendVisual = cellCount <= VISUAL_LIMIT;

    const identityPercent = calculateIdentity(tb.matches, tb.length);
    const phylogeneticDistance = seqType === 'dna'
        ? jukesCantorDistance(identityPercent / 100)
        : poissonDistance(identityPercent / 100);

    let similarityPercent = null;
    if (seqType === 'protein' && tb.length > 0) {
        similarityPercent = calculateSimilarity(tb.alignedSeq1, tb.alignedSeq2, matrixName);
    }

    let statsAvailable = false;
    let statsReason = 'Global alignment output metrics do not support E-values';
    let bitScoreVal = null;
    let eValueVal = null;

    if (isLocal) {
        const sv = isStatsValid(gapMath, algoType, matrixName, openNum, exNum);
        statsAvailable = sv.valid;
        statsReason = sv.reason || null;

        if (sv.valid) {
            const stats = calculateStatistics(dp.rawScore, seq1.length, seq2.length, matrixName, openNum, exNum, databaseSize);
            if (stats) {
                // Ensure they are numbers not strings for strict API formats
                bitScoreVal = Number(stats.bitScore);
                eValueVal = Number(stats.eValue);

                if (expectThresh !== null && expectThresh !== undefined && eValueVal > expectThresh) {
                    throw new Error(`No significant similarity found (E-value ${eValueVal.toExponential(2)} exceeds threshold ${expectThresh}).`);
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
        // Legacy UI fields
        matrixName: matrixName,
        algoType: algoType
    };

    return finalResult;
}

export const runAlignment = (seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh) => {
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
                settle(() => {
                    if (e.data.success) resolve(e.data.result);
                    else reject(new Error(e.data.error));
                });
            };

            const timer = setTimeout(() => {
                settle(() => {
                    console.warn('BioAlign-Pro: worker timeout - falling back to sync computation.');
                    try { resolve(runAlignmentSync(seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh)); }
                    catch (err) { reject(err); }
                });
            }, 5000);

            worker.addEventListener('message', onMessage);
            worker.postMessage({ id, seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh });
        });
    }

    return Promise.resolve().then(() =>
        runAlignmentSync(seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh)
    );
};

