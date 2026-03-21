/**
 * @file visualization/alignmentViewer.js
 * @description Constructs the classic mono-spaced three-line textual layout for alignments (SeqA, Match indicators, SeqB).
 * @pipelineLocation Rendering tier. Formats strings for immediate display within pre/code HTML tags.
 * @changeImpact Changing the line-wrap mathematics (e.g. from 60 to 80 characters) without synchronizing CSS will cause severe horizontal overflow rendering bugs.
 */

/**
 * @file visualization/alignmentViewer.js
 * @description Ultra-performant HTML5 Canvas virtualization for sequence alignment mapping.
 * @pipeline Replaces explicit DOM nodes with a single sticky canvas. Responds to native scroll events to paint only visible segments at 60 FPS.
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

    // Canvas Settings
    const CHUNK = 60;
    const ROW_H = 80; // Height allocated for one chunk block
    const numRows = Math.ceil(len / CHUNK);
    const totalHeight = numRows * ROW_H;

    // Virtualization Wrapper (forces native browser scrollbar)
    container.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
            <button id="copyVisibleBtn" class="px-2 py-1 text-[10px] font-mono rounded bg-white dark:bg-[#1a1a1a] border border-border hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <i class="fa-solid fa-copy"></i> Copy Visible Block
            </button>
        </div>
        <div id="canvasScrollWrapper" style="position:relative; width:100%; height: ${Math.min(600, Math.max(120, totalHeight + 40))}px; overflow-y: auto; overflow-x: auto; background:var(--surface,#f9f9f9); border:1px solid var(--border,#e5e7eb); border-radius:10px;">
            <div style="position:absolute; top:0; left:0; width:1px; height:${totalHeight}px; pointer-events:none;"></div>
            <canvas id="alignmentCanvas" style="position:sticky; top:0; left:0; width:100%; height:100%;"></canvas>
        </div>
    `;

    const wrapper = document.getElementById('canvasScrollWrapper');
    const canvas = document.getElementById('alignmentCanvas');
    const ctx = canvas.getContext('2d');

    // High DPI Scaling
    const dpr = window.devicePixelRatio || 1;
    let canvasW = wrapper.clientWidth || 800;
    let canvasH = wrapper.clientHeight || 200;

    // We adjust canvas resolution to avoid blur on Retina/4K displays
    const resizeCanvas = () => {
        if (!wrapper.clientWidth || !wrapper.clientHeight) return;
        canvasW = wrapper.clientWidth;
        canvasH = wrapper.clientHeight;
        canvas.width = canvasW * dpr;
        canvas.height = canvasH * dpr;
        ctx.scale(dpr, dpr);
        // Force full repaint
        lastDrawnStart = -1;
        lastDrawnEnd = -1;
        draw();
    };

    const name1 = (window.currentS1Name || 'Seq_Alpha').substring(0, 12);
    const name2 = (window.currentS2Name || 'Seq_Beta').substring(0, 12);

    // Pre-calculate cumulative non-gap positions for fast index lookup
    const posA = new Int32Array(len + 1);
    const posB = new Int32Array(len + 1);
    let curA = metrics.startI || 0, curB = metrics.startJ || 0;
    for (let c = 0; c < len; c++) {
        posA[c] = curA;
        posB[c] = curB;
        if (align1[c] !== '-') curA++;
        if (align2[c] !== '-') curB++;
    }
    posA[len] = curA;
    posB[len] = curB;

    let lastDrawnStart = -1;
    let lastDrawnEnd = -1;

    const draw = () => {
        const scrollTop = wrapper.scrollTop;

        // Find visible rows (extend viewport slightly for smooth scrolling)
        const startRow = Math.max(0, Math.floor(scrollTop / ROW_H) - 1);
        const endRow = Math.min(numRows, Math.ceil((scrollTop + canvasH) / ROW_H) + 1);

        // Don't redraw if exactly the same rows are visible
        if (startRow === lastDrawnStart && endRow === lastDrawnEnd) return;
        lastDrawnStart = startRow;
        lastDrawnEnd = endRow;

        // Clear Background manually to guarantee it isn't transparent black
        const isDark = document.documentElement.classList.contains('dark');
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = isDark ? '#080808' : '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);

        ctx.textBaseline = 'middle';
        const PADDING_X = 20;
        const LABEL_W = 100;
        const POS_W = 40;
        const CHAR_W = 12; // Pixel width per character slot

        for (let r = startRow; r < endRow; r++) {
            const yOffset = (r * ROW_H) - scrollTop; // Canvas local Y coordinate

            const startIdx = r * CHUNK;
            const endIdx = Math.min(len, startIdx + CHUNK);

            if (startIdx >= len) break;

            const subA = align1.substring(startIdx, endIdx);
            const subB = align2.substring(startIdx, endIdx);

            const pA_start = posA[startIdx] + 1;
            const pB_start = posB[startIdx] + 1;
            const pA_end = posA[endIdx];
            const pB_end = posB[endIdx];

            // Render Backing Box
            ctx.fillStyle = isDark ? '#111' : '#fff';
            ctx.strokeStyle = isDark ? '#333' : '#e5e7eb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(PADDING_X - 10, yOffset + 10, canvasW - (PADDING_X * 2) + 20, ROW_H - 16, 8);
            } else {
                ctx.rect(PADDING_X - 10, yOffset + 10, canvasW - (PADDING_X * 2) + 20, ROW_H - 16);
            }
            ctx.fill();
            ctx.stroke();

            // Render Labels & Position Numbers
            const line1Y = yOffset + 24;
            const lineConY = yOffset + 38;
            const line2Y = yOffset + 52;

            ctx.font = "bold 12px monospace";
            ctx.fillStyle = "#3b82f6"; ctx.fillText(name1, PADDING_X, line1Y);
            ctx.fillStyle = "#22c55e"; ctx.fillText(name2, PADDING_X, line2Y);

            ctx.font = "11px monospace";
            ctx.fillStyle = "#9ca3af";
            ctx.textAlign = "right";
            ctx.fillText(pA_start.toString(), PADDING_X + LABEL_W + POS_W - 10, line1Y);
            ctx.fillText(pB_start.toString(), PADDING_X + LABEL_W + POS_W - 10, line2Y);

            ctx.textAlign = "left";
            const seqStart_X = PADDING_X + LABEL_W + POS_W;

            // Fast Character Loop
            for (let k = 0; k < subA.length; k++) {
                const a = subA[k];
                const b = subB[k];
                const x = seqStart_X + (k * CHAR_W);

                const gapA = a === '-';
                const gapB = b === '-';
                const matched = !gapA && !gapB && a === b;
                const mismatched = !gapA && !gapB && a !== b;

                // Render A Char
                ctx.font = gapA ? "400 13px Courier New, monospace" : "700 13px Courier New, monospace";
                ctx.fillStyle = gapA ? '#9ca3af' : mismatched ? '#ef4444' : '#3b82f6';
                ctx.fillText(a, x, line1Y);

                // Render B Char
                ctx.font = gapB ? "400 13px Courier New, monospace" : "700 13px Courier New, monospace";
                ctx.fillStyle = gapB ? '#9ca3af' : mismatched ? '#ef4444' : '#22c55e';
                ctx.fillText(b, x, line2Y);

                // Render Connection Tick
                if (matched) {
                    ctx.fillStyle = "#22c55e"; // Use single solid color for perf, gradients heavily tax 2D rects
                    ctx.fillRect(x + 3, lineConY - 4, 2, 8);
                } else if (mismatched) {
                    ctx.fillStyle = "#ef4444";
                    ctx.fillRect(x + 3, lineConY - 4, 2, 8);
                }
            }

            // End Positions
            ctx.font = "11px monospace";
            ctx.fillStyle = "#9ca3af";
            const endX = seqStart_X + (CHUNK * CHAR_W) + 10;
            ctx.fillText(pA_end.toString(), endX, line1Y);
            ctx.fillText(pB_end.toString(), endX, line2Y);
        }
    };

    // Initialize display with robust ResizeObserver
    window.addEventListener('resize', resizeCanvas);
    wrapper.addEventListener('scroll', () => requestAnimationFrame(draw));

    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
            if (wrapper.clientWidth > 0 && wrapper.clientHeight > 0) {
                requestAnimationFrame(resizeCanvas);
            }
        });
        ro.observe(wrapper);
    } else {
        // Fallback for very old browsers
        setTimeout(resizeCanvas, 50);
        setTimeout(resizeCanvas, 300);
    }

    // Attach "Copy Visible Block" functionality
    document.getElementById('copyVisibleBtn').addEventListener('click', () => {
        let blockText = "";
        for (let r = lastDrawnStart; r < lastDrawnEnd; r++) {
            if (r * CHUNK >= len) break;
            const startIdx = r * CHUNK;
            const endIdx = Math.min(len, startIdx + CHUNK);

            blockText += name1.padEnd(14) + align1.substring(startIdx, endIdx) + "\n";
            blockText += "".padEnd(14) + metrics.matchLine.substring(startIdx, endIdx) + "\n";
            blockText += name2.padEnd(14) + align2.substring(startIdx, endIdx) + "\n\n";
        }
        navigator.clipboard.writeText(blockText).then(() => {
            const btn = document.getElementById('copyVisibleBtn');
            btn.innerHTML = `<i class="fa-solid fa-check text-green-500"></i> Copied!`;
            setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-copy"></i> Copy Visible Block`; }, 2000);
        });
    });

    // Save context for other exports
    window._lastAlignmentResult = result;
};
