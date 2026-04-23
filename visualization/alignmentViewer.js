/**
 * @file visualization/alignmentViewer.js
 * @description High-fidelity line-by-line pairwise character alignment renderer (the classic sequence map).
 * @pipeline The UI results controller calls this to inject fixed-width annotated text blocks showing matches, gaps (-), and highlighting chemical mismatches strictly.
 */
export const renderSequenceMap = (result) => {
    const container = document.getElementById('alignmentViewer');
    if (!container) return;

    const metrics = result.additional_metrics;
    if (!metrics || !metrics.alignedSeq1) {
        container.innerHTML = `<div style="color:#ef4444;font-family:monospace;padding:16px;">Error: Invalid alignment result.</div>`;
        return;
    }

    const align1 = metrics.alignedSeq1;
    const align2 = metrics.alignedSeq2;
    const len = align1.length;

    const legendEl = document.getElementById('sequenceLegend');
    if (legendEl) {
        legendEl.innerHTML = [
            ['#3b82f6', 'Seq_Alpha'],
            ['#22c55e', 'Seq_Beta'],
            ['#ef4444', 'Mismatch'],
            ['#9ca3af', 'Gap'],
        ].map(([c, label]) =>
            `<span style="display:flex;align-items:center;gap:6px;">
                <span style="width:10px;height:10px;border-radius:50%;background:${c};display:inline-block;flex-shrink:0;"></span>
                <span style="font-size:11px;font-family:monospace;font-weight:600;">${label}</span>
             </span>`
        ).join('');
    }

    const CW = 14;
    const CON_H = 24;
    
    let cWidth = container.clientWidth;
    if (cWidth < 100) cWidth = Math.min(window.innerWidth - 60, 800);
    let availableWidth = cWidth - 240;
    const CHUNK = Math.max(10, Math.min(100, Math.floor(availableWidth / CW)));

    if (!window._alignmentViewerResizeAttached) {
        window.addEventListener('resize', () => {
            if (window._lastAlignmentResult && document.getElementById('alignmentViewer')) {
                clearTimeout(window._alignmentViewerResizeTimer);
                window._alignmentViewerResizeTimer = setTimeout(() => {
                    renderSequenceMap(window._lastAlignmentResult);
                }, 150);
            }
        });
        window._alignmentViewerResizeAttached = true;
    }
    const name1 = (window.currentS1Name || 'Seq_Alpha').substring(0, 12);
    const name2 = (window.currentS2Name || 'Seq_Beta').substring(0, 12);
    const LABEL_W = '96px';

    let chunks = '';
    let aCursor = metrics.startI || 0;
    let bCursor = metrics.startJ || 0;

    for (let i = 0; i < len; i += CHUNK) {
        const s1 = align1.substring(i, i + CHUNK);
        const s2 = align2.substring(i, i + CHUNK);
        const cLen = s1.length;

        const charsA = s1.replace(/-/g, '').length;
        const charsB = s2.replace(/-/g, '').length;
        const startA = aCursor + 1;
        const startB = bCursor + 1;
        const endA = aCursor + charsA;
        const endB = bCursor + charsB;

        let row1 = '', conn = '', row2 = '';

        for (let k = 0; k < cLen; k++) {
            const a = s1[k];
            const b = s2[k];

            const gapA = (a === '-');
            const gapB = (b === '-');
            const matched = (!gapA && !gapB && a === b);
            const mismatched = (!gapA && !gapB && a !== b);

            const c1 = gapA ? '#9ca3af' : mismatched ? '#ef4444' : '#3b82f6';
            const bold1 = (!gapA) ? '700' : '400';

            const c2 = gapB ? '#9ca3af' : mismatched ? '#ef4444' : '#22c55e';
            const bold2 = (!gapB) ? '700' : '400';

            const cellStyle = `display:inline-block;width:${CW}px;text-align:center;font-family:'Courier New',monospace;font-size:13px;`;
            row1 += `<span style="${cellStyle}color:${c1};font-weight:${bold1};">${a}</span>`;
            row2 += `<span style="${cellStyle}color:${c2};font-weight:${bold2};">${b}</span>`;

            const cStyle = `display:inline-block;width:${CW}px;height:${CON_H}px;position:relative;vertical-align:top;`;
            if (matched) {
                conn += `<span style="${cStyle}">` +
                    `<span style="position:absolute;left:50%;transform:translateX(-50%);top:0;width:2px;height:100%;` +
                    `background:linear-gradient(to bottom,#3b82f6 0%,#22c55e 100%);border-radius:1px;"></span>` +
                    `</span>`;
            } else if (mismatched) {
                conn += `<span style="${cStyle}">` +
                    `<span style="position:absolute;left:50%;transform:translateX(-50%);top:0;width:2px;height:100%;` +
                    `background:#ef4444;border-radius:1px;"></span>` +
                    `</span>`;
            } else {
                conn += `<span style="${cStyle}"></span>`;
            }
        }

        const posStyle = `display:inline-block;width:36px;text-align:right;margin-right:6px;font-size:11px;font-family:monospace;color:#9ca3af;flex-shrink:0;`;
        const endStyle = `font-size:11px;font-family:monospace;color:#9ca3af;margin-left:6px;min-width:28px;`;
        const rowStyle = `display:flex;align-items:center;white-space:nowrap;`;
        const nameStyle = (col) => `display:inline-block;min-width:${LABEL_W};font-weight:700;font-size:12px;font-family:monospace;color:${col};flex-shrink:0;`;

        chunks += `
        <div style="background:var(--surface,#f9f9f9);border:1px solid var(--border,#e5e7eb);border-radius:10px;
                    padding:14px 20px;margin-bottom:12px;overflow-x:auto;">

            <div style="${rowStyle}">
                <span style="${nameStyle('#3b82f6')}">${name1}</span>
                <span style="${posStyle}">${startA}</span>
                <div style="display:inline-flex;flex-wrap:nowrap;">${row1}</div>
                <span style="${endStyle}">${endA}</span>
            </div>

            <div style="${rowStyle}">
                <span style="${nameStyle('transparent')}">&nbsp;</span>
                <span style="${posStyle}"></span>
                <div style="display:inline-flex;flex-wrap:nowrap;height:${CON_H}px;">${conn}</div>
            </div>

            <div style="${rowStyle}">
                <span style="${nameStyle('#22c55e')}">${name2}</span>
                <span style="${posStyle}">${startB}</span>
                <div style="display:inline-flex;flex-wrap:nowrap;">${row2}</div>
                <span style="${endStyle}">${endB}</span>
            </div>

        </div>`;

        aCursor += charsA;
        bCursor += charsB;
    }

    container.innerHTML = `
        <div style="width:100%;display:flex;flex-direction:column;align-items:stretch;padding:8px 0;box-sizing:border-box;">
            ${chunks}
        </div>`;

    window._lastAlignmentResult = result;
};
