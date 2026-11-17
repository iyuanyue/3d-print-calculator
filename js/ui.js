/* ==========================================================================
   首页增强交互层（不改变计算逻辑）
   - 合计条 / 设备摘要 / 耗材摘要 与表单双向同步
   - 时间步进器与快捷时长
   - 设备与耗材的折叠展开
   - 重置前的快照与「撤销」
   ========================================================================== */
(function () {
    'use strict';

    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

    var UNDO_TIMEOUT = 10000;

    /* ---------------------------------------------------------------------
       工具
       --------------------------------------------------------------------- */
    function num(v) {
        var n = parseFloat(v);
        return isFinite(n) ? n : 0;
    }

    function money(n) {
        return (Math.round(n * 100) / 100).toFixed(2);
    }

    function fire(el, type) {
        el.dispatchEvent(new Event(type || 'input', { bubbles: true }));
    }

    function setField(sel, value) {
        var el = $(sel);
        if (!el) return;
        el.value = value == null ? '' : String(value);
        fire(el, 'input');
        fire(el, 'change');
    }

    function debounce(fn, wait) {
        var t = null;
        return function () {
            var args = arguments, ctx = this;
            if (t) clearTimeout(t);
            t = setTimeout(function () { t = null; fn.apply(ctx, args); }, wait);
        };
    }

    /* ---------------------------------------------------------------------
       合计条
       --------------------------------------------------------------------- */
    function syncTotals() {
        var valueEl = $('#totbarValue');
        var hoursEl = $('#totbarHours');
        var mixEl = $('#totbarMix');
        if (!valueEl) return;

        var total = num(($('#totalCost') || {}).textContent);
        var hours = num(($('#totalHours') || {}).textContent);
        var mat = num(($('#materialCost') || {}).textContent);
        var ele = num(($('#electricityCost') || {}).textContent);
        var dep = num(($('#depreciationCost') || {}).textContent);

        valueEl.textContent = money(total);
        if (hoursEl) hoursEl.textContent = hours > 0 ? hours.toFixed(2) + ' 小时' : '未填写时间';

        if (mixEl) {
            if (total > 0) {
                var p = function (v) { return Math.round((v / total) * 100); };
                mixEl.textContent = '材料 ' + p(mat) + '% · 电 ' + p(ele) + '% · 折旧 ' + p(dep) + '%';
            } else {
                mixEl.textContent = '材料 — · 电 — · 折旧 —';
            }
        }
    }

    /* ---------------------------------------------------------------------
       设备摘要
       --------------------------------------------------------------------- */
    function syncDevice() {
        var box = $('#deviceSummary');
        var select = $('#printerSelect');
        if (!box || !select) return;

        var chips = [];
        var selected = select.options[select.selectedIndex];
        var printerName = '';
        if (select.value === 'other') {
            printerName = ($('#customPrinterName') || {}).value || '自定义机型';
        } else if (select.value !== '-1' && selected) {
            printerName = selected.textContent;
        }

        var power = ($('#printerPower') || {}).value;
        var rate = ($('#electricityRate') || {}).value;
        var life = ($('#printerLifespan') || {}).value;

        if (printerName) {
            chips.push('<span class="tag"><b>' + escapeHtml(printerName) + '</b></span>');
        } else {
            chips.push('<span class="tag is-empty">未选择机型</span>');
        }
        if (power) chips.push('<span class="tag">' + escapeHtml(power) + ' W</span>');
        if (rate) chips.push('<span class="tag">' + escapeHtml(rate) + ' 元/度</span>');
        if (life) chips.push('<span class="tag">寿命 ' + escapeHtml(life) + ' h</span>');

        box.innerHTML = chips.join('');
    }

    /* ---------------------------------------------------------------------
       耗材摘要
       --------------------------------------------------------------------- */
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function syncFilaments() {
        var items = $$('#filamentItemsContainer .filament-item');
        var totalWeight = 0;

        items.forEach(function (item) {
            var select = $('.filament-select', item);
            var custom = $('.custom-filament-name', item);
            var price = num(($('.filament-price', item) || {}).value);
            var weight = num(($('.filament-weight', item) || {}).value);
            var colorInput = $('.filament-color', item);
            var enable = $('.filament-color-enable', item);

            var nameEl = $('.filament-name', item);
            var subEl = $('.filament-sub', item);
            var costEl = $('.filament-cost', item);
            var dotEl = $('.filament-dot', item);

            var name = '';
            if (select) {
                if (select.value === 'other') {
                    name = (custom && custom.value) || '自定义类型';
                } else if (select.value !== '-1') {
                    var opt = select.options[select.selectedIndex];
                    name = opt ? opt.textContent : '';
                }
            }

            if (nameEl) nameEl.textContent = name || ('耗材 #' + (items.indexOf(item) + 1));
            if (subEl) {
                if (weight > 0) {
                    subEl.textContent = weight + ' g · ' + (price ? price + ' 元/kg' : '未填单价');
                } else {
                    subEl.textContent = price ? '未填重量 · ' + price + ' 元/kg' : '选择类型并填写重量';
                }
            }
            if (costEl) {
                if (weight > 0 && price > 0) {
                    costEl.textContent = '¥' + money((weight / 1000) * price);
                    costEl.classList.remove('is-empty');
                } else {
                    costEl.textContent = '—';
                    costEl.classList.add('is-empty');
                }
            }
            if (dotEl) {
                var colorOn = enable ? enable.checked : false;
                var color = colorInput ? colorInput.value : '';
                if (colorOn && color) {
                    dotEl.style.background = color;
                    dotEl.classList.remove('is-empty');
                } else {
                    dotEl.style.background = '';
                    dotEl.classList.add('is-empty');
                }
            }

            totalWeight += weight;
        });

        var summary = $('#filamentSummaryText');
        if (summary) {
            if (items.length === 0) {
                summary.textContent = '未添加';
            } else {
                summary.textContent = items.length + ' 项 · ' + Math.round(totalWeight) + ' g';
            }
        }
    }

    /* ---------------------------------------------------------------------
       时间视图
       --------------------------------------------------------------------- */
    function syncTime() {
        var hEl = $('#printHours');
        var mEl = $('#printMinutes');
        var hView = $('#timeHoursView');
        var mView = $('#timeMinutesView');
        if (!hEl || !mEl) return;

        var h = num(hEl.value);
        var m = num(mEl.value);
        if (hView) hView.textContent = String(h);
        if (mView) mView.textContent = String(m);

        $$('.chips .chip').forEach(function (chip) {
            var target = num(chip.getAttribute('data-hours'));
            var hit = m === 0 && h === target && h > 0;
            chip.classList.toggle('active', hit);
        });
    }

    /* ---------------------------------------------------------------------
       汇总
       --------------------------------------------------------------------- */
    function syncAll() {
        syncTotals();
        syncDevice();
        syncFilaments();
        syncTime();
    }

    var syncSoon = debounce(syncAll, 60);

    /* ---------------------------------------------------------------------
       折叠：耗材
       --------------------------------------------------------------------- */
    function bindFilamentToggles() {
        var container = $('#filamentItemsContainer');
        if (!container) return;
        container.addEventListener('click', function (e) {
            var head = e.target.closest ? e.target.closest('.filament-head') : null;
            if (!head) return;
            var item = head.parentElement;
            var expanded = item.classList.toggle('expanded');
            head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    }

    /* ---------------------------------------------------------------------
       折叠：设备
       --------------------------------------------------------------------- */
    function bindDeviceToggle() {
        var btn = $('#deviceToggle');
        var body = $('#deviceBody');
        if (!btn || !body) return;
        btn.addEventListener('click', function () {
            var open = body.hasAttribute('hidden');
            if (open) {
                body.removeAttribute('hidden');
                btn.textContent = '收起';
            } else {
                body.setAttribute('hidden', '');
                btn.textContent = '更改';
            }
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                var first = $('#printerSelect');
                if (first && window.matchMedia('(min-width: 900px)').matches) first.focus();
            }
        });
    }

    /* ---------------------------------------------------------------------
       时间步进器 / 快捷时长
       --------------------------------------------------------------------- */
    function bindTimeControls() {
        var panel = $('#timePanel');
        if (!panel) return;

        panel.addEventListener('click', function (e) {
            var stepBtn = e.target.closest ? e.target.closest('.step-btn') : null;
            var chip = e.target.closest ? e.target.closest('.chip') : null;
            var hEl = $('#printHours');
            var mEl = $('#printMinutes');
            if (!hEl || !mEl) return;

            if (stepBtn) {
                var delta = num(stepBtn.getAttribute('data-step'));
                var total = num(hEl.value) * 60 + num(mEl.value);
                total = Math.max(0, Math.round(total + delta));
                hEl.value = String(Math.floor(total / 60));
                mEl.value = String(total % 60);
                fire(hEl, 'input');
                fire(mEl, 'input');
                syncTime();
            } else if (chip) {
                var hours = num(chip.getAttribute('data-hours'));
                hEl.value = String(hours);
                mEl.value = '0';
                fire(hEl, 'input');
                fire(mEl, 'input');
                syncTime();
            }
        });
    }

    /* ---------------------------------------------------------------------
       重置：快照 + 撤销
       --------------------------------------------------------------------- */
    var snapshot = null;
    var undoTimer = null;

    function captureSnapshot() {
        var select = $('#printerSelect');
        var filaments = $$('#filamentItemsContainer .filament-item').map(function (item) {
            var sel = $('.filament-select', item);
            var value = sel ? sel.value : '-1';
            return {
                index: value === 'other' ? 'other' : parseInt(value, 10),
                customName: ($('.custom-filament-name', item) || {}).value || '',
                price: ($('.filament-price', item) || {}).value || '',
                weight: ($('.filament-weight', item) || {}).value || '',
                color: ($('.filament-color', item) || {}).value || '',
                colorEnabled: !!($('.filament-color-enable', item) || {}).checked
            };
        });
        return {
            printerSelectValue: select ? select.value : '-1',
            customPrinterName: ($('#customPrinterName') || {}).value || '',
            printerPower: ($('#printerPower') || {}).value || '',
            electricityRate: ($('#electricityRate') || {}).value || '',
            printerCost: ($('#printerCost') || {}).value || '',
            printerLifespan: ($('#printerLifespan') || {}).value || '',
            printHours: ($('#printHours') || {}).value || '0',
            printMinutes: ($('#printMinutes') || {}).value || '0',
            filaments: filaments
        };
    }

    function showUndo() {
        var bar = $('#undoBar');
        if (!bar) return;
        bar.removeAttribute('hidden');
        if (undoTimer) clearTimeout(undoTimer);
        undoTimer = setTimeout(hideUndo, UNDO_TIMEOUT);
    }

    function hideUndo() {
        var bar = $('#undoBar');
        if (bar) bar.setAttribute('hidden', '');
        if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
    }

    async function restoreSnapshot(snap) {
        var page = window.indexPage;
        if (!snap || !page) return;

        hideUndo();

        try {
            var state = page.state || {};
            state.printerIndex = snap.printerSelectValue === 'other' ? 'other' : parseInt(snap.printerSelectValue, 10);
            state.customPrinterName = snap.customPrinterName;
            state.printerPower = snap.printerPower;
            state.electricityRate = snap.electricityRate;
            state.printerCost = snap.printerCost;
            state.printerLifespan = snap.printerLifespan;
            state.printHours = snap.printHours;
            state.printMinutes = snap.printMinutes;
            state.filaments = snap.filaments.map(function (f) { return Object.assign({}, f); });
            page.filamentCount = snap.filaments.length;

            if (typeof page.recreateFilamentItems === 'function') {
                await page.recreateFilamentItems();
            }

            // 设备与时间字段
            var sel = $('#printerSelect');
            if (sel) {
                sel.value = String(snap.printerSelectValue);
                fire(sel, 'change');
            }
            setField('#customPrinterName', snap.customPrinterName);
            setField('#printerPower', snap.printerPower);
            setField('#electricityRate', snap.electricityRate);
            setField('#printerCost', snap.printerCost);
            setField('#printerLifespan', snap.printerLifespan);
            setField('#printHours', snap.printHours);
            setField('#printMinutes', snap.printMinutes);

            // 耗材：重建后可能被预设价格覆盖，这里按快照写回
            var items = $$('#filamentItemsContainer .filament-item');
            snap.filaments.forEach(function (f, i) {
                var item = items[i];
                if (!item) return;
                var s = $('.filament-select', item);
                if (s && f.index !== 'other') s.value = String(f.index);
                var custom = $('.custom-filament-name', item);
                if (custom) custom.value = f.customName || '';
                var price = $('.filament-price', item);
                if (price) { price.value = f.price || ''; fire(price, 'input'); }
                var weight = $('.filament-weight', item);
                if (weight) { weight.value = f.weight || ''; fire(weight, 'input'); }
                var color = $('.filament-color', item);
                if (color && f.color) color.value = f.color;
                var enable = $('.filament-color-enable', item);
                if (enable) {
                    enable.checked = !!f.colorEnabled;
                    fire(enable, 'change');
                }
            });

            if (typeof page.calculateCost === 'function') page.calculateCost();
            if (typeof page.saveCurrentSettings === 'function') page.saveCurrentSettings();
            if (typeof page.showToast === 'function') page.showToast('已恢复上一次的参数', 'success');
        } catch (err) {
            if (window.console) console.error('撤销失败:', err);
        }

        syncAll();
    }

    function bindResetUndo() {
        // 捕获阶段先快照，确保早于 index.js 的 click 处理器
        document.addEventListener('click', function (e) {
            var target = e.target;
            if (!target || !target.closest) return;
            if (!target.closest('#resetBtn')) return;
            snapshot = captureSnapshot();
            setTimeout(showUndo, 240);
        }, true);

        var undoBtn = $('#undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', function () {
                var snap = snapshot;
                snapshot = null;
                restoreSnapshot(snap);
            });
        }
    }

    /* ---------------------------------------------------------------------
       启动
       --------------------------------------------------------------------- */
    function init() {
        bindFilamentToggles();
        bindDeviceToggle();
        bindTimeControls();
        bindResetUndo();

        // 任意输入变化 -> 刷新摘要
        document.addEventListener('input', function () { syncSoon(); }, true);
        document.addEventListener('change', function () { syncSoon(); }, true);

        // 计算结果由 index.js 直接写入文本，监听这些节点
        ['#totalCost', '#totalHours', '#materialCost', '#electricityCost', '#depreciationCost'].forEach(function (sel) {
            var el = $(sel);
            if (!el) return;
            new MutationObserver(function () { syncTotals(); }).observe(el, { childList: true, characterData: true, subtree: true });
        });

        // 耗材项增删 / 重建
        var list = $('#filamentItemsContainer');
        if (list) {
            new MutationObserver(function () { syncSoon(); }).observe(list, { childList: true });
        }

        syncAll();
        // index.js 初始化是异步的（填充选项/恢复设置），稍后再同步一次
        [120, 400, 900, 1600].forEach(function (delay) { setTimeout(syncAll, delay); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
