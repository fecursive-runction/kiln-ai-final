# 🔥 kiln.AI - AI-Powered Cement Plant Control System

An intelligent real-time monitoring and optimization platform for cement production, powered by Google Gemini AI and built with Next.js 15.

![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![GenKit](https://img.shields.io/badge/GenKit-1.22-orange?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)

---

## 🌟 Features

### 📊 **Real-Time Dashboard**
- Live monitoring of kiln temperature, feed rate, and LSF (Lime Saturation Factor)
- Raw mix composition tracking (CaO, SiO₂, Al₂O₃, Fe₂O₃)
- Clinker phase analysis (C₃S, C₂S, C₃A, C₄AF) using Bogue's equations
- Auto-refreshing metrics every 5 seconds

### 🤖 **AI-Powered Optimizer**
- **Gemini 2.5 Pro/Flash** integration via GenKit
- Intelligent recommendations for limestone and clay adjustments
- Predicted LSF calculations after optimization
- Detailed explanations of trade-offs and chemistry
- One-click application of recommendations

### 🚨 **Intelligent Alert System**
- AI-generated alerts for critical thresholds
- Severity levels: `CRITICAL` | `WARNING`
- Actionable optimization triggers from alerts
- Real-time feed with relative timestamps

### 💬 **PlantGPT Assistant**
- Conversational AI chatbot for plant operations
- Natural language queries about production metrics
- Access to live data, historical trends, and optimization triggers
- Context-aware responses about cement chemistry

### 📈 **Advanced Analytics**
- Multi-tab metric visualization (Primary, Raw Mix, Phases)
- 50-point rolling chart data with auto-scaling
- Historical data table with sorting and filtering
- CSV export functionality

---

## 🏗️ Tech Stack

### **Frontend**
- **Framework:** Next.js 15 (App Router, React Server Components)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS + Custom Industrial Dark Theme
- **UI Components:** Shadcn/ui (Radix UI primitives)
- **Charts:** Recharts
- **Animations:** Framer Motion

### **Backend**
- **AI Engine:** GenKit 1.22 with Google Gemini 2.5 Pro/Flash
- **Database:** Supabase (PostgreSQL)
- **API:** Next.js Server Actions
- **Real-time:** Polling-based updates (5s interval)

### **Key Libraries**
- `zod` - Schema validation
- `react-hook-form` - Form management
- `lucide-react` - Icon system
- `@supabase/supabase-js` - Database client

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Supabase Account** (for database)
- **Google AI API Key** (for Gemini)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/kiln-ai.git
cd kiln-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the project root:

```env
# Supabase Configuration (Public - Browser Safe)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Service Role (Server-Side Only - Keep Secret!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here
```

### 4. Database Setup (Supabase)

Run this SQL in your Supabase SQL Editor:

```sql
-- Create production_metrics table
CREATE TABLE production_metrics (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plant_id TEXT NOT NULL,
  kiln_temp NUMERIC(10, 2) NOT NULL,
  feed_rate NUMERIC(10, 2) NOT NULL,
  lsf NUMERIC(10, 2) NOT NULL,
  cao NUMERIC(10, 2) NOT NULL,
  sio2 NUMERIC(10, 2) NOT NULL,
  al2o3 NUMERIC(10, 2) NOT NULL,
  fe2o3 NUMERIC(10, 2) NOT NULL,
  c3s NUMERIC(10, 2) NOT NULL,
  c2s NUMERIC(10, 2) NOT NULL,
  c3a NUMERIC(10, 2) NOT NULL,
  c4af NUMERIC(10, 2) NOT NULL
);

-- Create alerts table
CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING')),
  message TEXT NOT NULL,
  metadata JSONB
);

-- Create indexes for performance
CREATE INDEX idx_metrics_timestamp ON production_metrics(timestamp DESC);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
```

### 5. Run Development Server
```bash
# Start Next.js dev server (port 9002)
npm run dev

# In a separate terminal, start GenKit flows
npm run genkit:dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

---

## 📁 Project Structure

```
kiln-ai/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── actions.ts            # Server Actions
│   │   ├── api/ingest/          # Data simulation endpoint
│   │   ├── analytics/           # Analytics page
│   │   ├── history/             # Historical data page
│   │   ├── optimize/            # AI Optimizer page
│   │   ├── plantgpt/            # Chatbot page
│   │   └── page.tsx             # Dashboard (home)
│   │
│   ├── ai/                       # GenKit AI Flows
│   │   ├── genkit.ts            # GenKit configuration
│   │   ├── dev.ts               # Development entrypoint
│   │   ├── flows/               # AI flow definitions
│   │   │   ├── plant-agent.ts   # PlantGPT chatbot
│   │   │   ├── optimize-cement-production.ts
│   │   │   ├── generate-alerts.ts
│   │   │   └── optimization-schemas.ts
│   │   └── tools/               # AI tools
│   │       └── plant-data-tools.ts
│   │
│   ├── components/              # React Components
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── optimize/            # Optimization UI
│   │   ├── history/             # Data tables
│   │   ├── layout/              # App shell, header, sidebar
│   │   └── ui/                  # Shadcn/ui primitives
│   │
│   ├── context/                 # React Context
│   │   └── DataProvider.tsx    # Global state management
│   │
│   ├── lib/                     # Utilities
│   │   ├── data/metrics.ts     # Database operations
│   │   ├── supabaseClient.ts   # Supabase client factory
│   │   ├── formatters.ts       # Number/date formatting
│   │   ├── thresholds.ts       # Business rules & constants
│   │   └── utils.ts            # Helper functions
│   │
│   └── hooks/                   # Custom React hooks
│
├── public/                      # Static assets
├── .env.local                   # Environment variables (gitignored)
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS config
└── package.json                # Dependencies
```

---

## 🎨 UI Design

### Dark Industrial Theme
- **Background:** Near-black (`#070807`)
- **Primary:** Neon Green (`#00FF7A`)
- **Accents:** Blue, Purple, Yellow, Orange for charts
- **Typography:** Inter (sans-serif) + Space Mono (monospace)

### Key Design Elements
- Glassmorphism cards with subtle backdrop blur
- Neon glow effects on interactive elements
- Status-based color coding (green/yellow/red)
- Responsive grid layouts for mobile/desktop

---

## 🧪 Cement Chemistry

### LSF (Lime Saturation Factor)
```
LSF = (CaO / (2.8 × SiO₂ + 1.18 × Al₂O₃ + 0.65 × Fe₂O₃)) × 100
```
**Ideal Range:** 94-98%

### Bogue's Equations (Clinker Phases)
```
C₃S = 4.071 × CaO' - 7.602 × SiO₂ - 6.719 × Al₂O₃ - 1.430 × Fe₂O₃
C₂S = 2.867 × SiO₂ - 0.754 × C₃S
C₃A = 2.650 × Al₂O₃ - 1.692 × Fe₂O₃
C₄AF = 3.043 × Fe₂O₃
```

### Operational Thresholds
| Metric | Critical Low | Ideal Min | Ideal Max | Critical High |
|--------|--------------|-----------|-----------|---------------|
| Kiln Temp (°C) | 1420 | 1430 | 1470 | 1480 |
| LSF (%) | 92 | 94 | 98 | 100 |
| Feed Rate (TPH) | - | 210 | 230 | - |

---

## 🔧 Configuration

### Data Refresh Intervals
- **Ingestion:** Every 5 seconds (generates new simulated data)
- **Polling:** Every 5 seconds (fetches fresh data)
- **Chart History:** Last 50 data points

### AI Model Settings
```typescript
// Optimization (Fast)
model: 'googleai/gemini-2.5-flash'
temperature: 0.2
maxOutputTokens: 1000

// PlantGPT Chatbot (Smart)
model: 'googleai/gemini-2.5-pro'
temperature: 0.1
```

---

## 📝 Scripts

```bash
# Development
npm run dev              # Start Next.js dev server (port 9002)
npm run genkit:dev       # Start GenKit flow server
npm run genkit:watch     # GenKit with auto-reload

# Build & Deploy
npm run build           # Production build
npm run start           # Start production server

# Code Quality
npm run lint            # ESLint
npm run typecheck       # TypeScript validation
```

---

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use Service Role Key server-side only** - See `src/lib/supabaseClient.ts`
3. **Keep `GEMINI_API_KEY` secret** - Server-side only
4. **Enable RLS on Supabase tables** - Restrict public access
5. **Validate all form inputs** - Use Zod schemas

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
# 1. Push to GitHub
git push origin main

# 2. Import to Vercel
# Connect your GitHub repo at vercel.com

# 3. Add Environment Variables
# In Vercel Dashboard → Settings → Environment Variables
# Add all variables from .env.local
```

### Environment Variables on Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Server-side only**
- `GEMINI_API_KEY` ⚠️ **Server-side only**

---

## 🐛 Troubleshooting

### "Missing NEXT_PUBLIC_SUPABASE_URL"
**Solution:** Create `.env.local` and add Supabase credentials

### Optimization Taking Too Long
**Solution:** Check `GEMINI_API_KEY` is set. Model uses Flash for speed.

### Apply Recommendation Hangs
**Solution:** Already fixed with fire-and-forget pattern in `applyOptimization`

### Charts Not Updating
**Solution:** Check browser console for polling errors. Verify Supabase connection.

### GenKit Flows Not Working
**Solution:** Run `npm run genkit:dev` in a separate terminal

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- Use TypeScript strict mode
- Follow existing component patterns
- Add JSDoc comments for complex functions
- Use Tailwind utility classes (no custom CSS)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini AI** - Powering intelligent recommendations
- **Supabase** - Real-time database infrastructure
- **Shadcn/ui** - Beautiful component primitives
- **Cement Industry** - Domain expertise and formulas
