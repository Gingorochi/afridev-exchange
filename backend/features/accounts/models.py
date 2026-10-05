import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower

from core.models import BaseModel


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                name="accounts_user_email_ci_unique",
                condition=~models.Q(email=""),
            )
        ]


class SocialAccount(BaseModel):
    """Compte GitHub / GitLab rattaché à un utilisateur."""

    class Provider(models.TextChoices):
        GITHUB = "github", "GitHub"
        GITLAB = "gitlab", "GitLab"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="social_accounts")
    provider = models.CharField(max_length=20, choices=Provider.choices)
    uid = models.CharField(max_length=64)
    username = models.CharField(max_length=100)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["provider", "uid"], name="accounts_social_unique")
        ]

    def __str__(self):
        return f"{self.provider}:{self.username}"


class PhoneOTP(BaseModel):
    """Code à usage unique envoyé par SMS. Seule l'empreinte du code est stockée."""

    phone_number = models.CharField(max_length=20, db_index=True)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)
