# 3D打印计算器

一款专业的3D打印成本计算工具，帮助您精确预估打印项目的各项成本。

![版本](https://img.shields.io/badge/版本-v1.3.0-009688)
![更新日期](https://img.shields.io/badge/更新-2026--11--17-blue)

## ✨ 主要功能

- 💰 **精确成本计算** - 材料成本、电力成本、设备折旧精确计算
- 📊 **历史记录管理** - 保存和管理所有计算记录
- ⚡ **实时计算** - 输入参数即时显示计算结果
- 🎯 **智能匹配** - 打印机型号、耗材类型自动匹配参数
- 📱 **响应式设计** - 完美支持电脑端和手机端使用
- 🌗 **深浅色主题** - 跟随系统自动切换，也可手动选择并记忆
- 💾 **离线使用** - 纯前端 + 本地存储，无需网络连接

## 🚀 快速开始

### 在线使用

直接访问：[https://3d.iyuanyue.com](https://3d.iyuanyue.com)

### 本地运行

```bash
# 克隆项目
git clone https://github.com/iyuanyue/3d-print-calculator.git

# 进入目录
cd 3d-print-calculator

# 方式一：直接在浏览器中打开 index.html
# 方式二：起一个本地静态服务（推荐，避免个别浏览器对 file:// 的限制）
python -m http.server 8000
# 然后访问 http://127.0.0.1:8000/
```

## 📋 使用说明

1. **选择打印机型号** - 支持多种常见3D打印机，包含拓竹P2S等
2. **选择耗材类型** - PLA、PETG等多种材料预设
3. **输入打印参数** - 重量、时间、填充率等
4. **查看计算结果** - 实时显示各项成本明细
5. **保存记录** - 自动保存到历史记录中

## 🎨 界面与主题

- 统一的浅色 / 深色设计系统（CSS 变量驱动，见 `css/theme.css`）
- 主题按钮三态循环：**跟随系统 → 浅色 → 深色**，选择结果保存在 `localStorage`（键名 `3dpc-theme`）
- 首次访问默认跟随系统；可用 `?theme=light` / `?theme=dark` 临时预览（不写入记忆）
- 桌面端（≥900px）为双栏应用布局，左侧表单、右侧历史记录；手机端为单栏 + 底部标签栏

## 🛠️ 技术特性

- 纯前端实现，无需后端服务
- 响应式设计，适配各种设备
- 本地存储，保护用户隐私
- 轻量级静态资源，无构建步骤

## 📁 项目结构

```
3d-print-calculator/
├── index.html          # 主页面 - 成本计算
├── history.html        # 历史记录页面
├── about.html          # 关于页面
├── 404.html            # 自定义 404 页面
├── CNAME               # GitHub Pages 自定义域名（3d.iyuanyue.com）
├── robots.txt          # 搜索引擎抓取规则
├── sitemap.xml         # 站点地图
├── css/
│   ├── theme.css       # 设计令牌与共享组件（含深浅色主题）
│   ├── style.css       # 布局骨架
│   ├── index.css       # 首页样式
│   ├── history.css     # 历史记录页样式
│   └── about.css       # 关于页样式
├── js/
│   ├── theme.js        # 主题切换
│   ├── config.js       # 打印机 / 耗材预设数据
│   ├── calculator.js   # 成本计算逻辑
│   ├── share.js        # 分享文案生成
│   ├── index.js        # 首页交互
│   ├── history.js      # 历史记录交互
│   └── about.js        # 关于页交互
├── images/             # 图标、二维码等图片资源
└── .github/workflows/static.yml  # GitHub Pages 自动部署
```

## 🌐 部署与域名

- 托管：GitHub Pages（`main` 分支推送后由 Actions 自动构建部署）
- 域名：`3d.iyuanyue.com`（Cloudflare 托管 DNS）
- 仓库根目录的 `CNAME` 文件即为 GitHub Pages 的自定义域名，请勿删除或改名

## 🔧 更新日志

### v1.3.0 (2026-11-17)
- 🎨 全新视觉改版：统一配色、圆角与层次
- 🌗 新增深色 / 浅色主题，可跟随系统或手动切换
- 📐 重新设计的桌面双栏布局，结果与历史记录常驻可见
- ✨ 更细腻的动效、焦点样式与移动端安全区适配
- 🔗 站点迁移至新域名 `3d.iyuanyue.com`

### v1.2.5 (2025-11-23)
- 📥 更新了一大波预设数据（价格、功耗等）
- ✅ 主页可显示当前版本

### v1.2.4 (2025-11-22)
- 🎯 架构重构
- ✅ 电脑端 / 手机端优化
- ✅ 增加了开发者的社媒和捐赠入口
- ✅ 增加了感谢列表
- ✅ 现在可以记住上次的使用参数了
- ✅ 可自定义打印机及耗材型号
- ✅ 增加了颜色选项
- ✅ 修改非关键弹窗样式为自动隐藏

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
- **版本：** v1.3.0

如果有需要添加的机型，也可以发送给我。最好带有参数，如机器名称、价格、功率、预期寿命、耗材名称、价格。

## 💝 特别感谢

感谢以下用户的支持和鼓励：

| 支持者 | 支持方式 | 感谢语 |
|--------|----------|--------|
| ❤️女朋友 | 拓竹P2SC一台 | 感谢小孙的支持，才有了这个计算器的诞生 |
| 刘先生 | P2S HULA脚垫 | 感谢老哥的支持和鼓励 |

## 📄 许可证

本项目采用 MIT 许可证。

---

**如果这个项目对您有帮助，请给个 ⭐️ 支持一下！**
