import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.name,
        message: err.message,
      },
    })
  }

  console.error('Unexpected error:', err)
  
  // 開発環境またはAzure環境では詳細なエラーメッセージを返す
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production'
  
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment ? err.message : 'An unexpected error occurred',
      stack: isDevelopment ? err.stack : undefined,
    },
  })
}