import { z } from 'zod';

// Phase 1: Initial Data Collection Schema
export const phase1Schema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  
  domain: z
    .string()
    .min(1, 'Domain is required')
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
      'Please enter a valid domain (e.g., example.com)'
    ),
  
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters'),
  
  monthlySpend: z
    .number()
    .min(1000, 'Monthly SEO spend must be at least $1,000')
    .max(100000, 'Monthly SEO spend seems too high. Please contact us directly.'),
  
  investmentDuration: z
    .number()
    .min(6, 'SEO investment must be at least 6 months')
    .max(120, 'Investment duration must be less than 10 years'),
  
  targetKeywords: z
    .array(z.string().min(1, 'Keyword cannot be empty'))
    .min(1, 'At least one target keyword is required')
    .max(5, 'Maximum 5 target keywords allowed'),
  
  industry: z
    .string()
    .min(1, 'Industry is required')
    .max(50, 'Industry must be less than 50 characters'),
});

// Phase 2: Conversion Metrics Schema
export const phase2Schema = z.object({
  conversionRate: z
    .number()
    .min(0.1, 'Conversion rate must be at least 0.1%')
    .max(50, 'Conversion rate seems too high. Please verify.')
    .optional(),
  
  closeRate: z
    .number()
    .min(1, 'Close rate must be at least 1%')
    .max(100, 'Close rate cannot exceed 100%')
    .optional(),
  
  averageOrderValue: z
    .number()
    .min(1, 'Average order value must be at least $1')
    .max(1000000, 'Average order value seems too high')
    .optional(),
});

// Lead Gate Schema (Final step)
export const leadGateSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid phone number'
    ),
});

// Combined schemas for type inference
export const completeAssessmentSchema = phase1Schema
  .merge(phase2Schema)
  .merge(leadGateSchema);

// Form data types
export type Phase1FormData = z.infer<typeof phase1Schema>;
export type Phase2FormData = z.infer<typeof phase2Schema>;
export type LeadGateFormData = z.infer<typeof leadGateSchema>;
export type CompleteAssessmentData = z.infer<typeof completeAssessmentSchema>;

// Form step enum
export enum FormStep {
  PHASE_1 = 'phase1',
  PHASE_2 = 'phase2',
  PROCESSING = 'processing',
  LEAD_GATE = 'leadGate',
  RESULTS = 'results'
}

// Industry options for dropdown
export const INDUSTRY_OPTIONS = [
  { value: 'legal', label: 'Legal Services' },
  { value: 'healthcare', label: 'Healthcare & Medical' },
  { value: 'home-services', label: 'Home Services' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'finance', label: 'Financial Services' },
  { value: 'technology', label: 'Technology' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'hospitality', label: 'Hospitality & Travel' },
  { value: 'construction', label: 'Construction' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'non-profit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' }
] as const;

// Form validation helpers
export const validateDomain = (domain: string): boolean => {
  try {
    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return phase1Schema.shape.domain.safeParse(cleanDomain).success;
  } catch {
    return false;
  }
};

export const validateEmail = (email: string): boolean => {
  return phase1Schema.shape.email.safeParse(email).success;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value}%`;
};

// Form progress calculation
export const calculateProgress = (step: FormStep, completedFields: number = 0): number => {
  const stepWeights = {
    [FormStep.PHASE_1]: 0.4, // 40% for main data collection
    [FormStep.PHASE_2]: 0.3, // 30% for conversion metrics
    [FormStep.PROCESSING]: 0.8, // 80% while processing
    [FormStep.LEAD_GATE]: 0.9, // 90% for lead gate
    [FormStep.RESULTS]: 1.0, // 100% complete
  };

  return Math.round(stepWeights[step] * 100);
};

// Form persistence helpers
export const FORM_STORAGE_KEY = 'seo-assessment-form-data';

export const saveFormData = (data: Partial<CompleteAssessmentData>): void => {
  try {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save form data to localStorage:', error);
  }
};

export const loadFormData = (): Partial<CompleteAssessmentData> | null => {
  try {
    const data = localStorage.getItem(FORM_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Failed to load form data from localStorage:', error);
    return null;
  }
};

export const clearFormData = (): void => {
  try {
    localStorage.removeItem(FORM_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear form data from localStorage:', error);
  }
}; 