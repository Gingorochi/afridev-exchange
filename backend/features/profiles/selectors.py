"""Lectures. Seul point d'entrée en lecture pour les autres features."""

from django.db.models import QuerySet

from .models import Profile


def get_profile_by_username(*, username: str) -> Profile | None:
    return Profile.objects.alive().filter(username__iexact=username).first()


def get_profile_for_user(*, user_id) -> Profile | None:
    return Profile.objects.alive().filter(user_id=user_id).first()


def get_profiles(*, user_ids) -> dict:
    """{user_id: profile} pour afficher les auteurs d'une liste."""
    profiles = Profile.objects.alive().filter(user_id__in=list(user_ids))
    return {profile.user_id: profile for profile in profiles}


def author_cards(*, user_ids) -> dict:
    """{user_id: {id, username, display_name, avatar_url}} : l'auteur affiché sur un contenu."""
    return {
        user_id: {
            "id": str(user_id),
            "username": profile.username,
            "display_name": profile.display_name or profile.username,
            "avatar_url": profile.avatar_url,
        }
        for user_id, profile in get_profiles(user_ids=set(user_ids)).items()
    }


def list_profiles_with_stack() -> QuerySet[Profile]:
    """Candidats potentiels pour le matchmaking."""
    return Profile.objects.alive().exclude(stack=[])


def get_stack(*, user_id) -> list[str]:
    profile = get_profile_for_user(user_id=user_id)
    return list(profile.stack) if profile else []
