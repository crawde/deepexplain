/* DeepExplain v6 – All fixes: scroll-trigger, green arrow, dot lag, 3D interactivity,
   operator labels, faster wavefunction/fourier, eigenstate viz */

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
  initSuperposition3D();
  initInnerProduct3D();
  initKetBuilder();
  initInnerProduct();
  initProjection();
  initOperatorAction();
  initEigenstates();
  initBasisChange();
  initWavefunction();
  initFourier();
  initUncertainty();
});

/* ─── UTILITY ─── */
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

/* ─── SCROLL-TRIGGER HELPER ─── */
// Starts animation on scroll, runs for `duration` ms with linear-in/ease-out, then stops.
function scrollTriggerAnim(container, tickFn, opts = {}) {
  const duration = opts.duration || 6000;   // run for 6s by default
  const keepGoing = opts.keepGoing || false; // for wavefunction/fourier
  let started = false, startTime = 0, stopped = false, userInteracted = false;
  let rafId = null;

  function markInteracted() { userInteracted = true; stopped = true; if (rafId) cancelAnimationFrame(rafId); }

  function loop() {
    if (userInteracted) return;
    const elapsed = Date.now() - startTime;
    let progress = Math.min(elapsed / duration, 1);
    // ease-out factor: starts 1, goes to 0 at end
    let factor = keepGoing ? 1 : 1 - Math.pow(progress, 3);
    if (progress >= 1 && !keepGoing) { stopped = true; return; }
    tickFn(factor, elapsed);
    rafId = requestAnimationFrame(loop);
  }

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !started && !userInteracted) {
      started = true;
      startTime = Date.now();
      loop();
    }
  }, { threshold: 0.3 });

  if (container) observer.observe(container);
  return markInteracted;
}


/* ─── THREE.JS HELPERS ─── */
function createScene(canvasId, containerId) {
  const canvas = document.getElementById(canvasId);
  const container = document.getElementById(containerId);
  if (!canvas || !container || !window.THREE) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return { scene, camera, renderer, canvas, container };
}

function makeGlow(color, size) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const r = (color >> 16) & 255, gr = (color >> 8) & 255, b = color & 255;
  g.addColorStop(0, `rgba(${r},${gr},${b},0.5)`);
  g.addColorStop(0.5, `rgba(${r},${gr},${b},0.08)`);
  g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.6 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function makeConeArrow(from, to, color, radius) {
  const group = new THREE.Group();
  const dir = new THREE.Vector3(to[0]-from[0], to[1]-from[1], to[2]-from[2]);
  const len = dir.length();
  const coneH = 0.15;
  const shaftLen = len - coneH;

  // Shaft
  const shaftGeo = new THREE.CylinderGeometry(radius || 0.02, radius || 0.02, shaftLen, 8);
  const shaftMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.15, transparent: true, opacity: 0.85 });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.position.y = shaftLen / 2;
  group.add(shaft);

  // Cone
  const coneGeo = new THREE.ConeGeometry(0.06, coneH, 12);
  const coneMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = shaftLen + coneH / 2;
  group.add(cone);

  // Orient
  dir.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
  group.quaternion.copy(q);
  group.position.set(from[0], from[1], from[2]);

  return group;
}

function makeArrow(from, to, color) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...from), new THREE.Vector3(...to)
  ]);
  return new THREE.Line(geo, mat);
}

function makeLabel(text, pos, color) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = '500 28px Inter, sans-serif';
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

// Add mouse/touch orbit to a 3D scene
function addOrbitControl(s, target) {
  let isDragging = false, lastMouse = {x:0, y:0};
  let camTheta = Math.atan2(s.camera.position.z, s.camera.position.x);
  let camPhi = Math.acos(s.camera.position.y / s.camera.position.distanceTo(target || new THREE.Vector3()));
  const camR = s.camera.position.distanceTo(target || new THREE.Vector3());

  function updateCam() {
    s.camera.position.x = camR * Math.sin(camPhi) * Math.cos(camTheta);
    s.camera.position.z = camR * Math.sin(camPhi) * Math.sin(camTheta);
    s.camera.position.y = camR * Math.cos(camPhi);
    s.camera.lookAt(target || new THREE.Vector3(0, 0, 0));
  }

  s.canvas.addEventListener('mousedown', e => { isDragging = true; lastMouse = {x: e.clientX, y: e.clientY}; });
  s.canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    camTheta -= (e.clientX - lastMouse.x) * 0.008;
    camPhi = Math.max(0.2, Math.min(Math.PI - 0.2, camPhi + (e.clientY - lastMouse.y) * 0.008));
    lastMouse = {x: e.clientX, y: e.clientY};
    updateCam();
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  s.canvas.addEventListener('touchstart', e => { isDragging = true; lastMouse = {x: e.touches[0].clientX, y: e.touches[0].clientY}; }, {passive: true});
  s.canvas.addEventListener('touchmove', e => {
    if (!isDragging) return;
    camTheta -= (e.touches[0].clientX - lastMouse.x) * 0.008;
    camPhi = Math.max(0.2, Math.min(Math.PI - 0.2, camPhi + (e.touches[0].clientY - lastMouse.y) * 0.008));
    lastMouse = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    updateCam();
  }, {passive: true});
  s.canvas.addEventListener('touchend', () => { isDragging = false; });

  return { updateCam, getCamTheta: () => camTheta, setCamTheta: v => { camTheta = v; updateCam(); } };
}


/* ═══════════════════════════════════════════════
   BLOCH SPHERE HERO
   ═══════════════════════════════════════════════ */
