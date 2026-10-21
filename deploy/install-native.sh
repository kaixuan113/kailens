#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/kailens

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx python3-venv

python3 -m venv "$APP_DIR/backend/.venv"
"$APP_DIR/backend/.venv/bin/pip" install --no-cache-dir \
  -i https://mirrors.aliyun.com/pypi/simple/ \
  -r "$APP_DIR/backend/requirements.txt"

install -d -o www-data -g www-data "$APP_DIR/backend/data" "$APP_DIR/backend/uploads"
chown -R www-data:www-data "$APP_DIR/backend/data" "$APP_DIR/backend/uploads"

install -m 644 "$APP_DIR/deploy/kailens-api.service" /etc/systemd/system/kailens-api.service
install -m 644 "$APP_DIR/deploy/kailens-nginx.conf" /etc/nginx/sites-available/kailens
ln -sfn /etc/nginx/sites-available/kailens /etc/nginx/sites-enabled/kailens
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
systemctl enable --now kailens-api
nginx -t
systemctl enable --now nginx
systemctl restart nginx
