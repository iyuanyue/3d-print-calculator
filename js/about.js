class AboutPage {
    constructor() {
        this.init();
        this.bindEvents();
    }
    init() {
        console.log('关于页面加载');
    }
    // 绑定事件
    bindEvents() {
        document.getElementById('emailItem').addEventListener('click', () => {
            this.onCopyEmail();
        });
    }
    // 复制邮箱地址
    async onCopyEmail() {
        const email = 'i@iyuanyue.com';
        const emailItem = document.getElementById('emailItem');
        const copyHint = document.getElementById('copyHint');
        try {
            await navigator.clipboard.writeText(email);
            console.log('复制成功:', email);
            // 显示复制成功状态
            this.showCopySuccess(emailItem, copyHint);
            this.showAutoHideToast('邮箱已复制到剪贴板', 'success');
        } catch (err) {
            console.error('复制失败:', err);
            this.fallbackCopy(email, emailItem, copyHint);
        }
    }
    // 显示复制成功状态
    showCopySuccess(emailItem, copyHint) {
        emailItem.classList.add('copy-success');
        copyHint.textContent = '已复制';
        // 3秒后恢复原状
        setTimeout(() => {
            emailItem.classList.remove('copy-success');
            copyHint.textContent = '点击复制';
        }, 3000);
    }
    // 备用复制方案
    fallbackCopy(text, emailItem, copyHint) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                this.showCopySuccess(emailItem, copyHint);
                this.showAutoHideToast('邮箱已复制到剪贴板', 'success');
            }
        } catch (error) {
            console.error('备用复制方案失败:', error);
            prompt('请手动复制以下邮箱地址：', text);
        }
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
}
// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new AboutPage();
});