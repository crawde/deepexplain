/* DeepExplain – Dirac Notation Interactive Visualizations (v2 — streamlined) */

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

  initKetBuilder();
  initInnerProduct();
  initProjection();
  initOperatorAction();
  initBasisChange();
  initWavefunction();
  initFourier();
  initUncertainty();
});


/* ───── KET BUILDER ───── */
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
  thetaSlider.addEventListener('input', update);
  phiSlider.addEventListener('input', update);
  update();
}


/* ───── INNER PRODUCT ───── */
function initInnerProduct() {
  const container = document.getElementById('inner-product-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#inner-product-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', '#222233');
  svg.append('line').attr('x1', cx - R - 10).attr('y1', cy).attr('x2', cx + R + 10).attr('y2', cy)
    .attr('stroke', '#1a1a28').attr('stroke-width', 0.5);
  svg.append('line').attr('x1', cx).attr('y1', cy - R - 10).attr('x2', cx).attr('y2', cy + R + 10)
    .attr('stroke', '#1a1a28').attr('stroke-width', 0.5);
  svg.append('text').attr('x', cx + R + 12).attr('y', cy + 4).text('|0⟩')
    .attr('fill', '#555').attr('font-size', '11px');
  svg.append('text').attr('x', cx - 5).attr('y', cy - R - 8).text('|1⟩')
    .attr('fill', '#555').attr('font-size', '11px');

  const psiLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 2);
  const phiLine = svg.append('line').attr('stroke', '#e68cd8').attr('stroke-width', 2);
  const psiDot = svg.append('circle').attr('r', 4).attr('fill', '#5c9ce6');
  const phiDot = svg.append('circle').attr('r', 4).attr('fill', '#e68cd8');
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
  psiAngle.addEventListener('input', update);
  phiAngle.addEventListener('input', update);
  update();
}


/* ───── PROJECTION ───── */
function initProjection() {
  const container = document.getElementById('projection-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#projection-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', '#222233');

  const psiDirLine = svg.append('line').attr('stroke', 'rgba(92,156,230,0.2)').attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3');
  const psiLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 2);
  const chiLine = svg.append('line').attr('stroke', '#ffab40').attr('stroke-width', 2);
  const projectionLine = svg.append('line').attr('stroke', '#66bb6a').attr('stroke-width', 2.5);
  const dropLine = svg.append('line').attr('stroke', '#66bb6a').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 2.5).attr('fill', '#555');
  const chiDot = svg.append('circle').attr('r', 4).attr('fill', '#ffab40');
  const projDot = svg.append('circle').attr('r', 4).attr('fill', '#66bb6a');
  const psiLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '12px').text('|ψ⟩');
  const chiLabel = svg.append('text').attr('fill', '#ffab40').attr('font-size', '12px').text('|χ⟩');
  const projLabel = svg.append('text').attr('fill', '#66bb6a').attr('font-size', '12px').text('P|χ⟩');

  const psiAngle = document.getElementById('proj-psi-angle');
  const chiAngle = document.getElementById('proj-chi-angle');
  const psiVal = document.getElementById('proj-psi-val');
  const chiVal = document.getElementById('proj-chi-val');
  const outputEl = document.getElementById('projection-output');

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
  psiAngle.addEventListener('input', update);
  chiAngle.addEventListener('input', update);
  update();
}


