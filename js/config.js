const config = {
    version: "1.2.5",
    lastUpdated: "2025-11-23",
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
            power: 200,
            cost: 5199,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },       
        {
            id: 3,
            name: "拓竹X1",
            power: 150,
            cost: 9499,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },
        {
            id: 4,
            name: "拓竹A1 mini",
            power: 80,
            cost: 2799,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },
        {
            id: 5,
            name: "拓竹A1",
            power: 200,
            cost: 3399,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },
        {
            id: 6,
            name: "拓竹H2S",
            power: 200,
            cost: 7999,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },
        {
            id: 7,
            name: "拓竹H2C",
            power: 205,
            cost: 14999,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },
        {
            id: 8,
            name: "拓竹H2D",
            power: 197,
            cost: 14999,
            lifespan: 20000,
            brand: "Bambu Lab",
            type: "FDM"
        },
    ],
    // 耗材配置
    filaments: [
        { id: 1, name: "PLA", price: 69, type: "standard", color: "#4CAF50" },
        { id: 2, name: "PETG", price: 89, type: "engineering", color: "#2196F3" },
        { id: 3, name: "ABS", price: 69, type: "engineering", color: "#FF9800" },
        { id: 4, name: "TPU", price: 146, type: "flexible", color: "#9C27B0" },
        { id: 5, name: "PC", price: 203, type: "engineering", color: "#303F9F" },
        { id: 6, name: "ASA", price: 99, type: "engineering", color: "#303F9F" },

    ]
};
// 用于浏览器环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    // 全局变量用于浏览器
    window.config = config;
}
