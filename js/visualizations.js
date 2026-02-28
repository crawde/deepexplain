/* DeepExplain – Dirac Notation Visualizations v4 – Three.js Bloch sphere + animated D3 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  initBlochSphere();
  initKetBuilder();
  initInnerProduct();
  initProjection();
  initOperatorAction();
  initBasisChange();
  initWavefunction();
  initFourier();
  initUncertainty();
});


/* ═══════════════════════════════════════════════
   THREE.JS BLOCH SPHERE HERO
   ═══════════════════════════════════════════════ */
function initBlochSphere() {
  const canvas = document.getElementById('bloch-canvas');
  if (!canvas || !window.THREE) return;

  const container = document.getElementById('bloch-hero');
  const readout = document.getElementById('hero-ket');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(3.5, 2.5, 3.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0x334466, 0.6);
  scene.add(ambient);
  const point = new THREE.PointLight(0x5c9ce6, 1.5, 20);
  point.position.set(4, 5, 4);
  scene.add(point);
  const point2 = new THREE.PointLight(0xe68cd8, 0.6, 20);
  point2.position.set(-3, -2, 3);
  scene.add(point2);

  // Wireframe sphere
  const sphereGeo = new THREE.SphereGeometry(1.5, 32, 24);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x5c9ce6,
    wireframe: true,
    transparent: true,
    opacity: 0.06
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  // Equator ring
  const ringGeo = new THREE.RingGeometry(1.49, 1.51, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x5c9ce6, side: THREE.DoubleSide, transparent: true, opacity: 0.15 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // Axes
  function makeAxis(from, to, color, opacity) {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from), new THREE.Vector3(...to)
    ]);
    return new THREE.Line(geo, mat);
  }
  scene.add(makeAxis([0, -1.8, 0], [0, 1.8, 0], 0x5c9ce6, 0.2)); // Z-axis
  scene.add(makeAxis([-1.8, 0, 0], [1.8, 0, 0], 0x5c9ce6, 0.1)); // X-axis
  scene.add(makeAxis([0, 0, -1.8], [0, 0, 1.8], 0x5c9ce6, 0.1)); // Y-axis

  // Pole labels - using sprites
  function makeLabel(text, pos, color) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 44);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(...pos);
    sprite.scale.set(0.5, 0.25, 1);
    return sprite;
  }
  scene.add(makeLabel('|0⟩', [0, 1.95, 0], '#5c9ce6'));
  scene.add(makeLabel('|1⟩', [0, -1.95, 0], '#e68cd8'));

  // State vector
  let theta = 0.7, phi = 0.5; // initial state
  const arrowGroup = new THREE.Group();
  scene.add(arrowGroup);

  // State dot
  const dotGeo = new THREE.SphereGeometry(0.07, 16, 16);
  const dotMat = new THREE.MeshPhongMaterial({
    color: 0x66ff88,
    emissive: 0x33aa55,
    emissiveIntensity: 0.5
  });
  const dot = new THREE.Mesh(dotGeo, dotMat);

  // State line
  const lineMat = new THREE.LineBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.6 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.5, 0)
  ]);
  const stateLine = new THREE.Line(lineGeo, lineMat);

  // Glow sprite for dot
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 64; glowCanvas.height = 64;
  const gCtx = glowCanvas.getContext('2d');
  const grad = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(102, 255, 136, 0.6)');
  grad.addColorStop(0.5, 'rgba(102, 255, 136, 0.1)');
  grad.addColorStop(1, 'rgba(102, 255, 136, 0)');
  gCtx.fillStyle = grad;
  gCtx.fillRect(0, 0, 64, 64);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.7 });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(0.6, 0.6, 1);

  arrowGroup.add(stateLine);
  arrowGroup.add(dot);
  arrowGroup.add(glow);

  // Orbit particles
  const particleCount = 200;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = 2.5 + Math.random() * 3;
    const a = Math.random() * Math.PI * 2;
    const b = (Math.random() - 0.5) * Math.PI;
    particlePositions[i * 3] = r * Math.cos(b) * Math.cos(a);
    particlePositions[i * 3 + 1] = r * Math.sin(b);
    particlePositions[i * 3 + 2] = r * Math.cos(b) * Math.sin(a);
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0x5c9ce6, size: 0.02, transparent: true, opacity: 0.3 });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  function updateState() {
    const x = 1.5 * Math.sin(theta) * Math.cos(phi);
    const y = 1.5 * Math.cos(theta);
    const z = 1.5 * Math.sin(theta) * Math.sin(phi);

    dot.position.set(x, y, z);
    glow.position.set(x, y, z);

    const positions = stateLine.geometry.attributes.position.array;
    positions[3] = x; positions[4] = y; positions[5] = z;
    stateLine.geometry.attributes.position.needsUpdate = true;

    // Update readout
    const a = Math.cos(theta / 2);
    const bRe = Math.sin(theta / 2) * Math.cos(phi);
    const bIm = Math.sin(theta / 2) * Math.sin(phi);
    let ket;
    if (a > 0.99) ket = '|ψ⟩ = |0⟩';
    else if (a < 0.01) ket = '|ψ⟩ = |1⟩';
    else ket = `|ψ⟩ = ${a.toFixed(2)}|0⟩ + (${fmtComplex(bRe, bIm)})|1⟩`;
    if (readout) readout.textContent = ket;
  }

  // Mouse/touch drag
  let isDragging = false;
  let lastMouse = { x: 0, y: 0 };
  let autoRotate = true;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    autoRotate = false;
    lastMouse = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - lastMouse.x) * 0.005;
    const dy = (e.clientY - lastMouse.y) * 0.005;
    phi += dx;
    theta = Math.max(0.01, Math.min(Math.PI - 0.01, theta + dy));
    lastMouse = { x: e.clientX, y: e.clientY };
    updateState();
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  // Touch
  canvas.addEventListener('touchstart', (e) => {
    isDragging = true;
    autoRotate = false;
    lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = (e.touches[0].clientX - lastMouse.x) * 0.005;
    const dy = (e.touches[0].clientY - lastMouse.y) * 0.005;
    phi += dx;
    theta = Math.max(0.01, Math.min(Math.PI - 0.01, theta + dy));
    lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    updateState();
  }, { passive: true });
  canvas.addEventListener('touchend', () => { isDragging = false; });

  updateState();

  // Animation loop
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.008;

    // Auto-rotate camera slowly
    if (autoRotate) {
      phi += 0.003;
      theta = 0.7 + 0.3 * Math.sin(t * 0.5);
      updateState();
    }

    // Gentle camera orbit
    const camT = t * 0.15;
    camera.position.x = 4 * Math.cos(camT);
    camera.position.z = 4 * Math.sin(camT);
    camera.position.y = 2 + 0.5 * Math.sin(t * 0.3);
    camera.lookAt(0, 0, 0);

    // Pulse glow
    glow.material.opacity = 0.5 + 0.3 * Math.sin(t * 3);
    dotMat.emissiveIntensity = 0.3 + 0.3 * Math.sin(t * 3);

    // Rotate particles
    particles.rotation.y = t * 0.05;
    particles.rotation.x = Math.sin(t * 0.1) * 0.1;

    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}


