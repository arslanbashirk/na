"""Check database category metadata and SVG chart labels against the running app."""
import tempfile
from pathlib import Path
from test_crop_area import api, browser, BASE

catalog = api('metadataOnly=true')['crops']
lookup = {c['name']: c for c in catalog}
for name, category, icon in [('Wheat', 'grains', 'wheat'), ('Rice', 'grains', 'rice'), ('Sunflower', 'oilseeds', 'oilseed'), ('MANGO', 'fruits', 'fruit'), ('Gram', 'pulses', 'pulse'), ('newCrop', 'uncategorized', 'shell-sprout')]:
    assert lookup[name]['categoryKey'] == category and lookup[name]['icon'] == icon, name
with tempfile.TemporaryDirectory(prefix='crop-category-check-') as temp:
    directory = Path(temp)
    for page in ['Home', 'ProvinceProfile?province=2', 'AreaComparison?level=province&a=2&b=3']:
        dom = browser(BASE + page, directory / page.split('?')[0])
        assert 'highcharts-axis-labels' in dom and 'class="crop-category-label"' in dom, page
        assert 'Content/crop-icons.svg#' in dom, page
print('PASS: stored category metadata and SVG crop labels on overview, area profile and comparison')
