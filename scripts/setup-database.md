# Database Setup Guide

This guide explains how to set up the database schema for the SEO ROI Assessment Tool.

## Prerequisites

1. **Supabase Project**: You need a Supabase project with your database URL and service role key
2. **Environment Variables**: Ensure your `.env.local` file has the correct Supabase credentials

## Running Migrations

### Option 1: Using Supabase Dashboard (Recommended for Development)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration files in order:

   **Step 1: Initial Schema**
   ```sql
   -- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
   ```

   **Step 2: Row Level Security**
   ```sql
   -- Copy and paste the contents of supabase/migrations/002_row_level_security.sql
   ```

   **Step 3: Database Functions**
   ```sql
   -- Copy and paste the contents of supabase/migrations/003_database_functions.sql
   ```

4. **Optional: Add Seed Data** (for development/testing)
   ```sql
   -- Copy and paste the contents of supabase/seed.sql
   ```

### Option 2: Using Supabase CLI (For Production)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Apply migrations:
   ```bash
   supabase db reset --linked
   ```

## Verification

After running the migrations, verify the setup:

### 1. Check Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

Expected tables:
- `users`
- `campaigns`
- `reports`

### 2. Check Functions
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

Expected functions:
- `get_user_with_latest_data`
- `domain_has_recent_assessment`
- `get_report_statistics`
- `get_industry_performance`
- `cleanup_failed_reports`
- `update_report_status`
- `get_queue_status`
- `get_user_report_history`

### 3. Check RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 4. Test Seed Data (if applied)
```sql
SELECT 
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM campaigns) as campaign_count,
    (SELECT COUNT(*) FROM reports) as report_count;
```

Expected results with seed data:
- user_count: 5
- campaign_count: 5
- report_count: 7

## Database Schema Overview

### Tables

**users**
- Stores user contact information and company details
- Primary key: `id` (UUID)
- Unique constraint on `email`

**campaigns**
- Stores SEO campaign data and metrics
- Foreign key to `users.id`
- Constraints: minimum spend $1000, minimum duration 6 months

**reports**
- Stores assessment reports and analysis results
- Foreign key to `users.id`
- JSONB fields for flexible data storage
- Status tracking for queue management

### Indexes

Optimized for common query patterns:
- User lookups by email and domain
- Report filtering by status and date
- Campaign filtering by spend and date

### Security

Row Level Security (RLS) policies ensure:
- Users can only access their own data
- Service role has full access for background processing
- Anonymous users can create initial records during assessment flow

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you're using the service role key for admin operations
2. **Function Not Found**: Check that all migrations were applied in order
3. **RLS Policy Conflicts**: Drop and recreate policies if needed
4. **Seed Data Conflicts**: Use `TRUNCATE` to clear tables before re-seeding

### Reset Database
```sql
-- WARNING: This will delete all data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
-- Then re-run all migrations
```

## Next Steps

After completing the database setup:

1. Update your TypeScript types in `src/lib/supabase.ts` if needed
2. Test the database connection in your Next.js application
3. Implement the API endpoints that will use these tables
4. Set up the background job processing system 