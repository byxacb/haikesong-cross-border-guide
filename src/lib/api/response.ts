import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';

export function ok<T>(data: T, init?: { fallback?: boolean; status?: number }) {
  const body: ApiResponse<T> = {
    success: true,
    data,
    fallback: init?.fallback ?? false,
  };

  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: init?.fallback ? { 'X-AI-Fallback': 'true' } : undefined,
  });
}

export function fail(message: string, status = 400, options?: { fallbackAvailable?: boolean }) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      fallbackAvailable: options?.fallbackAvailable,
    } satisfies ApiResponse<never>,
    { status },
  );
}

export function unwrapApiData<T>(response: ApiResponse<T> | T): T {
  if (response && typeof response === 'object' && 'success' in response) {
    return (response as ApiResponse<T>).data as T;
  }

  return response as T;
}
