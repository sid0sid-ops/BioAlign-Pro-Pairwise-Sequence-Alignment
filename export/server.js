/**
 * @file export/server.js
 * @description Local server entry point (if used in Node environments) for serving the application or potentially handling large file exports.
 * @pipelineLocation Development infrastructure. Not used by the core client-side Single Page Application.
 * @changeImpact Changing port binding or middleware here can prevent local execution or cause CORS blockages during offline development.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001; // Independent port for export

// Setup middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const exportDir = path.join(__dirname);

app.post('/export-heatmap', (req, res) => {
    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Clean up the base64 prefix if present
        const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `heatmap_${timestamp}.png`;
        const filepath = path.join(exportDir, filename);

        // Write directly to the export folder
        fs.writeFileSync(filepath, base64Data, 'base64');

        console.log(`[Heatmap Server] Successfully saved: ${filename}`);
        res.status(200).json({ success: true, filename, filepath });
    } catch (err) {
        console.error(`[Heatmap Server] Error saving heatmap:`, err);
        res.status(500).json({ error: 'Failed to write heatmap to disk' });
    }
});

app.listen(port, () => {
    console.log(`[Heatmap Server] Ready for export requests on http://localhost:${port}/export-heatmap`);
});
