"""Écritures (création, mise à jour, publication). Seul point d'entrée en écriture."""

from django.db import IntegrityError, transaction
from django.db.models import F

from core.exceptions import DomainError, NotFoundError, PermissionDeniedError
from core.utils import normalize_tags, parse_json_list
from features.media import selectors as media_selectors

from .events import post_liked, post_published
from .models import PollVote, Post, PostLike

MEDIA_KIND = {Post.Kind.IMAGE: "image", Post.Kind.SHORT: "video"}


def _validate(*, author, kind: str, body: str, poll_options: list, media_id) -> list[str]:
    if kind not in Post.Kind.values:
        raise DomainError(f"Type de post inconnu : {kind}.", code="invalid_post")
    options = [str(option).strip()[:80] for option in poll_options if str(option).strip()]
    if kind == Post.Kind.POLL:
        if not body.strip():
            raise DomainError("Un sondage a besoin d'une question.", code="invalid_post")
        if not 2 <= len(options) <= 4:
            raise DomainError("Un sondage propose de 2 à 4 choix.", code="invalid_post")
    elif options:
        raise DomainError("Seul un sondage peut avoir des choix.", code="invalid_post")

    if kind in MEDIA_KIND:
        if not media_id or not media_selectors.get_owned_asset(
            asset_id=media_id, owner_id=author.id, kind=MEDIA_KIND[kind]
        ):
            raise DomainError("Média manquant ou invalide pour ce post.", code="invalid_media")
    elif media_id:
        raise DomainError("Ce type de post n'accepte pas de média.", code="invalid_post")
    elif not body.strip():
        raise DomainError("Le post est vide.", code="invalid_post")
    return options


@transaction.atomic
def create_post(
    *,
    author,
    kind: str = Post.Kind.TEXT,
    body: str = "",
    poll_options: list | None = None,
    media_id=None,
    tags: list | None = None,
    post_id=None,
) -> Post:
    """`post_id` : identifiant généré hors ligne par le client (rejouer l'envoi est sans effet)."""
    if post_id:
        existing = Post.objects.filter(id=post_id).first()
        if existing:
            if existing.author_id != author.id:
                raise PermissionDeniedError("Identifiant déjà utilisé.")
            return existing

    options = _validate(
        author=author, kind=kind, body=body, poll_options=poll_options or [], media_id=media_id
    )
    post = Post(
        author=author,
        kind=kind,
        body=body.strip(),
        poll_options=options,
        media_id=media_id or None,
        tags=normalize_tags(tags),
    )
    if post_id:
        post.id = post_id
    post.save()

    if not post.tags and len(post.body) >= 80:
        from .tasks import ai_tag_post

        transaction.on_commit(lambda: ai_tag_post.delay(str(post.id)))
    transaction.on_commit(
        lambda: post_published.send(
            sender=Post, post_id=post.id, author_id=post.author_id, text=post.body
        )
    )
    return post


@transaction.atomic
def update_post(*, post: Post, user, body: str | None = None, tags=None) -> Post:
    if post.author_id != user.id:
        raise PermissionDeniedError("Seul l'auteur peut modifier ce post.")
    fields = []
    if body is not None and body.strip() != post.body:
        if not body.strip() and post.kind == Post.Kind.TEXT:
            raise DomainError("Le post est vide.", code="invalid_post")
        post.body = body.strip()
        fields.append("body")
    if tags is not None:
        post.tags = normalize_tags(tags)
        fields.append("tags")
    if fields:
        post.save(update_fields=[*fields, "updated_at"])
    return post


def delete_post(*, post: Post, user) -> None:
    if post.author_id != user.id and not user.is_staff:
        raise PermissionDeniedError("Seul l'auteur peut supprimer ce post.")
    post.soft_delete()


def hide_post(*, post_id) -> bool:
    """Masquage par la modération (réversible depuis l'admin)."""
    post = Post.objects.alive().filter(id=post_id).first()
    if post:
        post.soft_delete()
    return post is not None


def restore_post(*, post_id) -> bool:
    """Annule un masquage de la modération (le post réapparaît dans le fil)."""
    post = Post.objects.filter(id=post_id, deleted_at__isnull=False).first()
    if post:
        post.deleted_at = None
        post.save(update_fields=["deleted_at", "updated_at"])
    return post is not None


def set_tags(*, post_id, tags: list) -> None:
    Post.objects.filter(id=post_id, tags=[]).update(tags=normalize_tags(tags))


@transaction.atomic
def vote_poll(*, post: Post, user, option: int) -> PollVote:
    if post.kind != Post.Kind.POLL:
        raise DomainError("Ce post n'est pas un sondage.", code="not_a_poll")
    if not 0 <= option < len(post.poll_options):
        raise DomainError("Choix invalide.", code="invalid_option")
    vote, _ = PollVote.objects.update_or_create(post=post, voter=user, defaults={"option": option})
    return vote


@transaction.atomic
def set_like(*, post: Post, user, liked: bool) -> Post:
    if liked:
        try:
            with transaction.atomic():
                PostLike.objects.create(post=post, user=user)
        except IntegrityError:
            return post  # déjà aimé : idempotent
        Post.objects.filter(id=post.id).update(like_count=F("like_count") + 1)
        if post.author_id != user.id:
            transaction.on_commit(
                lambda: post_liked.send(
                    sender=Post, post_id=post.id, author_id=post.author_id, user_id=user.id
                )
            )
    else:
        deleted, _ = PostLike.objects.filter(post=post, user=user).delete()
        if deleted:
            Post.objects.filter(id=post.id, like_count__gt=0).update(like_count=F("like_count") - 1)
    post.refresh_from_db(fields=["like_count"])
    return post


def adjust_comment_count(*, post_id, delta: int) -> None:
    posts = Post.objects.filter(id=post_id)
    if delta < 0:
        posts = posts.filter(comment_count__gte=-delta)
    posts.update(comment_count=F("comment_count") + delta)


def apply_offline_write(*, user, op: str, record_id, data: dict) -> None:
    """Écriture rejouée depuis la copie locale (features/sync)."""
    if op == "PUT":
        create_post(
            author=user,
            post_id=record_id,
            kind=data.get("kind") or Post.Kind.TEXT,
            body=data.get("body") or "",
            poll_options=parse_json_list(data.get("poll_options")),
            media_id=data.get("media_id") or None,
            tags=data.get("tags"),
        )
        return
    post = Post.objects.alive().filter(id=record_id).first()
    if post is None:
        raise NotFoundError("Post introuvable.")
    if op == "PATCH":
        update_post(post=post, user=user, body=data.get("body"), tags=data.get("tags"))
    elif op == "DELETE":
        delete_post(post=post, user=user)
