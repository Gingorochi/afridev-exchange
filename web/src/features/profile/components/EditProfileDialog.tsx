'use client';

import { useState } from 'react';

import { errorMessage } from '@/shared/api';
import { Button, Dialog, Field, Input, Switch, TagInput, Textarea } from '@/shared/ui';

import { type MyProfile, useUpdateProfile } from '../api';

export function EditProfileDialog({ profile, open, onClose }: { profile: MyProfile; open: boolean; onClose: () => void }) {
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    display_name: profile.display_name,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    github_username: profile.github_username,
    stack: profile.stack,
    open_to_work: profile.open_to_work,
  });

  return (
    <Dialog open={open} onClose={onClose} title="Modifier mon profil" className="w-[min(40rem,calc(100vw-2rem))]">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await update.mutateAsync(form);
            onClose();
          } catch {
            // erreur affichée ci-dessous
          }
        }}
      >
        <Field label="Nom affiché" htmlFor="display-name">
          <Input id="display-name" maxLength={80} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </Field>
        <Field label="Bio" htmlFor="bio" counter={`${form.bio.length} / 600`}>
          <Textarea id="bio" maxLength={600} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville, pays" htmlFor="location">
            <Input id="location" maxLength={80} placeholder="Lomé, Togo" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Pseudo GitHub" htmlFor="github">
            <Input id="github" maxLength={39} value={form.github_username} onChange={(e) => setForm({ ...form, github_username: e.target.value })} />
          </Field>
        </div>
        <Field label="Site web" htmlFor="website">
          <Input id="website" type="url" placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </Field>
        <Field label="Stack technique" htmlFor="stack" hint="Sert aux recommandations de projets (20 maximum).">
          <TagInput id="stack" max={20} value={form.stack} onChange={(stack) => setForm({ ...form, stack })} suggestions={['python', 'django', 'react', 'flutter', 'node', 'go']} />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-container-low p-3">
          <div>
            <p className="font-semibold text-ink">Ouvert aux opportunités</p>
            <p className="text-body-sm text-ink-muted">Missions freelance, emploi, contributions rémunérées.</p>
          </div>
          <Switch checked={form.open_to_work} onChange={(open_to_work) => setForm({ ...form, open_to_work })} label="Ouvert aux opportunités" />
        </div>
        {update.isError ? <p role="alert" className="text-body-sm text-danger">{errorMessage(update.error)}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={update.isPending}>Enregistrer</Button>
        </div>
      </form>
    </Dialog>
  );
}
