# Data Quality Checker

A minimal, professional web tool for instant **CSV data quality analysis and reporting**. Upload your dataset and get a comprehensive health score, column-level insights, outlier detection, and actionable recommendations — all in the browser, with zero backend dependencies.

---

## ✨ Features

- **Drag & Drop Upload** — Upload any `.csv` file directly in the browser
- **Data Health Score** — A 0–100 composite score based on missing values, duplicates, and inconsistencies
- **Column-Level Insights** — Per-column type detection, missing value counts, outlier flagging, and fix recommendations
- **Duplicate Row Detection** — Identifies exact duplicate records across the full dataset
- **Outlier Detection** — Uses the IQR (Interquartile Range) method to flag statistical anomalies in numeric columns
- **Mixed Type Detection** — Detects columns with inconsistent data types
- **Full Schema Breakdown** — A detailed table view of every column with type, missing count, unique count, and status
- **Sample Dataset** — Try it instantly with a built-in sample CSV, no file needed
- **Animated Pipeline UI** — Real-time pipeline status feedback with smooth animations via Framer Motion

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | React 19 + TypeScript               |
| Build Tool  | Vite 6                              |
| Styling     | Tailwind CSS v4                     |
| CSV Parsing | PapaParse                           |
| Animations  | Framer Motion                       |
| Icons       | Lucide React                        |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)

### Installation & Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/bhaveshpatil093/data-quality-checker.git
cd data-quality-checker

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be live at `http://localhost:3000`.

---

## 📁 Project Structure

```
├── index.html              # HTML entry point
├── vite.config.ts          # Vite + Tailwind configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies & scripts
└── src/
    ├── main.tsx            # React root mount
    ├── index.css           # Global styles & Tailwind theme tokens
    └── App.tsx             # Main application component (all logic & UI)
```

---

## 📊 How the Health Score Works

The **Data Health Score** (0–100) is calculated as:

```
healthScore = 100 - missingPenalty - duplicatePenalty - inconsistencyPenalty
```

| Penalty             | Weight | Description                                              |
|---------------------|--------|----------------------------------------------------------|
| `missingPenalty`    | 60%    | Proportion of missing cells across the full dataset      |
| `duplicatePenalty`  | 20%    | Proportion of duplicate rows                             |
| `inconsistencyPenalty` | 10% each | Outlier ratio + mixed-type column ratio              |

| Score Range | Label    |
|-------------|----------|
| 80–100      | ✅ Good   |
| 50–79       | ⚠️ Moderate |
| 0–49        | ❌ Poor   |

---

## 📋 Available Scripts

| Command         | Description                        |
|-----------------|------------------------------------|
| `npm run dev`   | Start dev server on port 3000      |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build     |
| `npm run lint`  | TypeScript type check              |
| `npm run clean` | Remove the `dist/` directory       |

---

## 👥 Built By

**Team Elite** — Bhavesh Patil & Shreya Shelar
Built for the **Databricks–Accenture Hackathon**.

---

## 📄 License

Licensed under the [Apache 2.0 License](LICENSE).