/* ───── OPERATOR ACTION ───── */
function initOperatorAction() {
  const container = document.getElementById('operator-viz');
  if (!container) return;
  const w = container.clientWidth, h = 300;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.35;

  const svg = d3.select('#operator-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R)
    .attr('fill', 'none').attr('stroke', '#222233');
  svg.append('text').attr('x', cx + R + 10).attr('y', cy + 4).text('|0⟩').attr('fill', '#555').attr('font-size', '11px');
  svg.append('text').attr('x', cx - 5).attr('y', cy - R - 6).text('|1⟩').attr('fill', '#555').attr('font-size', '11px');

  // Arrow markers
  const defs = svg.append('defs');
  [['arr-b', '#5c9ce6'], ['arr-r', '#ef5350']].forEach(([id, color]) => {
    defs.append('marker').attr('id', id).attr('viewBox', '0 0 10 10')
      .attr('refX', 5).attr('refY', 5).attr('markerWidth', 5).attr('markerHeight', 5)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', color);
  });

  const inputLine = svg.append('line').attr('stroke', '#5c9ce6').attr('stroke-width', 2).attr('marker-end', 'url(#arr-b)');
  const outputLine = svg.append('line').attr('stroke', '#ef5350').attr('stroke-width', 2).attr('marker-end', 'url(#arr-r)');
  const inputDot = svg.append('circle').attr('r', 4).attr('fill', '#5c9ce6');
  const outputDot = svg.append('circle').attr('r', 4).attr('fill', '#ef5350');
  const inputLabel = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '11px').text('input');
  const outputLabel = svg.append('text').attr('fill', '#ef5350').attr('font-size', '11px').text('output');

  const operators = {
    I: [[1, 0], [0, 1]],
    X: [[0, 1], [1, 0]],
    Y: [[0, -1], [1, 0]],
    Z: [[1, 0], [0, -1]],
    H: [[1 / Math.sqrt(2), 1 / Math.sqrt(2)], [1 / Math.sqrt(2), -1 / Math.sqrt(2)]]
  };
  let currentOp = 'I';

  document.querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-op]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOp = btn.dataset.op;
      update();
    });
  });

  const thetaSlider = document.getElementById('op-theta');
  const thetaVal = document.getElementById('op-theta-val');
  const outputEl = document.getElementById('operator-output');

  function update() {
    const theta = (thetaSlider.value / 100) * Math.PI;
    thetaVal.textContent = fmtAngle(theta);

    const inp = [Math.cos(theta / 2), Math.sin(theta / 2)];
    const m = operators[currentOp];
    const out = [m[0][0] * inp[0] + m[0][1] * inp[1], m[1][0] * inp[0] + m[1][1] * inp[1]];
    const norm = Math.sqrt(out[0] * out[0] + out[1] * out[1]);
    const outN = [out[0] / norm, out[1] / norm];

    const ix = cx + R * inp[0], iy = cy - R * inp[1];
    const ox = cx + R * outN[0], oy = cy - R * outN[1];

    inputLine.attr('x1', cx).attr('y1', cy).attr('x2', ix).attr('y2', iy);
    outputLine.attr('x1', cx).attr('y1', cy).attr('x2', ox).attr('y2', oy);
    inputDot.attr('cx', ix).attr('cy', iy);
    outputDot.attr('cx', ox).attr('cy', oy);
    inputLabel.attr('x', ix + 8).attr('y', iy - 8);
    const dx = Math.abs(ox - ix), dy = Math.abs(oy - iy);
    const overlap = dx < 20 && dy < 20;
    outputLabel.attr('x', ox + 8).attr('y', oy - (overlap ? -16 : 8));

    const names = { I: 'I', X: 'σ_x', Y: 'σ_y', Z: 'σ_z', H: 'H' };
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Operator</span><span class="output-value">${names[currentOp]}</span></div>
      <div class="output-row"><span class="output-label">Input</span><span class="output-value">(${inp[0].toFixed(3)}, ${inp[1].toFixed(3)})</span></div>
      <div class="output-row"><span class="output-label">Output</span><span class="output-value">(${outN[0].toFixed(3)}, ${outN[1].toFixed(3)})</span></div>`;
  }
  thetaSlider.addEventListener('input', update);
  update();
}


/* ───── BASIS CHANGE ───── */
function initBasisChange() {
  const container = document.getElementById('basis-change-viz');
  if (!container) return;
  const w = container.clientWidth, h = 340;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.33;

  const svg = d3.select('#basis-change-viz').append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'xMidYMid meet');

  [0.5, 1.0].forEach(f => {
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R * f)
      .attr('fill', 'none').attr('stroke', '#161620').attr('stroke-width', 0.5);
  });

  const origX = svg.append('line').attr('stroke', 'rgba(92,156,230,0.35)').attr('stroke-width', 1);
  const origY = svg.append('line').attr('stroke', 'rgba(92,156,230,0.35)').attr('stroke-width', 1);
  const newX = svg.append('line').attr('stroke', 'rgba(102,187,106,0.35)').attr('stroke-width', 1);
  const newY = svg.append('line').attr('stroke', 'rgba(102,187,106,0.35)').attr('stroke-width', 1);
  const projO1 = svg.append('line').attr('stroke', 'rgba(92,156,230,0.25)').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  const projO2 = svg.append('line').attr('stroke', 'rgba(92,156,230,0.25)').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  const projN1 = svg.append('line').attr('stroke', 'rgba(102,187,106,0.25)').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  const projN2 = svg.append('line').attr('stroke', 'rgba(102,187,106,0.25)').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  const stateLine = svg.append('line').attr('stroke', '#e0e0e0').attr('stroke-width', 2);
  const stateDot = svg.append('circle').attr('r', 4).attr('fill', '#e0e0e0');
  const l0 = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '11px').text('|0⟩');
  const l1 = svg.append('text').attr('fill', '#5c9ce6').attr('font-size', '11px').text('|1⟩');
  const l0p = svg.append('text').attr('fill', '#66bb6a').attr('font-size', '11px').text("|0'⟩");
  const l1p = svg.append('text').attr('fill', '#66bb6a').attr('font-size', '11px').text("|1'⟩");

  const stateAngle = document.getElementById('basis-state-angle');
  const rotAngle = document.getElementById('basis-rot-angle');
  const stateVal = document.getElementById('basis-state-val');
  const rotVal = document.getElementById('basis-rot-val');
  const outputEl = document.getElementById('basis-change-output');

  function update() {
    const sa = -(stateAngle.value * Math.PI / 180);
    const ra = -(rotAngle.value * Math.PI / 180);
    stateVal.textContent = stateAngle.value + '°';
    rotVal.textContent = rotAngle.value + '°';

    origX.attr('x1', cx - R * 1.1).attr('y1', cy).attr('x2', cx + R * 1.1).attr('y2', cy);
    origY.attr('x1', cx).attr('y1', cy + R * 1.1).attr('x2', cx).attr('y2', cy - R * 1.1);
    l0.attr('x', cx + R * 1.1 + 5).attr('y', cy + 4);
    l1.attr('x', cx - 5).attr('y', cy - R * 1.1 - 5);

    const nx = Math.cos(ra), ny = Math.sin(ra);
    newX.attr('x1', cx - R * 1.1 * nx).attr('y1', cy - R * 1.1 * ny)
      .attr('x2', cx + R * 1.1 * nx).attr('y2', cy + R * 1.1 * ny);
    newY.attr('x1', cx - R * 1.1 * (-ny)).attr('y1', cy - R * 1.1 * nx)
      .attr('x2', cx + R * 1.1 * (-ny)).attr('y2', cy + R * 1.1 * nx);
    l0p.attr('x', cx + R * 1.1 * nx + 5).attr('y', cy + R * 1.1 * ny + 4);
    l1p.attr('x', cx + R * 1.1 * (-ny) + 5).attr('y', cy + R * 1.1 * nx + 4);

    const sx = Math.cos(sa), sy = Math.sin(sa);
    const ex = cx + R * sx, ey = cy + R * sy;
    stateLine.attr('x1', cx).attr('y1', cy).attr('x2', ex).attr('y2', ey);
    stateDot.attr('cx', ex).attr('cy', ey);

    const c0 = sx, c1 = -sy;
    const c0p = sx * nx + sy * ny;
    const c1p = sx * (-ny) + sy * nx;

    projO1.attr('x1', ex).attr('y1', ey).attr('x2', ex).attr('y2', cy);
    projO2.attr('x1', ex).attr('y1', ey).attr('x2', cx).attr('y2', ey);
    const p1x = cx + c0p * R * nx, p1y = cy + c0p * R * ny;
    projN1.attr('x1', ex).attr('y1', ey).attr('x2', p1x).attr('y2', p1y);
    const p2x = cx + c1p * R * (-ny), p2y = cy + c1p * R * nx;
    projN2.attr('x1', ex).attr('y1', ey).attr('x2', p2x).attr('y2', p2y);

    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Original</span><span class="output-value">${c0.toFixed(3)}|0⟩ + ${c1.toFixed(3)}|1⟩</span></div>
      <div class="output-row"><span class="output-label">Rotated</span><span class="output-value">${c0p.toFixed(3)}|0'⟩ + ${c1p.toFixed(3)}|1'⟩</span></div>
      <div class="output-row"><span class="output-label">|c₀|² + |c₁|²</span><span class="output-value">${(c0 * c0 + c1 * c1).toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label">|c₀'|² + |c₁'|²</span><span class="output-value">${(c0p * c0p + c1p * c1p).toFixed(4)}</span></div>`;
  }
  stateAngle.addEventListener('input', update);
  rotAngle.addEventListener('input', update);
  update();
}


