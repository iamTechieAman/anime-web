import { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Watch Free Anime, Movies & TV Shows | ToonPlayer",
  description: "Watch anime, movies and TV shows online in HD. Discover trending anime, latest episodes and premium streaming experience on ToonPlayer.",
  alternates: {
    canonical: 'https://www.toonplayer.in/',
  },
  openGraph: {
    title: "Watch Free Anime, Movies & TV Shows | ToonPlayer",
    description: "Watch anime, movies and TV shows online in HD. Discover trending anime, latest episodes and premium streaming experience on ToonPlayer.",
    url: 'https://www.toonplayer.in/',
    siteName: 'ToonPlayer',
    images: [
      { url: 'https://www.toonplayer.in/og-image.png', width: 1200, height: 630, alt: 'Watch Free Anime, Movies & TV Shows | ToonPlayer' }
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watch Free Anime, Movies & TV Shows | ToonPlayer',
    description: 'Watch anime, movies and TV shows online in HD. Discover trending anime, latest episodes and premium streaming experience on ToonPlayer.',
    images: ['https://www.toonplayer.in/og-image.png'],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "ToonPlayer",
    "url": "https://www.toonplayer.in/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.toonplayer.in/search?query={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "ToonPlayer",
    "url": "https://www.toonplayer.in/",
    "logo": "https://www.toonplayer.in/icon.png",
    "sameAs": [
      "https://twitter.com/toonplayer",
      "https://github.com/iamTechieAman"
    ],
    "description": "ToonPlayer is a free HD streaming platform to watch anime, movies, and TV shows online."
  }
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
