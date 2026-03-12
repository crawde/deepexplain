# DeepExplain — Interactive Long-Form Explainers

## Status: v6 LIVE at deepexplain.dev — Posted to HN

## Concept
Multi-article site with novel-length interactive explainers for HN/dev audiences. Premium typography, 3D visualizations, flowing prose.

## Domain: deepexplain.dev
- Purchased via Namecheap ($13.18)
- Hosted on EC2 backup (44.212.34.185), nginx static, SSL ✅
- DNS: A record → 44.212.34.185

## Articles
### Dirac Notation (LIVE v6)
- 3 Three.js 3D scenes (Bloch sphere hero, superposition w/ orbit controls, inner product 3D)
- 9 D3.js interactive visualizations (added eigenstate explorer)
- Scroll-triggered animations with easing auto-stop
- New content: eigenstates, eigenvalues, spectral theorem, complex inner products
- 8 exercises with answer checking
- Inter (body), Source Serif 4 (headings), JetBrains Mono (code)

### v6 Fixes Applied
- Green arrow projection bug fixed (inner product negative case)
- Projection dot lag fixed (removed CSS transitions on SVG)
- Superposition 3D now interactive w/ orbit controls, better colors/camera
- Operator label overlap fixed (smart offset)
- All animations scroll-triggered, ease-out after ~5s
- Wavefunction/Fourier animations faster, continuous
- "Interactive ·" prefix removed from all labels
- Font switched from Source Serif 4 to Inter body, smaller (15px base)

## Tech
- Vanilla HTML/CSS/JS, D3.js v7, Three.js r160, KaTeX v0.16.9
- Google Fonts (Inter, Source Serif 4, JetBrains Mono)

## Distribution
- [x] Posted to Hacker News (June 2025)

## TODO
- [ ] Google Analytics (GA tag placeholder in place)
- [ ] Second article (Tensor Products & Entanglement)

## Google Analytics
- **GA4 Property:** 526278008
- **Measurement ID:** G-GY760J0K7L
- **Domain:** deepexplain.dev
- **Status:** Injected (needs redeploy)
