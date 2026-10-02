"""Live integration checks. Run with IIS Express at localhost:5187 and Playwright available."""
import json
import math
import os
from pathlib import Path
import sys
import urllib.request

sys.path.insert(0, str(Path(os.environ['TEMP']) / 'crop-atlas-test-libs'))
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5187'


def api(query='crop=4'):
    with urllib.request.urlopen(BASE + '/Crops/Explore?' + query, timeout=60) as response:
        return json.load(response)


national = api()
assert national['year'] == max(national['years'])
combined = [g for g in national['geography'] if g['combined']]
assert {g['id'] for g in combined} == {'990', '991', '992'}
assert all(g['province'] and g['division'] for g in combined)
current = [r for r in national['history'] if r['FiscalYear'] == national['year']]
province_total = 0
for province in sorted({r['ProvinceId'] for r in current}):
    regional = api('crop=4&province=' + province)
    assert all(r['ProvinceId'] == province for r in regional['history'])
    province_total += sum(r['Production'] or 0 for r in regional['history'] if r['FiscalYear'] == national['year'])
assert math.isclose(province_total, sum(r['Production'] or 0 for r in current), rel_tol=1e-10)
karachi = api('crop=4&province=3&division=18&district=990')
assert karachi['history'] and all(r['DistrictId'] == '990' for r in karachi['history'])
print('PASS: API coverage, combined mappings, province reconciliation and area scoping')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, accept_downloads=True)
    page = context.new_page()
    errors = []
    def page_error(error):
        errors.append(str(error))
        print('BROWSER ERROR:', error, flush=True)
    page.on('pageerror', page_error)
    for route in ['Home', 'CropProfile', 'Compare']:
        response = page.goto(BASE + '/Crops/' + route, wait_until='domcontentloaded')
        assert response.status == 200, route
        page.wait_for_function("document.querySelector('#status').textContent.startsWith('Data loaded')", timeout=60000)
        page.wait_for_selector('.highcharts-container', timeout=30000)
        assert page.locator('.stat').count() == 4
        assert page.locator('#data-table tbody tr').count() > 0
        assert '\u00e2' not in page.locator('.brand').inner_text()
        assert page.locator('.pbs-brand-logo').count() == 1
        print('PASS: rendered', route)
    page.click('#play')
    # Race begins at the earliest year when the selection is the final year.
    before = page.locator('#race-label').inner_text()
    page.wait_for_function('(year) => document.querySelector("#race-label").textContent !== year', arg=before, timeout=5000)
    page.click('#play')
    # Single-crop map behavior remains on the overview; area pages have their own suite.
    page.goto(BASE + '/Crops/Home?crop=4&province=3&division=18&district=990')
    page.wait_for_function("document.querySelector('#status').textContent.startsWith('Data loaded')", timeout=60000)
    assert 'KARACHI' in page.locator('#selection').inner_text()
    page.select_option('#map-level', 'district')
    page.wait_for_function("document.querySelector('#map-description').textContent.startsWith('Production')", timeout=30000)
    page.wait_for_selector('.leaflet-interactive[stroke-dasharray]', timeout=30000)
    page.check('#labels')
    page.wait_for_selector('.map-name', timeout=30000)
    page.uncheck('#labels')
    page.select_option('#table-mode', 'history')
    with page.expect_download() as download:
        page.click('#table-download')
    assert download.value.suggested_filename.endswith('.csv')
    page.select_option('#province', '2')
    page.wait_for_function("document.querySelector('#status').textContent.startsWith('Data loaded') && document.querySelector('#selection').textContent.includes('PUNJAB')", timeout=30000)
    assert page.locator('#division').input_value() == '0'
    assert page.locator('#district').input_value() == '0'
    page.select_option('#map-level', 'district')
    page.wait_for_selector('.leaflet-interactive', state='attached', timeout=30000)
    page.click('[data-metric="Yield"]')
    page.wait_for_function("document.querySelector('#map-description').textContent.startsWith('Yield')", timeout=30000)
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(900)  # Let chart transitions settle before visual review.
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-atlas-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-atlas-mobile.png'), full_page=True)
    assert not errors, errors
    print('PASS: race playback, combined profile, CSV, cascading filters, map metric, mobile layout; no JavaScript errors')
    # Exercise the yield policy using a realistic incomplete/zero-area API fixture.
    fixture = national.copy()
    fixture['history'] = [dict(current[0], Area=0, Production=10, MissingRows=0)]
    fixture['portfolio'] = fixture['history']
    page.route('**/Crops/Explore?*', lambda route: route.fulfill(json=fixture))
    page.goto(BASE + '/Crops/Home')
    page.wait_for_function("document.querySelector('#status').textContent.startsWith('Data loaded')", timeout=30000)
    assert page.locator('.stat-value').nth(2).inner_text() == '—'
    print('PASS: zero-area yield is undefined, not Infinity or a fabricated zero')
    browser.close()
