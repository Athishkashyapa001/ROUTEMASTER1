function solveTSP(distMatrix) {
    const n = distMatrix.length;
    if (n === 1) return { minSteps: 0, order: [0] }; // Only start node

    const maxMask = 1 << n;

    const dp = Array.from({ length: maxMask }, () => Array(n).fill(Infinity));
    const parent = Array.from({ length: maxMask }, () => Array(n).fill(-1));

    // Base case: starting at node 0
    dp[1][0] = 0;

    for (let mask = 1; mask < maxMask; mask++) {
        // Only consider states that include node 0
        if ((mask & 1) === 0) continue;

        for (let u = 0; u < n; u++) {
            // If node u is in the mask and reachable
            if ((mask & (1 << u)) !== 0 && dp[mask][u] !== Infinity) {
                for (let v = 0; v < n; v++) {
                    // If node v is NOT in the mask and there is a path from u to v
                    if ((mask & (1 << v)) === 0 && distMatrix[u][v] !== Infinity) {
                        const nextMask = mask | (1 << v);
                        const newDist = dp[mask][u] + distMatrix[u][v];
                        if (newDist < dp[nextMask][v]) {
                            dp[nextMask][v] = newDist;
                            parent[nextMask][v] = u;
                        }
                    }
                }
            }
        }
    }

    // Find the minimum distance to visit all nodes (mask = maxMask - 1)
    const fullMask = maxMask - 1;
    let minPathDist = Infinity;
    let lastNode = -1;

    for (let i = 1; i < n; i++) {
        if (dp[fullMask][i] < minPathDist) {
            minPathDist = dp[fullMask][i];
            lastNode = i;
        }
    }

    if (minPathDist === Infinity) {
        // Cannot reach all targets
        return { minSteps: Infinity, order: [] };
    }

    // Reconstruct the node order
    const order = [];
    let currMask = fullMask;
    let currNode = lastNode;

    while (currNode !== -1) {
        order.push(currNode);
        const prevNode = parent[currMask][currNode];
        currMask = currMask ^ (1 << currNode);
        currNode = prevNode;
    }

    order.reverse(); // Now it's [0, TargetA, TargetB, ...]

    return { minSteps: minPathDist, order };
}

module.exports = { solveTSP };
