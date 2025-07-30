# バックエンド用Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# TypeScriptのグローバルインストール
RUN npm install -g typescript

# 依存関係ファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# 本番用イメージ
FROM node:20-alpine

WORKDIR /app

# ビルド成果物と必要なファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 本番用依存関係のみインストール
RUN npm ci --production

# ポート公開
EXPOSE 8000

# サーバー起動
CMD ["node", "dist/server.js"]