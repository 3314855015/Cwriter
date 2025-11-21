// 环境辅助工具 - 帮助开发者了解当前环境

export class EnvironmentHelper {
  static getEnvironment() {
    // 检测当前环境
    let env = 'UNKNOWN'
    
    // #ifdef H5
    env = 'H5'
    // #endif
    
    // #ifdef APP-PLUS
    env = 'APP'
    // #endif
    
    // #ifdef MP-WEIXIN
    env = 'MP-WEIXIN'
    // #endif
    
    return env
  }
  
  static getStorageType() {
    const env = this.getEnvironment()
    const storage = env === 'H5' ? 'localStorage' : 'FileSystem'
    
    return {
      environment: env,
      storageType: storage,
      description: `${env} 环境，使用 ${storage} 存储`
    }
  }
  
  static showEnvironmentInfo() {
    const info = this.getStorageType()
    
     
     
     
     
     
     
    
    if (info.environment === 'H5') {
       
       
    } else if (info.environment === 'APP') {
       
       
    }
    
     
    
    return info
  }
  
  static getTestingGuide() {
    const env = this.getEnvironment()
    
    const guides = {
      'H5': {
        '阶段': '界面开发和业务逻辑',
        '测试范围': ['UI 交互', '表单验证', '数据流', '路由跳转'],
        '限制': ['文件系统API', '原生功能', '设备API'],
        '下一步': '使用 HBuilderX 真机调试'
      },
      'APP': {
        '阶段': '完整功能测试',
        '测试范围': ['所有功能', '性能测试', '用户体验'],
        '优势': ['真实文件系统', '原生API支持', '完整功能'],
        '测试重点': ['存储功能', '性能优化', '错误处理']
      }
    }
    
    return guides[env] || guides['H5']
  }
  
  static logPerformanceMetrics() {
    if (typeof performance !== 'undefined') {
      const perf = performance.timing
      if (perf) {
        const loadTime = perf.loadEventEnd - perf.navigationStart
         
      }
    }
    
    // 检测设备信息
    if (typeof uni !== 'undefined') {
      try {
        const systemInfo = uni.getSystemInfoSync()
      } catch (error) {
      }
    }
  }
}

// 在应用启动时显示环境信息
export function initEnvironmentHelper() {
  const info = EnvironmentHelper.showEnvironmentInfo()
  EnvironmentHelper.logPerformanceMetrics()
  
  return info
}

// 导出便捷方法
export const showEnvInfo = () => EnvironmentHelper.showEnvironmentInfo()
export const getEnvGuide = () => EnvironmentHelper.getTestingGuide()

// 默认导出
export default EnvironmentHelper