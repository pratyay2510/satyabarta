#!/bin/bash
# ─── Satya Barta — Push to GitHub for instant deployment ─────────────────────
# Repo: https://github.com/pratyay2510/satyabarta.git
# Usage: bash push.sh "optional commit message"

set -e

REPO_URL="https://github.com/pratyay2510/satyabarta.git"
BRANCH="main"
MSG="${1:-📰 Update Satya Barta — $(date '+%Y-%m-%d %H:%M')}"

echo ""
echo "═══ SATYA BARTA — DEPLOY ═══"
echo "Repo:   $REPO_URL"
echo "Branch: $BRANCH"
echo "Message: $MSG"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
  git remote add origin "$REPO_URL"
  git branch -M "$BRANCH"
fi

# Ensure remote is set correctly
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$CURRENT_REMOTE" != "$REPO_URL" ]; then
  echo "Updating remote URL..."
  git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL"
fi

# Stage all changes
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo "No changes to commit. Already up to date."
  exit 0
fi

# Show what's being committed
echo "Changes to deploy:"
git diff --cached --stat
echo ""

# Commit and push
git commit -m "$MSG"
git push -u origin "$BRANCH"

echo ""
echo "═══ DEPLOYED SUCCESSFULLY ═══"
echo "Site will be live at: https://pratyay2510.github.io/satyabarta/"
echo ""

# ─── REMINDER: GitHub Actions Setup ──────────────────────────────────────────
echo "═══ SETUP REMINDER ═══"
echo "To enable auto-generated content (3× daily via HuggingFace):"
echo ""
echo "1. Go to: https://github.com/pratyay2510/satyabarta/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: HF_TOKEN"
echo "4. Value: Your HuggingFace API token (get it free at https://huggingface.co/settings/tokens)"
echo "5. Click 'Add secret'"
echo ""
echo "That's it! The workflow at .github/workflows/generate-content.yml"
echo "will auto-run 3× daily (6AM, 12PM, 6PM IST) and update content."
echo ""
echo "To trigger manually: Go to Actions tab → 'Generate Daily Content' → 'Run workflow'"
echo ""