/* ═══════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════ */
function fmtAngle(rad) {
  const pi = Math.PI;
  if (Math.abs(rad) < 0.01) return '0';
  if (Math.abs(rad - pi) < 0.04) return 'π';
  if (Math.abs(rad - pi / 2) < 0.04) return 'π/2';
  if (Math.abs(rad - pi / 4) < 0.04) return 'π/4';
  if (Math.abs(rad - 3 * pi / 4) < 0.04) return '3π/4';
  if (Math.abs(rad - 2 * pi) < 0.04) return '2π';
  return (rad / pi).toFixed(2) + 'π';
}

function fmtComplex(re, im) {
  if (Math.abs(im) < 0.001) return re.toFixed(3);
  if (Math.abs(re) < 0.001) return im.toFixed(3) + 'i';
  return `${re.toFixed(3)}${im >= 0 ? '+' : ''}${im.toFixed(3)}i`;
}


/* ═══════════════════════════════════════════════
   KET BUILDER (with auto-animation)
   ═══════════════════════════════════════════════ */
function initKetBuilder() {
  const thetaSlider = document.getElementById('theta-slider');
  const phiSlider = document.getElementById('phi-slider');
  if (!thetaSlider) return;
  const thetaVal = document.getElementById('theta-val');
  const phiVal = document.getElementById('phi-val');
  const display = document.getElementById('ket-state-display');
  const output = document.getElementById('ket-output');

  let userInteracted = false;

  function update() {
    const theta = (thetaSlider.value / 100) * Math.PI;
    const phi = (phiSlider.value / 100) * Math.PI;
    thetaVal.textContent = fmtAngle(theta);
    phiVal.textContent = fmtAngle(phi);

    const a = Math.cos(theta / 2);
    const bRe = Math.sin(theta / 2) * Math.cos(phi);
    const bIm = Math.sin(theta / 2) * Math.sin(phi);
    const p0 = a * a;
    const p1 = bRe * bRe + bIm * bIm;

    display.textContent = `|ψ⟩ = ${a.toFixed(3)}|0⟩ + (${fmtComplex(bRe, bIm)})|1⟩`;
    output.innerHTML = `
      <div class="output-row"><span class="output-label">α = ⟨0|ψ⟩</span><span class="output-value">${a.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">β = ⟨1|ψ⟩</span><span class="output-value">${fmtComplex(bRe, bIm)}</span></div>
      <div class="output-row"><span class="output-label">P(|0⟩) = |α|²</span><span class="output-value">${p0.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">P(|1⟩) = |β|²</span><span class="output-value">${p1.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">|α|² + |β|²</span><span class="output-value">${(p0 + p1).toFixed(6)}</span></div>`;
  }

  thetaSlider.addEventListener('input', () => { userInteracted = true; update(); });
  phiSlider.addEventListener('input', () => { userInteracted = true; update(); });

  // Auto-animate until user interacts
  let animId;
  function autoAnimate() {
    if (userInteracted) return;
    const t = Date.now() * 0.001;
    thetaSlider.value = Math.round(157 + 80 * Math.sin(t * 0.7));
    phiSlider.value = Math.round(314 + 200 * Math.sin(t * 0.5));
    update();
    animId = requestAnimationFrame(autoAnimate);
  }
  autoAnimate();

  update();
}


/* ═══════════════════════════════════════════════
   INNER PRODUCT (with auto-animation)
   ═══════════════════════════════════════════════ */
