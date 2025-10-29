const WIKIPEDIA_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';

const wikiCache = new Map<string, WikipediaData>();

export interface WikipediaData {
  summary: string | null;
  imageUrl: string | null;
  pageUrl: string | null;
}

export async function fetchWikipediaData(pageTitle: string | undefined): Promise<WikipediaData | null> {
  if (!pageTitle) {
    return null;
  }

  if (wikiCache.has(pageTitle)) {
    return wikiCache.get(pageTitle)!;
  }

  const params = {
    action: 'query',
    format: 'json',
    prop: 'extracts|pageimages|info',
    exintro: 'true',
    explaintext: 'true',
    piprop: 'original',
    inprop: 'url',
    titles: pageTitle.replace(/ /g, '_'),
    origin: '*',
    redirects: '1',
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
