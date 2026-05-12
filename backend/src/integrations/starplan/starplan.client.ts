const STARPLAN_BASE_URL = "https://splan.hs-furtwangen.de/starplan";

export async function fetchStarPlanJson<T>(path: string): Promise<T[]> {
  const response = await fetch(`${STARPLAN_BASE_URL}/${path}`);

  if (!response.ok) {
    throw new Error(`StarPlan request failed with status ${response.status}`);
  }

  const text = await response.text();
  const parsed = JSON.parse(text) as [T[]] | T[];
  return Array.isArray(parsed[0]) ? (parsed[0] as T[]) : (parsed as T[]);
}

export async function fetchStarPlanTimetableHtml(params: URLSearchParams) {
  const response = await fetch(`${STARPLAN_BASE_URL}/json?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`StarPlan timetable failed with status ${response.status}`);
  }

  return response.text();
}