function initInnerProduct() {
  const container = document.getElementById('inner-product-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#inner-product-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', '#1a1a2e').attr('stroke-width', 0.5);
  svg.append('line').attr('x1', cx - R - 10).attr('y1', cy).attr('x2', cx + R + 10).attr('y2', cy)
    .attr('stroke', '#111120').attr('stroke-width', 0.5);
  svg.append('line').attr('x1', cx).attr('y1', cy - R - 10).attr('x2', cx).attr('y2', cy + R + 10)
    .attr('stroke', '#111120').attr('stroke-width', 0.5);
  svg.append('text').attr('x', cx + R + 12).attr('y', cy + 4).text('|0⟩')
    .attr('fill', '#444').attr('font-size', '11px');
  svg.append('text').attr('x', cx - 5).attr('y', cy - R - 8).text('|1⟩')
    .attr('fill', '#444').attr('font-size', '11px');

  const psiLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 2);
  const phiLine = svg.append('line').attr('stroke', '#e68cd8').attr('stroke-width', 2);
  const psiDot = svg.append('circle').attr('r', 5).attr('fill', '#5c9ce6');
  const phiDot = svg.append('circle').attr('r', 5).attr('fill', '#e68cd8');

  // Glow effects on dots
  const defs = svg.append('defs');
  const glowFilter = defs.append('filter').attr('id', 'glow');
  glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
  glowFilter.append('feMerge').selectAll('feMergeNode')
    .data(['blur', 'SourceGraphic']).enter()
    .append('feMergeNode').attr('in', d => d);
  psiDot.attr('filter', 'url(#glow)');
  phiDot.attr('filter', 'url(#glow)');

  const projLine = svg.append('line').attr('stroke', '#66bb6a').attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,3');
  const arcPath = svg.append('path').attr('fill', 'none').attr('stroke', '#ffcc80').attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3');
  const psiLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '12px').text('|ψ⟩');
  const phiLabel = svg.append('text').attr('fill', '#e68cd8').attr('font-size', '12px').text('|φ⟩');

  const psiAngle = document.getElementById('psi-angle');
  const phiAngle = document.getElementById('phi-angle');
  const psiAngleVal = document.getElementById('psi-angle-val');
  const phiAngleVal = document.getElementById('phi-angle-val');
  const outputEl = document.getElementById('inner-product-output');

  let userInteracted = false;

  function update() {
    const a1 = -(psiAngle.value * Math.PI / 180);
    const a2 = -(phiAngle.value * Math.PI / 180);
    psiAngleVal.textContent = psiAngle.value + '°';
    phiAngleVal.textContent = phiAngle.value + '°';

    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);

    psiLine.attr('x1', cx).attr('y1', cy).attr('x2', x1).attr('y2', y1);
    phiLine.attr('x1', cx).attr('y1', cy).attr('x2', x2).attr('y2', y2);
    psiDot.attr('cx', x1).attr('cy', y1);
    phiDot.attr('cx', x2).attr('cy', y2);
    psiLabel.attr('x', x1 + 8).attr('y', y1 - 8);
    phiLabel.attr('x', x2 + 8).attr('y', y2 - 8);

    const arcR = R * 0.3;
    const arcD = d3.arc().innerRadius(arcR - 1).outerRadius(arcR + 1)
      .startAngle(a1 + Math.PI / 2).endAngle(a2 + Math.PI / 2);
    arcPath.attr('d', arcD()).attr('transform', `translate(${cx},${cy})`);

    const ip = Math.cos(a1 - a2);
    const prob = ip * ip;
    const projLen = R * ip;
    const px = cx + projLen * Math.cos(a1), py = cy + projLen * Math.sin(a1);
    projLine.attr('x1', x2).attr('y1', y2).attr('x2', px).attr('y2', py);

    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">⟨φ|ψ⟩</span><span class="output-value">${ip.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">|⟨φ|ψ⟩|²</span><span class="output-value">${prob.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">Angle</span><span class="output-value">${Math.abs(((psiAngle.value - phiAngle.value + 540) % 360) - 180).toFixed(1)}°</span></div>
      <div class="output-row"><span class="output-label">Orthogonal?</span><span class="output-value">${Math.abs(ip) < 0.01 ? '✓ Yes' : '✗ No'}</span></div>`;
  }

  psiAngle.addEventListener('input', () => { userInteracted = true; update(); });
  phiAngle.addEventListener('input', () => { userInteracted = true; update(); });

  // Auto-animate
  function autoAnimate() {
    if (userInteracted) return;
    const t = Date.now() * 0.001;
    psiAngle.value = Math.round(180 + 150 * Math.sin(t * 0.4));
    phiAngle.value = Math.round(90 + 80 * Math.sin(t * 0.6 + 1));
    update();
    requestAnimationFrame(autoAnimate);
  }
  // Start after a delay so it's visible when scrolled to
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !userInteracted) autoAnimate();
  }, { threshold: 0.3 });
  observer.observe(container);

  update();
}


/* ═══════════════════════════════════════════════
   PROJECTION (with auto-animation)
   ═══════════════════════════════════════════════ */
function initProjection() {
  const container = document.getElementById('projection-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#projection-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', '#1a1a2e');

  const psiDirLine = svg.append('line').attr('stroke', 'rgba(92,156,230,0.15)').attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3');
  const psiLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 2);
  const chiLine = svg.append('line').attr('stroke', '#ffab40').attr('stroke-width', 2);
  const projectionLine = svg.append('line').attr('stroke', '#66bb6a').attr('stroke-width', 2.5);
  const dropLine = svg.append('line').attr('stroke', '#66bb6a').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 2.5).attr('fill', '#333');
  const chiDot = svg.append('circle').attr('r', 5).attr('fill', '#ffab40');
  const projDot = svg.append('circle').attr('r', 5).attr('fill', '#66bb6a');
  const psiLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '12px').text('|ψ⟩');
  const chiLabel = svg.append('text').attr('fill', '#ffab40').attr('font-size', '12px').text('|χ⟩');
  const projLabel = svg.append('text').attr('fill', '#66bb6a').attr('font-size', '12px').text('P|χ⟩');

  const psiAngle = document.getElementById('proj-psi-angle');
  const chiAngle = document.getElementById('proj-chi-angle');
  const psiVal = document.getElementById('proj-psi-val');
  const chiVal = document.getElementById('proj-chi-val');
  const outputEl = document.getElementById('projection-output');
  let userInteracted = false;

  function update() {
    const a1 = -(psiAngle.value * Math.PI / 180);
    const a2 = -(chiAngle.value * Math.PI / 180);
    psiVal.textContent = psiAngle.value + '°';
    chiVal.textContent = chiAngle.value + '°';

    const dx1 = Math.cos(a1), dy1 = Math.sin(a1);
    const dx2 = Math.cos(a2), dy2 = Math.sin(a2);

    psiDirLine.attr('x1', cx - R * 1.2 * dx1).attr('y1', cy - R * 1.2 * dy1)
      .attr('x2', cx + R * 1.2 * dx1).attr('y2', cy + R * 1.2 * dy1);
    psiLine.attr('x1', cx).attr('y1', cy).attr('x2', cx + R * dx1).attr('y2', cy + R * dy1);
    psiLabel.attr('x', cx + R * dx1 + 8).attr('y', cy + R * dy1 - 8);
    chiLine.attr('x1', cx).attr('y1', cy).attr('x2', cx + R * dx2).attr('y2', cy + R * dy2);
    chiDot.attr('cx', cx + R * dx2).attr('cy', cy + R * dy2);
    chiLabel.attr('x', cx + R * dx2 + 8).attr('y', cy + R * dy2 - 8);

    const dot = dx1 * dx2 + dy1 * dy2;
    const px = cx + R * dot * dx1, py = cy + R * dot * dy1;
    projectionLine.attr('x1', cx).attr('y1', cy).attr('x2', px).attr('y2', py);
    projDot.attr('cx', px).attr('cy', py);
    projLabel.attr('x', px + 8).attr('y', py + 15);
    dropLine.attr('x1', cx + R * dx2).attr('y1', cy + R * dy2).attr('x2', px).attr('y2', py);

    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">⟨ψ|χ⟩</span><span class="output-value">${dot.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">P_ψ|χ⟩ = ⟨ψ|χ⟩·|ψ⟩</span><span class="output-value">${dot.toFixed(3)} × |ψ⟩</span></div>
      <div class="output-row"><span class="output-label">‖P_ψ|χ⟩‖²</span><span class="output-value">${(dot * dot).toFixed(4)}</span></div>`;
  }

  psiAngle.addEventListener('input', () => { userInteracted = true; update(); });
  chiAngle.addEventListener('input', () => { userInteracted = true; update(); });

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !userInteracted) {
      (function autoAnimate() {
        if (userInteracted) return;
        const t = Date.now() * 0.001;
        chiAngle.value = Math.round(120 + 100 * Math.sin(t * 0.5));
        update();
        requestAnimationFrame(autoAnimate);
      })();
    }
  }, { threshold: 0.3 });
  observer.observe(container);

  update();
}


