import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { OverallScoreData } from '@/lib/scoring/types';

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 3,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  scoreContainer: {
    backgroundColor: '#eff6ff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  bigScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  performanceLabel: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
  },
  metricName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    width: '40%',
  },
  metricScore: {
    fontSize: 14,
    fontWeight: 'bold',
    width: '20%',
    textAlign: 'center',
  },
  metricInsight: {
    fontSize: 11,
    color: '#6b7280',
    width: '40%',
  },
  recommendationItem: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 8,
    paddingLeft: 15,
  },
  redFlagSection: {
    backgroundColor: '#fef2f2',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  redFlagTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  redFlagItem: {
    fontSize: 11,
    color: '#7f1d1d',
    marginBottom: 5,
    paddingLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 10,
  },
  confidenceText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  investmentInfo: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 3,
  },
});

// PDF Document Component
interface PDFReportProps {
  data: OverallScoreData;
  companyName: string;
  domain: string;
  monthlySpend: number;
  investmentMonths: number;
  contactName?: string;
  contactPhone?: string;
}

const PDFReport: React.FC<PDFReportProps> = ({
  data,
  companyName,
  domain,
  monthlySpend,
  investmentMonths,
  contactName,
  contactPhone,
}) => {
  const totalInvestment = monthlySpend * investmentMonths;
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Helper to get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 8) return '#10b981'; // green
    if (score >= 6) return '#3b82f6'; // blue
    if (score >= 4) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SEO ROI Assessment Report</Text>
          <Text style={styles.subtitle}>{companyName} • {domain}</Text>
          <Text style={styles.subtitle}>Generated on {currentDate}</Text>
        </View>

        {/* Investment Overview */}
        <View style={styles.section}>
          <Text style={styles.investmentInfo}>
            Monthly SEO Investment: ${monthlySpend.toLocaleString()}
          </Text>
          <Text style={styles.investmentInfo}>
            Investment Duration: {investmentMonths} months
          </Text>
          <Text style={styles.investmentInfo}>
            Total Investment: ${totalInvestment.toLocaleString()}
          </Text>
        </View>

        {/* Overall Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.bigScore, { color: getScoreColor(data.normalizedScore) }]}>
            {data.normalizedScore}/10
          </Text>
          <Text style={styles.performanceLabel}>
            {data.performanceLevel} Performance
          </Text>
          <Text style={styles.confidenceText}>
            Confidence Level: {data.confidence} • Weighted Score: {data.weightedScore.toFixed(1)}%
          </Text>
        </View>

        {/* Red Flags Alert (if any) */}
        {data.redFlags.length > 0 && (
          <View style={styles.redFlagSection}>
            <Text style={styles.redFlagTitle}>
              Critical Issues Detected ({data.redFlags.length})
            </Text>
            {data.redFlags.slice(0, 5).map((flag, index) => (
              <Text key={index} style={styles.redFlagItem}>
                • {flag.type.replace(/_/g, ' ')}: {flag.message}
              </Text>
            ))}
          </View>
        )}

        {/* Individual Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          
          {[
            { name: 'Authority Links (35%)', data: data.authorityLinks },
            { name: 'Authority Domains (20%)', data: data.authorityDomains },
            { name: 'Traffic Growth (20%)', data: data.trafficGrowth },
            { name: 'Ranking Improvements (15%)', data: data.rankingImprovements },
            { name: 'AI Visibility (10%)', data: data.aiVisibility },
          ].map((metric, index) => (
            <View key={index} style={styles.metricRow}>
              <Text style={styles.metricName}>{metric.name}</Text>
              <Text style={[styles.metricScore, { color: getScoreColor(metric.data.normalizedScore) }]}>
                {metric.data.normalizedScore}/10
              </Text>
              <Text style={styles.metricInsight}>
                {metric.data.insights?.[0] || 'No specific insights available'}
              </Text>
            </View>
          ))}
        </View>

        {/* Key Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {data.recommendations.slice(0, 5).map((rec, index) => (
            <Text key={index} style={styles.recommendationItem}>
              {index + 1}. {rec}
            </Text>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by The SEO Show • Confidential Assessment Report
          {contactName && ` • Prepared for ${contactName}`}
        </Text>
      </Page>
    </Document>
  );
};

// Export component for generating PDF
export interface PDFButtonProps {
  data: OverallScoreData;
  companyName: string;
  domain: string;
  monthlySpend: number;
  investmentMonths: number;
  contactName?: string;
  contactPhone?: string;
}

export const PDFDownloadButton: React.FC<PDFButtonProps> = (props) => {
  const fileName = `SEO-Report-${props.domain.replace(/\./g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={<PDFReport {...props} />}
      fileName={fileName}
      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {({ blob, url, loading, error }) =>
        loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating PDF...
          </>
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF Report
          </>
        )
      }
    </PDFDownloadLink>
  );
};

export default PDFReport; 