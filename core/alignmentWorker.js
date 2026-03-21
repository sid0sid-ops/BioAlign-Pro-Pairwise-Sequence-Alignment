/**
 * @file core/alignmentWorker.js
 * @description Web Worker script that receives serialized data, instantiates DP matrices, runs the alignment algorithms, and posts results back without blocking the main browser thread.
 * @pipelineLocation Background-thread entry point. Isolates heavy computational logic from the DOM thread.
 * @changeImpact Modifying the postMessage/onmessage data structure here will break serialization and cause the application UI to hang waiting for responses that never arrive.
 */

/**
 * @file core/alignmentWorker.js
 * @description Web Worker interface for offloading expensive alignment calculations from the main UI thread.
 * @pipeline Receives postMessage events via alignmentEngine.js, runs the synchronous DP alignment routines isolated from the DOM, and returns JSON payloads containing traces and matrix scores.
 */
import { runAlignmentSync } from './alignmentEngine.js?v=27';

self.addEventListener('message', (e) => {
    try {
        const { id, seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh } = e.data;
        const onProgress = (stage, p) => self.postMessage({ id, type: 'progress', percent: p, stage });
        const result = runAlignmentSync(seq1, seq2, seqType, gapMath, gapOp, gapEx, matrixName, customMatch, customMismatch, algoType, databaseSize, expectThresh, onProgress);

        const transferables = [];
        if (result.dp) {
            if (result.dp.H instanceof Float32Array) transferables.push(result.dp.H.buffer);
            if (result.dp.TB instanceof Uint8Array) transferables.push(result.dp.TB.buffer);
        }

        self.postMessage({ id, success: true, result }, transferables);
    } catch (error) {
        self.postMessage({ id, success: false, error: error.message });
    }
});

