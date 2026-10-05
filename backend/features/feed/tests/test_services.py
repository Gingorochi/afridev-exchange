import uuid

import pytest

from core.exceptions import DomainError, PermissionDeniedError
from features.discussions import services as discussion_services
from features.feed import selectors, services
from features.feed.models import Post

pytestmark = pytest.mark.django_db(transaction=True)


def test_text_post_and_offline_replay_is_idempotent(user, other_user):
    post_id = uuid.uuid4()
    first = services.create_post(author=user, body="Bonjour Lomé !", post_id=post_id)
    again = services.create_post(author=user, body="Bonjour Lomé !", post_id=post_id)
    assert first.id == again.id == post_id
    assert Post.objects.count() == 1
    with pytest.raises(PermissionDeniedError):
        services.create_post(author=other_user, body="vol", post_id=post_id)


def test_poll_validation_and_votes(user, other_user):
    with pytest.raises(DomainError):
        services.create_post(
            author=user, kind="poll", body="Quel framework ?", poll_options=["Django"]
        )
    poll = services.create_post(
        author=user, kind="poll", body="Quel framework ?", poll_options=["Django", "Laravel"]
    )
    services.vote_poll(post=poll, user=user, option=0)
    services.vote_poll(post=poll, user=other_user, option=1)
    services.vote_poll(post=poll, user=other_user, option=0)  # changer d'avis
    assert selectors.poll_results(post_ids=[poll.id])[poll.id] == {0: 2}
    with pytest.raises(DomainError):
        services.vote_poll(post=poll, user=user, option=5)


def test_short_video_requires_own_video(user):
    with pytest.raises(DomainError):
        services.create_post(author=user, kind="short", body="Ma démo", media_id=uuid.uuid4())


def test_likes_are_idempotent(user, other_user):
    post = services.create_post(author=user, body="Like-moi")
    services.set_like(post=post, user=other_user, liked=True)
    services.set_like(post=post, user=other_user, liked=True)
    assert services.set_like(post=post, user=other_user, liked=True).like_count == 1
    assert services.set_like(post=post, user=other_user, liked=False).like_count == 0


def test_comment_count_follows_discussions(user, other_user):
    post = services.create_post(author=user, body="Discutons")
    comment = discussion_services.create_comment(author=other_user, post_id=post.id, body="Top")
    post.refresh_from_db()
    assert post.comment_count == 1
    discussion_services.delete_comment(comment=comment, user=other_user)
    post.refresh_from_db()
    assert post.comment_count == 0


def test_long_posts_get_ai_tags(user, fake_llm):
    fake_llm.when("tags techniques", {"tags": ["Django", "mobile-money"]})
    post = services.create_post(
        author=user, body="Comment intégrer un paiement mobile money dans une API Django ? " * 2
    )
    post.refresh_from_db()
    assert post.tags == ["django", "mobile-money"]
