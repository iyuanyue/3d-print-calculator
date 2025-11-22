const Calculator = {
    // 计算总小时数
    calculateTotalHours(hours, minutes) {
        const h = parseFloat(hours) || 0;
        const m = parseFloat(minutes) || 0;
        return h + (m / 60);
    },
    // 计算材料成本
    calculateMaterialCost(weight, price) {
        const w = parseFloat(weight) || 0;
        const p = parseFloat(price) || 0;
        return (w / 1000) * p;
    },
    // 计算电力成本
    calculateElectricityCost(power, totalHours, rate) {
        const p = parseFloat(power) || 0;
        const r = parseFloat(rate) || 0;
        return (p / 1000) * totalHours * r;
    },
    // 计算设备折旧
    calculateDepreciationCost(totalHours, printerCost, printerLifespan) {
        const cost = parseFloat(printerCost) || 0;
        const lifespan = parseFloat(printerLifespan) || 1;
        return lifespan > 0 ? (totalHours / lifespan) * cost : 0;
    },
    // 计算所有成本
    calculateAllCosts(params) {
        // 解析并缓存数字值，避免重复 parseFloat
        const printHours = Number(params.printHours) || 0;
        const printMinutes = Number(params.printMinutes) || 0;
        const totalHours = printHours + (printMinutes / 60);
        const filamentWeight = Number(params.filamentWeight) || 0;
        const filamentPrice = Number(params.filamentPrice) || 0;
        const materialCost = (filamentWeight / 1000) * filamentPrice;
        const printerPower = Number(params.printerPower) || 0;
        const electricityRate = Number(params.electricityRate) || 0;
        const electricityCost = (printerPower / 1000) * totalHours * electricityRate;
        const printerCost = Number(params.printerCost) || 0;
        const printerLifespan = Number(params.printerLifespan) || 1;
        const depreciationCost = printerLifespan > 0 ? (totalHours / printerLifespan) * printerCost : 0;
        const totalCost = materialCost + electricityCost + depreciationCost;
        return {
            materialCost: Math.max(0, materialCost),
            electricityCost: Math.max(0, electricityCost),
            depreciationCost: Math.max(0, depreciationCost),
            totalCost: Math.max(0, totalCost),
            totalHours: totalHours
        };
    }
};
// 浏览器环境导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
} else {
    // 全局变量用于浏览器
    window.Calculator = Calculator;
}