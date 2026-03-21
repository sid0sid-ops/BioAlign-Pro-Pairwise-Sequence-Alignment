/**
 * @file core/scoringMatrix.js
 * @description Utility for calculating match/mismatch costs using standard or custom evolutionary matrices.
 * @pipeline Sits directly below the DP matrix builder. Exposes getMatrixScore() to evaluate the biological similarity of two residues (e.g. BLOSUM62 lookup or custom match/mismatch defaults).
 */
import { parsedMatrices } from './scoringMatricesData.js?v=27';

const AMBIG_PROTEIN = { B: ['N', 'D'], Z: ['Q', 'E'], U: ['C'] };
const AMBIG_DNA = {
    R: ['A', 'G'], Y: ['C', 'T'], S: ['G', 'C'], W: ['A', 'T'], K: ['G', 'T'], M: ['A', 'C'],
    B: ['C', 'G', 'T'], D: ['A', 'G', 'T'], H: ['A', 'C', 'T'], V: ['A', 'C', 'G'],
    N: ['A', 'C', 'G', 'T']
};

function _resolveAmbig(code, isDna) {
    return isDna ? (AMBIG_DNA[code] || null) : (AMBIG_PROTEIN[code] || null);
}

let _matrixValidationCache = new Set();

function validateMatrix(matrixName, matrixData) {
    if (_matrixValidationCache.has(matrixName)) return;

    let isSymmetric = true;
    const keys = Object.keys(matrixData);

    // Quick O(1) sample checks
    for (let i = 0; i < Math.min(10, keys.length); i++) {
        for (let j = 0; j < Math.min(10, keys.length); j++) {
            const row = keys[i];
            const col = keys[j];
            if (matrixData[row][col] !== matrixData[col][row]) {
                isSymmetric = false;
                break;
            }
        }
    }

    if (!isSymmetric) {
        console.warn(`[BioAlign-Pro] Warning: matrix ${matrixName} contains asymmetrical penalties which may cause directional variance.`);
    }
    _matrixValidationCache.add(matrixName);
}

export const getMatrixScore = (a, b, matrixName, mSc, mmSc) => {
    if (!a || !b) return 0;

    if (matrixName === 'IDENTITY') return a === b ? 1 : 0;

    if (a === 'X' || b === 'X') return 0;

    if (matrixName === 'BLASTN' || (mSc !== undefined && mmSc !== undefined)) {
        mSc = mSc !== undefined ? mSc : 2;
        mmSc = mmSc !== undefined ? mmSc : -3;
        if (a === 'N' || b === 'N') return 0;
        const isDna = true;
        const ra = _resolveAmbig(a, isDna);
        const rb = _resolveAmbig(b, isDna);
        if (!ra && !rb) return a === b ? mSc : mmSc;

        const ac = ra || [a], bc = rb || [b];
        let total = 0;
        for (const x of ac) for (const y of bc)
            total += (x === y ? mSc : mmSc);
        return Math.round(total / (ac.length * bc.length));
    }

    let m = parsedMatrices[matrixName];
    if (!m) {
        console.warn(`BioAlign-Pro: Matrix '${matrixName}' not found. Falling back to BLOSUM62.`);
        matrixName = 'BLOSUM62';
        m = parsedMatrices[matrixName];
    }

    validateMatrix(matrixName, m);
    if (!m) return 0;

    const isDna = (matrixName === 'BLASTN' || matrixName === 'DNAFULL');
    const ra = _resolveAmbig(a, isDna);
    const rb = _resolveAmbig(b, isDna);

    if (!ra && !rb) {
        return (m[a] && m[a][b] !== undefined) ? m[a][b] : 0;
    }

    const ac = ra || [a], bc = rb || [b];
    let total = 0, count = 0;
    for (const x of ac) for (const y of bc) {
        total += (m[x] && m[x][y] !== undefined) ? m[x][y] : 0;
        count++;
    }
    return count > 0 ? Math.round(total / count) : 0;
};

