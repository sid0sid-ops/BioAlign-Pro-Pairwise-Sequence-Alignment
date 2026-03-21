/**
 * @file core/alignmentWorker.js
 * @description Web Worker interface for offloading expensive alignment calculations from the main UI thread.
 * @pipeline Receives postMessage events via alignmentEngine.js, runs the synchronous DP alignment routines isolated from the DOM, and returns JSON payloads containing traces and matrix scores.
 */
import { runAlignmentSync } from './alignmentEngine.js?v=27';

self.addEventListener('message', (e) => {
    const { id, seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh } = e.data;
    try {
        const result = runAlignmentSync(seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh);
        self.postMessage({ id, success: true, result });
    } catch (error) {
        self.postMessage({ id, success: false, error: error.message });
    }
});

