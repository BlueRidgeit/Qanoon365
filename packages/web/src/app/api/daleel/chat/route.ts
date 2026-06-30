import { proxyDaleelStreamPost } from '@/lib/daleel-proxy';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return proxyDaleelStreamPost(request, '/api/chat');
}
