/**
 * @file core/alignmentWorker.js
 * @description Web Worker script that receives serialized data, instantiates DP matrices, runs the alignment algorithms, and posts results back without blocking the main browser thread.
 * @pipelineLocation Background-thread entry point. Isolates heavy computational logic from the DOM thread.
 * @changeImpact Modifying the postMessage/onmessage data structure here will break serialization and cause the application UI to hang waiting for responses that never arrive.
 */

import { runAlignmentSync } from './alignmentEngine.js';

self.addEventListener('message', (e) => {
    const id = e?.data?.id;
    try {
        const { onProgress: _, ...params } = e.data;
        const onProgress = (stage, p) => self.postMessage({ id, type: 'progress', percent: p, stage });
        const result = runAlignmentSync({ ...params, onProgress });

        self.postMessage({ id, success: true, result });
    } catch (error) {
        self.postMessage({
            id,
            success: false,
            error: error ? error.stack || error.message || error.toString() : 'Unknown Error'
        });
    }
});
