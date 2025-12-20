# Frontend - Dinosaur Battle Simulator

React + TypeScript + Vite + React Router application for the Dinosaur Battle Simulator game.

## Project Structure

```
frontend/
├── app/
│   ├── styles/              # Centralized CSS modules
│   │   ├── auth.module.css  # Shared styles for login/signup
│   │   └── home.module.css  # Home page styles
│   ├── api/                 # API client functions
│   │   └── leaderboard.ts   # Leaderboard service API
│   ├── components/          # Reusable UI components
│   ├── keycloak/            # Authentication configuration
│   ├── lib/                 # Utility functions
│   ├── routes/              # Page components
│   │   ├── home.tsx         # Main game page
│   │   ├── login/           # Login page
│   │   └── signup/          # Signup page
│   ├── global.css           # Global styles and CSS variables
│   ├── root.tsx             # Root component
│   └── routes.ts            # Route definitions
├── nginx/                   # Nginx configuration for production
├── public/                  # Static assets
├── API-ENDPOINTS.md         # Documentation of all backend endpoints
└── Dockerfile              # Container configuration

```

## Design Philosophy

All visual styling (colors, spacing, typography, etc.) is **centralized in CSS modules** to ensure:
- **Consistency** across all pages
- **Easy modification** of the design system
- **Separation of concerns** between structure (TSX) and presentation (CSS)

### CSS Variables (in global.css)
```css
--accent: #af3e3e;        /* Primary accent color */
--background: #fafafa;    /* Background color */
--foreground: #202020;    /* Text color */
--link-color: #166fe5;    /* Link color */
```

## Available Endpoints

See [API-ENDPOINTS.md](./API-ENDPOINTS.md) for complete documentation of all backend services and endpoints.

**Current Services:**
- Leaderboard Service: `https://leaderboard-dev.ltu-m7011e-1.se`
- Keycloak Auth: `https://keycloak.ltu-m7011e-1.se`

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment Configuration

The app automatically switches between development and production endpoints:
- **Development**: Uses localhost URLs
- **Production**: Uses production domain URLs

---

## React + Vite Setup

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
