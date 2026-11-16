/* ==========================================================================
   主题管理：跟随系统 / 浅色 / 深色 三态切换
   - 首次访问默认「跟随系统」
   - 手动选择后记忆在 localStorage（键名 3dpc-theme）
   - 支持 ?theme=light|dark 临时预览（不写入记忆）
   - 多标签页与系统主题变化自动同步
   ========================================================================== */
(function () {
    'use strict';

    var KEY = '3dpc-theme';
    var MODES = ['auto', 'light', 'dark'];
    var LABEL = { auto: '跟随系统', light: '浅色', dark: '深色' };
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function systemDark() {
        return !!(mq && mq.matches);
    }

    function storedMode() {
        try {
            var v = localStorage.getItem(KEY);
            return MODES.indexOf(v) > -1 ? v : 'auto';
        } catch (e) {
            return 'auto';
        }
    }

    function resolve(mode) {
        return (mode === 'dark' || (mode === 'auto' && systemDark())) ? 'dark' : 'light';
    }

    function paint(mode, persist) {
        if (MODES.indexOf(mode) === -1) mode = 'auto';
        var root = document.documentElement;
        var resolved = resolve(mode);

        root.setAttribute('data-theme-mode', mode);
        root.setAttribute('data-theme', resolved);

        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', resolved === 'dark' ? '#070b10' : '#eef1f6');

        var buttons = document.querySelectorAll('.theme-toggle');
        var next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
        var title = '主题：' + LABEL[mode] + '（点击切换为' + LABEL[next] + '）';
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute('title', title);
            buttons[i].setAttribute('aria-label', '当前主题：' + LABEL[mode] + '，点击切换为' + LABEL[next]);
            buttons[i].setAttribute('data-mode', mode);
        }

        if (persist) {
            try {
                localStorage.setItem(KEY, mode);
            } catch (e) { /* 隐私模式下忽略 */ }
        }
    }

    function currentMode() {
        var m = document.documentElement.getAttribute('data-theme-mode');
        return MODES.indexOf(m) > -1 ? m : storedMode();
    }

    function bind() {
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var next = MODES[(MODES.indexOf(currentMode()) + 1) % MODES.length];
                paint(next, true);
            });
        });
        paint(currentMode(), false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }

    /* 系统主题变化：仅在「跟随系统」时响应 */
    if (mq) {
        var onSystemChange = function () {
            if (currentMode() === 'auto') paint('auto', false);
        };
        if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
        else if (mq.addListener) mq.addListener(onSystemChange);
    }

    /* 多标签页同步 */
    window.addEventListener('storage', function (e) {
        if (!e.key || e.key === KEY) paint(storedMode(), false);
    });
})();
