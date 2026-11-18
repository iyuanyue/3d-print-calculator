/* ==========================================================================
   预设管理页：打印机 / 耗材 的内联编辑
   - 改动即时保存到 filamentCatalog / printerCatalog
   - 预设项可「重置」回官方值；自定义项可删除
   ========================================================================== */
(function () {
    'use strict';

    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

    /* 简易 toast（管理页没有 indexPage） */
    window.AppToast = function (message, type) {
        var toast = document.createElement('div');
        toast.className = 'auto-toast ' + (type === 'error' ? 'error' : 'success');
        toast.textContent = message;
        toast.setAttribute('role', 'status');
        document.body.appendChild(toast);
        setTimeout(function () { toast.style.opacity = '1'; }, 10);
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 1800);
    };

    function toast(message, type) {
        window.AppToast(message, type || 'success');
    }

    var FC = function () { return window.FilamentCatalog; };
    var PC = function () { return window.PrinterCatalog; };

    /* ---------------------------------------------------------------------
       DOM 小工具
       --------------------------------------------------------------------- */
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function iconButton(className, label, title) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = className;
        btn.textContent = label;
        btn.setAttribute('aria-label', title);
        btn.title = title;
        return btn;
    }

    function numField(labelText, unit, value, field) {
        var wrap = el('label', 'm-field');
        wrap.appendChild(el('span', 'm-label', labelText));
        var box = el('span', 'm-input-wrap');
        var input = document.createElement('input');
        input.type = 'number';
        input.className = 'm-num';
        input.min = '0';
        input.step = 'any';
        input.inputMode = 'decimal';
        input.value = String(value === undefined || value === null ? '' : value);
        input.setAttribute('data-field', field);
        input.setAttribute('aria-label', labelText);
        box.appendChild(input);
        box.appendChild(el('span', 'm-unit', unit));
        wrap.appendChild(box);
        return wrap;
    }

    function findItem(kind, id) {
        var api = kind === 'printer' ? PC() : FC();
        if (!api) return null;
        var list = api.getList();
        for (var i = 0; i < list.length; i++) {
            if (String(list[i].id) === String(id)) return list[i];
        }
        return null;
    }

    /* ---------------------------------------------------------------------
       渲染：打印机
       --------------------------------------------------------------------- */
    function printerRow(item) {
        var row = el('div', 'manage-row' + (item.overridden ? ' is-overridden' : ''));
        row.setAttribute('data-id', item.id);
        row.setAttribute('data-kind', item.custom ? 'custom' : 'preset');

        var head = el('div', 'm-head');
        var name = document.createElement('input');
        name.type = 'text';
        name.className = 'm-name';
        name.value = item.name;
        name.maxLength = 30;
        name.setAttribute('aria-label', '机型名称');

        head.appendChild(name);
        head.appendChild(el('span', 'm-badge' + (item.custom ? ' custom' : ''), item.custom ? '自定义' : '预设'));

        var actions = el('div', 'm-actions');
        if (!item.custom) {
            // 始终渲染，未改动时由 CSS 隐藏；这样改完参数后无需整行重建就能出现「重置」
            actions.appendChild(iconButton('m-reset', '重置', '恢复「' + item.name + '」的官方参数'));
        }
        actions.appendChild(iconButton('m-dup', '复制', '复制「' + item.name + '」为新的自定义机型'));
        if (item.custom) {
            actions.appendChild(iconButton('m-del', '×', '删除「' + item.name + '」'));
        } else {
            actions.appendChild(iconButton('m-hide', '隐藏', '从机型下拉中隐藏「' + item.name + '」'));
        }
        head.appendChild(actions);

        var fields = el('div', 'm-fields');
        fields.appendChild(numField('功率', 'W', item.power, 'power'));
        fields.appendChild(numField('价格', '¥', item.cost, 'cost'));
        fields.appendChild(numField('寿命', 'h', item.lifespan, 'lifespan'));

        row.appendChild(head);
        row.appendChild(fields);
        return row;
    }

    function hiddenRow(item) {
        var row = el('div', 'manage-row hidden-row');
        row.setAttribute('data-id', item.id);

        var head = el('div', 'm-head');
        var name = el('span', 'm-name static', item.name);
        head.appendChild(name);
        head.appendChild(el('span', 'm-badge', '已隐藏'));
        var actions = el('div', 'm-actions');
        actions.appendChild(iconButton('m-unhide', '恢复', '恢复「' + item.name + '」到机型下拉'));
        head.appendChild(actions);

        row.appendChild(head);
        return row;
    }

    function renderPrinters() {
        var list = $('#printerList');
        if (!list) return;
        var api = PC();
        var items = api ? api.getList() : [];
        list.innerHTML = '';
        items.forEach(function (item) { list.appendChild(printerRow(item)); });

        var custom = items.filter(function (i) { return i.custom; }).length;
        var count = $('#printerCount');
        if (count) {
            count.textContent = items.length + ' 个机型' + (custom ? ' · ' + custom + ' 个自定义' : '');
        }

        var hiddenItems = api && typeof api.getHidden === 'function' ? api.getHidden() : [];
        var box = $('#hiddenDevices');
        var hiddenList = $('#hiddenList');
        if (box && hiddenList) {
            hiddenList.innerHTML = '';
            if (hiddenItems.length === 0) {
                box.hidden = true;
                box.removeAttribute('open');
            } else {
                box.hidden = false;
                hiddenItems.forEach(function (item) { hiddenList.appendChild(hiddenRow(item)); });
                var label = $('#hiddenCount');
                if (label) label.textContent = '已隐藏 ' + hiddenItems.length + ' 个机型';
            }
        }
    }

    /* ---------------------------------------------------------------------
       渲染：耗材
       --------------------------------------------------------------------- */
    function filamentRow(item) {
        var row = el('div', 'manage-row filament-row' + (item.overridden ? ' is-overridden' : ''));
        row.setAttribute('data-id', item.id);
        row.setAttribute('data-kind', item.custom ? 'custom' : 'preset');

        var color = document.createElement('input');
        color.type = 'color';
        color.className = 'm-color';
        color.value = item.color || '#607d8b';
        color.setAttribute('aria-label', (item.custom ? '颜色' : item.name + ' 颜色'));
        if (!item.custom) color.disabled = true;

        var head = el('div', 'm-head');
        var name = document.createElement('input');
        name.type = 'text';
        name.className = 'm-name';
        name.value = item.name;
        name.maxLength = 24;
        name.setAttribute('aria-label', '耗材名称');
        if (!item.custom) name.readOnly = true;
        head.appendChild(name);
        head.appendChild(el('span', 'm-badge' + (item.custom ? ' custom' : ''), item.custom ? '自定义' : '预设'));

        var price = el('span', 'm-price');
        price.appendChild(el('span', 'm-unit', '¥'));
        var input = document.createElement('input');
        input.type = 'number';
        input.className = 'm-num';
        input.min = '0';
        input.step = 'any';
        input.inputMode = 'decimal';
        input.value = String(item.price);
        input.setAttribute('data-field', 'price');
        input.setAttribute('aria-label', item.name + ' 单价');
        price.appendChild(input);
        price.appendChild(el('span', 'm-unit', '/kg'));

        row.appendChild(color);
        row.appendChild(head);
        row.appendChild(price);
        row.appendChild(item.custom
            ? iconButton('m-del', '×', '删除「' + item.name + '」')
            : iconButton('m-reset', '重置', '恢复「' + item.name + '」的官方价格'));
        return row;
    }

    function renderFilaments() {
        var list = $('#filamentList');
        if (!list) return;
        var api = FC();
        var items = api ? api.getList() : [];
        list.innerHTML = '';
        items.forEach(function (item) { list.appendChild(filamentRow(item)); });

        var custom = items.filter(function (i) { return i.custom; }).length;
        var count = $('#filamentCount');
        if (count) {
            count.textContent = items.length + ' 种耗材' + (custom ? ' · ' + custom + ' 个自定义' : '');
        }
    }

    function renderAll() {
        renderPrinters();
        renderFilaments();
    }

    /* ---------------------------------------------------------------------
       同步单行状态（不重建，避免打断输入）
       --------------------------------------------------------------------- */
    function syncRow(row, kind, id) {
        var item = findItem(kind, id);
        if (!item) return;
        row.classList.toggle('is-overridden', !!item.overridden);

        if (kind === 'printer') {
            ['power', 'cost', 'lifespan'].forEach(function (field) {
                var input = row.querySelector('[data-field="' + field + '"]');
                if (input && document.activeElement !== input) input.value = String(item[field]);
            });
        } else {
            var price = row.querySelector('[data-field="price"]');
            if (price && document.activeElement !== price) price.value = String(item.price);
            var color = row.querySelector('.m-color');
            if (color && document.activeElement !== color) color.value = item.color;
        }

        var nameInput = row.querySelector('.m-name');
        if (nameInput && item.custom && document.activeElement !== nameInput) nameInput.value = item.name;
    }

    /* ---------------------------------------------------------------------
       编辑事件
       --------------------------------------------------------------------- */
    function handleNumberChange(input) {
        var row = input.closest('.manage-row');
        if (!row) return;
        var kind = row.closest('#printerList') ? 'printer' : 'filament';
        var id = row.getAttribute('data-id');
        var isCustom = row.getAttribute('data-kind') === 'custom';
        var field = input.getAttribute('data-field');
        var raw = input.value.trim();

        var api = kind === 'printer' ? PC() : FC();
        if (!api) return;

        var result;
        if (kind === 'printer') {
            result = isCustom
                ? api.updateCustom(id, (function () { var o = {}; o[field] = raw; return o; })())
                : api.setPresetField(id, field, raw);
        } else {
            result = isCustom
                ? api.updateCustom(id, { price: raw })
                : api.setPresetPrice(id, raw);
        }

        if (result && result.error) {
            toast(result.error, 'error');
            syncRow(row, kind, id);
            return;
        }
        toast('已保存');
        syncRow(row, kind, id);
    }

    function handleNameChange(input) {
        var row = input.closest('.manage-row');
        if (!row) return;
        var kind = row.closest('#printerList') || row.closest('#hiddenList') ? 'printer' : 'filament';
        var isCustom = row.getAttribute('data-kind') === 'custom';
        var api = kind === 'printer' ? PC() : FC();
        if (!api) return;
        var value = input.value.trim();
        if (!value) {
            toast('名称不能为空', 'error');
            syncRow(row, kind, row.getAttribute('data-id'));
            return;
        }

        var result;
        if (kind === 'printer') {
            result = api.setName(row.getAttribute('data-id'), value);
        } else if (isCustom) {
            result = api.updateCustom(row.getAttribute('data-id'), { name: value });
        } else {
            return;
        }

        if (result && result.error) {
            toast(result.error, 'error');
            syncRow(row, kind, row.getAttribute('data-id'));
            return;
        }
        toast('已保存');
        syncRow(row, kind, row.getAttribute('data-id'));
        if (kind === 'printer') renderPrinters(); else renderFilaments();
    }

    function handleColorChange(input) {
        var row = input.closest('.manage-row');
        if (!row || row.getAttribute('data-kind') !== 'custom') return;
        var api = FC();
        if (!api) return;
        var result = api.updateCustom(row.getAttribute('data-id'), { color: input.value });
        if (result && result.error) toast(result.error, 'error');
    }

    function handleAction(btn) {
        var row = btn.closest('.manage-row');
        if (!row) return;
        var kind = row.closest('#filamentList') ? 'filament' : 'printer';
        var api = kind === 'printer' ? PC() : FC();
        if (!api) return;
        var id = row.getAttribute('data-id');
        var item = findItem(kind, id);

        if (btn.classList.contains('m-del')) {
            var result = api.removeCustom(id);
            if (result && result.error) { toast(result.error, 'error'); return; }
            toast('已删除「' + (item ? item.name : '') + '」');
            if (kind === 'printer') renderPrinters(); else renderFilaments();
            return;
        }

        if (btn.classList.contains('m-reset')) {
            var reset = api.resetPreset(id);
            if (reset && reset.error) { toast(reset.error, 'error'); return; }
            toast('已恢复「' + (item ? item.name : '') + '」的默认值');
            if (kind === 'printer') renderPrinters(); else renderFilaments();
            return;
        }

        if (btn.classList.contains('m-dup')) {
            if (typeof api.duplicate !== 'function') return;
            var dup = api.duplicate(id);
            if (dup && dup.error) { toast(dup.error, 'error'); return; }
            renderPrinters();
            if (dup && dup.id) focusRow(dup.id);
            toast('已复制为「' + (dup && dup.name ? dup.name : '新机型') + '」');
            return;
        }

        if (btn.classList.contains('m-hide')) {
            if (typeof api.hide !== 'function') return;
            var hid = api.hide(id);
            if (hid && hid.error) { toast(hid.error, 'error'); return; }
            toast('已隐藏「' + (item ? item.name : '') + '」，可在下方恢复');
            renderPrinters();
            return;
        }

        if (btn.classList.contains('m-unhide')) {
            if (typeof api.unhide !== 'function') return;
            var unhid = api.unhide(id);
            if (unhid && unhid.error) { toast(unhid.error, 'error'); return; }
            toast('已恢复该机型');
            renderPrinters();
        }
    }

    /* ---------------------------------------------------------------------
       新增
       --------------------------------------------------------------------- */
    function uniqueName(existing, base) {
        if (existing.indexOf(base) < 0) return base;
        for (var i = 2; i < 100; i++) {
            var candidate = base + ' ' + i;
            if (existing.indexOf(candidate) < 0) return candidate;
        }
        return base + ' ' + Date.now();
    }

    function focusRow(id) {
        var row = document.querySelector('.manage-row[data-id="' + id + '"]');
        if (!row) return;
        if (row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        var input = row.querySelector('.m-name');
        if (input) {
            input.focus();
            if (input.select) input.select();
        }
    }

    function addPrinter() {
        var api = PC();
        if (!api) return;
        var names = api.getList().map(function (i) { return i.name; });
        var name = uniqueName(names, '新机型');
        var result = api.addCustom(name, 150, 2000, 10000);
        if (result.error) { toast(result.error, 'error'); return; }
        renderPrinters();
        focusRow(result.id);
        toast('已新增机型，改完名称会自动保存');
    }

    function addFilament() {
        var api = FC();
        if (!api) return;
        var names = api.getList().map(function (i) { return i.name; });
        var name = uniqueName(names, '新耗材');
        var palette = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
        var result = api.addCustom({
            name: name,
            price: 99,
            color: palette[names.length % palette.length]
        });
        if (result.error) { toast(result.error, 'error'); return; }
        renderFilaments();
        focusRow(result.id);
        toast('已新增耗材，改完名称会自动保存');
    }

    /* ---------------------------------------------------------------------
       恢复全部默认（两次点击确认）
       --------------------------------------------------------------------- */
    function bindResetAll() {
        var btn = $('#resetAllBtn');
        if (!btn) return;
        var armed = false;
        var timer = null;

        function disarm() {
            armed = false;
            btn.classList.remove('armed');
            btn.textContent = '恢复全部默认';
            if (timer) { clearTimeout(timer); timer = null; }
        }

        btn.addEventListener('click', function () {
            if (!armed) {
                armed = true;
                btn.classList.add('armed');
                btn.textContent = '再点一次确认恢复';
                timer = setTimeout(disarm, 4000);
                return;
            }
            disarm();
            if (FC()) FC().resetAll();
            if (PC()) PC().resetAll();
            renderAll();
            toast('已恢复全部默认设置');
        });
    }

    /* ---------------------------------------------------------------------
       启动
       --------------------------------------------------------------------- */
    function bindList(listId, onNumber, onName, onColor) {
        var list = document.getElementById(listId);
        if (!list) return;

        list.addEventListener('change', function (e) {
            var target = e.target;
            if (!target) return;
            if (target.classList.contains('m-num')) onNumber(target);
            else if (target.classList.contains('m-name')) onName(target);
        });

        list.addEventListener('input', function (e) {
            var target = e.target;
            if (target && target.classList.contains('m-color')) onColor(target);
        });

        list.addEventListener('click', function (e) {
            var target = e.target;
            if (!target || !target.classList) return;
            if (target.classList.contains('m-del') || target.classList.contains('m-reset') ||
                target.classList.contains('m-dup') || target.classList.contains('m-hide') ||
                target.classList.contains('m-unhide')) {
                handleAction(target);
            }
        });
    }

    function init() {
        bindList('printerList', handleNumberChange, handleNameChange, handleColorChange);
        bindList('filamentList', handleNumberChange, handleNameChange, handleColorChange);

        var hiddenList = $('#hiddenList');
        if (hiddenList) {
            hiddenList.addEventListener('click', function (e) {
                var target = e.target;
                if (target && target.classList.contains('m-unhide')) handleAction(target);
            });
        }

        var addP = $('#addPrinterBtn');
        if (addP) addP.addEventListener('click', addPrinter);
        var addF = $('#addFilamentBtn');
        if (addF) addF.addEventListener('click', addFilament);

        bindResetAll();
        renderAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
