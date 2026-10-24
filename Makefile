.PHONY: dev-api dev-web test gate

API_HOST ?= 127.0.0.1
API_PORT ?= 8000
API_TMUX ?= teller-api
WEB_TMUX ?= teller-web
export PYTHONPATH := $(CURDIR)

dev-api:
	@command -v tmux >/dev/null 2>&1 || { echo "tmux is required for make dev-api (WORKFLOW §2.4)"; exit 1; }
	@if tmux has-session -t $(API_TMUX) 2>/dev/null; then \
		echo "tmux session $(API_TMUX) already running"; \
	else \
		tmux new-session -d -s $(API_TMUX) "python3 -m uvicorn api.main:app --host $(API_HOST) --port $(API_PORT)"; \
		echo "started uvicorn in tmux session $(API_TMUX) on $(API_HOST):$(API_PORT)"; \
	fi

# Vite on 127.0.0.1:5173; mock is middleware; VITE_API_URL overrides the API base.
dev-web:
	@command -v tmux >/dev/null 2>&1 || { echo "tmux is required for make dev-web (WORKFLOW §2.4)"; exit 1; }
	@if tmux has-session -t $(WEB_TMUX) 2>/dev/null; then \
		echo "tmux session $(WEB_TMUX) already running"; \
	else \
		tmux new-session -d -s $(WEB_TMUX) -c $(CURDIR)/web "npm run dev"; \
		echo "started Vite in tmux session $(WEB_TMUX) on 127.0.0.1:5173"; \
	fi

test:
	python3 -m pytest -q

gate:
	./scripts/gate.sh a
