# Qanoon Entra Auth Setup

This guide replaces the old Qanoon email/password login flow with Microsoft Entra sign-in while keeping Qanoon's internal JWT session model behind the scenes.

The goal is:
- users sign in to Qanoon with Microsoft once
- Daleel inside Qanoon reuses that same Microsoft browser session silently
- Qanoon API still issues its own internal session tokens, so existing guards and API clients keep working

## Step 1: Decide the Tenant and Browser App Strategy

For the current Al Basti deployment, use the **client tenant** for user sign-in so Qanoon and Daleel share the same Microsoft identity.

Recommended browser app strategy:
- reuse the **same Microsoft Entra browser app registration already used by Daleel**
- add Qanoon's login redirect URI to that same browser app

That is what gives you the seamless one-sign-in experience.

Current live URLs:
- Qanoon web dev: `https://qanoon365-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io`
- Qanoon Daleel route: `https://qanoon365-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/daleel`
- Qanoon login route: `https://qanoon365-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/login`
- Standalone Daleel: `https://albasti-search-chat.wittyflower-061fbb7e.uaenorth.azurecontainerapps.io`

## Step 2: Update the Browser App Registration

This is done in the **client tenant**.

1. Open **Microsoft Entra ID** in Azure Portal.
2. Go to **App registrations**.
3. Open the browser app registration used by Daleel.
4. Click **Authentication**.
5. Under **Platform configurations**, make sure the **Single-page application** platform exists.
6. Add this redirect URI:

```text
https://qanoon365-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/login
```

7. Keep the existing standalone Daleel redirect URIs.
8. Save.

Optional but recommended:
- add the same `/login` URL as the post-logout return if your app registration UI exposes it

## Step 3: Create or Confirm the Qanoon API App Registration

This is also in the **client tenant**.

1. Open **Microsoft Entra ID**.
2. Go to **App registrations**.
3. Create a new app registration for the Qanoon API if one does not already exist.
4. Name it something like:

```text
Qanoon365 API
```

5. Supported account type:
- `Accounts in this organizational directory only`

6. After creation, open **Expose an API**.
7. Set the **Application ID URI** to:

```text
api://<QANOON_API_APP_CLIENT_ID>
```

8. Add a scope:
- Scope name: `access_as_user`
- Who can consent: `Admins and users`
- Admin consent display name: `Access Qanoon365 API`
- Admin consent description: `Allows the browser app to access Qanoon365 on behalf of the signed-in user.`
- State: `Enabled`

9. Save.

## Step 4: Add the Qanoon API Permission to the Browser App

Still in the **client tenant**:

1. Open the shared browser app registration.
2. Go to **API permissions**.
3. Click **Add a permission**.
4. Choose **My APIs**.
5. Select **Qanoon365 API**.
6. Choose the delegated permission:

```text
access_as_user
```

7. Add the permission.
8. Click **Grant admin consent** if your tenant requires it.

Important:
- keep the existing Daleel delegated API permission on the same browser app
- the browser app should be able to request both:
  - Qanoon API scope
  - Daleel API scope

## Step 5: Set Environment Variables on `qanoon365-web-dev`

These go in the **Qanoon web container app**, not the API container.

Open:
- `Container Apps`
- `qanoon365-web-dev`
- `Containers`
- `Environment variables`

Add these plain environment variables:

```text
NEXT_PUBLIC_AZURE_TENANT_ID=<CLIENT_TENANT_ID>
NEXT_PUBLIC_AZURE_CLIENT_ID=<SHARED_BROWSER_APP_CLIENT_ID>
NEXT_PUBLIC_AZURE_API_SCOPE=api://<QANOON_API_APP_CLIENT_ID>/access_as_user
NEXT_PUBLIC_AZURE_REDIRECT_PATH=/login
```

Keep these existing Daleel variables as well:

```text
DALEEL_API_BASE_URL=https://albasti-search-chat.wittyflower-061fbb7e.uaenorth.azurecontainerapps.io
NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID=<CLIENT_TENANT_ID>
NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID=<SHARED_BROWSER_APP_CLIENT_ID>
NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE=api://<DALEEL_API_APP_CLIENT_ID>/access_as_user
NEXT_PUBLIC_DALEEL_AZURE_REDIRECT_PATH=/daleel
```

Important:
- for seamless sign-in, `NEXT_PUBLIC_AZURE_CLIENT_ID` and `NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID` should be the **same browser app client id**
- likewise, the tenant ids should be the same

Save as a new revision.

## Step 6: Set Environment Variables on `qanoon365-api-dev`

These go in the **Qanoon API container app**.

Open:
- `Container Apps`
- `qanoon365-api-dev`
- `Containers`
- `Environment variables`

Add these plain environment variables:

```text
AZURE_ENTRA_TENANT_ID=<CLIENT_TENANT_ID>
AZURE_ENTRA_QANOON_API_CLIENT_ID=<QANOON_API_APP_CLIENT_ID>
AZURE_ENTRA_QANOON_API_AUDIENCE=api://<QANOON_API_APP_CLIENT_ID>
AZURE_ENTRA_QANOON_SCOPE_NAME=access_as_user
AUTH_DEFAULT_TENANT_ID=default
AUTH_DEFAULT_ROLE=lawyer
AUTH_AUTO_PROVISION_MICROSOFT_USERS=false
```

Recommended starting value:
- `AUTH_AUTO_PROVISION_MICROSOFT_USERS=false`

That means:
- only users already provisioned in Qanoon can sign in
- the API links them by email

If you later want automatic creation of Qanoon users from Microsoft sign-in:

```text
AUTH_AUTO_PROVISION_MICROSOFT_USERS=true
```

Save as a new revision.

## Step 7: Manual User Provisioning

If `AUTH_AUTO_PROVISION_MICROSOFT_USERS=false`, the user's Microsoft email must already exist in Qanoon's `users` table.

For the current app, users live in:

```text
tenant_default.users
```

You can either:
- update an existing row so the email matches the Microsoft account exactly
- or insert a new row manually

Example update:

```sql
UPDATE tenant_default.users
SET email = 'user@albasti.dev'
WHERE email = 'old-email@albasti.dev';
```

Example insert:

```sql
INSERT INTO tenant_default.users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  tenant_id,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'user@albasti.dev',
  '$2b$10$jmofMCG6E/6TnORol7fX6umzzb4SQbp/cNP3kKQ09H7.XcyLSCE7G',
  'First',
  'Last',
  'lawyer',
  'default',
  true,
  now(),
  now()
);
```

Notes:
- `password_hash` still needs a valid bcrypt string even though the user will sign in with Microsoft
- the example hash above is only a filler for Microsoft-only users and is not meant to be shared as a real password

## Step 8: Redeploy and Test

After both container apps pick up the new revisions:

1. Open:

```text
https://qanoon365-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/login
```

2. Sign in with Microsoft.
3. Confirm you land back inside Qanoon.
4. Open Daleel inside Qanoon.
5. Confirm Daleel does not prompt for a second Microsoft sign-in.
6. Confirm Daleel history loads using the same Microsoft user.

## Expected Result

After this setup:
- Qanoon users sign in with Microsoft only
- Qanoon API still uses its own internal JWT session tokens after Microsoft sign-in
- Daleel inside Qanoon silently reuses the same browser Microsoft session
- the old email/password login page is no longer the active path
