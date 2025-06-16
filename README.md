# SEO ROI Assessment Tool

A comprehensive SEO performance assessment tool that analyzes service businesses' SEO campaign ROI and provides actionable insights through AI-powered analysis.

## Features

- **ROI Analysis**: Evaluate SEO investment effectiveness against industry benchmarks
- **Competitor Analysis**: Compare performance against top competitors
- **Authority Domain Gap Analysis**: Identify link building opportunities
- **AI Visibility Testing**: Assess brand recognition in AI assistants
- **Content Gap Detection**: Find missed content opportunities
- **Automated Reporting**: Generate professional PDF reports with AI commentary

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Hosting**: Cloudflare Pages
- **Background Jobs**: Supabase Edge Functions
- **AI Analysis**: Claude API for commentary generation
- **Email Integration**: Bento for lead nurturing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- API keys for Ahrefs, Claude, and OpenAI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd seo-roi-assessment
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual API keys and configuration (see DEPLOYMENT.md for details).

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Setup

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Keys
AHREFS_API_KEY=your_ahrefs_api_key
ANTHROPIC_API_KEY=your_anthropic_claude_api_key
OPENAI_API_KEY=your_openai_chatgpt_api_key

# Bento Email Integration
BENTO_SITE_UUID=your_bento_site_uuid
BENTO_API_KEY=your_bento_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components
├── lib/                 # Utility functions and configurations
│   ├── supabase.ts     # Supabase client setup
│   ├── ahrefs.ts       # Ahrefs API client
│   ├── claude.ts       # Claude API client
│   └── openai.ts       # OpenAI API client
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## Deployment

This application is configured for deployment on Cloudflare Pages. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## API Integration

### External APIs Used

- **Ahrefs API**: SEO metrics and competitor analysis
- **Claude API**: AI-powered commentary generation
- **OpenAI API**: AI visibility testing
- **Bento API**: Email marketing automation

### Rate Limiting

- Ahrefs: 60 requests/minute
- Claude: Standard rate limits apply
- OpenAI: 3 requests/minute for AI visibility testing

## Database Schema

The application uses Supabase with the following main tables:

- `users`: User information and contact details
- `campaigns`: SEO campaign data and metrics
- `reports`: Generated assessment reports and scores

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is private and proprietary to The SEO Show.
