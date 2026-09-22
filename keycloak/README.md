# Keycloak realm import

Any `*-realm.json` file dropped in `import/` is loaded on the container's
first start (`--import-realm`). Export one from a running instance with:

```bash
docker compose exec keycloak /opt/keycloak/bin/kc.sh export \\
  --dir /opt/keycloak/data/import --users realm_file
```
