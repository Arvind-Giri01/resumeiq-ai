import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ResumeIQ — Smarter resume analysis',
  description: 'Get a practical ATS score, job match insights, missing keywords, and tailored interview questions from your resume.',
  openGraph: {
    title: 'ResumeIQ — Make every word earn its place.',
    description: 'AI-powered resume analysis with practical ATS and job-match insights.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ResumeIQ — Make every word earn its place.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResumeIQ — Make every word earn its place.',
    description: 'AI-powered resume analysis with practical ATS and job-match insights.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
