// ================================================================
//  Toronto Climate Explorer — Enhanced Interactive Dashboard
//  Features:
//    · Focus + context brush (zoom/pan over time)
//    · Dual y-axis: Max Temp (line) + Precipitation (bars)
//    · Scatterplot: Temp vs Precip, colour-coded by season
//    · Linear regression trend line on scatter
//    · Season filter (dynamic query) — buttons + legend
//    · Period statistics panel (live-updating)
//    · Crosshair + tooltip on focus hover
//    · Animated enter/update/exit transitions
// ================================================================

// ── Colour Palette ───────────────────────────────────────────────
const C = {
    temp:   '#ff7b72',
    cold:   '#79c0ff',
    precip: '#58a6ff',
    muted:  '#7d8590',
    grid:   '#21262d',
    border: '#30363d',
    text:   '#e6edf3',
  };
  
  const SEASONS = {
    winter: { months: [11, 0, 1], color: '#58a6ff', label: 'Winter' },
    spring: { months: [2, 3, 4],  color: '#56d364', label: 'Spring' },
    summer: { months: [5, 6, 7],  color: '#f0883e', label: 'Summer' },
    fall:   { months: [8, 9, 10], color: '#d2a8ff', label: 'Fall'   },
  };
  
  function getSeason(date) {
    const m = date.getMonth();
    if (m === 11 || m <= 1)  return 'winter';
    if (m >= 2  && m <= 4)   return 'spring';
    if (m >= 5  && m <= 7)   return 'summer';
    return 'fall';
  }
  
  // ── Dimensions ───────────────────────────────────────────────────
  const mF   = { top: 18, right: 58, bottom: 28, left: 52 };
  const wF   = 820 - mF.left   - mF.right;
  const hF   = 330 - mF.top    - mF.bottom;
  
  const mCtx = { top: 6,  right: 58, bottom: 22, left: 52 };
  const hCtx = 72  - mCtx.top  - mCtx.bottom;
  
  const mSc  = { top: 10, right: 18, bottom: 48, left: 52 };
  const wSc  = 400 - mSc.left  - mSc.right;
  const hSc  = 310 - mSc.top   - mSc.bottom;
  
  const parseDate = d3.timeParse('%Y-%m-%d');
  const fmtDate   = d3.timeFormat('%b %d, %Y');
  
  // ── SVG Helpers ──────────────────────────────────────────────────
  function mkSvg(sel, w, h, m) {
    return d3.select(sel).append('svg')
      .attr('viewBox', `0 0 ${w + m.left + m.right} ${h + m.top + m.bottom}`)
      .append('g').attr('transform', `translate(${m.left},${m.top})`);
  }
  
  function styleAx(g) {
    g.selectAll('.tick text')
      .style('font-family', "'IBM Plex Mono',monospace")
      .style('font-size', '9.5px')
      .style('fill', C.muted);
    g.selectAll('.domain,.tick line').style('stroke', C.border);
  }
  
  // ── Linear Regression ────────────────────────────────────────────
  function linReg(data, xFn, yFn) {
    const n = data.length;
    if (n < 5) return null;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    data.forEach(d => {
      const x = xFn(d), y = yFn(d);
      sx += x; sy += y; sxy += x * y; sxx += x * x;
    });
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-9) return null;
    const slope = (n * sxy - sx * sy) / denom;
    const int   = (sy - slope * sx) / n;
    return { slope, int, at: x => slope * x + int };
  }
  
  // ── SVG Setup ────────────────────────────────────────────────────
  const svgF   = mkSvg('#focus-view',   wF,  hF,   mF);
  const svgCtx = mkSvg('#context-view', wF,  hCtx, mCtx);
  const svgSc  = mkSvg('#scatter-view', wSc, hSc,  mSc);
  
  // Clip path so temp line/bars don't bleed outside axes during brush
  svgF.append('defs').append('clipPath').attr('id', 'fc')
    .append('rect').attr('width', wF).attr('height', hF + 4);
  const fClip = svgF.append('g').attr('clip-path', 'url(#fc)');
  
  const tooltip = d3.select('#tooltip');
  
  // ── App State ────────────────────────────────────────────────────
  let activeSeason = 'all';
  let selDates = null;
  
  // ================================================================
  //  Load & Transform Data
  // ================================================================
  d3.csv('weatherstats_toronto_daily.csv').then(raw => {
  
    // Clean + type-cast
    let data = raw
      .map(d => ({
        date:    parseDate(d.date),
        maxTemp: +d.max_temperature,
        precip:  +d.precipitation  || 0,
        rain:    +d.rain            || 0,
        snow:    +d.snow            || 0,
      }))
      .filter(d => d.date && !isNaN(d.maxTemp))
      .filter(d => d.date.getFullYear() >= 2000)
      .sort((a, b) => a.date - b.date);
  
    data.forEach(d => (d.season = getSeason(d.date)));
  
    // ── Scales ─────────────────────────────────────────────────────
    const xExt  = d3.extent(data, d => d.date);
    const tExt  = [d3.min(data, d => d.maxTemp) - 5, d3.max(data, d => d.maxTemp) + 5];
    const pMax  = d3.max(data, d => d.precip);
  
    const xF    = d3.scaleTime().range([0, wF]).domain(xExt);
    const xC    = d3.scaleTime().range([0, wF]).domain(xExt);
    const yT    = d3.scaleLinear().range([hF, 0]).domain(tExt);
    const yTC   = d3.scaleLinear().range([hCtx, 0]).domain(tExt);
    // Precip bars occupy the bottom 32% of the focus area
    const yP    = d3.scaleLinear().range([hF, hF * 0.68]).domain([0, pMax]);
    const xSc   = d3.scaleLinear().range([0, wSc]).domain(tExt);
    const ySc   = d3.scaleLinear().range([hSc, 0]).domain([0, pMax + 5]);
  
    // ── Focus Axes ─────────────────────────────────────────────────
    const axXF  = svgF.append('g').attr('transform', `translate(0,${hF})`);
    const axYT  = svgF.append('g');
    const axYP  = svgF.append('g').attr('transform', `translate(${wF},0)`);
  
    // Horizontal grid lines (temp)
    const gridG = svgF.append('g').attr('class', 'grid-lines');
  
    // y=0 reference line
    svgF.append('line')
      .attr('class', 'zero-line')
      .attr('x1', 0).attr('x2', wF)
      .attr('y1', yT(0)).attr('y2', yT(0))
      .attr('stroke', C.muted).attr('stroke-dasharray', '4 3')
      .attr('opacity', 0.35);
  
    // Axis labels
    svgF.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -hF / 2).attr('y', -38)
      .style('text-anchor', 'middle').text('Max Temp (°C)');
  
    svgF.append('text').attr('class', 'axis-label')
      .attr('x', wF + 46).attr('y', hF * 0.68 + 2)
      .style('text-anchor', 'end')
      .style('fill', C.precip)
      .style('font-size', '9px')
      .text('Precip ↑');
  
    // ── Context Axis + Area ─────────────────────────────────────────
    const axCtx = svgCtx.append('g').attr('transform', `translate(0,${hCtx})`);
    axCtx.call(d3.axisBottom(xC).ticks(8).tickSize(2));
    styleAx(axCtx);
  
    svgCtx.append('path').datum(data)
      .attr('fill', C.temp).attr('opacity', 0.18)
      .attr('d', d3.area().x(d => xC(d.date)).y0(hCtx).y1(d => yTC(d.maxTemp)));
  
    // ── Scatter Axes ────────────────────────────────────────────────
    const axScX = svgSc.append('g').attr('transform', `translate(0,${hSc})`);
    const axScY = svgSc.append('g');
  
    // Scatter grid
    const scGridX = svgSc.append('g').attr('class', 'grid-lines')
      .attr('transform', `translate(0,${hSc})`);
    const scGridY = svgSc.append('g').attr('class', 'grid-lines');
  
    scGridX.call(d3.axisBottom(xSc).ticks(6).tickSize(-hSc).tickFormat(''));
    scGridY.call(d3.axisLeft(ySc).ticks(5).tickSize(-wSc).tickFormat(''));
  
    axScX.call(d3.axisBottom(xSc).ticks(6).tickSize(3));
    axScY.call(d3.axisLeft(ySc).ticks(5).tickSize(3));
    styleAx(axScX); styleAx(axScY);
  
    svgSc.append('text').attr('class', 'axis-label')
      .attr('x', wSc / 2).attr('y', hSc + 40)
      .style('text-anchor', 'middle').text('Max Temperature (°C)');
    svgSc.append('text').attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -hSc / 2).attr('y', -40)
      .style('text-anchor', 'middle').text('Precipitation (mm)');
  
    // ── Focus: Precip bars group ────────────────────────────────────
    const precipG = fClip.append('g').attr('class', 'precip-bars');
  
    // ── Focus: Temperature line ─────────────────────────────────────
    const lineFn = d3.line().x(d => xF(d.date)).y(d => yT(d.maxTemp));
    const focusPath = fClip.append('path').datum(data)
      .attr('fill', 'none')
      .attr('stroke', C.temp)
      .attr('stroke-width', 1.5)
      .attr('d', lineFn);
  
    // ── Focus: Hover crosshair ──────────────────────────────────────
    const hLine = svgF.append('line')
      .attr('y1', 0).attr('y2', hF)
      .attr('stroke', C.muted).attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 3').attr('opacity', 0)
      .style('pointer-events', 'none');
  
    const hDot = svgF.append('circle').attr('r', 4.5)
      .attr('fill', C.temp).attr('stroke', C.text).attr('stroke-width', 1.5)
      .attr('opacity', 0).style('pointer-events', 'none');
  
    const hPDot = svgF.append('circle').attr('r', 3.5)
      .attr('fill', C.precip).attr('stroke', C.text).attr('stroke-width', 1)
      .attr('opacity', 0).style('pointer-events', 'none');
  
    // Invisible overlay for hover events on focus view
    svgF.append('rect')
      .attr('width', wF).attr('height', hF)
      .attr('fill', 'none').attr('pointer-events', 'all')
      .style('cursor', 'crosshair')
      .on('mousemove', onFocusMove)
      .on('mouseleave', clearHover);
  
    // ── Scatter: Trend line & dots ──────────────────────────────────
    const dotsG     = svgSc.append('g');
    const trendSel  = svgSc.append('line')
      .attr('stroke', 'white').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5 4').attr('opacity', 0);
    const trendLbl  = svgSc.append('text').attr('class', 'axis-label')
      .attr('x', wSc - 3).attr('y', 12).style('text-anchor', 'end');
  
    // Scatter dot tooltip dot indicator
    const scHDot = svgSc.append('circle').attr('r', 0)
      .attr('fill', 'none').attr('stroke', C.text).attr('stroke-width', 1.5)
      .style('pointer-events', 'none');
  
    // ── Season Legend ───────────────────────────────────────────────
    const legendEl = d3.select('#season-legend');
    Object.entries(SEASONS).forEach(([key, s]) => {
      const item = legendEl.append('div').attr('class', 'legend-item')
        .attr('data-season', key).on('click', () => setFilter(key));
      item.append('div').attr('class', 'legend-dot').style('background', s.color);
      item.append('span').text(s.label);
    });
  
    // ── Brush ───────────────────────────────────────────────────────
    const brush = d3.brushX()
      .extent([[0, 0], [wF, hCtx]])
      .on('brush end', onBrush);
  
    const brushG = svgCtx.append('g').attr('class', 'brush').call(brush);
    // Default selection: 2020
    brushG.call(brush.move, [xC(new Date(2020, 0, 1)), xC(new Date(2021, 0, 1))]);
  
    // ── Season Buttons ──────────────────────────────────────────────
    d3.selectAll('.season-btn').on('click', function () {
      setFilter(this.dataset.season);
    });
  
    // ================================================================
    //  Core Update Functions
    // ================================================================
  
    function onBrush(event) {
      const sel = event.selection;
      selDates  = sel ? sel.map(xC.invert, xC) : xC.domain();
      xF.domain(selDates);
      updateFocus();
      updateScatter();
      updateStats();
    }
  
    // ── Dynamic Season Filter ────────────────────────────────────────
    function setFilter(season) {
      activeSeason = season;
  
      // Buttons
      d3.selectAll('.season-btn').classed('active', false);
      d3.select(`.season-btn[data-season="${season}"]`).classed('active', true);
  
      // Legend opacity
      d3.selectAll('.legend-item').style('opacity', season === 'all' ? 1 : 0.3);
      if (season !== 'all') {
        d3.select(`.legend-item[data-season="${season}"]`).style('opacity', 1);
      }
  
      updateScatter();
    }
  
    function getFiltered() {
      if (!selDates) return [];
      let d = data.filter(x => x.date >= selDates[0] && x.date <= selDates[1]);
      if (activeSeason !== 'all') d = d.filter(x => x.season === activeSeason);
      return d;
    }
  
    // ── Focus View Update ────────────────────────────────────────────
    function updateFocus() {
      // Re-render temp line
      focusPath.attr('d', lineFn);
  
      // Axes
      axXF.call(d3.axisBottom(xF).ticks(6).tickSize(3));
      axYT.call(d3.axisLeft(yT).ticks(6).tickSize(3));
      styleAx(axXF); styleAx(axYT);
  
      // Grid
      gridG.call(d3.axisLeft(yT).ticks(6).tickSize(-wF).tickFormat(''));
      gridG.selectAll('.tick line').style('stroke', C.grid).style('stroke-dasharray', '2 5');
      gridG.select('.domain').remove();
  
      // Precip bars: shown only when selection ≤ 400 days (readable scale)
      const [d0, d1]  = xF.domain();
      const daySpan   = (d1 - d0) / 864e5;
      const visible   = data.filter(d => d.date >= d0 && d.date <= d1);
      const bw        = Math.max(1, Math.floor(wF / visible.length * 0.78));
  
      if (daySpan <= 400 && visible.length > 0) {
        precipG.selectAll('.pb').data(visible, d => d.date)
          .join(
            e => e.append('rect').attr('class', 'pb')
              .attr('fill',   d => d.snow > 0 ? '#cdd9e5' : C.precip)
              .attr('opacity', 0.5).attr('rx', 1)
              .attr('x',      d => xF(d.date) - bw / 2)
              .attr('y',      d => yP(d.precip))
              .attr('width',  bw)
              .attr('height', d => hF - yP(d.precip)),
            u => u.call(g => g.transition().duration(200)
              .attr('fill', d => d.snow > 0 ? '#cdd9e5' : C.precip)
              .attr('x',      d => xF(d.date) - bw / 2)
              .attr('y',      d => yP(d.precip))
              .attr('width',  bw)
              .attr('height', d => hF - yP(d.precip))),
            x => x.remove()
          );
  
        axYP.call(d3.axisRight(yP).ticks(3).tickSize(3).tickFormat(d => d + 'mm'));
        styleAx(axYP);
        axYP.selectAll('.tick text').style('fill', C.precip);
      } else {
        precipG.selectAll('.pb').remove();
        axYP.selectAll('*').remove();
        if (daySpan > 400) {
          // Show a hint text prompting user to zoom in
          const hint = svgF.select('.precip-hint');
          if (hint.empty()) {
            svgF.append('text').attr('class', 'precip-hint axis-label')
              .attr('x', wF).attr('y', hF - 4)
              .style('text-anchor', 'end')
              .style('font-size', '9px')
              .style('fill', C.precip)
              .style('opacity', 0.5)
              .text('← zoom in to see precipitation bars');
          }
        }
      }
      svgF.select('.precip-hint').style('opacity', daySpan > 400 ? 0.5 : 0);
    }
  
    // ── Scatter Update ────────────────────────────────────────────────
    function updateScatter() {
      const filtered = getFiltered();
  
      dotsG.selectAll('.dot').data(filtered, d => d.date)
        .join(
          e => e.append('circle').attr('class', 'dot')
            .attr('cx',   d => xSc(d.maxTemp))
            .attr('cy',   d => ySc(d.precip))
            .attr('fill', d => SEASONS[d.season].color)
            .attr('opacity', 0)
            .attr('stroke', 'rgba(0,0,0,0.18)').attr('stroke-width', 0.5)
            .attr('r', 3.5)
            .on('mouseover', onDotOver)
            .on('mouseout',  clearHover)
            .call(e => e.transition().duration(300).attr('opacity', 0.65)),
          u => u
            .on('mouseover', onDotOver)
            .on('mouseout',  clearHover)
            .call(g => g.transition().duration(300)
              .attr('cx',      d => xSc(d.maxTemp))
              .attr('cy',      d => ySc(d.precip))
              .attr('fill',    d => SEASONS[d.season].color)
              .attr('opacity', 0.65)),
          x => x.call(g => g.transition().duration(200).attr('opacity', 0).remove())
        );
  
      // Regression trend line
      if (filtered.length > 10) {
        const reg = linReg(filtered, d => d.maxTemp, d => d.precip);
        if (reg) {
          const [xMin, xMax] = xSc.domain();
          const clamp = (v) => Math.max(0, Math.min(hSc, ySc(v)));
          trendSel
            .attr('x1', xSc(xMin)).attr('y1', clamp(reg.at(xMin)))
            .attr('x2', xSc(xMax)).attr('y2', clamp(reg.at(xMax)))
            .transition().duration(300).attr('opacity', 0.45);
          const sign = reg.slope >= 0 ? '+' : '';
          trendLbl.style('fill', C.muted)
            .text(`slope ${sign}${reg.slope.toFixed(2)} mm/°C`);
        }
      } else {
        trendSel.transition().duration(200).attr('opacity', 0);
        trendLbl.text('');
      }
    }
  
    // ── Stats Panel Update ───────────────────────────────────────────
    function updateStats() {
      if (!selDates) return;
      const [d0, d1] = selDates;
      const pd = data.filter(d => d.date >= d0 && d.date <= d1);
      if (!pd.length) return;
  
      const fmt = v => isNaN(v) ? '—' : v.toFixed(1);
  
      const avgT  = d3.mean(pd, d => d.maxTemp);
      const hotD  = d3.greatest(pd, d => d.maxTemp);
      const coldD = d3.least(pd,    d => d.maxTemp);
      const totP  = d3.sum(pd,      d => d.precip);
      const wetD  = d3.greatest(pd, d => d.precip);
  
      d3.select('#stat-days').text(pd.length.toLocaleString());
      d3.select('#stat-avg-temp').text(`${fmt(avgT)}°`);
      d3.select('#stat-max-temp').text(`${fmt(hotD?.maxTemp)}°`);
      d3.select('#stat-min-temp').text(`${fmt(coldD?.maxTemp)}°`);
      d3.select('#stat-total-precip').text(`${fmt(totP)}mm`);
      d3.select('#stat-max-precip').text(`${fmt(wetD?.precip)}mm`);
    }
  
    // ================================================================
    //  Hover / Tooltip Handlers
    // ================================================================
    const bisect = d3.bisector(d => d.date).left;
  
    function onFocusMove(event) {
      const [mx] = d3.pointer(event);
      const x0   = xF.invert(mx);
      const [lo, hi] = xF.domain();
      if (x0 < lo || x0 > hi) { clearHover(); return; }
  
      // Find nearest data point
      const i  = bisect(data, x0, 1);
      const da = data[i - 1], db = data[i];
      let d = da;
      if (da && db) d = (x0 - da.date > db.date - x0) ? db : da;
      if (!d) return;
  
      const [d0, d1] = xF.domain();
      if (d.date < d0 || d.date > d1) { clearHover(); return; }
  
      const cx = xF(d.date);
      hLine.attr('x1', cx).attr('x2', cx).attr('opacity', 1);
      hDot.attr('cx', cx).attr('cy', yT(d.maxTemp)).attr('opacity', 1);
  
      if (d.precip > 0) {
        hPDot.attr('cx', cx).attr('cy', yP(d.precip)).attr('opacity', 1);
      } else {
        hPDot.attr('opacity', 0);
      }
  
      showTip(event, d);
    }
  
    function onDotOver(event, d) {
      // Highlight ring on scatter
      scHDot.attr('cx', xSc(d.maxTemp)).attr('cy', ySc(d.precip))
        .transition().duration(120).attr('r', 7);
      showTip(event, d);
    }
  
    function showTip(event, d) {
      const seasonInfo = SEASONS[d.season];
      const snowNote = d.snow > 0 ? `<br>Snow: <span style="color:#cdd9e5">${d.snow}mm</span>` : '';
      tooltip
        .style('opacity', 1)
        .style('left', (event.clientX + 16) + 'px')
        .style('top',  (event.clientY - 44) + 'px')
        .html(
          `<strong>${fmtDate(d.date)}</strong>` +
          `Max Temp: <span style="color:${C.temp}">${d.maxTemp}°C</span><br>` +
          `Precip: <span style="color:${C.precip}">${d.precip}mm</span>` +
          snowNote +
          `<br>Season: <span style="color:${seasonInfo.color}">${seasonInfo.label}</span>`
        );
    }
  
    function clearHover() {
      hLine.attr('opacity', 0);
      hDot.attr('opacity', 0);
      hPDot.attr('opacity', 0);
      scHDot.transition().duration(150).attr('r', 0);
      tooltip.style('opacity', 0);
    }
  
  }); // end d3.csv