const SWFR_MEAL_PLAN_API_URL = "https://www.swfr.de/apispeiseplan";
const SWFR_FURTWANGEN_LOCATION_ID = "641";
const DEFAULT_SWFR_DAYS = 6;

async function fetchText(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`SWFR import failed with status ${response.status}`);
  }

  return response.text();
}

export async function fetchSwfrMealPlanXml(days = DEFAULT_SWFR_DAYS) {
  const apiKey = process.env.MENSA_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("MENSA_API_KEY is required for SWFR meal import.");
  }

  const params = new URLSearchParams({
    type: "98",
    "tx_speiseplan_pi1[apiKey]": apiKey,
    "tx_speiseplan_pi1[ort]": SWFR_FURTWANGEN_LOCATION_ID,
    "tx_speiseplan_pi1[tage]": String(days),
  });

  return fetchText(`${SWFR_MEAL_PLAN_API_URL}?${params.toString()}`);
}
