/**
 * @file export/embossFormatter.js
 * @description Formats raw alignment score and sequence strings into the standard EMBOSS Needle/Water text file output.
 * @pipelineLocation Post-processing phase. Takes final computed data and prepares it for user download.
 * @changeImpact Changing the column widths or header layouts here will cause incompatibility with external parsers expecting strict EMBOSS formatting.
 */

/**
 * @file ui/exportController.js
 * @description Logic for downloading alignment results in TXT, CSV, and JSON formats.
 */

const matrixCitations = {
    BLOSUM62: 'Henikoff & Henikoff, PNAS 1992',
    BLOSUM45: 'Henikoff & Henikoff, PNAS 1992',
    BLOSUM80: 'Henikoff & Henikoff, PNAS 1992',
    PAM250: 'Dayhoff et al. 1978',
    PAM30: 'Dayhoff et al. 1978',
    PAM70: 'Dayhoff et al. 1978',
    DNAFULL: 'EMBOSS / EDNAFULL',
    BLASTN: 'Altschul et al. 1990'
};

function generateFilename(extension, s1Name, s2Name, algo) {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8);
    // e.g. alignment_needle_NP001639_vs_PNI24853_20260315.txt
    return `alignment_${algo}_${s1Name.substring(0, 20)}_vs_${s2Name.substring(0, 20)}_${timestamp}.${extension}`;
}

function chunkString(str, length) {
    return str.match(new RegExp('.{1,' + length + '}', 'g')) || [];
}

