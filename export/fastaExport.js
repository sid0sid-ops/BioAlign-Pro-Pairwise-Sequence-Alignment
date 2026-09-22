/**
 * @file export/fastaExport.js
 * @description Converts raw sequence strings into standard bioinformatics FASTA formatting.
 * @pipelineLocation Post-processing phase. Called when the user clicks "Download FASTA".
 * @changeImpact Modifying the line-wrap logic (typically 80 characters) will violate FASTA syntactical standards.
 */

export function downloadAlignmentFASTA(res) {
    if (!res || !res.additional_metrics) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert('Invalid alignment result');
        }
        return;
    }

    const s1Name = window.currentS1Name || 'Sequence_1';
    const s2Name = window.currentS2Name || 'Sequence_2';

    const cleanName = (name) =>
        name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 30);
    const safeS1 = cleanName(s1Name);
    const safeS2 = cleanName(s2Name);

    const m = res.additional_metrics || {};
    const algoName = m.algoType || 'alignment';

    // Chunk sequence into 80 characters per line safely
    const chunkString = (str, length) => {
        if (!str) return [];
        return str.match(new RegExp('.{1,' + length + '}', 'g')) || [];
    };

    const seq1Lines = chunkString(m.alignedSeq1 || '', 80).join('\n');
    const seq2Lines = chunkString(m.alignedSeq2 || '', 80).join('\n');

    const stats = res.stats || {};
    const eVal =
        stats.eValue !== undefined && stats.eValue !== null ? ` | E-Value: ${stats.eValue.toExponential(2)}` : '';
    const bScore =
        stats.bitScore !== undefined && stats.bitScore !== null ? ` | Bit-Score: ${stats.bitScore.toFixed(1)}` : '';
    const gapMath = res.metadata?.gapModel || 'affine';
    const gaps =
        res.metadata?.gapOpen !== undefined
            ? ` | Gaps: ${res.metadata.gapOpen}/${res.metadata.gapExtend} (${gapMath})`
            : '';

    const headerBase = `[Algorithm: ${algoName.toUpperCase()}] [Matrix: ${res.metadata?.matrix || 'Unknown'}] [Score: ${stats.rawScore || res.alignment_score}]${bScore}${eVal}${gaps} [Len: ${res.alignment_length}] [Iden: ${res.identity_percent}%] [Sim: ${res.similarity_percent || res.identity_percent}%]`;

    const fastaContent = `>${safeS1} ${headerBase}
${seq1Lines}
>${safeS2} ${headerBase}
${seq2Lines}
`;

    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8);
    const fileSafe = (name) =>
        name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 20);
    a.download = `alignment_${algoName}_${fileSafe(s1Name)}_vs_${fileSafe(s2Name)}_${timestamp}.fasta`;
    a.click();

    // Prevent memory leaks
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
