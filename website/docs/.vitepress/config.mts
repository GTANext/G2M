import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: "G2M",
  description: "可视化管理III.VC.SA的MOD",
  head: [
    [
      'link', { rel: 'icon', href: '/assets/logo.svg' } // 站点图标
    ],
  ],
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    
    // Logo
    logo: '/assets/logo.svg',
    
    // 启用搜索
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索',
          },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '重置搜索',
            footer: {
              selectText: '选择',
              navigateText: '导航',
              closeText: '关闭',
            },
          },
        }
      }
    },
    
    // 顶部栏
    nav: [
      { text: "首页", link: "/" },
      { text: "哔哩哔哩", link: "https://space.bilibili.com/435502585" }
    ],

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/YuiNijika/TTDF' }
    ],

    // 页脚
    footer: {
      copyright: `Copyright © 2024-${new Date().getFullYear()} <a href="https://github.com/YuiNijika">鼠子(YuiNijika)</a> and <a href="https://www.gtamodx.com/">GTAMODX</a>。`,
    },

    // 编辑链接
    editLink: {
      pattern: ({ filePath }) => {
        if (filePath.startsWith('packages/')) {
          return `https://github.com/YuiNijika/TTDF-Docs/edit/main/${filePath}`
        } else {
          return `https://github.com/YuiNijika/TTDF-Docs/edit/main/docs/${filePath}`
        }
      },
      text: '在 GitHub 上编辑此页面',
    },

    // 翻译
    // 文章翻页
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    // 外观
    darkModeSwitchLabel: '外观',

    // 当前页面
    outline: {
      label: '当前页面',
    },

    // 返回顶部
    returnToTopLabel: '返回顶部',

    // menu
    sidebarMenuLabel: '菜单',

    // 搜索

    // 404
    notFound: {
      title: '页面未找到',
      quote: 'HTTP 404 - Page Not Found',
      linkText: '返回首页'
    }

  },
  
  ignoreDeadLinks: [
    '/develop/elements'
  ]
})