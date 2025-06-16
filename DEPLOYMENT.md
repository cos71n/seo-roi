# Deployment Guide - Cloudflare Pages

## Prerequisites
- Cloudflare account
- GitHub repository connected to Cloudflare Pages
- Environment variables configured

## Environment Variables Required

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### API Keys
```
AHREFS_API_KEY=your_ahrefs_api_key
ANTHROPIC_API_KEY=your_anthropic_claude_api_key
OPENAI_API_KEY=your_openai_chatgpt_api_key
```

### Email Integration
```
BENTO_SITE_UUID=your_bento_site_uuid
BENTO_API_KEY=your_bento_api_key
```

### App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-domain.pages.dev
NODE_ENV=production
```

## Cloudflare Pages Setup

### 1. Connect GitHub Repository
1. Go to Cloudflare Dashboard > Pages
2. Create a new project
3. Connect your GitHub repository
4. Select `seo-roi-assessment` repository

### 2. Build Configuration
- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `/` (or path to project if in subdirectory)

### 3. Environment Variables
Add all the environment variables listed above in the Cloudflare Pages settings under:
- Pages > Your Project > Settings > Environment Variables

### 4. Custom Domain (Optional)
1. Go to Pages > Your Project > Custom domains
2. Add your custom domain
3. Configure DNS settings as instructed

## Build Commands
```bash
# Local development
npm run dev

# Production build (test locally)
npm run build
npm run start

# Type checking
npm run type-check
```

## Deployment Process
1. Commit and push changes to main branch
2. Cloudflare Pages automatically detects changes
3. Build process starts automatically
4. Deploy to staging environment
5. Promote to production when ready

## Environment-Specific Configuration
- **Development**: Uses localhost:3000
- **Staging**: Uses staging.your-domain.pages.dev
- **Production**: Uses your-domain.pages.dev or custom domain

## Monitoring
- Build logs: Available in Cloudflare Pages dashboard
- Runtime logs: Use Cloudflare Analytics and Logs
- Performance: Cloudflare Web Analytics 