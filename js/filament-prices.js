/* ==========================================================================
   耗材预设价格：修改 / 持久化（localStorage）
   - 覆盖 config.filaments 的默认价格，选择耗材时自动带入新价格
   - 只影响后续填写，不改动已保存的历史记录
   - 存储键：filamentPrices，形如 {"1": 72, "3": 65}
   ========================================================================== */
(function () {
    'use strict';

    var KEY = 'filamentPrices';
    var TYPE_LABEL = { standard: '标准', engineering: '工程', flexible: '柔性' };

    var config_ = window.config;
    if (!config_ || !Array.isArray(config_.filaments) || config_.filaments.length === 0) return;

    var DEFAULTS = config_.filaments.map(function (f) { return Number(f.price) || 0; });
    var DEFAULT_BY_KEY = {};
    config_.filaments.forEach(function (f, i) { DEFAULT_BY_KEY[keyOf(f)] = DEFAULTS[i]; });

    function keyOf(f) {
        return String(f.id !== undefined && f.id !== null ? f.id : f.name);
    }

    function readOverrides() {
        var out = {};
        try {
            var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
            if (raw && typeof raw === 'object') {
                Object.keys(raw).forEach(function (k) {
                    var v = Number(raw[k]);
                    if (isFinite(v) && v >= 0) out[k] = v;
                });
            }
        } catch (e) { /* 忽略损坏数据 */ }
        return out;
    }

    var overrides = readOverrides();

    function apply() {
        config_.filaments.forEach(function (f, i) {
            var k = keyOf(f);
            f.price = Object.prototype.hasOwnProperty.call(overrides, k) ? overrides[k] : DEFAULTS[i];
        });
    }

    function persist() {
        try {
            if (Object.keys(overrides).length === 0) localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, JSON.stringify(overrides));
        } catch (e) { /* 隐私模式忽略 */ }
    }

    function hasOverride(f) {
        return Object.prototype.hasOwnProperty.call(overrides, keyOf(f));
    }

    function reset() {
        overrides = {};
        persist();
        apply();
    }

    // 先应用一次，保证 index.js 初始化时读到的就是自定义价格
    apply();

    window.FilamentPrices = {
        defaults: DEFAULTS.slice(),
        keyOf: keyOf,
        hasOverride: hasOverride,
        getOverrides: function () { return Object.assign({}, overrides); },
        reset: reset
    };

    /* ---------------------------------------------------------------------
       设置弹窗
       --------------------------------------------------------------------- */
    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

    function toast(message, type) {
        if (window.indexPage && typeof window.indexPage.showToast === 'function') {
            window.indexPage.showToast(message, type || 'success');
        } else {
            console.log('[FilamentPrices]', message);
        }
    }

    function updateBadge() {
        var btn = $('#filamentPriceBtn');
        if (!btn) return;
        var any = Object.keys(overrides).length > 0;
        btn.classList.toggle('has-override', any);
        btn.setAttribute('title', any ? '已自定义耗材价格，点此修改' : '设置耗材预设价格');
    }

    function buildRows() {
        var list = $('#priceList');
        if (!list) return;
        list.innerHTML = '';
        config_.filaments.forEach(function (f, i) {
            var key = keyOf(f);
            var row = document.createElement('label');
            row.className = 'price-row';

            var dot = document.createElement('span');
            dot.className = 'color-swatch price-dot';
            dot.style.background = f.color || 'transparent';
            dot.setAttribute('aria-hidden', 'true');

            var info = document.createElement('span');
            info.className = 'price-info';
            var name = document.createElement('span');
            name.className = 'price-name';
            name.textContent = f.name;
            var meta = document.createElement('span');
            meta.className = 'price-meta';
            meta.textContent = (TYPE_LABEL[f.type] || f.type || '') + ' · 默认 ¥' + DEFAULTS[i];
            info.appendChild(name);
            info.appendChild(meta);

            var wrap = document.createElement('span');
            wrap.className = 'price-field';
            var unit = document.createElement('span');
            unit.className = 'price-unit';
            unit.textContent = '¥';
            var input = document.createElement('input');
            input.type = 'number';
            input.className = 'price-input';
            input.min = '0';
            input.step = '0.1';
            input.inputMode = 'decimal';
            input.setAttribute('data-fid', key);
            input.value = String(Number(f.price) || 0);
            input.setAttribute('aria-label', f.name + ' 价格');
            var suffix = document.createElement('span');
            suffix.className = 'price-unit';
            suffix.textContent = '/kg';
            wrap.appendChild(unit);
            wrap.appendChild(input);
            wrap.appendChild(suffix);

            row.appendChild(dot);
            row.appendChild(info);
            row.appendChild(wrap);

            if (hasOverride(f)) {
                var badge = document.createElement('span');
                badge.className = 'price-badge';
                badge.textContent = '已改';
                row.appendChild(badge);
            }

            list.appendChild(row);
        });
    }

    function openModal() {
        var modal = $('#priceModal');
        if (!modal) return;
        buildRows();
        modal.classList.add('show');
        var firstInput = $('#priceList .price-input');
        if (firstInput && window.matchMedia('(min-width: 900px)').matches) firstInput.focus();
    }

    function closeModal() {
        var modal = $('#priceModal');
        if (modal) modal.classList.remove('show');
    }

    function saveFromForm() {
        var inputs = $$('#priceList .price-input');
        if (inputs.length === 0) { closeModal(); return; }

        var oldPrices = {};
        config_.filaments.forEach(function (f) { oldPrices[keyOf(f)] = Number(f.price) || 0; });

        var next = {};
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            var key = input.getAttribute('data-fid');
            var raw = (input.value || '').trim();
            var value = raw === '' ? null : Number(raw);
            if (value !== null && (!isFinite(value) || value < 0)) {
                toast('价格请填写不小于 0 的数字', 'error');
                input.focus();
                return;
            }
            var def = Object.prototype.hasOwnProperty.call(DEFAULT_BY_KEY, key) ? DEFAULT_BY_KEY[key] : null;
            if (value === null || (def !== null && value === def)) continue;
            next[key] = value;
        }

        overrides = next;
        persist();
        apply();
        updateBadge();

        // 把当前表单里“仍等于旧预设价”的耗材同步为新价（用户手填过的价格不动）
        $$('#filamentItemsContainer .filament-item').forEach(function (item) {
            var select = item.querySelector('.filament-select');
            var priceInput = item.querySelector('.filament-price');
            if (!select || !priceInput) return;
            if (select.value === '-1' || select.value === 'other') return;
            var idx = parseInt(select.value, 10);
            var filament = config_.filaments[idx];
            if (!filament) return;
            var key = keyOf(filament);
            var current = priceInput.value === '' ? null : Number(priceInput.value);
            if (current !== null && current === oldPrices[key]) {
                priceInput.value = String(filament.price);
                priceInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        if (window.indexPage) {
            if (typeof window.indexPage.calculateCost === 'function') window.indexPage.calculateCost();
            if (typeof window.indexPage.saveCurrentSettings === 'function') window.indexPage.saveCurrentSettings();
        }

        closeModal();
        toast('预设价格已保存', 'success');
    }

    function resetAll() {
        reset();
        updateBadge();
        buildRows();
        if (window.indexPage && typeof window.indexPage.calculateCost === 'function') window.indexPage.calculateCost();
        toast('已恢复默认价格', 'success');
    }

    function bind() {
        var openBtn = $('#filamentPriceBtn');
        if (openBtn) openBtn.addEventListener('click', openModal);

        var saveBtn = $('#priceSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveFromForm);

        var resetBtn = $('#priceResetBtn');
        if (resetBtn) resetBtn.addEventListener('click', resetAll);

        var cancelBtn = $('#priceCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        var modal = $('#priceModal');
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
            });
        }

        updateBadge();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
