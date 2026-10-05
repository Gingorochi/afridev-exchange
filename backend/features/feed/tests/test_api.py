import pytest

pytestmark = pytest.mark.django_db(transaction=True)


def test_feed_is_public_but_writing_requires_login(api_client, auth_client):
    created = auth_client.post("/api/feed/", {"body": "Premier post !"}, format="json")
    assert created.status_code == 201
    assert created.data["author"]["username"] == "amina"

    feed = api_client.get("/api/feed/")
    assert feed.status_code == 200
    assert [p["body"] for p in feed.data["results"]] == ["Premier post !"]
    assert feed.data["results"][0]["viewer"] is None

    assert api_client.post("/api/feed/", {"body": "anonyme"}, format="json").status_code == 401


def test_poll_vote_and_like_through_api(auth_client, client_for, other_user):
    poll = auth_client.post(
        "/api/feed/",
        {"kind": "poll", "body": "Tabs ou espaces ?", "poll_options": ["Tabs", "Espaces"]},
        format="json",
    ).data
    other = client_for(other_user)
    voted = other.post(f"/api/feed/{poll['id']}/vote/", {"option": 1}, format="json")
    assert voted.data["poll_results"] == [0, 1]
    assert voted.data["viewer"] == {"liked": False, "vote": 1}

    liked = other.post(f"/api/feed/{poll['id']}/like/", {"liked": True}, format="json")
    assert liked.data["like_count"] == 1


def test_only_author_can_delete(auth_client, client_for, other_user):
    post = auth_client.post("/api/feed/", {"body": "à moi"}, format="json").data
    assert client_for(other_user).delete(f"/api/feed/{post['id']}/").status_code == 403
    assert auth_client.delete(f"/api/feed/{post['id']}/").status_code == 204
    assert auth_client.get(f"/api/feed/{post['id']}/").status_code == 404
