# Docker環境でのセットアップ

## 概要

Docker Composeを使用して、フロントエンド、バックエンド、データベースをすべて一括で起動できます。

## 前提条件

- Docker Desktop がインストールされていること
- `.env` ファイルに必要な環境変数が設定されていること

## クイックスタート

### 1. すべてのサービスを起動

```bash
# すべてのサービス（DB、バックエンド、フロントエンド）を起動
make up

# または
docker-compose up -d
```

### 2. アプリケーションにアクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **pgAdmin**: http://localhost:5050
  - Email: admin@example.com
  - Password: admin

### 3. ログの確認

```bash
# すべてのログを表示
make logs

# 個別のサービスのログ
make backend-logs    # バックエンドのログ
make frontend-logs   # フロントエンドのログ
make db-logs        # データベースのログ
```

### 4. サービスの停止

```bash
make down
```

## 便利なコマンド

### 再起動
```bash
# すべてのサービスを再起動
make restart
```

### 再ビルド
```bash
# コードを変更した場合、イメージを再ビルド
make rebuild
```

### データベースのみ操作
```bash
# DBのみ起動
make db-up

# DBリセット（データを削除して再作成）
make db-reset
```

## Docker Compose構成

### 開発環境（デフォルト）

`docker-compose.yml` には以下のサービスが含まれています：

1. **postgres**: PostgreSQL 16 + PostGIS
   - ポート: 5432
   - 初期データ付き

2. **backend**: Node.js + Express + TypeScript
   - ポート: 8000
   - ホットリロード対応（nodemon）
   - ソースコードはボリュームマウント

3. **frontend**: React + TypeScript + Vite
   - ポート: 3000
   - ホットリロード対応
   - ソースコードはボリュームマウント

4. **pgadmin**: データベース管理ツール
   - ポート: 5050

### 本番環境

本番環境用の設定も用意されています：

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## トラブルシューティング

### ポート競合エラー

既に使用中のポートがある場合は、`.env.docker` で変更できます：

```env
# ポート番号を変更
API_PORT=8001
POSTGRES_PORT=5433
PGADMIN_PORT=5051
```

### ビルドエラー

node_modules の競合が発生した場合：

```bash
# ボリュームをクリーンアップ
docker-compose down -v
docker-compose up -d --build
```

### 接続エラー

バックエンドがデータベースに接続できない場合：

1. PostgreSQLが完全に起動しているか確認
2. ヘルスチェックの状態を確認：
   ```bash
   docker-compose ps
   ```

### 環境変数が反映されない

`.env` ファイルの変更後は、コンテナを再起動してください：

```bash
docker-compose restart
```

## 開発フロー

1. **コード変更**: ソースコードを編集
2. **自動反映**: ホットリロードにより自動的に反映
3. **API変更時**: バックエンドが自動的に再起動
4. **DB変更時**: マイグレーションスクリプトを実行

## パフォーマンス最適化

### ボリュームマウントの最適化

Dockerのファイル同期が遅い場合は、以下の設定を `.docker/config.json` に追加：

```json
{
  "features": {
    "buildkit": true
  }
}
```

### メモリ設定

Docker Desktopの設定で、十分なメモリを割り当ててください（推奨: 4GB以上）。