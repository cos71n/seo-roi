-- SEO ROI Assessment Tool - Seed Data
-- This file contains sample data for testing and development

-- Insert sample users
INSERT INTO users (id, email, first_name, phone, domain, company_name, industry) VALUES
(
    '01000000-0000-0000-0000-000000000001',
    'john.doe@example.com',
    'John',
    '+1-555-0123',
    'example-law.com',
    'Example Law Firm',
    'Legal'
),
(
    '01000000-0000-0000-0000-000000000002',
    'sarah.smith@healthplus.com',
    'Sarah',
    '+1-555-0124',
    'healthplus.com',
    'HealthPlus Medical Center',
    'Healthcare'
),
(
    '01000000-0000-0000-0000-000000000003',
    'mike.johnson@homepro.com',
    'Mike',
    '+1-555-0125',
    'homepro.com',
    'HomePro Services',
    'Home Services'
),
(
    '01000000-0000-0000-0000-000000000004',
    'lisa.wong@techcorp.com',
    'Lisa',
    '+1-555-0126',
    'techcorp.com',
    'TechCorp Solutions',
    'Technology'
),
(
    '01000000-0000-0000-0000-000000000005',
    'david.brown@restaurant.com',
    'David',
    '+1-555-0127',
    'restaurant.com',
    'David\'s Restaurant',
    'Food & Beverage'
);

-- Insert sample campaigns
INSERT INTO campaigns (id, user_id, monthly_spend, investment_duration, target_keywords, conversion_rate, close_rate, average_order_value) VALUES
(
    '02000000-0000-0000-0000-000000000001',
    '01000000-0000-0000-0000-000000000001',
    2500,
    12,
    ARRAY['personal injury lawyer', 'car accident attorney', 'legal services', 'lawyer near me', 'personal injury law'],
    3.5,
    25.0,
    5000.00
),
(
    '02000000-0000-0000-0000-000000000002',
    '01000000-0000-0000-0000-000000000002',
    3000,
    18,
    ARRAY['family doctor', 'medical center', 'healthcare services', 'primary care', 'doctor near me'],
    4.2,
    35.0,
    350.00
),
(
    '02000000-0000-0000-0000-000000000003',
    '01000000-0000-0000-0000-000000000003',
    1500,
    8,
    ARRAY['plumber', 'home repair', 'emergency plumber', 'plumbing services', 'local plumber'],
    6.8,
    45.0,
    450.00
),
(
    '02000000-0000-0000-0000-000000000004',
    '01000000-0000-0000-0000-000000000004',
    5000,
    24,
    ARRAY['software development', 'web development', 'mobile app development', 'tech consulting', 'custom software'],
    2.1,
    20.0,
    15000.00
),
(
    '02000000-0000-0000-0000-000000000005',
    '01000000-0000-0000-0000-000000000005',
    1200,
    6,
    ARRAY['restaurant', 'fine dining', 'catering services', 'event catering', 'local restaurant'],
    8.5,
    60.0,
    125.00
);

