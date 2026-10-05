"""Tâches Celery de la feature (préfixe ai_ pour la file « ai »)."""

import logging

from celery import shared_task

from integrations import llm

from . import services
from .bio_generator import generate_bio
from .models import Profile

logger = logging.getLogger(__name__)


@shared_task
def ai_generate_bio(profile_id: str) -> None:
    profile = Profile.objects.filter(id=profile_id).first()
    if profile is None:
        return
    try:
        suggestion = generate_bio(profile)
    except llm.LLMError:
        logger.exception("Bio IA impossible pour %s", profile_id)
        suggestion = None
    services.store_ai_bio(profile_id=profile_id, suggestion=suggestion)
