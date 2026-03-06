const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function bfs(grid, start) {
    const rows = grid.length;
    const cols = grid[0].length;

    const distances = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const parents = Array.from({ length: rows }, () => Array(cols).fill(null));

    const queue = [start];
    distances[start[0]][start[1]] = 0;

    while (queue.length > 0) {
        const [r, c] = queue.shift();

        for (const [dr, dc] of DIRS) {
            const nr = r + dr;
            const nc = c + dc;

            // Check boundaries and obstacles (1)
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== 1) {
                if (distances[nr][nc] === Infinity) {
                    distances[nr][nc] = distances[r][c] + 1;
                    parents[nr][nc] = [r, c];
                    queue.push([nr, nc]);
                }
            }
        }
    }

    return { distances, parents };
}

function getPath(parents, target) {
    const path = [];
    let curr = target;
    while (curr) {
        path.push(curr);
        curr = parents[curr[0]][curr[1]];
    }
    path.reverse();
    return path;
}

module.exports = { bfs, getPath };
