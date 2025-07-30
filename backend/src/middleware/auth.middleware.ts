import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware'

// 簡易認証ミドルウェア（開発用）
// 本番環境ではAzure ADトークン検証を実装
export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
  }
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    // 開発環境では固定ユーザーを使用
    if (process.env.NODE_ENV === 'development') {
      req.user = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'test@example.com',
        name: 'テストユーザー',
      }
      return next()
    }

    // 本番環境ではAuthorizationヘッダーを検証
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required')
    }

    // TODO: Azure ADトークン検証を実装
    // const token = authHeader.substring(7)
    
    // 仮実装
    req.user = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'test@example.com',
      name: 'テストユーザー',
    }

    next()
  } catch (error) {
    next(error)
  }
}