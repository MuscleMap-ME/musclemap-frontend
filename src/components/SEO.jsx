import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEO Component - Manages all document head meta tags for optimal search engine visibility
 *
 * Features:
 * - Dynamic page titles with site name suffix
 * - Meta descriptions for each page
 * - Open Graph tags for social sharing (Facebook, LinkedIn, etc.)
 * - Twitter Card tags for Twitter sharing
 * - Canonical URLs to prevent duplicate content
 * - JSON-LD structured data for rich search results
 *
 * @param {Object} props
 * @param {string} props.title - Page title (without site name suffix)
 * @param {string} props.description - Page meta description (150-160 chars ideal)
 * @param {string} props.image - Open Graph image URL (defaults to /og-image.png)
 * @param {string} props.type - Open Graph type (website, article, product, etc.)
 * @param {Object} props.structuredData - JSON-LD structured data object
 * @param {boolean} props.noindex - If true, tells search engines not to index this page
 */
export default function SEO({
  title,
  description,
  image = '/og-image.png',
  type = 'website',
  structuredData,
  noindex = false,
}) {
  const location = useLocation();
  const siteUrl = 'https://musclemap.me';
  const siteName = 'MuscleMap';
  const defaultDescription = 'MuscleMap - See every rep. Know every muscle. Own your progress. Visual fitness tracking that shows muscle activation in real-time.';
  const twitterHandle = '@musclemapfit';

  // Full page title with site name
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} - Visual Fitness Tracking`;

  // Use provided description or default
  const metaDescription = description || defaultDescription;

  // Full canonical URL
  const canonicalUrl = `${siteUrl}${location.pathname}`;

  // Full image URL
  const ogImage = image.startsWith('http') ? image : `${siteUrl}${image}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tags
    const setMetaTag = (attribute, attributeValue, content) => {
      let element = document.querySelector(`meta[${attribute}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to update or create link tags
    const setLinkTag = (rel, href) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Basic meta tags
    setMetaTag('name', 'description', metaDescription);
    setMetaTag('name', 'author', 'MuscleMap');

    // Robots meta tag
    if (noindex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    // Canonical URL
    setLinkTag('canonical', canonicalUrl);

    // Open Graph tags
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', metaDescription);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:site_name', siteName);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
    setMetaTag('property', 'og:image:alt', title || siteName);
    setMetaTag('property', 'og:locale', 'en_US');

    // Twitter Card tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:site', twitterHandle);
    setMetaTag('name', 'twitter:creator', twitterHandle);
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', metaDescription);
    setMetaTag('name', 'twitter:image', ogImage);
    setMetaTag('name', 'twitter:image:alt', title || siteName);

    // JSON-LD Structured Data
    const existingScript = document.querySelector('script[type="application/ld+json"][data-seo]');
    if (existingScript) {
      existingScript.remove();
    }

    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Cleanup function
    return () => {
      // We don't remove meta tags on unmount to avoid flashing,
      // they'll just be updated by the next page
    };
  }, [fullTitle, metaDescription, canonicalUrl, ogImage, type, noindex, structuredData]);

  // This component doesn't render anything
  return null;
}

/**
 * Pre-built structured data generators for common page types
 */

// Organization schema for the main site
export const getOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MuscleMap',
  url: 'https://musclemap.me',
  logo: 'https://musclemap.me/logo.png',
  description: 'Visual fitness tracking that shows muscle activation in real-time.',
  sameAs: [
    'https://twitter.com/musclemapfit',
    'https://github.com/jeanpaulniko/musclemap',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: 'https://musclemap.me/issues',
  },
});

// WebSite schema with search action
export const getWebsiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MuscleMap',
  url: 'https://musclemap.me',
  description: 'Visual fitness tracking that shows muscle activation in real-time.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://musclemap.me/exercises?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
});

// SoftwareApplication schema
export const getSoftwareAppSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MuscleMap',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, iOS, Android',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description: 'Cross-platform fitness tracking application that visualizes muscle activation in real-time.',
  featureList: [
    'Real-time muscle visualization',
    'AI-powered workout generation',
    'Cross-platform sync',
    'RPG-style progression',
    'Community features',
  ],
});

// Breadcrumb schema generator
export const getBreadcrumbSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `https://musclemap.me${item.path}`,
  })),
});

// FAQ schema generator for documentation/help pages
export const getFAQSchema = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

// Article schema for blog posts/updates
export const getArticleSchema = ({ title, description, image, datePublished, dateModified, author }) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description: description,
  image: image ? `https://musclemap.me${image}` : 'https://musclemap.me/og-image.png',
  datePublished: datePublished,
  dateModified: dateModified || datePublished,
  author: {
    '@type': 'Person',
    name: author || 'MuscleMap Team',
  },
  publisher: {
    '@type': 'Organization',
    name: 'MuscleMap',
    logo: {
      '@type': 'ImageObject',
      url: 'https://musclemap.me/logo.png',
    },
  },
});

// How-To schema for guides/tutorials
export const getHowToSchema = ({ name, description, steps, totalTime }) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: name,
  description: description,
  totalTime: totalTime, // ISO 8601 duration format, e.g., "PT5M" for 5 minutes
  step: steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: step.text,
    image: step.image ? `https://musclemap.me${step.image}` : undefined,
  })),
});
