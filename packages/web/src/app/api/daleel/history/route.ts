import { proxyDaleelGet } from '@/lib/daleel-proxy';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get('locale');
  const threadId = url.searchParams.get('threadId');
  const queryParams = new URLSearchParams();

  if (locale) {
    queryParams.set('locale', locale);
  }

  if (threadId) {
    queryParams.set('threadId', threadId);
  }

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return proxyDaleelGet(request, `/api/history${query}`);
}
