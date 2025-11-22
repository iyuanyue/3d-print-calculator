const config = {
    version: "1.2.1",
    lastUpdated: "2025-11-22",
    // 默认配置
    defaults: {
        electricityRate: 0.6,
        defaultPrinter: "拓竹P2S",
        defaultFilament: "PETG"
    },
    // 打印机配置
    printers: [
        {
            id: 1,
            name: "拓竹P1S",
            power: 140,
            cost: 3999,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },
        {
            id: 2,
            name: "拓竹P2S",
            power: 145,
            cost: 3650.4,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },
    ],
    // 耗材配置
    filaments: [
        { id: 1, name: "PLA", price: 39.43, type: "standard", color: "#4CAF50" },
        { id: 2, name: "PETG", price: 39.5, type: "engineering", color: "#2196F3" },
        { id: 3, name: "ABS", price: 69, type: "engineering", color: "#FF9800" },
        { id: 4, name: "TPU", price: 146, type: "flexible", color: "#9C27B0" },
        { id: 5, name: "PC", price: 203, type: "engineering", color: "#303F9F" },
    ],
    // 电价配置（不同地区）
    electricityRates: [
        { region: "北京", rate: 0.6 },
        { region: "上海", rate: 0.68 },
        { region: "广州", rate: 0.62 },
        { region: "深圳", rate: 0.70 },
        { region: "杭州", rate: 0.63 }
    ]
};
// 用于浏览器环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    // 全局变量用于浏览器
    window.config = config;
}