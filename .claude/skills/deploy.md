# /deploy — Deploy Al Basti to Azure

Deploy the Al Basti application to Azure Container Apps on `rg-albasti-dev`.

## Instructions

When the user runs `/deploy`, perform the following steps:

### 1. Check for pending database migrations

```bash
cd packages/api
DATABASE_URL="postgresql://albastiAdmin:<PG_PASSWORD_REDACTED>@albasti-pg-dev.postgres.database.azure.com:5432/albasti?sslmode=require" \
  npx prisma migrate deploy
```

### 2. Determine next image tags

Check the current tags:
```bash
az acr task list-runs --registry albasticr --query "[0:4].{Status:status, Image:outputImages[0].tag}" -o table
```

Also check what's currently running:
```bash
az containerapp show -g rg-albasti-dev -n albasti-api-dev --query "properties.template.containers[0].image" -o tsv
az containerapp show -g rg-albasti-dev -n albasti-web-dev --query "properties.template.containers[0].image" -o tsv
```

Increment the version number for each image (e.g., v7 → v8, v12 → v13).

### 3. Build Docker images in ACR

Run both builds in parallel from the **repository root**:

```bash
# API
az acr build --registry albasticr \
  --image albasti-api:<NEXT_API_TAG> \
  --file packages/api/Dockerfile .

# Web (must pass API URL as build arg)
az acr build --registry albasticr \
  --image albasti-web:<NEXT_WEB_TAG> \
  --file packages/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL="https://albasti-api-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/api" .
```

**Note**: On Windows the CLI log stream may crash with a `UnicodeEncodeError` — this is cosmetic. Verify build status with:
```bash
az acr task list-runs --registry albasticr --query "[0:2].{Status:status, Image:outputImages[0].tag}" -o table
```

### 4. Update Container Apps

```bash
az containerapp update \
  --resource-group rg-albasti-dev \
  --name albasti-api-dev \
  --image albasticr.azurecr.io/albasti-api:<NEXT_API_TAG>

az containerapp update \
  --resource-group rg-albasti-dev \
  --name albasti-web-dev \
  --image albasticr.azurecr.io/albasti-web:<NEXT_WEB_TAG>
```

### 5. Verify deployment

```bash
# API health
curl -s https://albasti-api-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/health

# Web — check for 200 status and NO localhost redirect
curl -s -o /dev/null -w "%{http_code} %{redirect_url}" \
  https://albasti-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io/

# Confirm containers are running
az containerapp show -g rg-albasti-dev -n albasti-api-dev --query "{status:properties.runningStatus, image:properties.template.containers[0].image}" -o table
az containerapp show -g rg-albasti-dev -n albasti-web-dev --query "{status:properties.runningStatus, image:properties.template.containers[0].image}" -o table
```

### 6. Report results

Tell the user:
- Migration status
- Image tags deployed (API and Web)
- API health check result
- Web status code (should be 200, not redirect)
- Links to both apps

### Rollback

If something breaks:
```bash
az containerapp update -g rg-albasti-dev -n albasti-api-dev --image albasticr.azurecr.io/albasti-api:<PREVIOUS_TAG>
az containerapp update -g rg-albasti-dev -n albasti-web-dev --image albasticr.azurecr.io/albasti-web:<PREVIOUS_TAG>
```

## Key Details

- Resource group: `rg-albasti-dev`
- Container registry: `albasticr.azurecr.io`
- API container app: `albasti-api-dev`
- Web container app: `albasti-web-dev`
- API FQDN: `albasti-api-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io`
- Web FQDN: `albasti-web-dev.victoriousdesert-c704d4be.eastus2.azurecontainerapps.io`
- DB: `albasti-pg-dev.postgres.database.azure.com` / user: `albastiAdmin`
- NEVER use App Service or ZIP deployment — Container Apps only
