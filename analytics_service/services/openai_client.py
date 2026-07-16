import json
import logging
import time
from datetime import datetime, timezone

import bleach
from openai import AsyncOpenAI, APITimeoutError, APIError

from config import settings
from models.schemas import NLQueryResponse

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_BASE_URL,
    timeout=10.0,
)


class OpenAIServiceError(Exception):
    pass


async def generate_insight(context: dict, prompt_template: str) -> str:
    """
    Generate a natural-language insight by formatting prompt_template with context
    and calling the OpenAI Chat Completions API.

    Raises OpenAIServiceError on any failure or timeout.
    """
    try:
        prompt = prompt_template.format(**context)
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a business analytics assistant. Provide concise, actionable insights.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            top_p=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except APITimeoutError as exc:
        raise OpenAIServiceError("OpenAI request timed out after 10 seconds") from exc
    except APIError as exc:
        raise OpenAIServiceError(f"OpenAI API error: {exc}") from exc
    except Exception as exc:
        raise OpenAIServiceError(f"Unexpected error calling OpenAI: {exc}") from exc


async def answer_nl_query(
    question: str, data_summary: dict, branch_id: str
) -> NLQueryResponse:
    """
    Sanitize the question, build a structured prompt, call OpenAI, and return
    a NLQueryResponse. Logs question text, branch_id, latency, and outcome.

    Raises OpenAIServiceError on any failure or timeout.
    """
    # 1. Sanitize and truncate
    sanitized_question = bleach.clean(question)[:500]

    # 2. Build structured prompt
    prompt = (
        f"You are a business analytics assistant for a retail POS system.\n\n"
        f"The user is asking about branch: {branch_id}\n\n"
        f"Available data summary:\n{json.dumps(data_summary, indent=2)}\n\n"
        f"User question: {sanitized_question}\n\n"
        f"Respond ONLY with valid JSON in this exact format:\n"
        f'{{"answer": "...", "query_interpreted": "...", "chart_data": null}}'
    )

    start_ms = time.monotonic() * 1000
    success = False

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a business analytics assistant. Always respond with valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            top_p=0.7,
            max_tokens=1024,
        )

        raw_content = response.choices[0].message.content
        latency_ms = time.monotonic() * 1000 - start_ms

        # 4. Parse JSON response
        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError as exc:
            raise OpenAIServiceError(
                f"OpenAI returned non-JSON response: {exc}"
            ) from exc

        success = True

        # 5. Log success (no full response body)
        logger.info(
            "NL query completed",
            extra={
                "question": sanitized_question,
                "branch_id": branch_id,
                "latency_ms": round(latency_ms, 2),
                "success": True,
            },
        )

        # 6. Return NLQueryResponse
        return NLQueryResponse(
            answer=parsed.get("answer", ""),
            chart_data=parsed.get("chart_data"),
            query_interpreted=parsed.get("query_interpreted", sanitized_question),
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    except OpenAIServiceError:
        raise
    except APITimeoutError as exc:
        latency_ms = time.monotonic() * 1000 - start_ms
        logger.warning(
            "NL query timed out",
            extra={
                "question": sanitized_question,
                "branch_id": branch_id,
                "latency_ms": round(latency_ms, 2),
                "success": False,
            },
        )
        raise OpenAIServiceError("OpenAI request timed out after 10 seconds") from exc
    except APIError as exc:
        latency_ms = time.monotonic() * 1000 - start_ms
        logger.warning(
            "NL query failed",
            extra={
                "question": sanitized_question,
                "branch_id": branch_id,
                "latency_ms": round(latency_ms, 2),
                "success": False,
            },
        )
        raise OpenAIServiceError(f"OpenAI API error: {exc}") from exc
    except Exception as exc:
        latency_ms = time.monotonic() * 1000 - start_ms
        logger.warning(
            "NL query failed unexpectedly",
            extra={
                "question": sanitized_question,
                "branch_id": branch_id,
                "latency_ms": round(latency_ms, 2),
                "success": False,
            },
        )
        raise OpenAIServiceError(f"Unexpected error calling OpenAI: {exc}") from exc
