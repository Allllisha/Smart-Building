// 認証ヘルパー（本番環境用の一時的な解決策）

export const initializeAuth = () => {
  // 本番環境では一時的に固定トークンを使用
  // TODO: Azure AD認証フローを実装
  if (!localStorage.getItem('authToken')) {
    // 開発用の固定トークン（バックエンドで検証される）
    localStorage.setItem('authToken', 'development-token-for-production-testing')
  }
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken')
}

export const clearAuthToken = () => {
  localStorage.removeItem('authToken')
}