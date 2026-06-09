export type HfuContactPerson = {
  campus?: string | null;
  department?: string | null;
  email?: string | null;
  faculty?: string | null;
  fullName: string;
  function?: string | null;
  id: string;
  institution?: string | null;
  phone?: string | null;
  profileUrl: string;
  role?: string | null;
  room?: string | null;
  sourceUrl: string;
  tags: string[];
  title?: string | null;
};

export type HfuContactFilter = {
  category: "faculty" | "service" | "function";
  count: number;
  id: string;
  label: string;
  solrFilter: string;
};

export type HfuContactsResult = {
  contacts: HfuContactPerson[];
  filters: HfuContactFilter[];
  hasMore: boolean;
  sourceUrl: string;
  totalCount: number;
};

const HFU_PEOPLE_URL = "https://www.hs-furtwangen.de/personen";
const AJAX_TYPE = "7384";
const PAGE_SIZE = 30;
const MAX_PAGES = 30;
const cache = new Map<string, { expiresAt: number; value: HfuContactsResult }>();
const htmlCache = new Map<string, { expiresAt: number; value: string }>();

function cleanText(value?: string | null) {
  return decodeHtml(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&auml;/g, "ae")
    .replace(/&ouml;/g, "oe")
    .replace(/&uuml;/g, "ue")
    .replace(/&Auml;/g, "Ae")
    .replace(/&Ouml;/g, "Oe")
    .replace(/&Uuml;/g, "Ue")
    .replace(/&szlig;/g, "ss")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function rotateChar(code: number, start: number, end: number, offset: number) {
  const nextCode = code + offset;

  if (offset > 0 && nextCode > end) {
    return String.fromCharCode(start + (nextCode - end - 1));
  }

  if (offset < 0 && nextCode < start) {
    return String.fromCharCode(end - (start - nextCode - 1));
  }

  return String.fromCharCode(nextCode);
}

export function decodeProtectedEmail(token?: string | null, vector?: string | null) {
  if (!token || !vector) {
    return null;
  }

  const offset = Number.parseInt(vector, 10) * -1;

  if (Number.isNaN(offset)) {
    return null;
  }

  let decoded = "";

  for (let index = 0; index < token.length; index += 1) {
    const code = token.charCodeAt(index);

    if (code >= 43 && code <= 58) {
      decoded += rotateChar(code, 43, 58, offset);
    } else if (code >= 64 && code <= 90) {
      decoded += rotateChar(code, 64, 90, offset);
    } else if (code >= 97 && code <= 122) {
      decoded += rotateChar(code, 97, 122, offset);
    } else {
      decoded += token.charAt(index);
    }
  }

  return decoded.replace(/^mailto:/, "");
}

function getTotalCount(html: string) {
  const match = html.match(/<span class="o-highlight-text">([^<]+)/);
  return match ? Number.parseInt(cleanText(match[1]).replace(/\D/g, ""), 10) : 0;
}

function categoryFromFilter(solrFilter: string): HfuContactFilter["category"] | null {
  if (solrFilter.startsWith("fFaC:")) {
    return "faculty";
  }

  if (solrFilter.startsWith("fSeC:")) {
    return "service";
  }

  if (solrFilter.startsWith("fFnC:")) {
    return "function";
  }

  return null;
}

export function parseHfuFilters(html: string) {
  const filters: HfuContactFilter[] = [];
  const regex =
    /<a class="c-facet-option solr-ajaxified"\s+href="[^"]*tx_solr%5Bfilter%5D%5B0%5D=([^"]+)">([\s\S]*?)<span class="c-facet-option__count">([^<]+)<\/span>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html))) {
    const solrFilter = decodeURIComponent(match[1]);
    const category = categoryFromFilter(solrFilter);

    if (!category) {
      continue;
    }

    const label = cleanText(match[2].replace(/<[^>]+>/g, ""));
    const count = Number.parseInt(cleanText(match[3]), 10);

    filters.push({
      category,
      count: Number.isNaN(count) ? 0 : count,
      id: solrFilter,
      label,
      solrFilter,
    });
  }

  return filters;
}

function splitName(fullName: string) {
  const titleMatch = fullName.match(/^((?:(?:Prof\.|Dr\.|rer\.|nat\.|pol\.|Ing\.|-Ing\.|\(Ph\.D\.\))\s*)+)/);
  const title = titleMatch ? cleanText(titleMatch[1]) : null;

  return { title };
}

