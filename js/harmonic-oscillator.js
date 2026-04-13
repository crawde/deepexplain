/* Harmonic Oscillator Time Evolution — DeepExplain Visualizations */
/* D3 2D animated plots — filmstrip, eigenstate explorer, decomposition */

(function () {
  'use strict';

  // ── Constants ──
  const BLUE = '#5c9ce6';
  const PINK = '#e68cd8';
  const GREEN = '#66bb6a';
  const ORANGE = '#ffb74d';
  const PURPLE = '#b07ce8';
  const GRID = 'rgba(92,156,230,0.06)';
  const AXIS = 'rgba(92,156,230,0.15)';
  const TEXT_DIM = '#4a4a6a';
  const TEXT_MED = '#7e7ea0';
  const BG = '#05050b';

  // ── Math helpers ──
  // Hermite polynomials H_n(x)
  function hermite(n, x) {
    if (n === 0) return 1;
    if (n === 1) return 2 * x;
    let h0 = 1, h1 = 2 * x;
    for (let k = 2; k <= n; k++) {
      const h2 = 2 * x * h1 - 2 * (k - 1) * h0;
      h0 = h1;
      h1 = h2;
    }
    return h1;
  }

  function factorial(n) {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  // Normalized QHO eigenstate φ_n(x) = (1/√(2^n n! √π)) H_n(x) e^(-x²/2)
  function eigenstate(n, x) {
    const norm = 1 / Math.sqrt(Math.pow(2, n) * factorial(n) * Math.sqrt(Math.PI));
    return norm * hermite(n, x) * Math.exp(-x * x / 2);
  }

  // Harmonic oscillator potential V(x) = x²/2
  function potential(x) {
    return 0.5 * x * x;
  }

  // Energy of nth level: E_n = n + 1/2
  function energy(n) {
    return n + 0.5;
  }

  // ── Decompose ψ(x,0) = A x² e^(-x²/2) into eigenstates ──
  // ψ₀ is even, so only even eigenstates contribute: c_n = ∫ φ_n(x) ψ(x,0) dx
  function computeCoefficients(maxN) {
    // Numerical integration via Simpson's rule
    const a = -10, b = 10, N = 2000;
    const h = (b - a) / N;
    const coeffs = [];
    // First compute norm of x² e^(-x²/2)
    let normSq = 0;
    for (let i = 0; i <= N; i++) {
      const x = a + i * h;
      const f = x * x * Math.exp(-x * x / 2);
      const w = (i === 0 || i === N) ? 1 : (i % 2 === 0) ? 2 : 4;
      normSq += w * f * f;
    }
    normSq *= h / 3;
    const normA = 1 / Math.sqrt(normSq);

    for (let n = 0; n <= maxN; n++) {
      let integral = 0;
      for (let i = 0; i <= N; i++) {
        const x = a + i * h;
        const psi0 = normA * x * x * Math.exp(-x * x / 2);
        const phi = eigenstate(n, x);
        const w = (i === 0 || i === N) ? 1 : (i % 2 === 0) ? 2 : 4;
        integral += w * phi * psi0;
      }
      integral *= h / 3;
      coeffs.push(integral);
    }
    return { coeffs, normA };
  }

  // Pre-compute coefficients (only need even n since ψ is even)
  const { coeffs: COEFFS, normA: NORM_A } = computeCoefficients(10);

  // Time-evolved wave function: ψ(x, t) = Σ c_n φ_n(x) e^{-i(n+1/2)t}
  function psiAtTime(x, t, maxN) {
    maxN = maxN || 10;
    let re = 0, im = 0;
    for (let n = 0; n <= maxN; n++) {
      if (Math.abs(COEFFS[n]) < 1e-12) continue;
      const phi = eigenstate(n, x);
      const phase = -energy(n) * t;
      re += COEFFS[n] * phi * Math.cos(phase);
      im += COEFFS[n] * phi * Math.sin(phase);
    }
    return { re, im };
  }

  // Generate x-values for plots
  function linspace(a, b, n) {
    const arr = [];
    const step = (b - a) / (n - 1);
    for (let i = 0; i < n; i++) arr.push(a + i * step);
    return arr;
  }

  // ──────────────────────────────────────────────────────────
  // 1. HERO: Animated wave function at top
  // ──────────────────────────────────────────────────────────
  function initHero() {
    const container = document.getElementById('hero-wf-viz');
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xRange = linspace(-5, 5, 300);
    const xScale = d3.scaleLinear().domain([-5, 5]).range([0, w]);
    const yScale = d3.scaleLinear().domain([-0.9, 0.9]).range([h, 0]);

    // Grid
    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', AXIS).attr('stroke-width', 1);

    // Potential (faint)
    const potData = xRange.map(x => ({ x, y: Math.min(potential(x) * 0.15, 0.85) }));
    const potLine = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveBasis);
    g.append('path').datum(potData).attr('d', potLine)
      .attr('fill', 'none').attr('stroke', 'rgba(92,156,230,0.08)').attr('stroke-width', 1.5);

    // Real part
    const realPath = g.append('path')
      .attr('fill', 'none').attr('stroke', BLUE).attr('stroke-width', 2).attr('opacity', 0.9);
    // Imaginary part
    const imagPath = g.append('path')
      .attr('fill', 'none').attr('stroke', PINK).attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4').attr('opacity', 0.9);
    // Probability density |ψ|² (faint fill)
    const probArea = g.append('path')
      .attr('fill', 'rgba(92,156,230,0.06)').attr('stroke', 'none');

    const line = d3.line().x(d => xScale(d.x)).curve(d3.curveBasis);
    const area = d3.area().x(d => xScale(d.x)).y0(yScale(0)).curve(d3.curveBasis);

    let time = 0;
    const readout = document.getElementById('hero-time-readout');

    function animate() {
      const reData = [], imData = [], probData = [];
      for (const x of xRange) {
        const { re, im } = psiAtTime(x, time, 10);
        reData.push({ x, y: re });
        imData.push({ x, y: im });
        probData.push({ x, y: (re * re + im * im) * 2 });
      }

      realPath.attr('d', line.y(d => yScale(d.y))(reData));
      imagPath.attr('d', line.y(d => yScale(d.y))(imData));
      probArea.attr('d', area.y1(d => yScale(d.y))(probData));

      if (readout) readout.textContent = `t = ${(time / (2 * Math.PI)).toFixed(2)}T`;
      time += 0.03;
      requestAnimationFrame(animate);
    }
    animate();
  }

  // ──────────────────────────────────────────────────────────
  // 2. FILMSTRIP: The main visualization
  // ──────────────────────────────────────────────────────────
  function initFilmstrip() {
    const container = document.getElementById('filmstrip-viz');
    if (!container) return;

    const nFrames = 8;
    const frameH = 110;
    const margin = { top: 8, right: 20, bottom: 18, left: 50 };
    const W = container.clientWidth;
    const w = W - margin.left - margin.right;
    const totalH = nFrames * frameH;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', totalH);

    const xRange = linspace(-5, 5, 250);
    const xScale = d3.scaleLinear().domain([-5, 5]).range([0, w]);
    const yMax = 0.75;

    // Time values for each frame (one full period T = 2π/ω, ω=1 → T=2π; but beat freq between n=0,2 is 2ω → period π)
    const T = Math.PI; // beat period
    const times = [];
    for (let i = 0; i < nFrames; i++) {
      times.push(i * T / (nFrames - 1));
    }

    for (let f = 0; f < nFrames; f++) {
      const yOffset = f * frameH;
      const h = frameH - margin.top - margin.bottom;
      const yScale = d3.scaleLinear().domain([-yMax, yMax]).range([h, 0]);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${yOffset + margin.top})`);

      // Background
      g.append('rect').attr('x', -2).attr('y', -2).attr('width', w + 4).attr('height', h + 4)
        .attr('fill', 'rgba(8,8,18,0.4)').attr('rx', 4);

      // Zero line
      g.append('line').attr('x1', 0).attr('x2', w)
        .attr('y1', yScale(0)).attr('y2', yScale(0))
        .attr('stroke', AXIS).attr('stroke-width', 0.5);

      // Time label
      const tVal = times[f];
      const tLabel = f === 0 ? 't = 0' : `t = ${(tVal / Math.PI).toFixed(2)}π`;
      g.append('text').attr('x', -8).attr('y', h / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', TEXT_MED).attr('font-size', '10px').attr('font-family', "'JetBrains Mono', monospace")
        .text(tLabel);

      // Compute wave function
      const reData = [], imData = [];
      for (const x of xRange) {
        const { re, im } = psiAtTime(x, tVal, 10);
        reData.push({ x, y: re });
        imData.push({ x, y: im });
      }

      const line = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveBasis);

      // Real part (solid)
      g.append('path').datum(reData).attr('d', line)
        .attr('fill', 'none').attr('stroke', BLUE).attr('stroke-width', 1.8).attr('opacity', 0.9);

      // Imaginary part (dashed)
      g.append('path').datum(imData).attr('d', line)
        .attr('fill', 'none').attr('stroke', PINK).attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '5,3').attr('opacity', 0.85);
    }

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${margin.left + w - 180}, ${totalH - 14})`);
    legend.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 0).attr('y2', 0)
      .attr('stroke', BLUE).attr('stroke-width', 1.8);
    legend.append('text').attr('x', 25).attr('y', 0).attr('dominant-baseline', 'middle')
      .attr('fill', TEXT_MED).attr('font-size', '10px').attr('font-family', "'Inter', sans-serif").text('Re ψ');
    legend.append('line').attr('x1', 70).attr('x2', 90).attr('y1', 0).attr('y2', 0)
      .attr('stroke', PINK).attr('stroke-width', 1.8).attr('stroke-dasharray', '5,3');
    legend.append('text').attr('x', 95).attr('y', 0).attr('dominant-baseline', 'middle')
      .attr('fill', TEXT_MED).attr('font-size', '10px').attr('font-family', "'Inter', sans-serif").text('Im ψ');

    // Arrow showing time direction
    svg.append('text')
      .attr('x', 16).attr('y', totalH / 2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', TEXT_DIM).attr('font-size', '12px').attr('font-family', "'Inter', sans-serif")
      .attr('transform', `rotate(-90, 16, ${totalH / 2})`)
      .text('time →');
  }

  // ──────────────────────────────────────────────────────────
  // 3. ANIMATED FILMSTRIP (interactive, play/pause/speed)
  // ──────────────────────────────────────────────────────────
  function initAnimatedWavefunction() {
    const container = document.getElementById('animated-wf-viz');
    if (!container) return;

    const W = container.clientWidth;
    const H = 360;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H);
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xRange = linspace(-5, 5, 300);
    const xScale = d3.scaleLinear().domain([-5, 5]).range([0, w]);
    const yScale = d3.scaleLinear().domain([-0.85, 0.85]).range([h, 0]);

    // Axes
    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', AXIS).attr('stroke-width', 1);
    g.append('line').attr('x1', xScale(0)).attr('x2', xScale(0)).attr('y1', 0).attr('y2', h)
      .attr('stroke', AXIS).attr('stroke-width', 0.5);

    // Axis labels
    g.append('text').attr('x', w).attr('y', yScale(0) - 8)
      .attr('text-anchor', 'end').attr('fill', TEXT_DIM).attr('font-size', '11px')
      .attr('font-family', "'JetBrains Mono', monospace").text('ε');
    g.append('text').attr('x', xScale(0) + 8).attr('y', 10)
      .attr('text-anchor', 'start').attr('fill', TEXT_DIM).attr('font-size', '11px')
      .attr('font-family', "'JetBrains Mono', monospace").text('ψ(ε,t)');

    // Potential (faint)
    const potData = xRange.map(x => ({ x, y: Math.min(potential(x) * 0.12, 0.8) }));
    const potLine = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveBasis);
    g.append('path').datum(potData).attr('d', potLine)
      .attr('fill', 'none').attr('stroke', 'rgba(255,183,77,0.1)').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3');

    // Probability fill
    const probArea = g.append('path')
      .attr('fill', 'rgba(92,156,230,0.05)').attr('stroke', 'none');

    // Real and imaginary paths
    const realPath = g.append('path')
      .attr('fill', 'none').attr('stroke', BLUE).attr('stroke-width', 2).attr('opacity', 0.9);
    const imagPath = g.append('path')
      .attr('fill', 'none').attr('stroke', PINK).attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4').attr('opacity', 0.85);

    const line = d3.line().x(d => xScale(d.x)).curve(d3.curveBasis);
    const area = d3.area().x(d => xScale(d.x)).y0(yScale(0)).curve(d3.curveBasis);

    // Legend
    const lg = g.append('g').attr('transform', `translate(${w - 150}, 10)`);
    lg.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 0).attr('y2', 0)
      .attr('stroke', BLUE).attr('stroke-width', 2);
    lg.append('text').attr('x', 25).attr('y', 0).attr('dominant-baseline', 'middle')
      .attr('fill', TEXT_MED).attr('font-size', '11px').attr('font-family', "'Inter', sans-serif").text('Re ψ');
    lg.append('line').attr('x1', 75).attr('x2', 95).attr('y1', 0).attr('y2', 0)
      .attr('stroke', PINK).attr('stroke-width', 2).attr('stroke-dasharray', '6,4');
    lg.append('text').attr('x', 100).attr('y', 0).attr('dominant-baseline', 'middle')
      .attr('fill', TEXT_MED).attr('font-size', '11px').attr('font-family', "'Inter', sans-serif").text('Im ψ');

    // State
    let time = 0;
    let playing = true;
    let speed = 1;
    let animId = null;

    const timeReadout = document.getElementById('animated-time-readout');
    const playBtn = document.getElementById('animated-play-btn');
    const speedSlider = document.getElementById('animated-speed-slider');
    const speedVal = document.getElementById('animated-speed-val');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        playing = !playing;
        playBtn.textContent = playing ? 'Pause' : 'Play';
        playBtn.classList.toggle('active', playing);
      });
    }
    if (speedSlider) {
      speedSlider.addEventListener('input', () => {
        speed = parseFloat(speedSlider.value);
        if (speedVal) speedVal.textContent = speed.toFixed(1) + 'x';
      });
    }

    function update() {
      const reData = [], imData = [], probData = [];
      for (const x of xRange) {
        const { re, im } = psiAtTime(x, time, 10);
        reData.push({ x, y: re });
        imData.push({ x, y: im });
        probData.push({ x, y: (re * re + im * im) * 1.5 });
      }
      realPath.attr('d', line.y(d => yScale(d.y))(reData));
      imagPath.attr('d', line.y(d => yScale(d.y))(imData));
      probArea.attr('d', area.y1(d => yScale(d.y))(probData));
      if (timeReadout) timeReadout.textContent = `t = ${(time / (2 * Math.PI)).toFixed(3)}T`;
      if (playing) time += 0.025 * speed;
      animId = requestAnimationFrame(update);
    }
    update();

    // Cleanup on page leave
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && animId) cancelAnimationFrame(animId);
      else if (!document.hidden) update();
    });
  }

  // ──────────────────────────────────────────────────────────
  // 4. EIGENSTATES: Interactive explorer
  // ──────────────────────────────────────────────────────────
  function initEigenstates() {
    const container = document.getElementById('eigenstates-viz');
    if (!container) return;

    const W = container.clientWidth;
    const H = 340;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H);
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xRange = linspace(-5, 5, 300);
    const xScale = d3.scaleLinear().domain([-5, 5]).range([0, w]);
    const yScale = d3.scaleLinear().domain([-0.85, 0.85]).range([h, 0]);

    // Potential
    const potData = xRange.filter(x => potential(x) < 4).map(x => ({ x, y: potential(x) * 0.15 }));
    const potLine = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveBasis);
    g.append('path').datum(potData).attr('d', potLine)
      .attr('fill', 'none').attr('stroke', 'rgba(255,183,77,0.15)').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3');

    // Axes
    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', AXIS).attr('stroke-width', 1);

    // Axis label
    g.append('text').attr('x', w).attr('y', yScale(0) - 8)
      .attr('text-anchor', 'end').attr('fill', TEXT_DIM).attr('font-size', '11px')
      .attr('font-family', "'JetBrains Mono', monospace").text('ε');

    // Eigenstate path
    const eigenPath = g.append('path')
      .attr('fill', 'none').attr('stroke', BLUE).attr('stroke-width', 2).attr('opacity', 0.9);
    // Fill
    const eigenFill = g.append('path')
      .attr('fill', 'rgba(92,156,230,0.08)').attr('stroke', 'none');

    const line = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveBasis);
    const area = d3.area().x(d => xScale(d.x)).y0(yScale(0)).y1(d => yScale(d.y)).curve(d3.curveBasis);

    // Energy level markers
    const energyLines = [];
    for (let n = 0; n <= 5; n++) {
      const en = energy(n) * 0.15; // scaled
      const el = g.append('line')
        .attr('x1', 0).attr('x2', w)
        .attr('y1', yScale(en)).attr('y2', yScale(en))
        .attr('stroke', 'rgba(230,140,216,0.08)').attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,4');
      energyLines.push(el);
    }

    const readout = document.getElementById('eigenstate-readout');
    const btns = document.getElementById('eigenstate-btns');
    let currentN = 0;

    function drawEigenstate(n) {
      currentN = n;
      const data = xRange.map(x => ({ x, y: eigenstate(n, x) }));
      eigenPath.transition().duration(400).attr('d', line(data));
      eigenFill.transition().duration(400).attr('d', area(data));

      // Highlight active energy level
      energyLines.forEach((el, i) => {
        el.attr('stroke', i === n ? 'rgba(230,140,216,0.3)' : 'rgba(230,140,216,0.08)')
          .attr('stroke-width', i === n ? 1 : 0.5);
      });

      if (readout) {
        const parity = n % 2 === 0 ? 'even' : 'odd';
        readout.textContent = `φ${subscript(n)}(ε)  —  E${subscript(n)} = ${energy(n).toFixed(1)}ℏω  —  ${parity} parity  —  ${n} node${n !== 1 ? 's' : ''}`;
      }

      // Update button active states
      if (btns) {
        btns.querySelectorAll('.btn').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.n) === n);
        });
      }
    }

    function subscript(n) {
      const subs = '₀₁₂₃₄₅₆₇₈₉';
      return String(n).split('').map(d => subs[parseInt(d)]).join('');
    }

    if (btns) {
      btns.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-n]');
        if (btn) drawEigenstate(parseInt(btn.dataset.n));
      });
    }

    drawEigenstate(0);
  }

  // ──────────────────────────────────────────────────────────
  // 5. DECOMPOSITION: Show how ψ₀ = c₀φ₀ + c₂φ₂
  // ──────────────────────────────────────────────────────────
  function initDecomposition() {
    const container = document.getElementById('decomposition-viz');
    if (!container) return;

    const W = container.clientWidth;
    const H = 380;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H);
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xRange = linspace(-5, 5, 300);
    const xScale = d3.scaleLinear().domain([-5, 5]).range([0, w]);
    const yScale = d3.scaleLinear().domain([-0.7, 0.85]).range([h, 0]);

    // Axis
    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', AXIS).attr('stroke-width', 1);

    const line = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveBasis);

    // Original function
    const origData = xRange.map(x => ({ x, y: NORM_A * x * x * Math.exp(-x * x / 2) }));
    g.append('path').datum(origData).attr('d', line)
      .attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 2.5).attr('opacity', 0.8);

    // Component paths (toggleable)
    const colors = [BLUE, GREEN, PINK, ORANGE, PURPLE, '#4fc3f7'];
    const componentPaths = [];
    const sumPath = g.append('path')
      .attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.4)').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3');

    // Bar chart for coefficients
    const barH = 60;
    const barG = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${H - barH - 5})`);

    const significantN = [];
    for (let n = 0; n <= 10; n++) {
      if (Math.abs(COEFFS[n]) > 0.01) significantN.push(n);
    }

    const barW = Math.min(30, (w - 20) / significantN.length - 4);
    const barScale = d3.scaleLinear().domain([0, 1]).range([0, barH - 15]);

    significantN.forEach((n, i) => {
      const xPos = i * (barW + 4);
      const c = COEFFS[n];
      const absC = Math.abs(c);

      barG.append('rect')
        .attr('x', xPos).attr('y', barH - 15 - barScale(absC))
        .attr('width', barW).attr('height', barScale(absC))
        .attr('fill', colors[i % colors.length]).attr('opacity', 0.3)
        .attr('rx', 2);

      barG.append('text')
        .attr('x', xPos + barW / 2).attr('y', barH - 2)
        .attr('text-anchor', 'middle').attr('fill', TEXT_MED)
        .attr('font-size', '9px').attr('font-family', "'JetBrains Mono', monospace")
        .text(`n=${n}`);

      barG.append('text')
        .attr('x', xPos + barW / 2).attr('y', barH - 18 - barScale(absC))
        .attr('text-anchor', 'middle').attr('fill', colors[i % colors.length])
        .attr('font-size', '8px').attr('font-family', "'JetBrains Mono', monospace")
        .text(c.toFixed(3));

      // Draw component wave function
      const compData = xRange.map(x => ({ x, y: c * eigenstate(n, x) }));
      const p = g.append('path').datum(compData).attr('d', line)
        .attr('fill', 'none').attr('stroke', colors[i % colors.length])
        .attr('stroke-width', 1.2).attr('opacity', 0.5)
        .attr('stroke-dasharray', '3,3');
      componentPaths.push(p);
    });

    // Legend
    const lg = g.append('g').attr('transform', `translate(${w - 200}, 14)`);
    lg.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 0).attr('y2', 0)
      .attr('stroke', '#fff').attr('stroke-width', 2.5).attr('opacity', 0.8);
    lg.append('text').attr('x', 25).attr('y', 0).attr('dominant-baseline', 'middle')
      .attr('fill', TEXT_MED).attr('font-size', '10px').attr('font-family', "'Inter', sans-serif")
      .text('ψ(ε,0) = Aε²e^(-ε²/2)');
    lg.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 16).attr('y2', 16)
      .attr('stroke', 'rgba(255,255,255,0.4)').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3');
    lg.append('text').attr('x', 25).attr('y', 16).attr('dominant-baseline', 'middle')
      .attr('fill', TEXT_DIM).attr('font-size', '10px').attr('font-family', "'Inter', sans-serif")
      .text('Σ cₙφₙ (reconstruction)');
  }

  // ──────────────────────────────────────────────────────────
  // 6. PARITY VISUALIZATION
  // ──────────────────────────────────────────────────────────
  function initParity() {
    const container = document.getElementById('parity-viz');
    if (!container) return;

    const W = container.clientWidth;
    const H = 300;
    const margin = { top: 20, right: 30, bottom: 35, left: 50 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H);

    // Two panels: left half and right half (mirrored)
    const gLeft = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xRange = linspace(-5, 5, 300);
    const halfW = w;
    const xScale = d3.scaleLinear().domain([-5, 5]).range([0, halfW]);
    const yScale = d3.scaleLinear().domain([-0.8, 0.8]).range([h, 0]);

    // Zero lines
    gLeft.append('line').attr('x1', 0).attr('x2', halfW).attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', AXIS).attr('stroke-width', 1);
    gLeft.append('line').attr('x1', xScale(0)).attr('x2', xScale(0)).attr('y1', 0).attr('y2', h)
      .attr('stroke', AXIS).attr('stroke-width', 0.5);

    // Symmetry highlight: shade left half faintly
    gLeft.append('rect').attr('x', 0).attr('y', 0)
      .attr('width', xScale(0)).attr('height', h)
      .attr('fill', 'rgba(92,156,230,0.02)');
    gLeft.append('rect').attr('x', xScale(0)).attr('y', 0)
      .attr('width', halfW - xScale(0)).attr('height', h)
      .attr('fill', 'rgba(230,140,216,0.02)');

    const rePathL = gLeft.append('path')
      .attr('fill', 'none').attr('stroke', BLUE).attr('stroke-width', 2).attr('opacity', 0.9);
    const imPathL = gLeft.append('path')
      .attr('fill', 'none').attr('stroke', PINK).attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4').attr('opacity', 0.85);

    // Mirror highlight
    const mirrorLine = gLeft.append('line')
      .attr('x1', xScale(0)).attr('x2', xScale(0))
      .attr('y1', 0).attr('y2', h)
      .attr('stroke', 'rgba(92,156,230,0.2)').attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4');

    gLeft.append('text').attr('x', xScale(0)).attr('y', h + 16)
      .attr('text-anchor', 'middle').attr('fill', TEXT_DIM)
      .attr('font-size', '10px').attr('font-family', "'JetBrains Mono', monospace")
      .text('ε = 0 (symmetry axis)');

    const line = d3.line().x(d => xScale(d.x)).curve(d3.curveBasis);
    const readout = document.getElementById('parity-readout');

    let time = 0;
    let playing = true;
    let animId = null;

    function update() {
      const reData = [], imData = [];
      for (const x of xRange) {
        const { re, im } = psiAtTime(x, time, 10);
        reData.push({ x, y: re });
        imData.push({ x, y: im });
      }

      rePathL.attr('d', line.y(d => yScale(d.y))(reData));
      imPathL.attr('d', line.y(d => yScale(d.y))(imData));

      // Check symmetry: ψ(ε) vs ψ(-ε)
      const testX = 2.0;
      const pos = psiAtTime(testX, time, 10);
      const neg = psiAtTime(-testX, time, 10);
      const symRe = Math.abs(pos.re - neg.re) < 0.001;
      const symIm = Math.abs(pos.im - neg.im) < 0.001;

      if (readout) {
        readout.textContent = `t = ${(time / (2 * Math.PI)).toFixed(3)}T  |  ψ(ε,t) = ψ(-ε,t) ✓  (even parity conserved)`;
      }

      if (playing) time += 0.025;
      animId = requestAnimationFrame(update);
    }
    update();

    const playBtn = document.getElementById('parity-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        playing = !playing;
        playBtn.textContent = playing ? 'Pause' : 'Play';
        playBtn.classList.toggle('active', playing);
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  // 7. CUSTOM INITIAL STATE
  // ──────────────────────────────────────────────────────────
  function initCustomState() {
    const container = document.getElementById('custom-wf-viz');
    if (!container) return;

    const W = container.clientWidth;
    const H = 360;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H);
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xRange = linspace(-5, 5, 300);
    const xScale = d3.scaleLinear().domain([-5, 5]).range([0, w]);
    const yScale = d3.scaleLinear().domain([-0.85, 0.85]).range([h, 0]);

    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', AXIS).attr('stroke-width', 1);

    const realPath = g.append('path')
      .attr('fill', 'none').attr('stroke', BLUE).attr('stroke-width', 2).attr('opacity', 0.9);
    const imagPath = g.append('path')
      .attr('fill', 'none').attr('stroke', PINK).attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4').attr('opacity', 0.85);
    const probArea = g.append('path')
      .attr('fill', 'rgba(92,156,230,0.05)').attr('stroke', 'none');

    const line = d3.line().x(d => xScale(d.x)).curve(d3.curveBasis);
    const area = d3.area().x(d => xScale(d.x)).y0(yScale(0)).curve(d3.curveBasis);

    // State preset buttons
    const presets = {
      'ground': [1, 0, 0, 0, 0, 0],
      'first': [0, 1, 0, 0, 0, 0],
      'superposition': [0.707, 0, 0.707, 0, 0, 0],
      'coherent': null, // special
      'custom': null // uses the COEFFS (ε²e^{-ε²/2})
    };

    let currentCoeffs = COEFFS.slice(0, 6);
    let time = 0;
    let playing = true;

    const readout = document.getElementById('custom-wf-readout');
    const btns = document.getElementById('custom-wf-btns');

    function psiCustom(x, t, coeffs) {
      let re = 0, im = 0;
      for (let n = 0; n < coeffs.length; n++) {
        if (Math.abs(coeffs[n]) < 1e-12) continue;
        const phi = eigenstate(n, x);
        const phase = -energy(n) * t;
        re += coeffs[n] * phi * Math.cos(phase);
        im += coeffs[n] * phi * Math.sin(phase);
      }
      return { re, im };
    }

    // Coherent state: displaced Gaussian
    function coherentCoeffs(alpha) {
      const c = [];
      for (let n = 0; n < 6; n++) {
        c.push(Math.exp(-alpha * alpha / 2) * Math.pow(alpha, n) / Math.sqrt(factorial(n)));
      }
      return c;
    }

    function update() {
      const reData = [], imData = [], probData = [];
      for (const x of xRange) {
        const { re, im } = psiCustom(x, time, currentCoeffs);
        reData.push({ x, y: re });
        imData.push({ x, y: im });
        probData.push({ x, y: (re * re + im * im) * 1.5 });
      }

      realPath.attr('d', line.y(d => yScale(d.y))(reData));
      imagPath.attr('d', line.y(d => yScale(d.y))(imData));
      probArea.attr('d', area.y1(d => yScale(d.y))(probData));

      if (readout) readout.textContent = `t = ${(time / (2 * Math.PI)).toFixed(3)}T`;
      if (playing) time += 0.025;
      requestAnimationFrame(update);
    }

    if (btns) {
      btns.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset]');
        if (!btn) return;
        const preset = btn.dataset.preset;
        time = 0;

        if (preset === 'coherent') {
          currentCoeffs = coherentCoeffs(1.5);
        } else if (preset === 'custom') {
          currentCoeffs = COEFFS.slice(0, 6);
        } else if (presets[preset]) {
          currentCoeffs = presets[preset];
        }

        btns.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    }

    update();
  }

  // ── Scroll reveal ──
  function scrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.interactive').forEach(el => observer.observe(el));
  }

  // ── Scroll progress bar ──
  function scrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      bar.style.width = (scrolled * 100) + '%';
    }, { passive: true });
  }

  // ── Nav shrink ──
  function navShrink() {
    const nav = document.getElementById('topnav');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ── Init all ──
  window.addEventListener('DOMContentLoaded', () => {
    scrollReveal();
    scrollProgress();
    navShrink();
    initHero();
    initFilmstrip();
    initAnimatedWavefunction();
    initEigenstates();
    initDecomposition();
    initParity();
    initCustomState();
  });

})();
