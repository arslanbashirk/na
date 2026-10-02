(function () {
    'use strict';
    const body = document.body, root = body.dataset.root, el = id => document.getElementById(id);
    const query = new URLSearchParams(location.search);
    const state = { level: ['province', 'division', 'district'].includes(query.get('level')) ? query.get('level') : 'province', a: query.get('a') || '', b: query.get('b') || '', year: query.get('year') || '' };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const clean = s => String(s || '').replace(/ DISTRICT| DIVISION/gi, '').replace('CHIRTAL', 'CHITRAL');
    const num = (n, d = 1) => n == null || !Number.isFinite(n) ? '\u2014' : n.toLocaleString('en', { maximumFractionDigits: d });
    const delta = (a, b) => a != null && b != null ? a - b : null;
    const change = (a, b) => a != null && b != null && b > 0 ? (a / b - 1) * 100 : null;
    const pct = n => n == null ? '\u2014' : (n > 0 ? '+' : '') + num(n) + '%';
    const colorA = '#16816b', colorB = '#c69a37', charts = {}, maps = {}, layers = {}, geometry = {};
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let metadata, datasets, rows = [], filtered = [], controller, serial = 0, mapSerial = 0;
    el('compare-level').value = state.level;
    function status(text, error) { el('status').textContent = text; el('status').className = error ? 'error' : ''; }
    function aggregate(observations) {
        const groups = new Map();
        observations.forEach(r => {
            const id = String(r.CropId);
            if (!groups.has(id)) groups.set(id, { id, name: clean(r.CropName), Area: 0, Production: 0, areas: 0, productions: 0, MissingRows: 0 });
            const g = groups.get(id);
            if (r.Area != null) { g.Area += r.Area; g.areas++; }
            if (r.Production != null) { g.Production += r.Production; g.productions++; }
            g.MissingRows += r.MissingRows || 0;
        });
        return Array.from(groups.values()).map(g => Object.assign(g, { Yield: !g.MissingRows && g.areas && g.productions && g.Area > 0 ? g.Production / g.Area : null, Area: g.areas ? g.Area : null, Production: g.productions ? g.Production : null }));
    }
    function choices() {
        const key = state.level === 'district' ? 'id' : state.level;
        const name = state.level === 'district' ? 'name' : state.level + 'Name';
        const options = Array.from(new Map(metadata.geography.filter(g => g[key] && g[key] !== '0').map(g => [g[key], { id: g[key], name: clean(g[name]) + (state.level === 'district' && g.combined ? ' (combined reporting area)' : '') + (state.level !== 'province' ? ' / ' + clean(g.provinceName) : '') }])).values()).sort((a, b) => a.name.localeCompare(b.name));
        const covered = options.filter(o => metadata.reportingAreas.some(r => r[state.level] === o.id));
        if (!options.some(o => o.id === state.a)) state.a = (covered[0] || options[0])?.id || '';
        if (!options.some(o => o.id === state.b) || state.b === state.a) state.b = (covered.find(o => o.id !== state.a) || options.find(o => o.id !== state.a))?.id || '';
        ['a', 'b'].forEach(side => {
            const other = side === 'a' ? 'b' : 'a';
            el('area-' + side).innerHTML = options.map(o => '<option value="' + esc(o.id) + '"' + (o.id === state[other] ? ' disabled' : '') + '>' + esc(o.name) + '</option>').join('');
            el('area-' + side).value = state[side];
        });
        el('year').innerHTML = metadata.years.map(y => '<option>' + esc(y) + '</option>').join('');
        if (!metadata.years.includes(state.year)) state.year = metadata.year;
        el('year').value = state.year;
    }
    async function load(initial) {
        const seq = ++serial; ++mapSerial;
        if (controller) controller.abort(); controller = new AbortController();
        body.classList.add('busy'); status('Loading both areas and all their crops...');
        try {
            const fetchData = async params => {
                const response = await fetch(body.dataset.api + '?' + new URLSearchParams(params), { signal: controller.signal });
                const data = await response.json(); if (!response.ok) throw Error(data.error || 'Comparison data could not be loaded.'); return data;
            };
            if (initial) { metadata = await fetchData({ crop: 0, metadataOnly: true }); if (seq !== serial) return; choices(); }
            if (!state.a || !state.b || state.a === state.b) throw Error('Choose two different areas at the same geographic level.');
            const data = await Promise.all(['a', 'b'].map(side => fetchData({ crop: 0, year: state.year, [state.level]: state[side] })));
            if (seq !== serial) return;
            datasets = data; window.history.replaceState(null, '', '?' + new URLSearchParams(state));
            render(); status('Data loaded | Two ' + (state.level === 'province' ? 'provinces' : state.level === 'division' ? 'divisions' : 'districts') + ' | All crops | ' + state.year);
        } catch (e) { if (e.name !== 'AbortError' && seq === serial) status(e.message, true); }
        finally { if (seq === serial) body.classList.remove('busy'); }
    }
    function areaName(side) { return el('area-' + side).selectedOptions[0]?.textContent || 'Area ' + side.toUpperCase(); }
    function cropRows(data, year) {
        const previous = new Map(aggregate(data.history.filter(r => r.FiscalYear === data.previous)).map(r => [r.id, r]));
        return aggregate(data.history.filter(r => r.FiscalYear === year)).map(r => Object.assign(r, { Growth: change(r.Production, previous.get(r.id)?.Production), YieldGrowth: change(r.Yield, previous.get(r.id)?.Yield) }));
    }
    function card(title, a, b, note) {
        return '<article class="stat compare-stat"><span class="stat-label">' + title + '</span><div class="compare-stat-values"><div><small>A</small><strong>' + num(a, 0) + '</strong></div><div><small>B</small><strong>' + num(b, 0) + '</strong></div></div><div class="stat-sub">' + note + '</div></article>';
    }
    function insight(title, text) { return '<article class="insight"><strong>' + title + '</strong>' + text + '</article>'; }
    function render() {
        const current = datasets.map(d => cropRows(d, state.year)), lookup = current.map(c => new Map(c.map(r => [r.id, r])));
        rows = Array.from(new Set(current.flatMap(c => c.map(r => r.id)))).map(id => ({ id, name: (lookup[0].get(id) || lookup[1].get(id)).name, a: lookup[0].get(id), b: lookup[1].get(id) })).sort((a, b) => ((b.a?.Area || 0) + (b.b?.Area || 0)) - ((a.a?.Area || 0) + (a.b?.Area || 0)) || a.name.localeCompare(b.name));
        ['a', 'b'].forEach(side => {
            el('name-' + side).textContent = areaName(side); el('map-name-' + side).textContent = areaName(side);
            el('level-' + side).textContent = state.level.toUpperCase() + ' / AREA ' + side.toUpperCase();
            el('profile-' + side).href = root + 'Crops/' + state.level[0].toUpperCase() + state.level.slice(1) + 'Profile?' + new URLSearchParams({ [state.level]: state[side], year: state.year });
        });
        document.querySelectorAll('[data-compare-nav]').forEach(a => {
            const selected = a.dataset.compareNav === state.level;
            a.classList.toggle('active', selected);
            if (selected) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
            a.href = root + 'Crops/AreaComparison?' + new URLSearchParams(selected ? state : { level: a.dataset.compareNav, year: state.year });
        });
        el('hero-year').textContent = state.year;
        const shared = rows.filter(r => r.a && r.b), validYields = shared.filter(r => r.a.Yield != null && r.b.Yield != null);
        const winsA = validYields.filter(r => r.a.Yield > r.b.Yield).length, winsB = validYields.filter(r => r.b.Yield > r.a.Yield).length;
        const districts = datasets.map(d => new Set(d.history.filter(r => r.FiscalYear === state.year).map(r => r.DistrictId)).size);
        el('cards').innerHTML = card('Reported crops', current[0].length, current[1].length, shared.length + ' crops reported in both areas') + card('Reporting areas', districts[0], districts[1], 'Districts and combined reporting areas') + card('Higher crop yields', winsA, winsB, validYields.length + ' valid comparisons; ' + (validYields.length - winsA - winsB) + ' equal yields') + card('Improving crop yields', current[0].filter(r => r.YieldGrowth > 0).length, current[1].filter(r => r.YieldGrowth > 0).length, 'Valid comparisons: A ' + current[0].filter(r => r.YieldGrowth != null).length + ', B ' + current[1].filter(r => r.YieldGrowth != null).length);
        const leading = current.map(c => c.filter(r => r.Area != null).sort((a, b) => b.Area - a.Area)[0]);
        const overlap = rows.length ? shared.length / rows.length * 100 : null;
        const gaps = validYields.map(r => ({ row: r, gap: change(r.a.Yield, r.b.Yield) })).filter(r => r.gap != null).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
        el('insights').innerHTML = insight('A shared harvest', '<b>' + shared.length + '</b> shared crops' + (overlap == null ? '.' : ' account for <b>' + num(overlap) + '%</b> of the distinct crops reported across both areas.') + ' ' + rows.filter(r => r.a && !r.b).length + ' are reported only in A; ' + rows.filter(r => r.b && !r.a).length + ' only in B.') + insight('Cultivation strengths', 'Largest reported crop area: <b>' + esc(leading[0]?.name || 'No area measurement') + '</b> in A and <b>' + esc(leading[1]?.name || 'No area measurement') + '</b> in B.') + insight('Largest relative yield difference', gaps.length ? '<b>' + esc(gaps[0].row.name) + '</b>: A\'s yield is <b>' + pct(gaps[0].gap) + '</b> relative to B. Valid yield comparisons are available for ' + validYields.length + ' shared crops.' : 'No shared crop has complete yields and a positive comparison yield.');
        renderCharts(); renderHistory(); renderTable(); renderMaps();
    }
    function draw(id, config, hasData) {
        if (charts[id]) { charts[id].destroy(); delete charts[id]; }
        if (!hasData || !window.Highcharts) { el(id).innerHTML = '<div class="empty-chart">' + (window.Highcharts ? 'No valid comparisons for this selection' : 'Chart library could not be loaded') + '</div>'; return; }
        charts[id] = Highcharts.chart(id, Object.assign({ chart: { type: 'bar', animation: !reduced, backgroundColor: 'transparent', style: { fontFamily: 'DM Sans, sans-serif' } }, title: { text: null }, credits: { enabled: false }, colors: [colorA, colorB], accessibility: { enabled: true }, legend: { itemStyle: { fontSize: '10px' } }, tooltip: { valueDecimals: 1 }, plotOptions: { series: { animation: !reduced, borderRadius: 2 } } }, config));
    }
    function paired(items, aValues, bValues, title) {
        return { xAxis: { categories: items.map(r => r.name) }, yAxis: { title: { text: title } }, series: [{ name: 'A: ' + areaName('a'), data: aValues, color: colorA }, { name: 'B: ' + areaName('b'), data: bValues, color: colorB }] };
    }
    function renderCharts() {
        const mix = rows.filter(r => r.a?.Area != null || r.b?.Area != null).slice(0, 12);
        const sums = ['a', 'b'].map(side => rows.reduce((sum, r) => sum + (r[side]?.Area || 0), 0));
        draw('mix-chart', Object.assign(paired(mix, mix.map(r => r.a?.Area != null && sums[0] > 0 ? r.a.Area / sums[0] * 100 : null), mix.map(r => r.b?.Area != null && sums[1] > 0 ? r.b.Area / sums[1] * 100 : null), 'Share of reported crop area (%)'), { tooltip: { valueDecimals: 1, valueSuffix: '%' } }), mix.length);
        const production = rows.filter(r => r.a?.Production != null && r.b?.Production != null && r.a.Production + r.b.Production > 0).slice(0, 12);
        draw('production-chart', Object.assign(paired(production, production.map(r => r.a.Production), production.map(r => r.b.Production), 'Share of pair production (%)'), { yAxis: { min: 0, max: 100, title: { text: 'Share of pair production (%)' } }, plotOptions: { series: { stacking: 'percent', animation: !reduced } }, tooltip: { pointFormatter: function () { return esc(this.series.name) + ': <b>' + num(this.y) + '</b> reported units (' + num(this.percentage) + '%)<br>'; } } }), production.length);
        const yieldRows = rows.filter(r => r.a?.Yield != null && r.b?.Yield > 0).slice(0, 12);
        draw('yield-gap-chart', { xAxis: { categories: yieldRows.map(r => r.name) }, yAxis: { title: { text: "A's yield relative to B (%)" }, plotLines: [{ value: 0, color: '#829784', width: 1 }] }, legend: { enabled: false }, tooltip: { valueDecimals: 1, valueSuffix: '%' }, series: [{ name: 'A compared with B', data: yieldRows.map(r => { const gap = change(r.a.Yield, r.b.Yield); return { y: gap, color: gap >= 0 ? colorA : colorB }; }) }] }, yieldRows.length);
        const growth = rows.filter(r => r.a?.YieldGrowth != null || r.b?.YieldGrowth != null).slice(0, 12);
        draw('growth-chart', Object.assign(paired(growth, growth.map(r => r.a?.YieldGrowth ?? null), growth.map(r => r.b?.YieldGrowth ?? null), 'Year-on-year yield change (%)'), { tooltip: { valueDecimals: 1, valueSuffix: '%' } }), growth.length);
    }
    function historyFor(side, crop) {
        const data = datasets[side === 'a' ? 0 : 1], years = new Map();
        data.history.filter(r => String(r.CropId) === crop).forEach(r => { if (!years.has(r.FiscalYear)) years.set(r.FiscalYear, []); years.get(r.FiscalYear).push(r); });
        return new Map(Array.from(years).map(([year, records]) => [year, aggregate(records)[0]]));
    }
    function renderHistory() {
        Object.keys(charts).filter(id => id.startsWith('history-')).forEach(id => { charts[id].destroy(); delete charts[id]; });
        const items = rows.filter(r => r.a && r.b).slice(0, 6), metric = el('history-metric').value;
        const years = Array.from(new Set(datasets.flatMap(d => d.history.map(r => r.FiscalYear)))).filter(y => y <= state.year).sort();
        el('history-charts').innerHTML = items.map((r, i) => '<article class="comparison-history-card"><h3>' + esc(r.name) + '</h3><div id="history-' + i + '" class="comparison-history-chart"></div></article>').join('') || '<div class="empty-chart">No crops are reported in both areas for this year.</div>';
        items.forEach((crop, i) => {
            const series = ['a', 'b'].map(side => { const lookup = historyFor(side, crop.id); return { name: side.toUpperCase() + ': ' + areaName(side), data: years.map(y => lookup.get(y)?.[metric] ?? null), color: side === 'a' ? colorA : colorB, connectNulls: false, marker: { enabled: false } }; });
            draw('history-' + i, { chart: { type: 'line', animation: !reduced, backgroundColor: 'transparent' }, xAxis: { categories: years, tickInterval: Math.max(1, Math.ceil(years.length / 6)) }, yAxis: { title: { text: metric === 'Yield' ? 'Production / area' : 'Reported units' } }, tooltip: { shared: true, valueDecimals: metric === 'Yield' ? 3 : 1 }, series }, series.some(s => s.data.some(n => n != null)));
        });
    }
    function renderTable() {
        const metric = el('table-metric').value, digits = metric === 'Yield' ? 3 : 1;
        filtered = rows.filter(r => r.name.toLowerCase().includes(el('search').value.toLowerCase()));
        el('data-table').querySelector('thead').innerHTML = '<tr><th scope="col">Crop</th><th scope="col">A: ' + esc(areaName('a')) + '<br>' + metric + '</th><th scope="col">B: ' + esc(areaName('b')) + '<br>' + metric + '</th><th scope="col">Difference (A - B)</th><th scope="col">A relative to B</th><th scope="col">Yield YoY A</th><th scope="col">Yield YoY B</th><th scope="col">Coverage</th></tr>';
        el('data-table').querySelector('tbody').innerHTML = filtered.map(r => '<tr><td>' + esc(r.name) + '</td><td>' + num(r.a?.[metric], digits) + '</td><td>' + num(r.b?.[metric], digits) + '</td><td>' + num(delta(r.a?.[metric], r.b?.[metric]), digits) + '</td><td>' + pct(change(r.a?.[metric], r.b?.[metric])) + '</td><td>' + pct(r.a?.YieldGrowth) + '</td><td>' + pct(r.b?.YieldGrowth) + '</td><td>' + (r.a && r.b ? 'Both' : r.a ? 'A only' : 'B only') + ((r.a?.MissingRows || 0) + (r.b?.MissingRows || 0) ? '<small class="comparison-incomplete">Incomplete measurements</small>' : '') + '</td></tr>').join('') || '<tr><td colspan="8">No matching crop observations.</td></tr>';
        el('table-count').textContent = filtered.length + ' crops | ' + metric + (metric === 'Yield' ? ' / production per area' : ' / reported units');
    }
    async function renderMaps() {
        const seq = ++mapSerial, mapLevel = state.level === 'province' ? 'division' : 'district';
        if (!window.L) { ['a', 'b'].forEach(side => el('map-description-' + side).textContent = 'Map library could not be loaded.'); return; }
        try {
            if (!geometry[mapLevel]) geometry[mapLevel] = fetch(root + 'Scripts/polygons/atlas-' + mapLevel + '.json').then(r => { if (!r.ok) throw Error('Map boundaries could not be loaded.'); return r.json(); }).catch(e => { delete geometry[mapLevel]; throw e; });
            const boundaries = await geometry[mapLevel]; if (seq !== mapSerial) return;
            ['a', 'b'].forEach((side, index) => {
                const current = datasets[index].history.filter(r => r.FiscalYear === state.year), key = mapLevel === 'division' ? 'DivisionId' : 'DistrictId', counts = new Map();
                current.forEach(r => { const id = String(r[key]); if (!counts.has(id)) counts.set(id, new Set()); counts.get(id).add(r.CropId); });
                const members = metadata.geography.filter(g => (state.level === 'district' ? g.id : g[state.level]) === state[side]);
                const special = mapLevel === 'district' ? Array.from(new Set(current.filter(r => ['990', '991', '992'].includes(r.DistrictId)).map(r => r.DistrictId))) : [];
                if (state.level === 'district' && ['990', '991', '992'].includes(state[side]) && !special.includes(state[side])) special.push(state[side]);
                const isMember = (boundary, id) => { const g = metadata.geography.find(g => Number(g.id) === Number(boundary.code)); if (!g) return false; const name = g.name.toUpperCase(); return id === '990' ? (g.divisionName || '').toUpperCase().includes('KARACHI') : id === '991' ? name.includes('CHITRAL') : name.includes('KOHISTAN') || name.includes('KOLAI'); };
                const features = boundaries.filter(b => members.some(g => Number(mapLevel === 'division' ? g.division : g.id) === Number(b.code)) && !special.some(id => isMember(b, id))).map(b => ({ type: 'Feature', geometry: b.boundary, properties: { id: String(b.code), name: clean(b.name), count: counts.get(String(b.code))?.size ?? null } }));
                special.forEach(id => { const children = boundaries.filter(b => isMember(b, id)), g = metadata.geography.find(g => g.id === id), coordinates = children.flatMap(b => b.boundary.type === 'MultiPolygon' ? b.boundary.coordinates : b.boundary.type === 'Polygon' ? [b.boundary.coordinates] : []); if (coordinates.length) features.push({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates }, properties: { id, name: clean(g?.name || id) + ' (combined reporting area)', count: counts.get(id)?.size ?? null, combined: true } }); });
                if (!maps[side]) {
                    maps[side] = L.map('map-' + side, { scrollWheelZoom: false }); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(maps[side]);
                    const legend = L.control({ position: 'bottomright' }); legend.onAdd = () => { const node = el('legend-' + side); L.DomEvent.disableClickPropagation(node); L.DomEvent.disableScrollPropagation(node); return node; }; legend.addTo(maps[side]);
                }
                const shades = ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'], color = n => n == null ? '#e4e5e1' : shades[n <= 5 ? 0 : n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 3 : 4];
                if (layers[side]) layers[side].remove();
                layers[side] = L.geoJSON(features, { style: f => ({ fillColor: color(f.properties.count), fillOpacity: .92, color: '#fff', weight: 1, dashArray: f.properties.combined ? '4 3' : null }), onEachFeature: (f, polygon) => polygon.bindTooltip('<b>' + esc(f.properties.name) + '</b><br>' + (f.properties.count == null ? 'No data' : f.properties.count + ' reported crops'), { className: 'map-tooltip', sticky: true }) }).addTo(maps[side]);
                maps[side].invalidateSize(); if (features.length) maps[side].fitBounds(layers[side].getBounds(), { padding: [18, 18], maxZoom: 9 }); else maps[side].setView([29.7, 69.3], 5);
                el('legend-' + side).innerHTML = '<strong>Reported crop diversity</strong><small>Same scale on both maps</small>' + ['1-5', '6-10', '11-20', '21-30', '31+'].map((label, i) => '<span><i style="background:' + shades[i] + '"></i>' + label + ' crops</span>').join('') + '<span><i style="background:#e4e5e1"></i>No data</span>';
                el('map-description-' + side).textContent = 'All crops | ' + state.year + ' | Independent map extents; colors use the same crop-count scale.';
                const profileAction = mapLevel[0].toUpperCase() + mapLevel.slice(1) + 'Profile';
                el('map-stats-' + side).innerHTML = features.sort((a, b) => (b.properties.count || 0) - (a.properties.count || 0)).map(f => '<a class="map-stat-row" href="' + root + 'Crops/' + profileAction + '?' + esc(new URLSearchParams({ [mapLevel]: f.properties.id, year: state.year }).toString()) + '"><i style="background:' + color(f.properties.count) + '"></i><span>' + esc(f.properties.name) + '</span><strong>' + (f.properties.count == null ? 'No data' : f.properties.count + ' crops') + '</strong></a>').join('') || '<p class="map-stats-empty">No mapped reporting areas.</p>';
            });
        } catch (e) { if (seq === mapSerial) ['a', 'b'].forEach(side => el('map-description-' + side).textContent = e.message); }
    }
    function exportCsv() {
        if (!datasets) return;
        const cell = v => '"' + (typeof v === 'number' ? String(v) : String(v == null ? '' : v).replace(/^[=+@-]/, "'$&")).replace(/"/g, '""') + '"';
        const exportRows = [['Pakistan Crop Statistics', 'Area comparison'], ['Geographic level', state.level], ['Area A', areaName('a')], ['Area B', areaName('b')], ['Fiscal year', state.year], ['Units', 'Reported source units; yield = production / area; missing measurements are blank'], ['Crop', 'Area A', 'Area B', 'Production A', 'Production B', 'Yield A', 'Yield B', 'Production difference (A-B)', 'Yield difference (A-B)', 'Yield YoY A (%)', 'Yield YoY B (%)', 'Incomplete records A', 'Incomplete records B']].concat(filtered.map(r => [r.name, r.a?.Area, r.b?.Area, r.a?.Production, r.b?.Production, r.a?.Yield, r.b?.Yield, delta(r.a?.Production, r.b?.Production), delta(r.a?.Yield, r.b?.Yield), r.a?.YieldGrowth, r.b?.YieldGrowth, r.a?.MissingRows, r.b?.MissingRows]));
        const url = URL.createObjectURL(new Blob(['\ufeff' + exportRows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })), link = document.createElement('a'); link.href = url; link.download = 'crop-statistics-comparison-' + state.level + '-' + state.a + '-' + state.b + '-' + state.year + '.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    el('compare-level').onchange = () => { state.level = el('compare-level').value; state.a = ''; state.b = ''; choices(); load(false); };
    ['a', 'b'].forEach(side => el('area-' + side).onchange = () => { state[side] = el('area-' + side).value; choices(); load(false); });
    el('year').onchange = () => { state.year = el('year').value; load(false); };
    el('swap').onclick = () => { [state.a, state.b] = [state.b, state.a]; choices(); load(false); };
    el('search').oninput = () => { if (datasets) renderTable(); }; el('table-metric').onchange = () => { if (datasets) renderTable(); }; el('history-metric').onchange = () => { if (datasets) renderHistory(); };
    el('table-download').onclick = exportCsv;
    window.addEventListener('resize', () => { Object.values(charts).forEach(c => c.reflow()); Object.entries(maps).forEach(([side, map]) => { map.invalidateSize(); if (layers[side]?.getLayers().length) map.fitBounds(layers[side].getBounds(), { padding: [18, 18], maxZoom: 9, animate: false }); }); });
    load(true);
}());
