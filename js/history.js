(function() {
    'use strict';
    class HistoryPage {
        constructor() {
            this.currentDeleteIndex = null;
            this.isClearAll = false;
            this.init();
            this.bindEvents();
        }
        init() {
            this.loadHistory();
        }
        // 绑定事件
        bindEvents() {
            const clearAllBtn = document.getElementById('clearAllBtn');
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', () => {
                    this.onClearAll();
                });
            }
            // 关于按钮事件
            const aboutBtn = document.getElementById('aboutTabBtn');
            if (aboutBtn) {
                aboutBtn.addEventListener('click', () => {
                    console.log('点击关于按钮');
                    window.location.href = 'about.html';
                });
            }
            // 删除确认弹窗事件
            const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            if (cancelDeleteBtn) {
                cancelDeleteBtn.addEventListener('click', () => {
                    console.log('点击取消按钮');
                    this.hideConfirmModal();
                });
            }
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => {
                    console.log('点击确认按钮');
                    this.confirmDelete();
                });
            }
            // 添加弹窗背景点击关闭
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) {
                confirmModal.addEventListener('click', (e) => {
                    console.log('点击弹窗背景');
                    if (e.target === e.currentTarget) {
                        this.hideConfirmModal();
                    }
                });
            }
            // 添加键盘事件支持
            document.addEventListener('keydown', (e) => {
                const modal = document.getElementById('confirmModal');
                if (modal && modal.classList.contains('show')) {
                    if (e.key === 'Escape') {
                        this.hideConfirmModal();
                    }
                }
            });
        }
        // 加载历史记录
        loadHistory() {
            const history = this.getHistory();
            console.log('加载历史记录:', history);
            const formattedHistory = history.map(item => {
                return {
                    ...item,
                    cost: this.formatNumber(item.cost),
                    details: {
                        materialCost: this.formatNumber(item.details.materialCost),
                        electricityCost: this.formatNumber(item.details.electricityCost),
                        depreciationCost: this.formatNumber(item.details.depreciationCost),
                        totalHours: this.formatNumber(item.details.totalHours)
                    }
                };
            });
            this.renderHistory(formattedHistory);
            this.updateUI(formattedHistory.length);
        }
        // 获取历史记录
        getHistory() {
            try {
                return JSON.parse(localStorage.getItem('calculationHistory') || '[]');
            } catch (error) {
                console.error('读取历史记录失败:', error);
                return [];
            }
        }
        // 格式化数字
        formatNumber(value) {
            const num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        }
        // 渲染历史记录（DOM 构建）
        renderHistory(history) {
            const historyList = document.getElementById('historyList');
            const emptyState = document.getElementById('emptyState');
            const bottomActions = document.getElementById('bottomActions');
            if (!historyList) return;
            historyList.innerHTML = '';
            if (history.length === 0) {
                if (emptyState) emptyState.classList.remove('hidden');
                if (bottomActions) bottomActions.classList.add('hidden');
                return;
            }
            if (emptyState) emptyState.classList.add('hidden');
            if (bottomActions) bottomActions.classList.remove('hidden');
            history.slice().forEach((item, index) => {
                const node = this.createHistoryItem(item, index);
                if (node) historyList.appendChild(node);
            });
            this.applyColorSwatches(historyList);
            this.bindItemEvents();
        }
        // 创建历史记录项（DOM 构建）
        createHistoryItem(item, index) {
            const root = document.createElement('div');
            root.className = 'history-item';
            const header = document.createElement('div');
            header.className = 'item-header';
            const title = document.createElement('span'); title.className = 'item-title';
            title.textContent = item.remark || '未命名打印';
            const cost = document.createElement('span'); cost.className = 'item-cost';
            cost.textContent = `¥${((item.cost===undefined)?0:item.cost).toFixed(2)}`;
            header.appendChild(title); header.appendChild(cost);
            root.appendChild(header);
            const details = document.createElement('div'); details.className = 'item-details';
            const printerSpan = document.createElement('span'); printerSpan.className = 'detail-text';
            printerSpan.textContent = `🖨️ ${item.printer || ''}`;
            details.appendChild(printerSpan);
            if (item.filaments && item.filaments.length > 0) {
                item.filaments.forEach(filament => {
                    const weight = Math.round(parseFloat(filament.weight) || 0);
                    const color = filament.color || '';
                    const colorName = (window.ShareHelper && typeof window.ShareHelper.getColorName === 'function') ? window.ShareHelper.getColorName(color) : (this.getColorName ? this.getColorName(color) : '');
                    const detail = document.createElement('span'); detail.className = 'detail-text';
                    detail.appendChild(document.createTextNode(color ? '🎨 ' : '⚪ '));
                    if (color) {
                        const sw = document.createElement('span'); sw.className = 'color-swatch'; sw.setAttribute('data-color', color); sw.setAttribute('aria-hidden', 'true');
                        detail.appendChild(sw);
                    }
                    const nameSpan = document.createElement('span'); nameSpan.className = 'fw-500';
                    nameSpan.textContent = `${filament.name || ''} ${weight}g${colorName ? ` (${colorName})` : ''}`;
                    detail.appendChild(nameSpan);
                    details.appendChild(detail);
                });
            } else {
                const weight = Math.round(parseFloat(item.weight) || 0);
                const d = document.createElement('span'); d.className = 'detail-text';
                d.textContent = `⚪ ${item.filament || '未知'} ${weight}g`;
                details.appendChild(d);
            }
            const timeSpan = document.createElement('span'); timeSpan.className = 'detail-text'; timeSpan.textContent = `⏰ ${item.time || ''}`;
            details.appendChild(timeSpan);
            root.appendChild(details);
            const breakdown = document.createElement('div'); breakdown.className = 'item-breakdown';
            const bi1 = document.createElement('div'); bi1.className = 'breakdown-item';
            const bi1Label = document.createElement('span'); bi1Label.textContent = '材料:';
            const bi1Val = document.createElement('span'); bi1Val.textContent = `¥${((item.details&&item.details.materialCost)||0).toFixed(2)}`;
            bi1.appendChild(bi1Label); bi1.appendChild(bi1Val);
            const bi2 = document.createElement('div'); bi2.className = 'breakdown-item';
            const bi2Label = document.createElement('span'); bi2Label.textContent = '电力:';
            const bi2Val = document.createElement('span'); bi2Val.textContent = `¥${((item.details&&item.details.electricityCost)||0).toFixed(2)}`;
            bi2.appendChild(bi2Label); bi2.appendChild(bi2Val);
            const bi3 = document.createElement('div'); bi3.className = 'breakdown-item';
            const bi3Label = document.createElement('span'); bi3Label.textContent = '折旧:';
            const bi3Val = document.createElement('span'); bi3Val.textContent = `¥${((item.details&&item.details.depreciationCost)||0).toFixed(2)}`;
            bi3.appendChild(bi3Label); bi3.appendChild(bi3Val);
            breakdown.appendChild(bi1); breakdown.appendChild(bi2); breakdown.appendChild(bi3);
            root.appendChild(breakdown);
            const footer = document.createElement('div'); footer.className = 'item-footer';
            const itemTime = document.createElement('span'); itemTime.className = 'item-time'; itemTime.textContent = this.formatTime(item.timestamp);
            const actions = document.createElement('div'); actions.className = 'item-actions';
            const delBtn = document.createElement('button'); delBtn.className = 'btn-small delete'; delBtn.dataset.index = index; delBtn.textContent = '删除';
            const shareBtn = document.createElement('button'); shareBtn.className = 'btn-small share'; shareBtn.dataset.index = index; shareBtn.textContent = '分享';
            actions.appendChild(delBtn); actions.appendChild(shareBtn);
            footer.appendChild(itemTime); footer.appendChild(actions);
            root.appendChild(footer);
            return root;
        }
        // 绑定项目事件
        bindItemEvents() {
            // 删除按钮
            document.querySelectorAll('.btn-small.delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.onDeleteRecord(index);
                });
            });
            // 分享按钮
            document.querySelectorAll('.btn-small.share').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.onShareRecord(index);
                });
            });
        }
        // 将颜色值映射为大致的中文颜色名（红/黄/蓝/绿/白/黑/其他）
        getColorName(color) {
            if (!color) return '';
            const s = color.toString().trim().toLowerCase();
            // 常见颜色关键字直接映射
            const keywords = {
                red: '红',
                yellow: '黄',
                blue: '蓝',
                green: '绿',
                white: '白',
                black: '黑',
                gray: '灰',
                grey: '灰'
            };
            for (const k in keywords) {
                if (s === k || s.indexOf(k) !== -1) return keywords[k];
            }
            // #rrggbb 格式
            const hexMatch = s.match(/^#([0-9a-f]{6})$/i);
            if (hexMatch) {
                const rgb = this.hexToRgb(hexMatch[1]);
                if (!rgb) return '其他';
                const { r, g, b } = rgb;
                // 简单基于通道主导判断颜色
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                if (max < 30) return '黑';
                if (min > 220) return '白';
                // 黄色：R和G都高于B且R/G相近
                if (r > 150 && g > 150 && b < 120) return '黄';
                if (r > g && r > b) return '红';
                if (g > r && g > b) return '绿';
                if (b > r && b > g) return '蓝';
                return '其他';
            }
            // rgb(...) 或 rgba(...)
            const rgbMatch = s.match(/rgba?\(([^)]+)\)/);
            if (rgbMatch) {
                const parts = rgbMatch[1].split(',').map(p => parseInt(p, 10));
                if (parts.length >= 3) {
                    const [r, g, b] = parts;
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    if (max < 30) return '黑';
                    if (min > 220) return '白';
                    if (r > 150 && g > 150 && b < 120) return '黄';
                    if (r > g && r > b) return '红';
                    if (g > r && g > b) return '绿';
                    if (b > r && b > g) return '蓝';
                }
            }
            return '其他';
        }
        // 将不带#的6位16进制字符串转为rgb对象
        hexToRgb(hex) {
            if (!hex || hex.length !== 6) return null;
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            if ([r, g, b].some(v => Number.isNaN(v))) return null;
            return { r, g, b };
        }
        // 更新UI状态
        updateUI(recordCount) {
            const recordCountElement = document.getElementById('recordCount');
            if (recordCountElement) {
                recordCountElement.textContent = recordCount;
            }
        }
        // 格式化时间
        formatTime(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            // 如果是今天
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            // 如果是昨天
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) {
                return '昨天 ' + date.toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            // 其他情况显示完整日期
            return date.toLocaleDateString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        // 删除单条记录
        onDeleteRecord(index) {
            this.currentDeleteIndex = index;
            this.showConfirmModal('确定要删除这条记录吗？');
        }
        // 分享记录 - 修改支持多耗材
        async onShareRecord(index) {
            const history = this.getHistory();
            const item = history[index];
            // 使用共享的文本构建器，确保桌面/移动端一致
            const shareText = (window.ShareHelper && typeof window.ShareHelper.buildShareText === 'function')
                ? window.ShareHelper.buildShareText(item)
                : (() => {
                    // 兼容回退：简易构建器
                    let filamentText = '';
                    if (item.filaments && item.filaments.length > 0) {
                        filamentText = item.filaments.map(f => `耗材：${f.name} ${f.weight}g`).join('\n');
                    } else {
                        filamentText = `耗材：${item.filament} ${item.weight}g`;
                    }
                    return `3D打印成本分析：${item.remark || '未命名打印'}\n` +
                           `打印机：${item.printer}\n` +
                           `${filamentText}\n` +
                           `时间：${item.time}\n` +
                           `总成本：¥${(item.cost||0).toFixed(2)}\n` +
                           `材料：¥${((item.details&&item.details.materialCost)||0).toFixed(2)}\n` +
                           `电力：¥${((item.details&&item.details.electricityCost)||0).toFixed(2)}\n` +
                           `折旧：¥${((item.details&&item.details.depreciationCost)||0).toFixed(2)}`;
                })();
            try {
                await navigator.clipboard.writeText(shareText);
                this.showAutoHideToast('已复制到剪贴板', 'success');
            } catch (error) {
                console.error('复制失败:', error);
                this.fallbackCopy(shareText);
            }
        }
        // 备用复制方案
        fallbackCopy(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showAutoHideToast('已复制到剪贴板', 'success');
            } catch (error) {
                console.error('备用复制失败:', error);
                this.showAutoHideToast('复制失败，请手动复制', 'error');
                prompt('请手动复制以下文本：', text);
            }
            document.body.removeChild(textArea);
        }
        // 清空全部记录
        onClearAll() {
            this.showConfirmModal('确定要清空所有历史记录吗？此操作不可撤销', true);
        }
        // 显示确认弹窗
        showConfirmModal(message, isClearAll = false) {
            console.log('显示确认弹窗:', message, '移动端:', this.isMobile());
            const confirmText = document.getElementById('confirmText');
            const confirmModal = document.getElementById('confirmModal');
            if (confirmText) {
                confirmText.textContent = message;
            }
            if (confirmModal) {
                confirmModal.classList.add('show');
                console.log('弹窗显示状态:', confirmModal.classList.contains('show'));
            }
            this.isClearAll = isClearAll;
        }
        // 隐藏确认弹窗
        hideConfirmModal() {
            console.log('隐藏确认弹窗', '移动端:', this.isMobile());
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) {
                confirmModal.classList.remove('show');
                console.log('弹窗隐藏后状态:', confirmModal.classList.contains('show'));
            }
            this.currentDeleteIndex = null;
            this.isClearAll = false;
        }
        // 强制隐藏弹窗 - 专门针对手机端
        forceHideModal() {
            console.log('强制隐藏弹窗');
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) {
                confirmModal.classList.remove('show');
                confirmModal.classList.add('force-hidden');
            }
        }
        // 检测是否为移动端
        isMobile() {
            return window.innerWidth <= 768;
        }
        // 确认删除
        confirmDelete() {
            console.log('确认删除开始', {
                isClearAll: this.isClearAll,
                currentDeleteIndex: this.currentDeleteIndex,
                isMobile: this.isMobile()
            });
            try {
                if (this.isClearAll) {
                    console.log('执行清空所有记录');
                    localStorage.setItem('calculationHistory', '[]');
                    this.showAutoHideToast('已清空所有记录', 'success');
                } else if (this.currentDeleteIndex !== null) {
                    console.log('执行删除单条记录，索引:', this.currentDeleteIndex);
                    const history = this.getHistory();
                    if (this.currentDeleteIndex >= 0 && this.currentDeleteIndex < history.length) {
                        history.splice(this.currentDeleteIndex, 1);
                        localStorage.setItem('calculationHistory', JSON.stringify(history));
                        this.showAutoHideToast('删除成功', 'success');
                    } else {
                        throw new Error('无效的记录索引');
                    }
                }
                // 重新加载历史记录
                this.loadHistory();
            } catch (error) {
                console.error('删除操作失败:', error);
                this.showAutoHideToast('操作失败，请重试', 'error');
                return;
            }
            // 操作成功，关闭弹窗
            console.log('准备关闭弹窗');
            this.hideConfirmModal();
        }
        // 显示自动隐藏的提示
        showAutoHideToast(message, type = 'info') {
            // 创建提示元素
            const toast = document.createElement('div');
            toast.className = `auto-toast ${type}`;
            toast.textContent = message;
            // 添加样式
            toast.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: ${type === 'error' ? '#ff4757' : '#07C160'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 3000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
            // 显示动画
            setTimeout(() => {
                toast.style.opacity = '1';
            }, 10);
            // 2秒后自动隐藏
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, 2000);
        }
            // 将 data-color 应用为色块背景并设置可访问标题
            applyColorSwatches(container) {
                try {
                    const root = container || document;
                    root.querySelectorAll('.color-swatch[data-color]').forEach(el => {
                        const color = el.getAttribute('data-color');
                        if (color) {
                            el.style.background = color;
                            // 设置 title，便于查看具体颜色代码
                            el.setAttribute('title', color);
                        }
                    });
                } catch (e) {
                    console.warn('applyColorSwatches 出错', e);
                }
            }
        // HTML转义
        escapeHtml(unsafe) {
            // 保证传入为字符串，避免对 null/undefined 或数字直接调用 replace 抛错
            const s = unsafe == null ? '' : unsafe.toString();
            return s
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', () => {
        new HistoryPage();
    });
})();