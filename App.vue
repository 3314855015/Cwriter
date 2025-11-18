<script>
export default {
	globalData: {
		user: null,
		isAuthenticated: false,
		theme: 'dark' // 默认主题
	},
	onLaunch: async function() {
		console.log('App Launch')
		// 初始化主题
		this.initTheme()
		// 初始化默认用户（离线模式）
		this.initDefaultUser()
		// 直接跳转到首页
		uni.switchTab({
			url: '/pages/index/index'
		})
	},
	onShow: function() {
		console.log('App Show')
	},
	onHide: function() {
		console.log('App Hide')
	},
	methods: {
		initDefaultUser() {
			try {
				// 创建默认用户
				const defaultUser = {
					id: 'default_user',
					username: '离线用户',
					email: ''
				}
				getApp().globalData.user = defaultUser
				getApp().globalData.isAuthenticated = true
				
				// 初始化用户存储（使用uni-app方式）
				try {
					const userData = {
						id: defaultUser.id,
						username: defaultUser.username,
						createdAt: new Date().toISOString()
					}
					uni.setStorageSync('user_profile', userData)
					uni.setStorageSync('current_user_id', defaultUser.id)
				} catch (storageError) {
					console.error('初始化用户存储失败:', storageError)
				}
			} catch (error) {
				console.error('初始化默认用户失败:', error)
			}
		},
		initTheme() {
			// 从本地存储获取主题设置
			try {
				const theme = uni.getStorageSync('theme')
				if (theme) {
					getApp().globalData.theme = theme
				}
			} catch (error) {
				console.error('获取主题设置失败:', error)
			}
		}
	}
}
</script>

<style>
	/*每个页面公共css */
	
	/* 简单图标系统 - 直接在页面中使用Unicode字符 */
	.iconfont {
		display: inline-block;
		font-size: 16px;
		line-height: 1;
		text-align: center;
		color: inherit;
	}
	
	/* 底部导航栏图标特殊处理 */
	.bottom-nav .iconfont {
		font-size: 20px;
		margin-bottom: 2px;
	}
	
	/* 状态栏图标特殊处理 */
	.status-icons .iconfont {
		font-size: 12px;
	}
	
	/* 确保图标容器正确显示 */
	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 24px;
		margin-bottom: 4px;
	}
	
	/* 用户头像图标 */
	.user-avatar .iconfont {
		font-size: 18px;
		color: white;
	}
	
	/* 通知按钮图标 */
	.notification-btn .iconfont {
		font-size: 24px;
		color: #B3B3B3;
	}
	
	/* 悬浮按钮图标 */
	.fab-menu-item .iconfont {
		font-size: 18px;
		color: white;
	}
	
	.fab-main .iconfont {
		font-size: 20px;
		color: white;
	}
</style>