/* ───── WAVEFUNCTION ───── */
function initWavefunction() {
  const container = document.getElementById('wavefunction-viz');
  if (!container) return;
  const width = container.clientWidth, height = 280;
  const margin = { top: 20, right: 20, bottom: 35, left: 40 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const svg = d3.select('#wavefunction-viz').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().domain([-6, 6]).range([0, w]);
  const yScale = d3.scaleLinear().domain([-1, 1]).range([h, 0]);

  g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xScale).ticks(6))
    .selectAll('text').attr('fill', '#555').attr('font-size', '9px');
  g.append('g').call(d3.axisLeft(yScale).ticks(4))
    .selectAll('text').attr('fill', '#555').attr('font-size', '9px');
  g.selectAll('.domain, .tick line').attr('stroke', '#1a1a28');

  g.append('text').attr('x', w / 2).attr('y', h + 30).attr('text-anchor', 'middle')
    .attr('fill', '#555').attr('font-size', '11px').text('x');

  const probArea = g.append('path').attr('fill', 'rgba(92,156,230,0.12)');
  const lineGen = d3.line().x(d => xScale(d[0])).y(d => yScale(d[1])).curve(d3.curveBasis);
  const areaGen = d3.area().x(d => xScale(d[0])).y0(yScale(0)).y1(d => yScale(d[2])).curve(d3.curveBasis);
  const psiPath = g.append('path').attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 2);
  const probPath = g.append('path').attr('fill', 'none').attr('stroke', 'rgba(92,156,230,0.4)').attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,3');

  let currentWF = 'gaussian';
  const paramSlider = document.getElementById('wf-param');
  const centerSlider = document.getElementById('wf-center');
  const paramVal = document.getElementById('wf-param-val');
  const centerVal = document.getElementById('wf-center-val');
  const outputEl = document.getElementById('wavefunction-output');

  document.querySelectorAll('[data-wf]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-wf]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentWF = btn.dataset.wf;
      update();
    });
  });

  function wf(x, sigma, x0) {
    switch (currentWF) {
      case 'gaussian': return Math.pow(1 / (2 * Math.PI * sigma * sigma), 0.25) * Math.exp(-(x - x0) * (x - x0) / (4 * sigma * sigma));
      case 'plane-wave': return Math.cos(x0 * x) * Math.exp(-x * x / (4 * sigma * sigma)) * 0.8;
      case 'superposition': return 0.6 * (Math.exp(-(x - 1.5) * (x - 1.5) / (2 * sigma * sigma)) + Math.exp(-(x + 1.5) * (x + 1.5) / (2 * sigma * sigma)));
      case 'box': { const L = sigma * 4; return Math.abs(x) > L / 2 ? 0 : Math.sqrt(2 / L) * Math.sin(3 * Math.PI * (x + L / 2) / L); }
      default: return 0;
    }
  }

  function update() {
    const sigma = paramSlider.value / 100;
    const x0 = (centerSlider.value - 100) / 30;
    paramVal.textContent = sigma.toFixed(2);
    centerVal.textContent = x0.toFixed(2);

    const data = [];
    for (let x = -6; x <= 6; x += 0.05) { const v = wf(x, sigma, x0); data.push([x, v, v * v]); }
    const maxP = d3.max(data, d => Math.abs(d[1]));
    const s = maxP > 0 ? 0.9 / maxP : 1;
    const scaled = data.map(d => [d[0], d[1] * s, d[2] * s * s]);

    yScale.domain([-1, 1]);
    psiPath.attr('d', lineGen(scaled));
    probArea.attr('d', areaGen(scaled));
    probPath.attr('d', d3.line().x(d => xScale(d[0])).y(d => yScale(d[2])).curve(d3.curveBasis)(scaled));

    const norm2 = data.reduce((sum, d) => sum + d[2] * 0.05, 0);
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Type</span><span class="output-value">${currentWF}</span></div>
      <div class="output-row"><span class="output-label">∫|ψ(x)|²dx ≈</span><span class="output-value">${norm2.toFixed(4)}</span></div>
      <div class="output-row"><span class="output-label" style="color:#555">Blue = Re[ψ(x)], shaded = |ψ(x)|²</span></div>`;
  }
  paramSlider.addEventListener('input', update);
  centerSlider.addEventListener('input', update);
  update();
}


/* ───── FOURIER TRANSFORM ───── */
function initFourier() {
  const container = document.getElementById('fourier-viz');
  if (!container) return;
  const width = container.clientWidth, height = 400;
  const margin = { top: 22, right: 20, bottom: 25, left: 40 };
  const halfH = (height - 25) / 2;
  const w = width - margin.left - margin.right;
  const h = halfH - margin.top - margin.bottom;

  const svg = d3.select('#fourier-viz').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const gPos = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const xSP = d3.scaleLinear().domain([-6, 6]).range([0, w]);
  const ySP = d3.scaleLinear().domain([-1, 1]).range([h, 0]);
  gPos.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xSP).ticks(6)).selectAll('text').attr('fill', '#555').attr('font-size', '9px');
  gPos.append('g').call(d3.axisLeft(ySP).ticks(3)).selectAll('text').attr('fill', '#555').attr('font-size', '9px');
  gPos.selectAll('.domain, .tick line').attr('stroke', '#1a1a28');
  gPos.append('text').attr('x', w / 2).attr('y', -6).attr('text-anchor', 'middle')
    .attr('fill', '#5c9ce6').attr('font-size', '11px').text('ψ(x) — position');

  const posArea = gPos.append('path').attr('fill', 'rgba(92,156,230,0.12)');
  const posLine = gPos.append('path').attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 2);

  const gMom = svg.append('g').attr('transform', `translate(${margin.left},${halfH + margin.top + 3})`);
  const xSM = d3.scaleLinear().domain([-6, 6]).range([0, w]);
  const ySM = d3.scaleLinear().domain([-1, 1]).range([h, 0]);
  gMom.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xSM).ticks(6)).selectAll('text').attr('fill', '#555').attr('font-size', '9px');
  gMom.append('g').call(d3.axisLeft(ySM).ticks(3)).selectAll('text').attr('fill', '#555').attr('font-size', '9px');
  gMom.selectAll('.domain, .tick line').attr('stroke', '#1a1a28');
  gMom.append('text').attr('x', w / 2).attr('y', -6).attr('text-anchor', 'middle')
    .attr('fill', '#b388ff').attr('font-size', '11px').text('ψ̃(p) — momentum');

  const momArea = gMom.append('path').attr('fill', 'rgba(179,136,255,0.12)');
  const momLine = gMom.append('path').attr('fill', 'none').attr('stroke', '#b388ff').attr('stroke-width', 2);

  svg.append('text').attr('x', width / 2).attr('y', halfH + 2).attr('text-anchor', 'middle')
    .attr('fill', '#ffab40').attr('font-size', '11px').text('⟵ Fourier Transform ⟶');

  const sigmaSlider = document.getElementById('fourier-sigma');
  const k0Slider = document.getElementById('fourier-k0');
  const sigmaVal = document.getElementById('fourier-sigma-val');
  const k0Val = document.getElementById('fourier-k0-val');
  const outputEl = document.getElementById('fourier-output');

  function update() {
    const sigma = sigmaSlider.value / 100;
    const k0 = (k0Slider.value - 100) / 20;
    sigmaVal.textContent = sigma.toFixed(2);
    k0Val.textContent = k0.toFixed(2);
    const sigmaP = 1 / (2 * sigma);

    const posData = [], momData = [];
    for (let x = -6; x <= 6; x += 0.04) {
      const env = Math.exp(-x * x / (4 * sigma * sigma));
      posData.push([x, env * Math.cos(k0 * x), env * env]);
    }
    for (let p = -6; p <= 6; p += 0.04) {
      const g = Math.exp(-(p - k0) * (p - k0) / (4 * sigmaP * sigmaP));
      momData.push([p, g, g * g]);
    }

    const maxP = d3.max(posData, d => Math.abs(d[1]));
    const maxM = d3.max(momData, d => Math.abs(d[1]));
    const sP = maxP > 0 ? 0.85 / maxP : 1;
    const sM = maxM > 0 ? 0.85 / maxM : 1;

    const lG = d3.line().x(d => xSP(d[0])).y(d => ySP(d[1])).curve(d3.curveBasis);
    const aG = d3.area().x(d => xSP(d[0])).y0(ySP(0)).y1(d => ySP(d[2])).curve(d3.curveBasis);
    posLine.attr('d', lG(posData.map(d => [d[0], d[1] * sP, d[2] * sP * sP])));
    posArea.attr('d', aG(posData.map(d => [d[0], d[1] * sP, d[2] * sP * sP])));

    const lM = d3.line().x(d => xSM(d[0])).y(d => ySM(d[1])).curve(d3.curveBasis);
    const aM = d3.area().x(d => xSM(d[0])).y0(ySM(0)).y1(d => ySM(d[2])).curve(d3.curveBasis);
    momLine.attr('d', lM(momData.map(d => [d[0], d[1] * sM, d[2] * sM * sM])));
    momArea.attr('d', aM(momData.map(d => [d[0], d[1] * sM, d[2] * sM * sM])));

    const prod = sigma * sigmaP;
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Δx = σ_x</span><span class="output-value">${sigma.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Δp = 1/(2σ_x)</span><span class="output-value">${sigmaP.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Δx · Δp</span><span class="output-value">${prod.toFixed(4)} ${prod <= 0.501 ? '= ℏ/2 (minimum!)' : '≥ ℏ/2 ✓'}</span></div>
      <div class="output-row"><span class="output-label">k₀</span><span class="output-value">${k0.toFixed(2)}</span></div>`;
  }
  sigmaSlider.addEventListener('input', update);
  k0Slider.addEventListener('input', update);
  update();
}


