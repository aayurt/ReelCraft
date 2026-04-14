#!/bin/bash
set -e

SERVER="root@217.154.58.85"
REMOTE_PATH="/var/www/ReelCraft"
LOCAL_PATH="/Users/aayurtshrestha/projects/movieGen"

echo "🚀 Starting deploy..."

# 2️⃣ SSH once to stop API, clean old DB (already synced if needed), and restart safely
ssh $SERVER "bash -c '
  source ~/.nvm/nvm.sh
  echo \"Git pull\"
  cd /var/www/ReelCraft 
  git pull origin
  
  echo \"📦 Installing dependencies...\"
  pnpm install

  echo \"🏗️ Building Next.js application...\"
  pnpm run build
  echo \"📂 Assembling Standalone folder...\"
  
  if [ -d "public" ]; then
    cp -r public .next/standalone/
    echo \"✅ Copied public/ to standalone\"
  fi

  if [ -d ".next/static" ]; then
    cp -r .next/static .next/standalone/.next/
    echo \"✅ Copied .next/static to standalone\"
  fi
  
  echo \"🛑 Removing old processes...\"
  pm2 delete ecosystem.config.js || true
  echo \"✅ Starting Reely...\"
  pm2 start ecosystem.config.js
  pm2 save
  echo \"🎉 Deploy complete!\"
'"