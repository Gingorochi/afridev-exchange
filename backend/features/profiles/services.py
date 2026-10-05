"""Écritures (création, mise à jour, publication). Seul point d'entrée en écriture."""

from django.db import transaction

from core.exceptions import PermissionDeniedError
from core.utils import normalize_tags

from .events import profile_updated
from .models import Profile

EDITABLE_FIELDS = {
    "display_name",
    "bio",
    "avatar_url",
    "stack",
    "github_username",
    "location",
    "website",
    "open_to_work",
}


def create_profile(
    *, user_id, username: str, display_name: str = "", avatar_url: str = "", github_username=""
) -> Profile:
    profile, _ = Profile.objects.get_or_create(
        user_id=user_id,
        defaults={
            "id": user_id,
            "username": username,
            "display_name": display_name[:80],
            "avatar_url": avatar_url,
            "github_username": github_username,
        },
    )
    return profile


@transaction.atomic
def update_profile(*, profile: Profile, **fields) -> Profile:
    changed = []
    for name, value in fields.items():
        if name not in EDITABLE_FIELDS:
            continue
        if name == "stack":
            value = normalize_tags(value, limit=20)
        if getattr(profile, name) != value:
            setattr(profile, name, value)
            changed.append(name)
    if changed:
        profile.save(update_fields=[*changed, "updated_at"])
        transaction.on_commit(lambda: profile_updated.send(sender=Profile, user_id=profile.user_id))
    return profile


def apply_offline_update(*, user, profile_id, data: dict) -> None:
    """Écriture reçue de la copie locale (features/sync) : seul son propre profil."""
    profile = Profile.objects.filter(id=profile_id).first()
    if profile is None or profile.user_id != user.id:
        raise PermissionDeniedError("Vous ne pouvez modifier que votre propre profil.")
    update_profile(profile=profile, **data)


@transaction.atomic
def request_ai_bio(*, profile: Profile) -> Profile:
    from .tasks import ai_generate_bio

    profile.ai_bio_status = Profile.AiStatus.PENDING
    profile.save(update_fields=["ai_bio_status", "updated_at"])
    transaction.on_commit(lambda: ai_generate_bio.delay(str(profile.id)))
    return profile


def store_ai_bio(*, profile_id, suggestion: str | None) -> None:
    status = Profile.AiStatus.READY if suggestion else Profile.AiStatus.FAILED
    Profile.objects.filter(id=profile_id).update(
        ai_bio_suggestion=suggestion or "", ai_bio_status=status
    )
