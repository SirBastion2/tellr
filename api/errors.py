"""CHANGE-002 rejected-command mapping: 409 {error:{code,message}}."""

from __future__ import annotations

from fastapi.responses import JSONResponse
from starlette.requests import Request

from engine import CommandRejected


def error_body(code: str, message: str) -> dict[str, dict[str, str]]:
    return {"error": {"code": code, "message": message}}


def rejected_response(_request: Request, exc: CommandRejected) -> JSONResponse:
    return JSONResponse(status_code=409, content=error_body(exc.code, exc.message))
