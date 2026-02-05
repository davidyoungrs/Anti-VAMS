---
description: Push changes to git with automatic version bump
---

1. Bump the version number (creates a new patch version in package.json and stages it)
// turbo
npm run update-rev

2. Stage any other pending changes (optional, but recommended to ensure everything is included)
// turbo
git add .

3. Commit the changes
git commit -m "chore: Bump version"

4. Push to remote
// turbo
git push origin main
