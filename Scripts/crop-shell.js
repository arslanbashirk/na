(function () {
    'use strict';
    const toggle = document.getElementById('menu-toggle');
    const close = document.getElementById('menu-close');
    const sidebar = document.getElementById('crop-navigation');
    const backdrop = document.querySelector('.nav-backdrop');
    const main = document.getElementById('main-content');
    const mobile = window.matchMedia('(max-width: 960px)');
    if (!toggle || !sidebar) return;
    function setOpen(open, restoreFocus) {
        open = open && mobile.matches;
        document.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        backdrop.hidden = !open;
        main.inert = open;
        sidebar.inert = mobile.matches && !open;
        if (open) {
            sidebar.setAttribute('role', 'dialog');
            sidebar.setAttribute('aria-modal', 'true');
            requestAnimationFrame(() => { if (main.inert) close.focus(); });
        } else {
            sidebar.removeAttribute('role');
            sidebar.removeAttribute('aria-modal');
            if (restoreFocus) toggle.focus();
        }
    }
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true', true));
    close.addEventListener('click', () => setOpen(false, true));
    backdrop.addEventListener('click', () => setOpen(false, true));
    sidebar.addEventListener('click', event => { if (event.target.closest('a') && mobile.matches) setOpen(false, false); });
    sidebar.addEventListener('transitionend', () => {
        if (main.inert && !sidebar.contains(document.activeElement)) close.focus();
    });
    document.addEventListener('keydown', event => {
        if (!document.body.classList.contains('menu-open')) return;
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
        if (event.key === 'Tab') {
            const targets = Array.from(sidebar.querySelectorAll('a[href], button, summary')).filter(el => el.getClientRects().length);
            const first = targets[0], last = targets[targets.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
    mobile.addEventListener('change', () => setOpen(false, false));
    setOpen(false, false);
}());