-- Insert sample reports with various statuses
INSERT INTO reports (
    id, 
    user_id, 
    overall_score, 
    link_score, 
    domain_score, 
    traffic_score, 
    ranking_score, 
    ai_visibility_score,
    authority_domain_gap,
    ai_visibility_data,
    analysis_data,
    ai_commentary,
    status,
    completed_at
) VALUES
(
    '03000000-0000-0000-0000-000000000001',
    '01000000-0000-0000-0000-000000000001',
    6.8,
    7.2,
    6.5,
    7.0,
    6.8,
    5.9,
    25,
    '{"personal injury lawyer": {"mentioned": true, "score": 15}, "car accident attorney": {"mentioned": false, "score": 0}, "legal services": {"mentioned": true, "score": 10}, "lawyer near me": {"mentioned": false, "score": 0}, "personal injury law": {"mentioned": true, "score": 20}}',
    '{"competitors": [{"domain": "competitor1.com", "dr": 65, "monthly_traffic": 45000}, {"domain": "competitor2.com", "dr": 58, "monthly_traffic": 32000}], "content_gaps": [{"topic": "car accident settlements", "opportunity": 12000}, {"topic": "personal injury claims", "opportunity": 8500}], "link_analysis": {"current_authority_links": 18, "expected_authority_links": 30, "gap": 12}}',
    'Your SEO campaign shows moderate performance with room for significant improvement. While you\'ve achieved some visibility in AI search results, there are clear opportunities to enhance your authority domain portfolio and content strategy. Focus on building relationships with legal publications and creating comprehensive guides on car accident settlements.',
    'completed',
    NOW() - INTERVAL '2 hours'
),
(
    '03000000-0000-0000-0000-000000000002',
    '01000000-0000-0000-0000-000000000002',
    8.2,
    8.5,
    7.8,
    8.0,
    8.1,
    8.7,
    12,
    '{"family doctor": {"mentioned": true, "score": 20}, "medical center": {"mentioned": true, "score": 15}, "healthcare services": {"mentioned": true, "score": 20}, "primary care": {"mentioned": true, "score": 15}, "doctor near me": {"mentioned": false, "score": 5}}',
    '{"competitors": [{"domain": "healthcompetitor.com", "dr": 72, "monthly_traffic": 65000}], "content_gaps": [{"topic": "telehealth services", "opportunity": 5000}], "link_analysis": {"current_authority_links": 45, "expected_authority_links": 54, "gap": 9}}',
    'Excellent SEO performance! Your healthcare practice demonstrates strong authority and consistent AI visibility. The minimal authority domain gap suggests efficient link building efforts. Continue focusing on telehealth content to capture emerging search opportunities.',
    'completed',
    NOW() - INTERVAL '1 day'
),
(
    '03000000-0000-0000-0000-000000000003',
    '01000000-0000-0000-0000-000000000003',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'processing',
    NULL
),
(
    '03000000-0000-0000-0000-000000000004',
    '01000000-0000-0000-0000-000000000004',
    5.4,
    4.8,
    5.2,
    6.1,
    5.8,
    4.9,
    45,
    '{"software development": {"mentioned": false, "score": 0}, "web development": {"mentioned": true, "score": 10}, "mobile app development": {"mentioned": false, "score": 0}, "tech consulting": {"mentioned": false, "score": 0}, "custom software": {"mentioned": false, "score": 0}}',
    '{"competitors": [{"domain": "bigtech.com", "dr": 89, "monthly_traffic": 150000}, {"domain": "devshop.com", "dr": 76, "monthly_traffic": 98000}], "content_gaps": [{"topic": "AI development", "opportunity": 25000}, {"topic": "cloud migration", "opportunity": 18000}], "link_analysis": {"current_authority_links": 28, "expected_authority_links": 100, "gap": 72}}',
    'Your tech company\'s SEO performance indicates significant untapped potential. The substantial authority domain gap suggests aggressive link building is needed. Low AI visibility scores highlight the need for thought leadership content. Consider contributing to tech publications and creating comprehensive guides on AI development and cloud migration.',
    'completed',
    NOW() - INTERVAL '3 days'
),
(
    '03000000-0000-0000-0000-000000000005',
    '01000000-0000-0000-0000-000000000005',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{"error": "Insufficient data for analysis - domain appears to be new"}',
    NULL,
    'failed',
    NULL
);

-- Insert some additional test data for queue testing
INSERT INTO reports (id, user_id, status) VALUES
('03000000-0000-0000-0000-000000000006', '01000000-0000-0000-0000-000000000001', 'queued'),
('03000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000002', 'queued');

-- Add some comments explaining the seed data
/*
Seed Data Summary:
- 5 users across different industries (Legal, Healthcare, Home Services, Technology, Food & Beverage)
- 5 campaigns with varying spend levels ($1,200 - $5,000/month)
- 7 reports with different statuses:
  * 3 completed reports with full analysis data
  * 1 processing report
  * 1 failed report with error message
  * 2 queued reports for testing queue system

This data provides:
- Realistic industry distribution for testing
- Various score ranges (5.4 - 8.2) for UI testing
- Different authority domain gaps (12 - 45) for analysis testing
- Sample AI visibility data for testing AI features
- Sample analysis data for testing competitor analysis
- Various report statuses for testing workflow
*/ 