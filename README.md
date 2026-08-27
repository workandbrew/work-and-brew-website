# Work & Brew: Official Website

**Work & Brew** is a NYC-based platform helping remote workers, freelancers, and digital nomads find the best cafés to work from across the five boroughs. This repository contains the source code for the official Work & Brew website.

---

## Tech Stack

- **Framework:** React 19 + Vite
- **Routing:** React Router v7
- **Map:** MapLibre GL JS + MapTiler
- **Styling:** Plain CSS (component-scoped + shared)
- **Data:** CSV-based café data parsed with PapaParse
- **Auth:** Custom username/password auth with localStorage persistence
- **Security:** SHA-256 password hashing via Web Crypto API (no plaintext passwords in bundle)

---

## Project Structure

```
work-and-brew-website/
├── public/
│   ├── cafes/              # Café photos organized by location
│   ├── Team-photos/        # Team member photos
│   ├── about-us-images/    # About page images and favicon
│   ├── espressobear.png    # Brand mascot
│   └── logo.png            # Brand logo
├── src/
│   ├── components/
│   │   ├── MapComponent.jsx    # MapLibre interactive café map
│   │   ├── Navbar.jsx          # Responsive navigation with mobile hamburger
│   │   ├── Navbar.css
│   │   └── ProtectedRoute.jsx  # Auth guard for protected pages
│   ├── context/
│   │   └── AuthContext.jsx     # Global auth state
│   ├── hooks/
│   │   └── useSavedLists.js    # Saved café lists logic
│   ├── pages/
│   │   ├── About.jsx           # About page with timeline + team section
│   │   ├── ComingSoon.jsx      # Password-gated launch page with countdown
│   │   ├── Dashboard.jsx       # User dashboard with saved café lists + map
│   │   ├── ForOwners.jsx       # Café owner inquiry page
│   │   ├── Home.jsx            # Main map page
│   │   ├── Home.css
│   │   ├── Login.jsx
│   │   ├── PageShared.css      # Shared styles across all pages
│   │   ├── Settings.jsx
│   │   └── Signup.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env                    # VITE_MAPTILER_API_KEY (not committed)
├── vite.config.js
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/your-username/work-and-brew-website.git
cd work-and-brew-website
npm install
```

### Environment Variables

Create a `.env` file in the root:

```
VITE_MAPTILER_API_KEY=your_maptiler_api_key_here
```

### Run Locally

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

---

## Key Features

- **Interactive Café Map** — MapLibre GL map with verified NYC café markers, filtering, and a reset-to-full-view button
- **Coming Soon Gate** — Password-protected preview page with a live countdown timer; password is SHA-256 hashed so the real password never appears in the bundle
- **User Dashboard** — Save cafés to custom lists, add personal notes, and view saved locations on a mini-map
- **About Page** — Animated timeline of Work & Brew's journey + team member profiles with a receipt-style card design
- **For Owners** — Contact form for café owners interested in being listed
- **Fully Responsive** — Mobile, tablet, and desktop layouts across all pages

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

---

## Notes

- Café data is loaded from a CSV file and parsed client-side with PapaParse
- The Coming Soon page wraps the entire app — all routes are gated until the password is entered
- Map markers and café photos are stored in `public/cafes/`
- Team photos are stored in `public/Team-photos/`

---

© 2026 Work & Brew NYC. All rights reserved.
