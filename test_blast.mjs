import { runAlignmentSync } from './core/alignmentEngine.js';

const s1 = "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHF";
const s2 = "MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDL";

try {
    const res = runAlignmentSync(s1, s2, "protein", "linear", 10, 0.5, "BLOSUM62", 1, -1, "blast", 500000);
    console.log("BLAST score:", res.stats.rawScore);
    console.log("Trace length:", res.stats.alignmentLength);
} catch (err) {
    console.error("BLAST CRASH:", err);
}
