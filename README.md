<div align="center">
  <h1>🧬 BioAlign-Pro</h1>
  <p><b><i>"Where chemicals became so advanced that they started studying themselves"</i></b></p>
  <p>A research-grade, client-side bioinformatics web application engineered for high-performance nucleotide and protein sequence analysis.</p>
  
  [![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
  [![Status](https://img.shields.io/badge/Status-v1.0_Stable-success.svg)]()
</div>

---

## 🔬 Overview

**BioAlign-Pro** bridges mathematical rigor with modern browser architecture. It delivers EMBL/EMBOSS-calibre alignment accuracy entirely client-side, eliminating server-side latency and ensuring complete data privacy.

**[Launch Live Application](https://sid0sid-ops.github.io/BioAlign-Pro-Nucleotide-Sequence-Analyzer/)**

## ⚡ Core Algorithms & Mathematics

The computational engine executes uncompromising, exact dynamic programming alongside validated heuristics natively in the browser:

1. **Global Alignment (Needleman-Wunsch, 1970)**
   - Computes an optimal end-to-end alignment for two sequences.
   - Utilizes true **affine gap penalties** (gap open + gap extension) to accurately reflect biological insertion/deletion events.

2. **Local Alignment (Smith-Waterman, 1981)**
   - Identifies the most conserved sub-regions within two sequences.
   - Aggressively penalizes divergence to trim the aligned segment to its maximum-scoring core.
   - Fully supports affine gap models and terminal gap free-ends.

3. **Heuristic Database Search (BLAST-like)**
   - Modeled fundamentally on the NCBI BLAST engine.
   - Uses a rapid seed-and-extend k-mer approach to rapidly scan database sequences.
   - Computes statistical significance returning strict **E-values** based on Karlin-Altschul statistics parameters.

## 🚀 Architecture & Performance (2026 Edition)

Traditional DOM-based bioinformatics web tools freeze the browser UI when processing large DP matrices. BioAlign-Pro is actively architected to overcome this:

- **Web Workers:** All dynamic programming and matrix calculations are offloaded to background threads. The UI remains flawlessly responsive even under heavy load.
- **HTML5 Canvas Rendering:** Transitions from heavy DOM nodes to pure rasterized HTML5 `<canvas>` rendering, enabling 60 FPS drawing of massive matrices without memory bloat.
- **Zero-Copy Memory (Transferables):** Matrix results are transported between threads inside raw `ArrayBuffer` allocations, ensuring absolute $O(1)$ memory handoff.
- **Code Splitting:** Dynamic `import()` statements allow the core application to load instantly, pulling in visualization renderers only when necessary.

## 💻 How to Run Locally

You do not need a backend or Node.js server to run the compiled application. Simply serve the directory over any local static host.

```bash
# Clone the repository
git clone https://github.com/sid0sid-ops/BioAlign-Pro-Nucleotide-Sequence-Analyzer.git

# Navigate into the directory
cd BioAlign-Pro-Nucleotide-Sequence-Analyzer

# Serve using Python (or any equivalent static server)
python -m http.server 8000
```

Then open `http://localhost:8000` in your WebGL-capable browser.

*Note: If you are modifying the raw Javascript source code instead of just running it, you must rebuild the module bundle using the included esbuild script: `npm run build`.*

## 📖 Citation

If BioAlign-Pro assists in your research, please cite the project utilizing the provided `CITATION.cff` metadata:

> Tripathi, S. (2026). *BioAlign-Pro*. GitHub. https://github.com/sid0sid-ops/BioAlign-Pro-Nucleotide-Sequence-Analyzer

## 👥 Authorship & Attribution

| Role | Details |
|------|---------|
| **Designed & Developed by** | **Siddharth Tripathi**, M.Sc. candidate in Systems Biology & Bioinformatics |
| **Under the Guidance of** | **Dr. Ashok Kumar (PhD)**, Assistant Professor |
| **Affiliation** | Systems Biology & Bioinformatics, Panjab University, Chandigarh – 160014, INDIA |

---
