# Pips from Image

**Pips from Image** is a modern, client-side web application designed to reconstruct, play, and create domino logic puzzles directly in your browser.

Simply take a screenshot of a daily puzzle (such as the *NYT Pips* puzzle), drop or paste it (`Ctrl+V`) into the app, and the computer vision engine will instantly reconstruct the board—including the grid layout, colored regions, condition badges, and domino inventory—entirely locally with zero server uploads.

<p align="center">
  <img src="./game1.jpg" alt="Example Puzzle Screenshot (game1.jpg)" width="380" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.12);" />
  <br />
  <em>Example puzzle screenshot recognized by the application</em>
</p>

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Installation & Development
```bash
# Clone the repository and install dependencies
git clone https://github.com/tsahiasher/imagePips.git
cd imagePips
npm install

# Start the Vite development server
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

### Testing & Production Build
```bash
# Run unit and golden regression test suites
npm test

# Build optimized production bundle
npm run build
```

---

## Features

- **Client-Side Computer Vision**: Automatically extracts grid parameters, colored watercolor regions, dashed boundaries, diamond condition badges, and domino pips using pure client-side canvas processing (zero cloud API dependencies).
- **Interactive Verification & Correction**: Compare the original screenshot side-by-side with the reconstructed puzzle. Edit regions, constraints, cell assignments, or dominoes prior to playing.
- **Intuitive Domino Gameplay**:
  - Drag-and-drop dominoes with smooth proximity snap.
  - 4-quadrant clockwise rotation pinned to the top square with candidate validation.
  - Settled dominoes render with 60% transparency so region colors remain clearly visible.
  - Fixed-slot tray preserves empty slots when dominoes are placed.
- **Manual Puzzle Builder**: Create custom puzzles from scratch with custom grid dimensions, hole toggling, region rules (Sum, Inequalities, Equality, Distinct), and custom domino sets.
- **Export & Import**: Download and load puzzles as portable `.json` files.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.