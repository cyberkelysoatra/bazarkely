# 🏗️ Build Instructions - BazarKELY

## ⚠️ IMPORTANT: Single Build Output Location

**ONLY ONE DIST FOLDER EXISTS: `frontend/dist`**

- ✅ **CORRECT**: `D:\bazarkely-2\frontend\dist` (This is where builds go)
- ❌ **WRONG**: `D:\bazarkely-2\dist` (This folder should NOT exist)

## 🚀 How to Build

### Prerequisites
```bash
cd frontend
npm install
```

### Build Command
```bash
cd frontend
npm run build
```

**Output Location**: `frontend/dist/`

## 📁 Build Output Structure

After running `npm run build`, you'll find:
```
frontend/dist/
├── index.html          # Main HTML file
├── assets/             # JS, CSS, and other assets
│   ├── index-*.js      # Main application bundle
│   ├── index-*.css     # Styles
│   └── ...             # Other chunks
├── manifest.webmanifest
├── sw.js               # Service worker
└── _redirects          # Netlify redirects
```

## 🔧 Configuration Files

- **Vite Config**: `frontend/vite.config.ts` (line 65: `outDir: 'dist'`)
- **Package.json**: `frontend/package.json` (build script with explicit `--outDir dist`)
- **Gitignore**: Root `.gitignore` ignores `/dist` (root only)

## 🚫 What NOT to Do

1. ❌ Don't create a `dist` folder in the project root
2. ❌ Don't upload files from any `dist` folder other than `frontend/dist`
3. ❌ Don't modify the `outDir` in `vite.config.ts`
4. ❌ Don't run build commands from the project root

## ✅ What TO Do

1. ✅ Always run `npm run build` from the `frontend` directory
2. ✅ Always upload from `frontend/dist` for deployment
3. ✅ Check that `frontend/dist` exists after building
4. ✅ Verify the build output contains `index.html` and `assets/` folder

## 🔍 Verification

After building, verify the correct output:
```bash
# Check if frontend/dist exists and has content
ls frontend/dist/

# Should show:
# index.html, assets/, manifest.webmanifest, sw.js, etc.
```

## 🚨 Troubleshooting

**Problem**: Build output goes to wrong location
**Solution**: 
1. Delete any `dist` folder in project root
2. Run `cd frontend && npm run build`
3. Verify output is in `frontend/dist`

**Problem**: Confusion about which dist to use
**Solution**: 
1. Only use `frontend/dist`
2. Ignore any other `dist` folders
3. Check this file for reference

---

**Remember**: The build process is configured to output ONLY to `frontend/dist`. Any other `dist` folder is incorrect and should be deleted.






