import { DAY_NAMES, dateForDay, parseDateInput } from "../../shared/date-utils";

type SwfrMeal = { date: Date; day: string; mainDish: string; priceCents: number; vegetarianDish: string | null };

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß");
}

export function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGermanPrice(value: string) {
  const match = value.match(/(\d+),(\d{2})\s*(?:€|EUR|â‚¬)/i);
  return match ? Number(match[1]) * 100 + Number(match[2]) : 0;
}

function attributeValue(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function tagValue(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function parseSwfrDateInput(value: string) {
  const trimmed = value.trim();
  const germanDateMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (germanDateMatch) {
    return new Date(Number(germanDateMatch[3]), Number(germanDateMatch[2]) - 1, Number(germanDateMatch[1]));
  }

  return parseDateInput(trimmed);
}

function parseSwfrXmlMeals(xml: string) {
  const dayRegex = /<tagesplan\b([^>]*)>([\s\S]*?)<\/tagesplan>/gi;
  const meals: SwfrMeal[] = [];

  for (const dayMatch of xml.matchAll(dayRegex)) {
    const dateInput = attributeValue(dayMatch[1], "datum");
    const date = parseSwfrDateInput(dateInput);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    date.setHours(12, 0, 0, 0);
    const day = DAY_NAMES[date.getDay()];
    const menuRegex = /<menue\b([^>]*)>([\s\S]*?)<\/menue>/gi;

    for (const menuMatch of dayMatch[2].matchAll(menuRegex)) {
      const title = tagValue(menuMatch[2], "nameMitUmbruch") || tagValue(menuMatch[2], "name");

      if (!title || /heute keine essensausgabe/i.test(title)) {
        continue;
      }

      const label = attributeValue(menuMatch[1], "art") || "Essen";
      const flags = attributeValue(menuMatch[1], "zusatz").toLowerCase();

      meals.push({
        date,
        day,
        mainDish: `${label}: ${title}`,
        priceCents: parseGermanPrice(tagValue(menuMatch[2], "studierende")),
        vegetarianDish: flags.includes("vegetarisch") || flags.includes("pflanzlich") ? title : null,
      });
    }
  }

  return meals;
}

export function parseSwfrMeals(html: string) {
  if (/<plan\b/i.test(html) && /<tagesplan\b/i.test(html)) {
    return parseSwfrXmlMeals(html);
  }

  const planStart = html.indexOf("Aktueller Speiseplan");
  const planEnd = html.indexOf("Legende", planStart);
  const planHtml = html.slice(planStart, planEnd > planStart ? planEnd : undefined);
  const dayRegex = /<h3[^>]*>\s*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\s+(\d{2}\.\d{2}\.)\s*<\/h3>/gi;
  const dayMatches = [...planHtml.matchAll(dayRegex)];
  const meals: SwfrMeal[] = [];

  for (let index = 0; index < dayMatches.length; index += 1) {
    const match = dayMatches[index];
    const nextMatch = dayMatches[index + 1];
    const day = match[1];
    const date = dateForDay(day, match[2]);
    const section = planHtml.slice((match.index ?? 0) + match[0].length, nextMatch?.index ?? planHtml.length);
    const dishRegex = /<h5[^>]*>([\s\S]*?)<\/h5>([\s\S]*?)(?=<div class="col-span-1|<h3|$)/gi;
    const dishMatches = [...section.matchAll(dishRegex)];

    for (const dishMatch of dishMatches) {
      const heading = stripHtml(dishMatch[1]);
      const label = heading.match(/Essen\s+\d+/i)?.[0] ?? "Essen";
      const flags = heading.toLowerCase();
      const body = dishMatch[2];
      const smallMatch = body.match(/<small[^>]*class="[^"]*extra-text[^"]*"[^>]*>([\s\S]*?)<\/small>/i);
      const title = smallMatch
        ? smallMatch[1]
            .replace(/<br\s*\/?>/gi, ", ")
            .split(",")
            .map((line) => stripHtml(line))
            .filter(Boolean)
            .join(", ")
        : "";

      if (!title || /heute keine essensausgabe/i.test(title)) {
        continue;
      }

      const priceText = stripHtml(body.slice(body.search(/Studierende/iu)));
      meals.push({
        date,
        day,
        mainDish: `${label}: ${title}`,
        priceCents: parseGermanPrice(priceText),
        vegetarianDish: flags.includes("vegetarisch") || flags.includes("pflanzlich") ? title : null,
      });
    }
  }

  return meals;
}
