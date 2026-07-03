# Keycloak Setup

## Docker Compose

The project includes a Docker Compose file with Keycloak 25, PostgreSQL, and Mailpit:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Keycloak admin console: http://localhost:8080 (admin/admin)

## Realm configuration

Use the CLI to generate a realm config:

```bash
npx auth-cli init --output ./keycloak-realm.json
```

### Import via volume mount

Copy the generated JSON into the container's import directory:

```bash
docker cp ./keycloak-realm.json keycloak:/opt/keycloak/data/import/
docker compose -f docker/docker-compose.yml restart keycloak
```

### Import via CLI

```bash
npx auth-cli import ./keycloak-realm.json
```

### Export existing realm

```bash
npx auth-cli export --output ./exported-realm.json
```

## Required client settings

The client used by this module must be **confidential** (not public) with:

- `directAccessGrantsEnabled: true` — for password grant
- `serviceAccountsEnabled: true` — for admin API access

## SMTP in Keycloak

For email verification and other Keycloak-triggered emails, configure SMTP in the Keycloak admin console under Realm Settings → Email. This is separate from the module's email config (which handles password reset and magic link emails directly).
