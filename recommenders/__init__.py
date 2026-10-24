"""Recommenders (architecture §7.4, §8). The engine never imports this package."""

from __future__ import annotations

from recommenders.base import Recommendation, Recommender, RulesRecommender
from recommenders.fake import FakeRecommender
from recommenders.hosted_llm import HostedLLM
from recommenders.local_llm import LocalLLM
from recommenders.metrics import Metrics
from recommenders.select import select_question

DEFAULT_MODEL_ID = "Meta-Llama-3.1-8B-Instruct-Q4_K_M"
FALLBACK_MODEL_ID = "Llama-3.2-3B-Instruct-Q4_K_M"

__all__ = [
    "DEFAULT_MODEL_ID",
    "FALLBACK_MODEL_ID",
    "FakeRecommender",
    "HostedLLM",
    "LocalLLM",
    "Metrics",
    "Recommendation",
    "Recommender",
    "RulesRecommender",
    "select_question",
]
