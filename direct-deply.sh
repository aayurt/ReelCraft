#!/bin/bash
set -e

SERVER="root@217.154.58.85"
REMOTE_PATH="/var/www/nepse-data-api"
LOCAL_PATH="/Users/aayurtshrestha/projects/nepse/nepse-api"

echo "🚀 Starting deploy..."

# 2️⃣ SSH once to stop API, clean old DB (already synced if needed), and restart safely
ssh $SERVER "bash -c '
  source ~/.nvm/nvm.sh
  echo \"Git pull\"
  cd /var/www/nepse-data-api 
  git pull origin
  echo \"🛑 Restarting old processes...\"
  pm2 restart ecosystem.config.js 
  echo \"✅ Restarted nepse-api...\"
  
  pm2 save
  echo \"🎉 Deploy complete!\"
'"