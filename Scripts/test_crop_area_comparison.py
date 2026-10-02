"""Live and fixture checks for same-level, all-crop area comparisons.

Run with IIS Express at localhost:5187: python Scripts/test_crop_area_comparison.py
"""
import json
import re
import tempfile
from pathlib import Path
from test_crop_area import BASE, ROOT, api, browser


def table_rows(dom):
    table = re.search(r'id="data-table".*?<tbody>(.*?)</tbody>', dom, re.S)
    assert table, 'Comparison table did not render'
    return re.findall(r'<tr>(.*?)</tr>', table.group(1), re.S)


def run():
    with tempfile.TemporaryDirectory(prefix='crop-comparison-tests-') as directory:
        directory = Path(directory)
        for level, a, b in [('province', '2', '3'), ('division', '18', '19'), ('district', '990', '991')]:
            expected = set()
            for area in [a, b]:
                data = api('crop=0&' + level + '=' + area)
                expected.update(r['CropId'] for r in data['history'] if r['FiscalYear'] == data['year'])
            dom = browser(BASE + 'AreaComparison?level=' + level + '&a=' + a + '&b=' + b, directory)
            assert 'Data loaded | Two ' in dom
            assert 'id="crop"' not in dom
            assert len(table_rows(dom)) == len(expected), 'Comparison must include the union of reported crops'
            assert len(re.findall('class="stat compare-stat"', dom)) == 4
            assert dom.count('class="leaflet-interactive"') >= 2, 'Both maps must render'
            assert 'Same scale on both maps' in dom
            if level == 'district':
                assert 'stroke-dasharray="4 3"' in dom, 'Combined reporting areas must stay combined'
            print('PASS:', level, 'comparison, all-crop union, paired cards and both maps')
        geo = [dict(id='1', name='Alpha', province='2', provinceName='North', division='10', divisionName='Upper', combined=False), dict(id='2', name='Beta', province='3', provinceName='South', division='20', divisionName='Lower', combined=False)]
        observations = []
        for side in [0, 1]:
            for crop, name in [(1, 'Wheat'), (2, 'Rice'), (3, 'Maize'), (4, 'Cotton')]:
                if not side and crop == 4:
                    continue
                for year in ['2023-24', '2024-25']:
                    area, production, missing = 10, 10, 0
                    if year == '2024-25':
                        production = 16 if not side else 20
                        if not side and crop == 2: area = 0
                        if not side and crop == 3: missing = 1
                    g = geo[side]
                    observations.append(dict(CropId=crop, CropName=name, FiscalYear=year, DistrictId=g['id'], DistrictName=g['name'], ProvinceId=g['province'], ProvinceName=g['provinceName'], DivisionId=g['division'], DivisionName=g['divisionName'], Area=area, Production=production, MissingRows=missing))
        fixture = dict(year='2024-25', previous='2023-24', years=['2024-25', '2023-24'], geography=geo,
                       reportingAreas=[dict(province=g['province'], division=g['division'], district=g['id']) for g in geo], history=observations)
        bounds = [dict(code=str(code), name='Sample area', boundary=dict(type='Polygon', coordinates=[[[70 + i, 30], [70.5 + i, 30], [70.5 + i, 30.5], [70 + i, 30.5], [70 + i, 30]]])) for i, code in enumerate([10, 20, 1, 2])]
        html = (ROOT / 'Views/Crops/AreaComparison.cshtml').read_text(encoding='utf-8')
        html = html[html.index('<!DOCTYPE'):]
        html = re.sub(r'@Url.Content\("~/(.*?)"\)', lambda m: (ROOT / m.group(1)).as_uri() + ('/' if not m.group(1) else ''), html)
        html = html.replace('@Url.Action("Explore", "Crops")', '/Crops/Explore').replace('@Html.Partial("_CropFooter")', '')
        html = html.replace('@Html.Partial("_CropNavigation")', '<aside id="crop-navigation"><button id="menu-close"></button><button id="share"></button><button id="download"></button></aside><button class="nav-backdrop" hidden></button>')
        setup = '<script>const fixture=' + json.dumps(fixture) + '; const bounds=' + json.dumps(bounds) + '; window.errors=[]; window.requests=[]; window.addEventListener("error",e=>errors.push(e.message)); window.fetch=async url=>{if(String(url).includes("polygons"))return {ok:true,json:async()=>bounds};const q=new URL(url,"http://localhost:5187").searchParams;requests.push(Object.fromEntries(q));const key=q.has("province")?"ProvinceId":q.has("division")?"DivisionId":"DistrictId";const area=q.get("province")||q.get("division")||q.get("district");return {ok:true,json:async()=>({...fixture,history:q.get("metadataOnly")?[]:fixture.history.filter(r=>r[key]===area)})}};</script>'
        html = html.replace('<head>', '<head>' + setup)
        checks = r"""<script>
setTimeout(async()=>{const assert=(value,message)=>{if(!value)throw Error(message)};const wait=()=>new Promise(resolve=>setTimeout(resolve,100));
try {
assert(document.querySelectorAll('#data-table tbody tr').length===4,'Missing crop union');
document.querySelector('#table-metric').value='Yield';document.querySelector('#table-metric').dispatchEvent(new Event('change'));
const getCells=name=>Array.from(document.querySelectorAll('#data-table tbody tr')).find(r=>r.children[0].textContent===name).children;
assert(getCells('Wheat')[3].textContent==='-0.4','Yield difference calculation');
assert(getCells('Wheat')[4].textContent==='-20%','Yield ratio calculation');
assert(getCells('Rice')[1].textContent==='—','Zero-area yield');
assert(getCells('Maize')[1].textContent==='—','Incomplete yield');
assert(getCells('Cotton')[1].textContent==='—' && getCells('Cotton')[7].textContent==='B only','Missing crop must not become zero');
assert(document.querySelector('#area-a option[value="3"]').disabled,'Same-area selection not prevented');
document.querySelector('#swap').click();await wait();
assert(document.querySelector('#name-a').textContent==='South','Swap failed');
assert(getCells('Wheat')[3].textContent==='0.4','Swap must reverse differences');
document.querySelector('#compare-level').value='division';document.querySelector('#compare-level').dispatchEvent(new Event('change'));await wait();
assert(['10','20'].includes(document.querySelector('#area-a').value) && ['10','20'].includes(document.querySelector('#area-b').value) && document.querySelector('#area-a').value!==document.querySelector('#area-b').value,'Level change retained invalid IDs');
assert(requests.filter(r=>!r.metadataOnly).every(r=>r.crop==='0'&&['province','division','district'].filter(k=>k in r).length===1),'Mixed levels or crop restriction');
document.querySelector('#search').value='Wheat';document.querySelector('#search').dispatchEvent(new Event('input'));
assert(document.querySelectorAll('#data-table tbody tr').length===1,'Search failed');
assert(document.documentElement.scrollWidth<=innerWidth+1,'Horizontal overflow');
assert(!errors.length,errors.join(';'));
document.body.dataset.validation='PASS';
}catch(e){document.body.dataset.validation='FAIL: '+e.message}
},2500);</script>"""
        html = html.replace('</body>', checks + '</body>')
        path = directory / 'fixture.html'; path.write_text(html, encoding='utf-8')
        for width in [1440, 390, 320]:
            dom = browser(path.as_uri(), directory, width=width)
            result = re.search(r'data-validation="([^"]+)"', dom)
            assert result and result.group(1) == 'PASS', result.group(1) if result else 'Fixture checks did not run'
            print('PASS:', width, 'px; calculation, missing data, swap, hierarchy change, search and layout')


if __name__ == '__main__':
    run()
