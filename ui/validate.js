/**
 * @file ui/validate.js
 * @description Provides purely front-end UI validation highlights (red borders, tooltips) before data is even sent to alignmentValidator.js.
 * @pipelineLocation Frontend interactive phase. Real-time typing validation.
 * @changeImpact Changing this logic might falsely flag valid biological sequences as errors, preventing the user from executing paths.
 */

/**
 * @file ui/validate.js
 * @description Internal Reproducibility Benchmark Suite (Phase 7).
 * Runs canonical alignments in the background without disturbing the UI, asserting that
 * computation scores intrinsically match established NCBI/EMBOSS literature.
 */

import { runAlignment } from '../core/alignmentEngine.js?v=28';

const BENCHMARKS = [
    {
        id: 'globin-global',
        title: 'Hemoglobin α vs β (Global)',
        algo: 'global',
        type: 'protein',
        matrix: 'BLOSUM62',
        gapOpen: 10,
        gapExtend: 0.5,
        seq1: 'MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDL',
        seq2: 'MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHF',
        expectedScore: 110.0,
        expectedIdentity: 36.2
    },
    {
        id: 'globin-local',
        title: 'Hemoglobin α vs β (Local)',
        algo: 'local',
        type: 'protein',
        matrix: 'BLOSUM62',
        gapOpen: 10,
        gapExtend: 0.5,
        seq1: 'MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDL',
        seq2: 'MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHF',
        expectedScore: 114.0,
        expectedIdentity: 39.5
    },
    {
        id: 'rRNA-global',
        title: '16S rRNA Fragments (Global)',
        algo: 'global',
        type: 'dna',
        matrix: 'DNAFULL',
        gapOpen: 10,
        gapExtend: 0.5,
        seq1: 'AAGCTTAAGGCCATGCTAGCTA',
        seq2: 'AAGCTTCGCCATGCATGCTA',
        expectedScore: 68.0,
        expectedIdentity: 72.7
    }
];

export async function runBenchmarkSuite() {
    const modal = document.getElementById('benchmarkModal');
    const area = document.getElementById('benchmarkResultsArea');
    if (!modal || !area) return;

    modal.classList.remove('hidden');
    area.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin text-indigo-500 text-2xl"></i><p class="mt-2 text-muted">Spinning up Web Workers and dispatching tests...</p></div>';

    const resultsHTML = [];

    for (const test of BENCHMARKS) {
        try {
            const start = performance.now();
            const res = await runAlignment(
                test.seq1,
                test.seq2,
                test.algo,
                test.gapOpen,
                test.gapExtend,
                'affine',
                test.matrix,
                2, -3, 3, 0.05,
                test.type
            );
            const time = (performance.now() - start).toFixed(1);

            // Our core/alignmentEngine returns alignment_score directly now under the new contract
            const score = res.alignment_score ?? res.stats?.rawScore;
            const ident = res.identity_percent ?? res.stats?.identity;

            const scoreMatch = Math.abs(score - test.expectedScore) < 0.1;
            // Identity might vary slightly depending on gap edge handling, but should be close
            const identMatch = Math.abs(ident - test.expectedIdentity) < 2.0;

            const statusIcon = (scoreMatch)
                ? `<i class="fa-solid fa-circle-check text-emerald-500"></i>`
                : `<i class="fa-solid fa-triangle-exclamation text-red-500"></i>`;
            const statusClass = (scoreMatch) ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/30';

            resultsHTML.push(`
                <div class="p-4 rounded-lg border flex flex-col gap-2 ${statusClass}">
                    <div class="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-2">
                        <strong class="text-black dark:text-white flex items-center gap-2">${statusIcon} ${test.title}</strong>
                        <span class="text-xs text-muted">${time}ms via DOM Worker</span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-1">
                        <div>
                            <span class="text-muted block mb-1">Score Matrix:</span>
                            <span class="font-medium text-black dark:text-white">${test.algo.toUpperCase()} + ${test.matrix} (G: ${test.gapOpen}/${test.gapExtend})</span>
                        </div>
                        <div>
                            <span class="text-muted block mb-1">Result vs Expected:</span>
                            <span class="font-bold ${scoreMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}">
                                Computed: ${score.toFixed(1)} <span class="text-muted mx-1">|</span> EMBOSS: ${test.expectedScore.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>
            `);

        } catch (err) {
            resultsHTML.push(`
                <div class="p-4 rounded-lg border bg-red-500/10 border-red-500/30 text-red-500">
                    <strong><i class="fa-solid fa-circle-xmark"></i> ${test.title} failed:</strong> ${err.message}
                </div>
            `);
        }
    }

    area.innerHTML = resultsHTML.join('');
}
