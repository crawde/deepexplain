/* Spherical Harmonics & Legendre Functions — DeepExplain Visualizations */
/* Three.js 3D + D3 2D interactive plots */

(function () {
  'use strict';

  // ── Math helpers ──
  function factorial(n) {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  // Legendre polynomial P_l(x)
  function legendreP(l, x) {
    if (l === 0) return 1;
    if (l === 1) return x;
    let prev2 = 1, prev1 = x;
    for (let k = 2; k <= l; k++) {
      const curr = ((2 * k - 1) * x * prev1 - (k - 1) * prev2) / k;
      prev2 = prev1;
      prev1 = curr;
    }
    return prev1;
  }

  // Associated Legendre function P_l^m(x) (m >= 0)
  function assocLegendre(l, m, x) {
    if (m > l) return 0;
    if (m === 0) return legendreP(l, x);
    // Start with P_m^m
    let pmm = 1;
    const somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
    if (l === m) return pmm;
    // P_{m+1}^m
    let pmm1 = x * (2 * m + 1) * pmm;
    if (l === m + 1) return pmm1;
    // Recurrence
    let pll = 0;
    for (let ll = m + 2; ll <= l; ll++) {
      pll = (x * (2 * ll - 1) * pmm1 - (ll + m - 1) * pmm) / (ll - m);
      pmm = pmm1;
      pmm1 = pll;
    }
    return pll;
  }

  // Real spherical harmonic Y_l^m (real form)
  function realSphericalHarmonic(l, m, theta, phi) {
    const absM = Math.abs(m);
    const norm = Math.sqrt(
      ((2 * l + 1) / (4 * Math.PI)) *
      (factorial(l - absM) / factorial(l + absM))
    );
    const plm = assocLegendre(l, absM, Math.cos(theta));
    if (m > 0) return Math.SQRT2 * norm * plm * Math.cos(m * phi);
    if (m < 0) return Math.SQRT2 * norm * plm * Math.sin(absM * phi);
    return norm * plm;
  }

  // ── Color palette ──
  const BLUE = { r: 0.36, g: 0.61, b: 0.9 };   // #5c9ce6
  const PINK = { r: 0.9, g: 0.55, b: 0.85 };    // #e68cd8
  const AXIS_COLOR = 0x222244;
  const BG_COLOR = 0x05050b;

  // ── 1. HERO 3D SCENE ──
  (function initHero() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const container = document.getElementById('sh-hero');
    const readout = document.getElementById('hero-readout');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(2.5, 1.8, 2.5);
    camera.lookAt(0, 0, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0x334466, 0.6));
    const dirLight = new THREE.DirectionalLight(0x5c9ce6, 0.8);
    dirLight.position.set(3, 4, 2);
    scene.add(dirLight);
    const pinkLight = new THREE.PointLight(0xe68cd8, 0.4, 10);
    pinkLight.position.set(-2, -1, 3);
    scene.add(pinkLight);

    let currentMesh = null;
    let heroL = 2, heroM = 1;

    function buildSHMesh(l, m) {
      const res = 80;
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];

      for (let i = 0; i <= res; i++) {
        const theta = (i / res) * Math.PI;
        for (let j = 0; j <= res; j++) {
          const phi = (j / res) * 2 * Math.PI;
          const val = realSphericalHarmonic(l, m, theta, phi);
          const r = Math.abs(val) * 1.5;
          const x = r * Math.sin(theta) * Math.cos(phi);
          const y = r * Math.cos(theta);
          const z = r * Math.sin(theta) * Math.sin(phi);
          positions.push(x, y, z);

          const c = val >= 0 ? BLUE : PINK;
          const intensity = 0.4 + 0.6 * Math.min(Math.abs(val) * 3, 1);
          colors.push(c.r * intensity, c.g * intensity, c.b * intensity);
        }
      }

      const indices = [];
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          const a = i * (res + 1) + j;
          const b = a + res + 1;
          indices.push(a, b, a + 1);
          indices.push(b, b + 1, a + 1);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 40,
        transparent: true,
        opacity: 0.92,
      });

      return new THREE.Mesh(geom, mat);
    }

    function setHeroHarmonic(l, m) {
      if (currentMesh) scene.remove(currentMesh);
      currentMesh = buildSHMesh(l, m);
      scene.add(currentMesh);
      heroL = l;
      heroM = m;
      const sub = ['₀','₁','₂','₃','₄'][l] || l;
      const sup = m < 0 ? '⁻' + ['⁰','¹','²','³','⁴'][Math.abs(m)] :
                  ['⁰','¹','²','³','⁴'][m] || m;
      readout.textContent = 'Y' + sub + sup;
    }

    setHeroHarmonic(2, 1);

    // Mouse drag rotation
    let isDragging = false, prevX = 0, prevY = 0;
    let rotX = 0.3, rotY = 0;

    canvas.addEventListener('pointerdown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('pointerup', () => { isDragging = false; });
    window.addEventListener('pointermove', e => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      prevX = e.clientX;
      prevY = e.clientY;
    });

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    function animate() {
      requestAnimationFrame(animate);
      time += 0.003;
      if (currentMesh) {
        if (!isDragging) {
          rotY += 0.002;
        }
        currentMesh.rotation.x = rotX;
        currentMesh.rotation.y = rotY;
      }
      renderer.render(scene, camera);
    }
    animate();

    // Cycle through harmonics on hero click
    const heroSequence = [[0,0],[1,0],[1,1],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2]];
    let heroIdx = 4; // start at Y_2^1
    canvas.addEventListener('dblclick', () => {
      heroIdx = (heroIdx + 1) % heroSequence.length;
      setHeroHarmonic(heroSequence[heroIdx][0], heroSequence[heroIdx][1]);
    });
  })();


  // ── 2. LEGENDRE POLYNOMIALS PLOT (D3) ──
  (function initLegendre() {
    const container = document.getElementById('legendre-viz');
    const readoutEl = document.getElementById('legendre-readout');
    if (!container) return;

    const COLORS = ['#5c9ce6', '#e68cd8', '#66bb6a', '#f0a050', '#aa77dd', '#66ddbb'];
    const LABELS = ['P₀(x) = 1', 'P₁(x) = x', 'P₂(x) = ½(3x²−1)', 'P₃(x) = ½(5x³−3x)',
                    'P₄(x) = ⅛(35x⁴−30x²+3)', 'P₅(x) = ⅛(63x⁵−70x³+15x)'];

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', container.clientWidth)
      .attr('height', container.clientHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([-1, 1]).range([0, width]);
    const yScale = d3.scaleLinear().domain([-1.2, 1.2]).range([height, 0]);

    // Grid
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-height))
      .call(g => g.selectAll('line').attr('stroke', '#111120'))
      .call(g => g.selectAll('text').attr('fill', '#334').attr('font-size', '10px').attr('font-family', 'JetBrains Mono'))
      .call(g => g.select('.domain').attr('stroke', '#1a1a30'));

    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-width))
      .call(g => g.selectAll('line').attr('stroke', '#111120'))
      .call(g => g.selectAll('text').attr('fill', '#334').attr('font-size', '10px').attr('font-family', 'JetBrains Mono'))
      .call(g => g.select('.domain').attr('stroke', '#1a1a30'));

    // Zero line
    svg.append('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', '#222240').attr('stroke-width', 1);

    const N = 200;
    const xs = d3.range(-1, 1 + 2/N, 2/N);

    const line = d3.line()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .curve(d3.curveBasis);

    const paths = [];
    for (let l = 0; l <= 5; l++) {
      const data = xs.map(x => [x, legendreP(l, x)]);
      const path = svg.append('path')
        .datum(data)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', COLORS[l])
        .attr('stroke-width', 2)
        .attr('opacity', l === 0 ? 1 : 0);
      paths.push(path);
    }

    function showLegendre(selected) {
      paths.forEach((p, i) => {
        if (selected === 'all' || parseInt(selected) === i) {
          p.transition().duration(400).attr('opacity', 1);
        } else {
          p.transition().duration(400).attr('opacity', 0);
        }
      });

      if (selected === 'all') {
        readoutEl.innerHTML = LABELS.map((lb, i) =>
          `<div class="output-row"><span class="output-label" style="color:${COLORS[i]}">${lb}</span></div>`
        ).join('');
      } else {
        const i = parseInt(selected);
        readoutEl.innerHTML = `<div class="output-row"><span class="output-label" style="color:${COLORS[i]}">${LABELS[i]}</span><span class="output-value">${i} nodes in (-1,1)</span></div>`;
      }
    }

    // Button handlers
    document.querySelectorAll('#legendre-btns .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#legendre-btns .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showLegendre(btn.dataset.l);
      });
    });

    showLegendre('0');
  })();


  // ── 3. ASSOCIATED LEGENDRE FUNCTIONS PLOT ──
  (function initAssocLegendre() {
    const container = document.getElementById('assoc-legendre-viz');
    const readoutEl = document.getElementById('assoc-legendre-readout');
    if (!container) return;

    const lSlider = document.getElementById('assoc-l-slider');
    const mSlider = document.getElementById('assoc-m-slider');
    const lVal = document.getElementById('assoc-l-val');
    const mVal = document.getElementById('assoc-m-val');

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', container.clientWidth)
      .attr('height', container.clientHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, Math.PI]).range([0, width]);
    const yScale = d3.scaleLinear().domain([-4, 4]).range([height, 0]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickValues([0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI])
        .tickFormat(d => ['0', 'π/4', 'π/2', '3π/4', 'π'][Math.round(d/(Math.PI/4))]))
      .call(g => g.selectAll('line').attr('stroke', '#111120'))
      .call(g => g.selectAll('text').attr('fill', '#334').attr('font-size', '10px').attr('font-family', 'JetBrains Mono'))
      .call(g => g.select('.domain').attr('stroke', '#1a1a30'));

    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .call(g => g.selectAll('line').attr('stroke', '#111120'))
      .call(g => g.selectAll('text').attr('fill', '#334').attr('font-size', '10px').attr('font-family', 'JetBrains Mono'))
      .call(g => g.select('.domain').attr('stroke', '#1a1a30'));

    svg.append('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', '#222240').attr('stroke-width', 1);

    // Axis label
    svg.append('text')
      .attr('x', width / 2).attr('y', height + 35)
      .attr('fill', '#445')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('θ');

    const N = 200;
    const line = d3.line().x(d => xScale(d[0])).y(d => yScale(d[1])).curve(d3.curveBasis);
    const curvePath = svg.append('path')
      .attr('fill', 'none')
      .attr('stroke', '#5c9ce6')
      .attr('stroke-width', 2);

    function update() {
      const l = parseInt(lSlider.value);
      let m = parseInt(mSlider.value);
      if (m > l) { m = l; mSlider.value = m; }
      mSlider.max = l;
      lVal.textContent = l;
      mVal.textContent = m;

      const thetas = d3.range(0.001, Math.PI, Math.PI / N);
      const data = thetas.map(theta => [theta, assocLegendre(l, m, Math.cos(theta))]);

      // Auto-scale Y
      const ymax = Math.max(1, d3.max(data, d => Math.abs(d[1])) * 1.2);
      yScale.domain([-ymax, ymax]);

      svg.select('g:nth-child(2)').remove();
      svg.insert('g', ':first-child')
        .call(d3.axisLeft(yScale).ticks(5))
        .call(g => g.selectAll('line').attr('stroke', '#111120'))
        .call(g => g.selectAll('text').attr('fill', '#334').attr('font-size', '10px').attr('font-family', 'JetBrains Mono'))
        .call(g => g.select('.domain').attr('stroke', '#1a1a30'));

      svg.select('line').attr('y1', yScale(0)).attr('y2', yScale(0));

      curvePath.datum(data).transition().duration(300).attr('d', line);

      const sub = ['₀','₁','₂','₃','₄','₅'][l];
      const sup = ['⁰','¹','²','³','⁴','⁵'][m];
      readoutEl.innerHTML = `<div class="output-row"><span class="output-label">P${sub}${sup}(cos θ)</span><span class="output-value">l = ${l}, m = ${m}</span></div>`;
    }

    lSlider.addEventListener('input', update);
    mSlider.addEventListener('input', update);
    update();
  })();


  // ── 4. MAIN SPHERICAL HARMONIC 3D EXPLORER ──
  (function initSHExplorer() {
    const vizContainer = document.getElementById('sh-3d-viz');
    const canvas = document.getElementById('sh-canvas');
    if (!canvas) return;

    const lSlider = document.getElementById('sh-l-slider');
    const mSlider = document.getElementById('sh-m-slider');
    const lVal = document.getElementById('sh-l-val');
    const mVal = document.getElementById('sh-m-val');
    const stateDisplay = document.getElementById('sh-state-display');
    const readoutEl = document.getElementById('sh-readout');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060610, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(2.8, 2, 2.8);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x445566, 0.5));
    const dl = new THREE.DirectionalLight(0x88bbee, 0.7);
    dl.position.set(3, 4, 2);
    scene.add(dl);
    const pl = new THREE.PointLight(0xe68cd8, 0.3, 10);
    pl.position.set(-2, -1, 3);
    scene.add(pl);

    // Axes
    const axLen = 1.8;
    const axMat = new THREE.LineBasicMaterial({ color: AXIS_COLOR });
    [[[0,0,0],[axLen,0,0]],[[0,0,0],[0,axLen,0]],[[0,0,0],[0,0,axLen]]].forEach(pts => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
      scene.add(new THREE.Line(g, axMat));
    });

    let currentMesh = null;

    function buildMesh(l, m) {
      const res = 72;
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];

      for (let i = 0; i <= res; i++) {
        const theta = (i / res) * Math.PI;
        for (let j = 0; j <= res; j++) {
          const phi = (j / res) * 2 * Math.PI;
          const val = realSphericalHarmonic(l, m, theta, phi);
          const r = Math.abs(val) * 1.8;
          positions.push(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi)
          );
          const c = val >= 0 ? BLUE : PINK;
          const intensity = 0.35 + 0.65 * Math.min(Math.abs(val) * 3, 1);
          colors.push(c.r * intensity, c.g * intensity, c.b * intensity);
        }
      }

      const indices = [];
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          const a = i * (res + 1) + j;
          const b = a + res + 1;
          indices.push(a, b, a + 1);
          indices.push(b, b + 1, a + 1);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      return new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
        vertexColors: true, side: THREE.DoubleSide, shininess: 30,
        transparent: true, opacity: 0.9,
      }));
    }

    function updateSH() {
      const l = parseInt(lSlider.value);
      let m = parseInt(mSlider.value);
      if (m > l) m = l;
      if (m < -l) m = -l;
      mSlider.min = -l;
      mSlider.max = l;
      mSlider.value = m;
      lVal.textContent = l;
      mVal.textContent = m;

      if (currentMesh) scene.remove(currentMesh);
      currentMesh = buildMesh(l, m);
      scene.add(currentMesh);

      const sub = ['₀','₁','₂','₃','₄'][l] || l;
      const mAbs = Math.abs(m);
      const sup = (m < 0 ? '⁻' : '') + (['⁰','¹','²','³','⁴'][mAbs] || mAbs);
      stateDisplay.textContent = `Y${sub}${sup}(θ, φ)`;

      const names = { '00':'s', '10':'pz', '11':'px', '1-1':'py',
        '20':'dz²', '21':'dxz', '2-1':'dyz', '22':'dx²-y²', '2-2':'dxy' };
      const orbital = names[`${l}${m}`] || '';
      readoutEl.innerHTML = `<div class="output-row"><span class="output-label">Degree l = ${l}, Order m = ${m}</span><span class="output-value">${orbital ? orbital + ' orbital' : ''}</span></div>
<div class="output-row"><span class="output-label">Number of harmonics at l = ${l}</span><span class="output-value">${2*l+1}</span></div>`;
    }

    lSlider.addEventListener('input', updateSH);
    mSlider.addEventListener('input', updateSH);
    updateSH();

    // Mouse drag
    let isDragging = false, prevX = 0, prevY = 0, rotX = 0.3, rotY = 0;
    canvas.addEventListener('pointerdown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('pointerup', () => { isDragging = false; });
    window.addEventListener('pointermove', e => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      prevX = e.clientX; prevY = e.clientY;
    });

    function resize() {
      const w = vizContainer.clientWidth;
      const h = vizContainer.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    function animate() {
      requestAnimationFrame(animate);
      if (currentMesh) {
        if (!isDragging) rotY += 0.0015;
        currentMesh.rotation.x = rotX;
        currentMesh.rotation.y = rotY;
      }
      renderer.render(scene, camera);
    }
    animate();
  })();


  // ── 5. GALLERY SCENE (l=0,1,2 side by side) ──
  (function initGallery() {
    const canvas = document.getElementById('gallery-canvas');
    if (!canvas) return;
    const container = document.getElementById('gallery-scene');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060610, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 2, 0.1, 100);
    camera.position.set(0, 2.5, 6);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x445566, 0.5));
    const dl = new THREE.DirectionalLight(0x88bbee, 0.7);
    dl.position.set(3, 4, 2);
    scene.add(dl);
    scene.add(new THREE.PointLight(0xe68cd8, 0.3, 15).position.set(-3, -1, 3) || scene.children[scene.children.length-1]);
    const pinkL = new THREE.PointLight(0xe68cd8, 0.3, 15);
    pinkL.position.set(-3, -1, 3);
    scene.add(pinkL);

    const harmonics = [[0,0], [1,0], [2,0]];
    const spacing = 2.8;
    const meshes = [];

    harmonics.forEach(([l, m], idx) => {
      const res = 56;
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];

      for (let i = 0; i <= res; i++) {
        const theta = (i / res) * Math.PI;
        for (let j = 0; j <= res; j++) {
          const phi = (j / res) * 2 * Math.PI;
          const val = realSphericalHarmonic(l, m, theta, phi);
          const r = Math.abs(val) * 1.2;
          positions.push(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi)
          );
          const c = val >= 0 ? BLUE : PINK;
          const intensity = 0.35 + 0.65 * Math.min(Math.abs(val) * 3, 1);
          colors.push(c.r * intensity, c.g * intensity, c.b * intensity);
        }
      }

      const indices = [];
      for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
          const a = i * (res + 1) + j;
          const b = a + res + 1;
          indices.push(a, b, a + 1);
          indices.push(b, b + 1, a + 1);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
        vertexColors: true, side: THREE.DoubleSide, shininess: 30,
        transparent: true, opacity: 0.9,
      }));

      mesh.position.x = (idx - 1) * spacing;
      scene.add(mesh);
      meshes.push(mesh);
    });

    // Mouse drag
    let isDragging = false, px = 0, py = 0, ry = 0, rx = 0.3;
    canvas.addEventListener('pointerdown', e => { isDragging = true; px = e.clientX; py = e.clientY; });
    window.addEventListener('pointerup', () => { isDragging = false; });
    window.addEventListener('pointermove', e => {
      if (!isDragging) return;
      ry += (e.clientX - px) * 0.005;
      rx += (e.clientY - py) * 0.005;
      rx = Math.max(-1, Math.min(1, rx));
      px = e.clientX; py = e.clientY;
    });

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    function animate() {
      requestAnimationFrame(animate);
      if (!isDragging) ry += 0.002;
      meshes.forEach(m => { m.rotation.x = rx; m.rotation.y = ry; });
      renderer.render(scene, camera);
    }
    animate();
  })();


  // ── 6. POLAR PLOT OF P_l^m IN SPHERICAL COORDS ──
  (function initPolar() {
    const container = document.getElementById('polar-viz');
    if (!container) return;
    const readoutEl = document.getElementById('polar-readout');

    const lSlider = document.getElementById('polar-l-slider');
    const mSlider = document.getElementById('polar-m-slider');
    const lVal = document.getElementById('polar-l-val');
    const mVal = document.getElementById('polar-m-val');

    const w = container.clientWidth;
    const h = container.clientHeight;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(cx, cy) - 30;

    const svg = d3.select(container).append('svg')
      .attr('width', w).attr('height', h);

    // Background circles
    for (let i = 1; i <= 4; i++) {
      svg.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', maxR * i / 4)
        .attr('fill', 'none')
        .attr('stroke', '#111120')
        .attr('stroke-width', 0.5);
    }

    // Axis lines
    svg.append('line').attr('x1', cx - maxR).attr('y1', cy).attr('x2', cx + maxR).attr('y2', cy).attr('stroke', '#181830');
    svg.append('line').attr('x1', cx).attr('y1', cy - maxR).attr('x2', cx).attr('y2', cy + maxR).attr('stroke', '#181830');

    // Labels
    svg.append('text').attr('x', cx).attr('y', cy - maxR - 8).attr('text-anchor', 'middle')
      .attr('fill', '#445').attr('font-size', '10px').attr('font-family', 'JetBrains Mono, monospace').text('θ=0 (z)');
    svg.append('text').attr('x', cx + maxR + 8).attr('y', cy + 4).attr('text-anchor', 'start')
      .attr('fill', '#445').attr('font-size', '10px').attr('font-family', 'JetBrains Mono, monospace').text('θ=π/2');
    svg.append('text').attr('x', cx).attr('y', cy + maxR + 18).attr('text-anchor', 'middle')
      .attr('fill', '#445').attr('font-size', '10px').attr('font-family', 'JetBrains Mono, monospace').text('θ=π (-z)');

    const posPath = svg.append('path').attr('fill', 'rgba(92,156,230,0.15)').attr('stroke', '#5c9ce6').attr('stroke-width', 1.5);
    const negPath = svg.append('path').attr('fill', 'rgba(230,140,216,0.15)').attr('stroke', '#e68cd8').attr('stroke-width', 1.5);

    function update() {
      const l = parseInt(lSlider.value);
      let m = parseInt(mSlider.value);
      if (m > l) { m = l; mSlider.value = m; }
      mSlider.max = l;
      lVal.textContent = l;
      mVal.textContent = m;

      const N = 300;
      let maxVal = 0;
      const vals = [];
      for (let i = 0; i <= N; i++) {
        const theta = (i / N) * Math.PI;
        const val = assocLegendre(l, m, Math.cos(theta));
        vals.push({ theta, val });
        if (Math.abs(val) > maxVal) maxVal = Math.abs(val);
      }
      if (maxVal === 0) maxVal = 1;

      const scale = maxR / maxVal;

      // Positive lobe
      let posPoints = 'M';
      let negPoints = 'M';
      let posFirst = true, negFirst = true;

      // Full curve: θ goes from 0 to π, we mirror for full circle (left side = same θ, mirrored x)
      // Plot in polar: angle = θ measured from top (z), radius = |P_l^m|
      // Positive values on right, negative on left, mapped symmetrically

      // Right half (θ: 0 → π going clockwise from top)
      const rightPos = [];
      const rightNeg = [];
      const leftPos = [];
      const leftNeg = [];

      vals.forEach(({ theta, val }) => {
        const r = Math.abs(val) * scale;
        // In our polar plot, θ=0 is UP, θ=π is DOWN
        // Right side: x = r*sin(θ), y = -r*cos(θ) (mapped to screen)
        const sx = cx + r * Math.sin(theta);
        const sy = cy - r * Math.cos(theta);
        const lx = cx - r * Math.sin(theta);
        const ly = cy - r * Math.cos(theta);

        if (val >= 0) {
          rightPos.push([sx, sy]);
          leftPos.push([lx, ly]);
        } else {
          rightNeg.push([sx, sy]);
          leftNeg.push([lx, ly]);
        }
      });

      // Build positive path (right + left mirrored)
      const allPos = rightPos.concat(leftPos.reverse());
      const allNeg = rightNeg.concat(leftNeg.reverse());

      if (allPos.length > 2) {
        posPath.attr('d', 'M' + allPos.map(p => p.join(',')).join('L') + 'Z');
      } else {
        posPath.attr('d', '');
      }

      if (allNeg.length > 2) {
        negPath.attr('d', 'M' + allNeg.map(p => p.join(',')).join('L') + 'Z');
      } else {
        negPath.attr('d', '');
      }

      const sub = ['₀','₁','₂','₃','₄','₅'][l];
      const sup = ['⁰','¹','²','³','⁴','⁵'][m];
      const type = m === 0 ? 'Zonal' : m === l ? 'Sectoral' : 'Tesseral';
      readoutEl.innerHTML = `<div class="output-row"><span class="output-label">P${sub}${sup}(cos θ) — ${type} harmonic</span><span class="output-value">Nodes: ${l - m}</span></div>`;
    }

    lSlider.addEventListener('input', update);
    mSlider.addEventListener('input', update);
    update();
  })();


  // ── 7. EXERCISES ──
  window.checkExercise = function (n) {
    const input = document.getElementById(`ex${n}-input`);
    const fb = document.getElementById(`ex${n}-fb`);
    const ans = input.value.trim().toLowerCase().replace(/\s+/g, '');

    const checks = {
      1: a => a === '2l+1' || a === '2*l+1' || a === '(2l+1)',
      2: a => a.includes('pz') || a.includes('p_z') || (a.includes('p') && a.includes('z')),
      3: a => a.includes('1/(2sqrt(pi))') || a.includes('1/2sqrt(pi)') || a.includes('1/(2√π)') || a === '0.282',
      4: a => a === '3',
    };

    if (checks[n](ans)) {
      fb.textContent = 'Correct.';
      fb.className = 'feedback correct';
    } else {
      const hints = {
        1: 'Think about the range of m for a given l.',
        2: 'This is the p orbital aligned along which axis?',
        3: 'Plug l=0, m=0 into the normalization formula.',
        4: 'P₃ has degree 3, so how many roots in (0,π)?',
      };
      fb.textContent = hints[n];
      fb.className = 'feedback wrong';
    }
  };

})();
