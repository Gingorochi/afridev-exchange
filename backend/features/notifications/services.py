"""Écritures (création, mise à jour, publication). Seul point d'entrée en écriture."""

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from integrations import push

from . import channels
from .models import Notification, PushDevice


@transaction.atomic
def notify(*, recipient_id, kind: str, title: str, body: str = "", data: dict | None = None):
    notification = Notification.objects.create(
        recipient_id=recipient_id,
        kind=kind,
        title=title[:120],
        body=body[:300],
        data=data or {},
    )

    from .tasks import deliver_notification

    def _dispatch():
        channels.send_realtime(notification)
        deliver_notification.delay(str(notification.id))

    transaction.on_commit(_dispatch)
    return notification


def mark_read(*, notification: Notification) -> Notification:
    if notification.read_at is None:
        notification.read_at = timezone.now()
        notification.save(update_fields=["read_at", "updated_at"])
    return notification


def mark_all_read(*, user) -> int:
    return Notification.objects.filter(recipient=user, read_at__isnull=True).update(
        read_at=timezone.now()
    )


def register_device(*, user, token: str, platform: str = "") -> PushDevice:
    if not push.is_expo_token(token):
        raise DomainError("Jeton Expo invalide.", code="invalid_push_token")
    device, _ = PushDevice.objects.update_or_create(
        token=token, defaults={"user": user, "platform": platform}
    )
    return device


def unregister_device(*, user, token: str) -> None:
    PushDevice.objects.filter(user=user, token=token).delete()
