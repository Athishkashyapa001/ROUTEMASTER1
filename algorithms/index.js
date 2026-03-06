const { bfs, getPath } = require('./bfs');
const { solveTSP } = require('./tspBitmask');

function optimizeRoute(grid, start, targets) {
    // node 0 = start, node 1..K = targets
    const points = [start, ...targets];
    const n = points.length;

    // 1. Build distance matrix and parent map for path reconstruction
    const distMatrix = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const pathsMatrix = Array.from({ length: n }, () => Array(n).fill(null));

    for (let u = 0; u < n; u++) {
        const { distances, parents } = bfs(grid, points[u]);

        for (let v = 0; v < n; v++) {
            if (u === v) {
                distMatrix[u][v] = 0;
                pathsMatrix[u][v] = [];
            } else {
                const [vr, vc] = points[v];
                distMatrix[u][v] = distances[vr][vc];
                if (distances[vr][vc] !== Infinity) {
                    pathsMatrix[u][v] = getPath(parents, points[v]);
                }
            }
        }
    }

    // 2. Solve TSP
    const { minSteps, order } = solveTSP(distMatrix);

    // If no valid path to visit all targets
    if (minSteps === Infinity) {
        return {
            total_steps: 0,
            path: [],
            targets_collected: 0,
            error: "Cannot reach all targets due to obstacles."
        };
    }

    // 3. Reconstruct full sequence of coordinates
    const fullPath = [];

    for (let i = 0; i < order.length - 1; i++) {
        const u = order[i];
        const v = order[i + 1];

        const segment = pathsMatrix[u][v];

        if (i === 0) {
            // First segment, include the start point
            fullPath.push(...segment);
        } else {
            // Skip the first element which is already the end of the previous segment
            fullPath.push(...segment.slice(1));
        }
    }

    // Edge case: if there were no targets (n = 1)
    if (order.length === 1) {
        fullPath.push(start);
    }

    return {
        total_steps: minSteps,
        path: fullPath,
        targets_collected: targets.length
    };
}

module.exports = { optimizeRoute };
