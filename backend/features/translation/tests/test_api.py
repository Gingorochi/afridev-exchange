import pytest

pytestmark = pytest.mark.django_db(transaction=True)


def test_translate_then_cached_200(auth_client, fake_llm):
    payload = {"text": "Bonjour", "target_language": "en"}
    first = auth_client.post("/api/translation/", payload, format="json")
    assert first.status_code == 202  # en file d'attente (puis exécuté par le worker)
    assert auth_client.get(f"/api/translation/{first.data['id']}/").data["status"] == "ready"

    second = auth_client.post("/api/translation/", payload, format="json")
    assert second.status_code == 200 and second.data["id"] == first.data["id"]