/* ═══════════════════════════════════════════════
   OPERATOR ACTION (with auto-animation)
   ═══════════════════════════════════════════════ */
function initOperatorAction() {
  const container = document.getElementById('operator-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#operator-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', '#1a1a2e');
  svg.append('text').attr('x', cx + R + 12).attr('y', cy + 4).text('|0⟩')
    .attr('fill', '#444').attr('font-size', '11px');
  svg.append('text').attr('x', cx - 5).attr('y', cy - R - 8).text('|1⟩')
    .attr('fill', '#444').attr('font-size', '11px');

  const inLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 2);
  const outLine = svg.append('line').attr('stroke', '#ef5350').attr('stroke-width', 2);
  const inDot = svg.append('circle').attr('r', 5).attr('fill', '#5c9ce6');
  const outDot = svg.append('circle').attr('r', 5).attr('fill', '#ef5350');
  const inLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '11px');
  const outLabel = svg.append('text').attr('fill', '#ef5350').attr('font-size', '11px');

  const thetaSlider = document.getElementById('op-theta');
  const thetaVal = document.getElementById('op-theta-val');
  const outputEl = document.getElementById('operator-output');
  const buttons = document.querySelectorAll('[data-op]');
  let currentOp = 'I';
  let userInteracted = false;

  const ops = {
    I: (a, b) => [a, b],
    X: (a, b) => [b, a],
    Y: (a, b) => [-b, a],
    Z: (a, b) => [a, -b],
    H: (a, b) => [(a + b) / Math.SQRT2, (a - b) / Math.SQRT2]
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      userInteracted = true;
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOp = btn.dataset.op;
      update();
    });
  });

  function update() {
    const theta = (thetaSlider.value / 100) * Math.PI;
    thetaVal.textContent = fmtAngle(theta);
    const a = Math.cos(theta), b = Math.sin(theta);
    const [oa, ob] = ops[currentOp](a, b);
    const inA = -(Math.atan2(b, a));
    const outA = -(Math.atan2(ob, oa));

    const ix = cx + R * Math.cos(inA), iy = cy + R * Math.sin(inA);
    const ox = cx + R * Math.cos(outA), oy = cy + R * Math.sin(outA);

    inLine.attr('x1', cx).attr('y1', cy).attr('x2', ix).attr('y2', iy);
    outLine.attr('x1', cx).attr('y1', cy).attr('x2', ox).attr('y2', oy);
    inDot.attr('cx', ix).attr('cy', iy);
    outDot.attr('cx', ox).attr('cy', oy);
    inLabel.attr('x', ix + 8).attr('y', iy - 8).text('|ψ⟩');
    outLabel.attr('x', ox + 8).attr('y', oy - 8).text(currentOp + '|ψ⟩');

    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Input</span><span class="output-value">${a.toFixed(3)}|0⟩ + ${b.toFixed(3)}|1⟩</span></div>
      <div class="output-row"><span class="output-label">${currentOp} · |ψ⟩</span><span class="output-value">${oa.toFixed(3)}|0⟩ + ${ob.toFixed(3)}|1⟩</span></div>`;
  }

  thetaSlider.addEventListener('input', () => { userInteracted = true; update(); });

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !userInteracted) {
      (function autoAnimate() {
        if (userInteracted) return;
        const t = Date.now() * 0.001;
        thetaSlider.value = Math.round(157 + 100 * Math.sin(t * 0.6));
        update();
        requestAnimationFrame(autoAnimate);
      })();
    }
  }, { threshold: 0.3 });
  observer.observe(container);

  update();
}


/* ═══════════════════════════════════════════════
   BASIS CHANGE (with auto-animation)
   ═══════════════════════════════════════════════ */
function initBasisChange() {
  const container = document.getElementById('basis-change-viz');
  if (!container) return;
  const w = container.clientWidth, h = 340;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.32;

  const svg = d3.select('#basis-change-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', '#1a1a2e');

  const basisGroup = svg.append('g');
  const rotBasisGroup = svg.append('g');
  const projLines = svg.append('g');
  const projLinesRot = svg.append('g');
  const stateLine = svg.append('line').attr('stroke', '#ffffff').attr('stroke-width', 2);
  const stateDot = svg.append('circle').attr('r', 5).attr('fill', '#ffffff');

  const stateAngle = document.getElementById('basis-state-angle');
  const rotAngle = document.getElementById('basis-rot-angle');
  const stateVal = document.getElementById('basis-state-val');
  const rotVal = document.getElementById('basis-rot-val');
  const outputEl = document.getElementById('basis-change-output');
  let userInteracted = false;

  function drawAxis(group, angle, color, label1, label2) {
    group.selectAll('*').remove();
    const dx = Math.cos(-angle * Math.PI / 180), dy = Math.sin(-angle * Math.PI / 180);
    group.append('line')
      .attr('x1', cx - R * 1.1 * dx).attr('y1', cy - R * 1.1 * dy)
      .attr('x2', cx + R * 1.1 * dx).attr('y2', cy + R * 1.1 * dy)
      .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
    group.append('line')
      .attr('x1', cx + R * 1.1 * dy).attr('y1', cy - R * 1.1 * dx)
      .attr('x2', cx - R * 1.1 * dy).attr('y2', cy + R * 1.1 * dx)
      .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');
    group.append('text').attr('x', cx + R * 1.15 * dx).attr('y', cy + R * 1.15 * dy + 4)
      .text(label1).attr('fill', color).attr('font-size', '11px');
    group.append('text').attr('x', cx + R * 1.15 * dy).attr('y', cy - R * 1.15 * dx + 4)
      .text(label2).attr('fill', color).attr('font-size', '11px');
  }

  function update() {
    const sA = -stateAngle.value * Math.PI / 180;
    const rA = rotAngle.value;
    stateVal.textContent = stateAngle.value + '°';
    rotVal.textContent = rA + '°';

    drawAxis(basisGroup, 0, '#5c9ce6', '|0⟩', '|1⟩');
    drawAxis(rotBasisGroup, rA, '#66bb6a', "|0'⟩", "|1'⟩");

    const sx = cx + R * Math.cos(sA), sy = cy + R * Math.sin(sA);
    stateLine.attr('x1', cx).attr('y1', cy).attr('x2', sx).attr('y2', sy);
    stateDot.attr('cx', sx).attr('cy', sy);

    const a0 = Math.cos(sA), a1 = Math.sin(sA);
    const rRad = -rA * Math.PI / 180;
    const c0p = a0 * Math.cos(rRad) + a1 * Math.sin(rRad);
    const c1p = -a0 * Math.sin(rRad) + a1 * Math.cos(rRad);

    projLines.selectAll('*').remove();
    projLines.append('line')
      .attr('x1', sx).attr('y1', sy)
      .attr('x2', cx + R * a0 * Math.cos(0)).attr('y2', cy)
      .attr('stroke', '#5c9ce6').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,2');

    projLinesRot.selectAll('*').remove();
    const rdx = Math.cos(rRad), rdy = Math.sin(rRad);
    projLinesRot.append('line')
      .attr('x1', sx).attr('y1', sy)
      .attr('x2', cx + R * c0p * rdx).attr('y2', cy + R * c0p * rdy)
      .attr('stroke', '#66bb6a').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,2');

    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Original: c₀, c₁</span><span class="output-value">${a0.toFixed(3)}, ${(-a1).toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Rotated: c₀', c₁'</span><span class="output-value">${c0p.toFixed(3)}, ${c1p.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">|c₀|²+|c₁|²</span><span class="output-value">${(a0*a0+a1*a1).toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">|c₀'|²+|c₁'|²</span><span class="output-value">${(c0p*c0p+c1p*c1p).toFixed(4)}</span></div>`;
  }

  stateAngle.addEventListener('input', () => { userInteracted = true; update(); });
  rotAngle.addEventListener('input', () => { userInteracted = true; update(); });

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !userInteracted) {
      (function autoAnimate() {
        if (userInteracted) return;
        const t = Date.now() * 0.001;
        rotAngle.value = Math.round(90 + 80 * Math.sin(t * 0.4));
        update();
        requestAnimationFrame(autoAnimate);
      })();
    }
  }, { threshold: 0.3 });
  observer.observe(container);

  update();
}