export function parseHfuContactsHtml(html: string, sourceUrl = HFU_PEOPLE_URL, activeFilter?: HfuContactFilter | null) {
  const contacts: HfuContactPerson[] = [];
  const articleRegex = /<article class="c-card c-card--outline c-card--no-image">([\s\S]*?)<\/article>/g;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(html))) {
    const article = match[1];
    const linkMatch = article.match(/<a class="c-card__link"\s+href="([^"]+)">\s*([\s\S]*?)\s*<\/a>/);

    if (!linkMatch) {
      continue;
    }

    const profileUrl = cleanText(linkMatch[1]);
    const fullName = cleanText(linkMatch[2].replace(/<[^>]+>/g, ""));
    const id = profileUrl.match(/\/profil\/([^/?#]+)/)?.[1] ?? profileUrl;
    const phone = cleanText(article.match(/href="tel:[^"]+">([^<]+)<\/a>/)?.[1] ?? "") || null;
    const mailMatch = article.match(/data-mailto-token="([^"]+)"\s+data-mailto-vector="([^"]+)"/);
    const email = mailMatch ? decodeProtectedEmail(mailMatch[1], mailMatch[2]) : null;
    const { title } = splitName(fullName);
    const tags = activeFilter ? [activeFilter.label] : [];

    contacts.push({
      email,
      faculty: activeFilter?.category === "faculty" ? activeFilter.label : null,
      fullName,
      function: activeFilter?.category === "function" ? activeFilter.label : null,
      id,
      institution: activeFilter?.category === "service" ? activeFilter.label : null,
      phone,
      profileUrl,
      role: activeFilter?.category === "function" ? activeFilter.label : null,
      sourceUrl,
      tags,
      title,
    });
  }

  return contacts;
}

function contactsUrl(page: number, solrFilter?: string | null) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("tx_solr[page]", String(page));
  }

  if (solrFilter) {
    params.set("tx_solr[filter][0]", solrFilter);
  }

  params.set("type", AJAX_TYPE);
  return `${HFU_PEOPLE_URL}?${params.toString()}`;
}

async function fetchHtml(url: string) {
  const cached = htmlCache.get(url);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "StudentGo/1.0 HFU contacts importer",
    },
  });

  if (!response.ok) {
    throw new Error(`HFU contacts request failed with status ${response.status}`);
  }

  const html = await response.text();

  htmlCache.set(url, { expiresAt: Date.now() + 30 * 60 * 1000, value: html });
  return html;
}

function uniqueContacts(contacts: HfuContactPerson[]) {
  return contacts.filter((contact, index, candidates) => candidates.findIndex((candidate) => candidate.id === contact.id) === index);
}

export function filterHfuContacts(contacts: HfuContactPerson[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return contacts;
  }

  return contacts.filter((contact) =>
    [
      contact.fullName,
      contact.title,
      contact.role,
      contact.function,
      contact.faculty,
      contact.department,
      contact.institution,
      contact.campus,
      contact.email,
      contact.phone,
      contact.room,
      ...contact.tags,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery)),
  );
}

type ListHfuContactsOptions = {
  limit?: number;
  offset?: number;
};

export async function listHfuContacts(solrFilter?: string | null, activeFilterFallback?: HfuContactFilter | null, options: ListHfuContactsOptions = {}) {
  const requestedOffset = Number.isFinite(options.offset) ? options.offset! : 0;
  const requestedLimit = Number.isFinite(options.limit) ? options.limit! : 10;
  const offset = Math.max(0, requestedOffset);
  const limit = Math.min(50, Math.max(1, requestedLimit));
  const cacheKey = `${solrFilter ?? "all"}:${offset}:${limit}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const firstPageUrl = contactsUrl(1, solrFilter);
  const firstPageHtml = await fetchHtml(firstPageUrl);
  const filters = parseHfuFilters(firstPageHtml);
  const activeFilter = solrFilter ? filters.find((filter) => filter.solrFilter === solrFilter) ?? activeFilterFallback ?? null : null;
  const totalCount = getTotalCount(firstPageHtml);
  const pageCount = Math.min(MAX_PAGES, Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));
  const startPage = Math.min(pageCount, Math.floor(offset / PAGE_SIZE) + 1);
  const endPage = Math.min(pageCount, Math.floor((offset + limit - 1) / PAGE_SIZE) + 1);
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_value, index) => startPage + index);
  const pageUrls = pageNumbers.map((page) => contactsUrl(page, solrFilter));
  const pageHtml = await Promise.all(pageUrls.map((url) => (url === firstPageUrl ? firstPageHtml : fetchHtml(url))));
  const contacts = uniqueContacts(pageHtml.flatMap((html, index) => parseHfuContactsHtml(html, pageUrls[index], activeFilter))).slice(
    offset - (startPage - 1) * PAGE_SIZE,
    offset - (startPage - 1) * PAGE_SIZE + limit,
  );
  const value = { contacts, filters, hasMore: offset + contacts.length < totalCount, sourceUrl: HFU_PEOPLE_URL, totalCount };

  cache.set(cacheKey, { expiresAt: Date.now() + 30 * 60 * 1000, value });
  return value;
}
