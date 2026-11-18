/* ==========================================================================
   数据与备份：按需导入导出（耗材配置 / 打印机 / 历史记录）
   - 导出：只写勾选的区块
   - 导入：只应用勾选且文件中存在的区块；历史记录按时间合并去重
   - 先校验后应用：任一所选区块不合法则整体中止，不改动现有数据
   ========================================================================== */
(function () {
    'use strict';

    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

    var HISTORY_KEY = 'calculationHistory';
    var HISTORY_LIMIT = 2000;
    var APP_ID = '3d-print-calculator';
    var SECTIONS = [
        { key: 'filaments', label: '耗材配置', hint: '预设单价与自定义耗材' },
        { key: 'printers', label: '打印机', hint: '自定义机型与参数覆盖' },
        { key: 'history', label: '历史记录', hint: '按时间合并，不会重复' }
    ];

    function toast(message, type) {
        if (window.indexPage && typeof window.indexPage.showToast === 'function') {
            window.indexPage.showToast(message, type || 'success');
        } else {
            console.log('[AppBackup]', message);
        }
    }

    function readHistory() {
        try {
            var list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            return Array.isArray(list) ? list.filter(function (r) { return r && typeof r === 'object'; }) : [];
        } catch (e) {
            return [];
        }
    }

    function writeHistory(list) {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
            return true;
        } catch (e) {
            return false;
        }
    }

    /* ---------------------------------------------------------------------
       计数摘要
       --------------------------------------------------------------------- */
    function filamentSummary() {
        var fc = window.FilamentCatalog;
        if (!fc) return '不可用';
        var data = fc.getData();
        var overrides = Object.keys(data.presets || {}).length;
        var custom = (data.custom || []).length;
        var parts = [];
        parts.push(overrides ? overrides + ' 项改价' : '默认价格');
        if (custom) parts.push(custom + ' 个自定义');
        return parts.join(' · ');
    }

    function printerSummary() {
        var pc = window.PrinterCatalog;
        if (!pc) return '不可用';
        var data = pc.getData();
        var overrides = Object.keys(data.overrides || {}).length;
        var custom = (data.custom || []).length;
        var parts = [(pc.defaults ? pc.defaults.length : 0) + ' 个预设'];
        if (custom) parts.push(custom + ' 个自定义');
        if (overrides) parts.push(overrides + ' 个改参');
        return parts.join(' · ');
    }

    function historySummary() {
        var n = readHistory().length;
        return n ? n + ' 条记录' : '暂无记录';
    }

    var SUMMARY = {
        filaments: filamentSummary,
        printers: printerSummary,
        history: historySummary
    };

    /* ---------------------------------------------------------------------
       弹窗
       --------------------------------------------------------------------- */
    function buildSections() {
        var box = $('#backupSections');
        if (!box) return;
        var previous = {};
        $$('#backupSections .section-check').forEach(function (cb) {
            previous[cb.getAttribute('data-key')] = cb.checked;
        });

        box.innerHTML = '';
        SECTIONS.forEach(function (section) {
            var row = document.createElement('label');
            row.className = 'section-row';

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'section-check';
            cb.setAttribute('data-key', section.key);
            cb.checked = previous[section.key] !== false;

            var text = document.createElement('span');
            text.className = 'section-text';
            var head = document.createElement('span');
            head.className = 'section-head';
            var title = document.createElement('b');
            title.textContent = section.label;
            var summary = document.createElement('em');
            summary.className = 'section-sum';
            summary.textContent = SUMMARY[section.key] ? SUMMARY[section.key]() : '';
            head.appendChild(title);
            head.appendChild(summary);
            var hint = document.createElement('small');
            hint.textContent = section.hint;
            text.appendChild(head);
            text.appendChild(hint);

            row.appendChild(cb);
            row.appendChild(text);
            box.appendChild(row);
        });
    }

    function selectedKeys() {
        return $$('#backupSections .section-check')
            .filter(function (cb) { return cb.checked; })
            .map(function (cb) { return cb.getAttribute('data-key'); });
    }

    function openModal() {
        var modal = $('#backupModal');
        if (!modal) return;
        buildSections();
        modal.classList.add('show');
    }

    function closeModal() {
        var modal = $('#backupModal');
        if (modal) modal.classList.remove('show');
    }

    /* ---------------------------------------------------------------------
       导出
       --------------------------------------------------------------------- */
    function exportSelected() {
        var keys = selectedKeys();
        if (keys.length === 0) {
            toast('请至少勾选一项要导出的数据', 'error');
            return;
        }

        var data = {
            app: APP_ID,
            kind: 'app-config',
            version: 2,
            exportedAt: new Date().toISOString(),
            sections: keys.slice()
        };

        if (keys.indexOf('filaments') >= 0 && window.FilamentCatalog) {
            data.filaments = window.FilamentCatalog.getData();
        }
        if (keys.indexOf('printers') >= 0 && window.PrinterCatalog) {
            data.printers = window.PrinterCatalog.getData();
        }
        if (keys.indexOf('history') >= 0) {
            data.history = readHistory();
        }

        var stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '3dpc-backup-' + stamp + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 3000);

        toast('已导出：' + keys.map(function (k) {
            var s = SECTIONS.filter(function (x) { return x.key === k; })[0];
            return s ? s.label : k;
        }).join(' / '), 'success');
    }

    /* ---------------------------------------------------------------------
       导入
       --------------------------------------------------------------------- */
    function parseHistory(raw) {
        if (!Array.isArray(raw)) return { error: 'history 字段必须是数组' };
        if (raw.length > HISTORY_LIMIT) return { error: '历史记录超过 ' + HISTORY_LIMIT + ' 条' };
        var list = [];
        for (var i = 0; i < raw.length; i++) {
            var item = raw[i];
            if (!item || typeof item !== 'object') return { error: '第 ' + (i + 1) + ' 条历史记录格式无效' };
            var ts = Number(item.timestamp);
            if (!isFinite(ts) || ts <= 0) return { error: '第 ' + (i + 1) + ' 条历史记录缺少有效时间戳' };
            if (item.cost !== undefined && !isFinite(Number(item.cost))) {
                return { error: '第 ' + (i + 1) + ' 条历史记录的成本无效' };
            }
            list.push(item);
        }
        return { list: list };
    }

    function mergeHistory(incoming) {
        var existing = readHistory();
        var map = {};
        var order = [];
        existing.forEach(function (r) {
            var key = String(r.timestamp);
            if (!map[key]) { map[key] = r; order.push(key); }
        });
        var added = 0;
        incoming.forEach(function (r) {
            var key = String(r.timestamp);
            if (map[key]) return;
            map[key] = r;
            order.push(key);
            added++;
        });
        var list = order.map(function (k) { return map[k]; })
            .sort(function (a, b) { return Number(b.timestamp) - Number(a.timestamp); })
            .slice(0, HISTORY_LIMIT);
        var ok = writeHistory(list);
        return ok ? { added: added, total: list.length } : { error: '写入历史记录失败（可能是存储空间不足）' };
    }

    function refreshAfterImport(result) {
        if (result.history) {
            if (window.indexPage && typeof window.indexPage.loadDesktopHistory === 'function') {
                window.indexPage.loadDesktopHistory();
            }
            var countEl = $('#desktopRecordCount');
            if (countEl) countEl.textContent = String(readHistory().length);
        }
        if (window.indexPage) {
            if (typeof window.indexPage.calculateCost === 'function') window.indexPage.calculateCost();
            if (typeof window.indexPage.saveCurrentSettings === 'function') window.indexPage.saveCurrentSettings();
        }
    }

    function applyImport(text) {
        var parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            toast('导入失败：不是合法的 JSON 文件', 'error');
            return;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            toast('导入失败：文件内容不是配置对象', 'error');
            return;
        }

        var keys = selectedKeys();
        if (keys.length === 0) {
            toast('请至少勾选一项要导入的数据', 'error');
            return;
        }

        // 兼容 v1（仅耗材配置）
        var isLegacy = parsed.kind === 'filament-config' && parsed.filaments;
        if (isLegacy && keys.indexOf('filaments') < 0) {
            toast('这是旧版耗材配置，请勾选「耗材配置」后再导入', 'error');
            return;
        }

        var plan = {};
        var missing = [];

        if (keys.indexOf('filaments') >= 0) {
            if (!parsed.filaments) missing.push('耗材配置');
            else {
                var f = window.FilamentCatalog ? window.FilamentCatalog.parseData(parsed.filaments) : { error: '耗材模块未加载' };
                if (f.error) { toast('导入失败：' + f.error, 'error'); return; }
                plan.filaments = f;
            }
        }
        if (keys.indexOf('printers') >= 0) {
            if (!parsed.printers) missing.push('打印机');
            else {
                var p = window.PrinterCatalog ? window.PrinterCatalog.parseData(parsed.printers) : { error: '打印机模块未加载' };
                if (p.error) { toast('导入失败：' + p.error, 'error'); return; }
                plan.printers = p;
            }
        }
        if (keys.indexOf('history') >= 0) {
            if (!parsed.history) missing.push('历史记录');
            else {
                var h = parseHistory(parsed.history);
                if (h.error) { toast('导入失败：' + h.error, 'error'); return; }
                plan.history = h.list;
            }
        }

        if (missing.length) {
            toast('导入失败：文件中没有 ' + missing.join('、') + ' 数据', 'error');
            return;
        }

        // 校验全部通过，开始应用
        var result = {};

        if (plan.filaments) {
            var fr = window.FilamentCatalog.setData(plan.filaments);
            if (fr.error) { toast('导入失败：' + fr.error, 'error'); return; }
            result.filaments = fr;
        }
        if (plan.printers) {
            var pr = window.PrinterCatalog.setData(plan.printers);
            if (pr.error) { toast('导入失败：' + pr.error, 'error'); return; }
            result.printers = pr;
        }
        if (plan.history) {
            var hr = mergeHistory(plan.history);
            if (hr.error) { toast('导入失败：' + hr.error, 'error'); return; }
            result.history = hr;
        }

        refreshAfterImport(result);
        buildSections();

        var parts = [];
        if (result.filaments) {
            parts.push('耗材 ' + (result.filaments.custom || 0) + ' 个自定义 / ' + (result.filaments.presets || 0) + ' 项改价');
        }
        if (result.printers) {
            parts.push('机型 ' + (result.printers.custom || 0) + ' 个');
        }
        if (result.history) {
            parts.push('历史 +' + (result.history.added || 0) + ' 条');
        }
        toast('已导入：' + parts.join('，'), 'success');
    }

    /* ---------------------------------------------------------------------
       事件
       --------------------------------------------------------------------- */
    function bind() {
        var openers = ['#backupBtn', '#dataBackupBtn'];
        openers.forEach(function (sel) {
            var el = $(sel);
            if (el) el.addEventListener('click', openModal);
        });

        var closeBtn = $('#backupCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        var exportBtn = $('#backupExportBtn');
        if (exportBtn) exportBtn.addEventListener('click', exportSelected);

        var importBtn = $('#backupImportBtn');
        var fileInput = $('#backupFile');
        if (importBtn && fileInput) {
            importBtn.addEventListener('click', function () {
                if (selectedKeys().length === 0) {
                    toast('请至少勾选一项要导入的数据', 'error');
                    return;
                }
                fileInput.value = '';
                fileInput.click();
            });
            fileInput.addEventListener('change', function () {
                var file = fileInput.files && fileInput.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function () { applyImport(String(reader.result || '')); };
                reader.onerror = function () { toast('读取文件失败', 'error'); };
                reader.readAsText(file);
            });
        }

        var modal = $('#backupModal');
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
            });
        }
    }

    window.AppBackup = { open: openModal, close: closeModal, exportSelected: exportSelected };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