/* ═══════════════════════════════════════════════
   WAVEFUNCTION (with auto-animation)
   ═══════════════════════════════════════════════ */
function initWavefunction() {
  const container = document.getElementById('wavefunction-viz');
  if (!container) return;
  const w = container.clientWidth, h = 280;

  const svg = d3.select('#wavefunction-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const paramSlider = document.getElementById('wf-param');
  const centerSlider = document.getElementById('wf-center');
  const paramVal = document.getElementById('wf-param-val');
  const centerVal = document.getElementById('wf-center-val');
  const outputEl = document.getElementById('wavefunction-output');
  const wfButtons = document.querySelectorAll('[data-wf]');
  let currentWf = 'gaussian';
  let userInteracted = false;

  wfButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      userInteracted = true;
      wfButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentWf = btn.dataset.wf;
      update();
    });
  });

  function update() {
    const sigma = paramSlider.value / 100;
    const x0 = (centerSlider.value - 100) / 25;
    paramVal.textContent = sigma.toFixed(1);
    centerVal.textContent = x0.toFixed(1);

    const N = 300;
    const xMin = -5, xMax = 5;
    const data = [];
    for (let i = 0; i < N; i++) {
      const x = xMin + (xMax - xMin) * i / (N - 1);
      let psi, prob;
      if (currentWf === 'gaussian') {
        psi = Math.exp(-((x - x0) ** 2) / (2 * sigma * sigma));
        prob = psi * psi;
      } else if (currentWf === 'plane-wave') {
        const k = x0 * 3;
        const env = Math.exp(-(x * x) / (2 * sigma * sigma));
        psi = env * Math.cos(k * x);
        prob = env * env;
      } else if (currentWf === 'superposition') {
        const g1 = Math.exp(-((x + 1.5) ** 2) / (2 * sigma * sigma * 0.3));
        const g2 = Math.exp(-((x - 1.5) ** 2) / (2 * sigma * sigma * 0.3));
        psi = (g1 + g2) / Math.SQRT2;
        prob = psi * psi;
      } else {
        const L = sigma * 4;
        if (Math.abs(x) < L / 2) {
          const n = Math.max(1, Math.round(Math.abs(x0) * 2 + 1));
          psi = Math.cos(n * Math.PI * x / L);
          prob = psi * psi;
        } else {
          psi = 0; prob = 0;
        }
      }
      data.push({ x, psi, prob });
    }

    const maxP = d3.max(data, d => d.prob) || 1;
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([40, w - 20]);
    const yScale = d3.scaleLinear().domain([0, maxP * 1.2]).range([h - 30, 20]);

    svg.selectAll('*').remove();

    // Axis
    svg.append('line').attr('x1', 40).attr('y1', h - 30).attr('x2', w - 20).attr('y2', h - 30)
      .attr('stroke', '#222235').attr('stroke-width', 0.5);

    // Probability fill
    const area = d3.area().x(d => xScale(d.x)).y0(h - 30).y1(d => yScale(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('d', area)
      .attr('fill', 'rgba(92,156,230,0.15)').attr('stroke', 'none');

    // Wavefunction line
    const line = d3.line().x(d => xScale(d.x)).y(d => yScale(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('d', line)
      .attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 2);

    // Real part (dimmer)
    const yScalePsi = d3.scaleLinear().domain([-1.2, 1.2]).range([h - 30, 20]);
    const psiLine = d3.line().x(d => xScale(d.x)).y(d => yScalePsi(d.psi)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('d', psiLine)
      .attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 1).attr('opacity', 0.3);

    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Type</span><span class="output-value">${currentWf}</span></div>
      <div class="output-row"><span class="output-label">σ</span><span class="output-value">${sigma.toFixed(2)}</span></div>`;
  }

  paramSlider.addEventListener('input', () => { userInteracted = true; update(); });
  centerSlider.addEventListener('input', () => { userInteracted = true; update(); });

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !userInteracted) {
      (function autoAnimate() {
        if (userInteracted) return;
        const t = Date.now() * 0.001;
        paramSlider.value = Math.round(100 + 60 * Math.sin(t * 0.3));
        centerSlider.value = Math.round(100 + 40 * Math.sin(t * 0.5));
        update();
        requestAnimationFrame(autoAnimate);
      })();
    }
  }, { threshold: 0.3 });
  observer.observe(container);

  update();
}


/* ═══════════════════════════════════════════════
   FOURIER TRANSFORM (with auto-animation)
   ═══════════════════════════════════════════════ */
function initFourier() {
  const container = document.getElementById('fourier-viz');
  if (!container) return;
  const w = container.clientWidth, h = 400;

  const svg = d3.select('#fourier-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const sigmaSlider = document.getElementById('fourier-sigma');
  const k0Slider = document.getElementById('fourier-k0');
  const sigmaVal = document.getElementById('fourier-sigma-val');
  const k0Val = document.getElementById('fourier-k0-val');
  const outputEl = document.getElementById('fourier-output');
  let userInteracted = false;

  function update() {
    const sigma = sigmaSlider.value / 100;
    const k0 = (k0Slider.value - 100) / 20;
    sigmaVal.textContent = sigma.toFixed(2);
    k0Val.textContent = k0.toFixed(1);

    const sigmaP = 1 / (2 * sigma);
    const N = 200;

    // Position space
    const xData = [];
    for (let i = 0; i < N; i++) {
      const x = -5 + 10 * i / (N - 1);
      const psi = Math.exp(-(x * x) / (2 * sigma * sigma)) * Math.cos(k0 * x);
      const prob = Math.exp(-(x * x) / (sigma * sigma));
      xData.push({ x, psi, prob });
    }

    // Momentum space
    const pData = [];
    for (let i = 0; i < N; i++) {
      const p = -5 + 10 * i / (N - 1);
      const prob = Math.exp(-((p - k0) ** 2) * sigma * sigma);
      pData.push({ p, prob });
    }

    svg.selectAll('*').remove();

    const halfH = h / 2 - 15;
    // Labels
    svg.append('text').attr('x', 10).attr('y', 15).text('ψ(x) — Position').attr('fill', '#5c9ce6').attr('font-size', '11px')
      .attr('font-family', '-apple-system, sans-serif');
    svg.append('text').attr('x', 10).attr('y', halfH + 25).text('ψ̃(p) — Momentum').attr('fill', '#e68cd8').attr('font-size', '11px')
      .attr('font-family', '-apple-system, sans-serif');

    // Position panel
    const xScale = d3.scaleLinear().domain([-5, 5]).range([40, w - 20]);
    const yScaleX = d3.scaleLinear().domain([0, 1.2]).range([halfH, 20]);
    const yScalePsi = d3.scaleLinear().domain([-1.2, 1.2]).range([halfH, 20]);

    svg.append('line').attr('x1', 40).attr('y1', halfH).attr('x2', w - 20).attr('y2', halfH)
      .attr('stroke', '#222235').attr('stroke-width', 0.5);

    // σ indicators
    const xSigLeft = xScale(-sigma), xSigRight = xScale(sigma);
    svg.append('line').attr('x1', xSigLeft).attr('y1', 20).attr('x2', xSigLeft).attr('y2', halfH)
      .attr('stroke', '#ff9800').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);
    svg.append('line').attr('x1', xSigRight).attr('y1', 20).attr('x2', xSigRight).attr('y2', halfH)
      .attr('stroke', '#ff9800').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);

    const area = d3.area().x(d => xScale(d.x)).y0(halfH).y1(d => yScaleX(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(xData).attr('d', area).attr('fill', 'rgba(92,156,230,0.12)');
    const psiLine = d3.line().x(d => xScale(d.x)).y(d => yScalePsi(d.psi)).curve(d3.curveMonotoneX);
    svg.append('path').datum(xData).attr('d', psiLine)
      .attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);

    // Momentum panel
    const pScale = d3.scaleLinear().domain([-5, 5]).range([40, w - 20]);
    const yScaleP = d3.scaleLinear().domain([0, 1.2]).range([h - 10, halfH + 30]);

    svg.append('line').attr('x1', 40).attr('y1', h - 10).attr('x2', w - 20).attr('y2', h - 10)
      .attr('stroke', '#222235').attr('stroke-width', 0.5);

    // σ_p indicators
    const pSigLeft = pScale(k0 - sigmaP), pSigRight = pScale(k0 + sigmaP);
    svg.append('line').attr('x1', pSigLeft).attr('y1', halfH + 30).attr('x2', pSigLeft).attr('y2', h - 10)
      .attr('stroke', '#ff9800').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);
    svg.append('line').attr('x1', pSigRight).attr('y1', halfH + 30).attr('x2', pSigRight).attr('y2', h - 10)
      .attr('stroke', '#ff9800').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);

    const pArea = d3.area().x(d => pScale(d.p)).y0(h - 10).y1(d => yScaleP(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(pData).attr('d', pArea).attr('fill', 'rgba(230,140,216,0.12)');
    const pLine = d3.line().x(d => pScale(d.p)).y(d => yScaleP(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(pData).attr('d', pLine)
      .attr('fill', 'none').attr('stroke', '#e68cd8').attr('stroke-width', 1.5);

    const product = sigma * sigmaP;
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">σ_x</span><span class="output-value">${sigma.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">σ_p</span><span class="output-value">${sigmaP.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">σ_x · σ_p</span><span class="output-value">${product.toFixed(3)} ${product < 0.26 ? '≥ ℏ/2 ✓' : '≥ ℏ/2 ✓'}</span></div>
      <div class="output-row"><span class="output-label">k₀</span><span class="output-value">${k0.toFixed(2)}</span></div>`;
  }

  sigmaSlider.addEventListener('input', () => { userInteracted = true; update(); });
  k0Slider.addEventListener('input', () => { userInteracted = true; update(); });

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !userInteracted) {
      (function autoAnimate() {
        if (userInteracted) return;
        const t = Date.now() * 0.001;
        sigmaSlider.value = Math.round(100 + 80 * Math.sin(t * 0.3));
        update();
        requestAnimationFrame(autoAnimate);
      })();
    }
  }, { threshold: 0.3 });
  observer.observe(container);

  update();
}