export function downloadAlignmentTXT(res) {
    const s1Name = window.currentS1Name || 'Sequence_1';
    const s2Name = window.currentS2Name || 'Sequence_2';
    const s1Seq = res.additional_metrics.alignedSeq1.replace(/-/g, '');
    const s2Seq = res.additional_metrics.alignedSeq2.replace(/-/g, '');

    const algoName =
        res.additional_metrics.algoType === 'global'
            ? 'needle'
            : res.additional_metrics.algoType === 'local'
              ? 'water'
              : 'blast';

    const isProtein = res.sequence_type === 'protein';
    const typeStr = isProtein ? 'Protein' : 'DNA';

    const gapOp = res.metadata?.gapOpen ?? 10.0;
    const gapEx = res.metadata?.gapExtend ?? 0.5;
    let similarities = res.similarity_percent;
    if (similarities === null || similarities === undefined) {
        similarities = res.identity_percent; // fallback if DNA
    }

    const timestamp = new Date().toISOString();

    const isLinear = res.additional_metrics.gapMath === 'linear' || res.metadata?.gapModel === 'linear';
    const isCustom = res.additional_metrics.matrixName === 'CUSTOM';
    const matchScore = res.metadata?.customMatch ?? res.additional_metrics.customMatch ?? 1;
    const mismatchPenalty = res.metadata?.customMismatch ?? res.additional_metrics.customMismatch ?? -3;

    let content = `########################################
# BioAlign-Pro Alignment Report
# Program: ${algoName}
# Rundate: ${timestamp}
# Commandline: ${algoName}
#    -datafile ${res.additional_metrics.matrixName}
${isCustom ? `#    -match ${matchScore}\n#    -mismatch ${mismatchPenalty}\n` : ''}${isLinear ? `#    -gapmode linear\n#    -gapopen ${gapOp}\n` : `#    -gapopen ${gapOp}\n#    -gapextend ${gapEx}\n`}# Align_format: pair
########################################

#=======================================
# Aligned_sequences: 2
# 1: ${s1Name}
# 2: ${s2Name}
# Matrix: ${res.additional_metrics.matrixName}
${isCustom ? `# Match_score: ${matchScore}\n# Mismatch_penalty: ${mismatchPenalty}\n` : ''}# Gap_model: ${isLinear ? 'Linear' : 'Affine'}
# Gap_penalty: ${gapOp}
${isLinear ? '' : `# Extend_penalty: ${gapEx}\n`}#
# Length: ${res.alignment_length}
# Identity: ${res.additional_metrics.matches}/${res.alignment_length} (${((res.additional_metrics.matches / res.alignment_length) * 100).toFixed(1)}%)
# Similarity: ${res.additional_metrics.positives !== undefined ? res.additional_metrics.positives : Math.round((parseFloat(similarities) / 100) * res.alignment_length)}/${res.alignment_length} (${res.additional_metrics.positives !== undefined ? ((res.additional_metrics.positives / res.alignment_length) * 100).toFixed(1) : parseFloat(similarities).toFixed(1)}%)
# Gaps: ${res.gaps}/${res.alignment_length} (${((res.gaps / res.alignment_length) * 100).toFixed(1)}%)
# Score: ${res.alignment_score}
${res.additional_metrics.statsAvailable && res.additional_metrics.bit_score !== undefined ? `# Bit_Score: ${res.additional_metrics.bit_score}\n# E_Value: ${res.additional_metrics.e_value}\n` : ''}#=======================================

# Sequence 1 Metadata
# Query: ${s1Name}
# Length: ${res.additional_metrics.rawSeq1 ? res.additional_metrics.rawSeq1.length : s1Seq.length}
# Type: ${typeStr}

# Sequence 2 Metadata
# Subject: ${s2Name}
# Length: ${res.additional_metrics.rawSeq2 ? res.additional_metrics.rawSeq2.length : s2Seq.length}
# Type: ${typeStr}

# Reproducibility Parameters
# Algorithm: ${algoName === 'needle' ? 'Needleman-Wunsch' : algoName === 'water' ? 'Smith-Waterman' : 'BLAST-like'}
# Matrix: ${res.additional_metrics.matrixName}
${isCustom ? `# Match score: ${matchScore}\n# Mismatch penalty: ${mismatchPenalty}\n` : ''}# Gap model: ${isLinear ? 'Linear (Single Penalty)' : 'Affine (Open / Extend)'}
# Gap open: ${gapOp}
# Gap extend: ${isLinear ? 'N/A' : gapEx}
# Alignment type: ${res.additional_metrics.algoType === 'global' ? 'Global' : 'Local'}
# Sequence_1_Length: ${res.additional_metrics.rawSeq1 ? res.additional_metrics.rawSeq1.length : s1Seq.length}
# Sequence_2_Length: ${res.additional_metrics.rawSeq2 ? res.additional_metrics.rawSeq2.length : s2Seq.length}
# Alignment_Coverage_1: ${((s1Seq.length / (res.additional_metrics.rawSeq1 ? res.additional_metrics.rawSeq1.length : s1Seq.length)) * 100).toFixed(1)}%
# Alignment_Coverage_2: ${((s2Seq.length / (res.additional_metrics.rawSeq2 ? res.additional_metrics.rawSeq2.length : s2Seq.length)) * 100).toFixed(1)}%
# Query_Coverage: ${((s1Seq.length / (res.additional_metrics.rawSeq1 ? res.additional_metrics.rawSeq1.length : s1Seq.length)) * 100).toFixed(1)}%
# Matrix_Source: ${res.additional_metrics.matrixName} (${matrixCitations[res.additional_metrics.matrixName] || 'Unknown'})

`;

    const al1 = res.additional_metrics.alignedSeq1;
    const al2 = res.additional_metrics.alignedSeq2;
    const ml = res.additional_metrics.matchLine;

    const CHUNK_SIZE = 50;

    let pos1 = res.additional_metrics.startI + 1;
    let pos2 = res.additional_metrics.startJ + 1;

    for (let i = 0; i < al1.length; i += CHUNK_SIZE) {
        const chunk1 = al1.substring(i, i + CHUNK_SIZE);
        const chunkM = ml.substring(i, i + CHUNK_SIZE);
        const chunk2 = al2.substring(i, i + CHUNK_SIZE);

        const endPos1 = pos1 + chunk1.replace(/-/g, '').length - 1;
        const endPos2 = pos2 + chunk2.replace(/-/g, '').length - 1;

        const leftPadLength = Math.max(s1Name.length, s2Name.length);
        const name1Pad = s1Name.padEnd(leftPadLength, ' ');
        const name2Pad = s2Name.padEnd(leftPadLength, ' ');

        const p1Str = pos1.toString().padStart(5, ' ');
        const p1EndStr = chunk1.replace(/-/g, '').length === 0 ? '' : endPos1.toString();

        const p2Str = pos2.toString().padStart(5, ' ');
        const p2EndStr = chunk2.replace(/-/g, '').length === 0 ? '' : endPos2.toString();

        content += `${name1Pad}   ${p1Str} ${chunk1}   ${p1EndStr}\n`;
        content += `${''.padEnd(leftPadLength + 9, ' ')}${chunkM}\n`;
        content += `${name2Pad}   ${p2Str} ${chunk2}   ${p2EndStr}\n\n`;

        pos1 = endPos1 + 1;
        pos2 = endPos2 + 1;
    }

    content += `#---------------------------------------\n#---------------------------------------\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFilename('txt', s1Name, s2Name, algoName);
    a.click();
    URL.revokeObjectURL(url);
}

