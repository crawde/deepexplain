# DeepExplain — Interactive Long-Form Explainers

## Status: v6 LIVE at deepexplain.dev — 5 articles live

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

### Spherical Harmonics & Legendre Functions (LIVE, Mar 12 2026)

### Tensor Operators — The Hierarchy (LIVE, Apr 11 2026)
- 1 Three.js 3D hero scene (scalar, vector, quadrupole with orbit controls)
- 8 D3.js/Canvas interactive visualizations (scalar rotation, vector rotation, quadrupole components, hierarchy explorer, ladder operators, SH gallery, Wigner-Eckart selection rules, tensor product decomposition)
- Full mathematical text: rank hierarchy, spherical components, commutation relations, Wigner-Eckart theorem, tensor products
- 5 exercises
- Deployed to web1 static hosting with SSL
- 3 Three.js 3D scenes (hero Y_2^1, interactive SH explorer, gallery Y00/Y10/Y20)
- 3 D3.js plots (Legendre P0-P5, associated Legendre P_l^m, polar plot in spherical coords)
- Full mathematical text: definition, Legendre polynomials, associated Legendre, orthogonality, angular momentum connection
- 4 exercises with answer checking
- Deployed to EC2 (35.174.231.222) with nginx + SSL

### Design Polish (Mar 13 2026)
- **Homepage**: Staggered entrance animations (fade-up with cubic-bezier easing), gradient orb behind header, animated gradient text on "long-form"
- **Brand mark**: Animated Ψ glyph with glow pulse — physics-native identity, not generic
- **Stats strip**: Count-up animation (0→target with cubic ease-out), vertical separator lines between stats, 16 visualizations, 6 3D scenes, 12 exercises
- **Cards**: Cursor-aware radial glow on hover, luminous top-edge sweep, 3D tilt effect (perspective transform), colored accent stripe per category, arrow indicators, scroll-reveal with IntersectionObserver, category tag color glow on hover
- **"NEW" badge**: Luminous green pill badge on Spherical Harmonics card with subtle pulse animation
- **Scroll indicator**: Bouncing chevron below stats strip, auto-fades on scroll
- **Page transitions**: Smooth fade overlay on navigation between pages (homepage → article, article → homepage)
- **Noise texture**: SVG fractal noise overlay on homepage + article pages for organic, hand-crafted feel
- **Particles**: Dual-color system (blue/violet/rose) with depth-based sizing and speed, blended connection lines, performance-aware (40 particles on mobile, connections disabled)
- **Parallax**: Header brand mark + glow orb scroll at different rates for depth
- **Coming soon cards**: Dashed border styling, slightly higher opacity (.32/.22), clean `.card--upcoming` class
- **Article pages**: Scroll progress bar (gradient blue→violet→pink), section reveal animations for `.interactive`, `.scene-3d`, `h2.section-break`
- **Nav**: Scroll-aware opacity transition (`.scrolled` class), logo glow on hover, focus-visible accessibility rings
- **CSS**: Page entrance fade-up, interactive container hover top-edge glow, noise texture, focus-visible styles on all buttons/inputs
- **Accessibility**: `prefers-reduced-motion` media query disables all animations, focus-visible outlines on interactive elements, minimum 44px touch targets on buttons
- **Footer**: Gradient separator line, secondary tagline, copyright year, improved contrast (#34344e/#2a2a44/#222238)
- **Subtitle**: Improved contrast (#7e7ea0 from #6a6a88) for readability
- **Mobile touch states**: `@media(hover:none)` active states with scale feedback on cards and interactive containers
- **Responsive**: 5 breakpoints (900px, 768px, 600px, 480px, 380px) for homepage + articles; stat separators hidden on column layout
- **No generic AI aesthetics**: Hand-crafted physics-themed color palette, organic particle motion, SVG noise grain, intentional typography hierarchy
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
- [ ] Second article ideas: Tensor Products & Entanglement, Path Integrals
- [ ] Submit to IndexNow for Bing/Yandex indexing

## Google Analytics
- **GA4 Property:** 526278008
- **Measurement ID:** G-GY760J0K7L
- **Domain:** deepexplain.dev
- **Status:** Injected (needs redeploy)
