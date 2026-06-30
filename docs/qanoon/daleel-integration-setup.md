# Daleel Integration Setup

This guide wires the Qanoon365 Daleel page to the shared standalone Daleel backend so that:

- Qanoon users keep their existing Qanoon login
- Daleel inside Qanoon uses Microsoft Entra only for Daleel access
- chat history is shared with the standalone Daleel product
- SharePoint access follows the connected Microsoft identity

This setup assumes:

- Qanoon365 is hosted in the BlueRidge tenant/subscription
- standalone Daleel is already deployed and working
- the client tenant owns the Microsoft Entra app registrations and SharePoint permissions

## Step 1: Confirm the Shared Daleel Backend URL

You need the live standalone Daleel base URL.

Example:

```text
https://albasti-search-chat.wittyflower-061fbb7e.uaenorth.azurecontainerapps.io
```

Qanoon will call that backend through its own server-side proxy routes.

## Step 2: Add a Qanoon Redirect URI to the Daleel Browser App Registration

This step is done in the client tenant, not the BlueRidge tenant.

1. Switch to the client tenant in Azure Portal.
2. Open `Microsoft Entra ID`.
3. Go to `App registrations`.
4. Open the Daleel browser app registration that the standalone Daleel site already uses.
5. Click `Authentication`.
6. Under `Platform configurations`, open the `Single-page application` section.
7. Add the Qanoon Daleel redirect URI:

```text
https://qanoon365-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/daleel
```

For local development, also add:

```text
http://localhost:3000/daleel
```

8. Save.

Notes:

- Reusing the same Daleel browser app registration is the fastest first-client path.
- This lets Qanoon and standalone Daleel request the same delegated API scope and produce the same user identity for history storage.

## Step 3: Confirm the Daleel API Scope

Still in the client tenant:

1. Open the Daleel backend API app registration.
2. Click `Expose an API`.
3. Confirm the delegated scope exists and is enabled:

```text
access_as_user
```

4. Open the Daleel browser app registration again.
5. Click `API permissions`.
6. Confirm it has delegated permission to the Daleel API scope:

```text
api://<daleel-api-client-id>/access_as_user
```

If it is missing, add it from:

- `Add a permission`
- `APIs my organization uses`
- select the Daleel API app
- choose `access_as_user`

## Step 4: Add Qanoon Environment Variables

Set these in the `qanoon365-web-dev` environment:

```text
DALEEL_API_BASE_URL=https://albasti-search-chat.wittyflower-061fbb7e.uaenorth.azurecontainerapps.io
NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID=<client-tenant-id>
NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID=<daleel-browser-client-id>
NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE=api://<daleel-api-client-id>/access_as_user
NEXT_PUBLIC_DALEEL_AZURE_REDIRECT_PATH=/daleel
```

What each value is for:

- `DALEEL_API_BASE_URL`
  - server-side base URL for the shared standalone Daleel backend
- `NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID`
  - the client tenant id
- `NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID`
  - the Daleel browser app registration client id
- `NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE`
  - the delegated scope Qanoon will request for Daleel
- `NEXT_PUBLIC_DALEEL_AZURE_REDIRECT_PATH`
  - the Qanoon page that handles the Microsoft redirect after Daleel sign-in

### Which Container App Gets Which Values

For the current integration shape:

#### `qanoon365-web-dev`

Add all of these:

```text
DALEEL_API_BASE_URL=https://albasti-search-chat.wittyflower-061fbb7e.uaenorth.azurecontainerapps.io
NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID=<client-tenant-id>
NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID=<daleel-browser-client-id>
NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE=api://<daleel-api-client-id>/access_as_user
NEXT_PUBLIC_DALEEL_AZURE_REDIRECT_PATH=/daleel
```

Reason:

- the Qanoon web app renders the Daleel UI
- the Qanoon web app hosts the `/api/daleel/*` proxy routes
- the Daleel Microsoft sign-in flow runs in the Qanoon web app

#### `qanoon365-api-dev`

For the current integration, add **nothing new** for Daleel.

Reason:

- the current Daleel integration does not go through the Nest API container
- Qanoon's Daleel server-side proxy is implemented in the Next.js web app
- Microsoft token acquisition for Daleel also happens in the web app

So right now:

- `qanoon365-web-dev`: add the Daleel env vars
- `qanoon365-api-dev`: no new Daleel env vars needed

### Secret or Plain Environment Variable?

For this Daleel block, all five values are plain environment variables, not secrets:

```text
DALEEL_API_BASE_URL
NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID
NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID
NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE
NEXT_PUBLIC_DALEEL_AZURE_REDIRECT_PATH
```

## Step 5: Redeploy Qanoon Web

After the env vars are added:

1. redeploy the Qanoon web app
2. open the Qanoon Daleel page
3. sign in to Qanoon normally
4. open the Daleel page
5. click `Connect Microsoft`

Expected result:

- Microsoft sign-in completes on the Qanoon Daleel page
- the Daleel page loads shared history from the standalone backend
- a new Daleel chat started in Qanoon appears in standalone Daleel too

Current dev URL:

```text
https://qanoon365-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/daleel
```

## Step 6: Verify Shared History

Test this sequence:

1. In Qanoon Daleel, start a new chat.
2. Send a message and wait for the response.
3. Open standalone Daleel with the same Microsoft account.
4. Confirm the same chat appears in history.
5. Continue the conversation in standalone Daleel.
6. Return to Qanoon Daleel and reload history.

Expected result:

- both surfaces show the same thread id
- the same title appears
- the conversation can continue from either surface

## Step 7: Understand What Stays Separate

This integration does **not** replace Qanoon's existing auth yet.

Current behavior:

- Qanoon login remains Qanoon's own existing login/session
- Daleel inside Qanoon adds a separate Microsoft connection only for Daleel
- standalone Daleel and embedded Daleel share the same backend and history

This is intentional for the first phase because it avoids rewriting Qanoon's whole auth system.

## Step 8: Troubleshooting

### Qanoon Daleel page says auth is not configured

Check:

- `NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID`
- `NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID`
- `NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE`

### Microsoft sign-in completes but history is empty

Check:

- the user actually signed in with the same Microsoft identity used in standalone Daleel
- `DALEEL_API_BASE_URL` points to the live standalone backend
- the standalone Daleel backend is healthy

### Qanoon Daleel API routes return 500

Check:

- `DALEEL_API_BASE_URL` exists in the Qanoon server environment
- the standalone backend URL is reachable from Qanoon

### Qanoon and standalone Daleel show different histories

Check:

- both are using the same client tenant app registration and API scope
- both are hitting the same standalone Daleel deployment
- the user connected the same Microsoft account in both places
