export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    tenantId: process.env.NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID,
    clientId: process.env.NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID,
    apiScope: process.env.NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE,
    redirectPath: process.env.NEXT_PUBLIC_DALEEL_AZURE_REDIRECT_PATH || '/daleel',
  });
}
