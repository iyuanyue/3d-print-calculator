# 3D打印计算器

一款专业的3D打印成本计算工具，帮助您精确预估打印项目的各项成本。

![版本](https://img.shields.io/badge/版本-v1.2.4-009688)
![更新日期](https://img.shields.io/badge/更新-2025--11--22-blue)
## ✨ 主要功能

- 💰 **精确成本计算** - 材料成本、电力成本、设备折旧精确计算
- 📊 **历史记录管理** - 保存和管理所有计算记录
- ⚡ **实时计算** - 输入参数即时显示计算结果
- 🎯 **智能匹配** - 打印机型号、耗材类型自动匹配参数
- 📱 **响应式设计** - 完美支持电脑端和手机端使用
- 💾 **离线使用** - 支持离线访问，无需网络连接

## 🚀 快速开始

### 在线使用
直接访问：[https://3d.yy.wtf](https://3d.yy.wtf)

### 本地运行
```bash
# 克隆项目
git clone https://github.com/iyuanyue/3d-print-calculator.git

# 进入目录
cd 3d-print-calculator

# 直接在浏览器中打开 index.html 即可使用
```

## 📋 使用说明

1. **选择打印机型号** - 支持多种常见3D打印机，包含拓竹P2S等
2. **选择耗材类型** - PLA、PETG等多种材料预设
3. **输入打印参数** - 重量、时间、填充率等
4. **查看计算结果** - 实时显示各项成本明细
5. **保存记录** - 自动保存到历史记录中

## 🛠️ 技术特性

- 纯前端实现，无需后端服务
- 响应式设计，适配各种设备
- 本地存储，保护用户隐私
- 离线可用，Service Worker 缓存
- 轻量级，快速加载

## 📁 项目结构

```
3d-print-calculator/
├── index.html          # 主页面 - 成本计算
├── history.html        # 历史记录页面
├── about.html          # 关于页面
├── css/
│   ├── style.css       # 主样式文件
│   └── about.css       # 关于页面样式
├── js/
│   ├── main.js         # 主逻辑
│   ├── history.js      # 历史记录逻辑
│   └── about.js        # 关于页面逻辑
├── images/             # 图片资源
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── 社交媒体图标等
└── sw.js              # Service Worker (离线支持)
```

## 🔧 更新日志

### v1.2.4 (2025-11-22)
- 🎯 架构重构
- ✅ 电脑端优化
- ✅ 手机端优化
- ✅ 增加了开发者的社媒和捐赠入口
- ✅ 增加了感谢列表
- ✅ 现在可以记住上次的使用参数了
- ✅ 可自定义打印机及耗材型号
- ✅ 增加了颜色选项
- ✅ 修改非关键弹窗样式为自动隐藏
- ✅ 修复了一些问题
- ✅ 进行了一些技术改进

### v1.0.0 (2025-11-17)
- 🎉 首次发布
- ✅ 基础成本计算功能
- ✅ 打印机型号预设
- ✅ 耗材类型预设
- ✅ 历史记录功能

[查看完整更新日志](about.html)

## 🤝 支持开发者

如果这个工具对您有帮助，欢迎支持开发者的持续改进：

捐赠方式：

<div align="center">
微信捐赠
<img src="https://github.com/iyuanyue/3d-print-calculator/blob/main/images/wechat-qr.jpeg" alt="微信捐赠二维码" width="200">
支付宝捐赠
<img src="https://github.com/iyuanyue/3d-print-calculator/blob/main/images/alipay-qr.jpeg" alt="支付宝捐赠二维码" width="200"></div>
捐赠说明：

您将出现在感谢列表中，可提供您想显示的名称

如不想出现在感谢列表，请备注

您的支持是我持续改进的动力！ ❤️

## 👥 关注开发者

欢迎关注我的其他平台，获取更多有趣的项目和更新：

[![B站](https://img.shields.io/badge/B站-2313519-00A1D6?style=for-the-badge&logo=bilibili)](https://space.bilibili.com/2313519)
[![微博](https://img.shields.io/badge/微博-yuanyue1997-E6162D?style=for-the-badge&logo=sina-weibo)](https://weibo.com/yuanyue1997)
[![抖音](https://img.shields.io/badge/抖音-iyuanyue-000000?style=for-the-badge&logo=tiktok)](https://www.douyin.com/user/MS4wLjABAAAA84xrPW46XnJ3JwAj6TdzeYT6BKnazLDtSecPaR926ng)
[![GitHub](https://img.shields.io/badge/GitHub-iyuanyue-181717?style=for-the-badge&logo=github)](https://github.com/iyuanyue)

## 🐛 问题反馈

如果您在使用过程中遇到任何问题或有改进建议，请联系我们：

- **邮箱：** i@iyuanyue.com
- **版本：** v1.2.4

如果有需要添加的机型，也可以发送给我。最好带有参数，如机器名称、价格、功率、预期寿命、耗材名称、价格。

## 💝 特别感谢

感谢以下用户的支持和鼓励：

| 支持者 | 支持方式 | 感谢语 |
|--------|----------|--------|
| ❤️女朋友 | 拓竹P2SC一台 | 感谢小孙的支持，才有了这个计算器的诞生 |
| 刘先生 | P2S HULA脚垫 | 感谢老哥的支持和鼓励 |

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

**如果这个项目对您有帮助，请给个 ⭐️ 支持一下！**
