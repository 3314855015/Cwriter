// 环境配置文件
// 在实际部署时，请将以下值替换为您的实际配置

export const ENV_CONFIG = {
  // Supabase配置
  SUPABASE_URL: process.env.VUE_APP_SUPABASE_URL || 'https://hcmlfiowydfffxfhsqgw.supabase.co',
  SUPABASE_ANON_KEY: process.env.VUE_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbWxmaW93eWRmZmZ4ZmhzcWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwODMwNzUsImV4cCI6MjA3ODY1OTA3NX0.t0bOTJPuZqE6xWqIMbTPBgKoCYwMn5csQ_Q2PwWyA8Q',
  
  // 应用配置
  APP_NAME: 'Cwriter',
  APP_VERSION: '1.0.0',
  
  // API配置
  API_TIMEOUT: 30000,
  
  // 功能开关
  FEATURES: {
    ENABLE_AI: true,
    ENABLE_REALTIME: true,
    ENABLE_OFFLINE: false
  }
}

// 开发环境配置
export const DEV_CONFIG = {
  DEBUG_MODE: true,
  LOG_LEVEL: 'debug',
  ENABLE_MOCK_DATA: false
}

// 生产环境配置
export const PROD_CONFIG = {
  DEBUG_MODE: false,
  LOG_LEVEL: 'error',
  ENABLE_MOCK_DATA: false
}

// 根据环境变量获取配置
export function getConfig() {
  const isDev = process.env.NODE_ENV === 'development'
  return {
    ...ENV_CONFIG,
    ...(isDev ? DEV_CONFIG : PROD_CONFIG)
  }
}

export default getConfig()