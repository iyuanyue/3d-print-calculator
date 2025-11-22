// 共享文本构建工具，供 index.js 和 history.js 共同使用
(function(){
    'use strict';
    function hexToRgb(hex) {
        if (!hex) return null;
        const h = (hex.charAt(0) === '#') ? hex.slice(1) : hex;
        if (h.length !== 6) return null;
        const r = parseInt(h.slice(0,2), 16);
        const g = parseInt(h.slice(2,4), 16);
        const b = parseInt(h.slice(4,6), 16);
        if ([r,g,b].some(v => Number.isNaN(v))) return null;
        return { r, g, b };
    }
    // 将 RGB 转为 HSL，返回 { h:0-360, s:0-1, l:0-1 }
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }
        return { h, s, l };
    }
    function getColorName(color) {
        if (!color) return '';
        const s = color.toString().trim().toLowerCase();
        // 直接关键字映射（英文或常见中文名）
        const keywords = {
            red: '红', orange: '橙', yellow: '黄', green: '绿', cyan: '青', blue: '蓝', purple: '紫', pink: '粉', magenta: '粉', white: '白', black: '黑', gray: '灰', grey: '灰', brown: '棕'
        };
        for (const k in keywords) {
            if (s === k || s.indexOf(k) !== -1) return keywords[k];
        }
        // 尝试 hex
        const hexMatch = s.match(/^#([0-9a-f]{6})$/i);
        let rgb = null;
        if (hexMatch) {
            rgb = hexToRgb(hexMatch[0]);
        } else {
            // rgb(...) or rgba(...)
            const rgbMatch = s.match(/rgba?\(([^)]+)\)/);
            if (rgbMatch) {
                const parts = rgbMatch[1].split(',').map(p => parseFloat(p));
                if (parts.length >= 3) {
                    rgb = { r: parts[0], g: parts[1], b: parts[2] };
                }
            }
        }
        if (!rgb) return '其他';
        const { r, g, b } = rgb;
        const { h, s: sat, l } = rgbToHsl(r, g, b);
        // 判定白/黑/灰
        if (l >= 0.92) return '白';
        if (l <= 0.08) return '黑';
        if (sat <= 0.12) return '灰';
        // 棕色特殊处理：接近橙黄但亮度较低
        if (h >= 10 && h < 45 && l < 0.5 && sat > 0.2) return '棕';
        // 基于色相判断
        if ((h >= 345 && h <= 360) || (h >= 0 && h < 15)) return '红';
        if (h >= 15 && h < 45) return '橙';
        if (h >= 45 && h < 70) return '黄';
        if (h >= 70 && h < 165) return '绿';
        if (h >= 165 && h < 195) return '青';
        if (h >= 195 && h < 260) return '蓝';
        if (h >= 260 && h < 290) return '紫';
        if (h >= 290 && h < 345) return '粉';
        return '其他';
    }
    function buildFilamentText(item) {
        if (!item) return '';
        if (Array.isArray(item.filaments) && item.filaments.length > 0) {
            return item.filaments.map(f => {
                let colorPart = '';
                if (f.color) {
                    const enabled = f.colorEnabled === undefined ? true : !!f.colorEnabled;
                    if (enabled) {
                        const cn = getColorName(f.color);
                        colorPart = ` 颜色：${cn}`;
                    }
                }
                return `耗材：${f.name} ${f.weight}g${colorPart}`;
            }).join('\n');
        }
        // 旧格式
        let colorPart = '';
        if (item.color) {
            colorPart = ` 颜色：${getColorName(item.color)}`;
        }
        return `耗材：${item.filament || '未知'} ${item.weight || 0}g${colorPart}`;
    }
    function buildShareText(item) {
        if (!item) return '';
        const filamentText = buildFilamentText(item);
        const shareText = `3D打印成本分析：${item.remark || '未命名打印'}\n` +
                          `打印机：${item.printer}\n` +
                          `${filamentText}\n` +
                          `时间：${item.time}\n` +
                          `总成本：¥${(item.cost||0).toFixed(2)}\n` +
                          `材料：¥${((item.details&&item.details.materialCost)||0).toFixed(2)}\n` +
                          `电力：¥${((item.details&&item.details.electricityCost)||0).toFixed(2)}\n` +
                          `折旧：¥${((item.details&&item.details.depreciationCost)||0).toFixed(2)}`;
        return shareText;
    }
    // 暴露到全局以供页面脚本调用
    window.ShareHelper = {
        getColorName,
        hexToRgb,
        buildFilamentText,
        buildShareText
    };
})();
