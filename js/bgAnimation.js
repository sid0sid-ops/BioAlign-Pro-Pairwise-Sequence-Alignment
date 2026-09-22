export function initBgAnimation() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height;
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    let seqType = 'protein';
    let phase = 0;

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const isDark = document.documentElement.classList.contains('dark');

        // Depth-sorted rendering array
        const renderQueue = [];

        if (seqType === 'dna') {
            const numNodes = Math.floor(width / 30) + 2;
            const freq = 0.015;
            const amp = height > 600 ? 120 : 80;

            for (let i = 0; i < numNodes; i++) {
                const x = i * 30;
                const theta = x * freq + phase;

                const y1 = height / 2 + Math.sin(theta) * amp;
                const z1 = Math.cos(theta) * amp;
                const y2 = height / 2 + Math.sin(theta + Math.PI) * amp;
                const z2 = Math.cos(theta + Math.PI) * amp;

                // Color scaling based on theme and depth
                const getStrandColor = (z, isStrand2) => {
                    const depth = (z + amp) / (2 * amp); // 0 to 1
                    const alpha = 0.1 + depth * 0.4;
                    const hex = isStrand2
                        ? isDark
                            ? '168,85,247'
                            : '147,51,234'
                        : isDark
                          ? '59,130,246'
                          : '37,99,235';
                    return `rgba(${hex}, ${alpha})`;
                };

                const getRungColor = (z) => {
                    const depth = (z + amp) / (2 * amp);
                    const alpha = 0.05 + depth * 0.2;
                    return isDark ? `rgba(99,102,241,${alpha})` : `rgba(79,70,229,${alpha})`;
                };

                // Add Back strand segments
                renderQueue.push({
                    type: 'rung',
                    z: (z1 + z2) / 2,
                    draw: () => {
                        ctx.beginPath();
                        ctx.moveTo(x, y1);
                        ctx.lineTo(x, y2);
                        ctx.strokeStyle = getRungColor((z1 + z2) / 2);
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                });

                renderQueue.push({
                    type: 'node',
                    z: z1,
                    draw: () => {
                        ctx.beginPath();
                        ctx.arc(x, y1, 3 + ((z1 + amp) / (2 * amp)) * 3, 0, Math.PI * 2);
                        ctx.fillStyle = getStrandColor(z1, false);
                        ctx.fill();
                    }
                });

                renderQueue.push({
                    type: 'node',
                    z: z2,
                    draw: () => {
                        ctx.beginPath();
                        ctx.arc(x, y2, 3 + ((z2 + amp) / (2 * amp)) * 3, 0, Math.PI * 2);
                        ctx.fillStyle = getStrandColor(z2, true);
                        ctx.fill();
                    }
                });

                // Connect strands
                if (i > 0) {
                    const prevX = (i - 1) * 30;
                    const prevTheta = prevX * freq + phase;
                    const py1 = height / 2 + Math.sin(prevTheta) * amp;
                    const pz1 = Math.cos(prevTheta) * amp;
                    const py2 = height / 2 + Math.sin(prevTheta + Math.PI) * amp;
                    const pz2 = Math.cos(prevTheta + Math.PI) * amp;

                    renderQueue.push({
                        type: 'line',
                        z: (z1 + pz1) / 2,
                        draw: () => {
                            ctx.beginPath();
                            ctx.moveTo(prevX, py1);
                            ctx.lineTo(x, y1);
                            ctx.strokeStyle = getStrandColor((z1 + pz1) / 2, false);
                            ctx.lineWidth = 2 + (((z1 + pz1) / 2 + amp) / (2 * amp)) * 3;
                            ctx.stroke();
                        }
                    });

                    renderQueue.push({
                        type: 'line',
                        z: (z2 + pz2) / 2,
                        draw: () => {
                            ctx.beginPath();
                            ctx.moveTo(prevX, py2);
                            ctx.lineTo(x, y2);
                            ctx.strokeStyle = getStrandColor((z2 + pz2) / 2, true);
                            ctx.lineWidth = 2 + (((z2 + pz2) / 2 + amp) / (2 * amp)) * 3;
                            ctx.stroke();
                        }
                    });
                }
            }
        } else {
            // Protein: Single Strand (Alpha helix pattern) in the EXACT same position and density as DNA
            const numNodes = Math.floor(width / 25) + 2;
            const freq = 0.035; // Tighter coiling like an alpha helix pattern
            const amp = height > 600 ? 140 : 90;

            // Defines shades of Pink, Purple, and Blue to represent different distinct amino acids logically
            const aminos = [
                isDark ? '236,72,153' : '219,39,119', // Pink
                isDark ? '59,130,246' : '37,99,235', // Blue
                isDark ? '192,132,252' : '168,85,247', // Purple
                isDark ? '244,114,182' : '249,168,212', // Light Pink
                isDark ? '96,165,250' : '147,197,253', // Light Blue
                isDark ? '167,139,250' : '124,58,237' // Violet
            ];

            for (let i = 0; i < numNodes; i++) {
                const x = i * 25;
                const theta = x * freq + phase * 1.5;

                const y1 = height / 2 + Math.sin(theta) * amp;
                const z1 = Math.cos(theta) * amp;

                // Hash index deterministically for persistent random coloration
                const colorHash = (i * 7) % aminos.length;

                // Map to distinct amino acid colors randomly
                const getStrandColor = (z) => {
                    const depth = (z + amp) / (2 * amp);
                    const alpha = 0.15 + depth * 0.45; // Crisp visibility
                    const hex = aminos[colorHash];
                    return `rgba(${hex}, ${alpha})`;
                };

                // Dots!
                renderQueue.push({
                    type: 'protein_node',
                    z: z1,
                    draw: () => {
                        ctx.beginPath();
                        ctx.arc(x, y1, 4 + ((z1 + amp) / (2 * amp)) * 4, 0, Math.PI * 2);
                        ctx.fillStyle = getStrandColor(z1);
                        ctx.fill();

                        // Add a border to make the colored dots pop
                        ctx.strokeStyle = isDark
                            ? `rgba(255,255,255, ${0.1 + ((z1 + amp) / (2 * amp)) * 0.2})`
                            : `rgba(0,0,0, ${0.1 + ((z1 + amp) / (2 * amp)) * 0.1})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });

                // Lines!
                if (i > 0) {
                    const prevX = (i - 1) * 25;
                    const prevTheta = prevX * freq + phase * 1.5;
                    const py1 = height / 2 + Math.sin(prevTheta) * amp;
                    const pz1 = Math.cos(prevTheta) * amp;

                    renderQueue.push({
                        type: 'protein_line',
                        z: (z1 + pz1) / 2,
                        draw: () => {
                            ctx.beginPath();
                            ctx.moveTo(prevX, py1);
                            ctx.lineTo(x, y1);
                            ctx.strokeStyle = getStrandColor((z1 + pz1) / 2);
                            ctx.lineWidth = 3 + (((z1 + pz1) / 2 + amp) / (2 * amp)) * 4;
                            ctx.stroke();
                        }
                    });
                }
            }
        }

        // Sort everything from back to front based on depth Z
        renderQueue.sort((a, b) => a.z - b.z);

        // Execute render calls
        renderQueue.forEach((item) => item.draw());

        phase -= 0.01;
        requestAnimationFrame(draw);
    }

    draw();

    return {
        setSeqType: (t) => {
            seqType = t;
        }
    };
}
