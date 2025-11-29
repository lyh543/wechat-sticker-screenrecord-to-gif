#!/bin/bash

set -e
set +x

pnpm build
rm -rf /etc/caddy/html/wechat-stickers-new
cp -r dist /etc/caddy/html/wechat-stickers-new
if [ -d /etc/caddy/html/wechat-stickers ]; then
  mv /etc/caddy/html/wechat-stickers /etc/caddy/html/wechat-stickers-old
fi
mv /etc/caddy/html/wechat-stickers-new /etc/caddy/html/wechat-stickers
rm -rf /etc/caddy/html/wechat-stickers-old
