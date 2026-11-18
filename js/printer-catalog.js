/* ==========================================================================
   打印机目录：预设计型参数覆盖 + 自定义机型
   - 存储：localStorage['printerCatalog']
       { v: 1, overrides: { "<预设id>": {power?,cost?,lifespan?,name?} },
                custom: [ {id,name,power,cost,lifespan} ] }
   - 应用方式：重建 config.printers（预设在前、自定义在后），
     自定义项排在预设之后，因此既有预设的下标不变
   ========================================================================== */
(function () {
    'use strict';

    var KEY = 'printerCatalog';
    var MAX_CUSTOM = 30;

    var cfg = window.config;
    if (!cfg || !Array.isArray(cfg.printers) || cfg.printers.length === 0) return;

    var PRESET_DEFAULTS = cfg.printers.map(function (p) {
        return {
            id: String(p.id !== undefined && p.id !== null ? p.id : p.name),
            name: p.name,
            power: toNum(p.power),
            cost: toNum(p.cost),
            lifespan: toNum(p.lifespan),
            brand: p.brand,
            type: p.type
        };
    });

    var overrides = {};
    var custom = [];

    function toNum(v) {
        var n = Number(v);
        return isFinite(n) && n >= 0 ? n : 0;
    }

    function has(o, k) {
        return Object.prototype.hasOwnProperty.call(o, k);
    }

    function uid() {
        return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    function presetById(id) {
        for (var i = 0; i < PRESET_DEFAULTS.length; i++) {
            if (PRESET_DEFAULTS[i].id === String(id)) return PRESET_DEFAULTS[i];
        }
        return null;
    }

    function normalizeCustom(item) {
        if (!item || typeof item !== 'object') return null;
        var name = String(item.name === undefined ? '' : item.name).trim().slice(0, 30);
        if (!name) return null;
        return {
            id: String(item.id || uid()),
            name: name,
            power: toNum(item.power),
            cost: toNum(item.cost),
            lifespan: toNum(item.lifespan)
        };
    }

    function readStore() {
        var raw = null;
        try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
        if (!raw || typeof raw !== 'object') return;

        overrides = {};
        custom = [];

        if (raw.overrides && typeof raw.overrides === 'object') {
            Object.keys(raw.overrides).forEach(function (k) {
                var preset = presetById(k);
                if (!preset) return;
                var o = raw.overrides[k];
                if (!o || typeof o !== 'object') return;
                var clean = {};
                if (o.power !== undefined) clean.power = toNum(o.power);
                if (o.cost !== undefined) clean.cost = toNum(o.cost);
                if (o.lifespan !== undefined) clean.lifespan = toNum(o.lifespan);
                if (typeof o.name === 'string' && o.name.trim()) clean.name = o.name.trim().slice(0, 30);
                if (Object.keys(clean).length) overrides[String(k)] = clean;
            });
        }

        if (Array.isArray(raw.custom)) {
            raw.custom.forEach(function (item) {
                var clean = normalizeCustom(item);
                if (clean) custom.push(clean);
            });
        }
        custom = custom.slice(0, MAX_CUSTOM);
    }

    function persist() {
        try {
            var empty = Object.keys(overrides).length === 0 && custom.length === 0;
            if (empty) localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, JSON.stringify({ v: 1, overrides: overrides, custom: custom }));
        } catch (e) { /* 忽略 */ }
    }

    function apply() {
        var list = PRESET_DEFAULTS.map(function (p) {
            var o = overrides[p.id] || {};
            return {
                id: p.id,
                name: has(o, 'name') ? o.name : p.name,
                power: has(o, 'power') ? o.power : p.power,
                cost: has(o, 'cost') ? o.cost : p.cost,
                lifespan: has(o, 'lifespan') ? o.lifespan : p.lifespan,
                brand: p.brand,
                type: p.type
            };
        });
        custom.forEach(function (c) {
            list.push({
                id: c.id,
                name: c.name,
                power: c.power,
                cost: c.cost,
                lifespan: c.lifespan,
                brand: '自定义',
                type: 'FDM',
                custom: true
            });
        });
        cfg.printers = list;
    }

    function refreshSelects() {
        var sel = document.getElementById('printerSelect');
        if (!sel) return;
        var keep = sel.value;

        while (sel.firstChild) sel.removeChild(sel.firstChild);

        var placeholder = document.createElement('option');
        placeholder.value = '-1';
        placeholder.textContent = '请选择打印机型号';
        sel.appendChild(placeholder);

        cfg.printers.forEach(function (p, i) {
            var opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = p.name;
            sel.appendChild(opt);
        });

        var other = document.createElement('option');
        other.value = 'other';
        other.textContent = '其他';
        sel.appendChild(other);

        if (keep && keep !== '-1' && keep !== 'other') {
            var idx = parseInt(keep, 10);
            sel.value = (idx >= 0 && idx < cfg.printers.length) ? String(idx) : '-1';
        } else {
            sel.value = keep || '-1';
        }
    }

    /* ---------------------------------------------------------------------
       对外 API
       --------------------------------------------------------------------- */
    function getData() {
        return {
            overrides: JSON.parse(JSON.stringify(overrides)),
            custom: custom.map(function (c) { return Object.assign({}, c); })
        };
    }

    function parseData(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return { error: 'printers 字段格式不正确' };
        }
        var nextOverrides = {};
        var nextCustom = [];

        var rawOverrides = raw.overrides;
        if (rawOverrides !== undefined) {
            if (!rawOverrides || typeof rawOverrides !== 'object' || Array.isArray(rawOverrides)) {
                return { error: 'printers.overrides 字段格式不正确' };
            }
            var keys = Object.keys(rawOverrides);
            if (keys.length > 100) return { error: '打印机参数覆盖条目过多' };
            for (var i = 0; i < keys.length; i++) {
                var id = keys[i];
                if (!presetById(id)) continue;
                var o = rawOverrides[id];
                if (!o || typeof o !== 'object') return { error: '打印机参数「' + id + '」格式不正确' };
                var clean = {};
                var invalid = false;
                ['power', 'cost', 'lifespan'].forEach(function (field) {
                    if (o[field] === undefined) return;
                    var n = Number(o[field]);
                    if (!isFinite(n) || n < 0) { invalid = true; return; }
                    clean[field] = n;
                });
                if (invalid) return { error: '打印机参数「' + id + '」数值无效' };
                if (typeof o.name === 'string' && o.name.trim()) clean.name = o.name.trim().slice(0, 30);
                if (Object.keys(clean).length) nextOverrides[String(id)] = clean;
            }
        }

        var rawCustom = raw.custom;
        if (rawCustom !== undefined) {
            if (!Array.isArray(rawCustom)) return { error: 'printers.custom 必须是数组' };
            if (rawCustom.length > MAX_CUSTOM) return { error: '自定义机型超过 ' + MAX_CUSTOM + ' 个' };
            for (var k = 0; k < rawCustom.length; k++) {
                var item = rawCustom[k];
                if (!item || typeof item !== 'object') return { error: '第 ' + (k + 1) + ' 个自定义机型格式不正确' };
                var name = String(item.name === undefined ? '' : item.name).trim();
                if (!name) return { error: '第 ' + (k + 1) + ' 个自定义机型缺少名称' };
                var fields = ['power', 'cost', 'lifespan'];
                for (var f = 0; f < fields.length; f++) {
                    var val = item[fields[f]];
                    if (val === undefined || val === null || val === '') continue;
                    var num = Number(val);
                    if (!isFinite(num) || num < 0) {
                        return { error: '「' + name + '」的 ' + fields[f] + ' 无效' };
                    }
                }
                nextCustom.push({
                    id: String(item.id || uid()),
                    name: name.slice(0, 30),
                    power: toNum(item.power),
                    cost: toNum(item.cost),
                    lifespan: toNum(item.lifespan)
                });
            }
        }

        return { overrides: nextOverrides, custom: nextCustom };
    }

    function setData(data) {
        var parsed = parseData(data);
        if (parsed.error) return parsed;
        overrides = parsed.overrides;
        custom = parsed.custom;
        persist();
        apply();
        refreshSelects();
        return { ok: true, custom: custom.length, overrides: Object.keys(overrides).length };
    }

    function addCustom(name, power, cost, lifespan) {
        var item = normalizeCustom({ name: name, power: power, cost: cost, lifespan: lifespan });
        if (!item) return { error: '请先填写机型名称' };

        var existing = -1;
        for (var i = 0; i < custom.length; i++) {
            if (custom[i].name === item.name) { existing = i; break; }
        }
        if (existing >= 0) {
            item.id = custom[existing].id;
            custom[existing] = item;
        } else {
            if (custom.length >= MAX_CUSTOM) return { error: '自定义机型最多 ' + MAX_CUSTOM + ' 个' };
            custom.push(item);
        }

        persist();
        apply();
        refreshSelects();

        for (var j = 0; j < cfg.printers.length; j++) {
            if (cfg.printers[j].id === item.id) return { ok: true, index: j, replaced: existing >= 0 };
        }
        return { ok: true };
    }

    /* ---------------------------------------------------------------------
       「存为机型」按钮
       --------------------------------------------------------------------- */
    function bind() {
        var btn = document.getElementById('savePrinterBtn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var nameEl = document.getElementById('customPrinterName');
            var name = nameEl ? nameEl.value.trim() : '';
            if (!name) {
                if (window.indexPage && window.indexPage.showToast) window.indexPage.showToast('请先填写自定义型号名称', 'error');
                if (nameEl) nameEl.focus();
                return;
            }
            var result = addCustom(
                name,
                (document.getElementById('printerPower') || {}).value,
                (document.getElementById('printerCost') || {}).value,
                (document.getElementById('printerLifespan') || {}).value
            );
            if (result.error) {
                if (window.indexPage && window.indexPage.showToast) window.indexPage.showToast(result.error, 'error');
                return;
            }
            var sel = document.getElementById('printerSelect');
            if (sel && result.index !== undefined) {
                sel.value = String(result.index);
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (window.indexPage) {
                if (typeof window.indexPage.calculateCost === 'function') window.indexPage.calculateCost();
                if (typeof window.indexPage.saveCurrentSettings === 'function') window.indexPage.saveCurrentSettings();
                if (window.indexPage.showToast) {
                    window.indexPage.showToast(result.replaced ? '已更新机型「' + name + '」' : '已存为常用机型「' + name + '」', 'success');
                }
            }
        });
    }

    readStore();
    apply();

    window.PrinterCatalog = {
        getData: getData,
        parseData: parseData,
        setData: setData,
        addCustom: addCustom,
        refreshSelects: refreshSelects,
        defaults: PRESET_DEFAULTS.map(function (p) { return Object.assign({}, p); }),
        count: function () { return custom.length; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
