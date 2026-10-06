'use client';

import { KeyRound, LaptopMinimal, LogOut, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { useState } from 'react';

import { errorMessage } from '@/shared/api';
import { useSession } from '@/shared/session';
import { Button, Card, CardHeader, CopyButton, Input, Skeleton, StatusBadge, TimeAgo, useToast } from '@/shared/ui';

import { useSessionActions, useSessions, useTwoFactor } from '../api';

export function SecurityTab() {
  return (
    <div className="space-y-6">
      <TwoFactorCard />
      <SessionsCard />
    </div>
  );
}

function CodeInput({ value, onChange, id }: { value: string; onChange: (code: string) => void; id: string }) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      placeholder="123456"
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
      className="w-40 text-center font-mono text-body-lg tracking-[0.3em]"
      aria-label="Code à 6 chiffres"
    />
  );
}

/** Double authentification par application (TOTP) : activation par QR code, désactivation par code. */
function TwoFactorCard() {
  const { user } = useSession();
  const { setup, enable, disable } = useTwoFactor();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [disabling, setDisabling] = useState(false);
  const enabled = Boolean(user?.two_factor_enabled);
  const pending = setup.data && !enabled;

  async function confirm() {
    try {
      if (enabled) {
        await disable.mutateAsync(code);
        toast('Double authentification désactivée.');
        setDisabling(false);
      } else {
        await enable.mutateAsync(code);
        toast('Double authentification activée.');
        setup.reset();
      }
      setCode('');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <CardHeader
        icon={enabled ? <ShieldCheck className="size-5" aria-hidden /> : <KeyRound className="size-5" aria-hidden />}
        title="Double authentification (2FA)"
        subtitle="Un code de votre application d'authentification en plus du mot de passe."
        action={enabled ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge>Inactive</StatusBadge>}
      />
      {enabled ? (
        disabling ? (
          <div className="flex flex-wrap items-end gap-2">
            <CodeInput id="totp-disable" value={code} onChange={setCode} />
            <Button variant="danger" onClick={confirm} loading={disable.isPending} disabled={code.length !== 6}>
              <ShieldOff className="size-4" aria-hidden /> Désactiver
            </Button>
            <Button variant="plain" onClick={() => setDisabling(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setDisabling(true)}>
            <ShieldOff className="size-4" aria-hidden /> Désactiver la 2FA
          </Button>
        )
      ) : pending ? (
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
          {/* SVG produit par le serveur (segno) à partir de l'URI otpauth : aucun contenu utilisateur. */}
          <div
            className="size-44 rounded-lg bg-white p-1 ring-1 ring-line [&_svg]:size-full"
            aria-label="QR code à scanner"
            role="img"
            dangerouslySetInnerHTML={{ __html: setup.data.qr_svg }}
          />
          <div className="space-y-3">
            <ol className="list-decimal space-y-1.5 pl-5 text-body-sm text-ink-muted">
              <li>Ouvrez Google Authenticator, Aegis, 2FAS ou Microsoft Authenticator.</li>
              <li>Scannez le QR code, ou saisissez la clé ci-dessous.</li>
              <li>Entrez le code à 6 chiffres affiché pour confirmer.</li>
            </ol>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-container-low px-3 py-2 font-mono text-body-sm break-all text-ink">
              <span className="flex-1">{setup.data.secret.match(/.{1,4}/g)?.join(' ')}</span>
              <CopyButton text={setup.data.secret} label="" className="size-7 justify-center rounded-md text-ink-muted hover:bg-container" />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <CodeInput id="totp-enable" value={code} onChange={setCode} />
              <Button onClick={confirm} loading={enable.isPending} disabled={code.length !== 6}>
                Activer
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button onClick={() => setup.mutate()} loading={setup.isPending}>
          <ShieldCheck className="size-4" aria-hidden /> Activer la double authentification
        </Button>
      )}
      {setup.isError ? <p className="text-body-sm text-danger">{errorMessage(setup.error)}</p> : null}
    </Card>
  );
}

/** Appareils connectés : chaque connexion est une session, déconnectable à distance. */
function SessionsCard() {
  const sessions = useSessions();
  const { revoke, revokeOthers } = useSessionActions();
  const toast = useToast();
  const others = sessions.data?.filter((session) => !session.current).length ?? 0;

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <CardHeader
        icon={<LaptopMinimal className="size-5" aria-hidden />}
        title="Appareils connectés"
        subtitle="Déconnectez un téléphone perdu ou un ordinateur partagé."
        action={
          others ? (
            <Button
              variant="outline"
              size="sm"
              loading={revokeOthers.isPending}
              onClick={() =>
                revokeOthers.mutate(undefined, {
                  onSuccess: (result) => toast(`${result.revoked} appareil${result.revoked > 1 ? 's' : ''} déconnecté${result.revoked > 1 ? 's' : ''}.`),
                })
              }
            >
              <LogOut className="size-4" aria-hidden /> Déconnecter les autres
            </Button>
          ) : null
        }
      />
      {sessions.isPending ? (
        <Skeleton className="h-28" />
      ) : sessions.isError ? (
        <p className="text-body-sm text-ink-muted">La liste des appareils nécessite une connexion.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {sessions.data.map((session) => {
            const mobile = /mobile|Android|iOS/.test(session.device);
            const Icon = mobile ? Smartphone : LaptopMinimal;
            return (
              <li key={session.id} className="flex items-center gap-3 px-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-container text-ink-muted">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium text-ink">
                    {session.device}
                    {session.current ? <StatusBadge tone="success">Cet appareil</StatusBadge> : null}
                  </p>
                  <p className="text-label-md text-ink-faint">
                    {session.ip_address || 'IP inconnue'} · active <TimeAgo date={session.last_used_at ?? session.created_at} /> · connecté{' '}
                    <TimeAgo date={session.created_at} />
                  </p>
                </div>
                {!session.current ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={revoke.isPending && revoke.variables === session.id}
                    onClick={() => revoke.mutate(session.id, { onSuccess: () => toast('Appareil déconnecté.') })}
                  >
                    Déconnecter
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
