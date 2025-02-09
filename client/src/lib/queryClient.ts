import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get the correct API URL based on the environment
const protocol = window.location.protocol;
const hostname = window.location.hostname;
const port = import.meta.env.DEV ? ':5000' : '';
const BASE_URL = `${protocol}//${hostname}${port}`;

console.log('Environment:', import.meta.env.MODE);
console.log('Protocol:', protocol);
console.log('Hostname:', hostname);
console.log('Port:', port);
console.log('Final API Base URL:', BASE_URL);

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const requestUrl = `${BASE_URL}${url}`;
  console.log(`Making ${method} request to:`, requestUrl);

  try {
    const res = await fetch(requestUrl, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`Response status for ${requestUrl}:`, res.status);
    console.log('Response headers:', [...res.headers.entries()]);

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const requestUrl = `${BASE_URL}${queryKey[0]}`;
    console.log('Making query request to:', requestUrl);

    try {
      const res = await fetch(requestUrl, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      });

      console.log(`Response status for ${requestUrl}:`, res.status);
      console.log('Response headers:', [...res.headers.entries()]);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
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