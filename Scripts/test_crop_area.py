"""Area-profile integration checks with IIS Express and installed Chrome.

Run: python Scripts/test_crop_area.py
Requires the application at http://localhost:5187; no browser Python packages.
"""
import json
import os
import re
import subprocess
import tempfile
import urllib.request
from pathlib import Path

BASE = 'http://localhost:5187/Crops/'
ROOT = Path(__file__).resolve().parents[1]
CHROME = Path(os.environ.get('PROGRAMFILES', r'C:\Program Files')) / 'Google/Chrome/Application/chrome.exe'


def api(query):
    with urllib.request.urlopen(BASE + 'Explore?' + query, timeout=60) as response:
        return json.load(response)


def browser(url, directory, width=1440):
    args = [str(CHROME), '--headless', '--disable-gpu', '--no-first-run',
            '--no-default-browser-check', '--allow-file-access-from-files',
            '--user-data-dir=' + str(directory / 'profile'),
            '--window-size=' + str(width) + ',1100', '--dump-dom',
            '--virtual-time-budget=15000', url]
    startup = subprocess.STARTUPINFO() if os.name == 'nt' else None
    if startup:
        startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startup.wShowWindow = 0
    result = subprocess.run(args, capture_output=True, timeout=90, startupinfo=startup)
    assert result.returncode == 0, result.stderr.decode('utf-8', errors='replace')[:1000]
    return result.stdout.decode('utf-8', errors='replace')


def rendered(dom):
    assert 'Data loaded | All crops' in dom, 'Area request did not complete'
    assert 'id="crop"' not in dom, 'Area profile exposes a crop selector'
    assert len(re.findall('class="stat-value"', dom)) == 4
    table = re.search(r'id="data-table".*?<tbody>(.*?)</tbody>', dom, re.S).group(1)
    return re.findall(r'<tr>(.*?)</tr>', table, re.S)


