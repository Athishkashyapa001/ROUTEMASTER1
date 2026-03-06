const express = require('express');
const router = express.Router();
const { optimizeRoute } = require('../../algorithms/index');

router.post('/optimize-route', (req, res) => {
    try {
        const { grid, start, targets } = req.body;

        if (!grid || !start || !targets) {
            return res.status(400).json({ error: "Missing required fields: grid, start, targets" });
        }

        const result = optimizeRoute(grid, start, targets);

        if (result.error) {
            return res.status(400).json(result);
        }

        // Exactly formatting the final result as per constraints
        res.json({
            total_steps: result.total_steps,
            path: result.path,
            targets_collected: result.targets_collected
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error during route optimization." });
    }
});

module.exports = router;
