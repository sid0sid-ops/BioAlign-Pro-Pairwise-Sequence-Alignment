/**
 * @file export/fastaExport.js
 * @description Converts raw sequence strings into standard bioinformatics FASTA formatting.
 * @pipelineLocation Post-processing phase. Called when the user clicks "Download FASTA".
 * @changeImpact Modifying the line-wrap logic (typically 80 characters) will violate FASTA syntactical standards.
 */

export function downloadAlignmentFASTA(res) {
    const s1Name = window.currentS1Name || 'Sequence_1';
    const s2Name = window.currentS2Name || 'Sequence_2';
    const algoName = res.additional_metrics.algoType;

    // Chunk sequence into 80 characters per line
    const chunkString = (str, length) => str.match(new RegExp('.{1,' + length + '}', 'g')) || [];

    const seq1Lines = chunkString(res.additional_metrics.alignedSeq1, 80).join('\n');
    const seq2Lines = chunkString(res.additional_metrics.alignedSeq2, 80).join('\n');

    const m = res.additional_metrics || {};
    const stats = res.stats || {};
    const eVal = stats.eValue !== undefined && stats.eValue !== null ? ` | E-Value: ${stats.eValue.toExponential(2)}` : '';
    const bScore = stats.bitScore !== undefined && stats.bitScore !== null ? ` | Bit-Score: ${stats.bitScore.toFixed(1)}` : '';
    const gapMath = res.metadata?.gapModel || 'affine';
    const gaps = res.metadata?.gapOpen !== undefined ? ` | Gaps: ${res.metadata.gapOpen}/${res.metadata.gapExtend} (${gapMath})` : '';

    const headerBase = `[Algorithm: ${algoName.toUpperCase()}] [Matrix: ${res.metadata?.matrix || 'Unknown'}] [Score: ${stats.rawScore || res.alignment_score}]${bScore}${eVal}${gaps} [Len: ${res.alignment_length}] [Iden: ${res.identity_percent}%] [Sim: ${res.similarity_percent || res.identity_percent}%]`;

    const fastaContent = `>${s1Name} ${headerBase}
${seq1Lines}
>${s2Name} ${headerBase}
${seq2Lines}
`;

    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8);
    a.download = `alignment_${algoName}_${s1Name.substring(0, 20)}_vs_${s2Name.substring(0, 20)}_${timestamp}.fasta`;
    a.click();
    URL.revokeObjectURL(url);
}
