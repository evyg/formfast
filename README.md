# FormFast 🚀

**Never fill the same form twice.** FormFast is an intelligent form-filling application that uses AI-powered OCR to detect form fields and auto-fills them from your saved profile.

## ✨ Features

- 📄 **Smart PDF & Image Upload** - Supports PDF, JPG, PNG, WebP formats
- 🤖 **AI-Powered Field Detection** - Uses OpenAI GPT-4 to intelligently classify form fields
- 🔄 **Auto-Fill from Profile** - Automatically populates forms with your saved information
- ✍️ **Multiple Signature Options** - Draw, type, or upload signatures
- 📱 **Mobile-First Design** - Optimized for phone and tablet use
- 🔐 **Secure & Private** - Row-level security with encrypted data storage
- 💳 **Flexible Billing** - Free tier, subscriptions, and pay-as-you-go options

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Supabase (Auth, Database, Storage)
- **AI/ML**: OpenAI GPT-4, AWS Textract, Tesseract.js
- **PDF Processing**: pdf-lib, pdfjs-dist
- **Payments**: Stripe
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd formfast
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key for field classification

### 3. Database Setup

1. Go to your Supabase dashboard → SQL Editor
2. Copy and paste the contents of `scripts/create-tables.sql`
3. Run the script to create all tables and policies

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📋 Database Schema

- **Storage Buckets**: uploads, signatures, completed-forms ✅
- **Tables**: Run `scripts/create-tables.sql` in Supabase SQL Editor

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run test         # Run unit tests
npm run format       # Format code with Prettier
```

## 🚀 Deploy on Vercel

The easiest way to deploy FormFast is to use the [Vercel Platform](https://vercel.com/new).

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

## 💰 Billing Plans

- **Free**: 1 form fill
- **Individual**: $9.99/month - Unlimited forms
- **Family**: $19.99/month - Up to 4 household members
- **Pay-as-you-go**: $2 per form fill

---

**FormFast** - Making form filling fast and effortless! 🚀
