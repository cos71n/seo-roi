'use client';

import React, { useState } from 'react';
import { OverallScoreData } from '@/lib/scoring/types';
import { PDFDownloadButton } from '@/components/PDFReport';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  Link2,
  Globe,
  BarChart3,
  Target,
  Brain,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ReportDisplayProps {
  data: OverallScoreData;
  companyName: string;
  domain: string;
  monthlySpend: number;
  investmentMonths: number;
  onShowLeadGate: () => void;
}

export const ReportDisplay: React.FC<ReportDisplayProps> = ({
  data,
  companyName,
  domain,
  monthlySpend,
  investmentMonths,
  onShowLeadGate
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'recommendations'>('overview');

  // Calculate total investment
  const totalInvestment = monthlySpend * investmentMonths;

  // Get icon for each metric
  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'authorityLinks': return Link2;
      case 'authorityDomains': return Globe;
      case 'trafficGrowth': return TrendingUp;
      case 'rankingImprovements': return BarChart3;
      case 'aiVisibility': return Brain;
      default: return CheckCircle;
    }
  };

  // Get color classes based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-50 border-green-200';
    if (score >= 6) return 'bg-blue-50 border-blue-200';
    if (score >= 4) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'Excellent': return 'text-green-600 bg-green-100';
      case 'Good': return 'text-blue-600 bg-blue-100';
      case 'Average': return 'text-yellow-600 bg-yellow-100';
      case 'Poor': return 'text-orange-600 bg-orange-100';
      case 'Very Poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          SEO ROI Assessment Results
        </h2>
        <p className="text-lg text-gray-600">
          {companyName} • {domain}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          ${monthlySpend.toLocaleString()}/month • {investmentMonths} months • ${totalInvestment.toLocaleString()} total investment
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {(['overview', 'details', 'recommendations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overall Score Section */}
          <div className={`p-6 rounded-xl border-2 ${getScoreBgColor(data.normalizedScore)}`}>
            <div className="text-center">
              <div className="mb-4">
                <div className={`text-6xl font-bold ${getScoreColor(data.normalizedScore)}`}>
                  {data.normalizedScore}/10
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getPerformanceColor(data.performanceLevel)}`}>
                  {data.performanceLevel} Performance
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center">
                  <Info className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-gray-600">
                    Confidence: <span className="font-medium">{data.confidence}</span>
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600">
                    Weighted Score: <span className="font-medium">{data.weightedScore.toFixed(1)}%</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Red Flags Alert */}
          {data.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    Critical Issues Detected ({data.redFlags.length})
                  </h3>
                  <div className="space-y-2">
                    {data.redFlags.slice(0, 3).map((flag, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <span className="font-medium">{flag.type.replace(/_/g, ' ')}</span>: {flag.message}
                      </div>
                    ))}
                    {data.redFlags.length > 3 && (
                      <button
                        onClick={() => setActiveTab('details')}
                        className="text-sm text-red-700 font-medium hover:text-red-800"
                      >
                        View all {data.redFlags.length} issues →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Individual Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'authorityLinks', label: 'Authority Links', weight: 35, data: data.authorityLinks },
              { key: 'authorityDomains', label: 'Authority Domains', weight: 20, data: data.authorityDomains },
              { key: 'trafficGrowth', label: 'Traffic Growth', weight: 20, data: data.trafficGrowth },
              { key: 'rankingImprovements', label: 'Ranking Improvements', weight: 15, data: data.rankingImprovements },
              { key: 'aiVisibility', label: 'AI Visibility', weight: 10, data: data.aiVisibility },
            ].map((metric) => {
              const Icon = getMetricIcon(metric.key);
              const score = metric.data.normalizedScore;
              const isPositive = score >= 6;
              
              return (
                <div key={metric.key} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 ${isPositive ? 'text-green-600' : 'text-orange-600'} mr-2`} />
                      <h4 className="font-medium text-gray-900">{metric.label}</h4>
                    </div>
                    <span className="text-xs text-gray-500">{metric.weight}%</span>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score}/10
                    </div>
                    <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                      {isPositive ? (
                        <>
                          <TrendingUp className="h-4 w-4 mr-1" />
                          <span>Good</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 mr-1" />
                          <span>Needs Work</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {metric.data.insights && metric.data.insights.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {metric.data.insights[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Top Recommendations</h3>
            <ul className="space-y-1">
              {data.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-sm text-blue-800 flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setActiveTab('recommendations')}
              className="text-sm text-blue-700 font-medium hover:text-blue-800 mt-2"
            >
              View all recommendations →
            </button>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={onShowLeadGate}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Get Your Full Report & Action Plan
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Includes detailed analysis, competitor insights, and personalized recommendations
            </p>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Detailed Metrics */}
          {[
            { key: 'authorityLinks', label: 'Authority Links', data: data.authorityLinks },
            { key: 'authorityDomains', label: 'Authority Domains', data: data.authorityDomains },
            { key: 'trafficGrowth', label: 'Traffic Growth', data: data.trafficGrowth },
            { key: 'rankingImprovements', label: 'Ranking Improvements', data: data.rankingImprovements },
            { key: 'aiVisibility', label: 'AI Visibility', data: data.aiVisibility },
          ].map((metric) => {
            const Icon = getMetricIcon(metric.key);
            
            return (
              <div key={metric.key} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Icon className="h-6 w-6 text-gray-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">{metric.label}</h3>
                  <div className={`ml-auto text-2xl font-bold ${getScoreColor(metric.data.normalizedScore)}`}>
                    {metric.data.normalizedScore}/10
                  </div>
                </div>
                
                {/* Details */}
                {metric.data.details && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(metric.data.details).slice(0, 4).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="font-medium text-gray-900 ml-1">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Insights */}
                {metric.data.insights && metric.data.insights.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Insights</h4>
                    {metric.data.insights.map((insight, index) => (
                      <p key={index} className="text-sm text-gray-600">
                        • {insight}
                      </p>
                    ))}
                  </div>
                )}
                
                {/* Red Flags for this metric */}
                {metric.data.redFlags && metric.data.redFlags.length > 0 && (
                  <div className="mt-4 bg-red-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-red-800 mb-1">Issues</h4>
                    {metric.data.redFlags.map((flag, index) => (
                      <p key={index} className="text-sm text-red-700">
                        • {flag.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* All Recommendations */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Complete Action Plan
            </h3>
            <div className="space-y-3">
              {data.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    {index + 1}
                  </span>
                  <p className="text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps CTA */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to Improve Your SEO ROI?
            </h3>
            <p className="text-gray-600 mb-4">
              Get your complete report with competitor analysis, content gaps, and a custom action plan.
            </p>
            <button
              onClick={onShowLeadGate}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Download Full Report (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 