def run():
    metadata = api('crop=0&metadataOnly=true')
    assert not metadata['history'] and not metadata['portfolio']
    assert metadata['reportingAreas']
    with tempfile.TemporaryDirectory(prefix='crop-area-tests-') as directory:
        directory = Path(directory)
        for level, area in [('province', '2'), ('division', '18'), ('district', '990')]:
            data = api('crop=0&' + level + '=' + area)
            key = level.capitalize() + 'Id'
            assert data['history'] and all(r[key] == area for r in data['history'])
            crop_ids = {r['CropId'] for r in data['history'] if r['FiscalYear'] == data['year']}
            assert len(crop_ids) > 1, 'Area history is restricted to one crop'
            route = level.capitalize() + 'Profile?' + level + '=' + area
            dom = browser(BASE + route, directory)
            assert len(rendered(dom)) == len(crop_ids)
            assert 'id="yield-progress"' in dom and 'highcharts-container' in dom
            assert 'leaflet-interactive' in dom, 'Map boundaries did not render'
            assert not re.search(r'NaN|Infinity', re.search(r'id="data-table".*?</table>', dom, re.S).group(0))
            print('PASS:', level, 'profile renders', len(crop_ids), 'crops with scoped history, charts and map')
        with urllib.request.urlopen(BASE + 'AreaProfile?district=990&crop=4') as response:
            assert 'DistrictProfile' in response.url and 'crop=' not in response.url
        # Render the actual area script with zero-area and incomplete crop records.
        fixture = dict(metadata)
        fixture['year'], fixture['previous'] = '2024-25', '2023-24'
        fixture['years'] = ['2024-25', '2023-24', '2022-23']
        fixture['geography'] = [dict(id='1', name='ALPHA', province='2', provinceName='PUNJAB', division='10', divisionName='CENTRAL', combined=False)]
        fixture['history'] = []
        for crop, name in [(4, 'Wheat'), (5, 'Rice'), (6, 'Cotton')]:
            for year, production in [('2022-23', 20), ('2023-24', 30), ('2024-25', 40)]:
                fixture['history'].append(dict(CropId=crop, CropName=name, FiscalYear=year,
                    DistrictId='1', DistrictName='ALPHA', ProvinceId='2', ProvinceName='PUNJAB',
                    DivisionId='10', DivisionName='CENTRAL', Area=0 if crop == 6 and year == '2024-25' else 10,
                    Production=(15 if crop == 4 and year == '2024-25' else 300 if crop == 5 and year == '2024-25' else production), MissingRows=1 if crop == 5 and year == '2024-25' else 0))
        dom = (ROOT / 'Views/Crops/AreaDashboard.cshtml').read_text(encoding='utf-8')
        dom = dom[dom.index('<!DOCTYPE'):]
        dom = re.sub(r'@Url.Content\("~/(.*?)"\)', lambda m: (ROOT / m.group(1)).as_uri() + ('/' if not m.group(1) else ''), dom)
        dom = dom.replace('@label.ToUpper()S', 'PROVINCES').replace('@label.ToLower()', 'province').replace('@label', 'Province').replace('@level', 'province').replace('@Url.Action("Explore", "Crops")', '/Crops/Explore')
        dom = dom.replace('@Html.Partial("_CropNavigation")', '<aside id="crop-navigation"><button id="menu-close"></button><button id="share"></button><button id="download"></button></aside><button class="nav-backdrop" hidden></button>').replace('@Html.Partial("_CropFooter")', '')
        bounds = [dict(code='10', name='CENTRAL', boundary=dict(type='Polygon', coordinates=[[[70, 30], [71, 30], [71, 31], [70, 31], [70, 30]]]))]
        dom = dom.replace('<head>', '<head><script>window.fetch=async url=>({ok:true,json:async()=>String(url).includes("polygons")?' + json.dumps(bounds) + ':' + json.dumps(fixture) + '});</script>')
        validation = r"""<script>setTimeout(()=>{try{
const assert=(v,m)=>{if(!v)throw Error(m)};
const wheat=()=>Array.from(document.querySelectorAll('.heat-table tbody tr')).find(r=>r.children[0].textContent==='Wheat');
assert(document.querySelector('#heat-range').textContent.includes('3 fiscal years'),'Actual year count');
assert(document.querySelectorAll('.heat-table thead th').length===5,'Years and summary column');
assert(wheat().children[3].textContent==='-50%','Yield change calculation');
const rice=Array.from(document.querySelectorAll('.heat-table tbody tr')).find(r=>r.children[0].textContent==='Rice');
assert(rice.children[3].textContent==='\u2014','Incomplete heat-table yield');
document.querySelector('[data-heat-metric="Production"]').click();
assert(document.querySelector('#heat-title').textContent.startsWith('Production'),'Production control');
const globalShade=wheat().children[3].style.backgroundColor;
document.querySelector('#heat-scale').value='row';document.querySelector('#heat-scale').dispatchEvent(new Event('change'));
assert(wheat().children[3].style.backgroundColor!==globalShade,'Row gradient scaling');
document.querySelector('#heat-scale').value='column';document.querySelector('#heat-scale').dispatchEvent(new Event('change'));
assert(document.querySelector('#heat-note').textContent.includes('within each year column'),'Column scale explanation');
document.querySelector('[data-heat-metric="Area"]').click();
const cotton=Array.from(document.querySelectorAll('.heat-table tbody tr')).find(r=>r.children[0].textContent==='Cotton');
assert(cotton.children[3].textContent==='-100%','Zero current area must be a valid decline');
document.querySelector('#heat-years').value='all';document.querySelector('#heat-years').dispatchEvent(new Event('change'));
assert(document.querySelector('#heat-range').textContent.includes('3 fiscal years'),'All years selector');
assert(location.search.includes('heat=Area')&&location.search.includes('span=all')&&location.search.includes('scale=column'),'Shareable heat settings');
assert(document.documentElement.scrollWidth<=innerWidth+1,'Mobile overflow');
document.body.dataset.heatValidation='PASS';document.body.dataset.overflow='false';
}catch(e){document.body.dataset.heatValidation='FAIL: '+e.message}},2000)</script>"""
        dom = dom.replace('</body>', validation + '</body>')
        path = directory / 'fixture.html'; path.write_text(dom, encoding='utf-8')
        fixture_dom = browser(path.as_uri(), directory, width=390)
        rows = rendered(fixture_dom)
        assert len(rows) == 3
        for name in ['Rice', 'Cotton']:
            row = next(r for r in rows if name in r)
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)
            assert cells[3] == '\u2014' and cells[5] == '\u2014', name + ' must have undefined yield and yield change'
        result = re.search(r'data-heat-validation="([^"]+)"', fixture_dom)
        assert result and result.group(1) == 'PASS', result.group(1) if result else 'Heat checks did not run'
        assert 'data-overflow="false"' in fixture_dom, 'Mobile page overflows horizontally'
        print('PASS: legacy links, missing yield, heat metrics, row/column gradients, year spans, shared settings and mobile layout')


if __name__ == '__main__':
    run()