/* ───── UNCERTAINTY PRINCIPLE ───── */
function initUncertainty() {
  const container = document.getElementById('uncertainty-viz');
  if (!container) return;
  const width = container.clientWidth, height = 280;
  const margin = { top: 18, right: 20, bottom: 25, left: 40 };
  const halfW = (width - margin.left - margin.right) / 2 - 12;
  const h = height - margin.top - margin.bottom;

  const svg = d3.select('#uncertainty-viz').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

  // Left: position
  const gX = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const xSX = d3.scaleLinear().domain([-5, 5]).range([0, halfW]);
  const ySX = d3.scaleLinear().domain([0, 1]).range([h, 0]);
  gX.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xSX).ticks(4)).selectAll('text').attr('fill', '#555').attr('font-size', '9px');
  gX.selectAll('.domain, .tick line').attr('stroke', '#1a1a28');
  gX.append('text').attr('x', halfW / 2).attr('y', -4).attr('text-anchor', 'middle')
    .attr('fill', '#5c9ce6').attr('font-size', '10px').text('|ψ(x)|² — position');

  const xArea = gX.append('path').attr('fill', 'rgba(92,156,230,0.15)');
  const xLine = gX.append('path').attr('fill', 'none').attr('stroke', '#5c9ce6').attr('stroke-width', 2);
  const dxL1 = gX.append('line').attr('stroke', '#ffab40').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  const dxL2 = gX.append('line').attr('stroke', '#ffab40').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  const dxLab = gX.append('text').attr('fill', '#ffab40').attr('font-size', '10px').attr('text-anchor', 'middle');

  // Right: momentum
  const gP = svg.append('g').attr('transform', `translate(${margin.left + halfW + 24},${margin.top})`);
  const xSP = d3.scaleLinear().domain([-5, 5]).range([0, halfW]);
  const ySP = d3.scaleLinear().domain([0, 1]).range([h, 0]);
  gP.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xSP).ticks(4)).selectAll('text').attr('fill', '#555').attr('font-size', '9px');
  gP.selectAll('.domain, .tick line').attr('stroke', '#1a1a28');
  gP.append('text').attr('x', halfW / 2).attr('y', -4).attr('text-anchor', 'middle')
    .attr('fill', '#b388ff').attr('font-size', '10px').text('|ψ̃(p)|² — momentum');

  const pArea = gP.append('path').attr('fill', 'rgba(179,136,255,0.15)');
  const pLine = gP.append('path').attr('fill', 'none').attr('stroke', '#b388ff').attr('stroke-width', 2);
  const dpL1 = gP.append('line').attr('stroke', '#ffab40').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  const dpL2 = gP.append('line').attr('stroke', '#ffab40').attr('stroke-width', 1).attr('stroke-dasharray', '3,3');
  const dpLab = gP.append('text').attr('fill', '#ffab40').attr('font-size', '10px').attr('text-anchor', 'middle');

  const dxSlider = document.getElementById('uncert-dx');
  const dxVal = document.getElementById('uncert-dx-val');
  const outputEl = document.getElementById('uncertainty-output');

  function update() {
    const dx = dxSlider.value / 100;
    const dp = 0.5 / dx;
    dxVal.textContent = dx.toFixed(2);

    const xData = [], pData = [];
    for (let x = -5; x <= 5; x += 0.05) xData.push([x, Math.exp(-x * x / (2 * dx * dx)) / (dx * Math.sqrt(2 * Math.PI))]);
    for (let p = -5; p <= 5; p += 0.05) pData.push([p, Math.exp(-p * p / (2 * dp * dp)) / (dp * Math.sqrt(2 * Math.PI))]);

    const maxX = d3.max(xData, d => d[1]);
    const maxP = d3.max(pData, d => d[1]);
    ySX.domain([0, maxX * 1.2]);
    ySP.domain([0, maxP * 1.2]);

    xLine.attr('d', d3.line().x(d => xSX(d[0])).y(d => ySX(d[1])).curve(d3.curveBasis)(xData));
    xArea.attr('d', d3.area().x(d => xSX(d[0])).y0(h).y1(d => ySX(d[1])).curve(d3.curveBasis)(xData));
    pLine.attr('d', d3.line().x(d => xSP(d[0])).y(d => ySP(d[1])).curve(d3.curveBasis)(pData));
    pArea.attr('d', d3.area().x(d => xSP(d[0])).y0(h).y1(d => ySP(d[1])).curve(d3.curveBasis)(pData));

    dxL1.attr('x1', xSX(-dx)).attr('y1', 0).attr('x2', xSX(-dx)).attr('y2', h);
    dxL2.attr('x1', xSX(dx)).attr('y1', 0).attr('x2', xSX(dx)).attr('y2', h);
    dxLab.attr('x', xSX(0)).attr('y', h - 6).text(`σ_x = ${dx.toFixed(2)}`);
    dpL1.attr('x1', xSP(-dp)).attr('y1', 0).attr('x2', xSP(-dp)).attr('y2', h);
    dpL2.attr('x1', xSP(dp)).attr('y1', 0).attr('x2', xSP(dp)).attr('y2', h);
    dpLab.attr('x', xSP(0)).attr('y', h - 6).text(`σ_p = ${dp.toFixed(2)}`);

    const prod = dx * dp;
    outputEl.innerHTML = `
      <div class="output-row"><span class="output-label">Δx</span><span class="output-value">${dx.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Δp = 1/(2Δx)</span><span class="output-value">${dp.toFixed(3)}</span></div>
      <div class="output-row"><span class="output-label">Δx · Δp</span><span class="output-value">${prod.toFixed(4)} ${prod <= 0.501 ? '= ℏ/2 (minimum!)' : '≥ ℏ/2 ✓'}</span></div>
      <div class="output-row"><span class="output-label">Bound (ℏ/2)</span><span class="output-value">0.5000</span></div>`;
  }
  dxSlider.addEventListener('input', update);
  update();
}


