# スマート・ビルディング・プランナー Makefile

.PHONY: help
help: ## ヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: setup
setup: ## 初期セットアップ
	npm install
	cp .env.example .env
	@echo "Please edit .env file with your API keys"

.PHONY: dev
dev: ## 開発サーバーを起動
	npm run dev

.PHONY: build
build: ## プロダクションビルド
	npm run build

.PHONY: up
up: ## すべてのサービスを起動（DB、バックエンド、フロントエンド）
	docker-compose up -d

.PHONY: down
down: ## すべてのサービスを停止
	docker-compose down

.PHONY: logs
logs: ## すべてのログを表示
	docker-compose logs -f

.PHONY: db-up
db-up: ## PostgreSQLデータベースのみを起動
	docker-compose up -d postgres pgadmin

.PHONY: db-down
db-down: ## PostgreSQLデータベースを停止
	docker-compose down

.PHONY: db-reset
db-reset: ## データベースをリセット
	docker-compose down -v
	docker-compose up -d postgres pgadmin

.PHONY: backend-logs
backend-logs: ## バックエンドのログを表示
	docker-compose logs -f backend

.PHONY: frontend-logs
frontend-logs: ## フロントエンドのログを表示
	docker-compose logs -f frontend

.PHONY: restart
restart: ## すべてのサービスを再起動
	docker-compose restart

.PHONY: rebuild
rebuild: ## イメージを再ビルドして起動
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

.PHONY: db-logs
db-logs: ## データベースのログを表示
	docker-compose logs -f postgres

.PHONY: db-shell
db-shell: ## PostgreSQLシェルに接続
	docker-compose exec postgres psql -U smart_building_user -d smart_building_planner

.PHONY: pgadmin
pgadmin: ## pgAdminを開く
	open http://localhost:5050

.PHONY: clean
clean: ## ビルド成果物をクリーン
	rm -rf dist node_modules

.PHONY: install
install: ## 依存関係を再インストール
	rm -rf node_modules package-lock.json
	npm install