/* ═══════════════════════════════════════════════
   UNCERTAINTY PRINCIPLE (with auto-animation)
   ═══════════════════════════════════════════════ */
function initUncertainty() {
  const container = document.getElementById('uncertainty-viz');
  if (!container) return;
  const w = container.clientWidth, h = 280;

  const svg = d3.select('#uncertainty-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const dxSlider = document.getElementById('uncert-dx');
  const dxVal = document.getElementById('uncert-dx-val');
  const outputEl = document.getElementById('uncertainty-output');
  let userInteracted = false;

  function update() {
    const dx = dxSlider.value / 100;
    dxVal.textContent = dx.toFixed(2);
    const dp = 0.5 / dx;

    const N = 200;
    const halfW = w / 2 - 10;

    // Position
    const xData = [];
    for (let i = 0; i < N; i++) {
      const x = -4 + 8 * i / (N - 1);
      xData.push({ x, y: Math.exp(-(x * x) / (2 * dx * dx)) });
    }

    // Momentum
    const pData = [];
    for (let i = 0; i < N; i++) {
      const p = -4 + 8 * i / (N - 1);
      pData.push({ p, y: Math.exp(-(p * p) / (2 * dp * dp)) });
    }

    svg.selectAll('*').remove();

    svg.append('text').attr('x', 10).attr('y', 15).text('|ψ(x)|²').attr('fill', '#5c9ce6').attr('font-size', '11px')
      .attr('font-family', '-apple-system, sans-serif');
    svg.append('text').attr('x', halfW + 20).attr('y', 15).text('|ψ̃(p)|²').attr('fill', '#e68cd8').attr('font-size', '11px')
      .attr('font-family', '-apple-system, sans-serif');

    // Position panel
    const xScale = d3.scaleLinear().domain([-4, 4]).range([10, halfW]);
    const yScale = d3.scaleLinear().domain([0, 1.2]).range([h - 20, 25]);
    svg.append('line').attr('x1', 10).attr('y1', h - 20).attr('x2', halfW).attr('y2', h - 20)
      .attr('stroke', '#222235').attr('stroke-width', 0.5);

    // σ_x markers
    svg.append('line').attr('x1', xScale(-dx)).attr('y1', 25).attr('x2', xScale(-dx)).attr('y2', h - 20)
      .attr('stroke', '#ff9800').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);
    svg.append('line').attr('x1', xScale(dx)).attr('y1', 25).attr('x2', xScale(dx)).attr('y2', h - 20)
      .attr('stroke', '#ff9800').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);

    const xArea = d3.area().x(d => xScale(d.x)).y0(h - 20).y1(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append('path').datum(xData).attr('d', xArea).attr('fill', 'rgba(92,156,230,0.15)');
    const xLine = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append('path').datum(xData).attr('d', xLine)
      .attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 2);

    // Momentum panel
    const pScale = d3.scaleLinear().domain([-4, 4]).range([halfW + 20, w - 10]);
    svg.append('line').attr('x1', halfW + 20).attr('y1', h - 20).attr('x2', w - 10).attr('y2', h - 20)
      .attr('stroke', '#222235').attr('stroke-width', 0.5);

    svg.append('line').attr('x1', pScale(-dp)).attr('y1', 25).attr('x2', pScale(-dp)).attr('y2', h - 20)
      .attr('stroke', '#ff9800').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);
    svg.append('line').attr('x1', pScale(dp)).attr('y1', 25).attr('x2', pScale(dp)).attr('y2', h - 20)
      .attr('stroke', '#ff9800').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.5);

    const pArea = d3.area().x(d => pScale(d.p)).y0(h - 20).y1(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append('path').datum(pData).attr('d', pArea).attr('fill', 'rgba(230,140,216,0.15)');
    const pLine = d3.line().x(d => pScale(d.p)).y(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append('path').datum(pData).attr('d', pLine)
      .attr('fill', 'none').attr('stroke', '#e68cd8').attr('stroke-width', 2);

    const product = dx * dp;
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Δx</span><span class="output-value">${dx.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Δp</span><span class="output-value">${dp.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Δx · Δp</span><span class="output-value">${product.toFixed(3)} = ℏ/2 ✓</span></div>`;
  }

  dxSlider.addEventListener('input', () => { userInteracted = true; update(); });

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !userInteracted) {
      (function autoAnimate() {
        if (userInteracted) return;
        const t = Date.now() * 0.001;
        dxSlider.value = Math.round(150 + 120 * Math.sin(t * 0.35));
        update();
        requestAnimationFrame(autoAnimate);
      })();
    }
  }, { threshold: 0.3 });
  observer.observe(container);

  update();
}


/* ═══════════════════════════════════════════════
   EXERCISE CHECKER
   ═══════════════════════════════════════════════ */
function checkExercise(n) {
  const input = document.getElementById(`ex${n}-answer`);
  const fb = document.getElementById(`ex${n}-feedback`);
  if (!input || !fb) return;
  const ans = input.value.trim().toLowerCase().replace(/\s/g, '');

  const answers = {
    1: { accept: ['0'], hint: 'Expand using orthonormality: ⟨0|0⟩=1, ⟨0|1⟩=0, ⟨1|1⟩=1, ⟨1|0⟩=0' },
    2: { accept: ['1/3', '0.333', '0.33'], hint: '⟨0|ψ⟩ = 1/√3, so |⟨0|ψ⟩|² = 1/3' },
    3: { accept: ['(1/√2)(|0⟩-|1⟩)', '|−⟩', '|-⟩', '(1/sqrt(2))(|0>-|1>)'], hint: 'σz|0⟩=|0⟩, σz|1⟩=-|1⟩' },
    4: { accept: ['0.25', '1/4', '.25'], hint: 'Δx·Δp ≥ ℏ/2, so Δp ≥ 1/(2·2) = 0.25' },
    5: { accept: ['p', '|+><+|', '|+⟩⟨+|'], hint: 'P²=P means projecting twice = projecting once' },
    6: { accept: ['0'], hint: '⟨0|σx|0⟩ = ⟨0|1⟩ = 0' },
    7: { accept: ['1/2', '0.5', '0.50'], hint: '|⟨+|ψ⟩|² where |+⟩=(|0⟩+|1⟩)/√2' },
    8: { accept: ['-2i', '-2i*sigma_y', '-2iσy'], hint: '[σx,σz] = σxσz - σzσx = ...' }
  };

  const q = answers[n];
  if (!q) return;
  if (q.accept.some(a => ans === a || ans.includes(a))) {
    fb.textContent = '✓ Correct!';
    fb.className = 'feedback correct';
  } else {
    fb.textContent = '✗ ' + q.hint;
    fb.className = 'feedback wrong';
  }
}