/* ───── EXERCISES ───── */
window.checkExercise = function (n) {
  const input = document.getElementById(`ex${n}-answer`);
  const feedback = document.getElementById(`ex${n}-feedback`);
  const val = input.value.trim().toLowerCase().replace(/\s+/g, '');

  const answers = {
    1: { check: v => v === '0', msg: '⟨+|−⟩ = ½(⟨0|+⟨1|)(|0⟩−|1⟩) = ½(1−1) = 0. Orthogonal!' },
    2: { check: v => v === '1/3' || v === '0.333' || v === '0.33', msg: '|⟨0|ψ⟩|² = |1/√3|² = 1/3 ≈ 0.333.' },
    3: { check: v => (v.includes('1/√2') && v.includes('|0') && v.includes('-') && v.includes('|1')) || v === '|-⟩' || v === '|->',
         msg: 'σ_z|+⟩ = (1/√2)(|0⟩ − |1⟩) = |−⟩. Pauli-Z flips the relative phase.' },
    4: { check: v => v === '1/4' || v === '0.25', msg: 'Δp ≥ 1/(2·2) = 1/4 = 0.25.' },
    5: { check: v => v === 'p' || v.includes('+><+') || v.includes('+⟩⟨+') || v === '|+><+|' || v === '|+⟩⟨+|',
         msg: 'P² = |+⟩⟨+|+⟩⟨+| = |+⟩(⟨+|+⟩)⟨+| = |+⟩⟨+| = P. Idempotent!' },
    6: { check: v => v === '0', msg: '⟨0|σ_x|0⟩ = ⟨0|1⟩ = 0. The state |0⟩ has zero expectation of σ_x.' },
    7: { check: v => v === '1/2' || v === '0.5' || v === '0.50', msg: '⟨+|ψ⟩ = (1/2)(1+i), so |⟨+|ψ⟩|² = (1+1)/4 = 1/2.' },
    8: { check: v => v === '-2i' || v === '-2iσy' || v === '-2i*σy' || v === '-2isy',
         msg: '[σ_x,σ_z] = σ_xσ_z − σ_zσ_x = -iσ_y − iσ_y = -2iσ_y.' }
  };

  if (!answers[n]) return;
  if (answers[n].check(val)) {
    feedback.className = 'feedback correct';
    feedback.textContent = '✓ ' + answers[n].msg;
  } else {
    feedback.className = 'feedback incorrect';
    feedback.textContent = '✗ Not quite — try again.';
  }
};


/* ───── UTILITIES ───── */
function fmtAngle(r) {
  const π = Math.PI;
  if (Math.abs(r) < 0.01) return '0';
  if (Math.abs(r - π) < 0.03) return 'π';
  if (Math.abs(r - π / 2) < 0.03) return 'π/2';
  if (Math.abs(r - π / 3) < 0.03) return 'π/3';
  if (Math.abs(r - π / 4) < 0.03) return 'π/4';
  if (Math.abs(r - π / 6) < 0.03) return 'π/6';
  if (Math.abs(r - 2 * π / 3) < 0.03) return '2π/3';
  if (Math.abs(r - 3 * π / 4) < 0.03) return '3π/4';
  if (Math.abs(r - 2 * π) < 0.03) return '2π';
  return r.toFixed(2);
}

function fmtComplex(re, im) {
  if (Math.abs(im) < 0.001) return re.toFixed(3);
  if (Math.abs(re) < 0.001) return im.toFixed(3) + 'i';
  return `${re.toFixed(3)} ${im >= 0 ? '+' : '-'} ${Math.abs(im).toFixed(3)}i`;
}
