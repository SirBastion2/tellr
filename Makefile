.PHONY: dev-api test gate

API_HOST ?= 127.0.0.1
API_PORT ?= 8000
API_TMUX ?= teller-api
export PYTHONPATH := $(CURDIR)

dev-api:
	@command -v tmux >/dev/null 2>&1 || { echo "tmux is required for make dev-api (WORKFLOW §2.4)"; exit 1; }
	@if tmux has-session -t $(API_TMUX) 2>/dev/null; then \
		echo "tmux session $(API_TMUX) already running"; \
	else \
		tmux new-session -d -s $(API_TMUX) "python3 -m uvicorn api.main:app --host $(API_HOST) --port $(API_PORT)"; \
		echo "started uvicorn in tmux session $(API_TMUX) on $(API_HOST):$(API_PORT)"; \
	fi

test:
	python3 -m pytest -q

gate:
	./scripts/gate.sh a
