const SWFR_MENSA_URL = "https://www.swfr.de/essen/mensen-cafes-speiseplaene/mensa-furtwangen";

export async function fetchSwfrMealPlanHtml() {
  const response = await fetch(SWFR_MENSA_URL);

  if (!response.ok) {
    throw new Error(`SWFR import failed with status ${response.status}`);
  }

  return response.text();
}