function initBlochSphere() {
  const s = createScene('bloch-canvas', 'bloch-hero');
  if (!s) return;
  const { scene, camera, renderer } = s;
  const readout = document.getElementById('hero-ket');

  camera.position.set(3, 2, 3);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x334466, 0.6));
  const p1 = new THREE.PointLight(0x5c9ce6, 1.4, 20); p1.position.set(3, 5, 3); scene.add(p1);
  const p2 = new THREE.PointLight(0xe68cd8, 0.5, 20); p2.position.set(-3, -2, 3); scene.add(p2);
  const p3 = new THREE.PointLight(0x66bb6a, 0.3, 15); p3.position.set(0, -3, -3); scene.add(p3);

  const sphereGeo = new THREE.SphereGeometry(1.5, 40, 28);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0x5c9ce6, wireframe: true, transparent: true, opacity: 0.06 });
  scene.add(new THREE.Mesh(sphereGeo, sphereMat));

  const ringGeo = new THREE.RingGeometry(1.49, 1.51, 80);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x5c9ce6, side: THREE.DoubleSide, transparent: true, opacity: 0.14 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  scene.add(makeArrow([0, -1.8, 0], [0, 1.8, 0], 0x5c9ce6));
  scene.add(makeArrow([-1.8, 0, 0], [1.8, 0, 0], 0x5c9ce6));
  scene.add(makeArrow([0, 0, -1.8], [0, 0, 1.8], 0x5c9ce6));
  scene.add(makeLabel('|0⟩', [0, 2, 0], '#5c9ce6'));
  scene.add(makeLabel('|1⟩', [0, -2, 0], '#e68cd8'));

  let theta = 0.7, phi = 0.5;
  const dotGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const dotMat = new THREE.MeshPhongMaterial({ color: 0x66ff88, emissive: 0x33aa55, emissiveIntensity: 0.4 });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  const glow = makeGlow(0x66ff88, 0.5);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.5 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,1.5,0)]);
  const stateLine = new THREE.Line(lineGeo, lineMat);
  scene.add(stateLine); scene.add(dot); scene.add(glow);

  const pCount = 80;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const r = 2.5 + Math.random() * 3;
    const a = Math.random() * Math.PI * 2;
    const b = (Math.random() - 0.5) * Math.PI;
    pPos[i*3] = r * Math.cos(b) * Math.cos(a);
    pPos[i*3+1] = r * Math.sin(b);
    pPos[i*3+2] = r * Math.cos(b) * Math.sin(a);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x5c9ce6, size: 0.015, transparent: true, opacity: 0.2 }));
  scene.add(particles);

  function updateState() {
    const x = 1.5 * Math.sin(theta) * Math.cos(phi);
    const y = 1.5 * Math.cos(theta);
    const z = 1.5 * Math.sin(theta) * Math.sin(phi);
    dot.position.set(x, y, z);
    glow.position.set(x, y, z);
    const pos = stateLine.geometry.attributes.position.array;
    pos[3] = x; pos[4] = y; pos[5] = z;
    stateLine.geometry.attributes.position.needsUpdate = true;
    const a = Math.cos(theta / 2);
    const bRe = Math.sin(theta / 2) * Math.cos(phi);
    const bIm = Math.sin(theta / 2) * Math.sin(phi);
    let ket;
    if (a > 0.99) ket = '|ψ⟩ = |0⟩';
    else if (a < 0.01) ket = '|ψ⟩ = |1⟩';
    else ket = `|ψ⟩ = ${a.toFixed(2)}|0⟩ + (${fmtComplex(bRe, bIm)})|1⟩`;
    if (readout) readout.textContent = ket;
  }

  let isDragging = false, lastMouse = {x:0, y:0}, autoRotate = true;
  s.canvas.addEventListener('mousedown', e => { isDragging = true; autoRotate = false; lastMouse = {x: e.clientX, y: e.clientY}; });
  s.canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    phi += (e.clientX - lastMouse.x) * 0.005;
    theta = Math.max(0.01, Math.min(Math.PI - 0.01, theta + (e.clientY - lastMouse.y) * 0.005));
    lastMouse = {x: e.clientX, y: e.clientY};
    updateState();
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  s.canvas.addEventListener('touchstart', e => { isDragging = true; autoRotate = false; lastMouse = {x: e.touches[0].clientX, y: e.touches[0].clientY}; }, {passive: true});
  s.canvas.addEventListener('touchmove', e => {
    if (!isDragging) return;
    phi += (e.touches[0].clientX - lastMouse.x) * 0.005;
    theta = Math.max(0.01, Math.min(Math.PI - 0.01, theta + (e.touches[0].clientY - lastMouse.y) * 0.005));
    lastMouse = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    updateState();
  }, {passive: true});
  s.canvas.addEventListener('touchend', () => { isDragging = false; });

  updateState();

  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.003;
    if (autoRotate) {
      phi += 0.0015;
      theta = 0.7 + 0.25 * Math.sin(t * 0.3);
      updateState();
    }
    const camT = t * 0.08;
    camera.position.x = 3.5 * Math.cos(camT);
    camera.position.z = 3.5 * Math.sin(camT);
    camera.position.y = 1.8 + 0.3 * Math.sin(t * 0.2);
    camera.lookAt(0, 0, 0);
    glow.material.opacity = 0.4 + 0.2 * Math.sin(t * 1.5);
    dotMat.emissiveIntensity = 0.2 + 0.2 * Math.sin(t * 1.5);
    particles.rotation.y = t * 0.03;
    renderer.render(scene, camera);
  }
  animate();
}


/* ═══════════════════════════════════════════════
   SUPERPOSITION 3D — interactive, better colors/cameras
   ═══════════════════════════════════════════════ */
function initSuperposition3D() {
  const s = createScene('superposition-canvas', 'superposition-scene');
  if (!s) return;
  const { scene, camera, renderer } = s;
  const readout = document.getElementById('superposition-readout');

  camera.position.set(2.5, 3, 4);
  camera.lookAt(0, 0.5, 0);

  scene.add(new THREE.AmbientLight(0x8899bb, 0.7));
  const light1 = new THREE.PointLight(0x5c9ce6, 1.2, 15); light1.position.set(3, 5, 3); scene.add(light1);
  const light2 = new THREE.PointLight(0xe68cd8, 0.6, 12); light2.position.set(-2, 3, -2); scene.add(light2);

  // Grid floor
  const gridHelper = new THREE.GridHelper(4, 8, 0x111128, 0x0a0a18);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  // Axes
  scene.add(makeArrow([0, -0.3, 0], [0, 2.2, 0], 0x2244aa));
  scene.add(makeArrow([-0.3, 0, 0], [2.2, 0, 0], 0x2244aa));
  scene.add(makeArrow([0, 0, -0.3], [0, 0, 2.2], 0x2244aa));

  // Labels
  scene.add(makeLabel('|0⟩', [0, 2.4, 0], '#6ab0ff'));
  scene.add(makeLabel('|1⟩', [2.4, 0.15, 0], '#ff8cd8'));

  // Arrows as cone-tipped lines for visibility
  const blueArrow = makeConeArrow([0,0,0], [0,1.5,0], 0x4a9ef5, 0.025);
  const pinkArrow = makeConeArrow([0,0,0], [1.5,0,0], 0xe870c8, 0.025);
  const whiteArrow = makeConeArrow([0,0,0], [0.7,0.7,0], 0xffffff, 0.03);

  scene.add(blueArrow);
  scene.add(pinkArrow);
  scene.add(whiteArrow);

  // Tip glow
  const whiteGlow = makeGlow(0xffffff, 0.6);
  scene.add(whiteGlow);

  // Dashed lines from sum vector tip
  const dashMat = new THREE.LineDashedMaterial({ color: 0x555588, dashSize: 0.06, gapSize: 0.04, transparent: true, opacity: 0.35 });
  const dash1Geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const dash2Geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const dash1 = new THREE.Line(dash1Geo, dashMat);
  const dash2 = new THREE.Line(dash2Geo, dashMat);
  dash1.computeLineDistances(); dash2.computeLineDistances();
  scene.add(dash1); scene.add(dash2);

  // Orbit controls
  const orbit = addOrbitControl(s, new THREE.Vector3(0, 0.5, 0));
  let userDragging = false;
  s.canvas.addEventListener('mousedown', () => { userDragging = true; });
  s.canvas.addEventListener('touchstart', () => { userDragging = true; }, {passive: true});

  function reArrow(group, from, to, color) {
    // Remove old children
    while (group.children.length > 0) group.remove(group.children[0]);
    const dir = new THREE.Vector3(to[0]-from[0], to[1]-from[1], to[2]-from[2]);
    const len = dir.length();
    if (len < 0.01) return;
    const coneH = 0.12;
    const shaftLen = Math.max(0.01, len - coneH);
    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, shaftLen, 8);
    const shaftMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.15, transparent: true, opacity: 0.85 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = shaftLen / 2;
    group.add(shaft);
    const coneGeo = new THREE.ConeGeometry(0.05, coneH, 12);
    const coneMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = shaftLen + coneH / 2;
    group.add(cone);
    dir.normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    group.quaternion.copy(q);
    group.position.set(from[0], from[1], from[2]);
  }

  let t = 0, autoT = true;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.004;

    if (autoT && !userDragging) {
      orbit.setCamTheta(t * 0.12);
    }

    const theta = Math.PI / 4 + 0.35 * Math.sin(t * 0.25);
    const alpha = Math.cos(theta / 2);
    const beta = Math.sin(theta / 2);
    const aY = alpha * 1.8;
    const bX = beta * 1.8;

    reArrow(blueArrow, [0,0,0], [0, aY, 0], 0x4a9ef5);
    reArrow(pinkArrow, [0,0,0], [bX, 0, 0], 0xe870c8);
    reArrow(whiteArrow, [0,0,0], [bX, aY, 0], 0xffffff);
    whiteGlow.position.set(bX, aY, 0);
    whiteGlow.material.opacity = 0.4 + 0.15 * Math.sin(t * 1.2);

    // Dashed
    const d1 = dash1.geometry.attributes.position.array;
    d1[0] = bX; d1[1] = aY; d1[2] = 0; d1[3] = 0; d1[4] = aY; d1[5] = 0;
    dash1.geometry.attributes.position.needsUpdate = true;
    dash1.computeLineDistances();
    const d2 = dash2.geometry.attributes.position.array;
    d2[0] = bX; d2[1] = aY; d2[2] = 0; d2[3] = bX; d2[4] = 0; d2[5] = 0;
    dash2.geometry.attributes.position.needsUpdate = true;
    dash2.computeLineDistances();

    if (readout) readout.textContent = `${alpha.toFixed(2)}|0⟩ + ${beta.toFixed(2)}|1⟩`;
    renderer.render(scene, camera);
  }
  animate();
}


