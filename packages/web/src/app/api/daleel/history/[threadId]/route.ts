import {
  proxyDaleelDelete,
  proxyDaleelGetFirstAvailable,
} from '@/lib/daleel-proxy';

export const runtime = 'nodejs';

type Params = {
  params: Promise<{
    threadId: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { threadId } = await params;
  const encodedThreadId = encodeURIComponent(threadId);
  return proxyDaleelGetFirstAvailable(request, [
    `/api/history/${encodedThreadId}`,
    `/api/history?threadId=${encodedThreadId}`,
  ]);
}

export async function DELETE(request: Request, { params }: Params) {
  const { threadId } = await params;
  return proxyDaleelDelete(request, `/api/history/${encodeURIComponent(threadId)}`);
}
