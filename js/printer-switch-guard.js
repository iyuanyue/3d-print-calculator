/* ==========================================================================
   切换机型时的「保存修改」守卫
   - 在 change 事件的捕获阶段拦截（早于 index.js 的切换逻辑）
   - 当前设备参数与所选机型的预设不一致时，先询问：保存 / 不保存 / 取消切换
   - 保存走 PrinterCatalog.setPresetField，写入 printerCatalog 的 overrides
   ========================================================================== */
(function () {
    'use strict';

    var $ = function (sel, root) { return (root || document).querySelector(sel); };

    var bypass = false;
    var pending = null;

    function num(v) {
        var n = Number(v);
        return isFinite(n) ? n : 0;
    }

    function toast(message, type) {
        if (window.indexPage && typeof window.indexPage.showToast === 'function') {
            window.indexPage.showToast(message, type || 'success');
        } else if (typeof window.AppToast === 'function') {
            window.AppToast(message, type || 'success');
        }
    }

    var FIELDS = [
        { key: 'power', label: '功率', unit: 'W', input: 'printerPower' },
        { key: 'cost', label: '价格', unit: '¥', input: 'printerCost' },
        { key: 'lifespan', label: '寿命', unit: 'h', input: 'printerLifespan' }
    ];

    /* 当前表单值 vs 该机型预设值的差异 */
    function diffFor(index) {
        var printers = window.config && window.config.printers;
        if (!printers || !printers[index]) return [];
        var preset = printers[index];
        var changes = [];

        FIELDS.forEach(function (field) {
            var el = document.getElementById(field.input);
            if (!el) return;
            var raw = (el.value || '').trim();
            if (raw === '') return;                 // 空值不参与比较
            var to = Number(raw);
            if (!isFinite(to)) return;
            var from = num(preset[field.key]);
            if (to === from) return;
            changes.push({ key: field.key, label: field.label, unit: field.unit, from: from, to: to });
        });

        return changes;
    }

    /* ---------------------------------------------------------------------
       弹窗
       --------------------------------------------------------------------- */
    function buildDiff(presetName, changes) {
        var title = $('#switchTitle');
        if (title) title.textContent = '保存对「' + presetName + '」的修改？';

        var box = $('#switchDiff');
        if (!box) return;
        while (box.firstChild) box.removeChild(box.firstChild);

        changes.forEach(function (change) {
            var row = document.createElement('div');
            row.className = 'switch-row';

            var label = document.createElement('span');
            label.textContent = change.label;

            var value = document.createElement('b');
            value.textContent = change.from + change.unit + ' → ' + change.to + change.unit;

            row.appendChild(label);
            row.appendChild(value);
            box.appendChild(row);
        });
    }

    function openPrompt() {
        var printers = window.config && window.config.printers;
        var preset = printers && printers[pending.fromIndex];
        var modal = $('#switchModal');

        if (!modal || !preset) {
            // 没有弹窗就直接按「不保存」处理，避免卡住切换
            applyPending(false);
            return;
        }

        buildDiff(preset.name, pending.changes);
        modal.classList.add('show');
    }

    function closePrompt() {
        var modal = $('#switchModal');
        if (modal) modal.classList.remove('show');
    }

    /* ---------------------------------------------------------------------
       决策
       --------------------------------------------------------------------- */
    function applyPending(save) {
        if (!pending) return;

        var job = pending;
        pending = null;
        closePrompt();

        if (save) {
            var printers = window.config && window.config.printers;
            var preset = printers && printers[job.fromIndex];
            var api = window.PrinterCatalog;
            if (preset && api && typeof api.setPresetField === 'function') {
                var failed = null;
                job.changes.forEach(function (change) {
                    var result = api.setPresetField(String(preset.id), change.key, change.to);
                    if (result && result.error && !failed) failed = result.error;
                });
                if (failed) toast('保存失败：' + failed, 'error');
                else toast('已保存到「' + preset.name + '」的预设', 'success');
            }
        } else {
            toast('已切换（未保存修改）', 'success');
        }

        // 真正执行切换
        var select = $('#printerSelect');
        if (!select) return;
        bypass = true;
        try {
            select.value = job.targetValue;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        } finally {
            bypass = false;
        }
    }

    /* ---------------------------------------------------------------------
       拦截
       --------------------------------------------------------------------- */
    function onSelectChange(e) {
        if (bypass) return;
        var target = e.target;
        if (!target || target.id !== 'printerSelect') return;

        var page = window.indexPage;
        var state = page && page.state;
        if (!state) return;

        var fromIndex = state.printerIndex;
        if (typeof fromIndex !== 'number' || fromIndex < 0) return;   // 「其他」或无选择时不做比较

        var changes = diffFor(fromIndex);
        if (changes.length === 0) return;                             // 没有改动，直接放行

        var targetValue = target.value;
        if (String(targetValue) === String(fromIndex)) return;        // 选回同一台，放行

        e.stopPropagation();      // 拦住目标元素上的切换处理器

        pending = { fromIndex: fromIndex, targetValue: targetValue, changes: changes };
        target.value = String(fromIndex);   // 下拉先回到原机型，等用户决定
        openPrompt();
    }

    function bind() {
        document.addEventListener('change', onSelectChange, true);

        var cancelBtn = $('#switchCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                pending = null;
                closePrompt();
                toast('已取消切换，修改仍保留在表单里', 'info');
            });
        }

        var ignoreBtn = $('#switchIgnoreBtn');
        if (ignoreBtn) ignoreBtn.addEventListener('click', function () { applyPending(false); });

        var saveBtn = $('#switchSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', function () { applyPending(true); });

        var modal = $('#switchModal');
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) {
                    pending = null;
                    closePrompt();
                }
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    pending = null;
                    closePrompt();
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }

    window.PrinterSwitchGuard = {
        isPending: function () { return !!pending; }
    };
})();
