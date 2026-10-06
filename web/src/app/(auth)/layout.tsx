import { ArrowLeft, Code2, MessagesSquare, WifiOff } from 'lucide-react';
import Link from 'next/link';

import { CommunityIcon, Logo, LogoMark } from '@/shared/ui';

const PROMISES = [
  { icon: MessagesSquare, title: "Entraide avec l'IA", text: 'Une première réponse en quelques secondes, puis la communauté.' },
  { icon: Code2, title: 'Votre coffre de snippets', text: 'Vos commandes et recettes, toujours sous la main.' },
  { icon: WifiOff, title: 'Pensé pour la 3G', text: 'Lisible hors ligne, rien ne se perd pendant une coupure.' },
];

const COMMUNITIES = ['mobile-money', 'django', 'flutter', 'react-native', 'offline-first', 'ussd'];

/** Écrans de connexion : présentation à gauche sur grand écran, formulaire à droite. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(150deg,var(--primary)_0%,#9f3a17_55%,var(--secondary)_130%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="AfriDev Exchange — accueil">
          <span className="rounded-[10px] bg-white/10 p-0.5">
            <LogoMark size={36} />
          </span>
          <span className="text-[1.375rem] font-extrabold tracking-tight">afridev.</span>
        </Link>

        <div className="max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-[2.25rem] leading-[2.75rem] font-bold tracking-tight">
              Le réseau d&apos;entraide des développeurs africains.
            </h2>
            <p className="text-body-lg text-white/80">Apprendre, s&apos;entraider et contribuer, même avec une petite connexion.</p>
          </div>
          <ul className="space-y-4">
            {PROMISES.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/12">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{item.title}</span>
                  <span className="block text-body-md text-white/75">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-label-md font-bold tracking-wide text-white/60 uppercase">Des communautés pour chaque techno</p>
          <div className="flex flex-wrap gap-2">
            {COMMUNITIES.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 py-1 pr-3 pl-1 text-body-sm font-semibold">
                <CommunityIcon tag={tag} size={22} className="ring-2 ring-white/30" />d/{tag}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-container hover:text-ink"
            aria-label="Retour à l'accueil"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <Link href="/" className="lg:hidden" aria-label="AfriDev Exchange — accueil">
            <Logo />
          </Link>
          <span className="size-10" aria-hidden />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pt-2 pb-12 sm:items-center sm:px-8">
          <div className="w-full max-w-[26rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
