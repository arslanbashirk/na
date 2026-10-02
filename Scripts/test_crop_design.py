"""Visual and in-page focus regression checks against the local IIS preview."""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(os.environ['TEMP']) / 'crop-atlas-test-libs'))
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1100})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    def ready():
        page.wait_for_function("document.querySelector('#status').textContent.startsWith('Data loaded') && !document.body.classList.contains('busy')", timeout=60000)
    page.set_viewport_size({'width': 1440, 'height': 1600})
    banner_sources = set()
    for route in ['Home', 'CropProfile', 'AreaProfile', 'Compare']:
        page.goto('http://localhost:5187/Crops/' + route)
        ready()
        page.locator('#insights').scroll_into_view_if_needed()
        page.wait_for_function("Array.from(document.querySelectorAll('.harvest-photo, .insight-story-photo')).every(img => img.complete && img.naturalWidth > 1000)")
        assert page.locator('.insight-story-photo').count() == 2
        assert page.locator('.ranking-panel').count() == 0
        banner_sources.add(page.locator('.harvest-photo').get_attribute('src'))
        page.evaluate('scrollTo(0, 0)')
        page.wait_for_timeout(800)
        page.locator('.harvest-hero').screenshot(path=str(Path(os.environ['TEMP']) / ('crop-banner-' + route + '.png')))
        page.locator('#insights').screenshot(path=str(Path(os.environ['TEMP']) / ('crop-insights-' + route + '.png')))
    assert len(banner_sources) == 4
    page.set_viewport_size({'width': 1440, 'height': 1100})
    page.goto('http://localhost:5187/Crops/Home')
    ready()
    page.wait_for_selector('.leaflet-interactive')
    page.wait_for_timeout(800)
    assert page.locator('.harvest-photo').evaluate('(img) => img.complete && img.naturalWidth > 1000')
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-harvest-desktop.png'), full_page=True)
    def point_click(chart, condition='true'):
        page.evaluate('''([id, condition]) => {
            const chart = Highcharts.charts.find(c => c && c.renderTo.id === id);
            const point = chart.series[0].points.find(p => new Function('p', 'return ' + condition)(p));
            if (!point) throw Error('No clickable point: ' + id);
            point.firePointEvent('click');
        }''', [chart, condition])
        ready()
        assert page.evaluate('location.pathname') == '/Crops/Home'
        assert page.locator('#focus-back').is_visible()
    for chart in ['scatter-chart', 'portfolio-chart']:
        point_click(chart, "String(p.options.cropId) !== document.querySelector('#crop').value" if chart == 'portfolio-chart' else 'true')
        page.click('#focus-back')
        ready()
        assert page.locator('#province').input_value() == '0'
        assert page.locator('#district').input_value() == '0'
    page.click('#data-table [data-record] >> nth=0')
    ready()
    assert page.evaluate('location.pathname') == '/Crops/Home'
    assert page.locator('#district').input_value() != '0'
    page.click('#focus-trail [data-scope="national"]')
    ready()
    assert page.locator('#province').input_value() == '0'
    page.wait_for_timeout(1200)
    # A real Leaflet polygon click must focus the existing view as well.
    page.locator('.leaflet-interactive:not([fill="#e4e5e1"])').first.dispatch_event('click')
    ready()
    assert page.evaluate('location.pathname') == '/Crops/Home'
    assert page.locator('#province').input_value() != '0'
    page.click('#focus-back')
    ready()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(1600)
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-harvest-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.goto('http://localhost:5187/Crops/Compare')
    ready()
    page.evaluate("Highcharts.charts.find(c => c && c.renderTo.id === 'race-chart').series[0].points[0].firePointEvent('click')")
    ready()
    assert page.evaluate('location.pathname') == '/Crops/Compare'
    assert page.locator('#district').input_value() != '0'
    assert page.locator('.section-nav a[href="#profile-section"]').is_hidden()
    for width in [320, 390]:
        page.set_viewport_size({'width': width, 'height': 844})
        for route in ['Home', 'CropProfile', 'AreaProfile', 'Compare']:
            page.goto('http://localhost:5187/Crops/' + route)
            ready()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (route, width)
            assert page.evaluate("document.querySelector('.hero-copy').getBoundingClientRect().bottom < document.querySelector('.harvest-hero').getBoundingClientRect().bottom"), (route, width)
    assert not errors, errors
    print('PASS: four distinct banners, image-backed insights, in-page drilldowns, mobile banner layouts and browser errors')
    browser.close()