export function downloadAlignmentCSV(res) {
    const s1Name = window.currentS1Name || 'Sequence_1';
    const s2Name = window.currentS2Name || 'Sequence_2';
    const algoName = res.additional_metrics.algoType;

    const gapOp = res.metadata?.gapOpen ?? 10.0;
    const gapEx = res.metadata?.gapExtend ?? 0.5;

    let csvContent = `Metric,Value\n`;
    csvContent += `Algorithm,${algoName}\n`;
    csvContent += `Sequence 1,${s1Name}\n`;
    csvContent += `Sequence 2,${s2Name}\n`;
    csvContent += `Score,${res.alignment_score}\n`;
    csvContent += `Length,${res.alignment_length}\n`;
    csvContent += `Identity %,${res.identity_percent}\n`;
    if (res.similarity_percent) csvContent += `Similarity %,${res.similarity_percent}\n`;
    csvContent += `Matches,${res.additional_metrics.matches}\n`;
    csvContent += `Gaps,${res.gaps}\n`;
    if (res.additional_metrics.statsAvailable && res.additional_metrics.bit_score !== undefined) {
        csvContent += `Bit Score,${res.additional_metrics.bit_score}\n`;
        csvContent += `E-Value,${res.additional_metrics.e_value}\n`;
    }
    csvContent += `Matrix,${res.additional_metrics.matrixName}\n`;
    csvContent += `Gap Open,${gapOp}\n`;
    csvContent += `Gap Extend,${gapEx}\n`;

    const rawS1 = res.additional_metrics.rawSeq1 || res.additional_metrics.alignedSeq1.replace(/-/g, '');
    const rawS2 = res.additional_metrics.rawSeq2 || res.additional_metrics.alignedSeq2.replace(/-/g, '');
    const s1AlignedRes = res.additional_metrics.alignedSeq1.replace(/-/g, '').length;
    const s2AlignedRes = res.additional_metrics.alignedSeq2.replace(/-/g, '').length;
    csvContent += `Sequence_1_Length,${rawS1.length}\n`;
    csvContent += `Sequence_2_Length,${rawS2.length}\n`;
    csvContent += `Alignment_Coverage_1 %,${((s1AlignedRes / rawS1.length) * 100).toFixed(1)}\n`;
    csvContent += `Alignment_Coverage_2 %,${((s2AlignedRes / rawS2.length) * 100).toFixed(1)}\n`;
    csvContent += `Query_Coverage %,${((s1AlignedRes / rawS1.length) * 100).toFixed(1)}\n`;
    csvContent += `Matrix_Source,${matrixCitations[res.additional_metrics.matrixName] || 'Unknown'}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFilename('csv', s1Name, s2Name, algoName);
    a.click();
    URL.revokeObjectURL(url);
}

export function downloadAlignmentJSON(res) {
    const s1Name = window.currentS1Name || 'Sequence_1';
    const s2Name = window.currentS2Name || 'Sequence_2';
    const algoName = res.additional_metrics.algoType;
    const rawS1 = res.additional_metrics.rawSeq1 || res.additional_metrics.alignedSeq1.replace(/-/g, '');
    const rawS2 = res.additional_metrics.rawSeq2 || res.additional_metrics.alignedSeq2.replace(/-/g, '');
    const s1AlignedRes = res.additional_metrics.alignedSeq1.replace(/-/g, '').length;
    const s2AlignedRes = res.additional_metrics.alignedSeq2.replace(/-/g, '').length;

    const exportObj = {
        metadata: {
            program: algoName,
            sequence1: s1Name,
            sequence2: s2Name,
            type: res.sequence_type,
            date: new Date().toISOString()
        },
        parameters: {
            matrix: res.additional_metrics.matrixName,
            gap_open: parseFloat(res.metadata?.gapOpen ?? 10),
            gap_extend: parseFloat(res.metadata?.gapExtend ?? 0.5)
        },
        statistics: {
            score: res.alignment_score,
            length: res.alignment_length,
            matches: res.additional_metrics.matches,
            positives: res.additional_metrics.positives,
            gaps: res.gaps,
            identity_percent: parseFloat(((res.additional_metrics.matches / res.alignment_length) * 100).toFixed(1)),
            similarity_percent:
                res.additional_metrics.positives !== undefined
                    ? parseFloat(((res.additional_metrics.positives / res.alignment_length) * 100).toFixed(1))
                    : res.similarity_percent
                      ? parseFloat(res.similarity_percent)
                      : null,
            ...(res.additional_metrics.statsAvailable && res.additional_metrics.bit_score !== undefined
                ? {
                      bit_score: res.additional_metrics.bit_score,
                      e_value: res.additional_metrics.e_value
                  }
                : {}),
            sequence_1_length: rawS1.length,
            sequence_2_length: rawS2.length,
            alignment_coverage_1: parseFloat(((s1AlignedRes / rawS1.length) * 100).toFixed(1)),
            alignment_coverage_2: parseFloat(((s2AlignedRes / rawS2.length) * 100).toFixed(1)),
            query_coverage: parseFloat(((s1AlignedRes / rawS1.length) * 100).toFixed(1)),
            matrix_source: matrixCitations[res.additional_metrics.matrixName] || 'Unknown'
        },
        alignment: {
            seq1: res.additional_metrics.alignedSeq1,
            match: res.additional_metrics.matchLine,
            seq2: res.additional_metrics.alignedSeq2
        }
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFilename('json', s1Name, s2Name, algoName);
    a.click();
    URL.revokeObjectURL(url);
}
