# FormFast Deployment Guide 🚀

This guide will walk you through deploying FormFast to production.

## 📋 Prerequisites

- [Supabase](https://supabase.com) account
- [Vercel](https://vercel.com) account
- [GitHub](https://github.com) account
- [OpenAI](https://platform.openai.com) API key

## 🗄️ Database Setup

### 1. Create Supabase Project

✅ **Already completed** - Your project is set up with:
- **URL**: `https://bbtgrbcznxwfsfkwnfdu.supabase.co`
- **Storage buckets**: Created (`uploads`, `signatures`, `completed-forms`)

### 2. Run Database Migration

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy the contents of `scripts/create-tables.sql`
4. Paste and execute the SQL script
5. Verify tables were created in the **Table Editor**

### 3. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure your site URL: `https://your-domain.com`
3. Add redirect URLs for production
4. Enable email confirmations if desired

## 🔧 Environment Variables

### Required Variables

```bash
# Supabase (✅ Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://bbtgrbcznxwfsfkwnfdu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI (✅ Already configured)
OPENAI_API_KEY=sk-proj-UN8gbRQ9KLmOgb2Z9k7U...

# Production URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Optional: AWS Textract (for enhanced OCR)
AWS_TEXTRACT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Optional: Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🚀 Vercel Deployment

### 1. Deploy from GitHub

1. Push your code to GitHub (instructions below)
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **"New Project"**
4. Import your GitHub repository
5. Configure environment variables
6. Deploy!

### 2. Environment Variables in Vercel

Add these in your Vercel project settings:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bbtgrbcznxwfsfkwnfdu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `OPENAI_API_KEY` | Your OpenAI key |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain |

### 3. Domain Configuration

1. Add your custom domain in Vercel
2. Update Supabase auth settings with your domain
3. Update CORS settings if needed

## 🧪 Testing Your Deployment

### 1. Basic Functionality Test

1. Visit your deployed site
2. Upload a sample PDF/image
3. Verify file upload works
4. Check OCR processing
5. Test signature functionality

### 2. API Endpoints Test

Test these endpoints work:
- `POST /api/upload` - File upload
- `POST /api/ocr` - OCR processing
- `POST /api/classify` - Field classification
- `POST /api/autofill` - Auto-fill logic
- `POST /api/render-pdf` - PDF generation

## 🔍 Monitoring & Debugging

### 1. Logs

- **Vercel**: Check function logs in dashboard
- **Supabase**: Monitor database queries and auth
- **OpenAI**: Track API usage and rate limits

### 2. Performance

- Monitor Vercel analytics
- Check Core Web Vitals
- Watch for cold start times

## 🛠️ Post-Deployment Tasks

### 1. Enable Features

- [ ] Set up Stripe webhooks (if using payments)
- [ ] Configure AWS Textract (if using)
- [ ] Set up monitoring and alerts
- [ ] Add analytics tracking

### 2. Security Review

- [ ] Verify RLS policies are active
- [ ] Check CORS configuration
- [ ] Review environment variable security
- [ ] Test authentication flows

## 🚨 Common Issues

### Build Errors

```bash
# Fix dependency issues
npm install

# Check TypeScript
npm run typecheck

# Test build locally
npm run build
```

### Database Issues

```bash
# Test database connection
node scripts/check-database.js
```

### API Issues

- Check environment variables are set
- Verify Supabase RLS policies
- Test API routes with Postman/curl

## 📞 Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/your-username/formfast/issues)
2. Review Vercel deployment logs
3. Check Supabase project status
4. Verify all environment variables are set correctly

---

**FormFast** is now ready for production! 🎉