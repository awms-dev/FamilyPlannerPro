import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Use relative URLs in development
const BASE_URL = '';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Ensure URL starts with a single forward slash
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  const requestUrl = `${BASE_URL}${cleanUrl}`;
  console.log(`Making ${method} request to:`, requestUrl);

  const res = await fetch(requestUrl, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      "Accept": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Ensure URL starts with a single forward slash
    const urlPath = typeof queryKey[0] === 'string' ? queryKey[0] : '';
    const cleanUrl = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    const requestUrl = `${BASE_URL}${cleanUrl}`;
    console.log('Making query request to:', requestUrl);

    const res = await fetch(requestUrl, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('Received 401, returning null as configured');
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});