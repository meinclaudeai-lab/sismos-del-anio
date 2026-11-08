import { TIMEOUT_MS, USER_AGENT } from "./config";

export class FuenteError extends Error {
  constructor(public fuente: string, message: string) {
    super(`${fuente}: ${message}`);
  }
}

/** fetch con tiempo de espera, User-Agent descriptivo y caché de Next (ISR). */
export async function pedir(
  fuente: string,
  url: string,
  revalidate: number,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate },
  } as RequestInit);
  if (!res.ok) throw new FuenteError(fuente, `HTTP ${res.status}`);
  return res;
}

export async function pedirJSON(fuente: string, url: string, revalidate: number): Promise<unknown> {
  return (await pedir(fuente, url, revalidate)).json();
}

export async function pedirTexto(fuente: string, url: string, revalidate: number): Promise<string> {
  return (await pedir(fuente, url, revalidate)).text();
}
