# RootMaster 🚚 
### Smart Warehouse Picking Optimization

RouteMaster is a full-stack web application designed to optimize order picking routes in a warehouse grid. It calculates the mathematically shortest path to visit a target while avoiding obstacles using advanced pathfinding algorithms.

## 🚀 Key Features
- **Interactive Grid Builder**: Manually set grid dimensions (up to 12x12).
- **Manual Painting**: Click and drag to place obstacles (🟫), targets (🎯), and erase (🗑️).
- **Live Path Animation**: Watch the optimal route (🟢) play out frame-by-frame.
- **Smart Algorithms**: Combines BFS (Breadth-First Search) and Bitmask Dynamic Programming (TSP) for high-performance optimization.
- **Loop Mode**: Seamlessly reset and run new iterations.
- **Cross-Device Ready**: Accessible over local WiFi for testing on phones/tablets.

## 🛠️ Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **State Management**: React Hooks (useState, useCallback, useRef)
- **Algorithms**: BFS, Bitmask DP (Traveling Salesman Problem)

## 📂 Project Structure
```text
routemaster/
├── backend/          # Express.js server & API routes
│   ├── algorithms/   # Core pathfinding logic (Moved here for Render!)
│   ├── routes/       # API endpoints (POST /optimize-route)
│   └── server.js     # Server configuration
├── frontend/         # React + Vite application
│   ├── src/
│   │   ├── components/ # UI Components
│   │   └── App.jsx     # Main application logic & state
│   └── package.json
└── README.md         # You are here
```

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-link>
   cd routemaster
   ```

2. **Install Dependencies**:
   - For Backend:
     ```bash
     cd backend && npm install
     ```
   - For Frontend:
     ```bash
     cd ../frontend && npm install
     ```

3. **Run the Servers**:
   - Start Backend (Port 5000):
     ```bash
     cd backend && node server.js
     ```
   - Start Frontend (Port 5173):
     ```bash
     cd ../frontend && npm run dev
     ```

4. **Access the App**: Click the `Local` or `Network` link provided in your terminal.

## 🔗 Deployed Link
**[Live Demo via Localtunnel](https://routemastersmartpick.loca.lt)**  
*(Note: Link depends on active local server)*

## 🧠 Behind the Scenes: The Algorithm
1. **BFS (Breadth-First Search)**: Maps the shortest distance between every key point (Start -> Target) while calculating accurate paths around obstacles.
2. **Bitmask DP**: Solves the optimal visitation order by exploring all possible permutations in `O(N^2 * 2^N)`, ensuring the total path is as short as possible.

---
Built with ❤️ for optimization enthusiasts.
