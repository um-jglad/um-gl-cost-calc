# AI Coding Assistant Instructions

Welcome to the Great Lakes HPC Cost Calculator codebase. These instructions will help you get up to speed and contribute effectively.

## 1. Project Structure & Entry Points

- Root files:
  - `index.html`: main HTML template
  - `package.json`: scripts and dependencies (`dev`, `build`, `deploy`)
  - `vite.config.js`: configures Vite with `base: '/um-gl-cost-calc/'` for GitHub Pages
- Source code in `src/`:
  - `main.jsx`: renders the app into the DOM
  - `App.jsx`: single primary component containing all UI and logic
  - `index.css`: global styles and layout

## 2. Architecture & Data Flow

- **`App.jsx`** holds:
  - **Partition configurations** in the `PARTITION_RATES` constant
  - State management via React `useState` / `useEffect` hooks
  - Input validation helpers (`isValueEmpty`, `isValueOutOfRange`, etc.)
  - Cost calculation (`calculateCost`) using TRES billing formula
  - SLURM script generation (`generateSbatchScript`)
- UI is a simple form → compute cost → display breakdown → optional expand for SLURM script

## 3. Key Patterns & Conventions

- **Inline styling** for dynamic elements; use `index.css` for static layout
- **Validation classes**: input receives `warning` or `error` CSS class based on out-of-range values
- **Collapsible sections**: controlled by boolean `showSbatch` and CSS classes `expanded` / `collapsed`
- **Time clamping**: all runtime inputs clamped to partition limits (e.g., 14 days, 4h debug)

## 4. Developer Workflows

- Local development:
  ```bash
  npm install
  npm run dev    # starts Vite dev server on http://localhost:5173
  ```
- Production build & preview:
  ```bash
  npm run build  # outputs to `dist/`
  npm run preview
  ```
- Deployment to GitHub Pages:
    - push to `main` branch triggers CI/CD workflow
- CI/CD: `.github/workflows/npm-build-vite.yml` runs on push to `main` and deploys to Pages

## 5. External Integrations

- **React & Vite**: minimal configuration via `@vitejs/plugin-react`
- **GitHub Pages**: configured in `package.json` (`gh-pages`) and `vite.config.js` base path
- No backend or API calls; all computation is client-side

## 6. Testing & Debugging

- No test suite present; use browser dev tools and manual QA
- Use Vite’s fast HMR to iterate on UI and logic in `App.jsx`

## 7. Contribution Notes

- Keep business logic in `App.jsx` self-contained; extract to helper modules only if repeated or for clarity
- If adding new partitions, update `PARTITION_RATES` and ensure default values and limits are correct
- When modifying SLURM script, maintain existing comment structure and placeholder values (`YOUR_ACCOUNT`, `YOUR_EMAIL`)
- If a feature is implemented or changed, update the README.md with a brief description and usage instructions
