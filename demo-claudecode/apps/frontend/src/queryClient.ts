import { QueryClient } from "@tanstack/react-query";
import { retryDelay, shouldRetry } from "@/utils/apiErrors";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: shouldRetry, retryDelay },
    },
  });
