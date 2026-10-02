(function () {
    'use strict';
    const body = document.body, level = body.dataset.level, root = body.dataset.root;
    const el = id => document.getElementById(id);
    const query = new URLSearchParams(location.search);
    const state = { area: query.get(level) || '0', year: query.get('year') || '' };
    const heatState = { metric: ['Yield', 'Production', 'Area'].includes(query.get('heat')) ? query.get('heat') : 'Yield', span: ['5', '8', '10', '15', 'all'].includes(query.get('span')) ? query.get('span') : '8', scale: ['table', 'row', 'column'].includes(query.get('scale')) ? query.get('scale') : 'table' };
    el('heat-years').value = heatState.span; el('heat-scale').value = heatState.scale;
    const clean = s => String(s || '').replace(/ DISTRICT| DIVISION/gi, '').replace('CHIRTAL', 'CHITRAL');
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = (v, d = 1) => v == null || !Number.isFinite(v) ? '\u2014' : v.toLocaleString('en', { maximumFractionDigits: d });
    const change = (now, past) => now != null && past != null && past > 0 ? (now / past - 1) * 100 : null;
    const pct = v => v == null ? '\u2014' : (v > 0 ? '+' : '') + num(v) + '%';
    const colors = ['#15836d', '#c49a37', '#7862bd', '#c87850', '#338ba6', '#7c9a48', '#af5d83', '#407369'];
    const charts = {}, geometry = {};
    let metadata, data, crops = [], filtered = [], controller, serial = 0, mapSerial = 0, map, mapLayer, fitted;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function status(message, error) { el('status').textContent = message; el('status').className = error ? 'error' : ''; }
    function aggregate(rows, key, nameKey) {
        const groups = new Map();
        rows.forEach(r => {
            const id = String(r[key]);
            if (!groups.has(id)) groups.set(id, { id, name: clean(r[nameKey]), Area: 0, Production: 0, areaCount: 0, productionCount: 0, MissingRows: 0, districts: new Set() });
            const g = groups.get(id);
            if (r.Area != null) { g.Area += r.Area; g.areaCount++; }
            if (r.Production != null) { g.Production += r.Production; g.productionCount++; }
            g.MissingRows += r.MissingRows || 0; g.districts.add(r.DistrictId);
        });
        return Array.from(groups.values()).map(g => Object.assign(g, {
            Area: g.areaCount ? g.Area : null, Production: g.productionCount ? g.Production : null,
            Yield: !g.MissingRows && g.areaCount && g.productionCount && g.Area > 0 ? g.Production / g.Area : null
        }));
    }
    function areaOptions() {
        const key = level === 'district' ? 'id' : level;
        const name = level === 'district' ? 'name' : level + 'Name';
        const options = Array.from(new Map(metadata.geography.filter(g => g[key]).map(g => [g[key], {
            id: g[key], name: clean(g[name]) + (g.combined && level === 'district' ? ' (combined reporting area)' : '') + (level !== 'province' ? ' / ' + clean(g.provinceName) : '')
        }])).values()).sort((a, b) => a.name.localeCompare(b.name));
        el('area').innerHTML = options.map(a => '<option value="' + esc(a.id) + '">' + esc(a.name) + '</option>').join('');
        el('area').value = state.area;
        if (el('area').selectedIndex < 0) {
            const covered = options.filter(a => (metadata.reportingAreas || []).some(r => r[level] === a.id));
            const contextual = covered.find(a => metadata.geography.some(g => (level === 'district' ? g.id : g[level]) === a.id && (!query.get('province') || query.get('province') === '0' || g.province === query.get('province')) && (!query.get('division') || query.get('division') === '0' || g.division === query.get('division'))));
            const available = contextual || covered[0];
            if (available) el('area').value = available.id;
            else el('area').selectedIndex = 0;
        }
        state.area = el('area').value;
        el('year').innerHTML = metadata.years.map(y => '<option>' + esc(y) + '</option>').join('');
        el('year').value = metadata.years.includes(state.year) ? state.year : metadata.year;
        state.year = el('year').value;
    }
    function scope() { return { crop: 0, year: state.year, [level]: state.area }; }
    function syncUrl() {
        const q = new URLSearchParams({ year: state.year, [level]: state.area, heat: heatState.metric, span: heatState.span, scale: heatState.scale });
        window.history.replaceState(null, '', '?' + q);
        document.querySelectorAll('[data-compare-nav]').forEach(a => {
            const target = a.dataset.compareNav, params = { level: target, year: state.year };
            if (target === level) params.a = state.area;
            a.href = root + 'Crops/AreaComparison?' + new URLSearchParams(params);
        });
        const g = metadata.geography.find(g => (level === 'district' ? g.id : g[level]) === state.area);
        document.querySelectorAll('[data-area-nav]').forEach(a => {
            const target = a.dataset.areaNav, params = new URLSearchParams({ year: state.year });
            if (target === level) params.set(target, state.area);
            else if (g && target === 'province') params.set('province', g.province);
            else if (g && level === 'district' && target === 'division') params.set('division', g.division);
            else if (target !== 'province' && level === 'province') params.set('province', state.area);
            else if (target === 'district' && level === 'division') params.set('division', state.area);
            a.href = root + 'Crops/' + target[0].toUpperCase() + target.slice(1) + 'Profile?' + params;
        });
    }
    async function load(initial) {
        const seq = ++serial;
        if (controller) controller.abort();
        controller = new AbortController();
        body.classList.add('busy'); status('Loading all crops for this area...');
        try {
            const fetchData = async params => {
                const response = await fetch(body.dataset.api + '?' + new URLSearchParams(params), { signal: controller.signal });
                const result = await response.json();
                if (!response.ok) throw Error(result.error || 'Area data could not be loaded.');
                return result;
            };
            if (initial) { metadata = await fetchData({ crop: 0, metadataOnly: true }); if (seq !== serial) return; areaOptions(); }
            if (!state.area) throw Error('No reporting areas are available.');
            const result = await fetchData(scope());
            if (seq !== serial) return;
            data = result; state.year = data.year; syncUrl(); render();
            status('Data loaded | All crops | ' + data.year + ' | ' + crops.length + ' reported crops');
        } catch (e) { if (e.name !== 'AbortError' && seq === serial) status(e.message, true); }
        finally { if (seq === serial) body.classList.remove('busy'); }
    }
    function draw(id, config, hasData) {
        if (charts[id]) { charts[id].destroy(); delete charts[id]; }
        if (!window.Highcharts || !hasData) { el(id).innerHTML = '<div class="empty-chart">' + (window.Highcharts ? 'No complete observations for this selection' : 'Chart library could not be loaded') + '</div>'; return; }
        charts[id] = Highcharts.chart(id, Object.assign({ title: { text: null }, credits: { enabled: false }, accessibility: { enabled: true }, colors, chart: { backgroundColor: 'transparent', animation: !reduced, style: { fontFamily: 'DM Sans, sans-serif' } } }, config));
    }
    function stat(title, value, note, icon) {
        return '<article class="stat"><div class="stat-top"><span class="stat-label">' + title + '</span><span class="stat-icon"><svg aria-hidden="true"><use href="' + root + 'Content/crop-icons.svg#' + icon + '"></use></svg></span></div><div class="stat-value">' + value + '</div><div class="stat-sub">' + note + '</div></article>';
    }
    function yearsFor(crop) { return aggregate(data.history.filter(r => String(r.CropId) === crop.id), 'FiscalYear', 'FiscalYear').sort((a, b) => a.id.localeCompare(b.id)); }
    function spark(rows, key) {
        const points = rows.map((r, i) => ({ i, y: r[key] })).filter(r => r.y != null);
        if (points.length < 2) return '<span class="crop-spark-empty">Insufficient history</span>';
        const low = Math.min(...points.map(p => p.y)), high = Math.max(...points.map(p => p.y));
        const path = points.map((p, i) => (i === 0 || p.i !== points[i - 1].i + 1 ? 'M' : 'L') + (p.i * 140 / Math.max(1, rows.length - 1)).toFixed(1) + ',' + (30 - (p.y - low) * 25 / (high - low || 1)).toFixed(1)).join(' ');
        return '<svg viewBox="0 0 140 35" aria-hidden="true"><path d="' + path + '" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    }
    function render() {
        const current = data.history.filter(r => r.FiscalYear === data.year), previous = data.history.filter(r => r.FiscalYear === data.previous);
        const past = new Map(aggregate(previous, 'CropId', 'CropName').map(r => [r.id, r]));
        crops = aggregate(current, 'CropId', 'CropName').map(r => Object.assign(r, { Growth: change(r.Production, past.get(r.id)?.Production), YieldGrowth: change(r.Yield, past.get(r.id)?.Yield) })).sort((a, b) => (b.Area ?? -Infinity) - (a.Area ?? -Infinity) || a.name.localeCompare(b.name));
        const place = el('area').selectedOptions[0]?.textContent || 'Area';
        el('selection').textContent = place; el('hero-year').textContent = data.year;
        const improving = crops.filter(c => c.YieldGrowth > 0), comparable = crops.filter(c => c.YieldGrowth != null), districts = new Set(current.map(r => r.DistrictId));
        const missing = current.reduce((sum, r) => sum + (r.MissingRows || 0), 0), leading = crops.find(c => c.Area != null), totalArea = crops.reduce((sum, c) => sum + (c.Area || 0), 0);
        el('cards').innerHTML = stat('Reported crops', num(crops.length, 0), 'All crop observations in ' + esc(data.year), 'shell-sprout') + stat('Reporting areas', num(districts.size, 0), 'Districts and combined reporting areas', 'location') + stat('Improving crop yields', num(improving.length, 0), 'Of ' + comparable.length + ' crops with valid prior-year comparisons', 'productivity') + stat('Complete crop yields', num(crops.filter(c => c.Yield != null).length, 0), num(missing, 0) + ' incomplete source records', 'field');
        const biggestGain = improving.slice().sort((a, b) => b.YieldGrowth - a.YieldGrowth)[0];
        const insight = (title, text) => '<article class="insight"><strong>' + title + '</strong>' + text + '</article>';
        el('insights').innerHTML = insight('Largest cultivation footprint', leading ? esc(leading.name) + ' represents <b>' + num(totalArea > 0 ? leading.Area / totalArea * 100 : null) + '%</b> of reported crop area.' : 'No area measurements are available.') + insight('Yield momentum', biggestGain ? esc(biggestGain.name) + ' yield improved <b>' + pct(biggestGain.YieldGrowth) + '</b> compared with ' + esc(data.previous) + '.' : 'No crop has a positive, valid prior-year yield comparison.') + insight('A diverse harvest', '<b>' + crops.length + '</b> crops reported across <b>' + districts.size + '</b> reporting areas. Production and yield remain separate for each crop.');
        const mix = crops.filter(c => c.Area != null);
        el('portfolio-chart').style.height = Math.max(330, mix.length * 25 + 80) + 'px';
        draw('portfolio-chart', { chart: { type: 'bar', backgroundColor: 'transparent', animation: !reduced }, xAxis: { categories: mix.map(c => c.name) }, yAxis: { title: { text: 'Cultivation area / reported units' } }, legend: { enabled: false }, tooltip: { valueDecimals: 1 }, series: [{ name: 'Area', data: mix.map((c, i) => ({ y: c.Area, color: colors[i % colors.length] })) }] }, mix.length);
        el('production-crops').innerHTML = crops.length ? crops.map((c, i) => '<article class="production-crop" style="--crop-color:' + colors[i % colors.length] + '"><div><strong>' + esc(c.name) + '</strong><span>' + num(c.Production) + ' <small>reported units</small></span><small>YoY ' + pct(c.Growth) + '</small></div><div class="crop-mini-trend">' + spark(yearsFor(c), 'Production') + '</div></article>').join('') : '<p class="empty-chart">No crops reported for this year.</p>';
        renderProgress(); renderTable(); renderMap();
    }
    function renderProgress() {
        const years = Array.from(new Set(data.history.map(r => r.FiscalYear))).sort();
        ['Production', 'Yield'].forEach(key => {
            const series = crops.slice(0, 8).map((crop, i) => {
                const rows = yearsFor(crop), first = rows.find(r => !r.MissingRows && r[key] > 0), lookup = new Map(rows.map(r => [r.id, r]));
                return { name: crop.name, color: colors[i], data: years.map(y => { const r = lookup.get(y); return first && y >= first.id && r && !r.MissingRows && r[key] != null ? r[key] / first[key] * 100 : null; }), type: 'line', connectNulls: false, marker: { enabled: false } };
            });
            draw(key === 'Production' ? 'trend-chart' : 'yield-chart', { xAxis: { categories: years, tickInterval: Math.max(1, Math.ceil(years.length / 8)) }, yAxis: { title: { text: 'Index / first valid year = 100' } }, tooltip: { shared: true, valueDecimals: 1 }, legend: { itemStyle: { fontSize: '10px' } }, series }, series.some(s => s.data.some(v => v != null)));
        });
        renderHeatTable();
    }
    function renderHeatTable() {
        const metric = heatState.metric, allYears = Array.from(new Set(data.history.map(r => r.FiscalYear))).filter(y => y <= data.year).sort();
        const years = heatState.span === 'all' ? allYears : allYears.slice(-Number(heatState.span));
        const histories = new Map();
        data.history.filter(r => years.includes(r.FiscalYear)).forEach(r => histories.set(String(r.CropId), clean(r.CropName)));
        const matrix = Array.from(histories, ([id, name]) => {
            const lookup = new Map(yearsFor({ id }).map(r => [r.id, r]));
            const cells = years.map(year => {
                const previousYear = metadata.years[metadata.years.indexOf(year) + 1];
                const now = lookup.get(year)?.[metric] ?? null, before = lookup.get(previousYear)?.[metric] ?? null;
                return { year, now, before, value: change(now, before) };
            });
            return { name, cells };
        }).sort((a, b) => a.name.localeCompare(b.name));
        const mean = values => { const valid = values.filter(v => v != null && Number.isFinite(v)); return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null; };
        const extent = values => Math.max(1, ...values.filter(v => v != null && Number.isFinite(v)).map(Math.abs));
        const global = extent(matrix.flatMap(r => r.cells.map(c => c.value)));
        const columns = years.map((_, i) => extent(matrix.map(r => r.cells[i].value)));
        const shade = (value, limit) => {
            if (value == null) return 'background:#f1f3ef;color:#8b9487';
            const strength = Math.sqrt(Math.min(1, Math.abs(value) / limit));
            const base = [249, 250, 245], target = value < 0 ? [180, 49, 62] : [14, 116, 87];
            const rgb = base.map((v, i) => Math.round(v + (target[i] - v) * strength));
            return 'background:rgb(' + rgb.join(',') + ');color:' + (strength > .65 ? '#fff' : value < 0 ? '#882e38' : '#215943');
        };
        const cell = (value, limit, title, summary) => '<td class="heat-cell' + (summary ? ' heat-summary' : '') + '" style="' + shade(value, limit) + '" title="' + esc(title) + '"><span>' + pct(value) + '</span></td>';
        el('heat-title').textContent = (metric === 'Area' ? 'Cultivation area' : metric) + ' progress at a glance';
        el('heat-range').innerHTML = '<strong>' + years.length + ' fiscal years</strong><span>' + (years.length ? esc(years[0]) + ' &ndash; ' + esc(years[years.length - 1]) : 'No history available') + ' &middot; ' + matrix.length + ' crops</span>';
        el('yield-progress').innerHTML = '<table class="heat-table"><thead><tr><th scope="col" class="heat-crop-heading">Crop <small>Year-on-year change</small></th>' + years.map(y => '<th scope="col">' + esc(y) + '</th>').join('') + '<th scope="col" class="heat-summary">Period average</th></tr></thead><tbody>' + matrix.map(r => {
            const rowExtent = extent(r.cells.map(c => c.value)), average = mean(r.cells.map(c => c.value));
            return '<tr><th scope="row">' + esc(r.name) + '</th>' + r.cells.map((c, i) => cell(c.value, heatState.scale === 'row' ? rowExtent : heatState.scale === 'column' ? columns[i] : global, r.name + ' / ' + c.year + ': ' + (metric === 'Area' ? 'Area' : metric) + ' ' + num(c.now, metric === 'Yield' ? 3 : 1) + '; prior year ' + num(c.before, metric === 'Yield' ? 3 : 1) + '; change ' + pct(c.value), false)).join('') + cell(average, global, 'Arithmetic average of valid annual changes for ' + r.name, true) + '</tr>';
        }).join('') + '</tbody><tfoot><tr><th scope="row">Average crop change</th>' + years.map((year, i) => cell(mean(matrix.map(r => r.cells[i].value)), global, 'Arithmetic average of valid crop changes in ' + year, true)).join('') + cell(mean(matrix.flatMap(r => r.cells.map(c => c.value))), global, 'Arithmetic average of all valid crop-year changes', true) + '</tr></tfoot></table>';
        if (!matrix.length) el('yield-progress').innerHTML = '<p class="empty-chart">No crop observations in this year span.</p>';
        document.querySelectorAll('[data-heat-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.heatMetric === metric)));
        el('heat-note').textContent = 'Cells show year-on-year ' + (metric === 'Area' ? 'cultivation area' : metric.toLowerCase()) + ' change. Deeper green means a larger increase; deeper red means a larger decline. Colors scale ' + ({ table: 'across the table', row: 'within each crop row', column: 'within each year column' }[heatState.scale]) + '. Averages use valid changes only and the table-wide color scale; they are not changes in combined crop totals. Missing inputs or a nonpositive prior-year value have no comparison.' + (metric === 'Yield' ? ' Incomplete measurements and zero area have no yield value.' : ' Measurements retain their reported source units.');
    }
    function renderTable() {
        const search = el('search').value.toLowerCase(); filtered = crops.filter(c => c.name.toLowerCase().includes(search));
        el('data-table').querySelector('tbody').innerHTML = filtered.map(c => '<tr><td>' + esc(c.name) + '</td><td>' + num(c.Area) + '</td><td>' + num(c.Production) + '</td><td>' + num(c.Yield, 3) + '</td><td>' + pct(c.Growth) + '</td><td>' + pct(c.YieldGrowth) + '</td><td>' + num(c.MissingRows, 0) + '</td></tr>').join('') || '<tr><td colspan="7">No matching crop observations.</td></tr>';
        el('table-count').textContent = filtered.length + ' crops';
    }
    async function renderMap() {
        const seq = ++mapSerial, next = level === 'province' ? 'division' : 'district';
        if (!window.L) { el('map-description').textContent = 'Map library could not be loaded.'; return; }
        try {
            if (!geometry[next]) geometry[next] = fetch(root + 'Scripts/polygons/atlas-' + next + '.json').then(r => { if (!r.ok) throw Error('Area boundaries could not be loaded.'); return r.json(); }).catch(e => { delete geometry[next]; throw e; });
            const boundaries = await geometry[next]; if (seq !== mapSerial) return;
            if (!map) {
                map = L.map('map', { scrollWheelZoom: false });
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
                const legend = L.control({ position: 'bottomright' }); legend.onAdd = () => { const node = el('legend'); L.DomEvent.disableClickPropagation(node); L.DomEvent.disableScrollPropagation(node); return node; }; legend.addTo(map);
            }
            const members = metadata.geography.filter(g => (level === 'district' ? g.id : g[level]) === state.area);
            const current = data.history.filter(r => r.FiscalYear === data.year), key = next === 'division' ? 'DivisionId' : 'DistrictId';
            const counts = new Map(); current.forEach(r => { const id = String(r[key]); if (!counts.has(id)) counts.set(id, new Set()); counts.get(id).add(r.CropId); });
            const special = next === 'district' ? current.filter(r => ['990', '991', '992'].includes(r.DistrictId)) : [];
            const specialIds = Array.from(new Set(special.map(r => r.DistrictId)));
            if (level === 'district' && ['990', '991', '992'].includes(state.area) && !specialIds.includes(state.area)) specialIds.push(state.area);
            const combinedMember = (b, id) => {
                const g = metadata.geography.find(g => Number(g.id) === Number(b.code)); if (!g) return false;
                const name = g.name.toUpperCase(); return id === '990' ? (g.divisionName || '').toUpperCase().includes('KARACHI') : id === '991' ? name.includes('CHITRAL') : name.includes('KOHISTAN') || name.includes('KOLAI');
            };
            const features = boundaries.filter(b => members.some(g => Number(next === 'division' ? g.division : g.id) === Number(b.code)) && !specialIds.some(id => combinedMember(b, id))).map(b => ({ type: 'Feature', geometry: b.boundary, properties: { id: String(b.code), name: clean(b.name), count: counts.has(String(b.code)) ? counts.get(String(b.code)).size : null } }));
            specialIds.forEach(id => {
                const children = boundaries.filter(b => combinedMember(b, id)), g = metadata.geography.find(g => g.id === id);
                const coords = children.flatMap(b => b.boundary.type === 'MultiPolygon' ? b.boundary.coordinates : b.boundary.type === 'Polygon' ? [b.boundary.coordinates] : []);
                if (coords.length) features.push({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: coords }, properties: { id, name: clean(g?.name || id) + ' (combined reporting area)', count: counts.has(id) ? counts.get(id).size : null, combined: true } });
            });
            const shades = ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'];
            const color = n => n == null ? '#e4e5e1' : shades[n <= 5 ? 0 : n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 3 : 4];
            const navigate = f => { if (level === 'district') return; location.href = root + 'Crops/' + (next === 'division' ? 'DivisionProfile' : 'DistrictProfile') + '?' + new URLSearchParams({ [next]: f.id, year: state.year }); };
            if (mapLayer) mapLayer.remove();
            mapLayer = L.geoJSON(features, { style: f => ({ fillColor: color(f.properties.count), fillOpacity: .9, color: '#fff', weight: 1, dashArray: f.properties.combined ? '4 3' : null }), onEachFeature: (f, polygon) => { polygon.bindTooltip('<b>' + esc(f.properties.name) + '</b><br>' + (f.properties.count == null ? 'No observations' : f.properties.count + ' reported crops'), { className: 'map-tooltip', sticky: true }); polygon.on('click', () => navigate(f.properties)); } }).addTo(map);
            if (features.length) { fitted = mapLayer.getBounds(); map.invalidateSize(); map.fitBounds(fitted, { padding: [20, 20], maxZoom: 9 }); } else { fitted = null; map.setView([29.7, 69.3], 5); }
            el('legend').innerHTML = '<div class="legend-kicker">MAP KEY</div><div class="legend-heading"><strong>Reported crop diversity</strong><span>Number of crops / ' + data.year + '</span></div><div class="legend-bands">' + ['1-5', '6-10', '11-20', '21-30', '31+'].map((label, i) => '<span class="legend-band"><i style="background:' + shades[i] + '"></i>' + label + ' crops</span>').join('') + '<span class="legend-band"><i style="background:#e4e5e1"></i>No data</span></div>';
            el('map-stats-context').textContent = 'All crops | ' + next + ' reporting areas';
            el('map-stats').innerHTML = features.sort((a, b) => (b.properties.count || 0) - (a.properties.count || 0)).map(f => '<button type="button" class="map-stat-row" data-place="' + esc(f.properties.id) + '"' + (level === 'district' ? ' disabled' : '') + '><i style="background:' + color(f.properties.count) + '"></i><span>' + esc(f.properties.name) + '</span><strong>' + (f.properties.count == null ? 'No data' : f.properties.count + ' crops') + '</strong></button>').join('') || '<p class="map-stats-empty">No mapped areas available.</p>';
            el('map-stats').querySelectorAll('[data-place]').forEach(button => button.onclick = () => navigate(features.find(f => f.properties.id === button.dataset.place).properties));
            el('map-description').textContent = 'Color shows reported crop counts, not production volume.' + (level === 'district' ? '' : ' Select a place to open its area profile.');
        } catch (e) { if (seq === mapSerial) el('map-description').textContent = e.message; }
    }
    function exportCsv() {
        if (!data) return;
        const cell = v => '"' + (typeof v === 'number' ? String(v) : String(v == null ? '' : v).replace(/^[=+@-]/, "'$&")).replace(/"/g, '""') + '"';
        const rows = [['Pakistan Crop Statistics', level + ' profile'], ['Area', el('selection').textContent], ['Fiscal year', data.year], ['Coverage', 'All crops; production and yield retain crop-specific source units'], ['Crop', 'Area', 'Production', 'Yield', 'Production YoY (%)', 'Yield YoY (%)', 'Incomplete records']].concat(filtered.map(c => [c.name, c.Area, c.Production, c.Yield, c.Growth, c.YieldGrowth, c.MissingRows]));
        const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = 'crop-statistics-' + level + '-' + state.area + '-' + data.year + '.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    ['area', 'year'].forEach(id => el(id).onchange = () => { state[id] = el(id).value; load(false); });
    el('reset').onclick = () => { state.area = '0'; state.year = ''; el('search').value = ''; areaOptions(); load(false); };
    document.querySelectorAll('[data-heat-metric]').forEach(button => button.onclick = () => { heatState.metric = button.dataset.heatMetric; if (data) { renderHeatTable(); syncUrl(); } });
    el('heat-years').onchange = () => { heatState.span = el('heat-years').value; if (data) { renderHeatTable(); syncUrl(); } };
    el('heat-scale').onchange = () => { heatState.scale = el('heat-scale').value; if (data) { renderHeatTable(); syncUrl(); } };
    el('search').oninput = () => { if (data) renderTable(); };
    el('table-download').onclick = exportCsv;
    window.addEventListener('resize', () => { Object.values(charts).forEach(c => c.reflow()); if (map) { map.invalidateSize(); if (fitted) map.fitBounds(fitted, { padding: [20, 20], maxZoom: 9, animate: false }); } });
    load(true);
}());
