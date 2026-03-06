const express = require('express');
const router = express.Router();
const { optimizeRoute } = require('../algorithms/index');

router.post('/optimize-route', (req, res) => {
    try {
        const { grid, start, targets } = req.body;

        if (!grid || !start || !targets) {
            return res.status(400).json({ error: "Missing required fields: grid, start, targets" });
        }

        const startTime = Date.now();
        const result = optimizeRoute(grid, start, targets);
        const endTime = Date.now();
        const executionTime = endTime - startTime;

        if (result.error) {
            return res.status(404).json({
                error: result.error,
                message: "No valid path found. Make sure targets are not completely blocked by walls!"
            });
        }

        // Exactly formatting the final result as per constraints
        res.json({
            total_steps: result.total_steps,
            path: result.path,
            targets_collected: result.targets_collected,
            execution_time: executionTime
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error during route optimization." });
    }
});

module.exports = router;
