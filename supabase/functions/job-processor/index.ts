import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { ReportGenerator } from './report-generator.ts'

// Job processor that runs periodically to process queued jobs
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Claim next available job
    const { data: job, error: claimError } = await supabase
      .rpc('claim_next_job', { p_job_types: ['report_generation'] })
      .single()

    if (claimError || !job) {
      // No jobs available
      return new Response(
        JSON.stringify({ message: 'No jobs available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Processing job ${job.id} of type ${job.job_type}`)

    try {
      // Process based on job type
      switch (job.job_type) {
        case 'report_generation':
          await processReportGeneration(supabase, job)
          break
        default:
          throw new Error(`Unknown job type: ${job.job_type}`)
      }

      // Mark job as completed
      await supabase.rpc('complete_job', { 
        p_job_id: job.id,
        p_result: { processed_at: new Date().toISOString() }
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Job ${job.id} processed successfully` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } catch (processingError) {
      console.error(`Error processing job ${job.id}:`, processingError)
      
      // Mark job as failed
      await supabase.rpc('fail_job', {
        p_job_id: job.id,
        p_error_message: processingError.message
      })

      throw processingError
    }

  } catch (error) {
    console.error('Job processor error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Process report generation jobs
async function processReportGeneration(supabase: any, job: any) {
  const { reportId, userId, campaignId } = job.payload

  // Initialize report generator with API keys
  const reportGenerator = new ReportGenerator({
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ahrefsApiKey: Deno.env.get('AHREFS_API_KEY')!,
    claudeApiKey: Deno.env.get('CLAUDE_API_KEY')!,
    openaiApiKey: Deno.env.get('OPENAI_API_KEY')!
  })

  // Generate the report
  const result = await reportGenerator.generateReport(reportId, userId, campaignId)
  
  console.log(`Report ${reportId} generated successfully`)
  
  return result
} 