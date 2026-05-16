/**
 * 不需要 Token 验证的公共路由列表
 * 配置为 path 前缀 (Prefix Match)
 * 
 * 注意：Better Auth 的路由 (/api/auth/*) 通常由其内部自行处理权限，
 * 但为了避免被全局中间件误杀，建议将其加入白名单，或在中间件中特殊处理。
 */
export const publicRoutes: string[] = [
  '/api/_nuxt_icon',   // Nuxt Icon
  '/api/auth',         // Better Auth 所有路由 (让 Better Auth 自己处理)
  '/api/health',       // 健康检查
  '/api/public',       // 示例公共路由前缀
  '/api/oauth2/token', // 扩展换票与刷新
  '/api/oauth2/authorize', // 获取登录跳转地址，不需要登录态
  //'/api/urls',         // 测试中: 放行所有 /api/urls 开头的请求
];