/* ═══════════════════════════════════════════════
   INNER PRODUCT 3D — interactive
   ═══════════════════════════════════════════════ */
function initInnerProduct3D() {
  const s = createScene('inner-product-3d-canvas', 'inner-product-3d-scene');
  if (!s) return;
  const { scene, camera, renderer } = s;
  const readout = document.getElementById('inner-product-3d-readout');

  camera.position.set(2.8, 2, 3.2);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x8899bb, 0.6));
  const light = new THREE.PointLight(0x5c9ce6, 1, 15); light.position.set(3, 4, 3); scene.add(light);

  // Circle
  const circleGeo = new THREE.RingGeometry(1.49, 1.51, 64);
  const circleMat = new THREE.MeshBasicMaterial({ color: 0x222244, side: THREE.DoubleSide, transparent: true, opacity: 0.1 });
  scene.add(new THREE.Mesh(circleGeo, circleMat));

  scene.add(makeArrow([-2, 0, 0], [2, 0, 0], 0x1a1a30));
  scene.add(makeArrow([0, -2, 0], [0, 2, 0], 0x1a1a30));

  // Vectors
  const psiArrow = makeConeArrow([0,0,0], [1.5,0,0], 0x5c9ce6, 0.02);
  const phiArrow = makeConeArrow([0,0,0], [0,1.5,0], 0xe68cd8, 0.02);
  const projArrow = makeConeArrow([0,0,0], [1,0,0], 0x66bb6a, 0.018);
  scene.add(psiArrow); scene.add(phiArrow); scene.add(projArrow);

  const psiGlow = makeGlow(0x5c9ce6, 0.35); scene.add(psiGlow);
  const phiGlow = makeGlow(0xe68cd8, 0.35); scene.add(phiGlow);
  const projGlow = makeGlow(0x66bb6a, 0.3); scene.add(projGlow);

  // Drop line
  const dropMat = new THREE.LineDashedMaterial({ color: 0x66bb6a, dashSize: 0.05, gapSize: 0.03, transparent: true, opacity: 0.3 });
  const dropGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const dropLine = new THREE.Line(dropGeo, dropMat);
  dropLine.computeLineDistances();
  scene.add(dropLine);

  scene.add(makeLabel('|ψ⟩', [1.7, 0.2, 0], '#5c9ce6'));
  scene.add(makeLabel('|φ⟩', [0.2, 1.7, 0], '#e68cd8'));

  const orbit = addOrbitControl(s, new THREE.Vector3(0, 0, 0));
  let userDragging = false;
  s.canvas.addEventListener('mousedown', () => { userDragging = true; });
  s.canvas.addEventListener('touchstart', () => { userDragging = true; }, {passive: true});

  function reArrowDir(group, from, to, color) {
    while (group.children.length > 0) group.remove(group.children[0]);
    const dir = new THREE.Vector3(to[0]-from[0], to[1]-from[1], to[2]-from[2]);
    const len = dir.length();
    if (len < 0.01) return;
    const coneH = 0.1;
    const shaftLen = Math.max(0.01, len - coneH);
    const shaftGeo = new THREE.CylinderGeometry(0.015, 0.015, shaftLen, 8);
    const shaftMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.15, transparent: true, opacity: 0.8 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = shaftLen / 2;
    group.add(shaft);
    const coneGeo = new THREE.ConeGeometry(0.04, coneH, 12);
    const coneMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = shaftLen + coneH / 2;
    group.add(cone);
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    group.quaternion.copy(q);
    group.position.set(from[0], from[1], from[2]);
  }

  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.004;
    if (!userDragging) orbit.setCamTheta(t * 0.08 + 0.5);

    const psiA = t * 0.15;
    const phiA = Math.PI / 3 + 0.5 * Math.sin(t * 0.12);
    const px = 1.5 * Math.cos(psiA), py = 1.5 * Math.sin(psiA);
    const fx = 1.5 * Math.cos(phiA), fy = 1.5 * Math.sin(phiA);

    reArrowDir(psiArrow, [0,0,0], [px, py, 0], 0x5c9ce6);
    reArrowDir(phiArrow, [0,0,0], [fx, fy, 0], 0xe68cd8);
    psiGlow.position.set(px, py, 0);
    phiGlow.position.set(fx, fy, 0);

    const ip = Math.cos(psiA - phiA);
    const projX = ip * Math.cos(psiA) * 1.5;
    const projY = ip * Math.sin(psiA) * 1.5;

    if (Math.abs(ip) > 0.01) {
      reArrowDir(projArrow, [0,0,0], [projX, projY, 0], 0x66bb6a);
    }
    projGlow.position.set(projX, projY, 0);

    const dp = dropLine.geometry.attributes.position.array;
    dp[0] = fx; dp[1] = fy; dp[3] = projX; dp[4] = projY;
    dropLine.geometry.attributes.position.needsUpdate = true;
    dropLine.computeLineDistances();

    if (readout) readout.textContent = `⟨ψ|φ⟩ = ${ip.toFixed(3)}    |⟨ψ|φ⟩|² = ${(ip*ip).toFixed(3)}`;
    renderer.render(scene, camera);
  }
  animate();
}


