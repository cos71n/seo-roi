'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  FormInput, 
  FormSelect, 
  FormNumberInput, 
  KeywordsInput, 
  FormSection, 
  Button 
} from '@/components/ui/form-components';
import { 
  Phase1FormData, 
  phase1Schema, 
  INDUSTRY_OPTIONS,
  formatCurrency
} from '@/lib/validation';

interface Phase1FormProps {
  onSubmit: (data: Phase1FormData) => void;
  defaultValues?: Partial<Phase1FormData>;
  isLoading?: boolean;
}

export const Phase1Form: React.FC<Phase1FormProps> = ({
  onSubmit,
  defaultValues,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<Phase1FormData>({
    resolver: zodResolver(phase1Schema),
    defaultValues,
    mode: 'onBlur',
  });

  // Watch keywords for dynamic input
  const keywords = watch('targetKeywords') || [];

  const handleKeywordsChange = (newKeywords: string[]) => {
    setValue('targetKeywords', newKeywords, { shouldValidate: true });
  };

  // Domain cleanup helper
  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toLowerCase().trim();
    // Remove common prefixes
    value = value.replace(/^https?:\/\//, '').replace(/^www\./, '');
    setValue('domain', value, { shouldValidate: true });
  };

  const monthlySpend = watch('monthlySpend');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <FormSection
        title="Tell us about your business"
        description="We need some basic information to provide an accurate SEO assessment."
      >
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            {...register('email')}
            id="email"
            label="Email Address"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            hint="We'll send your assessment report to this email"
            required
            autoComplete="email"
          />

          <FormInput
            {...register('companyName')}
            id="companyName"
            label="Company Name"
            placeholder="Your Company Name"
            error={errors.companyName?.message}
            required
            autoComplete="organization"
          />
        </div>

        {/* Website & Industry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            {...register('domain', {
              onChange: handleDomainChange,
            })}
            id="domain"
            label="Website Domain"
            placeholder="example.com"
            error={errors.domain?.message}
            hint="Enter your main domain without www or https://"
            required
          />

          <FormSelect
            {...register('industry')}
            id="industry"
            label="Industry"
            options={INDUSTRY_OPTIONS}
            error={errors.industry?.message}
            hint="Select the industry that best describes your business"
            required
          />
        </div>

        {/* Investment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormNumberInput
            {...register('monthlySpend', { valueAsNumber: true })}
            id="monthlySpend"
            label="Monthly SEO Investment"
            prefix="$"
            min={1000}
            max={100000}
            step={500}
            placeholder="5000"
            error={errors.monthlySpend?.message}
            hint={monthlySpend ? `${formatCurrency(monthlySpend)}/month` : "Minimum $1,000/month"}
            required
          />

          <FormNumberInput
            {...register('investmentDuration', { valueAsNumber: true })}
            id="investmentDuration"
            label="Investment Duration"
            suffix="months"
            min={6}
            max={120}
            step={1}
            placeholder="12"
            error={errors.investmentDuration?.message}
            hint="How long have you been investing in SEO?"
            required
          />
        </div>

        {/* Target Keywords */}
        <KeywordsInput
          label="Target Keywords"
          keywords={keywords}
          onChange={handleKeywordsChange}
          error={errors.targetKeywords?.message}
          hint="Add 1-5 keywords you want to rank for. Press Enter or click + to add."
          required
          maxKeywords={5}
        />
      </FormSection>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Step 1 of 3:</span> Basic Information
          </p>
          <p className="text-xs text-gray-500 mt-1">
            All information is kept confidential and used only for your assessment.
          </p>
        </div>
        
        <Button
          type="submit"
          size="lg"
          loading={isLoading}
          disabled={!isValid || isLoading}
          className="w-full sm:w-auto min-w-[140px]"
        >
          Continue
        </Button>
      </div>
    </form>
  );
};

// Preview component for showing collected data
interface Phase1PreviewProps {
  data: Phase1FormData;
  onEdit: () => void;
}

export const Phase1Preview: React.FC<Phase1PreviewProps> = ({ data, onEdit }) => {
  const industry = INDUSTRY_OPTIONS.find(opt => opt.value === data.industry);
  
  return (
    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Your Information</h3>
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Edit
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Company:</span>
          <span className="ml-2 font-medium">{data.companyName}</span>
        </div>
        <div>
          <span className="text-gray-600">Domain:</span>
          <span className="ml-2 font-medium">{data.domain}</span>
        </div>
        <div>
          <span className="text-gray-600">Industry:</span>
          <span className="ml-2 font-medium">{industry?.label}</span>
        </div>
        <div>
          <span className="text-gray-600">Monthly Spend:</span>
          <span className="ml-2 font-medium">{formatCurrency(data.monthlySpend)}</span>
        </div>
        <div>
          <span className="text-gray-600">Duration:</span>
          <span className="ml-2 font-medium">{data.investmentDuration} months</span>
        </div>
        <div className="md:col-span-2">
          <span className="text-gray-600">Target Keywords:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {data.targetKeywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 