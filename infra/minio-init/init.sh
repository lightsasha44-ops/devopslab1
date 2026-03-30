#!/bin/sh
set -eu

for i in $(seq 1 30); do
  if mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "MinIO is not ready" >&2
    exit 1
  fi
done

mc mb --ignore-existing local/shop-images
mc cp --recursive /seed/products local/shop-images
mc anonymous set download local/shop-images
