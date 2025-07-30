# ローカル開発環境のセットアップと起動手順

## 前提条件

- Node.js 18以上
- Docker Desktop
- Azure CLI（オプション）

## セットアップ手順

### 1. データベースの起動（Docker）

```bash
# PostgreSQLデータベースを起動
make db-up

# または直接docker-composeコマンドを使用
docker-compose up -d
```

データベースが起動したら、以下で確認できます：
- pgAdmin: http://localhost:5050
  - Email: admin@example.com
  - Password: admin

### 2. 環境変数の確認

`.env`ファイルが正しく設定されていることを確認してください。
最低限必要な設定：

```env
# Mapboxトークン（必須）
VITE_MAPBOX_TOKEN=pk.eyJ1Ijoic2FyaWF0b21vbmUyMyIsImEiOiJjbWRpdmJjOTMwZ2dkMm1vajU2dGdkeHJkIn0.5V_adK0JNltd0nBcISnQUw

# ローカルDB設定（Dockerを使用）
DB_HOST=localhost
DB_NAME=smart_building_planner
DB_USER=smart_building_user
DB_PASSWORD=smart_building_pass
DB_PORT=5432
```

### 3. フロントエンド開発サーバーの起動

```bash
# 依存関係のインストール（初回のみ）
npm install

# 開発サーバーの起動
npm run dev
```

アプリケーションは http://localhost:3000 でアクセスできます。

## 実行順序

1. **まずDockerでPostgreSQLを起動**
   ```bash
   make db-up
   ```
   これによりデータベースが起動し、初期データが投入されます。

2. **バックエンドAPIサーバーを起動**（新しいターミナルで）
   ```bash
   cd backend
   npm run dev
   ```
   バックエンドは http://localhost:8000 で起動します。

3. **フロントエンド開発サーバーを起動**（別のターミナルで）
   ```bash
   npm run dev
   ```
   フロントエンドは http://localhost:3000 で起動します。

## 機能の確認

### 基本機能（データベース不要）
- プロジェクト作成・編集
- 地図上での敷地選択
- 3Dビューでの建物表示
- 日影シミュレーション
- 見積もり計算（仮計算）

### バックエンドAPI機能
バックエンドAPIが起動していれば、以下の機能が利用可能です：
- プロジェクトの永続化（PostgreSQLに保存）
- 見積もり計算（Azure OpenAI統合）
- BIMファイル生成（Text2BIM連携）
- ユーザー認証（開発環境では固定ユーザー）

### APIエンドポイント
- `GET /api/health` - ヘルスチェック
- `GET /api/projects` - プロジェクト一覧
- `POST /api/projects` - プロジェクト作成
- `GET /api/projects/:id` - プロジェクト詳細
- `PUT /api/projects/:id` - プロジェクト更新
- `DELETE /api/projects/:id` - プロジェクト削除
- `POST /api/projects/:id/estimation` - 見積もり計算
- `GET /api/projects/:id/estimation` - 見積もり取得
- `POST /api/projects/:id/bim/generate` - BIM生成
- `GET /api/projects/:id/bim` - BIMファイル一覧

## トラブルシューティング

### ポート競合エラー
```bash
# PostgreSQLのポートを変更する場合
# .env.dockerファイルを編集
POSTGRES_PORT=5433

# .envファイルも同様に変更
DB_PORT=5433
```

### データベース接続エラー
```bash
# データベースの状態確認
docker-compose ps

# ログの確認
docker-compose logs postgres

# データベースのリセット
make db-reset
```

### Mapboxの地図が表示されない
- `.env`ファイルの`VITE_MAPBOX_TOKEN`が正しく設定されているか確認
- ブラウザのコンソールでエラーを確認

## 推奨される開発フロー

1. **Docker起動** → **npm run dev** → **ブラウザで確認**
2. 変更を加えたら、Viteのホットリロードで自動反映
3. データベーススキーマを変更した場合は、`make db-reset`でリセット

## 次のステップ

バックエンドAPIを実装する場合：
1. Express/FastifyでAPIサーバーを作成
2. TypeORMやPrismaでDB接続
3. Text2BIM統合用のPython APIラッパー作成