(() => {
  const STORAGE_KEY = 'percentages:v1';
  const MAX_FIELDS = 12;
  const MIN_FIELDS = 1;
  const RADIUS = 80;
  const CIRC = 2 * Math.PI * RADIUS;
  const GAP = 3;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const ICON_REMOVE =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  const $ = (id) => document.getElementById(id);
  const els = {
    layout: $('layout'),
    rows: $('rows'),
    add: $('add'),
    reset: $('reset'),
    segments: $('segments'),
    stack: $('stack'),
    centerLabel: $('center-label'),
    centerValue: $('center-value'),
    statTotal: $('stat-total'),
    statCount: $('stat-count'),
    statTop: $('stat-top'),
  };

  const nodes = new Map();
  let active = null;
  let totalValue = 0;

  const defaults = () => ({
    nextId: 4,
    fields: [
      { id: 1, name: 'Field A', value: '70' },
      { id: 2, name: 'Field B', value: '15' },
      { id: 3, name: 'Field C', value: '15' },
    ],
  });

  const load = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && Array.isArray(raw.fields) && raw.fields.length >= MIN_FIELDS && raw.fields.length <= MAX_FIELDS) {
        const fields = raw.fields.map((f) => ({
          id: Number(f.id),
          name: String(f.name).slice(0, 24),
          value: String(f.value),
        }));
        if (fields.every((f) => Number.isInteger(f.id) && f.id > 0)) {
          return { nextId: Math.max(Number(raw.nextId) || 0, ...fields.map((f) => f.id + 1)), fields };
        }
      }
    } catch {}
    return defaults();
  };

  const state = load();

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  };

  const label = (id) => (id <= 26 ? `Field ${String.fromCharCode(64 + id)}` : `Field ${id}`);
  const colorFor = (id) => `hsl(${Math.round((id * 137.508 + 250) % 360)} 78% 64%)`;
  const clean = (v) => v.replace(/[^\d.,]/g, '');
  const parse = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const fmtNum = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fmtPct = (n) => `${fmtNum(n)}%`;
  const displayName = (f) => f.name.trim() || 'Unnamed';

  const tween = (el, to, fmt, instant = false) => {
    cancelAnimationFrame(el._raf);
    const from = el._cur ?? 0;
    if (instant || motionQuery.matches || from === to) {
      el._cur = to;
      el.textContent = fmt(to);
      return;
    }
    const start = performance.now();
    const duration = 500;
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el._cur = from + (to - from) * eased;
      el.textContent = fmt(el._cur);
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  };

  const renderCenter = () => {
    const field = state.fields.find((f) => f.id === active);
    const node = field && nodes.get(field.id);
    const mode = node ? 'pct' : 'total';
    const instant = els.centerValue._mode !== mode;
    els.centerValue._mode = mode;
    if (node) {
      els.centerLabel.textContent = displayName(field);
      tween(els.centerValue, node.share, fmtPct, instant);
    } else {
      els.centerLabel.textContent = 'Total';
      tween(els.centerValue, totalValue, fmtNum, instant);
    }
  };

  const setActive = (id) => {
    active = id;
    els.layout.classList.toggle('has-active', id !== null);
    nodes.forEach((node, nodeId) => {
      const on = nodeId === id;
      node.row.classList.toggle('active', on);
      node.seg.classList.toggle('active', on);
      node.stackSeg.classList.toggle('active', on);
    });
    renderCenter();
  };

  const bindHover = (target, id, keepOnFocus = false) => {
    target.addEventListener('pointerenter', () => setActive(id));
    target.addEventListener('pointerleave', () => {
      if (keepOnFocus && target.contains(document.activeElement)) return;
      setActive(null);
    });
  };

  const mount = (field, delay = 0) => {
    const color = colorFor(field.id);

    const row = document.createElement('li');
    row.className = 'row';
    row.style.setProperty('--c', color);
    row.style.animationDelay = `${delay}ms`;
    row.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <input class="name" type="text" maxlength="24" aria-label="Field name" spellcheck="false" autocomplete="off">
      <input class="value" type="text" inputmode="decimal" placeholder="0" aria-label="Value" autocomplete="off">
      <div class="share">
        <div class="share-top"><span class="badge">Largest</span><span class="pct">0%</span></div>
        <span class="meter"><span class="meter-fill"></span></span>
      </div>
      <button class="icon-btn remove" type="button" aria-label="Remove field">${ICON_REMOVE}</button>`;

    const nameInput = row.querySelector('.name');
    const valueInput = row.querySelector('.value');
    nameInput.value = field.name;
    valueInput.value = field.value;

    const seg = document.createElementNS(SVG_NS, 'circle');
    seg.setAttribute('class', 'seg');
    seg.setAttribute('cx', '100');
    seg.setAttribute('cy', '100');
    seg.setAttribute('r', String(RADIUS));
    seg.style.stroke = color;
    seg.style.color = color;

    const stackSeg = document.createElement('div');
    stackSeg.className = 'stack-seg';
    stackSeg.style.background = color;
    stackSeg.style.color = color;

    els.rows.appendChild(row);
    els.segments.appendChild(seg);
    els.stack.appendChild(stackSeg);
    seg.getBoundingClientRect();
    stackSeg.getBoundingClientRect();

    const node = {
      row,
      seg,
      stackSeg,
      share: 0,
      pct: row.querySelector('.pct'),
      fill: row.querySelector('.meter-fill'),
    };
    nodes.set(field.id, node);

    nameInput.addEventListener('input', () => {
      field.name = nameInput.value;
      update();
      save();
    });

    valueInput.addEventListener('input', () => {
      const cleaned = clean(valueInput.value);
      if (cleaned !== valueInput.value) valueInput.value = cleaned;
      field.value = cleaned;
      update();
      save();
    });

    row.querySelector('.remove').addEventListener('click', () => removeField(field.id));

    bindHover(row, field.id, true);
    bindHover(seg, field.id);
    bindHover(stackSeg, field.id);
    row.addEventListener('focusin', () => setActive(field.id));
    row.addEventListener('focusout', () => {
      if (!row.matches(':hover')) setActive(null);
    });

    return node;
  };

  const collapse = (row) => {
    row.style.pointerEvents = 'none';
    if (motionQuery.matches) {
      row.remove();
      return;
    }
    row.style.maxHeight = `${row.offsetHeight}px`;
    row.getBoundingClientRect();
    row.classList.add('leaving');
    setTimeout(() => row.remove(), 380);
  };

  const removeField = (id) => {
    if (state.fields.length <= MIN_FIELDS) return;
    const node = nodes.get(id);
    if (!node) return;
    state.fields = state.fields.filter((f) => f.id !== id);
    nodes.delete(id);
    if (active === id) setActive(null);

    node.seg.style.strokeDasharray = `0 ${CIRC}`;
    node.stackSeg.style.width = '0%';
    setTimeout(() => {
      node.seg.remove();
      node.stackSeg.remove();
    }, 850);
    collapse(node.row);

    update();
    save();
  };

  const addField = () => {
    if (state.fields.length >= MAX_FIELDS) return;
    const field = { id: state.nextId++, name: label(state.nextId - 1), value: '' };
    state.fields.push(field);
    const node = mount(field);
    update();
    save();
    node.row.querySelector('.value').focus();
  };

  const clearValues = () => {
    state.fields.forEach((f) => {
      f.value = '';
      nodes.get(f.id).row.querySelector('.value').value = '';
    });
    update();
    save();
  };

  const syncControls = () => {
    const count = state.fields.length;
    els.add.disabled = count >= MAX_FIELDS;
    els.add.title = count >= MAX_FIELDS ? `Maximum of ${MAX_FIELDS} fields` : '';
    nodes.forEach((node) => {
      node.row.querySelector('.remove').disabled = count <= MIN_FIELDS;
    });
  };

  const update = () => {
    const nums = state.fields.map((f) => parse(f.value));
    const total = nums.reduce((a, b) => a + b, 0);
    const visible = nums.filter((n) => n > 0).length;
    const max = Math.max(...nums);
    const leaders = nums.filter((n) => n > 0 && n === max).length;
    let offset = 0;
    let topField = null;

    state.fields.forEach((f, i) => {
      const node = nodes.get(f.id);
      const share = total > 0 ? (nums[i] / total) * 100 : 0;
      const arc = (share / 100) * CIRC;
      const drawn = visible > 1 ? Math.max(arc - GAP, 0) : arc;
      const isTop = leaders === 1 && nums[i] === max;

      node.share = share;
      node.seg.style.strokeDasharray = `${drawn} ${CIRC - drawn}`;
      node.seg.style.strokeDashoffset = String(-offset);
      node.stackSeg.style.width = `${share}%`;
      node.stackSeg.title = `${displayName(f)}: ${fmtPct(share)}`;
      node.fill.style.width = `${share}%`;
      node.row.classList.toggle('top', isTop);
      tween(node.pct, share, fmtPct);

      if (isTop) topField = f;
      offset += arc;
    });

    totalValue = total;
    els.statTotal.textContent = fmtNum(total);
    els.statCount.textContent = String(state.fields.length);
    if (topField) {
      els.statTop.textContent = `${displayName(topField)} · ${fmtPct(nodes.get(topField.id).share)}`;
    } else {
      els.statTop.textContent = leaders > 1 ? 'Tie' : '—';
    }

    renderCenter();
    syncControls();
  };

  els.add.addEventListener('click', addField);
  els.reset.addEventListener('click', clearValues);

  state.fields.forEach((f, i) => mount(f, i * 70));
  update();
})();
