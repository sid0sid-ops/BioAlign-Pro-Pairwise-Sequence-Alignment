/**
 * @file visualization/conservationRenderer.js
 * @description Builds the NCBI-style horizontal graphic summary scale bar indicating alignment coverage.
 * @pipeline Ingests the top alignment payload and constructs a dynamic HTML DOM element mapped out by percentile markers across the sequence query length.
 */
export const renderGraphicSummary = (containerId, result) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const metrics = result.additional_metrics;
    if (!metrics || !metrics.alignedSeq1 || result.alignment_length === 0) {
        container.innerHTML =
            '<div class="text-gray-500 text-sm italic text-center py-4">Insufficient alignment data for graphical summary.</div>';
        return;
    }

    const align1 = metrics.alignedSeq1 || '';
    const align2 = metrics.alignedSeq2 || '';
    const alignLen = align1.length;

    const qLen = align1.replace(/-/g, '').length;
    if (qLen === 0) return;

    const matchPositions = [];
    const mismatchPositions = [];
    const gapPositions = [];

    let qCursor = 0;
    for (let i = 0; i < alignLen; i++) {
        const a = align1[i];
        const b = align2[i];
        const isGapA = a === '-';
        const isGapB = b === '-';

        if (!isGapA) {
            const pct = (qCursor / qLen) * 100;
            const w = (1 / qLen) * 100;

            if (isGapB) {
                gapPositions.push({ pct, w });
            } else if (a === b) {
                matchPositions.push({ pct, w });
            } else {
                mismatchPositions.push({ pct, w });
            }
            qCursor++;
        }
        if (isGapA && !isGapB) {
            const pct = (qCursor / qLen) * 100;
            gapPositions.push({ pct, w: (1 / qLen) * 100 });
        }
    }

    // NCBI BLAST Graphic Summary standard score colour scale:
    // ≥200  → brown/rust   (#92400e)
    // 80-200 → purple      (#7c3aed)
    // 50-80  → green       (#16a34a)
    // 40-50  → orange      (#f97316)
    // <40    → yellow      (#eab308)
    let barColor = '#eab308'; // default: yellow for <40
    if (result.alignment_score >= 200) barColor = '#92400e';
    else if (result.alignment_score >= 80)
        barColor = '#7c3aed'; // purple
    else if (result.alignment_score >= 50)
        barColor = '#16a34a'; // green
    else if (result.alignment_score >= 40) barColor = '#f97316'; // orange

    const numTicks = 6;
    let ticksHTML = '';
    for (let t = 0; t <= numTicks; t++) {
        const pct = (t / numTicks) * 100;
        const label = t === 0 ? 1 : Math.floor((t / numTicks) * qLen);
        const anchorStyle =
            t === 0
                ? 'left:0; transform:none;'
                : t === numTicks
                  ? 'right:0; left:auto; transform:none;'
                  : `left:${pct}%; transform:translateX(-50%);`;
        ticksHTML += `
            <div class="absolute top-0 h-[5px] w-px bg-gray-500 dark:bg-gray-400" style="left:${pct}%"></div>
            <div class="absolute top-[6px] text-[9px] text-gray-600 dark:text-gray-400 font-mono leading-none" style="${anchorStyle}">${label}</div>
        `;
    }

    const gapNotches = gapPositions
        .map(
            (p) =>
                `<div class="absolute top-0 h-full" style="left:${p.pct.toFixed(4)}%;width:calc(${p.w.toFixed(4)}% + 0.5px);background:#6b7280;opacity:0.6;z-index:2;"></div>`
        )
        .join('');

    const mismatchNotches = mismatchPositions
        .map(
            (p) =>
                `<div class="absolute top-0 h-full" style="left:${p.pct.toFixed(4)}%;width:calc(${p.w.toFixed(4)}% + 0.5px);background:#ef4444;opacity:0.9;z-index:3;"></div>`
        )
        .join('');

    const matchNotches = matchPositions
        .map(
            (p) =>
                `<div class="absolute top-0 h-full" style="left:${p.pct.toFixed(4)}%;width:calc(${p.w.toFixed(4)}% + 0.5px);background:${barColor};opacity:1;z-index:1;"></div>`
        )
        .join('');

    container.innerHTML = `
        <div class="w-full max-w-3xl mx-auto flex flex-col items-center gap-1 px-2 py-2">
            <div class="flex items-center gap-2 mb-2 w-full justify-center">
                <i class="fa-solid fa-chart-gantt text-muted text-base"></i>
                <span class="font-bold text-[13px] text-black dark:text-gray-200 text-center tracking-tight">
                    Distribution of Top BioAlign Match · 1 Subject Sequence
                </span>
            </div>
            <div class="relative w-full h-[16px] rounded-sm overflow-hidden border border-blue-500"
                 style="background:linear-gradient(90deg,#3b82f6,#60a5fa);">
                <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tracking-wider select-none">
                    Query (Alpha Seq)
                </div>
            </div>
            <div class="relative w-full h-[22px] mt-[2px]">
                <div class="absolute top-0 left-0 w-full h-px bg-gray-400 dark:bg-gray-600"></div>
                ${ticksHTML}
            </div>
            <div class="relative w-full h-[18px] mt-1">
                <div class="absolute top-[3px] h-[12px] w-full rounded-[2px] overflow-hidden" style="background:var(--surface);">
                     ${matchNotches}
                     ${gapNotches}
                     ${mismatchNotches}
                </div>
            </div>
            <div class="flex flex-wrap gap-x-5 gap-y-1 justify-center text-[10px] font-mono text-muted mt-3">
                <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:${barColor}"></span> Match (score-coloured)</span>
                <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm bg-red-500"></span> Mismatch</span>
                <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:#6b7280;opacity:0.6"></span> Gap</span>
            </div>
        </div>
    `;
};