/* ═══════════════════════════════════════════════
   KET BUILDER — scroll-trigger, easing stop
   ═══════════════════════════════════════════════ */
function initKetBuilder() {
  const thetaSlider = document.getElementById('theta-slider');
  const phiSlider = document.getElementById('phi-slider');
  if (!thetaSlider) return;
  const thetaVal = document.getElementById('theta-val');
  const phiVal = document.getElementById('phi-val');
  const display = document.getElementById('ket-state-display');
  const output = document.getElementById('ket-output');

  function update() {
    const theta = (thetaSlider.value / 100) * Math.PI;
    const phi = (phiSlider.value / 100) * Math.PI;
    thetaVal.textContent = fmtAngle(theta);
    phiVal.textContent = fmtAngle(phi);
    const a = Math.cos(theta / 2);
    const bRe = Math.sin(theta / 2) * Math.cos(phi);
    const bIm = Math.sin(theta / 2) * Math.sin(phi);
    const p0 = a * a, p1 = bRe * bRe + bIm * bIm;
    display.textContent = `|ψ⟩ = ${a.toFixed(3)}|0⟩ + (${fmtComplex(bRe, bIm)})|1⟩`;
    output.innerHTML = `
      <div class="output-row"><span class="output-label">α = ⟨0|ψ⟩</span><span class="output-value">${a.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">β = ⟨1|ψ⟩</span><span class="output-value">${fmtComplex(bRe, bIm)}</span></div>
      <div class="output-row"><span class="output-label">P(|0⟩) = |α|²</span><span class="output-value">${p0.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">P(|1⟩) = |β|²</span><span class="output-value">${p1.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">|α|² + |β|²</span><span class="output-value">${(p0 + p1).toFixed(6)}</span></div>`;
  }

  const stop = scrollTriggerAnim(
    thetaSlider.closest('.interactive'),
    (factor, elapsed) => {
      const t = elapsed * 0.001;
      thetaSlider.value = Math.round(157 + 80 * Math.sin(t * 0.8) * factor);
      phiSlider.value = Math.round(314 + 200 * Math.sin(t * 0.6) * factor);
      update();
    },
    { duration: 5000 }
  );

  thetaSlider.addEventListener('input', () => { stop(); update(); });
  phiSlider.addEventListener('input', () => { stop(); update(); });
  update();
}


/* ═══════════════════════════════════════════════
   INNER PRODUCT 2D — fixed green arrow
   ═══════════════════════════════════════════════ */
function initInnerProduct() {
  const container = document.getElementById('inner-product-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#inner-product-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', '#141425').attr('stroke-width', 0.5);
  svg.append('line').attr('x1', cx - R - 10).attr('y1', cy).attr('x2', cx + R + 10).attr('y2', cy)
    .attr('stroke', '#0e0e1a').attr('stroke-width', 0.5);
  svg.append('line').attr('x1', cx).attr('y1', cy - R - 10).attr('x2', cx).attr('y2', cy + R + 10)
    .attr('stroke', '#0e0e1a').attr('stroke-width', 0.5);

  const psiLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);
  const phiLine = svg.append('line').attr('stroke', '#e68cd8').attr('stroke-width', 1.5);
  const projLine = svg.append('line').attr('stroke', '#66bb6a').attr('stroke-width', 1.2).attr('stroke-dasharray', '4,3');
  const arcPath = svg.append('path').attr('fill', 'none').attr('stroke', '#ffcc80').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3');
  const psiDot = svg.append('circle').attr('r', 4).attr('fill', '#5c9ce6');
  const phiDot = svg.append('circle').attr('r', 4).attr('fill', '#e68cd8');
  const projDot = svg.append('circle').attr('r', 3).attr('fill', '#66bb6a');
  const psiLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '10px').text('|ψ⟩');
  const phiLabel = svg.append('text').attr('fill', '#e68cd8').attr('font-size', '10px').text('|φ⟩');

  const psiAngle = document.getElementById('psi-angle');
  const phiAngle = document.getElementById('phi-angle');
  const psiAngleVal = document.getElementById('psi-angle-val');
  const phiAngleVal = document.getElementById('phi-angle-val');
  const outputEl = document.getElementById('inner-product-output');

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

    // Arc
    const arcR = R * 0.3;
    const arcD = d3.arc().innerRadius(arcR - 1).outerRadius(arcR + 1)
      .startAngle(a1 + Math.PI / 2).endAngle(a2 + Math.PI / 2);
    arcPath.attr('d', arcD()).attr('transform', `translate(${cx},${cy})`);

    // Correct inner product: dot product of unit vectors
    const ip = Math.cos(a1 - a2);
    const prob = ip * ip;

    // Projection of φ onto ψ direction (FIXED: use the ψ unit vector, scale by ip)
    const psiUx = Math.cos(a1), psiUy = Math.sin(a1);
    const projX = cx + R * ip * psiUx;
    const projY = cy + R * ip * psiUy;

    // Green dashed line from φ tip to projection point
    projLine.attr('x1', x2).attr('y1', y2).attr('x2', projX).attr('y2', projY);
    projDot.attr('cx', projX).attr('cy', projY);

    const angleDiff = Math.abs(((psiAngle.value - phiAngle.value + 540) % 360) - 180);
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">⟨φ|ψ⟩</span><span class="output-value">${ip.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">|⟨φ|ψ⟩|²</span><span class="output-value">${prob.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">Angle</span><span class="output-value">${angleDiff.toFixed(1)}°</span></div>
      <div class="output-row"><span class="output-label">Orthogonal?</span><span class="output-value">${Math.abs(ip) < 0.01 ? '✓ Yes' : '✗ No'}</span></div>`;
  }

  const stop = scrollTriggerAnim(container, (factor, elapsed) => {
    const t = elapsed * 0.001;
    psiAngle.value = Math.round(180 + 150 * Math.sin(t * 0.5) * factor);
    phiAngle.value = Math.round(90 + 80 * Math.sin(t * 0.6 + 1) * factor);
    update();
  }, { duration: 6000 });

  psiAngle.addEventListener('input', () => { stop(); update(); });
  phiAngle.addEventListener('input', () => { stop(); update(); });
  update();
}


/* ═══════════════════════════════════════════════
   PROJECTION — no dot lag (CSS transition removed)
   ═══════════════════════════════════════════════ */
function initProjection() {
  const container = document.getElementById('projection-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#projection-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'none').attr('stroke', '#141425');

  const psiDirLine = svg.append('line').attr('stroke', 'rgba(92,156,230,0.1)').attr('stroke-width', 0.5).attr('stroke-dasharray', '3,3');
  const psiLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);
  const chiLine = svg.append('line').attr('stroke', '#ffab40').attr('stroke-width', 1.5);
  const projectionLine = svg.append('line').attr('stroke', '#66bb6a').attr('stroke-width', 2);
  const dropLine = svg.append('line').attr('stroke', '#66bb6a').attr('stroke-width', 0.8).attr('stroke-dasharray', '4,3');
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 2).attr('fill', '#222');
  const chiDot = svg.append('circle').attr('r', 4).attr('fill', '#ffab40');
  const projDot = svg.append('circle').attr('r', 4).attr('fill', '#66bb6a');
  const psiLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '10px').text('|ψ⟩');
  const chiLabel = svg.append('text').attr('fill', '#ffab40').attr('font-size', '10px').text('|χ⟩');
  const projLabel = svg.append('text').attr('fill', '#66bb6a').attr('font-size', '10px').text('P|χ⟩');

  const psiAngle = document.getElementById('proj-psi-angle');
  const chiAngle = document.getElementById('proj-chi-angle');
  const psiVal = document.getElementById('proj-psi-val');
  const chiVal = document.getElementById('proj-chi-val');
  const outputEl = document.getElementById('projection-output');

  function update() {
    const a1 = -(psiAngle.value * Math.PI / 180), a2 = -(chiAngle.value * Math.PI / 180);
    psiVal.textContent = psiAngle.value + '°';
    chiVal.textContent = chiAngle.value + '°';
    const dx1 = Math.cos(a1), dy1 = Math.sin(a1), dx2 = Math.cos(a2), dy2 = Math.sin(a2);
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
      <div class="output-row"><span class="output-label">P_ψ|χ⟩</span><span class="output-value">${dot.toFixed(3)} × |ψ⟩</span></div>
      <div class="output-row"><span class="output-label">‖P_ψ|χ⟩‖²</span><span class="output-value">${(dot * dot).toFixed(4)}</span></div>`;
  }

  const stop = scrollTriggerAnim(container, (factor, elapsed) => {
    const t = elapsed * 0.001;
    chiAngle.value = Math.round(120 + 100 * Math.sin(t * 0.6) * factor);
    update();
  }, { duration: 5000 });

  psiAngle.addEventListener('input', () => { stop(); update(); });
  chiAngle.addEventListener('input', () => { stop(); update(); });
  update();
}


