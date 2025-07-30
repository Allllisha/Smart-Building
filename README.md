# スマート・ビルディング・プランナー

建築プロジェクトの見積もりとシミュレーションを行うWebアプリケーション

## 機能

- **プロジェクト管理**: 建築プロジェクトの作成・編集・管理
- **地図インターフェース**: Mapboxを使用した敷地位置の選択
- **3Dシミュレーション**: Three.jsによる建物の3D表示と日影シミュレーション
- **見積もり計算**: AIによる建築コストと運用コストの自動算出
- **法規制チェック**: 日影規制などの建築基準法への適合性確認

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
```bash
cp .env.example .env
```

`.env`ファイルを編集し、必要なAPIキーを設定してください：
- `VITE_MAPBOX_TOKEN`: Mapboxのアクセストークン

3. 開発サーバーの起動
```bash
npm run dev
```

## 技術スタック

- **フロントエンド**: React + TypeScript
- **3D表示**: Three.js + web-ifc-three
- **地図**: Mapbox GL JS
- **UIライブラリ**: Material-UI
- **状態管理**: Zustand
- **ビルドツール**: Vite

## プロジェクト構造

```
src/
├── components/      # 再利用可能なコンポーネント
├── pages/          # ページコンポーネント
├── services/       # APIサービス
├── store/          # 状態管理
├── types/          # TypeScript型定義
└── utils/          # ユーティリティ関数
```

## Text2BIMとの連携

Text2BIMのPython APIと連携して、自然言語からBIMファイルを生成する機能を実装予定です。