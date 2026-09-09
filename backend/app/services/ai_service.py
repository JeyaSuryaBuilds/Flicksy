from fastapi import HTTPException

from app.services.ai_providers import GeminiProvider, OpenRouterProvider, AIProviderError

# Ordered provider chain: first configured provider that succeeds wins.
# Extend this list (or make it dynamic) to add more providers later without touching callers.
_PROVIDERS = [GeminiProvider(), OpenRouterProvider()]


async def generate_ai_text(prompt: str, system: str = "") -> tuple[str, str]:
    """
    Runs the prompt through the provider chain (Gemini -> OpenRouter).
    Returns (text, provider_name). Raises HTTPException(503) if every provider fails
    or none are configured — callers must not fabricate a fake success response.
    """
    last_error = None
    any_configured = False

    for provider in _PROVIDERS:
        if not provider.is_configured:
            continue
        any_configured = True
        try:
            text = await provider.generate(prompt, system)
            return text, provider.name
        except AIProviderError as e:
            last_error = e
            continue

    if not any_configured:
        raise HTTPException(
            status_code=503,
            detail=(
                "Flicksy AI isn't configured yet. Set GEMINI_API_KEY and/or OPENROUTER_API_KEY "
                "in the backend .env file to enable it."
            ),
        )

    raise HTTPException(status_code=503, detail=f"Flicksy AI is temporarily unavailable: {last_error}")


# ---------- Feature-specific prompt builders ----------
# Keeping prompt construction here (not in the router) so it's reusable and testable independently.

CAPTION_SYSTEM = (
    "You are Flicksy AI, a caption writer for the Flicksy social app. Write short, natural, "
    "Gen-Z-friendly captions for a 'Flick' (photo/video post). Avoid hashtags unless asked. "
    "Return only the caption text, no quotes, no explanation."
)

BIO_SYSTEM = (
    "You are Flicksy AI, helping write a short 'Space' (profile) bio for the Flicksy app. "
    "Keep it under 150 characters, warm and specific, no hashtags. Return only the bio text."
)

TOPIC_TAG_SYSTEM = (
    "You are Flicksy AI. Given a caption, suggest 5-8 relevant Topic Tags (Flicksy's term for "
    "hashtags) as a comma-separated list, no # symbol, no explanation."
)

CHAT_SYSTEM = (
    "You are Flicksy AI, a friendly assistant built into the Flicksy social app. You help with "
    "captions, content ideas, bios, Topic Tags, tone rewriting, and translation. Keep answers "
    "concise and conversational. Never claim to have posted, uploaded, or performed an action "
    "in the app — you only generate text suggestions."
)


def build_caption_prompt(description: str, tone: str, improve_existing: bool) -> str:
    action = "Improve this caption" if improve_existing else "Write a caption for this Flick"
    return f"{action} (tone: {tone}):\n\n{description}"


def build_bio_prompt(prompt: str, improve_existing: bool) -> str:
    action = "Improve this Space bio" if improve_existing else "Write a Space bio based on"
    return f"{action}: {prompt}"


def build_topic_tag_prompt(caption: str) -> str:
    return f"Caption: {caption}"
