'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '@/shared/api';
import { PageHeader } from '@/shared/layout';
import { Button, Card, CardSkeleton, Field, Input, Switch, TagInput, Textarea, useToast } from '@/shared/ui';

import { type ProjectInput, useProject, useSaveProject } from '../api';

const EMPTY: ProjectInput = { name: '', description: '', repo_url: '', tags: [], is_recruiting: true };

export function ProjectFormScreen({ id }: { id?: string }) {
  const existing = useProject(id);
  if (id && !existing.data) return <CardSkeleton lines={5} />;
  const initial = existing.data
    ? {
        name: existing.data.name,
        description: existing.data.description,
        repo_url: existing.data.repo_url,
        tags: existing.data.tags,
        is_recruiting: existing.data.is_recruiting,
      }
    : EMPTY;
  return <ProjectForm id={id} initial={initial} />;
}

function ProjectForm({ id, initial }: { id?: string; initial: ProjectInput }) {
  const router = useRouter();
  const toast = useToast();
  const save = useSaveProject();
  const [form, setForm] = useState<ProjectInput>(initial);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const outcome = await save.mutateAsync({ id, input: form });
      if (outcome.queued) {
        toast('Hors ligne : le projet sera publié au retour du réseau.', 'queued');
        router.push('/projects');
      } else {
        router.push(`/projects/${outcome.result.id}`);
      }
    } catch {
      // erreur affichée sous le formulaire
    }
  }

  return (
    <>
      <PageHeader title={id ? 'Modifier le projet' : 'Proposer un projet open source'} description="Les good first issues de votre dépôt GitHub sont importées automatiquement." />
      <Card className="mx-auto max-w-3xl p-4 sm:p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Nom du projet" required htmlFor="project-name">
            <Input id="project-name" required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Dépôt GitHub" htmlFor="project-repo" hint="https://github.com/organisation/depot">
            <Input id="project-repo" type="url" inputMode="url" placeholder="https://github.com/…" value={form.repo_url} onChange={(event) => setForm({ ...form, repo_url: event.target.value })} />
          </Field>
          <Field label="Description" htmlFor="project-description">
            <Textarea id="project-description" maxLength={3000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <Field label="Technologies" htmlFor="project-tags" hint="Utilisées pour recommander le projet aux bons développeurs.">
            <TagInput id="project-tags" max={12} value={form.tags} onChange={(tags) => setForm({ ...form, tags })} suggestions={['python', 'django', 'react', 'flutter', 'go']} />
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-container-low p-3">
            <div>
              <p className="font-semibold text-ink">Je cherche des contributeurs</p>
              <p className="text-body-sm text-ink-muted">Le projet apparaît dans les recommandations des développeurs.</p>
            </div>
            <Switch checked={form.is_recruiting} onChange={(is_recruiting) => setForm({ ...form, is_recruiting })} label="Je cherche des contributeurs" />
          </div>
          {save.isError ? <p role="alert" className="text-body-sm text-danger">{errorMessage(save.error)}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => router.back()}>Annuler</Button>
            <Button type="submit" loading={save.isPending}>
              <Save className="size-4" aria-hidden /> {id ? 'Enregistrer' : 'Publier le projet'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
