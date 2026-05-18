const SWFR_MENSA_URL = "https://www.swfr.de/essen/mensen-cafes-speiseplaene/mensa-furtwangen";
const DEFAULT_FUTURE_SWFR_WEEKS = 1;

async function fetchHtml(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`SWFR import failed with status ${response.status}`);
  }

  return response.text();
}

function decodeAttribute(value: string) {
  return value.replace(/&amp;/g, "&");
}

function nextWeekUrl(html: string, baseUrl: string) {
  const match = html.match(/<a[^>]*class="[^"]*\bnext-week\b[^"]*"[^>]*href="([^"]+)"/i);
  return match ? new URL(decodeAttribute(match[1]), baseUrl).toString() : null;
}

export async function fetchSwfrMealPlanHtml() {
  return fetchHtml(SWFR_MENSA_URL);
}

export async function fetchSwfrMealPlanHtmlPages(futureWeeks = DEFAULT_FUTURE_SWFR_WEEKS) {
  const pages: string[] = [];
  const visitedUrls = new Set<string>();
  let nextUrl: string | null = SWFR_MENSA_URL;

  for (let index = 0; nextUrl && index <= futureWeeks; index += 1) {
    if (visitedUrls.has(nextUrl)) {
      break;
    }

    visitedUrls.add(nextUrl);
    const html = await fetchHtml(nextUrl);
    pages.push(html);
    nextUrl = nextWeekUrl(html, nextUrl);
  }

  return pages;
}
