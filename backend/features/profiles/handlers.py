"""Écoute les events des autres features."""

from django.dispatch import receiver

from features.accounts.events import user_registered

from . import services


@receiver(user_registered)
def on_user_registered(sender, user_id, username, display_name, avatar_url, github_username, **kw):
    services.create_profile(
        user_id=user_id,
        username=username,
        display_name=display_name,
        avatar_url=avatar_url,
        github_username=github_username,
    )
