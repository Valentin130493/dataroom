'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SignInInput, SignUpInput } from '@dataroom/shared';
import { authApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-keys';

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useAuthConfig() {
  return useQuery({
    queryKey: queryKeys.authConfig,
    queryFn: authApi.config,
    staleTime: Infinity,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: SignInInput) => authApi.signIn(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.session, user);
      router.replace('/rooms');
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: SignUpInput) => authApi.signUp(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.session, user);
      router.replace('/rooms');
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authApi.signOut(),
    onSuccess: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });
}
