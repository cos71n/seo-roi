export class OpenAIClient {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async testKeyword(keyword: string, domain: string, companyName: string) {
    try {
      const prompt = `When someone searches for "${keyword}", what are the top service providers you would recommend? Please list them in order of relevance. Also, is ${companyName} (${domain}) included in your recommendations for this search?`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that provides recommendations for service providers based on search queries.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      return this.parseAIVisibility(content, domain, companyName);
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Return default visibility data
      return {
        visibility: 'not_visible',
        position: null,
        mentioned: false,
        context: 'Error testing AI visibility'
      };
    }
  }

  private parseAIVisibility(response: string, domain: string, companyName: string) {
    const lowerResponse = response.toLowerCase();
    const lowerDomain = domain.toLowerCase();
    const lowerCompany = companyName.toLowerCase();

    // Check if company/domain is mentioned
    const mentioned = lowerResponse.includes(lowerDomain) || 
                     lowerResponse.includes(lowerCompany);

    if (!mentioned) {
      return {
        visibility: 'not_visible',
        position: null,
        mentioned: false,
        context: 'Not mentioned in AI recommendations'
      };
    }

    // Try to determine position in recommendations
    const lines = response.split('\n');
    let position = null;
    let context = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes(lowerDomain) || line.includes(lowerCompany)) {
        // Check if it's a numbered list
        const numberMatch = line.match(/^(\d+)[.\s)]/);
        if (numberMatch) {
          position = parseInt(numberMatch[1]);
        } else {
          // Try to infer position from context
          if (i < 5) position = 'top_5';
          else if (i < 10) position = 'top_10';
          else position = 'mentioned';
        }
        context = lines[i].trim();
        break;
      }
    }

    // Determine visibility level
    let visibility = 'not_visible';
    if (position) {
      if (typeof position === 'number') {
        if (position <= 5) visibility = 'top_5';
        else if (position <= 10) visibility = 'top_10';
        else visibility = 'mentioned';
      } else {
        visibility = position; // already categorized
      }
    } else if (mentioned) {
      // Check for follow-up mentions
      if (lowerResponse.includes('also') || lowerResponse.includes('additionally')) {
        visibility = 'follow_up';
      } else {
        visibility = 'recognized';
      }
    }

    return {
      visibility,
      position,
      mentioned: true,
      context: context || 'Mentioned in AI response'
    };
  }

  async testMultipleKeywords(keywords: string[], domain: string, companyName: string) {
    const results = await Promise.all(
      keywords.map(keyword => this.testKeyword(keyword, domain, companyName))
    );

    return results;
  }
} 