type FreeScanType = "unregistered" | "registered";

export type FreeScanStatus = {
  type: FreeScanType;
  remaining: number;
};

let cachedStatus: FreeScanStatus | null = null;

const API_ENDPOINT = "/api/free-scans";

async function requestStatus(force = false): Promise<FreeScanStatus> {
  if (!force && cachedStatus) {
    return cachedStatus;
  }

  const response = await fetch(API_ENDPOINT, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Unable to fetch free scan status");
  }

  const data = (await response.json()) as FreeScanStatus;
  cachedStatus = data;
  return data;
}

export async function getFreeScanStatus(force = false): Promise<FreeScanStatus> {
  return requestStatus(force);
}

export async function getRemainingFreeScans(force = false): Promise<number> {
  try {
    const status = await requestStatus(force);
    return status.remaining;
  } catch (error) {
    console.error("getRemainingFreeScans error", error);
    return 0;
  }
}

export async function hasFreeScanAvailable(): Promise<boolean> {
  const remaining = await getRemainingFreeScans();
  return remaining > 0;
}

export async function decrementFreeScan(): Promise<number> {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "No free scans remaining");
  }

  const data = (await response.json()) as FreeScanStatus;
  cachedStatus = data;
  return data.remaining;
}

export async function resetFreeScans(): Promise<number> {
  const response = await fetch(API_ENDPOINT, {
    method: "PATCH",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to reset free scans");
  }

  const data = (await response.json()) as FreeScanStatus;
  cachedStatus = data;
  return data.remaining;
}

export function invalidateFreeScanCache() {
  cachedStatus = null;
}

export function shouldBypassFreeScanLimit(user: any, isPremium: boolean): boolean {
  return Boolean(user && isPremium);
}

