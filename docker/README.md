# Docker PostgreSQL セットアップ

## 概要

スマート・ビルディング・プランナーのローカル開発環境用PostgreSQLデータベースです。
本番環境への移行を考慮し、Azure Database for PostgreSQLと互換性のある設定になっています。

## 含まれるサービス

1. **PostgreSQL 16** - メインデータベース
   - PostGIS拡張機能付き（地理空間データの処理用）
   - UUID拡張機能付き

2. **pgAdmin 4** - データベース管理ツール
   - ブラウザからアクセス可能
   - http://localhost:5050

## セットアップ手順

### 1. 初回起動

```bash
# プロジェクトルートで実行
docker-compose up -d
```

### 2. データベースの確認

pgAdminにアクセス:
- URL: http://localhost:5050
- Email: admin@example.com
- Password: admin

サーバー接続情報:
- Host: postgres (Docker内部ネットワーク名)
- Port: 5432
- Database: smart_building_planner
- Username: smart_building_user
- Password: smart_building_pass

### 3. 停止

```bash
docker-compose down
```

### 4. データを含めて完全に削除

```bash
docker-compose down -v
```

## データベース構造

### 主要テーブル

- **users** - ユーザー情報
- **projects** - プロジェクト基本情報
- **shadow_regulations** - 日影規制情報
- **floor_area_details** - 階別面積詳細
- **unit_types** - 住戸タイプ（共同住宅用）
- **parking_plans** - 駐車場・緑地計画
- **estimations** - 見積もり結果
- **simulations** - シミュレーション結果
- **bim_files** - BIMファイル管理

### 特徴

- PostGIS対応で地理空間データの処理が可能
- UUID主キーによるグローバルユニークID
- タイムスタンプの自動更新トリガー
- 適切なインデックスによるクエリ最適化

## 環境変数

`.env.docker`ファイルで設定を変更できます：

```env
POSTGRES_USER=smart_building_user
POSTGRES_PASSWORD=smart_building_pass
POSTGRES_DB=smart_building_planner
POSTGRES_PORT=5432
```

## Azure移行時の注意点

1. PostGISは Azure Database for PostgreSQL でもサポートされています
2. スキーマはそのまま使用可能です
3. 接続文字列を変更するだけで移行できます

## トラブルシューティング

### ポート競合

既に5432ポートが使用されている場合は、`.env.docker`でポートを変更してください：

```env
POSTGRES_PORT=5433
```

### 初期化スクリプトが実行されない

データボリュームを削除してから再起動してください：

```bash
docker-compose down -v
docker-compose up -d
```