(function() {
    'use strict';
    class IndexPage {
        constructor() {
            // 缓存 DOM 引用
            this.dom = {};
            // 防抖后的计算函数（减少频繁计算）
            this.calculateCostDebounced = this.debounce(this.calculateCost.bind(this), 150);
            this.state = {
                printerIndex: -1,
                printerPower: '',
                printerCost: '',
                printerLifespan: '',
                printHours: '0',
                printMinutes: '0',
                electricityRate: '0.65',
                currentRemark: '',
                customPrinterName: '',
                filaments: [
                    {
                        index: -1,
                        customName: '',
                        price: '',
                        weight: '',
                        color: '#cccccc',
                        colorEnabled: false
                    }
                ]
            };
            this.filamentCount = 1;
            this.storageAvailable = this.checkStorage();
            this.init();
        }
        // 简单防抖实现
        debounce(fn, wait) {
            let t = null;
            return function(...args) {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(this, args), wait);
            };
        }
        // 清洗数值输入字符串：保留数字和最多一个小数点，移除其他字符
        sanitizeNumericString(value) {
            if (!value) return '';
            // 保留数字和小数点
            let v = value.toString();
            v = v.replace(/[^0-9.]/g, '');
            // 把多个点合并为一个，并只保留第一个点
            const parts = v.split('.');
            if (parts.length === 1) return parts[0];
            const integer = parts.shift();
            const rest = parts.join('');
            let result = integer + '.' + rest;
            // 如果以 '.' 开头（用户输入 .5），补 0 前缀
            if (result.startsWith('.')) result = '0' + result;
            return result;
        }
        // 检查localStorage是否可用
        checkStorage() {
            try {
                const test = 'test';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                console.warn('localStorage不可用，使用内存存储');
                return false;
            }
        }
        // 初始化数据
        async init() {
            await this.initializeData();
            this.bindEvents();
            await this.loadLastSettings();
            // 处理浏览器表单恢复的竞态：如果 DOM 中的打印机选择值
            // 与从 localStorage 恢复的 state 不一致，优先使用 DOM 值（用户可能在刷新前已选择）
            try {
                const printerSelectEl = document.getElementById('printerSelect');
                if (printerSelectEl) {
                    const domVal = printerSelectEl.value == null ? '' : printerSelectEl.value.toString();
                    const stateVal = (this.state.printerIndex == null) ? '' : this.state.printerIndex.toString();
                    if (domVal !== stateVal) {
                        // 将 DOM 的选择视为用户操作，应用对应参数并保存
                        this.onPrinterChange(domVal, false);
                    }
                }
            } catch (e) {
                console.warn('同步 printerSelect DOM 与 state 失败', e);
            }
            // 有些浏览器会在页面恢复（back/refresh）时延迟还原表单控件的值，
            // 因此再延迟一次同步，并在 pageshow（包括 bfcache 恢复）时也同步一次。
            const syncPrinterFromDOM = () => {
                try {
                    const el = document.getElementById('printerSelect');
                    if (!el) return;
                    const domVal = el.value == null ? '' : el.value.toString();
                    const stateVal = (this.state.printerIndex == null) ? '' : this.state.printerIndex.toString();
                    if (domVal !== stateVal) {
                        this.onPrinterChange(domVal, false);
                    }
                } catch (err) {
                    console.warn('syncPrinterFromDOM error', err);
                }
            };
            // 小延迟再尝试一次（覆盖浏览器稍后还原表单值的情况）
            setTimeout(syncPrinterFromDOM, 180);
            // pageshow 在 bfcache 恢复或页面显示时触发，优先再次同步
            window.addEventListener('pageshow', () => syncPrinterFromDOM());
            // 同步耗材相关的 DOM 控件（select, color-enable checkbox）到 state
            const syncFilamentFromDOM = () => {
                try {
                    const container = document.getElementById('filamentItemsContainer');
                    if (!container) return;
                    // 同步每个耗材的选择（如果 DOM 与 state 不同，触发 onFilamentChange）
                    container.querySelectorAll('.filament-select').forEach(select => {
                        const idx = select.dataset && select.dataset.index;
                        if (idx == null) return;
                        const index = parseInt(idx, 10);
                        const domVal = select.value == null ? '' : select.value.toString();
                        const stateVal = (this.state.filaments[index] && this.state.filaments[index].index != null) ? this.state.filaments[index].index.toString() : '';
                        if (domVal !== stateVal) {
                            // 以 DOM 的选择为准，按用户交互处理
                            this.onFilamentChange(index, domVal);
                        }
                    });
                    // 同步颜色启用复选框（及 color input）
                    container.querySelectorAll('.filament-color-enable').forEach(cb => {
                        const idx = cb.dataset && cb.dataset.index;
                        if (idx == null) return;
                        const index = parseInt(idx, 10);
                        const domChecked = !!cb.checked;
                        const stateChecked = !!(this.state.filaments[index] && this.state.filaments[index].colorEnabled);
                        if (domChecked !== stateChecked) {
                            this.state.filaments[index].colorEnabled = domChecked;
                            const colorContainer = document.querySelector(`.color-container[data-index=\"${index}\"]`);
                            if (colorContainer) colorContainer.style.display = domChecked ? 'flex' : 'none';
                            // 同步 color value（如果存在）
                            const colorInput = document.querySelector(`.filament-color[data-index=\"${index}\"]`);
                            if (domChecked) {
                                if (colorInput && colorInput.value) {
                                    this.state.filaments[index].color = colorInput.value;
                                }
                            } else {
                                this.state.filaments[index].color = '';
                            }
                            this.saveCurrentSettings();
                        } else {
                            // 即使 checked 相同，也确保 UI 显示与 color-wrapper 同步（防止 earlier hidden 状态）
                            const colorContainer = document.querySelector(`.color-container[data-index=\"${index}\"]`);
                            if (colorContainer) {
                                colorContainer.style.display = stateChecked ? 'flex' : 'none';
                                const cw = colorContainer.querySelector('.color-wrapper');
                                if (cw) cw.style.display = stateChecked ? 'flex' : 'none';
                            }
                        }
                    });
                } catch (err) {
                    console.warn('syncFilamentFromDOM error', err);
                }
            };
            // 小延迟再尝试一次
            setTimeout(syncFilamentFromDOM, 250);
            // pageshow 时也尝试同步
            window.addEventListener('pageshow', () => syncFilamentFromDOM());
            // 在 window.load 时再次强制同步一次（某些浏览器在 load 后还会恢复表单），
            // 并在短延迟后将 state 强制写回 DOM，确保最终一致性。
            window.addEventListener('load', () => {
                try {
                    syncPrinterFromDOM();
                    syncFilamentFromDOM();
                    // 短延迟后把 state 写回 DOM，覆盖浏览器后恢复的控件值
                    setTimeout(() => {
                        try {
                            // printer params
                            const pPower = document.getElementById('printerPower');
                            const pCost = document.getElementById('printerCost');
                            const pLife = document.getElementById('printerLifespan');
                            if (pPower && this.state.printerPower !== undefined) pPower.value = this.state.printerPower;
                            if (pCost && this.state.printerCost !== undefined) pCost.value = this.state.printerCost;
                            if (pLife && this.state.printerLifespan !== undefined) pLife.value = this.state.printerLifespan;
                            // filaments
                            const container = document.getElementById('filamentItemsContainer');
                            if (container) {
                                container.querySelectorAll('.filament-price').forEach(inp => {
                                    const idx = inp.dataset && inp.dataset.index;
                                    if (idx != null && this.state.filaments[idx]) inp.value = this.state.filaments[idx].price || '';
                                });
                                container.querySelectorAll('.filament-weight').forEach(inp => {
                                    const idx = inp.dataset && inp.dataset.index;
                                    if (idx != null && this.state.filaments[idx]) inp.value = this.state.filaments[idx].weight || '';
                                });
                                container.querySelectorAll('.filament-color').forEach(inp => {
                                    const idx = inp.dataset && inp.dataset.index;
                                    if (idx != null && this.state.filaments[idx]) inp.value = this.state.filaments[idx].color || '#cccccc';
                                });
                                container.querySelectorAll('.filament-color-enable').forEach(cb => {
                                    const idx = cb.dataset && cb.dataset.index;
                                    if (idx != null && this.state.filaments[idx]) cb.checked = !!this.state.filaments[idx].colorEnabled;
                                });
                            }
                        } catch (err) {
                            console.warn('write state back to DOM failed', err);
                        }
                    }, 120);
                    // 增加短时轮询以捕获浏览器在更晚时刻恢复表单值的情况（例如某些手机浏览器）
                    const start = Date.now();
                    const pollInterval = 150;
                    const maxDuration = 2000; // ms
                    const poll = setInterval(() => {
                        try {
                            syncPrinterFromDOM();
                            syncFilamentFromDOM();
                        } catch (e) {
                            // ignore
                        }
                        if (Date.now() - start > maxDuration) clearInterval(poll);
                    }, pollInterval);
                } catch (e) {
                    console.warn('load sync error', e);
                }
            });
            // 如果页面上尚未渲染任何耗材项（首次加载或清空缓存后），则基于 state 渲染初始项
            const container = document.getElementById('filamentItemsContainer');
            // 缓存容器引用，供事件委托使用
            this.dom.filamentItemsContainer = container;
            if (container && container.children.length === 0) {
                await this.recreateFilamentItems();
            }
            this.initDesktopHistory();
            // 使用防抖函数避免初始化时过多计算
            this.calculateCostDebounced();
        }
        // 初始化数据
        async initializeData() {
            const printerSelect = document.getElementById('printerSelect');
            const electricityRateInput = document.getElementById('electricityRate');
            // 填充打印机选项
            printerSelect.innerHTML = '<option value="-1">请选择打印机型号</option>';
            config.printers.forEach((printer, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = printer.name;
                printerSelect.appendChild(option);
            });
            // 添加"其他"选项
            const otherPrinterOption = document.createElement('option');
            otherPrinterOption.value = 'other';
            otherPrinterOption.textContent = '其他';
            printerSelect.appendChild(otherPrinterOption);
            // 禁用浏览器自动完成/恢复，避免浏览器表单恢复覆盖脚本管理的 state
            printerSelect.setAttribute('autocomplete', 'off');
            // 初始化第一个耗材的选择框
            await this.initializeFilamentSelect(0);
            // 设置默认电价：优先使用 DOM 中已有的输入值（如果用户或页面已设置），否则使用配置默认值
            if (electricityRateInput) {
                const domVal = (electricityRateInput.value || '').toString().trim();
                if (domVal !== '') {
                    this.state.electricityRate = domVal;
                } else {
                    electricityRateInput.value = config.defaults.electricityRate.toString();
                    this.state.electricityRate = config.defaults.electricityRate.toString();
                }
            }
        }
        // 初始化耗材选择框（同步填充以减少不必要的延迟）
        async initializeFilamentSelect(index) {
            const filamentSelect = document.querySelector(`.filament-select[data-index="${index}"]`);
            if (!filamentSelect) return;
            filamentSelect.innerHTML = '<option value="-1">请选择耗材类型</option>';
            config.filaments.forEach((filament, filamentIndex) => {
                const option = document.createElement('option');
                option.value = filamentIndex;
                option.textContent = filament.name;
                filamentSelect.appendChild(option);
            });
            const otherFilamentOption = document.createElement('option');
            otherFilamentOption.value = 'other';
            otherFilamentOption.textContent = '其他';
            filamentSelect.appendChild(otherFilamentOption);
        }
        // 加载上次的设置
        async loadLastSettings() {
            if (!this.storageAvailable) return;
            try {
                const lastSettings = JSON.parse(localStorage.getItem('lastCalculationSettings') || '{}');
                if (lastSettings.printerIndex !== undefined) {
                    this.state.printerIndex = lastSettings.printerIndex;
                    document.getElementById('printerSelect').value = lastSettings.printerIndex;
                    // 如果保存中包含打印机参数，则一起恢复到 state 和表单中
                    if (lastSettings.printerPower !== undefined) {
                        this.state.printerPower = lastSettings.printerPower;
                        const el = document.getElementById('printerPower');
                        if (el) el.value = lastSettings.printerPower;
                    }
                    if (lastSettings.printerCost !== undefined) {
                        this.state.printerCost = lastSettings.printerCost;
                        const el = document.getElementById('printerCost');
                        if (el) el.value = lastSettings.printerCost;
                    }
                    if (lastSettings.printerLifespan !== undefined) {
                        this.state.printerLifespan = lastSettings.printerLifespan;
                        const el = document.getElementById('printerLifespan');
                        if (el) el.value = lastSettings.printerLifespan;
                    }
                    // 立即触发打印机选择变化，确保参数正确加载
                    setTimeout(() => {
                        this.onPrinterChange(lastSettings.printerIndex, true);
                    }, 100);
                    if (lastSettings.printerIndex === 'other') {
                        this.showCustomPrinterInput();
                        if (lastSettings.customPrinterName) {
                            this.state.customPrinterName = lastSettings.customPrinterName;
                            document.getElementById('customPrinterName').value = lastSettings.customPrinterName;
                        }
                    }
                }
                // 加载耗材设置
                if (lastSettings.filaments && lastSettings.filaments.length > 0) {
                    this.state.filaments = lastSettings.filaments.map(filament => ({
                        index: filament.index,
                        customName: filament.customName,
                        price: filament.price,
                        weight: '',
                        color: filament.color || '#cccccc',
                        colorEnabled: !!filament.color
                    }));
                    this.filamentCount = lastSettings.filaments.length;
                    await this.recreateFilamentItems();
                }
                if (lastSettings.electricityRate) {
                    this.state.electricityRate = lastSettings.electricityRate;
                    document.getElementById('electricityRate').value = lastSettings.electricityRate;
                }
            } catch (error) {
                console.error('加载设置失败:', error);
            }
        }
        // 重新创建耗材项目
        async recreateFilamentItems() {
            const container = document.getElementById('filamentItemsContainer');
            container.innerHTML = '';
            for (let index = 0; index < this.state.filaments.length; index++) {
                await this.createFilamentItem(index, this.state.filaments[index]);
            }
            // 确保事件委托只绑定一次，提高性能
            if (this.dom.filamentItemsContainer && !this._filamentDelegationBound) {
                this.setupFilamentDelegation();
                this._filamentDelegationBound = true;
            }
        }
        // 保存当前设置
        saveCurrentSettings() {
            if (!this.storageAvailable) return;
            try {
                const settings = {
                    printerIndex: this.state.printerIndex,
                    printerPower: this.state.printerPower,
                    printerCost: this.state.printerCost,
                    printerLifespan: this.state.printerLifespan,
                    electricityRate: this.state.electricityRate,
                    customPrinterName: this.state.customPrinterName,
                    filaments: this.state.filaments.map(filament => ({
                        index: filament.index,
                        customName: filament.customName,
                        price: filament.price,
                        color: filament.colorEnabled ? filament.color : ''
                    }))
                };
                localStorage.setItem('lastCalculationSettings', JSON.stringify(settings));
            } catch (error) {
                console.error('保存设置失败:', error);
            }
        }
        // 绑定事件
        bindEvents() {
            // 打印机选择变化
            const printerSelectEl = document.getElementById('printerSelect');
            if (printerSelectEl) {
                printerSelectEl.addEventListener('change', (e) => {
                    this.onPrinterChange(e.target.value, false);
                });
            }
            // 自定义打印机名称输入
            const customPrinterNameEl = document.getElementById('customPrinterName');
            if (customPrinterNameEl) {
                customPrinterNameEl.addEventListener('input', (e) => {
                    this.state.customPrinterName = e.target.value;
                    this.saveCurrentSettings();
                });
            }
            // 限定为数字（含小数点）：为静态输入添加 inputmode/pattern 并清洗输入
            ['printerPower', 'printerCost', 'printerLifespan', 'electricityRate', 'printHours', 'printMinutes'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    // 建议移动端显示小数键盘
                    el.setAttribute('inputmode', 'decimal');
                    el.setAttribute('pattern', '[0-9]*\\.?[0-9]*');
                    el.addEventListener('input', (e) => {
                        // 清洗输入，保留数字和最多一个小数点
                        const cleaned = this.sanitizeNumericString(e.target.value);
                        if (cleaned !== e.target.value) e.target.value = cleaned;
                        this.state[id] = e.target.value;
                        if (id !== 'electricityRate') this.saveCurrentSettings();
                        this.calculateCostDebounced();
                    });
                }
            });
            // 打印时间输入
            const printHoursEl = document.getElementById('printHours');
            if (printHoursEl) {
                printHoursEl.addEventListener('input', (e) => {
                    this.state.printHours = e.target.value || '0';
                    this.calculateCostDebounced();
                });
            }
            const printMinutesEl = document.getElementById('printMinutes');
            if (printMinutesEl) {
                printMinutesEl.addEventListener('input', (e) => {
                    this.state.printMinutes = e.target.value || '0';
                    this.calculateCostDebounced();
                });
            }
            // 按钮事件
            const addFilamentBtn = document.getElementById('addFilamentBtn');
            if (addFilamentBtn) addFilamentBtn.addEventListener('click', () => this.addFilament());
            const resetBtn = document.getElementById('resetBtn');
            if (resetBtn) resetBtn.addEventListener('click', () => this.onReset());
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) saveBtn.addEventListener('click', () => this.onSaveCalculation());
            // 弹窗事件
            const cancelSaveBtn = document.getElementById('cancelSaveBtn');
            if (cancelSaveBtn) cancelSaveBtn.addEventListener('click', () => this.onCancelSave());
            const confirmSaveBtn = document.getElementById('confirmSaveBtn');
            if (confirmSaveBtn) confirmSaveBtn.addEventListener('click', () => this.onConfirmSave());
            const remarkInputEl = document.getElementById('remarkInput');
            if (remarkInputEl) remarkInputEl.addEventListener('input', (e) => { this.state.currentRemark = e.target.value; });
        }
        // 为耗材区域设置事件委托，减少每个元素单独绑定的开销
        setupFilamentDelegation() {
            const container = this.dom.filamentItemsContainer || document.getElementById('filamentItemsContainer');
            if (!container) return;
            // input 事件处理：custom name、price、weight、color
            container.addEventListener('input', (e) => {
                const target = e.target;
                const idx = target.dataset && target.dataset.index;
                if (idx == null) return;
                const index = parseInt(idx, 10);
                if (target.classList.contains('custom-filament-name')) {
                    this.state.filaments[index].customName = target.value;
                    this.saveCurrentSettings();
                    return;
                }
                if (target.classList.contains('filament-price')) {
                    // 清洗为数值格式
                    const cleaned = this.sanitizeNumericString(target.value);
                    if (cleaned !== target.value) target.value = cleaned;
                    this.state.filaments[index].price = target.value;
                    this.saveCurrentSettings();
                    this.calculateCostDebounced();
                    return;
                }
                if (target.classList.contains('filament-weight')) {
                    const cleaned = this.sanitizeNumericString(target.value);
                    if (cleaned !== target.value) target.value = cleaned;
                    this.state.filaments[index].weight = target.value;
                    this.calculateCostDebounced();
                    return;
                }
                if (target.classList.contains('filament-color')) {
                    const enableEl = document.querySelector(`.filament-color-enable[data-index="${index}"]`);
                    if (enableEl && enableEl.checked) {
                        this.state.filaments[index].color = target.value;
                        this.saveCurrentSettings();
                    }
                    return;
                }
            });
            // change 事件处理：select、checkbox
            container.addEventListener('change', (e) => {
                const target = e.target;
                const idx = target.dataset && target.dataset.index;
                if (idx == null) return;
                const index = parseInt(idx, 10);
                if (target.classList.contains('filament-select')) {
                    this.onFilamentChange(index, target.value);
                    return;
                }
                if (target.classList.contains('filament-color-enable')) {
                    const enabled = !!target.checked;
                    this.state.filaments[index].colorEnabled = enabled;
                    const colorContainer = document.querySelector(`.color-container[data-index="${index}"]`);
                    if (colorContainer) {
                        colorContainer.style.display = enabled ? 'flex' : 'none';
                        const cw = colorContainer.querySelector('.color-wrapper');
                        if (cw) cw.style.display = enabled ? 'flex' : 'none';
                    }
                    if (enabled) {
                        // 启用时尝试读取当前 color input 的值（若用户未更改则保持已有值或空字符串）
                        const colorInput = document.querySelector(`.filament-color[data-index="${index}"]`);
                        if (colorInput && colorInput.value) {
                            this.state.filaments[index].color = colorInput.value;
                        } else {
                            this.state.filaments[index].color = this.state.filaments[index].color || '';
                        }
                    } else {
                        // 禁用时清空 color 值
                        this.state.filaments[index].color = '';
                    }
                    // 无论启用或禁用，都立即保存状态，避免浏览器刷新/恢复造成不一致
                    this.saveCurrentSettings();
                    return;
                }
            });
            // 点击事件处理：删除按钮
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-filament-btn')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    this.removeFilament(index);
                }
            });
        }
        // 添加耗材
        async addFilament() {
            const newIndex = this.filamentCount;
            this.filamentCount++;
            this.state.filaments.push({
                index: -1,
                customName: '',
                price: '',
                weight: '',
                color: '#cccccc',
                colorEnabled: false
            });
            await this.createFilamentItem(newIndex);
            this.saveCurrentSettings();
            this.calculateCostDebounced();
            this.showToast('已添加耗材', 'success');
        }
        // 创建耗材项目（立即创建，避免不必要的定时器）
        async createFilamentItem(index, filamentData = null) {
            return new Promise((resolve) => {
                const container = document.getElementById('filamentItemsContainer');
                const filament = filamentData || { index: -1, customName: '', price: '', weight: '', color: '#cccccc', colorEnabled: false };
                const filamentItem = document.createElement('div');
                filamentItem.className = 'filament-item';
                filamentItem.setAttribute('data-index', index);
                // 修复：确保颜色选择器正确显示/隐藏（使用 DOM 构建）
                const colorEnabled = filament.colorEnabled || false;
                // header: 标题 + 启用颜色复选框 + 可选删除按钮
                const headerDiv = document.createElement('div');
                headerDiv.className = 'filament-item-header';
                const titleSpan = document.createElement('span');
                titleSpan.className = 'filament-item-title';
                titleSpan.textContent = `耗材 #${index + 1}`;
                headerDiv.appendChild(titleSpan);
                // 把颜色启用复选框放在标题后面（更靠前）
                const colorControlsHeader = document.createElement('div');
                colorControlsHeader.style.display = 'flex';
                colorControlsHeader.style.alignItems = 'center';
                colorControlsHeader.style.gap = '8px';
                const colorEnableHeader = document.createElement('input');
                colorEnableHeader.type = 'checkbox';
                colorEnableHeader.id = `filamentColorEnable-${index}`;
                colorEnableHeader.className = 'filament-color-enable';
                colorEnableHeader.setAttribute('autocomplete', 'off');
                colorEnableHeader.dataset.index = index;
                colorEnableHeader.checked = !!colorEnabled;
                const colorEnableHeaderLabel = document.createElement('label');
                colorEnableHeaderLabel.className = 'label label-no-margin';
                colorEnableHeaderLabel.setAttribute('for', `filamentColorEnable-${index}`);
                colorEnableHeaderLabel.textContent = '启用颜色';
                colorControlsHeader.appendChild(colorEnableHeader);
                colorControlsHeader.appendChild(colorEnableHeaderLabel);
                headerDiv.appendChild(colorControlsHeader);
                if (index > 0) {
                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'remove-filament-btn';
                    removeBtn.dataset.index = index;
                    removeBtn.textContent = '删除';
                    headerDiv.appendChild(removeBtn);
                }
                filamentItem.appendChild(headerDiv);
                // first row: select + custom name
                const row1 = document.createElement('div'); row1.className = 'form-item-row';
                const selectContainer = document.createElement('div'); selectContainer.className = 'form-item select-container';
                const selectLabel = document.createElement('label'); selectLabel.className = 'label'; selectLabel.setAttribute('for', `filamentSelect-${index}`); selectLabel.textContent = '耗材类型';
                const selectEl = document.createElement('select'); selectEl.className = 'select filament-select'; selectEl.dataset.index = index; selectEl.id = `filamentSelect-${index}`;
                selectEl.setAttribute('autocomplete', 'off');
                selectEl.innerHTML = '<option value="-1">请选择耗材类型</option>';
                selectContainer.appendChild(selectLabel); selectContainer.appendChild(selectEl);
                // 创建颜色选择器（稍后放到同一行的末尾，以便在选择 "其他" 时与自定义名称同一行）
                const colorWrapperAfterSelect = document.createElement('div');
                colorWrapperAfterSelect.className = 'color-wrapper';
                    colorWrapperAfterSelect.dataset.index = index; 
                if (!colorEnabled) colorWrapperAfterSelect.style.display = 'none';
                const colorInputAfter = document.createElement('input');
                colorInputAfter.type = 'color';
                colorInputAfter.className = 'color-input filament-color';
                colorInputAfter.setAttribute('autocomplete', 'off');
                colorInputAfter.dataset.index = index;
                colorInputAfter.id = `filamentColor-${index}`;
                colorInputAfter.value = filament.color || '#cccccc';
                colorWrapperAfterSelect.appendChild(colorInputAfter);
                const inputContainer = document.createElement('div'); inputContainer.className = 'form-item input-container filament-input-container'; inputContainer.dataset.index = index;
                const inputLabel = document.createElement('label'); inputLabel.className = 'label'; inputLabel.setAttribute('for', `customFilamentName-${index}`); inputLabel.textContent = '自定义类型';
                const customInput = document.createElement('input'); customInput.type = 'text'; customInput.className = 'input custom-filament-name'; customInput.dataset.index = index; customInput.id = `customFilamentName-${index}`; customInput.placeholder = '输入类型';
                customInput.value = filament.customName || '';
                customInput.setAttribute('autocomplete', 'off');
                inputContainer.appendChild(inputLabel); inputContainer.appendChild(customInput);
                // 仅在数据标记为 'other' 时显示自定义输入
                if (filament.index === 'other') {
                    inputContainer.classList.add('visible');
                }
                row1.appendChild(selectContainer);
                // 将颜色容器放在选择框之后，保证移动端显示顺序为：选择框 -> 颜色 -> 自定义输入
                const colorContainer = document.createElement('div');
                colorContainer.className = 'form-item color-container';
                const colorLabelSmall = document.createElement('label');
                colorLabelSmall.className = 'label';
                colorLabelSmall.setAttribute('for', `filamentColor-${index}`);
                colorLabelSmall.textContent = '颜色';
                colorContainer.appendChild(colorLabelSmall);
                colorContainer.appendChild(colorWrapperAfterSelect);
                colorContainer.dataset.index = index;
                if (!colorEnabled) colorContainer.style.display = 'none';
                row1.appendChild(colorContainer);
                row1.appendChild(inputContainer);
                filamentItem.appendChild(row1);
                // second row: price + weight
                const row2 = document.createElement('div'); row2.className = 'form-row';
                const priceWrap = document.createElement('div'); priceWrap.className = 'form-item';
                const priceLabel = document.createElement('label'); priceLabel.className = 'label'; priceLabel.setAttribute('for', `filamentPrice-${index}`); priceLabel.textContent = '耗材单价 (¥/kg)';
                const priceInput = document.createElement('input'); priceInput.type = 'text'; priceInput.className = 'input filament-price'; priceInput.dataset.index = index; priceInput.id = `filamentPrice-${index}`; priceInput.placeholder = '输入单价'; priceInput.value = filament.price || '';
                priceInput.setAttribute('inputmode', 'decimal');
                priceInput.setAttribute('pattern', '[0-9]*\\.?[0-9]*');
                priceInput.setAttribute('autocomplete', 'off');
                priceWrap.appendChild(priceLabel); priceWrap.appendChild(priceInput);
                const weightWrap = document.createElement('div'); weightWrap.className = 'form-item';
                const weightLabel = document.createElement('label'); weightLabel.className = 'label'; weightLabel.setAttribute('for', `filamentWeight-${index}`); weightLabel.textContent = '使用重量 (g)';
                const weightInput = document.createElement('input'); weightInput.type = 'text'; weightInput.className = 'input filament-weight'; weightInput.dataset.index = index; weightInput.id = `filamentWeight-${index}`; weightInput.placeholder = '输入重量'; weightInput.value = filament.weight || '';
                weightInput.setAttribute('inputmode', 'decimal');
                weightInput.setAttribute('pattern', '[0-9]*\\.?[0-9]*');
                weightInput.setAttribute('autocomplete', 'off');
                weightWrap.appendChild(weightLabel); weightWrap.appendChild(weightInput);
                row2.appendChild(priceWrap); row2.appendChild(weightWrap);
                filamentItem.appendChild(row2);
                // 颜色控制已放在标题和第一行（启用复选框在标题，色盘在选择后），无需在此创建额外行。
                container.appendChild(filamentItem);
                this.initializeFilamentSelect(index).then(() => {
                    // 设置选择框的值
                    if (filament.index !== undefined && filament.index !== -1) {
                        const select = filamentItem.querySelector('.filament-select');
                        if (select) {
                            select.value = filament.index;
                            // 自动填充预设耗材价格
                            if (filament.index >= 0 && config.filaments[filament.index]) {
                                const filamentConfig = config.filaments[filament.index];
                                const priceInput = filamentItem.querySelector('.filament-price');
                                if (priceInput) {
                                    priceInput.value = filamentConfig.price.toString();
                                    this.state.filaments[index].price = filamentConfig.price.toString();
                                    // 立即保存设置并触发防抖计算
                                    this.saveCurrentSettings();
                                    this.calculateCostDebounced();
                                }
                            } else if (filament.index === 'other') {
                                this.showCustomFilamentInput(index);
                            }
                            // 程序化设置 value 后触发一次 change，确保所有绑定逻辑（如 onFilamentChange）被执行
                            try {
                                select.dispatchEvent(new Event('change'));
                            } catch (e) {
                                const evt = document.createEvent('HTMLEvents');
                                evt.initEvent('change', true, false);
                                select.dispatchEvent(evt);
                            }
                        }
                    }
                    // 确保事件委托已经绑定（第一次创建时可能尚未绑定）
                    if (!this._filamentDelegationBound) {
                        this.setupFilamentDelegation();
                        this._filamentDelegationBound = true;
                    }
                    resolve();
                });
            });
        }
        // 删除耗材
        async removeFilament(index) {
            if (this.state.filaments.length <= 1) {
                this.showToast('至少需要保留一个耗材', 'error');
                return;
            }
            this.state.filaments.splice(index, 1);
            this.filamentCount--;
            await this.recreateFilamentItems();
            this.saveCurrentSettings();
            this.calculateCostDebounced();
            this.showToast('已删除耗材', 'success');
        }
        // 显示/隐藏自定义输入框
        showCustomPrinterInput() {
            document.querySelector('.printer-input-container').classList.add('visible');
        }
        hideCustomPrinterInput() {
            document.querySelector('.printer-input-container').classList.remove('visible');
            this.state.customPrinterName = '';
            document.getElementById('customPrinterName').value = '';
        }
        showCustomFilamentInput(index) {
            const container = document.querySelector(`.filament-input-container[data-index="${index}"]`);
            if (container) container.classList.add('visible');
        }
        hideCustomFilamentInput(index) {
            const container = document.querySelector(`.filament-input-container[data-index="${index}"]`);
            if (container) {
                container.classList.remove('visible');
                this.state.filaments[index].customName = '';
                const input = document.querySelector(`.custom-filament-name[data-index="${index}"]`);
                if (input) input.value = '';
            }
        }
        // 打印机选择变化
        onPrinterChange(value, isFromLoad = false) {
            // value 来自 select.value，通常为字符串。将其规范为数字索引或字符串 'other'
            const idx = value === 'other' ? 'other' : (value === '' ? -1 : parseInt(value, 10));
            this.state.printerIndex = idx;
            if (idx === 'other') {
                this.showCustomPrinterInput();
                // 当来自 load/loadLastSettings 恢复时，不要清空已恢复的自定义参数
                if (!isFromLoad) {
                    ['printerPower', 'printerCost', 'printerLifespan'].forEach(id => {
                        this.state[id] = '';
                        const el = document.getElementById(id);
                        if (el) el.value = '';
                    });
                }
            } else if (typeof idx === 'number' && idx >= 0 && config.printers[idx]) {
                this.hideCustomPrinterInput();
                const printer = config.printers[idx];
                // 只有在用户操作时才更新参数，避免覆盖已保存的值
                if (!isFromLoad) {
                    this.state.printerPower = printer.power.toString();
                    this.state.printerCost = printer.cost.toString();
                    this.state.printerLifespan = printer.lifespan.toString();
                    document.getElementById('printerPower').value = this.state.printerPower;
                    document.getElementById('printerCost').value = this.state.printerCost;
                    document.getElementById('printerLifespan').value = this.state.printerLifespan;
                }
            } else {
                this.hideCustomPrinterInput();
                if (!isFromLoad) {
                    ['printerPower', 'printerCost', 'printerLifespan'].forEach(id => {
                        this.state[id] = '';
                        const el = document.getElementById(id);
                        if (el) el.value = '';
                    });
                }
            }
            // 在参数更新之后再保存到 localStorage（如果不是从 load/load-settings 恢复）
            if (!isFromLoad) {
                this.saveCurrentSettings();
            }
            this.calculateCostDebounced();
        }
        // 耗材选择变化
        onFilamentChange(index, value) {
            const val = value === 'other' ? 'other' : (value === '' ? -1 : parseInt(value, 10));
            this.state.filaments[index].index = val;
            this.saveCurrentSettings();
            if (val === 'other') {
                this.showCustomFilamentInput(index);
                this.state.filaments[index].price = '';
                const priceInput = document.querySelector(`.filament-price[data-index="${index}"]`);
                if (priceInput) priceInput.value = '';
            } else if (typeof val === 'number' && val >= 0 && config.filaments[val]) {
                this.hideCustomFilamentInput(index);
                const filament = config.filaments[val];
                this.state.filaments[index].price = filament.price.toString();
                const priceInput = document.querySelector(`.filament-price[data-index="${index}"]`);
                if (priceInput) {
                    priceInput.value = this.state.filaments[index].price;
                    // 立即保存并计算（使用防抖以减少重复计算）
                    this.saveCurrentSettings();
                    this.calculateCostDebounced();
                }
            } else {
                this.hideCustomFilamentInput(index);
                this.state.filaments[index].price = '';
                const priceInput = document.querySelector(`.filament-price[data-index="${index}"]`);
                if (priceInput) priceInput.value = '';
            }
        }
        // 验证必填字段
        validateRequiredFields() {
            const errors = [];
            if (!this.state.printerPower || parseFloat(this.state.printerPower) <= 0) errors.push('打印机功率');
            if (!this.state.printerCost || parseFloat(this.state.printerCost) <= 0) errors.push('打印机价值');
            if (!this.state.printerLifespan || parseFloat(this.state.printerLifespan) <= 0) errors.push('预计寿命');
            if (!this.state.electricityRate || parseFloat(this.state.electricityRate) <= 0) errors.push('电价');
            let hasValidFilamentPrice = false;
            let hasValidWeight = false;
            this.state.filaments.forEach(filament => {
                if (filament.price && parseFloat(filament.price) > 0) hasValidFilamentPrice = true;
                if (filament.weight && parseFloat(filament.weight) > 0) hasValidWeight = true;
            });
            if (!hasValidFilamentPrice) errors.push('耗材单价');
            if (!hasValidWeight) errors.push('使用重量');
            const totalMinutes = (parseInt(this.state.printHours) || 0) * 60 + (parseInt(this.state.printMinutes) || 0);
            if (totalMinutes <= 0) errors.push('打印时间');
            return errors;
        }
        // 计算成本
        calculateCost() {
            const errors = this.validateRequiredFields();
            if (errors.length > 0) return;
            let totalMaterialCost = 0;
            let totalWeight = 0;
            this.state.filaments.forEach(filament => {
                const weight = parseFloat(filament.weight) || 0;
                const price = parseFloat(filament.price) || 0;
                if (weight > 0 && price > 0) {
                    totalMaterialCost += (weight / 1000) * price;
                    totalWeight += weight;
                }
            });
            const params = {
                printerPower: this.state.printerPower || '0',
                printerCost: this.state.printerCost || '0', 
                printerLifespan: this.state.printerLifespan || '1',
                filamentPrice: '0',
                filamentWeight: totalWeight.toString(),
                printHours: this.state.printHours || '0',
                printMinutes: this.state.printMinutes || '0',
                electricityRate: this.state.electricityRate || '0.65'
            };
            try {
                const costResult = Calculator.calculateAllCosts(params);
                costResult.materialCost = totalMaterialCost;
                costResult.totalCost = costResult.electricityCost + costResult.depreciationCost + totalMaterialCost;
                document.getElementById('materialCost').textContent = costResult.materialCost.toFixed(2);
                document.getElementById('electricityCost').textContent = costResult.electricityCost.toFixed(2);
                document.getElementById('depreciationCost').textContent = costResult.depreciationCost.toFixed(2);
                document.getElementById('totalCost').textContent = costResult.totalCost.toFixed(2);
                document.getElementById('totalHours').textContent = costResult.totalHours.toFixed(2);
            } catch (error) {
                this.resetCostDisplay();
            }
        }
        // 重置成本显示
        resetCostDisplay() {
            ['materialCost', 'electricityCost', 'depreciationCost', 'totalCost', 'totalHours'].forEach(id => {
                document.getElementById(id).textContent = '0.00';
            });
        }
        // 重新计算
        async onReset() {
            this.state = {
                printerIndex: -1,
                printerPower: '',
                printerCost: '',
                printerLifespan: '',
                printHours: '0',
                printMinutes: '0',
                electricityRate: config.defaults.electricityRate.toString(),
                currentRemark: '',
                customPrinterName: '',
                filaments: [{ index: -1, customName: '', price: '', weight: '', color: '#cccccc', colorEnabled: false }]
            };
            this.filamentCount = 1;
            document.getElementById('printerSelect').value = '-1';
            ['printerPower', 'printerCost', 'printerLifespan', 'printHours', 'printMinutes'].forEach(id => {
                document.getElementById(id).value = id.startsWith('print') ? '0' : '';
            });
            document.getElementById('electricityRate').value = config.defaults.electricityRate.toString();
            this.hideCustomPrinterInput();
            await this.recreateFilamentItems();
            if (this.storageAvailable) localStorage.removeItem('lastCalculationSettings');
            this.resetCostDisplay();
            this.showToast('已重置', 'success');
        }
        // 保存计算结果
        onSaveCalculation() {
            const errors = this.validateRequiredFields();
            if (errors.length > 0) {
                this.showToast(`请填写：${errors.join('、')}`, 'error');
                return;
            }
            document.getElementById('remarkModal').classList.add('show');
            this.state.currentRemark = '';
            document.getElementById('remarkInput').value = '';
        }
        // 确认保存
        onConfirmSave() {
            const remark = this.state.currentRemark.trim();
            const totalCost = parseFloat(document.getElementById('totalCost').textContent);
            let printerName = '自定义';
            if (this.state.printerIndex === 'other' && this.state.customPrinterName) {
                printerName = this.state.customPrinterName;
            } else if (this.state.printerIndex >= 0) {
                printerName = config.printers[this.state.printerIndex].name;
            }
            const filamentInfo = this.state.filaments.map(filament => {
                let name = '自定义';
                if (filament.index === 'other' && filament.customName) {
                    name = filament.customName;
                } else if (filament.index >= 0) {
                    name = config.filaments[filament.index].name;
                }
                const info = { name, weight: filament.weight, price: filament.price };
                if (filament.colorEnabled && filament.color) info.color = filament.color;
                return info;
            });
            const calculation = {
                timestamp: Date.now(),
                printer: printerName,
                filaments: filamentInfo,
                time: this.state.printHours + 'h ' + this.state.printMinutes + 'm',
                cost: totalCost,
                remark: remark || '打印项目 ' + new Date().toLocaleDateString(),
                details: {
                    materialCost: parseFloat(document.getElementById('materialCost').textContent),
                    electricityCost: parseFloat(document.getElementById('electricityCost').textContent),
                    depreciationCost: parseFloat(document.getElementById('depreciationCost').textContent),
                    totalHours: parseFloat(document.getElementById('totalHours').textContent)
                }
            };
            try {
                let history = JSON.parse(localStorage.getItem('calculationHistory') || '[]');
                history.unshift(calculation);
                localStorage.setItem('calculationHistory', JSON.stringify(history));
            } catch (error) {
                console.error('保存失败:', error);
            }
            this.onCancelSave();
            this.showToast('保存成功', 'success');
            if (window.matchMedia('(min-width: 768px)').matches) {
                this.loadDesktopHistory();
            }
        }
        // 取消保存
        onCancelSave() {
            document.getElementById('remarkModal').classList.remove('show');
        }
        // 电脑端历史记录相关
        initDesktopHistory() {
            if (window.matchMedia('(min-width: 768px)').matches) {
                this.loadDesktopHistory();
                this.bindDesktopEvents();
            }
        }
        loadDesktopHistory() {
            try {
                const history = JSON.parse(localStorage.getItem('calculationHistory') || '[]');
                this.renderDesktopHistory(history);
                document.getElementById('desktopRecordCount').textContent = history.length;
            } catch (error) {
                console.error('加载历史记录失败:', error);
            }
        }
        renderDesktopHistory(history) {
            const historyList = document.getElementById('desktopHistoryList');
            if (!historyList) return;
            historyList.innerHTML = '';
            if (history.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'empty-state';
                const span = document.createElement('span');
                span.className = 'empty-text';
                span.textContent = '暂无记录';
                empty.appendChild(span);
                historyList.appendChild(empty);
                return;
            }
            const items = history.slice(0, 5);
            items.forEach((item, index) => {
                const el = this.createDesktopHistoryItem(item, index);
                if (el) historyList.appendChild(el);
            });
            // 把 data-color 应用到色块上，避免内联 style
            this.applyColorSwatches(historyList);
        }
        // 将所有带 data-color 的 .color-swatch 应用为行内背景色并加上可访问标题
        applyColorSwatches(container) {
            try {
                const root = container || document;
                root.querySelectorAll('.color-swatch[data-color]').forEach(el => {
                    const color = el.getAttribute('data-color');
                    if (color) {
                        el.style.background = color;
                        // 设置 title 以便悬停可见具体颜色值
                        el.setAttribute('title', color);
                    }
                });
            } catch (e) {
                console.warn('applyColorSwatches 出错', e);
            }
        }
        createDesktopHistoryItem(item, index) {
            const root = document.createElement('div');
            root.className = 'history-item';
            const header = document.createElement('div');
            header.className = 'item-header';
            const title = document.createElement('span');
            title.className = 'item-title';
            title.textContent = item.remark || '未命名打印';
            const cost = document.createElement('span');
            cost.className = 'item-cost';
            cost.textContent = `¥${((item.cost===undefined)?0:item.cost).toFixed(2)}`;
            header.appendChild(title);
            header.appendChild(cost);
            root.appendChild(header);
            const details = document.createElement('div');
            details.className = 'item-details';
            const printerSpan = document.createElement('span');
            printerSpan.className = 'detail-text';
            printerSpan.textContent = `🖨️ ${item.printer || ''}`;
            details.appendChild(printerSpan);
            if (item.filaments && item.filaments.length > 0) {
                item.filaments.forEach(filament => {
                    const weight = Math.round(parseFloat(filament.weight) || 0);
                    const color = filament.color || '';
                    const colorName = (window.ShareHelper && typeof window.ShareHelper.getColorName === 'function') ? window.ShareHelper.getColorName(color) : '';
                    const detail = document.createElement('span');
                    detail.className = 'detail-text';
                    detail.appendChild(document.createTextNode(color ? '🎨 ' : '⚪ '));
                    if (color) {
                        const sw = document.createElement('span');
                        sw.className = 'color-swatch';
                        sw.setAttribute('data-color', color);
                        sw.setAttribute('aria-hidden', 'true');
                        detail.appendChild(sw);
                    }
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'fw-500';
                    nameSpan.textContent = `${filament.name || ''} ${weight}g${colorName ? ` (${colorName})` : ''}`;
                    detail.appendChild(nameSpan);
                    details.appendChild(detail);
                });
            } else {
                const weight = Math.round(parseFloat(item.weight) || 0);
                const d = document.createElement('span');
                d.className = 'detail-text';
                d.textContent = `⚪ ${item.filament || '未知'} ${weight}g`;
                details.appendChild(d);
            }
            const timeSpan = document.createElement('span');
            timeSpan.className = 'detail-text';
            timeSpan.textContent = `⏰ ${item.time || ''}`;
            details.appendChild(timeSpan);
            root.appendChild(details);
            const breakdown = document.createElement('div');
            breakdown.className = 'item-breakdown';
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
            const itemTime = document.createElement('span'); itemTime.className = 'item-time';
            itemTime.textContent = this.formatTime(item.timestamp);
            const actions = document.createElement('div'); actions.className = 'item-actions';
            const delBtn = document.createElement('button'); delBtn.className = 'btn-small delete'; delBtn.dataset.index = index; delBtn.textContent = '删除';
            const shareBtn = document.createElement('button'); shareBtn.className = 'btn-small share'; shareBtn.dataset.index = index; shareBtn.textContent = '分享';
            actions.appendChild(delBtn); actions.appendChild(shareBtn);
            footer.appendChild(itemTime); footer.appendChild(actions);
            root.appendChild(footer);
            return root;
        }
        // 绑定电脑端事件
        bindDesktopEvents() {
            // 清空按钮
            const desktopClearBtn = document.getElementById('desktopClearBtn');
            if (desktopClearBtn) {
                desktopClearBtn.addEventListener('click', () => {
                    this.clearAllHistory();
                });
            }
            // 关于按钮
            const desktopAboutBtn = document.getElementById('desktopAboutBtn');
            if (desktopAboutBtn) {
                desktopAboutBtn.addEventListener('click', () => {
                    window.open('about.html', '_blank');
                });
            }
            // 委托事件处理历史记录项
            const desktopHistoryList = document.getElementById('desktopHistoryList');
            if (desktopHistoryList) {
                desktopHistoryList.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete')) {
                        const index = parseInt(e.target.dataset.index);
                        this.deleteDesktopRecord(index);
                    } else if (e.target.classList.contains('share')) {
                        const index = parseInt(e.target.dataset.index);
                        this.shareDesktopRecord(index);
                    }
                });
            }
        }
        deleteDesktopRecord(index) {
            try {
                const history = JSON.parse(localStorage.getItem('calculationHistory') || '[]');
                history.splice(index, 1);
                localStorage.setItem('calculationHistory', JSON.stringify(history));
                this.loadDesktopHistory();
                this.showToast('删除成功', 'success');
            } catch (error) {
                console.error('删除失败:', error);
            }
        }
        async shareDesktopRecord(index) {
            try {
                const history = JSON.parse(localStorage.getItem('calculationHistory') || '[]');
                const item = history[index];
                // 使用共享的文本构建器，确保桌面/移动端一致
                const shareText = (window.ShareHelper && typeof window.ShareHelper.buildShareText === 'function')
                    ? window.ShareHelper.buildShareText(item)
                    : `3D打印成本分析：${item.remark || '未命名打印'}\n打印机：${item.printer}\n耗材：${item.filament || ''} ${item.weight || 0}g\n时间：${item.time}\n总成本：¥${(item.cost||0).toFixed(2)}\n材料：¥${((item.details&&item.details.materialCost)||0).toFixed(2)}\n电力：¥${((item.details&&item.details.electricityCost)||0).toFixed(2)}\n折旧：¥${((item.details&&item.details.depreciationCost)||0).toFixed(2)}`;
                await navigator.clipboard.writeText(shareText);
                this.showToast('已复制到剪贴板', 'success');
            } catch (error) {
                console.error('分享失败:', error);
                this.showToast('分享失败', 'error');
            }
        }
        clearAllHistory() {
            if (confirm('确定要清空所有历史记录吗？此操作不可撤销')) {
                localStorage.setItem('calculationHistory', '[]');
                this.loadDesktopHistory();
                this.showToast('已清空', 'success');
            }
        }
        // 工具方法
        formatTime(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            }
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) {
                return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `auto-toast ${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: ${type === 'error' ? '#ff4757' : '#07C160'}; color: white;
                padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
                z-index: 3000; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                opacity: 0; transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.style.opacity = '1', 10);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 2000);
        }
        escapeHtml(unsafe) {
            const s = unsafe == null ? '' : unsafe.toString();
            return s
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
        }
    }
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', () => {
        window.indexPage = new IndexPage();
    });
})();