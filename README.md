# 🤖 AI Review Bot — Domain Document Intelligence System

A professional AI-powered document review system. Paste any document and get a full structured review across 11 criteria — all **completely FREE**.

---

## ✨ Features

| Feature | Description |
|--------|------------|
| 📖 Document Understanding | Extracts title, objective, audience |
| 💡 Content Clarity | Checks logic and structure |
| ✅ Completeness Check | Verifies intro, content, conclusion |
| 🎯 Accuracy Review | Flags wrong concepts or data |
| 🎨 Presentation | Evaluates formatting and readability |
| ⚙️ Technical Check | Reviews code/logic if applicable |
| ⭐ Quality Score | Grammar, professionalism, language |
| ⚠️ Mistake Detection | Lists all issues by severity |
| 🛠️ Step-by-Step Corrections | 6-step fix guide for each mistake |
| 🏁 Final Feedback | Professional summary |
| 📋 Review Checklist | 7-item pass/fail checklist |

---

## 🆓 Free AI APIs (No Payment Needed)

### Option 1: Google Gemini (Recommended)
1. Go to **https://aistudio.google.com**
2. Sign in with Google
3. Click **"Get API Key"** → **"Create API key"**
4. Copy the key (starts with `AIza...`)
5. Paste it in the app → Select **Gemini**

### Option 2: Groq
1. Go to **https://console.groq.com**
2. Sign up (free)
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)
5. Paste it in the app → Select **Groq**

---

## 🚀 Local Development

```bash
# 1. Clone or unzip the project
cd ai-review-bot

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open browser → http://localhost:3000
```

---

## 🌐 Deploy for FREE

### Method 1: Vercel (Easiest — Recommended)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/ai-review-bot.git
   git push -u origin main
   ```

2. Go to **https://vercel.com** → Sign up with GitHub (free)

3. Click **"New Project"** → Import your GitHub repo

4. Settings:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Click **Deploy** — done! ✅

Your app is live at: `https://ai-review-bot-xxx.vercel.app`

---

### Method 2: Netlify

1. Build the project:
   ```bash
   npm run build
   ```

2. Go to **https://netlify.com** → Sign up (free)

3. Drag and drop the **`dist/`** folder onto Netlify's dashboard

4. Your app is live instantly! ✅

---

### Method 3: GitHub Pages

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to `package.json` scripts:
   ```json
   "deploy": "gh-pages -d dist"
   ```

3. Add to `vite.config.js`:
   ```js
   base: '/ai-review-bot/'
   ```

4. Build and deploy:
   ```bash
   npm run build
   npm run deploy
   ```

---

## 📁 Project Structure

```
ai-review-bot/
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Main app + all components
│   ├── App.css           # Styling (dark theme)
│   └── index.css         # Global styles
├── index.html            # HTML template
├── vite.config.js        # Vite config
├── vercel.json           # Vercel deployment config
├── _redirects            # Netlify config
└── package.json
```

---

## 🔒 Security Note

Your API key is stored in your browser's `localStorage` only — it never leaves your device or goes to any server other than the AI provider (Gemini/Groq directly).

---

## 🛠️ Customization

### Change the AI Model
In `src/App.jsx`, find `callGemini` or `callGroq` and change the model:

```js
// Gemini options: gemini-1.5-flash, gemini-1.5-pro
model: "model: "gemini-1.5-flash-latest"
"

// Groq options: llama3-70b-8192, llama3-8b-8192, mixtral-8x7b-32768
model: "llama3-70b-8192"
```

### Modify Review Criteria
Edit the `buildPrompt()` function in `src/App.jsx` to add custom review criteria.

---

## 📄 License

MIT — Free for personal and commercial use.
