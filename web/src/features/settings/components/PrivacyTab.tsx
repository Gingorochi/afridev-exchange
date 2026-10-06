'use client';

import { AlertTriangle, Download, FileJson, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { errorMessage } from '@/shared/api';
import { useSession } from '@/shared/session';
import { Button, Card, CardHeader, CopyButton, Field, Input, Select, Skeleton, StatusBadge, Switch, TimeAgo, useToast } from '@/shared/ui';

import { downloadMyData, useAccessTokenActions, useAccessTokens } from '../api';

export function PrivacyTab() {
  return (
    <div className="space-y-6">
      <ExportCard />
      <TokensCard />
    </div>
  );
}

/** Export RGPD : tout le compte dans un fichier JSON lisible. */
function ExportCard() {
  const { profile } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      await downloadMyData(profile?.username ?? 'moi');
      toast('Export téléchargé.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <CardHeader
        icon={<FileJson className="size-5" aria-hidden />}
        title="Télécharger mes données"
        subtitle="Profil, posts, questions, réponses, snippets, commentaires, collections, hubs… au format JSON (RGPD, portabilité)."
      />
      <Button variant="outline" onClick={download} loading={loading}>
        <Download className="size-4" aria-hidden /> Télécharger mes données (JSON)
      </Button>
      <p className="text-label-md text-ink-faint">Aucun secret n&apos;est exporté : ni mot de passe, ni clé 2FA, ni jeton complet.</p>
    </Card>
  );
}

/** Jetons d'accès personnels : scripts, CI, intégrations (affichés une seule fois). */
function TokensCard() {
  const tokens = useAccessTokens();
  const { create, revoke } = useAccessTokenActions();
  const toast = useToast();
  const [name, setName] = useState('');
  const [readOnly, setReadOnly] = useState(true);
  const [expires, setExpires] = useState('90');
  const [created, setCreated] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const token = await create.mutateAsync({
        name,
        read_only: readOnly,
        expires_in_days: expires ? Number(expires) : null,
      });
      setCreated(token.token);
      setName('');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <CardHeader
        icon={<KeyRound className="size-5" aria-hidden />}
        title="Clés d'API (jetons d'accès personnels)"
        subtitle="Pour vos scripts et votre CI : en-tête « Authorization: Bearer afd_… »."
      />
      {created ? (
        <div className="space-y-2 rounded-lg border border-tertiary/30 bg-tertiary-soft p-3">
          <p className="flex items-center gap-2 text-body-sm font-semibold text-on-tertiary-soft">
            <AlertTriangle className="size-4" aria-hidden /> Copiez ce jeton maintenant : il ne sera plus jamais affiché.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-line bg-card px-3 py-2 font-mono text-body-sm break-all text-ink">
            <span className="flex-1">{created}</span>
            <CopyButton text={created} label="Copier" className="shrink-0 text-ink-muted hover:text-ink" />
          </div>
          <Button size="sm" variant="plain" onClick={() => setCreated(null)}>
            J&apos;ai copié le jeton
          </Button>
        </div>
      ) : null}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
        <Field label="Nom du jeton" htmlFor="token-name">
          <Input id="token-name" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="CI GitHub Actions" required />
        </Field>
        <Field label="Expiration" htmlFor="token-expires">
          <Select id="token-expires" value={expires} onChange={(event) => setExpires(event.target.value)}>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="365">1 an</option>
            <option value="">Jamais</option>
          </Select>
        </Field>
        <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
          <Plus className="size-4" aria-hidden /> Créer
        </Button>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-container-low px-3 py-1 sm:col-span-3">
          <span className="text-body-sm text-ink-muted">
            <span className="font-medium text-ink">Lecture seule</span> (recommandé) : le jeton ne peut rien publier ni modifier.
          </span>
          <Switch checked={readOnly} onChange={setReadOnly} label="Lecture seule" />
        </div>
      </form>
      {tokens.isPending ? (
        <Skeleton className="h-16" />
      ) : tokens.data?.length ? (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {tokens.data.map((token) => (
            <li key={token.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium text-ink">
                  {token.name}
                  <StatusBadge tone={token.read_only ? 'neutral' : 'warning'} dot={false}>
                    {token.read_only ? 'Lecture seule' : 'Lecture & écriture'}
                  </StatusBadge>
                </p>
                <p className="text-label-md text-ink-faint">
                  <span className="font-mono">{token.prefix}…</span> · créé <TimeAgo date={token.created_at} />
                  {token.last_used_at ? (
                    <>
                      {' '}
                      · utilisé <TimeAgo date={token.last_used_at} />
                    </>
                  ) : ' · jamais utilisé'}
                  {token.expires_at ? ` · expire le ${new Date(token.expires_at).toLocaleDateString('fr')}` : ''}
                </p>
              </div>
              <Button
                variant="plain"
                size="sm"
                className="text-danger"
                onClick={() => window.confirm(`Révoquer « ${token.name} » ? Les scripts qui l'utilisent cesseront de fonctionner.`) && revoke.mutate(token.id)}
              >
                <Trash2 className="size-4" aria-hidden /> Révoquer
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-ink-faint">Aucun jeton actif.</p>
      )}
    </Card>
  );
}
