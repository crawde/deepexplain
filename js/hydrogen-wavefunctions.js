/* Hydrogen Wave Functions — DeepExplain Visualizations */
/* Three.js 3D isosurface rendering + D3 2D radial plots */

(function () {
  'use strict';

  // ── Math helpers ──
  function factorial(n) {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function assocLaguerre(p, q, x) {
    // Associated Laguerre polynomial L_p^q(x) via recurrence
    if (p === 0) return 1;
    if (p === 1) return 1 + q - x;
    let prev2 = 1;
    let prev1 = 1 + q - x;
    for (let k = 2; k <= p; k++) {
      const curr = ((2 * k - 1 + q - x) * prev1 - (k - 1 + q) * prev2) / k;
      prev2 = prev1;
      prev1 = curr;
    }
    return prev1;
  }

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

  // Hydrogen radial wave function R_nl(r) (in units of Bohr radius a0)
  function radialWaveFunction(n, l, r) {
    const rho = (2 * r) / n;
    const normSq = Math.pow(2 / n, 3) * factorial(n - l - 1) / (2 * n * Math.pow(factorial(n + l), 1));
    // Fix: use proper normalization
    const norm = Math.sqrt(
      Math.pow(2 / n, 3) * factorial(n - l - 1) / (2 * n * factorial(n + l))
    );
    const lag = assocLaguerre(n - l - 1, 2 * l + 1, rho);
    return norm * Math.exp(-rho / 2) * Math.pow(rho, l) * lag;
  }

  // Probability density |ψ|² = |R_nl(r)|² × |Y_l^m(θ,φ)|²
  function probabilityDensity(n, l, m, r, theta, phi) {
    const R = radialWaveFunction(n, l, r);
    const Y = realSphericalHarmonic(l, Math.abs(m), theta, phi);
    return R * R * Y * Y;
  }

  // ── Color palette (matching DeepExplain theme) ──
  const BG_COLOR = 0x05050b;

  // ── Shared 3D helpers ──
  function addReferenceGeometry(scene) {
    const refSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.6 })
    );
    scene.add(refSphere);

    const ringGeo = new THREE.RingGeometry(0.3, 2.2, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x111130, side: THREE.DoubleSide, transparent: true, opacity: 0.2 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);

    [0.5, 1.0, 1.5].forEach(function(rad) {
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(rad * Math.cos(a), 0, rad * Math.sin(a)));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x151530, transparent: true, opacity: 0.25 })));
    });
  }

  function addEnhancedAxes(scene) {
    const axLen = 1.8;
    [
      { dir: [1, 0, 0], color: 0x3366aa },
      { dir: [0, 1, 0], color: 0x44aa66 },
      { dir: [0, 0, 1], color: 0xaa4488 }
    ].forEach(function(ax) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(ax.dir[0] * axLen, ax.dir[1] * axLen, ax.dir[2] * axLen)
      ]);
      scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: ax.color, transparent: true, opacity: 0.35 })));
    });
  }

  function addAxisLabels(scene) {
    [
      { text: 'x', pos: [2.0, 0, 0], color: '#5c9ce6' },
      { text: 'z', pos: [0, 2.0, 0], color: '#66bb6a' },
      { text: 'y', pos: [0, 0, 2.0], color: '#e68cd8' }
    ].forEach(function(lb) {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = lb.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lb.text, 32, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.6 }));
      sprite.position.set(lb.pos[0], lb.pos[1], lb.pos[2]);
      sprite.scale.set(0.25, 0.25, 1);
      scene.add(sprite);
    });
  }

  // ── Marching cubes for isosurface extraction ──
  // Simplified marching cubes on a uniform grid
  function generateIsosurface(n, l, m, isoValue, gridSize, extent) {
    gridSize = gridSize || 40;
    extent = extent || getExtent(n);
    const step = (2 * extent) / gridSize;
    const positions = [];
    const colors = [];

    // Sample the scalar field on the grid
    const field = new Float32Array((gridSize + 1) * (gridSize + 1) * (gridSize + 1));
    const signs = new Float32Array(field.length); // store sign of ψ for coloring

    for (let iz = 0; iz <= gridSize; iz++) {
      for (let iy = 0; iy <= gridSize; iy++) {
        for (let ix = 0; ix <= gridSize; ix++) {
          const x = -extent + ix * step;
          const y = -extent + iy * step;
          const z = -extent + iz * step;

          const r = Math.sqrt(x * x + y * y + z * z);
          const theta = r > 1e-10 ? Math.acos(Math.max(-1, Math.min(1, z / r))) : 0;
          const phi = Math.atan2(y, x);

          const R = r > 1e-10 ? radialWaveFunction(n, l, r) : (l === 0 ? radialWaveFunction(n, 0, 1e-6) : 0);
          const Y = realSphericalHarmonic(l, m, theta, phi);
          const psi = R * Y;
          const density = psi * psi;

          const idx = iz * (gridSize + 1) * (gridSize + 1) + iy * (gridSize + 1) + ix;
          field[idx] = density;
          signs[idx] = psi >= 0 ? 1 : -1;
        }
      }
    }

    // March through cubes
    for (let iz = 0; iz < gridSize; iz++) {
      for (let iy = 0; iy < gridSize; iy++) {
        for (let ix = 0; ix < gridSize; ix++) {
          const corners = [
            [ix, iy, iz], [ix+1, iy, iz], [ix+1, iy+1, iz], [ix, iy+1, iz],
            [ix, iy, iz+1], [ix+1, iy, iz+1], [ix+1, iy+1, iz+1], [ix, iy+1, iz+1]
          ];

          let cubeIndex = 0;
          const vals = [];
          const sgns = [];
          for (let c = 0; c < 8; c++) {
            const ci = corners[c];
            const idx = ci[2] * (gridSize + 1) * (gridSize + 1) + ci[1] * (gridSize + 1) + ci[0];
            vals.push(field[idx]);
            sgns.push(signs[idx]);
            if (field[idx] >= isoValue) cubeIndex |= (1 << c);
          }

          if (cubeIndex === 0 || cubeIndex === 255) continue;

          const edges = MC_TRI_TABLE[cubeIndex];
          if (!edges) continue;

          for (let e = 0; e < edges.length; e += 3) {
            for (let t = 0; t < 3; t++) {
              const edge = edges[e + t];
              const v1 = MC_EDGE_VERTICES[edge][0];
              const v2 = MC_EDGE_VERTICES[edge][1];

              const mu = (vals[v1] - isoValue) / (vals[v1] - vals[v2]) || 0.5;
              const p1 = corners[v1];
              const p2 = corners[v2];

              const px = -extent + (p1[0] + mu * (p2[0] - p1[0])) * step;
              const py = -extent + (p1[1] + mu * (p2[1] - p1[1])) * step;
              const pz = -extent + (p1[2] + mu * (p2[2] - p1[2])) * step;

              positions.push(px, py, pz);

              // Color based on sign of ψ at nearest grid point
              const avgSign = sgns[v1] + sgns[v2];
              if (avgSign > 0) {
                colors.push(0.36, 0.61, 0.9); // Blue — positive ψ
              } else {
                colors.push(0.9, 0.55, 0.85); // Pink — negative ψ
              }
            }
          }
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return geom;
  }

  function getExtent(n) {
    // Approximate extent of probability density for quantum number n (in Bohr radii)
    // Use scale that shows relevant structure
    return n * n * 2.5 + 5;
  }

  function getIsoValue(n, l) {
    // Reasonable default isosurface value for each orbital
    // Higher n → lower density → lower iso value
    const base = 0.0005;
    return base / (n * n);
  }

  // ── Simplified Marching Cubes lookup tables ──
  // Edge vertex pairs
  const MC_EDGE_VERTICES = [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7]
  ];

  // Triangle table — maps cube configuration to edge indices
  // This is a simplified but complete 256-entry table
  const MC_TRI_TABLE = buildTriTable();

  function buildTriTable() {
    // Standard marching cubes triangle table (256 entries)
    const table = [];
    // Using the classic Lorensen & Cline lookup table
    const raw = [
      [],
      [0,8,3],
      [0,1,9],
      [1,8,3,9,8,1],
      [1,2,10],
      [0,8,3,1,2,10],
      [9,2,10,0,2,9],
      [2,8,3,2,10,8,10,9,8],
      [3,11,2],
      [0,11,2,8,11,0],
      [1,9,0,2,3,11],
      [1,11,2,1,9,11,9,8,11],
      [3,10,1,11,10,3],
      [0,10,1,0,8,10,8,11,10],
      [3,9,0,3,11,9,11,10,9],
      [9,8,10,10,8,11],
      [4,7,8],
      [4,3,0,7,3,4],
      [0,1,9,8,4,7],
      [4,1,9,4,7,1,7,3,1],
      [1,2,10,8,4,7],
      [3,4,7,3,0,4,1,2,10],
      [9,2,10,9,0,2,8,4,7],
      [2,10,9,2,9,7,2,7,3,7,9,4],
      [8,4,7,3,11,2],
      [11,4,7,11,2,4,2,0,4],
      [9,0,1,8,4,7,2,3,11],
      [4,7,11,9,4,11,9,11,2,9,2,1],
      [3,10,1,3,11,10,7,8,4],
      [1,11,10,1,4,11,1,0,4,7,11,4],
      [4,7,8,9,0,11,9,11,10,11,0,3],
      [4,7,11,4,11,9,9,11,10],
      [9,5,4],
      [9,5,4,0,8,3],
      [0,5,4,1,5,0],
      [8,5,4,8,3,5,3,1,5],
      [1,2,10,9,5,4],
      [3,0,8,1,2,10,4,9,5],
      [5,2,10,5,4,2,4,0,2],
      [2,10,5,3,2,5,3,5,4,3,4,8],
      [9,5,4,2,3,11],
      [0,11,2,0,8,11,4,9,5],
      [0,5,4,0,1,5,2,3,11],
      [2,1,5,2,5,8,2,8,11,4,8,5],
      [10,3,11,10,1,3,9,5,4],
      [4,9,5,0,8,1,8,10,1,8,11,10],
      [5,4,0,5,0,11,5,11,10,11,0,3],
      [5,4,8,5,8,10,10,8,11],
      [9,7,8,5,7,9],
      [9,3,0,9,5,3,5,7,3],
      [0,7,8,0,1,7,1,5,7],
      [1,5,3,3,5,7],
      [9,7,8,9,5,7,10,1,2],
      [10,1,2,9,5,0,5,3,0,5,7,3],
      [8,0,2,8,2,5,8,5,7,10,5,2],
      [2,10,5,2,5,3,3,5,7],
      [7,9,5,7,8,9,3,11,2],
      [9,5,7,9,7,2,9,2,0,2,7,11],
      [2,3,11,0,1,8,1,7,8,1,5,7],
      [11,2,1,11,1,7,7,1,5],
      [9,5,8,8,5,7,10,1,3,10,3,11],
      [5,7,0,5,0,9,7,11,0,1,0,10,11,10,0],
      [11,10,0,11,0,3,10,5,0,8,0,7,5,7,0],
      [11,10,5,7,11,5],
      [10,6,5],
      [0,8,3,5,10,6],
      [9,0,1,5,10,6],
      [1,8,3,1,9,8,5,10,6],
      [1,6,5,2,6,1],
      [1,6,5,1,2,6,3,0,8],
      [9,6,5,9,0,6,0,2,6],
      [5,9,8,5,8,2,5,2,6,3,2,8],
      [2,3,11,10,6,5],
      [11,0,8,11,2,0,10,6,5],
      [0,1,9,2,3,11,5,10,6],
      [5,10,6,1,9,2,9,11,2,9,8,11],
      [6,3,11,6,5,3,5,1,3],
      [0,8,11,0,11,5,0,5,1,5,11,6],
      [3,11,6,0,3,6,0,6,5,0,5,9],
      [6,5,9,6,9,11,11,9,8],
      [5,10,6,4,7,8],
      [4,3,0,4,7,3,6,5,10],
      [1,9,0,5,10,6,8,4,7],
      [10,6,5,1,9,7,1,7,3,7,9,4],
      [6,1,2,6,5,1,4,7,8],
      [1,2,5,5,2,6,3,0,4,3,4,7],
      [8,4,7,9,0,5,0,6,5,0,2,6],
      [7,3,9,7,9,4,3,2,9,5,9,6,2,6,9],
      [3,11,2,7,8,4,10,6,5],
      [5,10,6,4,7,2,4,2,0,2,7,11],
      [0,1,9,4,7,8,2,3,11,5,10,6],
      [9,2,1,9,11,2,9,4,11,7,11,4,5,10,6],
      [8,4,7,3,11,5,3,5,1,5,11,6],
      [5,1,11,5,11,6,1,0,11,7,11,4,0,4,11],
      [0,5,9,0,6,5,0,3,6,11,6,3,8,4,7],
      [6,5,9,6,9,11,4,7,9,7,11,9],
      [10,4,9,6,4,10],
      [4,10,6,4,9,10,0,8,3],
      [10,0,1,10,6,0,6,4,0],
      [8,3,1,8,1,6,8,6,4,6,1,10],
      [1,4,9,1,2,4,2,6,4],
      [3,0,8,1,2,9,2,4,9,2,6,4],
      [0,2,4,4,2,6],
      [8,3,2,8,2,4,4,2,6],
      [10,4,9,10,6,4,11,2,3],
      [0,8,2,2,8,11,4,9,10,4,10,6],
      [3,11,2,0,1,6,0,6,4,6,1,10],
      [6,4,1,6,1,10,4,8,1,2,1,11,8,11,1],
      [9,6,4,9,3,6,9,1,3,11,6,3],
      [8,11,1,8,1,0,11,6,1,9,1,4,6,4,1],
      [3,11,6,3,6,0,0,6,4],
      [6,4,8,11,6,8],
      [7,10,6,7,8,10,8,9,10],
      [0,7,3,0,10,7,0,9,10,6,7,10],
      [10,6,7,1,10,7,1,7,8,1,8,0],
      [10,6,7,10,7,1,1,7,3],
      [1,2,6,1,6,8,1,8,9,8,6,7],
      [2,6,9,2,9,1,6,7,9,0,9,3,7,3,9],
      [7,8,0,7,0,6,6,0,2],
      [7,3,2,6,7,2],
      [2,3,11,10,6,8,10,8,9,8,6,7],
      [2,0,7,2,7,11,0,9,7,6,7,10,9,10,7],
      [1,8,0,1,7,8,1,10,7,6,7,10,2,3,11],
      [11,2,1,11,1,7,10,6,1,6,7,1],
      [8,9,6,8,6,7,9,1,6,11,6,3,1,3,6],
      [0,9,1,11,6,7],
      [7,8,0,7,0,6,3,11,0,11,6,0],
      [7,11,6],
      [7,6,11],
      [3,0,8,11,7,6],
      [0,1,9,11,7,6],
      [8,1,9,8,3,1,11,7,6],
      [10,1,2,6,11,7],
      [1,2,10,3,0,8,6,11,7],
      [2,9,0,2,10,9,6,11,7],
      [6,11,7,2,10,3,10,8,3,10,9,8],
      [7,2,3,6,2,7],
      [7,0,8,7,6,0,6,2,0],
      [2,7,6,2,3,7,0,1,9],
      [1,6,2,1,8,6,1,9,8,8,7,6],
      [10,7,6,10,1,7,1,3,7],
      [10,7,6,1,7,10,1,8,7,1,0,8],
      [0,3,7,0,7,10,0,10,9,6,10,7],
      [7,6,10,7,10,8,8,10,9],
      [6,8,4,11,8,6],
      [3,6,11,3,0,6,0,4,6],
      [8,6,11,8,4,6,9,0,1],
      [9,4,6,9,6,3,9,3,1,11,3,6],
      [6,8,4,6,11,8,2,10,1],
      [1,2,10,3,0,11,0,6,11,0,4,6],
      [4,11,8,4,6,11,0,2,9,2,10,9],
      [10,9,3,10,3,2,9,4,3,11,3,6,4,6,3],
      [8,2,3,8,4,2,4,6,2],
      [0,4,2,4,6,2],
      [1,9,0,2,3,4,2,4,6,4,3,8],
      [1,9,4,1,4,2,2,4,6],
      [8,1,3,8,6,1,8,4,6,6,10,1],
      [10,1,0,10,0,6,6,0,4],
      [4,6,3,4,3,8,6,10,3,0,3,9,10,9,3],
      [10,9,4,6,10,4],
      [4,9,5,7,6,11],
      [0,8,3,4,9,5,11,7,6],
      [5,0,1,5,4,0,7,6,11],
      [11,7,6,8,3,4,3,5,4,3,1,5],
      [9,5,4,10,1,2,7,6,11],
      [6,11,7,1,2,10,0,8,3,4,9,5],
      [7,6,11,5,4,10,4,2,10,4,0,2],
      [3,4,8,3,5,4,3,2,5,10,5,2,11,7,6],
      [7,2,3,7,6,2,5,4,9],
      [9,5,4,0,8,6,0,6,2,6,8,7],
      [3,6,2,3,7,6,1,5,0,5,4,0],
      [6,2,8,6,8,7,2,1,8,4,8,5,1,5,8],
      [9,5,4,10,1,6,1,7,6,1,3,7],
      [1,6,10,1,7,6,1,0,7,8,7,0,9,5,4],
      [4,0,10,4,10,5,0,3,10,6,10,7,3,7,10],
      [7,6,10,7,10,8,5,4,10,4,8,10],
      [6,9,5,6,11,9,11,8,9],
      [3,6,11,0,6,3,0,5,6,0,9,5],
      [0,11,8,0,5,11,0,1,5,5,6,11],
      [6,11,3,6,3,5,5,3,1],
      [1,2,10,9,5,11,9,11,8,11,5,6],
      [0,11,3,0,6,11,0,9,6,5,6,9,1,2,10],
      [11,8,5,11,5,6,8,0,5,10,5,2,0,2,5],
      [6,11,3,6,3,5,2,10,3,10,5,3],
      [5,8,9,5,2,8,5,6,2,3,8,2],
      [9,5,6,9,6,0,0,6,2],
      [1,5,8,1,8,0,5,6,8,3,8,2,6,2,8],
      [1,5,6,2,1,6],
      [1,3,6,1,6,10,3,8,6,5,6,9,8,9,6],
      [10,1,0,10,0,6,9,5,0,5,6,0],
      [0,3,8,5,6,10],
      [10,5,6],
      [11,5,10,7,5,11],
      [11,5,10,11,7,5,8,3,0],
      [5,11,7,5,10,11,1,9,0],
      [10,7,5,10,11,7,9,8,1,8,3,1],
      [11,1,2,11,7,1,7,5,1],
      [0,8,3,1,2,7,1,7,5,7,2,11],
      [9,7,5,9,2,7,9,0,2,2,11,7],
      [7,5,2,7,2,11,5,9,2,3,2,8,9,8,2],
      [2,5,10,2,3,5,3,7,5],
      [8,2,0,8,5,2,8,7,5,10,2,5],
      [9,0,1,5,10,3,5,3,7,3,10,2],
      [9,8,2,9,2,1,8,7,2,10,2,5,7,5,2],
      [1,3,5,3,7,5],
      [0,8,7,0,7,1,1,7,5],
      [9,0,3,9,3,5,5,3,7],
      [9,8,7,5,9,7],
      [5,8,4,5,10,8,10,11,8],
      [5,0,4,5,11,0,5,10,11,11,3,0],
      [0,1,9,8,4,10,8,10,11,10,4,5],
      [10,11,4,10,4,5,11,3,4,9,4,1,3,1,4],
      [2,5,1,2,8,5,2,11,8,4,5,8],
      [0,4,11,0,11,3,4,5,11,2,11,1,5,1,11],
      [0,2,5,0,5,9,2,11,5,4,5,8,11,8,5],
      [9,4,5,2,11,3],
      [2,5,10,3,5,2,3,4,5,3,8,4],
      [5,10,2,5,2,4,4,2,0],
      [3,10,2,3,5,10,3,8,5,4,5,8,0,1,9],
      [5,10,2,5,2,4,1,9,2,9,4,2],
      [8,4,5,8,5,3,3,5,1],
      [0,4,5,1,0,5],
      [8,4,5,8,5,3,9,0,5,0,3,5],
      [9,4,5],
      [4,11,7,4,9,11,9,10,11],
      [0,8,3,4,9,7,9,11,7,9,10,11],
      [1,10,11,1,11,4,1,4,0,7,4,11],
      [3,1,4,3,4,8,1,10,4,7,4,11,10,11,4],
      [4,11,7,9,11,4,9,2,11,9,1,2],
      [9,7,4,9,11,7,9,1,11,2,11,1,0,8,3],
      [11,7,4,11,4,2,2,4,0],
      [11,7,4,11,4,2,8,3,4,3,2,4],
      [2,9,10,2,7,9,2,3,7,7,4,9],
      [9,10,7,9,7,4,10,2,7,8,7,0,2,0,7],
      [3,7,10,3,10,2,7,4,10,1,10,0,4,0,10],
      [1,10,2,8,7,4],
      [4,9,1,4,1,7,7,1,3],
      [4,9,1,4,1,7,0,8,1,8,7,1],
      [4,0,3,7,4,3],
      [4,8,7],
      [9,10,8,10,11,8],
      [3,0,9,3,9,11,11,9,10],
      [0,1,10,0,10,8,8,10,11],
      [3,1,10,11,3,10],
      [1,2,11,1,11,9,9,11,8],
      [3,0,9,3,9,11,1,2,9,2,11,9],
      [0,2,11,8,0,11],
      [3,2,11],
      [2,3,8,2,8,10,10,8,9],
      [9,10,2,0,9,2],
      [2,3,8,2,8,10,0,1,8,1,10,8],
      [1,10,2],
      [1,3,8,9,1,8],
      [0,9,1],
      [0,3,8],
      []
    ];
    return raw;
  }

  // ── Radial wave function 2D plot (D3) ──
  function initRadialPlot() {
    const container = document.getElementById('radial-viz');
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = 320;

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .style('background', 'transparent');

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Axes
    const xScale = d3.scaleLinear().range([0, w]);
    const yScale = d3.scaleLinear().range([h, 0]);

    const xAxis = g.append('g').attr('transform', `translate(0,${h})`);
    const yAxis = g.append('g');
    const path = g.append('path').attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 2);
    const zeroLine = g.append('line').attr('stroke', '#333').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');

    // Labels
    g.append('text').attr('x', w / 2).attr('y', h + 35).attr('fill', '#888')
      .attr('text-anchor', 'middle').attr('font-size', '12px').text('r / a₀');
    g.append('text').attr('x', -30).attr('y', -5).attr('fill', '#888')
      .attr('text-anchor', 'start').attr('font-size', '12px').text('R(r)');

    function update(n, l) {
      const rMax = n * n * 3 + 10;
      const points = [];
      for (let i = 0; i <= 300; i++) {
        const r = (i / 300) * rMax;
        points.push({ r: r, R: radialWaveFunction(n, l, Math.max(r, 0.01)) });
      }

      xScale.domain([0, rMax]);
      const yMin = d3.min(points, d => d.R);
      const yMax = d3.max(points, d => d.R);
      const yPad = (yMax - yMin) * 0.1 || 0.1;
      yScale.domain([yMin - yPad, yMax + yPad]);

      xAxis.transition().duration(400).call(d3.axisBottom(xScale).ticks(6));
      yAxis.transition().duration(400).call(d3.axisLeft(yScale).ticks(5));

      // Style axes
      xAxis.selectAll('text').attr('fill', '#666');
      xAxis.selectAll('line,path').attr('stroke', '#333');
      yAxis.selectAll('text').attr('fill', '#666');
      yAxis.selectAll('line,path').attr('stroke', '#333');

      const line = d3.line().x(d => xScale(d.r)).y(d => yScale(d.R)).curve(d3.curveMonotoneX);
      path.transition().duration(400).attr('d', line(points));

      // Zero line
      zeroLine.attr('x1', 0).attr('x2', w).attr('y1', yScale(0)).attr('y2', yScale(0));

      // Update readout
      const readout = document.getElementById('radial-readout');
      if (readout) {
        const nodes = n - l - 1;
        readout.textContent = `R${n}${l}(r) — ${nodes} radial node${nodes !== 1 ? 's' : ''}`;
      }
    }

    return update;
  }

  // ── Radial probability distribution r²|R|² ──
  function initProbabilityPlot() {
    const container = document.getElementById('prob-viz');
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = 320;

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .style('background', 'transparent');

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().range([0, w]);
    const yScale = d3.scaleLinear().range([h, 0]);

    const xAxis = g.append('g').attr('transform', `translate(0,${h})`);
    const yAxis = g.append('g');
    const area = g.append('path').attr('fill', 'rgba(92,156,230,0.15)').attr('stroke', 'none');
    const path = g.append('path').attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 2);

    g.append('text').attr('x', w / 2).attr('y', h + 35).attr('fill', '#888')
      .attr('text-anchor', 'middle').attr('font-size', '12px').text('r / a₀');
    g.append('text').attr('x', -30).attr('y', -5).attr('fill', '#888')
      .attr('text-anchor', 'start').attr('font-size', '12px').text('r²|R|²');

    function update(n, l) {
      const rMax = n * n * 3 + 10;
      const points = [];
      for (let i = 0; i <= 300; i++) {
        const r = (i / 300) * rMax;
        const R = radialWaveFunction(n, l, Math.max(r, 0.01));
        points.push({ r: r, p: r * r * R * R });
      }

      xScale.domain([0, rMax]);
      const yMax = d3.max(points, d => d.p);
      yScale.domain([0, yMax * 1.1]);

      xAxis.transition().duration(400).call(d3.axisBottom(xScale).ticks(6));
      yAxis.transition().duration(400).call(d3.axisLeft(yScale).ticks(5));

      xAxis.selectAll('text').attr('fill', '#666');
      xAxis.selectAll('line,path').attr('stroke', '#333');
      yAxis.selectAll('text').attr('fill', '#666');
      yAxis.selectAll('line,path').attr('stroke', '#333');

      const line = d3.line().x(d => xScale(d.r)).y(d => yScale(d.p)).curve(d3.curveMonotoneX);
      path.transition().duration(400).attr('d', line(points));

      const areaGen = d3.area().x(d => xScale(d.r)).y0(h).y1(d => yScale(d.p)).curve(d3.curveMonotoneX);
      area.transition().duration(400).attr('d', areaGen(points));

      // Find peaks
      const peaks = [];
      for (let i = 1; i < points.length - 1; i++) {
        if (points[i].p > points[i-1].p && points[i].p > points[i+1].p) {
          peaks.push(points[i].r.toFixed(1));
        }
      }

      const readout = document.getElementById('prob-readout');
      if (readout) {
        readout.textContent = `Peak${peaks.length > 1 ? 's' : ''} at r ≈ ${peaks.join(', ')} a₀`;
      }
    }

    return update;
  }

  // ── 3D Isosurface Orbital Viewer ──
  function initOrbitalViewer() {
    const canvasEl = document.getElementById('orbital-canvas');
    if (!canvasEl) return;

    const container = canvasEl.parentElement;
    const width = container.clientWidth || 600;
    const height = 450;
    canvasEl.width = width;
    canvasEl.height = height;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(BG_COLOR);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, 0, 0);

    addReferenceGeometry(scene);
    addEnhancedAxes(scene);
    addAxisLabels(scene);

    // Lighting
    scene.add(new THREE.AmbientLight(0x334466, 0.8));
    const dirLight = new THREE.DirectionalLight(0x8899bb, 0.5);
    dirLight.position.set(3, 5, 3);
    scene.add(dirLight);

    let currentMesh = null;

    function updateOrbital(n, l, m, isoMul) {
      if (currentMesh) {
        scene.remove(currentMesh);
        currentMesh.geometry.dispose();
        currentMesh.material.dispose();
      }

      const isoVal = getIsoValue(n, l) * (isoMul || 1);
      const ext = getExtent(n);
      const gridRes = n <= 2 ? 50 : 40;

      const geom = generateIsosurface(n, l, m, isoVal, gridRes, ext);

      // Scale to fit viewport
      const scale = 1.5 / ext;

      const mat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 30,
        transparent: true,
        opacity: 0.85
      });

      currentMesh = new THREE.Mesh(geom, mat);
      currentMesh.scale.set(scale, scale, scale);
      scene.add(currentMesh);

      // Update state display
      const stateEl = document.getElementById('orbital-state');
      if (stateEl) {
        const subN = String(n).replace(/\d/g, c => '₀₁₂₃₄₅₆₇₈₉'[c]);
        const subL = String(l).replace(/\d/g, c => '₀₁₂₃₄₅₆₇₈₉'[c]);
        const subM = (m < 0 ? '₋' : '') + String(Math.abs(m)).replace(/\d/g, c => '₀₁₂₃₄₅₆₇₈₉'[c]);
        const orbitalNames = ['s', 'p', 'd', 'f', 'g', 'h'];
        const orbName = orbitalNames[l] || l;
        stateEl.textContent = `ψ${subN}${subL}${subM} — ${n}${orbName} orbital`;
      }
    }

    // Mouse drag rotation
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let rotX = 0.4, rotY = 0.3;

    canvasEl.addEventListener('mousedown', function(e) { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    canvasEl.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      prevX = e.clientX; prevY = e.clientY;
    });
    window.addEventListener('mouseup', function() { isDragging = false; });

    // Touch support
    canvasEl.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        isDragging = true;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      }
    }, { passive: true });
    canvasEl.addEventListener('touchmove', function(e) {
      if (!isDragging || e.touches.length !== 1) return;
      rotY += (e.touches[0].clientX - prevX) * 0.005;
      rotX += (e.touches[0].clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    }, { passive: true });
    canvasEl.addEventListener('touchend', function() { isDragging = false; }, { passive: true });

    function animate() {
      requestAnimationFrame(animate);
      if (!isDragging) rotY += 0.003;
      camera.position.x = 5 * Math.sin(rotY) * Math.cos(rotX);
      camera.position.y = 5 * Math.sin(rotX);
      camera.position.z = 5 * Math.cos(rotY) * Math.cos(rotX);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    animate();

    return updateOrbital;
  }

  // ── Node Counter Interactive ──
  function initNodeCounter() {
    const container = document.getElementById('node-viz');
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = 200;

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .style('background', 'transparent');

    function update(n, l, m) {
      svg.selectAll('*').remove();

      const radialNodes = n - l - 1;
      const angularNodesTheta = l - Math.abs(m);
      const angularNodesPhi = Math.abs(m);
      const totalNodes = n - 1;

      const data = [
        { label: 'Radial nodes (n−l−1)', value: radialNodes, color: '#5c9ce6' },
        { label: 'θ nodes (l−|m|)', value: angularNodesTheta, color: '#66bb6a' },
        { label: 'φ nodes (|m|)', value: angularNodesPhi, color: '#e68cd8' },
        { label: 'Total (n−1)', value: totalNodes, color: '#ffcc00' }
      ];

      const barH = 30;
      const gap = 15;
      const maxVal = Math.max(totalNodes, 1);

      data.forEach(function(d, i) {
        const y = 20 + i * (barH + gap);

        svg.append('text').attr('x', 10).attr('y', y + barH / 2 + 4)
          .attr('fill', '#aaa').attr('font-size', '12px').text(d.label);

        const barX = 200;
        const barW = Math.max((d.value / maxVal) * (width - barX - 60), 2);

        svg.append('rect').attr('x', barX).attr('y', y)
          .attr('width', barW).attr('height', barH)
          .attr('rx', 4).attr('fill', d.color).attr('opacity', 0.7);

        svg.append('text').attr('x', barX + barW + 8).attr('y', y + barH / 2 + 4)
          .attr('fill', d.color).attr('font-size', '14px').attr('font-weight', 'bold').text(d.value);
      });
    }

    return update;
  }

  // ── Initialize everything on DOM ready ──
  function init() {
    const radialUpdate = initRadialPlot();
    const probUpdate = initProbabilityPlot();
    const orbitalUpdate = initOrbitalViewer();
    const nodeUpdate = initNodeCounter();

    let currentN = 2, currentL = 1, currentM = 0;

    function updateAll() {
      if (radialUpdate) radialUpdate(currentN, currentL);
      if (probUpdate) probUpdate(currentN, currentL);
      if (orbitalUpdate) orbitalUpdate(currentN, currentL, currentM);
      if (nodeUpdate) nodeUpdate(currentN, currentL, currentM);
    }

    // Wire up controls
    const nSlider = document.getElementById('n-slider');
    const lSlider = document.getElementById('l-slider');
    const mSlider = document.getElementById('m-slider');
    const nVal = document.getElementById('n-val');
    const lVal = document.getElementById('l-val');
    const mVal = document.getElementById('m-val');
    const isoSlider = document.getElementById('iso-slider');

    if (nSlider) {
      nSlider.addEventListener('input', function() {
        currentN = parseInt(this.value);
        if (nVal) nVal.textContent = currentN;

        // Constrain l < n
        if (lSlider) {
          lSlider.max = currentN - 1;
          if (currentL >= currentN) {
            currentL = currentN - 1;
            lSlider.value = currentL;
            if (lVal) lVal.textContent = currentL;
          }
        }
        // Constrain |m| <= l
        if (mSlider) {
          mSlider.min = -currentL;
          mSlider.max = currentL;
          if (Math.abs(currentM) > currentL) {
            currentM = 0;
            mSlider.value = 0;
            if (mVal) mVal.textContent = 0;
          }
        }
        updateAll();
      });
    }

    if (lSlider) {
      lSlider.addEventListener('input', function() {
        currentL = parseInt(this.value);
        if (lVal) lVal.textContent = currentL;

        // Constrain |m| <= l
        if (mSlider) {
          mSlider.min = -currentL;
          mSlider.max = currentL;
          if (Math.abs(currentM) > currentL) {
            currentM = 0;
            mSlider.value = 0;
            if (mVal) mVal.textContent = 0;
          }
        }
        updateAll();
      });
    }

    if (mSlider) {
      mSlider.addEventListener('input', function() {
        currentM = parseInt(this.value);
        if (mVal) mVal.textContent = currentM;
        updateAll();
      });
    }

    if (isoSlider) {
      isoSlider.addEventListener('input', function() {
        const mul = parseFloat(this.value);
        const isoLabel = document.getElementById('iso-val');
        if (isoLabel) isoLabel.textContent = mul.toFixed(1) + '×';
        if (orbitalUpdate) orbitalUpdate(currentN, currentL, currentM, mul);
      });
    }

    // Quick-select orbital buttons
    document.querySelectorAll('[data-orbital]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const parts = this.dataset.orbital.split(',');
        currentN = parseInt(parts[0]);
        currentL = parseInt(parts[1]);
        currentM = parseInt(parts[2]);

        if (nSlider) { nSlider.value = currentN; if (nVal) nVal.textContent = currentN; }
        if (lSlider) { lSlider.max = currentN - 1; lSlider.value = currentL; if (lVal) lVal.textContent = currentL; }
        if (mSlider) { mSlider.min = -currentL; mSlider.max = currentL; mSlider.value = currentM; if (mVal) mVal.textContent = currentM; }

        document.querySelectorAll('[data-orbital]').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        updateAll();
      });
    });

    // Initial render
    updateAll();
  }

  // Exercise checker
  window.checkExercise = function(num) {
    const input = document.getElementById('ex' + num + '-input');
    const fb = document.getElementById('ex' + num + '-fb');
    if (!input || !fb) return;
    const ans = input.value.trim().toLowerCase();

    const answers = {
      1: function(a) { return a === '3' || a === 'three'; },
      2: function(a) { return a.includes('n-l-1') || a.includes('n - l - 1') || a === 'n-l-1'; },
      3: function(a) { return a === '0' || a === 'zero' || a === 'none'; },
      4: function(a) { return a.includes('cone') || a.includes('cones'); }
    };

    if (answers[num] && answers[num](ans)) {
      fb.textContent = '✓ Correct!';
      fb.style.color = '#66bb6a';
    } else {
      fb.textContent = '✗ Try again';
      fb.style.color = '#e68cd8';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
