import pytest

from features.notifications import services

pytestmark = pytest.mark.django_db(transaction=True)


def test_notifications_api(auth_client, user):
    notification = services.notify(recipient_id=user.id, kind="new_answer", title="Réponse")
    assert auth_client.get("/api/notifications/unread-count/").data == {"unread": 1}

    listed = auth_client.get("/api/notifications/", {"unread": "true"})
    assert [n["title"] for n in listed.data["results"]] == ["Réponse"]

    read = auth_client.post(f"/api/notifications/{notification.id}/read/")
    assert read.data["read_at"] is not None
    assert auth_client.get("/api/notifications/unread-count/").data == {"unread": 0}

    device = auth_client.post(
        "/api/notifications/devices/", {"token": "ExponentPushToken[abc]"}, format="json"
    )
    assert device.status_code == 204
