/* ==========================================================================
   耗材目录：预设价格覆盖 + 自定义耗材 + 配置导入导出
   - 存储：localStorage['filamentCatalog']
       { v: 2, presets: { "<预设id>": 价格 }, custom: [ {id,name,price,type,color} ] }
   - 兼容旧键 filamentPrices（仅价格覆盖），首次加载自动迁移
   - 应用方式：重建 config.filaments（预设在前、自定义在后），
     因此 index.js 的选择/自动填价逻辑无需改动
   ========================================================================== */
(function () {
    'use strict';

    var KEY = 'filamentCatalog';
    var LEGACY_KEY = 'filamentPrices';
    var STORE_VERSION = 2;
    var MAX_CUSTOM = 30;
    var TYPE_LABEL = { standard: '标准', engineering: '工程', flexible: '柔性' };
    var CUSTOM_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];
    var EXPORT_KIND = 'filament-config';
    var EXPORT_APP = '3d-print-calculator';

    var cfg = window.config;
    if (!cfg || !Array.isArray(cfg.filaments) || cfg.filaments.length === 0) return;

    var PRESET_DEFAULTS = cfg.filaments.map(function (f) {
        return {
            id: String(f.id !== undefined && f.id !== null ? f.id : f.name),
            name: f.name,
            price: toPrice(f.price),
            type: f.type || 'standard',
            color: f.color || '#607D8B'
        };
    });

    var presetPrices = {};   // presetId -> 覆盖价
    var customItems = [];    // {id, name, price, type, color}

    /* ---------------------------------------------------------------------
       基础工具
       --------------------------------------------------------------------- */
    function toPrice(v) {
        var n = Number(v);
        return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
    }

    function has(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function uid() {
        return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    function byId(id) {
        for (var i = 0; i < PRESET_DEFAULTS.length; i++) {
            if (PRESET_DEFAULTS[i].id === String(id)) return PRESET_DEFAULTS[i];
        }
        return null;
    }

    /* ---------------------------------------------------------------------
       读取 / 写入存储
       --------------------------------------------------------------------- */
    function readStore() {
        var raw = null;
        try {
            raw = JSON.parse(localStorage.getItem(KEY) || 'null');
        } catch (e) {
            raw = null;
        }

        if (raw && typeof raw === 'object') {
            presetPrices = {};
            customItems = [];
            var presets = raw.presets && typeof raw.presets === 'object' ? raw.presets : {};
            Object.keys(presets).forEach(function (k) {
                if (!byId(k)) return;
                var v = Number(presets[k]);
                if (isFinite(v) && v >= 0) presetPrices[String(k)] = toPrice(v);
            });
            if (Array.isArray(raw.custom)) {
                raw.custom.forEach(function (item) {
                    var clean = normalizeCustom(item);
                    if (clean) customItems.push(clean);
                });
            }
            customItems = customItems.slice(0, MAX_CUSTOM);
            return;
        }

        // 旧版本：仅价格覆盖
        var legacy = null;
        try {
            legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
        } catch (e) {
            legacy = null;
        }
        if (legacy && typeof legacy === 'object') {
            Object.keys(legacy).forEach(function (k) {
                if (!byId(k)) return;
                var v = Number(legacy[k]);
                if (isFinite(v) && v >= 0) presetPrices[String(k)] = toPrice(v);
            });
            persist(); // 迁移到新键
            try { localStorage.removeItem(LEGACY_KEY); } catch (e) { }
        }
    }

    function normalizeCustom(item) {
        if (!item || typeof item !== 'object') return null;
        var name = String(item.name === undefined ? '' : item.name).trim().slice(0, 24);
        if (!name) return null;
        var price = toPrice(item.price);
        var type = TYPE_LABEL[item.type] ? item.type : 'standard';
        var color = /^#[0-9a-fA-F]{6}$/.test(String(item.color || '')) ? String(item.color) : CUSTOM_COLORS[customItems.length % CUSTOM_COLORS.length];
        return {
            id: String(item.id || uid()),
            name: name,
            price: price,
            type: type,
            color: color
        };
    }

    function persist() {
        try {
            var empty = Object.keys(presetPrices).length === 0 && customItems.length === 0;
            if (empty) {
                localStorage.removeItem(KEY);
            } else {
                localStorage.setItem(KEY, JSON.stringify({
                    v: STORE_VERSION,
                    presets: presetPrices,
                    custom: customItems
                }));
            }
        } catch (e) { /* 隐私模式忽略 */ }
    }

    /* ---------------------------------------------------------------------
       应用到 config
       --------------------------------------------------------------------- */
    function effectivePresetPrice(preset) {
        return has(presetPrices, preset.id) ? presetPrices[preset.id] : preset.price;
    }

    function applyToConfig() {
        var list = PRESET_DEFAULTS.map(function (p) {
            return {
                id: p.id,
                name: p.name,
                price: effectivePresetPrice(p),
                type: p.type,
                color: p.color
            };
        });
        customItems.forEach(function (c) {
            list.push({
                id: c.id,
                name: c.name,
                price: c.price,
                type: c.type || 'standard',
                color: c.color || '#607D8B',
                custom: true
            });
        });
        cfg.filaments = list;
    }

    function hasAnyCustomization() {
        return Object.keys(presetPrices).length > 0 || customItems.length > 0;
    }

    /* ---------------------------------------------------------------------
       视图同步
       --------------------------------------------------------------------- */
    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

    function toast(message, type) {
        if (typeof window.AppToast === 'function') {
            window.AppToast(message, type || 'success');
            return;
        }
        if (window.indexPage && typeof window.indexPage.showToast === 'function') {
            window.indexPage.showToast(message, type || 'success');
        } else {
            console.log('[FilamentCatalog]', message);
        }
    }

    function updateBadge() {
        var btn = $('#filamentPriceBtn');
        if (!btn) return;
        var any = hasAnyCustomization();
        btn.classList.toggle('has-override', any);
        btn.setAttribute('title', any ? '已自定义耗材配置，点此修改' : '设置耗材价格与自定义耗材');
    }

    function refreshSelects() {
        $$('.filament-select').forEach(function (sel) {
            var keep = sel.value;
            while (sel.firstChild) sel.removeChild(sel.firstChild);

            var placeholder = document.createElement('option');
            placeholder.value = '-1';
            placeholder.textContent = '请选择耗材类型';
            sel.appendChild(placeholder);

            cfg.filaments.forEach(function (f, i) {
                var opt = document.createElement('option');
                opt.value = String(i);
                opt.textContent = f.name;
                sel.appendChild(opt);
            });

            var other = document.createElement('option');
            other.value = 'other';
            other.textContent = '其他';
            sel.appendChild(other);

            if (keep && keep !== '-1' && keep !== 'other') {
                var idx = parseInt(keep, 10);
                sel.value = (idx >= 0 && idx < cfg.filaments.length) ? String(idx) : '-1';
                if (sel.value === '-1') sel.dataset.stale = '1';
            } else {
                sel.value = keep || '-1';
            }
        });
    }

    /* ---------------------------------------------------------------------
       弹窗渲染
       --------------------------------------------------------------------- */
    function dot(color) {
        var el = document.createElement('span');
        el.className = 'color-swatch price-dot';
        el.style.background = color || 'transparent';
        el.setAttribute('aria-hidden', 'true');
        return el;
    }

    function buildPresetRows() {
        var list = $('#presetList');
        if (!list) return;
        list.innerHTML = '';
        PRESET_DEFAULTS.forEach(function (p) {
            var price = effectivePresetPrice(p);
            var row = document.createElement('label');
            row.className = 'price-row';

            var info = document.createElement('span');
            info.className = 'price-info';
            var name = document.createElement('span');
            name.className = 'price-name';
            name.textContent = p.name;
            var meta = document.createElement('span');
            meta.className = 'price-meta';
            meta.textContent = (TYPE_LABEL[p.type] || p.type) + ' · 默认 ¥' + p.price;
            info.appendChild(name);
            info.appendChild(meta);

            var field = document.createElement('span');
            field.className = 'price-field';
            var unit = document.createElement('span');
            unit.className = 'price-unit';
            unit.textContent = '¥';
            var input = document.createElement('input');
            input.type = 'number';
            input.className = 'price-input';
            input.min = '0';
            input.step = '0.1';
            input.inputMode = 'decimal';
            input.setAttribute('data-fid', p.id);
            input.value = String(price);
            input.setAttribute('aria-label', p.name + ' 价格');
            var suffix = document.createElement('span');
            suffix.className = 'price-unit';
            suffix.textContent = '/kg';
            field.appendChild(unit);
            field.appendChild(input);
            field.appendChild(suffix);

            row.appendChild(dot(p.color));
            row.appendChild(info);
            row.appendChild(field);

            if (has(presetPrices, p.id)) {
                var badge = document.createElement('span');
                badge.className = 'price-badge';
                badge.textContent = '已改';
                row.appendChild(badge);
            }
            list.appendChild(row);
        });
    }

    function buildCustomRows() {
        var list = $('#customList');
        if (!list) return;
        list.innerHTML = '';
        if (customItems.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'custom-empty';
            empty.textContent = '还没有自定义耗材。添加后会出现在「耗材类型」下拉里，并保存在本地。';
            list.appendChild(empty);
            return;
        }
        customItems.forEach(function (item) {
            var row = document.createElement('div');
            row.className = 'custom-row';
            row.setAttribute('data-cid', item.id);

            var color = document.createElement('input');
            color.type = 'color';
            color.className = 'color-input custom-color';
            color.value = item.color;
            color.setAttribute('aria-label', item.name + ' 颜色');

            var name = document.createElement('input');
            name.type = 'text';
            name.className = 'input custom-name';
            name.value = item.name;
            name.maxLength = 24;
            name.placeholder = '耗材名称';
            name.setAttribute('aria-label', '自定义耗材名称');

            var field = document.createElement('span');
            field.className = 'price-field';
            var unit = document.createElement('span');
            unit.className = 'price-unit';
            unit.textContent = '¥';
            var price = document.createElement('input');
            price.type = 'number';
            price.className = 'price-input custom-price';
            price.min = '0';
            price.step = '0.1';
            price.inputMode = 'decimal';
            price.value = String(item.price);
            price.setAttribute('aria-label', item.name + ' 价格');
            var suffix = document.createElement('span');
            suffix.className = 'price-unit';
            suffix.textContent = '/kg';
            field.appendChild(unit);
            field.appendChild(price);
            field.appendChild(suffix);

            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'custom-del';
            del.setAttribute('data-cid', item.id);
            del.setAttribute('aria-label', '删除 ' + item.name);
            del.textContent = '×';

            row.appendChild(color);
            row.appendChild(name);
            row.appendChild(field);
            row.appendChild(del);
            list.appendChild(row);
        });
    }

    function rebuildModal() {
        buildPresetRows();
        buildCustomRows();
    }

    function openModal() {
        var modal = $('#filamentModal');
        if (!modal) return;
        rebuildModal();
        modal.classList.add('show');
        var first = $('#presetList .price-input');
        if (first && window.matchMedia('(min-width: 900px)').matches) first.focus();
    }

    function closeModal() {
        var modal = $('#filamentModal');
        if (modal) modal.classList.remove('show');
    }

    /* ---------------------------------------------------------------------
       保存
       --------------------------------------------------------------------- */
    function priceMapByName() {
        var map = {};
        cfg.filaments.forEach(function (f) { map[f.name] = toPrice(f.price); });
        return map;
    }

    function syncCurrentItems(oldByName) {
        // 表单里“价格仍等于旧值”的耗材同步为新价；用户手填过的保持不动
        var newByName = {};
        cfg.filaments.forEach(function (f, i) {
            newByName[f.name] = { index: i, price: toPrice(f.price) };
        });

        $$('#filamentItemsContainer .filament-item').forEach(function (item) {
            var select = item.querySelector('.filament-select');
            var priceInput = item.querySelector('.filament-price');
            if (!select || !priceInput) return;
            if (select.value === '-1' || select.value === 'other') return;

            var idx = parseInt(select.value, 10);
            var current = cfg.filaments[idx];
            if (!current) return;

            var oldPrice = oldByName[current.name];
            var typed = priceInput.value === '' ? null : Number(priceInput.value);
            if (oldPrice !== undefined && typed !== null && typed === oldPrice) {
                priceInput.value = String(newByName[current.name].price);
                priceInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    function saveFromForm() {
        var oldByName = priceMapByName();

        var nextPresets = {};
        var presetInputs = $$('#presetList .price-input');
        for (var i = 0; i < presetInputs.length; i++) {
            var input = presetInputs[i];
            var raw = (input.value || '').trim();
            var value = raw === '' ? null : Number(raw);
            if (value !== null && (!isFinite(value) || value < 0)) {
                toast('价格请填写不小于 0 的数字', 'error');
                input.focus();
                return;
            }
            var id = input.getAttribute('data-fid');
            var preset = byId(id);
            if (!preset) continue;
            if (value === null || value === preset.price) continue;
            nextPresets[id] = toPrice(value);
        }

        var nextCustom = [];
        var rows = $$('#customList .custom-row');
        for (var j = 0; j < rows.length; j++) {
            var row = rows[j];
            var nameEl = row.querySelector('.custom-name');
            var priceEl = row.querySelector('.custom-price');
            var colorEl = row.querySelector('.custom-color');
            var name = (nameEl.value || '').trim();
            var rawPrice = (priceEl.value || '').trim();
            var price = rawPrice === '' ? null : Number(rawPrice);

            if (!name && rawPrice === '') continue;      // 空行忽略
            if (!name) {
                toast('自定义耗材需要填写名称', 'error');
                nameEl.focus();
                return;
            }
            if (price === null || !isFinite(price) || price < 0) {
                toast('「' + name + '」的价格请填写不小于 0 的数字', 'error');
                priceEl.focus();
                return;
            }
            nextCustom.push({
                id: row.getAttribute('data-cid') || uid(),
                name: name.slice(0, 24),
                price: toPrice(price),
                type: 'standard',
                color: /^#[0-9a-fA-F]{6}$/.test(colorEl.value) ? colorEl.value : '#607D8B'
            });
        }

        if (nextCustom.length > MAX_CUSTOM) {
            toast('自定义耗材最多 ' + MAX_CUSTOM + ' 项', 'error');
            return;
        }

        presetPrices = nextPresets;
        customItems = nextCustom;
        persist();
        applyToConfig();
        refreshSelects();
        syncCurrentItems(oldByName);
        updateBadge();

        if (window.indexPage) {
            if (typeof window.indexPage.calculateCost === 'function') window.indexPage.calculateCost();
            if (typeof window.indexPage.saveCurrentSettings === 'function') window.indexPage.saveCurrentSettings();
        }

        closeModal();
        toast('耗材配置已保存', 'success');
    }

    /* ---------------------------------------------------------------------
       对外 API（供「数据与备份」使用）
       --------------------------------------------------------------------- */
    function getData() {
        return {
            presets: Object.assign({}, presetPrices),
            custom: customItems.map(function (c) { return Object.assign({}, c); })
        };
    }

    function parseData(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return { error: 'filaments 字段格式不正确' };
        }

        var presets = {};
        var rawPresets = raw.presets;
        if (rawPresets !== undefined) {
            if (!rawPresets || typeof rawPresets !== 'object' || Array.isArray(rawPresets)) {
                return { error: 'filaments.presets 字段格式不正确' };
            }
            var keys = Object.keys(rawPresets);
            if (keys.length > 50) return { error: '预设价格条目过多' };
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (!byId(key)) continue;
                var v = Number(rawPresets[key]);
                if (!isFinite(v) || v < 0) return { error: '预设价格「' + key + '」无效' };
                presets[String(key)] = toPrice(v);
            }
        }

        var custom = [];
        if (raw.custom !== undefined) {
            if (!Array.isArray(raw.custom)) return { error: 'filaments.custom 必须是数组' };
            if (raw.custom.length > MAX_CUSTOM) return { error: '自定义耗材超过 ' + MAX_CUSTOM + ' 项' };
            for (var k = 0; k < raw.custom.length; k++) {
                var item = raw.custom[k];
                if (!item || typeof item !== 'object') return { error: '第 ' + (k + 1) + ' 项自定义耗材格式无效' };
                var name = String(item.name === undefined ? '' : item.name).trim();
                if (!name) return { error: '第 ' + (k + 1) + ' 项自定义耗材缺少名称' };
                var price = Number(item.price);
                if (!isFinite(price) || price < 0) return { error: '「' + name + '」的价格无效' };
                custom.push({
                    id: String(item.id || uid()),
                    name: name.slice(0, 24),
                    price: toPrice(price),
                    type: 'standard',
                    color: /^#[0-9a-fA-F]{6}$/.test(String(item.color || '')) ? String(item.color) : CUSTOM_COLORS[k % CUSTOM_COLORS.length]
                });
            }
        }

        return { presets: presets, custom: custom };
    }

    function setData(data) {
        var parsed = parseData(data);
        if (parsed.error) return parsed;

        var oldByName = priceMapByName();
        presetPrices = parsed.presets;
        customItems = parsed.custom;
        persist();
        applyToConfig();
        refreshSelects();
        syncCurrentItems(oldByName);
        updateBadge();
        rebuildModal();

        if (window.indexPage) {
            if (typeof window.indexPage.calculateCost === 'function') window.indexPage.calculateCost();
            if (typeof window.indexPage.saveCurrentSettings === 'function') window.indexPage.saveCurrentSettings();
        }
        return { ok: true, presets: Object.keys(presetPrices).length, custom: customItems.length };
    }

    /* ---------------------------------------------------------------------
       单条维护（管理页使用）
       --------------------------------------------------------------------- */
    function afterChange() {
        persist();
        applyToConfig();
        refreshSelects();
        updateBadge();
        rebuildModal();
        if (window.indexPage) {
            if (typeof window.indexPage.calculateCost === 'function') window.indexPage.calculateCost();
            if (typeof window.indexPage.saveCurrentSettings === 'function') window.indexPage.saveCurrentSettings();
        }
    }

    function getList() {
        var list = PRESET_DEFAULTS.map(function (p) {
            return {
                id: p.id,
                name: p.name,
                price: effectivePresetPrice(p),
                defaultPrice: p.price,
                color: p.color,
                type: p.type,
                custom: false,
                overridden: has(presetPrices, p.id)
            };
        });
        customItems.forEach(function (c) {
            list.push({
                id: c.id,
                name: c.name,
                price: c.price,
                defaultPrice: null,
                color: c.color,
                type: c.type || 'standard',
                custom: true,
                overridden: false
            });
        });
        return list;
    }

    function setPresetPrice(id, raw) {
        var preset = byId(id);
        if (!preset) return { error: '未知耗材' };
        var n = Number(raw);
        if (!isFinite(n) || n < 0) return { error: '单价请填写不小于 0 的数字' };
        var key = String(id);
        if (toPrice(n) === preset.price) delete presetPrices[key];
        else presetPrices[key] = toPrice(n);
        afterChange();
        return { ok: true };
    }

    function resetPreset(id) {
        var key = String(id);
        if (!has(presetPrices, key)) return { ok: true, noop: true };
        delete presetPrices[key];
        afterChange();
        return { ok: true };
    }

    function addCustom2(data) {
        var item = normalizeCustom(data);
        if (!item) return { error: '请填写名称' };
        if (customItems.length >= MAX_CUSTOM) return { error: '自定义耗材最多 ' + MAX_CUSTOM + ' 项' };
        customItems.push(item);
        afterChange();
        return { ok: true, id: item.id };
    }

    function updateCustom(id, patch) {
        for (var i = 0; i < customItems.length; i++) {
            if (customItems[i].id !== String(id)) continue;
            var merged = Object.assign({}, customItems[i], patch);
            var next = normalizeCustom(merged);
            if (!next) return { error: '名称不能为空' };
            next.id = customItems[i].id;
            customItems[i] = next;
            afterChange();
            return { ok: true };
        }
        return { error: '未找到该耗材' };
    }

    function removeCustom(id) {
        var before = customItems.length;
        customItems = customItems.filter(function (c) { return c.id !== String(id); });
        if (customItems.length === before) return { error: '未找到该耗材' };
        afterChange();
        return { ok: true };
    }

    function resetAll() {
        presetPrices = {};
        customItems = [];
        afterChange();
        return { ok: true };
    }

    /* ---------------------------------------------------------------------
       事件绑定
       --------------------------------------------------------------------- */
    function bind() {
        var openBtn = $('#filamentPriceBtn');
        if (openBtn) openBtn.addEventListener('click', openModal);

        var saveBtn = $('#priceSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveFromForm);

        var cancelBtn = $('#priceCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        var resetBtn = $('#priceResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                presetPrices = {};
                customItems = [];
                persist();
                applyToConfig();
                refreshSelects();
                updateBadge();
                rebuildModal();
                if (window.indexPage) {
                    if (typeof window.indexPage.calculateCost === 'function') window.indexPage.calculateCost();
                    if (typeof window.indexPage.saveCurrentSettings === 'function') window.indexPage.saveCurrentSettings();
                }
                toast('已恢复默认耗材配置', 'success');
            });
        }

        var addBtn = $('#addCustomBtn');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                if (customItems.length >= MAX_CUSTOM) {
                    toast('自定义耗材最多 ' + MAX_CUSTOM + ' 项', 'error');
                    return;
                }
                // 先落到 DOM，保存时统一收集
                var list = $('#customList');
                var empty = list.querySelector('.custom-empty');
                if (empty) empty.remove();
                var row = document.createElement('div');
                row.className = 'custom-row';
                row.setAttribute('data-cid', uid());
                row.innerHTML =
                    '<input type="color" class="color-input custom-color" value="#607D8B" aria-label="自定义耗材颜色">' +
                    '<input type="text" class="input custom-name" maxlength="24" placeholder="耗材名称" aria-label="自定义耗材名称">' +
                    '<span class="price-field"><span class="price-unit">¥</span>' +
                    '<input type="number" class="price-input custom-price" min="0" step="0.1" placeholder="0" aria-label="自定义耗材价格">' +
                    '<span class="price-unit">/kg</span></span>' +
                    '<button type="button" class="custom-del" aria-label="删除该耗材">×</button>';
                list.appendChild(row);
                var nameInput = row.querySelector('.custom-name');
                if (nameInput) nameInput.focus();
            });
        }

        var customList = $('#customList');
        if (customList) {
            customList.addEventListener('click', function (e) {
                var btn = e.target.closest ? e.target.closest('.custom-del') : null;
                if (!btn) return;
                var row = btn.closest('.custom-row');
                if (row) row.remove();
                if (!customList.querySelector('.custom-row')) {
                    // 只补空态提示，不要从内存模型重建（否则被删的行会“复活”）
                    var empty = document.createElement('p');
                    empty.className = 'custom-empty';
                    empty.textContent = '还没有自定义耗材。添加后会出现在「耗材类型」下拉里，并保存在本地。';
                    customList.appendChild(empty);
                }
            });
        }

        var backupBtn = $('#dataBackupBtn');
        if (backupBtn) {
            backupBtn.addEventListener('click', function () {
                closeModal();
                if (window.AppBackup && typeof window.AppBackup.open === 'function') window.AppBackup.open();
            });
        }

        var modal = $('#filamentModal');
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

    readStore();
    applyToConfig();

    window.FilamentCatalog = {
        getData: getData,
        parseData: parseData,
        setData: setData,
        getList: getList,
        setPresetPrice: setPresetPrice,
        resetPreset: resetPreset,
        addCustom: addCustom2,
        updateCustom: updateCustom,
        removeCustom: removeCustom,
        resetAll: resetAll,
        refreshOptions: refreshSelects,
        rebuildModal: rebuildModal,
        defaults: PRESET_DEFAULTS.map(function (p) { return Object.assign({}, p); }),
        count: function () { return customItems.length; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
