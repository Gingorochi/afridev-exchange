import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

import { AppProviders } from '@/shared/providers/AppProviders';
import { preferencesScript } from '@/shared/theme';

import '@/styles/globals.css';

// Polices auto-hébergées et sous-ensemble latin : aucune requête vers Google côté visiteur.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: { default: 'AfriDev Exchange', template: '%s · AfriDev Exchange' },
  description:
    "Le réseau d'entraide des développeurs africains : apprendre, s'entraider et contribuer, même avec une petite connexion.",
  applicationName: 'AfriDev Exchange',
  icons: { icon: '/icons/logo.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#15191c' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${jakarta.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        {/* Thème et mode « Texte seul » appliqués avant l'affichage (pas de flash). */}
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
