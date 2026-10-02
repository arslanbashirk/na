(function () {
    'use strict';
    const body = document.body, root = body.dataset.root, page = body.dataset.page;
    const $id = id => document.getElementById(id);
    const query = new URLSearchParams(location.search);
    const state = { crop: query.get('crop') || '4', year: query.get('year') || '', province: query.get('province') || '0', division: query.get('division') || '0', district: query.get('district') || '0' };
    const number = (n, decimals = 1) => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('en', { maximumFractionDigits: decimals });
    const percent = n => n == null ? 'No comparison' : (n > 0 ? '+' : '') + number(n, 1) + '%';
    const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const clean = s => String(s || '').replace(/ DISTRICT| DIVISION/gi, '').replace('CHIRTAL', 'CHITRAL');
    const combined = id => ['990', '991', '992'].includes(String(id));
    const ratio = (p, a) => p != null && a != null && a > 0 ? p / a : null;
    const change = (now, before) => now != null && before != null && before > 0 ? (now / before - 1) * 100 : null;
    let data, current = [], prior = [], history = [], request, serial = 0, mapSerial = 0;
    let map, mapBounds, layer, nameLayer, timer, raceYears = [], raceIndex = 0, tableRows = [], tablePage = 0, sortKey = 'Production', sortAscending = false;
    const geometry = {}, charts = {};
    const palette = ['#08a783', '#f3b324', '#7161d4', '#ee7955', '#159bc2', '#80b642', '#d0528b', '#398d86'];
    const drillStack = [];
    const colorFor = id => palette[(Number(id) || 0) % palette.length];
    const cropSymbol = name => /potato|taro|yam/i.test(name) ? 'potato' : /wheat|barley|millet|sorghum/i.test(name) ? 'wheat' : /rice|paddy/i.test(name) ? 'rice' : /maize|corn/i.test(name) ? 'maize' : /cotton/i.test(name) ? 'cotton' : /sugar|cane/i.test(name) ? 'cane' : /gram|mong|mash|masoor|mattar|bean|pea|pulse/i.test(name) ? 'pulse' : /apple|banana|mango|orange|citrus|fruit|grape|date|fig|melon/i.test(name) ? 'fruit' : 'vegetable';
    const iconUrl = name => root + 'Content/crop-icons.svg#' + cropSymbol(name);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const names = { overview: 'Overview', crop: 'Crop profile', area: 'Area profile', compare: 'Rankings & race' };
    $id('breadcrumb').textContent = names[page];
    document.querySelector('[data-nav="' + page + '"]').classList.add('active');
    $id('intro').textContent = { overview: 'Explore crop production, productivity and the places behind the numbers.', crop: 'Trace one crop across places and years. Find leaders, shifts and opportunities.', area: 'Discover a place’s crop mix, historical performance and regional position.', compare: 'Compare reporting areas and watch their rankings change through time.' }[page];
    $id('race-section').hidden = page !== 'compare';
    $id('profile-section').hidden = page === 'compare';
    document.querySelector('.section-nav a[href="#profile-section"]').hidden = page === 'compare';
    if (page === 'area') $id('profile-section').parentNode.insertBefore($id('profile-section'), document.querySelector('.map-grid'));
    if (page === 'crop') document.querySelector('.map-grid').parentNode.insertBefore(document.querySelector('.map-grid').nextElementSibling, document.querySelector('.map-grid'));
    if (page === 'compare') $id('race-section').parentNode.insertBefore($id('race-section'), document.querySelector('.map-grid'));
    if (page === 'area') $id('table-mode').value = 'crops';
    if (page === 'crop') $id('table-mode').value = 'history';
    if (page === 'compare') $id('map-level').value = 'district';
    if (window.Highcharts) Highcharts.setOptions({ chart: { style: { fontFamily: 'DM Sans, sans-serif' }, animation: !reducedMotion, backgroundColor: 'transparent' }, colors: palette, title: { text: null }, credits: { enabled: false }, lang: { thousandsSep: ',' }, xAxis: { lineColor: '#e5eadd', tickLength: 0, labels: { style: { color: '#788375', fontSize: '11px' } } }, yAxis: { gridLineColor: '#eef1e8', title: { style: { color: '#788375', fontSize: '10px' } }, labels: { style: { color: '#788375', fontSize: '10px' } } }, legend: { itemStyle: { fontSize: '10px', fontWeight: 'normal' } }, accessibility: { enabled: true } });

    function aggregate(rows, key, nameKey) {
        const groups = new Map();
        rows.forEach(r => {
            const id = key ? r[key] : 'total';
            if (id == null) return;
            if (!groups.has(String(id))) groups.set(String(id), { id: String(id), name: nameKey ? clean(r[nameKey]) : 'Total', Area: 0, Production: 0, areaCount: 0, productionCount: 0, MissingRows: 0, SourceRows: 0, count: 0 });
            const g = groups.get(String(id));
            if (r.Area != null) { g.Area += r.Area; g.areaCount++; }
            if (r.Production != null) { g.Production += r.Production; g.productionCount++; }
            g.MissingRows += r.MissingRows; g.SourceRows += r.SourceRows; g.count++;
        });
        return Array.from(groups.values()).map(g => {
            if (!g.areaCount) g.Area = null;
            if (!g.productionCount) g.Production = null;
            // Partial measurement pairs must not silently produce a complete yield.
            g.Yield = g.MissingRows ? null : ratio(g.Production, g.Area);
            return g;
        });
    }
    const total = rows => aggregate(rows)[0] || { Area: null, Production: null, Yield: null, MissingRows: 0, SourceRows: 0 };
    function grouped(rows, level) {
        const key = { province: 'Province', division: 'Division', district: 'District' }[level];
        return aggregate(rows, key + 'Id', key + 'Name');
    }
    function decorate(rows, previousRows, metric) {
        const past = new Map(previousRows.map(r => [r.id, r]));
        const sum = rows.reduce((a, r) => a + (r.Production || 0), 0);
        return rows.map(r => Object.assign({}, r, { Share: sum > 0 && r.Production != null ? r.Production / sum * 100 : null, Growth: change(r.Production, past.has(r.id) ? past.get(r.id).Production : null), value: r[metric] }));
    }
    function options(id, rows, label, selected) {
        const el = $id(id);
        el.innerHTML = (label ? '<option value="0">' + escape(label) + '</option>' : '') + rows.map(r => '<option value="' + escape(r.id) + '">' + escape(clean(r.name)) + '</option>').join('');
        el.value = selected;
        if (el.selectedIndex < 0) el.selectedIndex = 0;
        state[id] = el.value;
    }
    function filters() {
        options('crop', data.crops, null, state.crop);
        options('year', data.years.map(y => ({ id: y, name: y })), null, data.year);
        const unique = (rows, id, name) => Array.from(new Map(rows.filter(r => r[id]).map(r => [r[id], { id: r[id], name: r[name] }])).values()).sort((a, b) => a.name.localeCompare(b.name));
        options('province', unique(data.geography, 'province', 'provinceName'), 'All Pakistan', state.province);
        const divisions = data.geography.filter(g => state.province === '0' || g.province === state.province);
        options('division', unique(divisions, 'division', 'divisionName'), 'All divisions', state.division);
        options('district', divisions.filter(g => state.division === '0' || g.division === state.division).map(g => ({ id: g.id, name: g.name + (g.combined ? ' · combined' : '') })).sort((a, b) => a.name.localeCompare(b.name)), 'All districts', state.district);
    }
    function url(action, patch) {
        const q = new URLSearchParams(Object.assign({}, state, patch || {}));
        return root + 'Crops/' + action + '?' + q.toString();
    }
    function syncUrl() {
        window.history.replaceState(null, '', '?' + new URLSearchParams(state));
        document.querySelectorAll('[data-nav]').forEach(a => { const actions = { overview: 'Home', crop: 'CropProfile', area: 'AreaProfile', compare: 'Compare' }; a.href = url(actions[a.dataset.nav]); });
    }
    function status(message, error) { $id('status').textContent = message; $id('status').className = error ? 'error' : ''; }
    function load() {
        stopRace();
        const seq = ++serial;
        if (request) request.abort();
        body.classList.add('busy'); status('Loading observations…');
        request = $.ajax({ url: body.dataset.api, data: state, dataType: 'json' }).done(response => {
            if (seq !== serial) return;
            data = response; filters(); syncUrl();
            history = data.history;
            current = history.filter(r => r.FiscalYear === data.year);
            prior = history.filter(r => r.FiscalYear === data.previous);
            tablePage = 0; render();
            status('Data loaded · ' + number(current.length, 0) + ' reporting areas · previous-year comparisons use ' + (data.previous || 'no preceding year') + '.');
        }).fail((xhr, result) => {
            if (result !== 'abort') status((xhr.responseJSON && xhr.responseJSON.error) || 'Unable to load the dashboard. Check the connection and use Reset to retry.', true);
        }).always(() => { if (seq === serial) body.classList.remove('busy'); });
    }
    function stat(label, value, detail, icon) {
        const symbol = icon === '↗' ? cropSymbol($id('crop').selectedOptions[0].textContent) : icon === '▧' ? 'field' : icon === '❋' ? 'productivity' : 'location';
        return '<article class="stat"><div class="stat-top"><div class="stat-label">' + label + '</div><span class="stat-icon"><svg aria-hidden="true"><use href="' + root + 'Content/crop-icons.svg#' + symbol + '"></use></svg></span></div><div class="stat-value">' + value + '</div><div class="stat-sub">' + detail + '</div><div class="stat-spark" aria-hidden="true"></div></article>';
    }
    function delta(value) { return '<span class="' + (value == null ? '' : value >= 0 ? 'positive' : 'negative') + '">' + percent(value) + '</span> vs ' + escape(data.previous || 'previous year'); }
    function insight(title, text, kind) {
        const scenes = {
            overview: ['pakistan-area-profile-banner.png', 'pakistan-crop-profile-banner.png'],
            crop: ['pakistan-crop-profile-banner.png', 'pakistan-rankings-banner.png'],
            area: ['pakistan-area-profile-banner.png', 'pakistan-rankings-banner.png'],
            compare: ['pakistan-rankings-banner.png', 'pakistan-area-profile-banner.png']
        };
        const photo = kind === 'summary' ? '' : '<img class="insight-story-photo" src="' + root + 'Content/images/' + scenes[page][kind === 'production' ? 0 : 1] + '" alt="" loading="lazy" decoding="async">';
        const symbol = kind === 'production' ? 'bars' : kind === 'productivity' ? 'sprout' : 'grid';
        const context = escape($id('crop').selectedOptions[0].textContent) + ' · ' + escape(data.year);
        return '<article class="insight insight-story insight-story--' + kind + '">' + photo + '<div><strong class="insight-title"><svg class="shell-icon" aria-hidden="true"><use href="' + root + 'Content/crop-icons.svg#shell-' + symbol + '"></use></svg>' + escape(title) + '</strong><p>' + text + '</p></div><span class="insight-story-context">' + context + '</span></article>';
    }
    function render() {
        const t = total(current), p = total(prior), cropName = $id('crop').selectedOptions[0].textContent;
        const place = state.district !== '0' ? $id('district').selectedOptions[0].textContent : state.division !== '0' ? $id('division').selectedOptions[0].textContent : state.province !== '0' ? $id('province').selectedOptions[0].textContent : 'Pakistan';
        $id('selection').textContent = place + ' / ' + cropName;
        $id('selected-crop-symbol').setAttribute('href', iconUrl(cropName));
        $id('focus-back').hidden = drillStack.length === 0;
        renderFocusTrail();
        $id('hero-year').textContent = data.year;
        $id('coverage').textContent = current.length ? current.length + ' reporting areas' : 'No observations for this selection';
        const values = [stat('Production · reported units', number(t.Production), delta(change(t.Production, p.Production)), '↗'), stat('Cultivation · reported units', number(t.Area), delta(change(t.Area, p.Area)), '▧'), stat('Yield · production / area', number(t.Yield, 3), delta(change(t.Yield, p.Yield)), '❋'), stat('Reporting coverage', number(current.length, 0), number(t.SourceRows, 0) + ' source records · ' + number(t.MissingRows, 0) + ' incomplete', '⌖')];
        $id('cards').innerHTML = values.join('');
        renderCardTrends();
        const places = decorate(grouped(current, 'district'), grouped(prior, 'district'));
        const leader = places.filter(r => r.Production != null).sort((a, b) => b.Production - a.Production)[0];
        const bestYield = places.filter(r => r.Yield != null).sort((a, b) => b.Yield - a.Yield)[0];
        const top3 = places.filter(r => r.Production != null).sort((a, b) => b.Production - a.Production).slice(0, 3).reduce((a, r) => a + (r.Share || 0), 0);
        $id('insights').innerHTML = insight('Production leader', leader ? escape(leader.name) + ' accounts for <b>' + number(leader.Share) + '%</b> of selected-region production.' : 'No production observation is available for this selection.', 'production') + insight('Productivity leader', bestYield ? escape(bestYield.name) + ' reports <b>' + number(bestYield.Yield, 3) + '</b> production per unit of area.' : 'No complete production / area pair is available.', 'productivity') + insight(t.MissingRows ? 'Measurement coverage' : 'Production concentration', t.MissingRows ? '<b>' + number(t.MissingRows, 0) + '</b> source records have missing measurements. Yield is suppressed where input pairs are incomplete.' : 'The top three reporting areas contribute <b>' + number(top3) + '%</b> of production in this selection.', 'summary');
        renderTrends();
        if (page !== 'compare') { renderPortfolio(); renderScatter(); }
        renderMap();
        raceYears = Array.from(new Set(history.map(r => r.FiscalYear))).sort();
        raceIndex = Math.max(0, raceYears.indexOf(data.year));
        $id('race-year').max = Math.max(0, raceYears.length - 1); $id('race-year').value = raceIndex;
        $id('play').disabled = raceYears.length < 2;
        if (page === 'compare') renderRace();
        renderTable();
    }
    function chart(id, config, hasData) {
        if (!window.Highcharts) { $id(id).innerHTML = '<div class="empty-chart">Chart library could not be loaded.</div>'; return; }
        if (charts[id]) charts[id].destroy();
        if (!hasData) { delete charts[id]; $id(id).innerHTML = '<div class="empty-chart">No observations for this selection</div>'; return; }
        charts[id] = Highcharts.chart(id, config);
    }
    function renderCardTrends() {
        const years = aggregate(history, 'FiscalYear', 'FiscalYear').sort((a, b) => a.id.localeCompare(b.id)).slice(-15);
        ['Production', 'Area', 'Yield', 'count'].forEach((key, index) => {
            const points = years.map((r, i) => ({ x: i, y: r[key] })).filter(p => p.y != null && Number.isFinite(p.y));
            if (points.length < 2) return;
            const low = Math.min(...points.map(p => p.y)), high = Math.max(...points.map(p => p.y));
            const coords = points.map(p => [(p.x / Math.max(1, years.length - 1) * 240).toFixed(1), (35 - (p.y - low) / (high - low || 1) * 28).toFixed(1)]);
            const path = coords.map((p, i) => (i === 0 || points[i].x !== points[i - 1].x + 1 ? 'M' : 'L') + p.join(',')).join(' ');
            const target = document.querySelectorAll('.stat-spark')[index];
            target.innerHTML = '<svg viewBox="0 0 240 42" preserveAspectRatio="none" aria-hidden="true"><path d="' + path + '" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><span>Last ' + years.length + ' fiscal years</span>';
        });
    }
    function renderTrends() {
        const series = aggregate(history, 'FiscalYear', 'FiscalYear').sort((a, b) => a.id.localeCompare(b.id));
        chart('trend-chart', { xAxis: { categories: series.map(r => r.id), tickInterval: Math.max(1, Math.floor(series.length / 7)) }, yAxis: [{ title: { text: 'Area · reported units' } }, { title: { text: 'Production · reported units' }, opposite: true }], tooltip: { shared: true }, series: [{ name: 'Area', type: 'spline', color: '#18876f', lineWidth: 3, data: series.map(r => r.Area), yAxis: 0 }, { name: 'Production', type: 'column', color: '#e9a32a', borderRadius: 4, data: series.map(r => r.Production), yAxis: 1 }] }, series.length);
        chart('yield-chart', { xAxis: { categories: series.map(r => r.id), tickInterval: Math.max(1, Math.floor(series.length / 7)) }, yAxis: { title: { text: 'Production / area' }, min: 0 }, tooltip: { valueDecimals: 3 }, series: [{ name: 'Yield', type: 'areaspline', fillOpacity: .1, data: series.map(r => r.Yield), color: '#7161d4', marker: { radius: 3 } }] }, series.some(r => r.Yield != null));
    }
    function focus(patch, level) {
        drillStack.push({ selection: Object.assign({}, state), level: $id('map-level').value });
        Object.assign(state, patch);
        if (level) $id('map-level').value = level;
        $id('search').value = '';
        load();
    }
    function drillArea(id, level) {
        id = String(id);
        if (level === 'province') focus({ province: id, division: '0', district: '0' }, 'division');
        else if (level === 'division') {
            const parent = data.geography.find(g => g.division === id);
            focus({ province: parent ? parent.province : '0', division: id, district: '0' }, 'district');
        } else {
            const g = data.geography.find(g => g.id === id);
            if (g) focus({ province: g.province || '0', division: g.division || '0', district: id }, 'district');
        }
    }
    function renderFocusTrail() {
        const entries = [{ label: 'Pakistan', scope: 'national' }];
        ['province', 'division', 'district'].forEach(key => { if (state[key] !== '0') entries.push({ label: clean($id(key).selectedOptions[0].textContent), scope: key }); });
        $id('focus-trail').innerHTML = entries.map((e, i) => (i ? '<span class="trail-divider">/</span>' : '') + '<button type="button" data-scope="' + e.scope + '"' + (i === entries.length - 1 ? ' aria-current="true"' : '') + '>' + escape(e.label) + '</button>').join('');
    }
    function bar(id, rows, metric, level, animation) {
        const top = rows.filter(r => r[metric] != null).sort((a, b) => b[metric] - a[metric]).slice(0, 10);
        chart(id, { chart: { type: 'bar', animation: animation && !reducedMotion }, xAxis: { categories: top.map(r => r.name) }, yAxis: { title: { text: metric === 'Yield' ? 'Production / area' : 'Reported units' } }, legend: { enabled: false }, tooltip: { valueDecimals: metric === 'Yield' ? 3 : 1 }, plotOptions: { series: { animation: animation && !reducedMotion, borderRadius: 3, cursor: 'pointer', point: { events: { click: function () { drillArea(this.options.placeId, level); } } }, dataLabels: { enabled: true, formatter: function () { return number(this.y, metric === 'Yield' ? 3 : 1); }, style: { fontSize: '10px', textOutline: 'none' } } } }, series: [{ name: metric, data: top.map((r, i) => ({ y: r[metric], placeId: r.id, color: colorFor(r.id) })) }] }, top.length);
    }
    function renderPortfolio() {
        const rows = aggregate(data.portfolio.filter(r => r.FiscalYear === data.year), 'CropId', 'CropName').filter(r => r.Area != null).sort((a, b) => b.Area - a.Area).slice(0, 10);
        chart('portfolio-chart', { chart: { type: 'bar' }, xAxis: { categories: rows.map(r => r.name) }, yAxis: { title: { text: 'Area · reported units' } }, legend: { enabled: false }, plotOptions: { series: { cursor: 'pointer', point: { events: { click: function () { focus({ crop: String(this.options.cropId) }); } } } } }, series: [{ name: 'Area', data: rows.map(r => ({ y: r.Area, cropId: r.id, color: colorFor(r.id) })) }] }, rows.length);
    }
    function renderScatter() {
        const rows = grouped(current, 'district').filter(r => r.Area != null && r.Yield != null);
        chart('scatter-chart', { chart: { type: 'scatter' }, xAxis: { title: { text: 'Area · reported units' } }, yAxis: { title: { text: 'Yield · production / area' } }, legend: { enabled: false }, tooltip: { pointFormatter: function () { return escape(this.name) + '<br>Area: ' + number(this.x) + '<br>Yield: ' + number(this.y, 3); } }, plotOptions: { scatter: { marker: { radius: 5 }, cursor: 'pointer', point: { events: { click: function () { drillArea(this.options.placeId, 'district'); } } } } }, series: [{ name: 'Reporting areas', data: rows.map(r => ({ x: r.Area, y: r.Yield, name: r.name, placeId: r.id, color: colorFor(r.id) })) }] }, rows.length);
    }

    async function boundaries(level) {
        if (!geometry[level]) geometry[level] = fetch(root + 'Scripts/polygons/atlas-' + level + '.json').then(r => { if (!r.ok) throw new Error('Map boundaries could not be loaded'); return r.json(); }).catch(e => { delete geometry[level]; throw e; });
        return geometry[level];
    }
    function isMember(id, group) {
        const g = data.geography.find(g => Number(g.id) === Number(id));
        if (!g) return false;
        const name = g.name.toUpperCase();
        return group === '990' ? (g.divisionName || '').toUpperCase().includes('KARACHI') : group === '991' ? name.includes('CHITRAL') : name.includes('KOHISTAN') || name.includes('KOLAI');
    }
    async function renderMap() {
        const seq = ++mapSerial, level = $id('map-level').value, metric = document.querySelector('[data-metric].active').dataset.metric;
        if (!window.L) { $id('map-description').textContent = 'Map library could not be loaded.'; return; }
        try {
            const bounds = await boundaries(level);
            if (seq !== mapSerial) return;
            if (!map) { map = L.map('map', { scrollWheelZoom: false }).setView([29.7, 69.3], 5); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 18 }).addTo(map); }
            const rows = decorate(grouped(current, level), grouped(prior, level));
            const values = rows.map(r => metric === 'Share' ? r.Share : metric === 'Growth' ? r.Growth : r[metric]).filter(v => v != null && Number.isFinite(v));
            const ordered = values.slice().sort((a, b) => a - b);
            const breaks = [...new Set([.2, .4, .6, .8].map(q => ordered[Math.max(0, Math.ceil(ordered.length * q) - 1)]).filter(v => v != null))];
            const greens = { Production: ['#ffe18a', '#a7d96b', '#36bf91', '#098f92', '#12548a'], Area: ['#ffe6a3', '#ffce52', '#f6a32b', '#ee7350', '#b43c58'], Yield: ['#e8dcff', '#c3a5f4', '#9674e2', '#7152cc', '#453394'], Share: ['#ddf4ee', '#a2d9df', '#60b7d6', '#388dc5', '#31599d'] }[metric] || ['#e2ecd5', '#b9d3a1', '#7faa77', '#49825d', '#20553b'];
            const color = value => value == null ? '#e4e5e1' : metric === 'Growth' ? value === 0 ? '#e8eee5' : value < 0 ? '#cc7156' : '#18876f' : greens[breaks.filter(b => value > b).length];
            const rowMap = new Map(rows.map(r => [Number(r.id), r]));
            const specialRows = level === 'district' ? rows.filter(r => combined(r.id)) : [];
            const features = bounds.filter(b => !specialRows.some(r => isMember(b.code, r.id))).map(b => ({ type: 'Feature', geometry: b.boundary, properties: { name: clean(b.name), code: String(b.code), row: rowMap.get(Number(b.code)) } }));
            specialRows.forEach(r => {
                const children = bounds.filter(b => isMember(b.code, r.id));
                const coordinates = children.flatMap(b => b.boundary.type === 'MultiPolygon' ? b.boundary.coordinates : b.boundary.type === 'Polygon' ? [b.boundary.coordinates] : []);
                if (coordinates.length) features.push({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates }, properties: { name: r.name + ' · combined reporting area', code: r.id, row: r } });
            });
            if (layer) layer.remove();
            if (nameLayer) nameLayer.remove();
            nameLayer = L.layerGroup().addTo(map);
            layer = L.geoJSON(features, { style: f => { const r = f.properties.row, v = r ? metric === 'Share' ? r.Share : metric === 'Growth' ? r.Growth : r[metric] : null; return { fillColor: color(v), fillOpacity: .94, color: '#fff', weight: 1, dashArray: combined(f.properties.code) ? '4 3' : null }; }, onEachFeature: (f, l) => {
                const r = f.properties.row, v = r ? metric === 'Share' ? r.Share : metric === 'Growth' ? r.Growth : r[metric] : null;
                const tip = '<b>' + escape(f.properties.name) + '</b>' + escape(metric) + ': ' + number(v, metric === 'Yield' ? 3 : 1) + (metric === 'Share' || metric === 'Growth' ? '%' : '') + (r ? '<br><small>Area ' + number(r.Area) + ' · Production ' + number(r.Production) + '<br>Yield ' + number(r.Yield, 3) + '</small>' : '<br><small>No observation in this selection</small>');
                l.bindTooltip(tip, { className: 'map-tooltip', sticky: true });
                if ($id('labels').checked) L.tooltip({ permanent: true, direction: 'center', className: 'map-name', interactive: false }).setLatLng(l.getBounds().getCenter()).setContent(escape(f.properties.name)).addTo(nameLayer);
                l.on('mouseover', () => l.setStyle({ weight: 2, color: '#274e37' }));
                l.on('mouseout', () => layer.resetStyle(l));
                l.on('click', () => { if (r) drillArea(r.id, level); });
            } }).addTo(map);
            const selected = features.filter(f => f.properties.row);
            mapBounds = features.length ? L.geoJSON(selected.length && state.province !== '0' ? selected : features).getBounds() : null;
            if (mapBounds) map.fitBounds(mapBounds, { padding: [20, 20], maxZoom: 9 });
            const missingColor = '<span><i style="background:#e4e5e1"></i>No data</span>';
            $id('legend').innerHTML = metric === 'Growth' ? '<span><i style="background:#cc7156"></i>Decline</span><span><i style="background:#18876f"></i>Growth</span><span><i style="background:#e8eee5"></i>Unchanged</span>' + missingColor : breaks.concat([Infinity]).map((b, i) => '<span><i style="background:' + greens[i] + '"></i>' + (i ? '> ' + number(breaks[i - 1], metric === 'Yield' ? 3 : 1) + (b === Infinity ? '' : ' – ' + number(b, metric === 'Yield' ? 3 : 1)) : '≤ ' + number(b, metric === 'Yield' ? 3 : 1)) + '</span>').join('') + missingColor;
            if (!values.length) $id('legend').innerHTML = missingColor;
            $id('map-description').textContent = metric === 'Growth' ? 'Production change vs ' + (data.previous || 'preceding year') + '. Click a place to focus this view.' : metric === 'Share' ? 'Share of selected-region crop production. Click a place to focus this view.' : metric + (metric === 'Yield' ? ' = production / area.' : ' in reported source units.') + ' Click a place to focus this view.';
            map.invalidateSize();
        } catch (e) { $id('map-description').textContent = e.message + '. Charts and tables remain available.'; }
    }
    function renderRace() {
        const year = raceYears[raceIndex];
        $id('race-label').textContent = year || '—'; $id('race-year').value = raceIndex;
        const metric = $id('race-metric').value;
        const rows = grouped(history.filter(r => r.FiscalYear === year), 'district').filter(r => r[metric] != null).sort((a, b) => b[metric] - a[metric]).slice(0, 10);
        if (!charts['race-chart']) { bar('race-chart', rows, metric, 'district', true); return; }
        const c = charts['race-chart'];
        c.xAxis[0].setCategories(rows.map(r => r.name), false);
        c.yAxis[0].setTitle({ text: metric === 'Yield' ? 'Production / area' : 'Reported units' }, false);
        c.series[0].update({ name: metric }, false);
        c.series[0].setData(rows.map((r, i) => ({ id: r.id, name: r.name, y: r[metric], placeId: r.id, color: colorFor(r.id) })), true, reducedMotion ? false : { duration: 600 });
    }
    function stopRace() { clearInterval(timer); timer = null; $id('play').textContent = '▶ Play'; }
    function playRace() {
        if (timer) { stopRace(); return; }
        if (raceIndex >= raceYears.length - 1) raceIndex = 0;
        renderRace(); $id('play').textContent = 'Ⅱ Pause';
        timer = setInterval(() => { if (raceIndex >= raceYears.length - 1) { stopRace(); return; } raceIndex++; renderRace(); }, Number($id('speed').value));
    }
    function tableDataset() {
        const mode = $id('table-mode').value;
        if (mode === 'history') { const rows = aggregate(history, 'FiscalYear', 'FiscalYear').sort((a, b) => a.id.localeCompare(b.id)); return rows.map((r, i) => Object.assign(r, { Growth: i ? change(r.Production, rows[i - 1].Production) : null })); }
        if (mode === 'crops') return decorate(aggregate(data.portfolio.filter(r => r.FiscalYear === data.year), 'CropId', 'CropName'), aggregate(data.portfolio.filter(r => r.FiscalYear === data.previous), 'CropId', 'CropName'));
        return decorate(grouped(current, 'district'), grouped(prior, 'district'));
    }
    function renderTable() {
        const mode = $id('table-mode').value, search = $id('search').value.toLowerCase();
        tableRows = tableDataset().filter(r => r.name.toLowerCase().includes(search)).sort((a, b) => { const av = a[sortKey], bv = b[sortKey]; if (av == null) return 1; if (bv == null) return -1; return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * (sortAscending ? 1 : -1); });
        const columns = [['name', mode === 'history' ? 'Fiscal year' : mode === 'crops' ? 'Crop' : 'Reporting area'], ['Area', 'Area'], ['Production', 'Production'], ['Yield', 'Yield'], ['Growth', 'Production change'], ['MissingRows', 'Incomplete records']];
        $id('table-title').textContent = { places: 'Reporting-area detail', history: 'Historical totals', crops: 'Crop composition' }[mode];
        $id('data-table').querySelector('thead').innerHTML = '<tr>' + columns.map(([key, title]) => '<th scope="col" aria-sort="' + (sortKey === key ? sortAscending ? 'ascending' : 'descending' : 'none') + '"><button class="sort-button" data-sort="' + key + '">' + title + (sortKey === key ? sortAscending ? ' ↑' : ' ↓' : '') + '</button></th>').join('') + '</tr>';
        tablePage = Math.min(tablePage, Math.max(0, Math.ceil(tableRows.length / 15) - 1));
        const start = tablePage * 15, shown = tableRows.slice(start, start + 15);
        $id('data-table').querySelector('tbody').innerHTML = shown.length ? shown.map(r => '<tr><td>' + (mode === 'history' ? escape(r.name) : '<button type="button" class="table-focus" data-record="' + escape(r.id) + '" data-record-kind="' + mode + '">' + escape(r.name) + (mode === 'places' && combined(r.id) ? ' · combined' : '') + '</button>') + '</td><td>' + number(r.Area) + '</td><td>' + number(r.Production) + '</td><td>' + number(r.Yield, 3) + '</td><td class="' + (r.Growth >= 0 ? 'positive' : 'negative') + '">' + percent(r.Growth) + '</td><td>' + number(r.MissingRows, 0) + '</td></tr>').join('') : '<tr><td colspan="6">No matching observations.</td></tr>';
        $id('table-count').textContent = tableRows.length ? (start + 1) + '–' + Math.min(start + 15, tableRows.length) + ' of ' + tableRows.length + ' rows' : '0 rows';
        $id('table-prev').disabled = tablePage === 0; $id('table-next').disabled = start + 15 >= tableRows.length;
    }
    function exportCsv() {
        if (!data) return;
        const cell = v => '"' + (typeof v === 'number' ? String(v) : String(v == null ? '' : v).replace(/^[=+@-]/, "'$&")).replace(/"/g, '""') + '"';
        const rows = [['Pakistan Crop Atlas', names[page]], ['Crop', $id('crop').selectedOptions[0].textContent], ['Fiscal year', data.year], ['Geography', $id('selection').textContent], ['Units', 'Reported source units; yield = production / area'], ['Dataset', $id('table-mode').value], ['Name', 'Area', 'Production', 'Yield', 'Production change (%)', 'Incomplete source records']].concat(tableRows.map(r => [r.name, r.Area, r.Production, r.Yield, r.Growth, r.MissingRows]));
        const blob = new Blob(['\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'crop-atlas-' + data.year + '-' + $id('table-mode').value + '.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
    ['crop', 'year', 'province', 'division', 'district'].forEach(id => $id(id).addEventListener('change', () => {
        drillStack.length = 0;
        state[id] = $id(id).value;
        if (id === 'province') { state.division = '0'; state.district = '0'; }
        if (id === 'division') state.district = '0';
        load();
    }));
    $id('reset').onclick = () => { drillStack.length = 0; $id('map-level').value = 'province'; Object.assign(state, { crop: '4', year: '', province: '0', division: '0', district: '0' }); load(); };
    $id('focus-back').onclick = () => { const last = drillStack.pop(); if (last) { Object.assign(state, last.selection); $id('map-level').value = last.level; load(); } };
    $id('focus-trail').addEventListener('click', e => {
        const button = e.target.closest('[data-scope]');
        if (!button || button.hasAttribute('aria-current')) return;
        if (button.dataset.scope === 'national') focus({ province: '0', division: '0', district: '0' }, 'province');
        else if (button.dataset.scope === 'province') focus({ division: '0', district: '0' }, 'division');
        else if (button.dataset.scope === 'division') focus({ district: '0' }, 'district');
    });
    document.querySelectorAll('[data-metric]').forEach(button => button.onclick = () => { document.querySelector('[data-metric].active').classList.remove('active'); button.classList.add('active'); if (data) renderMap(); });
    $id('map-level').onchange = () => { if (data) { renderMap(); } };
    $id('labels').onchange = () => { if (data) renderMap(); };
    $id('race-metric').onchange = () => { if (data) renderRace(); };
    $id('race-year').oninput = () => { stopRace(); raceIndex = Number($id('race-year').value); renderRace(); };
    $id('play').onclick = playRace;
    $id('speed').onchange = () => { if (timer) { stopRace(); playRace(); } };
    $id('search').oninput = () => { tablePage = 0; if (data) renderTable(); };
    $id('table-mode').onchange = () => { tablePage = 0; if (data) renderTable(); };
    $id('table-prev').onclick = () => { tablePage--; renderTable(); };
    $id('table-next').onclick = () => { tablePage++; renderTable(); };
    $id('data-table').addEventListener('click', e => { const record = e.target.closest('[data-record]'); if (record) { if (record.dataset.recordKind === 'crops') focus({ crop: record.dataset.record }); else drillArea(record.dataset.record, 'district'); return; } const button = e.target.closest('[data-sort]'); if (!button) return; sortAscending = sortKey === button.dataset.sort ? !sortAscending : button.dataset.sort === 'name'; sortKey = button.dataset.sort; renderTable(); });
    $id('download').onclick = exportCsv;
    $id('table-download').onclick = exportCsv;
    $id('share').onclick = async () => { try { await navigator.clipboard.writeText(location.href); status('View link copied. It includes the selected crop, year and geography.'); } catch (e) { status('Copy this view link from your browser address bar.'); } };
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopRace(); });
    window.addEventListener('pagehide', stopRace);
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            Object.values(charts).forEach(c => c.reflow());
            if (map && mapBounds) { map.invalidateSize(); map.fitBounds(mapBounds, { padding: [20, 20], maxZoom: 9, animate: false }); }
        }, 150);
    });
    load();
}());
