"""Connexion GitHub / GitLab : échange du code OAuth contre une identité vérifiée."""

from core.exceptions import DomainError
from integrations import github
from integrations.github import OAuthIdentity


class OAuthError(DomainError):
    code = "oauth_failed"


_EXCHANGERS = {
    "github": github.exchange_github_code,
    "gitlab": github.exchange_gitlab_code,
}


def fetch_identity(provider: str, code: str, redirect_uri: str | None = None) -> OAuthIdentity:
    exchanger = _EXCHANGERS.get(provider)
    if exchanger is None:
        raise OAuthError(f"Fournisseur inconnu : {provider}.")
    try:
        return exchanger(code, redirect_uri)
    except github.GitHubError as exc:
        raise OAuthError(str(exc)) from exc
