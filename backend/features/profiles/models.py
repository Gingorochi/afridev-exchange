from django.conf import settings
from django.db import models

from core.models import BaseModel


class Profile(BaseModel):
    """Profil tech public. Son id est celui de l'utilisateur, pour que la copie locale
    joigne directement `author_id` / `owner_id` sur la table `profiles`."""

    class AiStatus(models.TextChoices):
        IDLE = "idle", "Aucune"
        PENDING = "pending", "En cours"
        READY = "ready", "Prête"
        FAILED = "failed", "Échec"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    username = models.CharField(max_length=30, unique=True)
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.TextField(max_length=600, blank=True)
    avatar_url = models.URLField(blank=True)
    stack = models.JSONField(default=list, blank=True)
    github_username = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=80, blank=True)
    website = models.URLField(blank=True)
    open_to_work = models.BooleanField(default=False)

    ai_bio_suggestion = models.TextField(blank=True)
    ai_bio_status = models.CharField(max_length=10, choices=AiStatus.choices, default=AiStatus.IDLE)

    def __str__(self):
        return self.username
