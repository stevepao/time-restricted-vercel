import { getMetadataBase } from "@/lib/metadata";

const AUTHOR_IMAGE_URL =
  "https://api.time-restricted.com/wp-content/uploads/2026/05/stephen-pao-200-200.jpg";

export function buildSiteStructuredData(): string {
  const siteUrl = getMetadataBase();
  const siteOrigin = siteUrl.origin;

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": `${siteOrigin}/#website`,
        "@type": "WebSite",
        "about": {
          "@id": `${siteOrigin}/#stephen-pao`,
        },
        "author": {
          "@id": `${siteOrigin}/#stephen-pao`,
        },
        "description":
          "Stephen Pao writes about living with Type II diabetes, chronic kidney disease, and long-term time-restricted eating.",
        "inLanguage": "en-US",
        "name": "Time Restricted",
        "potentialAction": {
          "@type": "SearchAction",
          "query-input": "required name=search_term_string",
          "target": `${siteOrigin}/?s={search_term_string}`,
        },
        "publisher": {
          "@id": `${siteOrigin}/#organization`,
        },
        "url": `${siteOrigin}/`,
      },
      {
        "@id": `${siteOrigin}/#blog`,
        "@type": "Blog",
        "author": {
          "@id": `${siteOrigin}/#stephen-pao`,
        },
        "description":
          "Personal essays about time-restricted eating, Type II diabetes, chronic kidney disease, and related health experiments.",
        "inLanguage": "en-US",
        "name": "Time Restricted",
        "publisher": {
          "@id": `${siteOrigin}/#organization`,
        },
        "url": `${siteOrigin}/`,
      },
      {
        "@id": `${siteOrigin}/#organization`,
        "@type": "Organization",
        "founder": {
          "@id": `${siteOrigin}/#stephen-pao`,
        },
        "name": "Hillwork, LLC",
        "sameAs": ["https://hillwork.us/"],
        "url": "https://hillwork.us/",
      },
      {
        "@id": `${siteOrigin}/#stephen-pao`,
        "@type": "Person",
        "alternateName": "Steve Pao",
        "image": AUTHOR_IMAGE_URL,
        "mainEntityOfPage": `${siteOrigin}/`,
        "name": "Stephen Pao",
        "sameAs": [
          "https://hillwork.us/",
          "https://paos.us/",
          "https://www.linkedin.com/in/stevep",
          "https://www.crunchbase.com/person/stephen-pao",
          "https://www.forbes.com/councils/forbestechcouncil/people/stevepao/",
          "https://www.infoworld.com/profile/stephen-pao/",
          "https://substack.com/@spao",
          "https://www.retiredpdx.com",
          "https://medium.com/@stevepao",
          "https://podcasts.apple.com/us/podcast/retired-techie-in-pdx-the-podcast/id1824371642",
          "https://open.spotify.com/show/4Ga9aCfbulW46O4btvJC8v",
          "https://www.youtube.com/@retiredpdx",
          "https://x.com/steve_pao",
          "https://bsky.app/profile/retiredpdx.substack.com",
          "https://www.instagram.com/stevepao7",
          "https://link.hillwork.net/@spao",
        ],
        "url": `${siteOrigin}/`,
        "worksFor": {
          "@id": `${siteOrigin}/#organization`,
        },
      },
    ],
  }).replace(/</g, "\\u003c");
}
