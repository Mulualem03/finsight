.PHONY: help up down logs build clean test lint backend-shell db-migrate db-seed

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  %-20s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

up: ## Start full stack (postgres, redis, backend, frontend)
	docker compose up --build

down: ## Stop stack
	docker compose down

logs: ## Tail backend logs
	docker compose logs -f backend

build: ## Build images
	docker compose build

clean: ## Stop and remove volumes
	docker compose down -v

test: ## Run all tests (backend + frontend)
	cd backend && npm test
	cd frontend && npm test

lint: ## Lint everything
	cd backend && npm run lint
	cd frontend && npm run lint

backend-shell: ## Open a shell inside the running backend container
	docker compose exec backend sh

db-migrate: ## Run pending Prisma migrations against the running DB
	docker compose exec backend npx prisma migrate deploy

db-seed: ## Run the seed script
	docker compose exec backend npm run db:seed
