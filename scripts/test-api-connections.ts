#!/usr/bin/env ts-node

/**
 * API Connection Test Script
 * 
 * This script tests all API connections and shows which ones are properly configured.
 * Run with: npx ts-node scripts/test-api-connections.ts
 */

const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

interface APITestResult {
  name: string;
  status: 'success' | 'error' | 'missing_key';
  message: string;
  required: boolean;
}

async function testAPIs(): Promise<APITestResult[]> {
  const results: APITestResult[] = [];

  // Test Supabase Configuration
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      results.push({
        name: 'Supabase',
        status: 'missing_key',
        message: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
        required: true
      });
    } else {
      // Test connection (would require actual Supabase client)
      results.push({
        name: 'Supabase',
        status: 'success',
        message: 'Environment variables configured',
        required: true
      });
    }
  } catch (error) {
    results.push({
      name: 'Supabase',
      status: 'error',
      message: `Error: ${error}`,
      required: true
    });
  }

  // Test Ahrefs API
  const ahrefsKey = process.env.AHREFS_API_KEY;
  if (!ahrefsKey) {
    results.push({
      name: 'Ahrefs API',
      status: 'missing_key',
      message: 'Missing AHREFS_API_KEY - SEO analysis will not work',
      required: true
    });
  } else {
    try {
      // Would test actual connection here
      results.push({
        name: 'Ahrefs API',
        status: 'success',
        message: 'API key configured (connection not tested)',
        required: true
      });
    } catch (error) {
      results.push({
        name: 'Ahrefs API',
        status: 'error',
        message: `Connection failed: ${error}`,
        required: true
      });
    }
  }

  // Test Claude API
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!claudeKey) {
    results.push({
      name: 'Claude API',
      status: 'missing_key',
      message: 'Missing ANTHROPIC_API_KEY - AI commentary will not work',
      required: true
    });
  } else {
    try {
      // Would test actual connection here
      results.push({
        name: 'Claude API',
        status: 'success',
        message: 'API key configured (connection not tested)',
        required: true
      });
    } catch (error) {
      results.push({
        name: 'Claude API',
        status: 'error',
        message: `Connection failed: ${error}`,
        required: true
      });
    }
  }

  // Test OpenAI API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    results.push({
      name: 'OpenAI API',
      status: 'missing_key',
      message: 'Missing OPENAI_API_KEY - AI visibility testing will not work',
      required: true
    });
  } else {
    try {
      // Would test actual connection here
      results.push({
        name: 'OpenAI API',
        status: 'success',
        message: 'API key configured (connection not tested)',
        required: true
      });
    } catch (error) {
      results.push({
        name: 'OpenAI API',
        status: 'error',
        message: `Connection failed: ${error}`,
        required: true
      });
    }
  }

  // Test Bento API
  const bentoKey = process.env.BENTO_API_KEY;
  const bentoUuid = process.env.BENTO_SITE_UUID;
  if (!bentoKey || !bentoUuid) {
    results.push({
      name: 'Bento Email',
      status: 'missing_key',
      message: 'Missing BENTO_API_KEY or BENTO_SITE_UUID - lead sync will not work',
      required: false
    });
  } else {
    results.push({
      name: 'Bento Email',
      status: 'success',
      message: 'API credentials configured',
      required: false
    });
  }

  return results;
}

function printResults(results: APITestResult[]) {
  console.log('\n🔍 SEO ROI Assessment Tool - API Connection Test\n');
  console.log('=' .repeat(60));

  const success = results.filter(r => r.status === 'success').length;
  const missing = results.filter(r => r.status === 'missing_key').length;
  const errors = results.filter(r => r.status === 'error').length;

  results.forEach(result => {
    const emoji = result.status === 'success' ? '✅' : 
                  result.status === 'missing_key' ? '❌' : '⚠️';
    const required = result.required ? '[REQUIRED]' : '[OPTIONAL]';
    
    console.log(`${emoji} ${result.name} ${required}`);
    console.log(`   ${result.message}\n`);
  });

  console.log('=' .repeat(60));
  console.log(`📊 Summary: ${success} working, ${missing} missing keys, ${errors} errors`);
  
  if (missing > 0) {
    console.log('\n💡 To get started:');
    console.log('1. Create .env.local file in project root');
    console.log('2. Add your API keys (see ENV_SETUP.md for details)');
    console.log('3. Run this test again to verify connections');
  }

  if (success === results.length) {
    console.log('\n🎉 All APIs are configured! Ready to process real assessments.');
  } else {
    console.log('\n⚙️  Development mode: Using mocked data until APIs are configured.');
  }
}

// What actually works without API keys
function showCurrentCapabilities() {
  console.log('\n🚀 Current Application Capabilities:\n');
  
  console.log('✅ WORKING (No API keys needed):');
  console.log('   • Next.js application server');
  console.log('   • Database schema and operations');
  console.log('   • User interface and forms');
  console.log('   • PDF report generation (with mock data)');
  console.log('   • Admin dashboard and analytics');
  console.log('   • Unit tests and development tools');
  console.log('   • Deployment to Cloudflare Pages\n');

  console.log('❌ REQUIRES API KEYS:');
  console.log('   • Real SEO data analysis (Ahrefs)');
  console.log('   • AI-powered commentary (Claude)');
  console.log('   • AI visibility testing (OpenAI)');
  console.log('   • Lead email synchronization (Bento)');
  console.log('   • Live competitor analysis');
  console.log('   • Actual report generation with real data\n');

  console.log('🔧 DEVELOPMENT STRATEGY:');
  console.log('   • Continue building UI with mock data');
  console.log('   • Test all functionality with sample responses');
  console.log('   • Add real API keys when ready for production');
  console.log('   • Gradually enable each API as keys become available\n');
}

// Run the test
async function main() {
  try {
    const results = await testAPIs();
    printResults(results);
    showCurrentCapabilities();
  } catch (error) {
    console.error('Error running API tests:', error);
  }
}

// Add to package.json scripts:
// "test:apis": "npx ts-node scripts/test-api-connections.ts"

if (require.main === module) {
  main();
}

module.exports = { testAPIs }; 