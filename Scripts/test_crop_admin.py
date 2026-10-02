"""Browser checks for admin authorization and CSV previews; never commits live data."""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(os.environ['TEMP']) / 'crop-atlas-test-libs'))
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5187'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1100})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '/Crops/Home')
    page.wait_for_function("document.querySelector('#status').textContent.startsWith('Data loaded')", timeout=60000)
    assert page.locator('.admin-links').count() == 0
    assert page.locator('.crop-strip').count() == 0
    assert page.locator('.brand-crop use').count() == 1
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-atlas-color-desktop.png'), full_page=True)
    for route in ['Explorer', 'Import', 'Template']:
        page.goto(BASE + '/CropAdmin/' + route)
        assert '/CropAdmin/Login' in page.url
    response = context.request.post(BASE + '/CropAdmin/Commit', form={'token': 'fake'})
    assert '/CropAdmin/Login' in response.url
    print('PASS: anonymous admin links hidden; direct admin URLs and commit protected')
    page.goto(BASE + '/CropAdmin/Login')
    page.fill('[name=username]', 'admin')
    page.fill('[name=password]', 'incorrect-test-password')
    page.click('button[type=submit]')
    assert page.locator('.validation-summary-errors').count() == 1
    page.fill('[name=username]', 'admin')
    page.fill('[name=password]', 'crops@2026')
    page.click('button[type=submit]')
    page.wait_for_url('**/CropAdmin/Explorer')
    assert page.locator('h1').inner_text() == 'Explore the crop data'
    page.select_option('[name=crop]', '4')
    page.fill('[name=search]', 'Bannu')
    page.click('.admin-filters button[type=submit]')
    page.wait_for_load_state('domcontentloaded')
    assert page.locator('tbody tr').count() > 0
    district = page.locator('tbody tr').first.locator('td').nth(0).locator('strong').inner_text()
    code = page.locator('tbody tr').first.locator('td').nth(1).inner_text().strip()
    year = page.locator('tbody tr').first.locator('td').nth(3).inner_text().strip()
    print('PASS: login and crop-filtered source explorer')
    page.goto(BASE + '/Crops/Home')
    assert page.locator('.admin-links a').count() == 2
    page.goto(BASE + '/CropAdmin/Import')
    response = context.request.post(BASE + '/CropAdmin/Preview', multipart={'crop': '4', 'file': {'name': 'csrf.csv', 'mimeType': 'text/csv', 'buffer': b'District,dist_code,fiscalyear,Area,Production\nTest,001,2026-27,1,2'}})
    assert response.status >= 400
    print('PASS: authenticated admin links visible; upload rejects missing CSRF token')

    def preview(content):
        page.goto(BASE + '/CropAdmin/Import')
        page.select_option('[name=crop]', '4')
        page.set_input_files('[name=file]', {'name': 'observations.csv', 'mimeType': 'text/csv', 'buffer': content.encode()})
        page.click('button:has-text("Validate & preview")')
        page.wait_for_load_state('domcontentloaded')

    header = 'District,dist_code,fiscalyear,Area,Production\n'
    preview(header + 'Atlas preview only,001,2026-27,10,20\nKarachi preview only,990,2026-27,0,10\n')
    assert page.locator('input[name=token]').count() == 1
    assert page.locator('h2', has_text='2 observations ready').count() == 1
    assert page.locator('tbody tr').first.locator('td').last.inner_text() == '2.000'
    assert page.locator('tbody tr').last.locator('td').last.inner_text() == '\u2014'
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-atlas-import-preview.png'), full_page=True)
    print('PASS: crop-specific preview, combined code accepted, calculated yield and zero-area handling')
    preview(header + f'{district},{code},{year},1,2\n')
    assert 'already exist' in page.locator('.notice.error').inner_text()
    preview(header + 'Test,001,2026-27,-1,2\n')
    assert 'non-negative' in page.locator('.notice.error').inner_text()
    preview(header + 'Test,999,2026-27,1,2\n')
    assert 'valid reporting-area code' in page.locator('.notice.error').inner_text()
    preview(header + 'Test,001,2026-28,1,2\n')
    assert 'consecutive fiscal year' in page.locator('.notice.error').inner_text()
    preview(header + 'Test,001,2026-27,1,2\nTest,001,2026-27,2,4\n')
    assert 'repeated' in page.locator('.notice.error').inner_text()
    print('PASS: existing keys, negative values, unknown codes, malformed years and duplicate file keys rejected')
    page.goto(BASE + '/Crops/Home')
    page.click('button:has-text("Sign out")')
    page.wait_for_url('**/Crops/Home')
    assert page.locator('.admin-links').count() == 0
    page.goto(BASE + '/CropAdmin/Explorer')
    assert '/CropAdmin/Login' in page.url
    assert not errors, errors
    print('PASS: logout revokes access; no browser errors; no live records imported')
    browser.close()
