import { smithWaterman } from './algorithms/smithWaterman.js';
import { blastSeedExtend } from './algorithms/blastSeedExtend.js';
import { needlemanWunsch } from './algorithms/needlemanWunsch.js';

const s1 = "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHF";
const s2 = "MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDL";

console.log("=== NEEDLEMAN WUNSCH ===");
const nw = needlemanWunsch(s1, s2, 'affine', 10, 0.5, 'BLOSUM62', 1, -1);
console.log("Global Score:", nw.dp.rawScore);
console.log("Global Traces:", nw.tb.length);

console.log("=== SMITH WATERMAN ===");
const sw = smithWaterman(s1, s2, 'affine', 10, 0.5, 'BLOSUM62', 1, -1);
console.log("Local Score:", sw.dp.rawScore);
console.log("Local Traces:", sw.tb.length);

console.log("=== BLAST-LIKE ===");
const blast = blastSeedExtend(s1, s2, 'linear', 11, 1, 'BLOSUM62', 1, -1);
console.log("Blast Score:", blast.dp.rawScore);
console.log("Blast Traces:", blast.tb.length);
