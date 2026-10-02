/* Shared SVG crop library; categories and optional crop overrides come from Explore. */
(function () {
    'use strict';
    const allowed = new Set(['wheat', 'rice', 'maize', 'cotton', 'cane', 'fruit', 'vegetable', 'pulse', 'potato', 'oilseed', 'spice', 'fodder', 'nut', 'shell-sprout']);
    const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const clean = value => String(value || '').trim().toLowerCase();
    function entry(catalog, name) { return (catalog || []).find(c => clean(c.name) === clean(name)); }
    function symbol(catalog, name) { const crop = entry(catalog, name); return crop && allowed.has(crop.icon) ? crop.icon : 'shell-sprout'; }
    function label(catalog, name, root) {
        const crop = entry(catalog, name);
        return '<span class="crop-category-label" title="' + esc(crop?.category || 'Uncategorized') + '"><svg aria-hidden="true" focusable="false"><use href="' + esc(root + 'Content/crop-icons.svg#' + symbol(catalog, name)) + '"></use></svg><span>' + esc(name) + '</span></span>';
    }
    function decorate(config, catalog, root) {
        const axis = config.xAxis;
        if (axis && axis.categories && axis.categories.some(name => entry(catalog, name))) {
            axis.labels = Object.assign({}, axis.labels, { useHTML: true, formatter: function () { return label(catalog, this.value, root); } });
        }
        return config;
    }
    window.CropCategoryIcons = { symbol, label, decorate };
}());
