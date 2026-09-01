#!/bin/sh
# Generates a self-signed cert on first boot (TLS option A, ADR-0003). Runs via
# nginx:alpine's /docker-entrypoint.d/ hook before nginx starts. The cert lives
# on the `web-certs` volume so it survives restarts. Browsers will warn once
# for the untrusted cert — expected for local Compose.
set -e

CERT_DIR=/etc/nginx/certs
CERT="$CERT_DIR/server.crt"
KEY="$CERT_DIR/server.key"

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
  echo "generating self-signed certificate for localhost"
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
    -keyout "$KEY" -out "$CERT" \
    -subj "/CN=localhost/O=Web Music Player (local dev)" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
fi
