# CLI Reference

The `auth-cli` tool helps manage Keycloak realm configuration.

## Installation

The CLI is included with the package:

```bash
npx auth-cli --help
```

## Commands

### init

Interactive wizard to create a Keycloak realm JSON file:

```bash
npx auth-cli init --output ./keycloak-realm.json
```

Prompts for:
- Realm name
- Keycloak server URL
- Admin credentials
- Client ID and secret
- Redirect URIs
- SMTP configuration

### export

Export a realm from a running Keycloak instance:

```bash
npx auth-cli export --output ./exported-realm.json
```

Requires `KEYCLOAK_SERVER_URL` and admin credentials in environment.

### import

Import a realm JSON into a running Keycloak instance:

```bash
npx auth-cli import ./keycloak-realm.json
```

Creates or updates the realm and its clients.