/* ═══════════════════════════════════════════════
   OPERATOR ACTION — label offset fix
   ═══════════════════════════════════════════════ */
function initOperatorAction() {
  const container = document.getElementById('operator-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#operator-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'none').attr('stroke', '#141425');
  svg.append('text').attr('x', cx + R + 12).attr('y', cy + 4).text('|0⟩').attr('fill', '#333').attr('font-size', '10px');
  svg.append('text').attr('x', cx - 5).attr('y', cy - R - 8).text('|1⟩').attr('fill', '#333').attr('font-size', '10px');

  const inLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);
  const outLine = svg.append('line').attr('stroke', '#ef5350').attr('stroke-width', 1.5);
  const inDot = svg.append('circle').attr('r', 4).attr('fill', '#5c9ce6');
  const outDot = svg.append('circle').attr('r', 4).attr('fill', '#ef5350');
  // Labels use background rects for clarity
  const inLabelBg = svg.append('rect').attr('fill', '#06060e').attr('rx', 3);
  const outLabelBg = svg.append('rect').attr('fill', '#06060e').attr('rx', 3);
  const inLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '10px').attr('font-weight', 500);
  const outLabel = svg.append('text').attr('fill', '#ef5350').attr('font-size', '10px').attr('font-weight', 500);

  const thetaSlider = document.getElementById('op-theta');
  const thetaVal = document.getElementById('op-theta-val');
  const outputEl = document.getElementById('operator-output');
  const buttons = document.querySelectorAll('[data-op]');
  let currentOp = 'I';

  const ops = {
    I: (a, b) => [a, b], X: (a, b) => [b, a], Y: (a, b) => [-b, a],
    Z: (a, b) => [a, -b], H: (a, b) => [(a + b) / Math.SQRT2, (a - b) / Math.SQRT2]
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      stop();
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
    const inA = -(Math.atan2(b, a)), outA = -(Math.atan2(ob, oa));
    const ix = cx + R * Math.cos(inA), iy = cy + R * Math.sin(inA);
    const ox = cx + R * Math.cos(outA), oy = cy + R * Math.sin(outA);
    inLine.attr('x1', cx).attr('y1', cy).attr('x2', ix).attr('y2', iy);
    outLine.attr('x1', cx).attr('y1', cy).attr('x2', ox).attr('y2', oy);
    inDot.attr('cx', ix).attr('cy', iy);
    outDot.attr('cx', ox).attr('cy', oy);

    // Smart label placement: offset to avoid overlap
    let inLx = ix + 10, inLy = iy - 10;
    let outLx = ox + 10, outLy = oy - 10;
    const dx = Math.abs(inLx - outLx), dy = Math.abs(inLy - outLy);
    if (dx < 30 && dy < 20) {
      // Push labels apart
      inLy = iy - 22;
      outLy = oy + 14;
    }
    inLabel.attr('x', inLx).attr('y', inLy).text('|ψ⟩');
    outLabel.attr('x', outLx).attr('y', outLy).text(currentOp + '|ψ⟩');
    // Background rects
    inLabelBg.attr('x', inLx - 2).attr('y', inLy - 11).attr('width', 28).attr('height', 14);
    outLabelBg.attr('x', outLx - 2).attr('y', outLy - 11).attr('width', 42).attr('height', 14);

    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Input</span><span class="output-value">${a.toFixed(3)}|0⟩ + ${b.toFixed(3)}|1⟩</span></div>
      <div class="output-row"><span class="output-label">${currentOp} · |ψ⟩</span><span class="output-value">${oa.toFixed(3)}|0⟩ + ${ob.toFixed(3)}|1⟩</span></div>`;
  }

  const stop = scrollTriggerAnim(container, (factor, elapsed) => {
    const t = elapsed * 0.001;
    thetaSlider.value = Math.round(157 + 100 * Math.sin(t * 0.7) * factor);
    update();
  }, { duration: 5000 });

  thetaSlider.addEventListener('input', () => { stop(); update(); });
  update();
}


/* ═══════════════════════════════════════════════
   EIGENSTATES & EIGENVALUES (new visualization)
   ═══════════════════════════════════════════════ */
function initEigenstates() {
  const container = document.getElementById('eigen-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#eigen-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'none').attr('stroke', '#141425');
  svg.append('text').attr('x', cx + R + 12).attr('y', cy + 4).text('|0⟩').attr('fill', '#333').attr('font-size', '10px');
  svg.append('text').attr('x', cx - 5).attr('y', cy - R - 8).text('|1⟩').attr('fill', '#333').attr('font-size', '10px');

  // Eigenstate direction markers
  const eigenLine1 = svg.append('line').attr('stroke', '#ffcc80').attr('stroke-width', 0.8).attr('stroke-dasharray', '6,4').attr('opacity', 0.4);
  const eigenLine2 = svg.append('line').attr('stroke', '#ffcc80').attr('stroke-width', 0.8).attr('stroke-dasharray', '6,4').attr('opacity', 0.4);
  const eigenLabel1 = svg.append('text').attr('fill', '#ffcc80').attr('font-size', '9px').attr('opacity', 0.6);
  const eigenLabel2 = svg.append('text').attr('fill', '#ffcc80').attr('font-size', '9px').attr('opacity', 0.6);

  const inLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);
  const outLine = svg.append('line').attr('stroke', '#ef5350').attr('stroke-width', 1.5);
  const inDot = svg.append('circle').attr('r', 4).attr('fill', '#5c9ce6');
  const outDot = svg.append('circle').attr('r', 4).attr('fill', '#ef5350');
  const inLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '10px');
  const outLabel = svg.append('text').attr('fill', '#ef5350').attr('font-size', '10px');

  const thetaSlider = document.getElementById('eigen-theta');
  const thetaVal = document.getElementById('eigen-theta-val');
  const outputEl = document.getElementById('eigen-output');
  const buttons = document.querySelectorAll('[data-eigen]');
  let currentOp = 'Z';

  const ops = {
    Z: { fn: (a, b) => [a, -b], eigens: [{a: 0, lbl: '|0⟩', ev: '+1'}, {a: -Math.PI/2, lbl: '|1⟩', ev: '-1'}] },
    X: { fn: (a, b) => [b, a], eigens: [{a: -Math.PI/4, lbl: '|+⟩', ev: '+1'}, {a: -3*Math.PI/4, lbl: '|−⟩', ev: '-1'}] },
    H: { fn: (a, b) => [(a+b)/Math.SQRT2, (a-b)/Math.SQRT2], eigens: [{a: -Math.PI/8, lbl: 'H+', ev: '+1'}, {a: -5*Math.PI/8, lbl: 'H−', ev: '-1'}] }
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      stop();
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOp = btn.dataset.eigen;
      update();
    });
  });

  function update() {
    const theta = (thetaSlider.value / 100) * Math.PI;
    thetaVal.textContent = fmtAngle(theta);
    const a = Math.cos(theta), b = Math.sin(theta);
    const op = ops[currentOp];
    const [oa, ob] = op.fn(a, b);
    const inA = -(Math.atan2(b, a)), outA = -(Math.atan2(ob, oa));
    const ix = cx + R * Math.cos(inA), iy = cy + R * Math.sin(inA);
    const ox = cx + R * Math.cos(outA), oy = cy + R * Math.sin(outA);

    // Show eigenstate directions
    const e1 = op.eigens[0], e2 = op.eigens[1];
    eigenLine1.attr('x1', cx - R*1.15*Math.cos(e1.a)).attr('y1', cy - R*1.15*Math.sin(e1.a))
      .attr('x2', cx + R*1.15*Math.cos(e1.a)).attr('y2', cy + R*1.15*Math.sin(e1.a));
    eigenLine2.attr('x1', cx - R*1.15*Math.cos(e2.a)).attr('y1', cy - R*1.15*Math.sin(e2.a))
      .attr('x2', cx + R*1.15*Math.cos(e2.a)).attr('y2', cy + R*1.15*Math.sin(e2.a));
    eigenLabel1.attr('x', cx + R*1.2*Math.cos(e1.a)).attr('y', cy + R*1.2*Math.sin(e1.a) + 3).text(e1.lbl + ' (λ=' + e1.ev + ')');
    eigenLabel2.attr('x', cx + R*1.2*Math.cos(e2.a)).attr('y', cy + R*1.2*Math.sin(e2.a) + 3).text(e2.lbl + ' (λ=' + e2.ev + ')');

    inLine.attr('x1', cx).attr('y1', cy).attr('x2', ix).attr('y2', iy);
    outLine.attr('x1', cx).attr('y1', cy).attr('x2', ox).attr('y2', oy);
    inDot.attr('cx', ix).attr('cy', iy);
    outDot.attr('cx', ox).attr('cy', oy);

    let inLy = iy - 12, outLy = oy + 14;
    if (Math.abs(iy - oy) < 20 && Math.abs(ix - ox) < 30) { inLy = iy - 22; }
    inLabel.attr('x', ix + 10).attr('y', inLy).text('|ψ⟩');
    outLabel.attr('x', ox + 10).attr('y', outLy).text(currentOp + '|ψ⟩');

    // Check if near eigenstate
    const outLen = Math.sqrt(oa*oa + ob*ob);
    const isEigen = Math.abs(Math.abs(Math.cos(inA - outA)) - 1) < 0.05;
    let eigenNote = '';
    if (isEigen) {
      const scale = (Math.cos(inA - outA) > 0) ? outLen : -outLen;
      eigenNote = `<div class="output-row" style="color:#ffcc80"><span class="output-label">★ Eigenstate!</span><span class="output-value">λ = ${scale > 0 ? '+' : ''}${scale.toFixed(3)}</span></div>`;
    }

    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Input</span><span class="output-value">${a.toFixed(3)}|0⟩ + ${b.toFixed(3)}|1⟩</span></div>
      <div class="output-row"><span class="output-label">${currentOp}|ψ⟩</span><span class="output-value">${oa.toFixed(3)}|0⟩ + ${ob.toFixed(3)}|1⟩</span></div>
      ${eigenNote}`;
  }

  const stop = scrollTriggerAnim(container, (factor, elapsed) => {
    const t = elapsed * 0.001;
    thetaSlider.value = Math.round(314 + 200 * Math.sin(t * 0.18) * factor);
    update();
  }, { duration: 10000 });

  thetaSlider.addEventListener('input', () => { stop(); update(); });
  update();
}


