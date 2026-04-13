/* Spherical Harmonics & Legendre Functions — DeepExplain Visualizations v2 */
/* Three.js 3D + D3 2D interactive plots — Enhanced with wireframes, reference spheres, morph animations */

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
    let pmm = 1;
    const somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
    if (l === m) return pmm;
    let pmm1 = x * (2 * m + 1) * pmm;
    if (l === m + 1) return pmm1;
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

  // ── Shared helpers for enhanced visuals ──
  function addReferenceGeometry(scene) {
    // Transparent reference sphere
    const refSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x5c9ce6, transparent: true, opacity: 0.4 })
    );
    scene.add(refSphere);

    // Ground grid ring
    const ringGeo = new THREE.RingGeometry(0.3, 2.2, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x111130, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.01;
    scene.add(ring);

    // Concentric reference circles
    [0.5, 1.0, 1.5].forEach(function(r) {
      var circGeo = new THREE.BufferGeometry();
      var pts = [];
      for (var i = 0; i <= 64; i++) {
        var a = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)));
      }
      circGeo.setFromPoints(pts);
      scene.add(new THREE.Line(circGeo, new THREE.LineBasicMaterial({ color: 0x151530, transparent: true, opacity: 0.3 })));
    });
  }

  function addAxisLabels(scene) {
    // 3D axis labels using sprites
    var labels = [
      { text: 'x', pos: [2.0, 0, 0], color: '#5c9ce6' },
      { text: 'z', pos: [0, 2.0, 0], color: '#66bb6a' },
      { text: 'y', pos: [0, 0, 2.0], color: '#e68cd8' }
    ];
    labels.forEach(function(lb) {
      var canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      var ctx = canvas.getContext('2d');
      ctx.font = 'bold 40px JetBrains Mono, monospace';
      ctx.fillStyle = lb.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lb.text, 32, 32);
      var tex = new THREE.CanvasTexture(canvas);
      var spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.6 });
      var sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(lb.pos[0], lb.pos[1], lb.pos[2]);
      sprite.scale.set(0.25, 0.25, 1);
      scene.add(sprite);
    });
  }

  function addEnhancedAxes(scene) {
    var axLen = 1.8;
    // Gradient axes with tapered opacity
    var axisData = [
      { dir: [1, 0, 0], color: 0x3366aa },
      { dir: [0, 1, 0], color: 0x44aa66 },
      { dir: [0, 0, 1], color: 0xaa4488 }
    ];
    axisData.forEach(function(ax) {
      var g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(ax.dir[0] * axLen, ax.dir[1] * axLen, ax.dir[2] * axLen)
      ]);
      scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: ax.color, transparent: true, opacity: 0.35 })));
    });
  }

  function addWireframeOverlay(mesh) {
    var wireGeo = mesh.geometry.clone();
    var wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.04
    });
    var wire = new THREE.Mesh(wireGeo, wireMat);
    mesh.add(wire);
    return wire;
  }

  // Enhanced mesh builder with smoother colors and higher resolution
  function buildEnhancedSHMesh(l, m, scale, res) {
    res = res || 96;
    scale = scale || 1.5;
    var geom = new THREE.BufferGeometry();
    var positions = [];
    var colors = [];

    for (var i = 0; i <= res; i++) {
      var theta = (i / res) * Math.PI;
      for (var j = 0; j <= res; j++) {
        var phi = (j / res) * 2 * Math.PI;
        var val = realSphericalHarmonic(l, m, theta, phi);
        var r = Math.abs(val) * scale;
        positions.push(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi)
        );

        // Enhanced color: smooth gradient with brightness variation
        var t = Math.min(Math.abs(val) * 2.5, 1);
        if (val >= 0) {
          // Blue gradient: dim deep blue → bright cyan-blue
          colors.push(
            0.15 + 0.30 * t,
            0.35 + 0.35 * t,
            0.65 + 0.30 * t
          );
        } else {
          // Pink gradient: dim magenta → bright rose-pink
          colors.push(
            0.65 + 0.30 * t,
            0.25 + 0.35 * t,
            0.55 + 0.35 * t
          );
        }
      }
    }

    var indices = [];
    for (var i2 = 0; i2 < res; i2++) {
      for (var j2 = 0; j2 < res; j2++) {
        var a = i2 * (res + 1) + j2;
        var b = a + res + 1;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    var mat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 60,
      specular: 0x334466,
      transparent: true,
      opacity: 0.88,
    });

    var mesh = new THREE.Mesh(geom, mat);
    addWireframeOverlay(mesh);
    return mesh;
  }

  // Enhanced Legendre surface builder
  function buildEnhancedLegendreMesh(l, scale, res) {
    res = res || 80;
    scale = scale || 1.5;
    var geom = new THREE.BufferGeometry();
    var positions = [];
    var colors = [];

    for (var i = 0; i <= res; i++) {
      var theta = (i / res) * Math.PI;
      for (var j = 0; j <= res; j++) {
        var phi = (j / res) * 2 * Math.PI;
        var val = legendreP(l, Math.cos(theta));
        var r = Math.abs(val) * scale;
        positions.push(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi)
        );
        var t = Math.min(Math.abs(val) * 2.5, 1);
        if (val >= 0) {
          colors.push(0.15 + 0.30 * t, 0.35 + 0.35 * t, 0.65 + 0.30 * t);
        } else {
          colors.push(0.65 + 0.30 * t, 0.25 + 0.35 * t, 0.55 + 0.35 * t);
        }
      }
    }

    var indices = [];
    for (var i2 = 0; i2 < res; i2++) {
      for (var j2 = 0; j2 < res; j2++) {
        var a = i2 * (res + 1) + j2;
        var b = a + res + 1;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    var mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
      vertexColors: true, side: THREE.DoubleSide, shininess: 60,
      specular: 0x334466, transparent: true, opacity: 0.88,
    }));
    addWireframeOverlay(mesh);
    return mesh;
  }

  // Enhanced associated Legendre surface builder
  function buildEnhancedAssocMesh(l, m, scale, res) {
    res = res || 80;
    scale = scale || 1.5;
    var geom = new THREE.BufferGeometry();
    var positions = [];
    var colors = [];

    for (var i = 0; i <= res; i++) {
      var theta = (i / res) * Math.PI;
      for (var j = 0; j <= res; j++) {
        var phi = (j / res) * 2 * Math.PI;
        var val = assocLegendre(l, m, Math.cos(theta));
        var r = Math.abs(val) * scale;
        positions.push(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi)
        );
        var t = Math.min(Math.abs(val) * 2.5, 1);
        if (val >= 0) {
          colors.push(0.15 + 0.30 * t, 0.35 + 0.35 * t, 0.65 + 0.30 * t);
        } else {
          colors.push(0.65 + 0.30 * t, 0.25 + 0.35 * t, 0.55 + 0.35 * t);
        }
      }
    }

    var indices = [];
    for (var i2 = 0; i2 < res; i2++) {
      for (var j2 = 0; j2 < res; j2++) {
        var a = i2 * (res + 1) + j2;
        var b = a + res + 1;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    var mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
      vertexColors: true, side: THREE.DoubleSide, shininess: 60,
      specular: 0x334466, transparent: true, opacity: 0.88,
    }));
    addWireframeOverlay(mesh);
    return mesh;
  }

  // Smooth morph animation between meshes
  function morphMesh(oldMesh, newMesh, scene, duration, onDone) {
    if (!oldMesh) { scene.add(newMesh); if (onDone) onDone(); return; }
    var oldPos = oldMesh.geometry.attributes.position.array;
    var newPos = newMesh.geometry.attributes.position.array;
    var oldCol = oldMesh.geometry.attributes.color.array;
    var newCol = newMesh.geometry.attributes.color.array;

    // If sizes don't match, just swap
    if (oldPos.length !== newPos.length) {
      scene.remove(oldMesh);
      scene.add(newMesh);
      if (onDone) onDone();
      return;
    }

    var startPos = new Float32Array(oldPos);
    var startCol = new Float32Array(oldCol);
    var start = performance.now();
    duration = duration || 500;

    function step(now) {
      var t = Math.min((now - start) / duration, 1);
      // Ease in-out cubic
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var pos = oldMesh.geometry.attributes.position.array;
      var col = oldMesh.geometry.attributes.color.array;
      for (var i = 0; i < pos.length; i++) {
        pos[i] = startPos[i] + (newPos[i] - startPos[i]) * e;
      }
      for (var j = 0; j < col.length; j++) {
        col[j] = startCol[j] + (newCol[j] - startCol[j]) * e;
      }
      oldMesh.geometry.attributes.position.needsUpdate = true;
      oldMesh.geometry.attributes.color.needsUpdate = true;
      oldMesh.geometry.computeVertexNormals();

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Replace with final mesh
        scene.remove(oldMesh);
        scene.add(newMesh);
        if (onDone) onDone();
      }
    }
    requestAnimationFrame(step);
  }

  function addEnhancedLighting(scene) {
    scene.add(new THREE.AmbientLight(0x334466, 0.5));
    var dl = new THREE.DirectionalLight(0x88bbee, 0.8);
    dl.position.set(3, 4, 2);
    scene.add(dl);
    var dl2 = new THREE.DirectionalLight(0x445588, 0.3);
    dl2.position.set(-2, 3, -1);
    scene.add(dl2);
    var pl = new THREE.PointLight(0xe68cd8, 0.35, 10);
    pl.position.set(-2, -1, 3);
    scene.add(pl);
    var pl2 = new THREE.PointLight(0x5c9ce6, 0.2, 10);
    pl2.position.set(2, 1, -3);
    scene.add(pl2);
  }

  // ── 1. HERO 3D SCENE ── (enhanced with morph, wireframe, reference geometry)
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

    addEnhancedLighting(scene);

    let currentMesh = null;
    let heroL = 2, heroM = 1;
    let morphing = false;

    function setHeroHarmonic(l, m, animate) {
      var newMesh = buildEnhancedSHMesh(l, m, 1.5, 96);
      if (animate && currentMesh && !morphing) {
        morphing = true;
        morphMesh(currentMesh, newMesh, scene, 600, function() {
          currentMesh = newMesh;
          morphing = false;
        });
      } else {
        if (currentMesh) scene.remove(currentMesh);
        currentMesh = newMesh;
        scene.add(currentMesh);
      }
      heroL = l;
      heroM = m;
      const sub = ['\u2080','\u2081','\u2082','\u2083','\u2084'][l] || l;
      const sup = m < 0 ? '\u207B' + ['\u2070','\u00B9','\u00B2','\u00B3','\u2074'][Math.abs(m)] :
                  ['\u2070','\u00B9','\u00B2','\u00B3','\u2074'][m] || m;
      readout.textContent = 'Y' + sub + sup;
    }

    setHeroHarmonic(2, 1, false);

    // Mouse drag rotation
    let isDragging = false, prevX = 0, prevY = 0;
    let rotX = 0.3, rotY = 0;

    canvas.addEventListener('pointerdown', function(e) { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('pointerup', function() { isDragging = false; });
    window.addEventListener('pointermove', function(e) {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      prevX = e.clientX;
      prevY = e.clientY;
    });

    function resize() {
      var w = container.clientWidth;
      var h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    function animate() {
      requestAnimationFrame(animate);
      if (currentMesh) {
        if (!isDragging) rotY += 0.002;
        currentMesh.rotation.x = rotX;
        currentMesh.rotation.y = rotY;
      }
      renderer.render(scene, camera);
    }
    animate();

    // Cycle through harmonics on double-click with smooth morph
    var heroSequence = [[0,0],[1,0],[1,1],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2]];
    var heroIdx = 4;
    canvas.addEventListener('dblclick', function() {
      heroIdx = (heroIdx + 1) % heroSequence.length;
      setHeroHarmonic(heroSequence[heroIdx][0], heroSequence[heroIdx][1], true);
    });

    // Auto-cycle every 6 seconds in hero
    setInterval(function() {
      if (!isDragging && !morphing) {
        heroIdx = (heroIdx + 1) % heroSequence.length;
        setHeroHarmonic(heroSequence[heroIdx][0], heroSequence[heroIdx][1], true);
      }
    }, 6000);
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


  // ── 2.5. LEGENDRE POLYNOMIALS 3D SURFACE OF REVOLUTION ── (enhanced)
  (function initLegendre3D() {
    var vizContainer = document.getElementById('legendre-3d-viz');
    var canvas = document.getElementById('legendre-3d-canvas');
    if (!canvas) return;
    var stateEl = document.getElementById('legendre-3d-state');
    var readoutEl = document.getElementById('legendre-3d-readout');

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060610, 1);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(2.5, 2, 2.5);
    camera.lookAt(0, 0, 0);

    addEnhancedLighting(scene);
    addEnhancedAxes(scene);
    addAxisLabels(scene);
    addReferenceGeometry(scene);

    var currentMesh = null;
    var morphing = false;
    var LABELS = ['P\u2080(cos \u03B8) = 1 \u2014 perfect sphere', 'P\u2081(cos \u03B8) = cos \u03B8 \u2014 dipole',
                  'P\u2082(cos \u03B8) = \u00BD(3cos\u00B2\u03B8 \u2212 1) \u2014 quadrupole',
                  'P\u2083(cos \u03B8) = \u00BD(5cos\u00B3\u03B8 \u2212 3cos \u03B8) \u2014 octupole',
                  'P\u2084(cos \u03B8) \u2014 hexadecapole', 'P\u2085(cos \u03B8) \u2014 32-pole'];

    function setLegendre3D(l, animate) {
      var newMesh = buildEnhancedLegendreMesh(l, 1.5, 80);
      if (animate && currentMesh && !morphing) {
        morphing = true;
        morphMesh(currentMesh, newMesh, scene, 500, function() {
          currentMesh = newMesh;
          morphing = false;
        });
      } else {
        if (currentMesh) scene.remove(currentMesh);
        currentMesh = newMesh;
        scene.add(currentMesh);
      }
      var sub = ['\u2080','\u2081','\u2082','\u2083','\u2084','\u2085'][l];
      stateEl.textContent = 'P' + sub + '(cos \u03B8)';
      readoutEl.innerHTML = '<div class="output-row"><span class="output-label">' + LABELS[l] + '</span><span class="output-value">' + l + ' nodal ring' + (l !== 1 ? 's' : '') + '</span></div>';
    }

    setLegendre3D(0, false);

    document.querySelectorAll('#legendre-3d-btns .btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#legendre-3d-btns .btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        setLegendre3D(parseInt(btn.dataset.l), true);
      });
    });

    // Mouse drag
    var isDragging = false, prevX = 0, prevY = 0, rotX = 0.3, rotY = 0;
    canvas.addEventListener('pointerdown', function(e) { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('pointerup', function() { isDragging = false; });
    window.addEventListener('pointermove', function(e) {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      prevX = e.clientX; prevY = e.clientY;
    });

    function resize() {
      var w = vizContainer.clientWidth;
      var h = vizContainer.clientHeight;
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


  // ── 3.5. ASSOCIATED LEGENDRE 3D SURFACE OF REVOLUTION ── (enhanced)
  (function initAssocLegendre3D() {
    var vizContainer = document.getElementById('assoc3d-viz');
    var canvas = document.getElementById('assoc3d-canvas');
    if (!canvas) return;
    var stateEl = document.getElementById('assoc3d-state');
    var readoutEl = document.getElementById('assoc3d-readout');

    var lSlider = document.getElementById('assoc3d-l-slider');
    var mSlider = document.getElementById('assoc3d-m-slider');
    var lValEl = document.getElementById('assoc3d-l-val');
    var mValEl = document.getElementById('assoc3d-m-val');

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060610, 1);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(2.5, 2, 2.5);
    camera.lookAt(0, 0, 0);

    addEnhancedLighting(scene);
    addEnhancedAxes(scene);
    addAxisLabels(scene);
    addReferenceGeometry(scene);

    var currentMesh = null;
    var morphing = false;

    function updateAssoc3D(animate) {
      var l = parseInt(lSlider.value);
      var m = parseInt(mSlider.value);
      if (m > l) { m = l; mSlider.value = m; }
      mSlider.max = l;
      lValEl.textContent = l;
      mValEl.textContent = m;

      var newMesh = buildEnhancedAssocMesh(l, m, 1.5, 80);
      if (animate && currentMesh && !morphing) {
        morphing = true;
        morphMesh(currentMesh, newMesh, scene, 400, function() {
          currentMesh = newMesh;
          morphing = false;
        });
      } else {
        if (currentMesh) scene.remove(currentMesh);
        currentMesh = newMesh;
        scene.add(currentMesh);
      }

      var sub = ['\u2080','\u2081','\u2082','\u2083','\u2084','\u2085'][l];
      var sup = ['\u2070','\u00B9','\u00B2','\u00B3','\u2074','\u2075'][m];
      stateEl.textContent = 'P' + sub + sup + '(cos \u03B8)';
      var type = m === 0 ? 'Zonal' : m === l ? 'Sectoral' : 'Tesseral';
      readoutEl.innerHTML = '<div class="output-row"><span class="output-label">P' + sub + sup + '(cos \u03B8) \u2014 ' + type + '</span><span class="output-value">' + (l - m) + ' nodal ring' + (l - m !== 1 ? 's' : '') + '</span></div>';
    }

    lSlider.addEventListener('input', function() { updateAssoc3D(true); });
    mSlider.addEventListener('input', function() { updateAssoc3D(true); });
    updateAssoc3D(false);

    // Mouse drag
    var isDragging = false, prevX = 0, prevY = 0, rotX = 0.3, rotY = 0;
    canvas.addEventListener('pointerdown', function(e) { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('pointerup', function() { isDragging = false; });
    window.addEventListener('pointermove', function(e) {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      prevX = e.clientX; prevY = e.clientY;
    });

    function resize() {
      var w = vizContainer.clientWidth;
      var h = vizContainer.clientHeight;
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


  // ── 4. MAIN SPHERICAL HARMONIC 3D EXPLORER ── (enhanced)
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

    addEnhancedLighting(scene);
    addEnhancedAxes(scene);
    addAxisLabels(scene);
    addReferenceGeometry(scene);

    let currentMesh = null;
    let morphing = false;

    function updateSH(animate) {
      const l = parseInt(lSlider.value);
      let m = parseInt(mSlider.value);
      if (m > l) m = l;
      if (m < -l) m = -l;
      mSlider.min = -l;
      mSlider.max = l;
      mSlider.value = m;
      lVal.textContent = l;
      mVal.textContent = m;

      var newMesh = buildEnhancedSHMesh(l, m, 1.8, 88);
      if (animate && currentMesh && !morphing) {
        morphing = true;
        morphMesh(currentMesh, newMesh, scene, 400, function() {
          currentMesh = newMesh;
          morphing = false;
        });
      } else {
        if (currentMesh) scene.remove(currentMesh);
        currentMesh = newMesh;
        scene.add(currentMesh);
      }

      const sub = ['\u2080','\u2081','\u2082','\u2083','\u2084'][l] || l;
      const mAbs = Math.abs(m);
      const sup = (m < 0 ? '\u207B' : '') + (['\u2070','\u00B9','\u00B2','\u00B3','\u2074'][mAbs] || mAbs);
      stateDisplay.textContent = 'Y' + sub + sup + '(\u03B8, \u03C6)';

      const names = { '00':'s', '10':'pz', '11':'px', '1-1':'py',
        '20':'dz\u00B2', '21':'dxz', '2-1':'dyz', '22':'dx\u00B2-y\u00B2', '2-2':'dxy',
        '30':'fz\u00B3', '31':'fxz\u00B2', '3-1':'fyz\u00B2', '32':'fz(x\u00B2-y\u00B2)', '3-2':'fxyz',
        '33':'fx(x\u00B2-3y\u00B2)', '3-3':'fy(3x\u00B2-y\u00B2)',
        '40':'g' };
      const orbital = names['' + l + m] || '';
      readoutEl.innerHTML = '<div class="output-row"><span class="output-label">Degree l = ' + l + ', Order m = ' + m + '</span><span class="output-value">' + (orbital ? orbital + ' orbital' : '') + '</span></div>' +
        '<div class="output-row"><span class="output-label">Number of harmonics at l = ' + l + '</span><span class="output-value">' + (2*l+1) + '</span></div>';
    }

    lSlider.addEventListener('input', function() { updateSH(true); });
    mSlider.addEventListener('input', function() { updateSH(true); });
    updateSH(false);

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


  // ── 5. GALLERY SCENE — All harmonics for l=0,1,2,3 ── (enhanced with labels)
  (function initGallery() {
    const canvas = document.getElementById('gallery-canvas');
    if (!canvas) return;
    const container = document.getElementById('gallery-scene');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060610, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 100);
    camera.position.set(0, 0.5, 18);
    camera.lookAt(0, -1.5, 0);

    addEnhancedLighting(scene);

    // All 16 harmonics for l=0,1,2,3 in a pyramid layout with labels
    const harmonics = [
      { l: 0, m: 0,  x: 0,    y: 4.2,  label: 's' },
      { l: 1, m: -1, x: -2.6, y: 1.4,  label: 'py' },
      { l: 1, m: 0,  x: 0,    y: 1.4,  label: 'pz' },
      { l: 1, m: 1,  x: 2.6,  y: 1.4,  label: 'px' },
      { l: 2, m: -2, x: -5.2, y: -1.4, label: 'dxy' },
      { l: 2, m: -1, x: -2.6, y: -1.4, label: 'dyz' },
      { l: 2, m: 0,  x: 0,    y: -1.4, label: 'dz\u00B2' },
      { l: 2, m: 1,  x: 2.6,  y: -1.4, label: 'dxz' },
      { l: 2, m: 2,  x: 5.2,  y: -1.4, label: 'dx\u00B2-y\u00B2' },
      { l: 3, m: -3, x: -7.8, y: -4.2, label: 'f\u2083' },
      { l: 3, m: -2, x: -5.2, y: -4.2, label: 'f\u2082' },
      { l: 3, m: -1, x: -2.6, y: -4.2, label: 'f\u2081' },
      { l: 3, m: 0,  x: 0,    y: -4.2, label: 'fz\u00B3' },
      { l: 3, m: 1,  x: 2.6,  y: -4.2, label: 'f\u2081\'' },
      { l: 3, m: 2,  x: 5.2,  y: -4.2, label: 'f\u2082\'' },
      { l: 3, m: 3,  x: 7.8,  y: -4.2, label: 'f\u2083\'' },
    ];
    const meshes = [];

    harmonics.forEach(function(h) {
      const res = 48;
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];

      for (let i = 0; i <= res; i++) {
        const theta = (i / res) * Math.PI;
        for (let j = 0; j <= res; j++) {
          const phi = (j / res) * 2 * Math.PI;
          const val = realSphericalHarmonic(h.l, h.m, theta, phi);
          const r = Math.abs(val) * 0.9;
          positions.push(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi)
          );
          var t = Math.min(Math.abs(val) * 2.5, 1);
          if (val >= 0) {
            colors.push(0.15 + 0.30 * t, 0.35 + 0.35 * t, 0.65 + 0.30 * t);
          } else {
            colors.push(0.65 + 0.30 * t, 0.25 + 0.35 * t, 0.55 + 0.35 * t);
          }
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
        vertexColors: true, side: THREE.DoubleSide, shininess: 60,
        specular: 0x334466, transparent: true, opacity: 0.88,
      }));
      addWireframeOverlay(mesh);

      mesh.position.set(h.x, h.y, 0);
      scene.add(mesh);
      meshes.push(mesh);

      // Add label sprite below each harmonic
      var lCanvas = document.createElement('canvas');
      lCanvas.width = 128; lCanvas.height = 48;
      var ctx = lCanvas.getContext('2d');
      ctx.font = '24px JetBrains Mono, monospace';
      ctx.fillStyle = '#8899bb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.label, 64, 24);
      var tex = new THREE.CanvasTexture(lCanvas);
      var spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
      var sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(h.x, h.y - 1.2, 0);
      sprite.scale.set(1.2, 0.45, 1);
      scene.add(sprite);
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
