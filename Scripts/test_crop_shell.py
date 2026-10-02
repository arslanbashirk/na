"""Check shared crop navigation, account visibility and mobile drawer behavior."""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(os.environ['TEMP']) / 'crop-atlas-test-libs'))
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for route, active in [('Home', 'overview'), ('CropProfile', 'crop'), ('AreaProfile', 'area'), ('Compare', 'compare')]:
        response = page.goto('http://localhost:5187/Crops/' + route)
        assert response.status == 200
        page.wait_for_function("document.querySelector('#status').textContent.startsWith('Data loaded')", timeout=60000)
        if active == 'area':
            assert page.locator('.area-submenu [aria-current="page"]').get_attribute('data-area-nav') == 'province'
        else:
            assert page.locator('.atlas-menu [aria-current="page"]').get_attribute('data-nav') == active
        assert page.locator('.admin-links').count() == 0
        assert page.locator('.atlas-footer').is_visible()
        assert page.locator('#menu-toggle').is_hidden()
    page.goto('http://localhost:5187/Crops/Home')
    page.wait_for_function("document.querySelector('#status').textContent.startsWith('Data loaded')", timeout=60000)
    page.wait_for_timeout(1200)
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-shell-desktop.png'))
    page.locator('.atlas-footer').screenshot(path=str(Path(os.environ['TEMP']) / 'crop-shell-footer.png'))
    for width in [320, 390, 768, 960]:
        page.set_viewport_size({'width': width, 'height': 844})
        page.wait_for_timeout(250)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        assert page.locator('#menu-toggle').is_visible()
        assert page.locator('#crop-navigation').evaluate('(el) => el.inert')
        page.click('#menu-toggle')
        assert page.locator('#menu-toggle').get_attribute('aria-expanded') == 'true'
        assert page.locator('#crop-navigation').get_attribute('aria-modal') == 'true'
        assert page.locator('#main-content').evaluate('(el) => el.inert')
        page.wait_for_function("getComputedStyle(document.querySelector('#crop-navigation')).visibility === 'visible'")
        page.locator('#crop-navigation a').last.focus()
        assert page.evaluate('document.activeElement === document.querySelector("#crop-navigation .sidebar-utility a:last-child")'), page.evaluate('({tag: document.activeElement.tagName, cls: document.activeElement.className, visibility: getComputedStyle(document.querySelector("#crop-navigation")).visibility})')
        page.keyboard.press('Tab')
        assert page.evaluate('document.activeElement === document.querySelector("#crop-navigation a")'), page.evaluate('({tag: document.activeElement.tagName, cls: document.activeElement.className})')
        page.keyboard.press('Shift+Tab')
        assert page.evaluate('document.activeElement === document.querySelector("#crop-navigation .sidebar-utility a:last-child")')
        page.keyboard.press('Escape')
        assert page.locator('#menu-toggle').get_attribute('aria-expanded') == 'false'
        assert not page.locator('#main-content').evaluate('(el) => el.inert')
        page.click('#menu-toggle')
        page.click('#menu-close')
        assert page.locator('#menu-toggle').get_attribute('aria-expanded') == 'false'
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(350)
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-shell-mobile.png'))
    page.click('#menu-toggle')
    page.wait_for_timeout(350)
    page.screenshot(path=str(Path(os.environ['TEMP']) / 'crop-shell-mobile-menu.png'))
    page.click('#crop-navigation [data-nav="crop"]')
    page.wait_for_url(lambda url: '/Crops/CropProfile' in url)
    assert page.locator('#menu-toggle').get_attribute('aria-expanded') == 'false'
    page.set_viewport_size({'width': 1440, 'height': 1000})
    assert not page.locator('#crop-navigation').evaluate('(el) => el.inert')
    page.goto('http://localhost:5187/CropAdmin/Login')
    assert page.locator('.atlas-header').is_visible()
    assert page.locator('.atlas-footer').is_visible()
    assert page.locator('.admin-links').count() == 0
    assert not errors, errors
    print('PASS: public and admin shell, active navigation, anonymous visibility, responsive widths, mobile focus trap, Escape and navigation')
    browser.close()
