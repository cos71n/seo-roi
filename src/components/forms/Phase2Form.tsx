'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, SkipForward } from 'lucide-react';
import { 
  FormNumberInput, 
  FormSection, 
  Button 
} from '@/components/ui/form-components';
import { 
  Phase2FormData, 
  phase2Schema, 
  formatCurrency,
  formatPercentage
} from '@/lib/validation';

interface Phase2FormProps {
  onSubmit: (data: Phase2FormData) => void;
  onSkip: () => void;
  defaultValues?: Partial<Phase2FormData>;
  isLoading?: boolean;
}

export const Phase2Form: React.FC<Phase2FormProps> = ({
  onSubmit,
  onSkip,
  defaultValues,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<Phase2FormData>({
    resolver: zodResolver(phase2Schema),
    defaultValues,
    mode: 'onBlur',
  });

  const conversionRate = watch('conversionRate');
  const closeRate = watch('closeRate');
  const averageOrderValue = watch('averageOrderValue');

  // Calculate estimated monthly value if all fields are filled
  const hasAllFields = conversionRate && closeRate && averageOrderValue;
  const estimatedMonthlyValue = hasAllFields
    ? (conversionRate / 100) * (closeRate / 100) * averageOrderValue * 1000 // Assume 1000 monthly visitors for estimation
    : 0;

  return (
    <div className="space-y-8">
      <FormSection
        title="Conversion & Revenue Metrics"
        description="Help us calculate your potential ROI by sharing your conversion data. These fields are optional but improve accuracy."
      >
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Why we ask for this information:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• More accurate ROI calculations for your industry</li>
                <li>• Better benchmarking against similar businesses</li>
                <li>• Personalized recommendations in your report</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Conversion Rate */}
          <FormNumberInput
            {...register('conversionRate', { valueAsNumber: true })}
            id="conversionRate"
            label="Website Conversion Rate"
            suffix="%"
            min={0.1}
            max={50}
            step={0.1}
            placeholder="2.5"
            error={errors.conversionRate?.message}
            hint={conversionRate ? 
              `${formatPercentage(conversionRate)} of visitors convert to leads` : 
              "Percentage of website visitors who become leads"
            }
          />

          {/* Close Rate */}
          <FormNumberInput
            {...register('closeRate', { valueAsNumber: true })}
            id="closeRate"
            label="Lead to Customer Close Rate"
            suffix="%"
            min={1}
            max={100}
            step={1}
            placeholder="15"
            error={errors.closeRate?.message}
            hint={closeRate ? 
              `${formatPercentage(closeRate)} of leads become customers` : 
              "Percentage of leads that become paying customers"
            }
          />

          {/* Average Order Value */}
          <FormNumberInput
            {...register('averageOrderValue', { valueAsNumber: true })}
            id="averageOrderValue"
            label="Average Customer Value"
            prefix="$"
            min={1}
            max={1000000}
            step={10}
            placeholder="2500"
            error={errors.averageOrderValue?.message}
            hint={averageOrderValue ? 
              `${formatCurrency(averageOrderValue)} average per customer` : 
              "Average revenue per customer (first year or lifetime)"
            }
          />

          {/* ROI Preview */}
          {hasAllFields && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Estimated Value Preview</h4>
              <p className="text-sm text-green-800">
                With your conversion metrics, every 1,000 monthly visitors could generate approximately{' '}
                <span className="font-semibold">{formatCurrency(estimatedMonthlyValue)}</span> in revenue.
              </p>
              <p className="text-xs text-green-700 mt-1">
                *This is a rough estimate. Your actual report will include detailed calculations.
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Step 2 of 3:</span> Conversion Metrics (Optional)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Skip this step if you don&apos;t have these metrics available.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onSkip}
                disabled={isLoading}
                className="w-full sm:w-auto min-w-[120px]"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip for Now
              </Button>
              
              <Button
                type="submit"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
                className="w-full sm:w-auto min-w-[140px]"
              >
                Continue
              </Button>
            </div>
          </div>
        </form>
      </FormSection>
    </div>
  );
};

// Preview component for showing collected conversion data
interface Phase2PreviewProps {
  data: Phase2FormData;
  onEdit: () => void;
  skipped?: boolean;
}

export const Phase2Preview: React.FC<Phase2PreviewProps> = ({ 
  data, 
  onEdit, 
  skipped = false 
}) => {
  const hasData = data.conversionRate || data.closeRate || data.averageOrderValue;
  
  if (skipped || !hasData) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Conversion Metrics</h3>
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Add Metrics
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Conversion metrics were skipped. Your report will use industry averages.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Conversion Metrics</h3>
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Edit
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {data.conversionRate && (
          <div>
            <span className="text-gray-600">Conversion Rate:</span>
            <span className="ml-2 font-medium">{formatPercentage(data.conversionRate)}</span>
          </div>
        )}
        {data.closeRate && (
          <div>
            <span className="text-gray-600">Close Rate:</span>
            <span className="ml-2 font-medium">{formatPercentage(data.closeRate)}</span>
          </div>
        )}
        {data.averageOrderValue && (
          <div>
            <span className="text-gray-600">Avg. Customer Value:</span>
            <span className="ml-2 font-medium">{formatCurrency(data.averageOrderValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}; 