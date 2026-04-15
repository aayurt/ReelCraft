#!/bin/bash
set -e

SERVER="root@217.154.58.85"
REMOTE_PATH="/var/www/ReelCraft"
LOCAL_PATH="/Users/aayurtshrestha/projects/movieGen"

echo "🚀 Starting deploy..."

# echo "📄 Copying .env to server..."
# rsync -avz "$LOCAL_PATH/.env" "$SERVER:$REMOTE_PATH/.env"

# echo "🤖 Copying qwen-automate folder to server..."
# rsync -avz --exclude='auth_states/' --exclude='outputs/' --exclude='verify/' --exclude='error_screenshot.png' --exclude='node_modules/' "$LOCAL_PATH/qwen-automate/" "$SERVER:$REMOTE_PATH/qwen-automate/"

# echo "📁 Syncing uploads to server..."
# rsync -avz "$LOCAL_PATH/uploads/" "$SERVER:$REMOTE_PATH/uploads/"

# SSH: pull, build, and restart
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
  
  echo \"✅ Starting Reely...\"
  pm2 delete ecosystem.config.js
  pm2 start ecosystem.config.js

  pm2 save
  echo \"🎉 Deploy complete!\"
'"