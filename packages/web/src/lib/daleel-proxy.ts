const getDaleelBaseUrl = () => {
  const value = process.env.DALEEL_API_BASE_URL?.trim();
  if (!value) {
    throw new Error('DALEEL_API_BASE_URL is not configured.');
  }

  return value.replace(/\/+$/, '');
};

const getConfiguredBaseUrl = () => {
  try {
    return getDaleelBaseUrl();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'DALEEL_API_BASE_URL is not configured.',
    };
  }
};

const getForwardHeaders = (request: Request, hasBody = false) => {
  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (authorization) {
    headers.set('authorization', authorization);
  }

  if (hasBody) {
    headers.set('content-type', contentType || 'application/json');
  }

  if (accept) {
    headers.set('accept', accept);
  }

  return headers;
};

const buildResponse = async (upstream: Response) => {
  const contentType = upstream.headers.get('content-type') || '';
  const init = {
    status: upstream.status,
    headers: contentType ? { 'content-type': contentType } : undefined,
  };

  if (contentType.includes('application/json')) {
    const body = await upstream.json().catch(() => ({}));
    return Response.json(body, init);
  }

  const text = await upstream.text().catch(() => '');
  return new Response(text, init);
};

export const proxyDaleelGet = async (request: Request, path: string) => {
  const configured = getConfiguredBaseUrl();
  if (typeof configured !== 'string') {
    return Response.json(configured, { status: 500 });
  }

  const upstream = await fetch(`${configured}${path}`, {
    method: 'GET',
    headers: getForwardHeaders(request),
    cache: 'no-store',
  });

  return buildResponse(upstream);
};

export const proxyDaleelGetFirstAvailable = async (
  request: Request,
  paths: string[],
) => {
  const configured = getConfiguredBaseUrl();
  if (typeof configured !== 'string') {
    return Response.json(configured, { status: 500 });
  }

  const headers = getForwardHeaders(request);
  let lastUpstream: Response | null = null;

  for (const path of paths) {
    const upstream = await fetch(`${configured}${path}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (upstream.ok || upstream.status !== 404) {
      return buildResponse(upstream);
    }

    lastUpstream = upstream;
  }

  if (lastUpstream) {
    return buildResponse(lastUpstream);
  }

  return Response.json({ error: 'Daleel history route unavailable.' }, { status: 500 });
};

export const proxyDaleelDelete = async (request: Request, path: string) => {
  const configured = getConfiguredBaseUrl();
  if (typeof configured !== 'string') {
    return Response.json(configured, { status: 500 });
  }

  const upstream = await fetch(`${configured}${path}`, {
    method: 'DELETE',
    headers: getForwardHeaders(request),
    cache: 'no-store',
  });

  return buildResponse(upstream);
};

export const proxyDaleelPost = async (request: Request, path: string, body: unknown) => {
  const configured = getConfiguredBaseUrl();
  if (typeof configured !== 'string') {
    return Response.json(configured, { status: 500 });
  }

  const upstream = await fetch(`${configured}${path}`, {
    method: 'POST',
    headers: getForwardHeaders(request, true),
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  return buildResponse(upstream);
};

export const proxyDaleelStreamPost = async (request: Request, path: string) => {
  const configured = getConfiguredBaseUrl();
  if (typeof configured !== 'string') {
    return Response.json(configured, { status: 500 });
  }

  const upstream = await fetch(`${configured}${path}`, {
    method: 'POST',
    headers: getForwardHeaders(request, true),
    body: request.body,
    cache: 'no-store',
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith('x-vercel-ai-')) {
      headers.set(key, value);
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
};