/* ═══════════════════════════════════════════════
   BASIS CHANGE — scroll-trigger
   ═══════════════════════════════════════════════ */
function initBasisChange() {
  const container = document.getElementById('basis-change-viz');
  if (!container) return;
  const w = container.clientWidth, h = 340, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.32;

  const svg = d3.select('#basis-change-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', 'none').attr('stroke', '#141425');

  const basisGroup = svg.append('g');
  const rotBasisGroup = svg.append('g');
  const projLines = svg.append('g');
  const projLinesRot = svg.append('g');
  const stateLine = svg.append('line').attr('stroke', '#ffffff').attr('stroke-width', 1.5);
  const stateDot = svg.append('circle').attr('r', 4).attr('fill', '#ffffff');

  const stateAngle = document.getElementById('basis-state-angle');
  const rotAngle = document.getElementById('basis-rot-angle');
  const stateVal = document.getElementById('basis-state-val');
  const rotVal = document.getElementById('basis-rot-val');
  const outputEl = document.getElementById('basis-change-output');

  function drawAxis(group, angle, color, l1, l2) {
    group.selectAll('*').remove();
    const dx = Math.cos(-angle * Math.PI / 180), dy = Math.sin(-angle * Math.PI / 180);
    group.append('line').attr('x1', cx - R * 1.1 * dx).attr('y1', cy - R * 1.1 * dy)
      .attr('x2', cx + R * 1.1 * dx).attr('y2', cy + R * 1.1 * dy)
      .attr('stroke', color).attr('stroke-width', 1).attr('stroke-dasharray', '5,3');
    group.append('line').attr('x1', cx + R * 1.1 * dy).attr('y1', cy - R * 1.1 * dx)
      .attr('x2', cx - R * 1.1 * dy).attr('y2', cy + R * 1.1 * dx)
      .attr('stroke', color).attr('stroke-width', 1).attr('stroke-dasharray', '5,3');
    group.append('text').attr('x', cx + R * 1.15 * dx).attr('y', cy + R * 1.15 * dy + 4).text(l1).attr('fill', color).attr('font-size', '10px');
    group.append('text').attr('x', cx + R * 1.15 * dy).attr('y', cy - R * 1.15 * dx + 4).text(l2).attr('fill', color).attr('font-size', '10px');
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
    projLines.append('line').attr('x1', sx).attr('y1', sy).attr('x2', cx + R * a0).attr('y2', cy)
      .attr('stroke', '#5c9ce6').attr('stroke-width', 0.6).attr('stroke-dasharray', '3,2');
    projLinesRot.selectAll('*').remove();
    const rdx = Math.cos(rRad), rdy = Math.sin(rRad);
    projLinesRot.append('line').attr('x1', sx).attr('y1', sy)
      .attr('x2', cx + R * c0p * rdx).attr('y2', cy + R * c0p * rdy)
      .attr('stroke', '#66bb6a').attr('stroke-width', 0.6).attr('stroke-dasharray', '3,2');
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Original: c₀, c₁</span><span class="output-value">${a0.toFixed(3)}, ${(-a1).toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Rotated: c₀', c₁'</span><span class="output-value">${c0p.toFixed(3)}, ${c1p.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">|c₀|²+|c₁|²</span><span class="output-value">${(a0*a0+a1*a1).toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">|c₀'|²+|c₁'|²</span><span class="output-value">${(c0p*c0p+c1p*c1p).toFixed(4)}</span></div>`;
  }

  const stop = scrollTriggerAnim(container, (factor, elapsed) => {
    const t = elapsed * 0.001;
    rotAngle.value = Math.round(90 + 80 * Math.sin(t * 0.5) * factor);
    update();
  }, { duration: 5000 });

  stateAngle.addEventListener('input', () => { stop(); update(); });
  rotAngle.addEventListener('input', () => { stop(); update(); });
  update();
}


/* ═══════════════════════════════════════════════
   WAVEFUNCTION — faster animation, keeps going
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

  wfButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      stop();
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
    const N = 300, xMin = -5, xMax = 5, data = [];
    for (let i = 0; i < N; i++) {
      const x = xMin + (xMax - xMin) * i / (N - 1);
      let psi, prob;
      if (currentWf === 'gaussian') { psi = Math.exp(-((x - x0) ** 2) / (2 * sigma * sigma)); prob = psi * psi; }
      else if (currentWf === 'plane-wave') { const k = x0 * 3; const env = Math.exp(-(x * x) / (2 * sigma * sigma)); psi = env * Math.cos(k * x); prob = env * env; }
      else if (currentWf === 'superposition') { const g1 = Math.exp(-((x + 1.5) ** 2) / (2 * sigma * sigma * 0.3)); const g2 = Math.exp(-((x - 1.5) ** 2) / (2 * sigma * sigma * 0.3)); psi = (g1 + g2) / Math.SQRT2; prob = psi * psi; }
      else { const L = sigma * 4; if (Math.abs(x) < L / 2) { const n = Math.max(1, Math.round(Math.abs(x0) * 2 + 1)); psi = Math.cos(n * Math.PI * x / L); prob = psi * psi; } else { psi = 0; prob = 0; } }
      data.push({ x, psi, prob });
    }
    const maxP = d3.max(data, d => d.prob) || 1;
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([40, w - 20]);
    const yScale = d3.scaleLinear().domain([0, maxP * 1.2]).range([h - 30, 20]);
    svg.selectAll('*').remove();
    svg.append('line').attr('x1', 40).attr('y1', h - 30).attr('x2', w - 20).attr('y2', h - 30).attr('stroke', '#151525').attr('stroke-width', 0.5);
    const area = d3.area().x(d => xScale(d.x)).y0(h - 30).y1(d => yScale(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('d', area).attr('fill', 'rgba(92,156,230,0.1)');
    const line = d3.line().x(d => xScale(d.x)).y(d => yScale(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('d', line).attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);
    const yScalePsi = d3.scaleLinear().domain([-1.2, 1.2]).range([h - 30, 20]);
    const psiLine = d3.line().x(d => xScale(d.x)).y(d => yScalePsi(d.psi)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('d', psiLine).attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 0.8).attr('opacity', 0.25);
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Type</span><span class="output-value">${currentWf}</span></div>
      <div class="output-row"><span class="output-label">σ</span><span class="output-value">${sigma.toFixed(2)}</span></div>`;
  }

  // Gentle animation, keeps going
  let lastWfUpdate = 0;
  const stop = scrollTriggerAnim(container, (factor, elapsed) => {
    if (elapsed - lastWfUpdate < 50) return; // throttle to ~20fps
    lastWfUpdate = elapsed;
    const t = elapsed * 0.001;
    paramSlider.value = Math.round(100 + 60 * Math.sin(t * 0.35));
    centerSlider.value = Math.round(100 + 40 * Math.sin(t * 0.45));
    update();
  }, { duration: 10000, keepGoing: true });

  paramSlider.addEventListener('input', () => { stop(); update(); });
  centerSlider.addEventListener('input', () => { stop(); update(); });
  update();
}


/* ═══════════════════════════════════════════════
   FOURIER — faster animation, keeps going
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

  function update() {
    const sigma = sigmaSlider.value / 100;
    const k0 = (k0Slider.value - 100) / 20;
    sigmaVal.textContent = sigma.toFixed(2);
    k0Val.textContent = k0.toFixed(1);
    const sigmaP = 1 / (2 * sigma), N = 200, halfH = h / 2 - 15;
    const xData = [], pData = [];
    for (let i = 0; i < N; i++) {
      const x = -5 + 10 * i / (N - 1);
      xData.push({ x, psi: Math.exp(-(x * x) / (2 * sigma * sigma)) * Math.cos(k0 * x), prob: Math.exp(-(x * x) / (sigma * sigma)) });
    }
    for (let i = 0; i < N; i++) {
      const p = -5 + 10 * i / (N - 1);
      pData.push({ p, prob: Math.exp(-((p - k0) ** 2) * sigma * sigma) });
    }
    svg.selectAll('*').remove();
    svg.append('text').attr('x', 10).attr('y', 15).text('ψ(x) — Position').attr('fill', '#5c9ce6').attr('font-size', '10px').attr('font-family', 'Inter, sans-serif');
    svg.append('text').attr('x', 10).attr('y', halfH + 25).text('ψ̃(p) — Momentum').attr('fill', '#e68cd8').attr('font-size', '10px').attr('font-family', 'Inter, sans-serif');
    const xScale = d3.scaleLinear().domain([-5, 5]).range([40, w - 20]);
    const yScaleX = d3.scaleLinear().domain([0, 1.2]).range([halfH, 20]);
    const yScalePsi = d3.scaleLinear().domain([-1.2, 1.2]).range([halfH, 20]);
    svg.append('line').attr('x1', 40).attr('y1', halfH).attr('x2', w - 20).attr('y2', halfH).attr('stroke', '#151525').attr('stroke-width', 0.5);
    svg.append('line').attr('x1', xScale(-sigma)).attr('y1', 20).attr('x2', xScale(-sigma)).attr('y2', halfH)
      .attr('stroke', '#ff9800').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);
    svg.append('line').attr('x1', xScale(sigma)).attr('y1', 20).attr('x2', xScale(sigma)).attr('y2', halfH)
      .attr('stroke', '#ff9800').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);
    const area = d3.area().x(d => xScale(d.x)).y0(halfH).y1(d => yScaleX(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(xData).attr('d', area).attr('fill', 'rgba(92,156,230,0.08)');
    const psiLine = d3.line().x(d => xScale(d.x)).y(d => yScalePsi(d.psi)).curve(d3.curveMonotoneX);
    svg.append('path').datum(xData).attr('d', psiLine).attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);
    const pScale = d3.scaleLinear().domain([-5, 5]).range([40, w - 20]);
    const yScaleP = d3.scaleLinear().domain([0, 1.2]).range([h - 10, halfH + 30]);
    svg.append('line').attr('x1', 40).attr('y1', h - 10).attr('x2', w - 20).attr('y2', h - 10).attr('stroke', '#151525').attr('stroke-width', 0.5);
    svg.append('line').attr('x1', pScale(k0 - sigmaP)).attr('y1', halfH + 30).attr('x2', pScale(k0 - sigmaP)).attr('y2', h - 10)
      .attr('stroke', '#ff9800').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);
    svg.append('line').attr('x1', pScale(k0 + sigmaP)).attr('y1', halfH + 30).attr('x2', pScale(k0 + sigmaP)).attr('y2', h - 10)
      .attr('stroke', '#ff9800').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);
    const pArea = d3.area().x(d => pScale(d.p)).y0(h - 10).y1(d => yScaleP(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(pData).attr('d', pArea).attr('fill', 'rgba(230,140,216,0.08)');
    const pLine = d3.line().x(d => pScale(d.p)).y(d => yScaleP(d.prob)).curve(d3.curveMonotoneX);
    svg.append('path').datum(pData).attr('d', pLine).attr('fill', 'none').attr('stroke', '#e68cd8').attr('stroke-width', 1.5);
    const product = sigma * sigmaP;
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">σ_x</span><span class="output-value">${sigma.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">σ_p</span><span class="output-value">${sigmaP.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">σ_x · σ_p</span><span class="output-value">${product.toFixed(3)} ≥ ℏ/2 ✓</span></div>
      <div class="output-row"><span class="output-label">k₀</span><span class="output-value">${k0.toFixed(2)}</span></div>`;
  }

  // Gentle animation, keeps going
  let lastFourierUpdate = 0;
  const stop = scrollTriggerAnim(container, (factor, elapsed) => {
    if (elapsed - lastFourierUpdate < 50) return; // throttle to ~20fps
    lastFourierUpdate = elapsed;
    const t = elapsed * 0.001;
    sigmaSlider.value = Math.round(100 + 80 * Math.sin(t * 0.3));
    update();
  }, { duration: 12000, keepGoing: true });

  sigmaSlider.addEventListener('input', () => { stop(); update(); });
  k0Slider.addEventListener('input', () => { stop(); update(); });
  update();
}


/* ═══════════════════════════════════════════════
   UNCERTAINTY — faster, keeps going
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

  function update() {
    const dx = dxSlider.value / 100;
    dxVal.textContent = dx.toFixed(2);
    const dp = 0.5 / dx;
    const N = 200, halfW = w / 2 - 10;
    const xData = [], pData = [];
    for (let i = 0; i < N; i++) {
      const x = -4 + 8 * i / (N - 1);
      xData.push({ x, y: Math.exp(-(x * x) / (2 * dx * dx)) });
    }
    for (let i = 0; i < N; i++) {
      const p = -4 + 8 * i / (N - 1);
      pData.push({ p, y: Math.exp(-(p * p) / (2 * dp * dp)) });
    }
    svg.selectAll('*').remove();
    svg.append('text').attr('x', 10).attr('y', 15).text('|ψ(x)|²').attr('fill', '#5c9ce6').attr('font-size', '10px').attr('font-family', 'Inter, sans-serif');
    svg.append('text').attr('x', halfW + 20).attr('y', 15).text('|ψ̃(p)|²').attr('fill', '#e68cd8').attr('font-size', '10px').attr('font-family', 'Inter, sans-serif');
    const xScale = d3.scaleLinear().domain([-4, 4]).range([10, halfW]);
    const yScale = d3.scaleLinear().domain([0, 1.2]).range([h - 20, 25]);
    svg.append('line').attr('x1', 10).attr('y1', h - 20).attr('x2', halfW).attr('y2', h - 20).attr('stroke', '#151525').attr('stroke-width', 0.5);
    svg.append('line').attr('x1', xScale(-dx)).attr('y1', 25).attr('x2', xScale(-dx)).attr('y2', h - 20)
      .attr('stroke', '#ff9800').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);
    svg.append('line').attr('x1', xScale(dx)).attr('y1', 25).attr('x2', xScale(dx)).attr('y2', h - 20)
      .attr('stroke', '#ff9800').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);
    const xArea = d3.area().x(d => xScale(d.x)).y0(h - 20).y1(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append('path').datum(xData).attr('d', xArea).attr('fill', 'rgba(92,156,230,0.1)');
    const xLine = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append('path').datum(xData).attr('d', xLine).attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);
    const pScale = d3.scaleLinear().domain([-4, 4]).range([halfW + 20, w - 10]);
    svg.append('line').attr('x1', halfW + 20).attr('y1', h - 20).attr('x2', w - 10).attr('y2', h - 20).attr('stroke', '#151525').attr('stroke-width', 0.5);
    svg.append('line').attr('x1', pScale(-dp)).attr('y1', 25).attr('x2', pScale(-dp)).attr('y2', h - 20)
      .attr('stroke', '#ff9800').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);
    svg.append('line').attr('x1', pScale(dp)).attr('y1', 25).attr('x2', pScale(dp)).attr('y2', h - 20)
      .attr('stroke', '#ff9800').attr('stroke-width', 0.8).attr('stroke-dasharray', '3,3').attr('opacity', 0.4);
    const pArea = d3.area().x(d => pScale(d.p)).y0(h - 20).y1(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append('path').datum(pData).attr('d', pArea).attr('fill', 'rgba(230,140,216,0.1)');
    const pLine = d3.line().x(d => pScale(d.p)).y(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append('path').datum(pData).attr('d', pLine).attr('fill', 'none').attr('stroke', '#e68cd8').attr('stroke-width', 1.5);
    const product = dx * dp;
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Δx</span><span class="output-value">${dx.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Δp</span><span class="output-value">${dp.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Δx · Δp</span><span class="output-value">${product.toFixed(3)} = ℏ/2 ✓</span></div>`;
  }

  let lastUncertUpdate = 0;
  const stop = scrollTriggerAnim(container, (factor, elapsed) => {
    if (elapsed - lastUncertUpdate < 50) return;
    lastUncertUpdate = elapsed;
    const t = elapsed * 0.001;
    dxSlider.value = Math.round(150 + 120 * Math.sin(t * 0.35));
    update();
  }, { duration: 10000, keepGoing: true });

  dxSlider.addEventListener('input', () => { stop(); update(); });
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
