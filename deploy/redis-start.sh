#!/bin/bash
docker run -d \
  --name lenda_redis \
  --restart unless-stopped \
  -p 6380:6379 \
  redis:7-alpine

echo "Redis started on port 6380"
