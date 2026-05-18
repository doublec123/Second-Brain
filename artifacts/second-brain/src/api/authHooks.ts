import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Shared fetch helper — redirects to /login on any 401
// ---------------------------------------------------------------------------

// Cache the session promise to prevent 429 rate limits when multiple queries mount concurrently
let sessionPromise: Promise<any> | null = null;
let sessionPromiseTime = 0;

async function getCachedSession() {
  const now = Date.now();
  // Cache the session promise for 2 seconds to coalesce concurrent requests
  if (!sessionPromise || now - sessionPromiseTime > 2000) {
    sessionPromise = supabase.auth.getSession();
    sessionPromiseTime = now;
  }
  return sessionPromise;
}

async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await getCachedSession();
  const token = session?.access_token;

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    // Hard redirect — clears all in-memory state automatically
    window.location.href = "/login";
    // Never-resolving promise so callers don't continue after a 401
    return new Promise(() => {});
  }
  return response;
}

// ---------------------------------------------------------------------------
// Auth hooks (use Supabase)
// ---------------------------------------------------------------------------

export const useLogin = () => {
  return useMutation({
    mutationFn: async ({ data }: any) => {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Sync with our backend to ensure user exists in our DB and get their local profile
      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${authData.session.access_token}` }
      });
      
      if (!response.ok) {
        throw new Error("Failed to sync user with backend");
      }

      return response.json();
    },
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: async ({ data }: any) => {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          }
        }
      });

      if (error) throw error;

      let session = authData.session;
      if (!session) {
        // Auto-login fallback: force sign-in immediately to acquire session
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (loginError) throw loginError;
        session = loginData.session;
      }

      if (!session) {
        throw new Error("Failed to establish active user session");
      }

      // Sync with our backend
      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) {
        throw new Error("Failed to sync user with backend");
      }

      return response.json();
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Also notify backend to clear session if it's still using it
      await fetch("/api/auth/logout", { method: "POST" });
    },
  });
};

export const useGetMe = () => {
  return useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) return null;

      // Check if the session is expired
      const isExpired = session.expires_at ? (session.expires_at * 1000 < Date.now()) : false;
      if (isExpired) {
        return null;
      }

      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });

      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error("Failed to get user");
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ---------------------------------------------------------------------------
// Data hooks (use apiFetch — any 401 redirects to /login)
// ---------------------------------------------------------------------------

export const useListCategories = () => {
  return useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await apiFetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });
};

export const useListGroups = (params?: { categoryId?: number }) => {
  return useQuery({
    queryKey: ["/api/groups", params?.categoryId],
    queryFn: async () => {
      const url = params?.categoryId
        ? `/api/groups?categoryId=${params.categoryId}`
        : "/api/groups";
      const response = await apiFetch(url);
      if (!response.ok) throw new Error("Failed to fetch groups");
      return response.json();
    },
  });
};

export const useAdminListUsers = () => {
  return useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiFetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });
};

export const useAdminGetStats = () => {
  return useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await apiFetch("/api/admin/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; color?: string; icon?: string }) => {
      const response = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      const response = await apiFetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete category");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });
};
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; icon: string } }) => {
      const response = await apiFetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });
};
