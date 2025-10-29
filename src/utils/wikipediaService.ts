/**
 * wikipediaService.ts
 * 
 * Fetches legislator images and summaries from the Wikipedia API.
 */

const WIKIPEDIA_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';

// Cache to avoid re-fetching the same Wikipedia data
const wikiCache = new Map<string, WikipediaData>();

export interface WikipediaData {
  summary: string | null;
  imageUrl: string | null;
  pageUrl: string | null;
}

/**
 * Fetches a summary and main image for a given Wikipedia page title.
 * 
 * @param pageTitle The exact title of the Wikipedia page (e.g., "Nancy_Pelosi").
 * @returns An object containing the summary, image URL, and page URL.
 */
export async function fetchWikipediaData(pageTitle: string | undefined): Promise<WikipediaData | null> {
  if (!pageTitle) {
    return null;
  }

  if (wikiCache.has(pageTitle)) {
    return wikiCache.get(pageTitle)!;
  }

  // We need to make two separate API calls: one for the summary, one for the image.
  const params = {
    action: 'query',
    format: 'json',
    prop: 'extracts|pageimages|info',
    exintro: 'true', // Get only the intro summary
    explaintext: 'true', // Get plain text, not HTML
    piprop: 'original', // Get the original, full-resolution image
    inprop: 'url', // Get the full URL to the page
    titles: pageTitle.replace(/ /g, '_'), // Ensure spaces are underscores
    origin: '*', // Required for CORS
    redirects: '1', // Automatically follow redirects
  };

  const url = `${WIKIPEDIA_API_ENDPOINT}?${new URLSearchParams(params).toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wikipedia API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];

    if (!pageId || pageId === '-1') {
      console.warn(`⚠️ Wikipedia page not found for "${pageTitle}"`);
      return null;
    }

    const page = pages[pageId];
    const result: WikipediaData = {
      summary: page.extract || null,
      imageUrl: page.original?.source || null,
      pageUrl: page.fullurl || null,
    };

    wikiCache.set(pageTitle, result);
    return result;

  } catch (error) {
    console.error(`❌ Error fetching Wikipedia data for "${pageTitle}":`, error);
    return null;
  }
}
