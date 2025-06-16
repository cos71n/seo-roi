'use client';

import React, { useState } from 'react';
import { X, Download, Shield, Phone, User } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Lead gate form schema
const leadGateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string()
    .regex(/^[\d\s()+-]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .transform(val => val.replace(/\D/g, '')), // Remove non-digits for storage
  consent: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms to continue',
  }),
});

type LeadGateFormData = z.infer<typeof leadGateSchema>;

interface LeadGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadGateFormData) => Promise<void>;
  companyName: string;
}

export const LeadGateModal: React.FC<LeadGateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  companyName,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadGateFormData>({
    resolver: zodResolver(leadGateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      consent: false,
    },
  });

  const handleFormSubmit = async (data: LeadGateFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Lead gate submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Complete Your Assessment
              </h3>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Download className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              
              <h4 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Your SEO Report is Ready!
              </h4>
              <p className="text-gray-600 text-center">
                Get your complete {companyName} SEO analysis with:
              </p>
              
              <ul className="mt-4 space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Detailed scoring breakdown & benchmarks</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Competitor analysis & content gaps</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Personalized action plan & recommendations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Revenue opportunities & ROI projections</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('firstName')}
                    type="text"
                    className={`
                      block w-full pl-10 pr-3 py-2 border rounded-md text-gray-900 
                      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                      ${errors.firstName ? 'border-red-300' : 'border-gray-300'}
                    `}
                    placeholder="John"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('lastName')}
                    type="text"
                    className={`
                      block w-full pl-10 pr-3 py-2 border rounded-md text-gray-900 
                      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                      ${errors.lastName ? 'border-red-300' : 'border-gray-300'}
                    `}
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('phone')}
                    type="tel"
                    className={`
                      block w-full pl-10 pr-3 py-2 border rounded-md text-gray-900 
                      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                      ${errors.phone ? 'border-red-300' : 'border-gray-300'}
                    `}
                    placeholder="(555) 123-4567"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              {/* Consent */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      {...register('consent')}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="consent" className="text-sm text-gray-700">
                      I agree to receive my SEO assessment report and understand that The SEO Show may contact me 
                      about improving my SEO performance. I can unsubscribe at any time.
                    </label>
                  </div>
                </div>
                {errors.consent && (
                  <p className="mt-2 text-sm text-red-600">{errors.consent.message}</p>
                )}
              </div>

              {/* Privacy Notice */}
              <div className="flex items-center justify-center text-xs text-gray-500">
                <Shield className="h-3 w-3 mr-1" />
                <span>Your information is secure and will never be shared</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Get My Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 