// @ts-ignore - no type definitions available
import { removeStopwords } from 'stopword';
// @ts-ignore - no type definitions available  
import { PorterStemmer } from 'natural';

export interface JobSections {
  requirements: string;
  responsibilities: string;
  summary: string;
  qualifications: string;
  rawText: string;
}

export interface ResumeSections {
  experience: string;
  skills: string;
  education: string;
  summary: string;
  rawText: string;
}

export interface PreprocessedText {
  original: string;
  normalized: string;
  tokens: string[];
  cleanTokens: string[];
  sections: JobSections | ResumeSections;
}

/**
 * Text preprocessing utility for job-resume matching
 * Handles normalization, section extraction, and tokenization
 */
export class TextPreprocessingUtils {
  private static readonly JOB_SECTION_PATTERNS = {
    requirements: /(?:requirements?|must\s+have|required\s+(?:skills?|qualifications?|experience)|essential|mandatory)[\s\S]*?(?=\n\n|\n[A-Z][A-Z\s]*:|\n\*|$)/gi,
    responsibilities: /(?:responsibilities|duties|job\s+description|role|what\s+you['']?ll\s+do|day[\s-]to[\s-]day)[\s\S]*?(?=\n\n|\n[A-Z][A-Z\s]*:|\n\*|$)/gi,
    qualifications: /(?:qualifications?|preferred|nice[\s-]to[\s-]have|bonus|plus|additional)[\s\S]*?(?=\n\n|\n[A-Z][A-Z\s]*:|\n\*|$)/gi,
    summary: /(?:about|overview|summary|company|position\s+summary)[\s\S]*?(?=\n\n|\n[A-Z][A-Z\s]*:|\n\*|$)/gi
  };

  private static readonly RESUME_SECTION_PATTERNS = {
    experience: /(?:experience|employment|work\s+history|professional\s+experience)[\s\S]*?(?=\n[A-Z][A-Z\s]*\n|\n[A-Z][a-z]+[\s\S]*?:|\n\n[A-Z]|$)/gi,
    skills: /(?:skills?|technical\s+skills?|technologies|competencies|expertise)[\s\S]*?(?=\n[A-Z][A-Z\s]*\n|\n[A-Z][a-z]+[\s\S]*?:|\n\n[A-Z]|$)/gi,
    education: /(?:education|academic|qualifications?|degrees?)[\s\S]*?(?=\n[A-Z][A-Z\s]*\n|\n[A-Z][a-z]+[\s\S]*?:|\n\n[A-Z]|$)/gi,
    summary: /(?:summary|profile|objective|about|overview)[\s\S]*?(?=\n[A-Z][A-Z\s]*\n|\n[A-Z][a-z]+[\s\S]*?:|\n\n[A-Z]|$)/gi
  };

  private static readonly NOISE_PATTERNS = [
    // Company branding and benefits
    /(?:we\s+offer|benefits\s+include|perks|company\s+culture|our\s+mission|about\s+(?:us|the\s+company))[\s\S]*?(?=\n\n|\n[A-Z][A-Z\s]*:|$)/gi,
    // Legal/EEO boilerplate  
    /(?:equal\s+opportunity|eeo|we\s+are\s+an\s+equal|diversity|inclusion)[\s\S]*?(?=\n\n|\n[A-Z][A-Z\s]*:|$)/gi,
    // Application instructions
    /(?:how\s+to\s+apply|please\s+submit|send\s+your|apply\s+(?:now|today))[\s\S]*?(?=\n\n|\n[A-Z][A-Z\s]*:|$)/gi,
    // Salary/compensation (keep private)
    /(?:salary|compensation|pay\s+range|wage)[\s\S]*?(?=\n\n|\n[A-Z][A-Z\s]*:|$)/gi
  ];

  /**
   * Extract structured sections from job description
   */
  static extractJobSections(jobText: string): JobSections {
    const cleanedText = this.removeNoise(jobText);
    
    const sections: JobSections = {
      requirements: this.extractSection(cleanedText, this.JOB_SECTION_PATTERNS.requirements),
      responsibilities: this.extractSection(cleanedText, this.JOB_SECTION_PATTERNS.responsibilities),
      qualifications: this.extractSection(cleanedText, this.JOB_SECTION_PATTERNS.qualifications),
      summary: this.extractSection(cleanedText, this.JOB_SECTION_PATTERNS.summary),
      rawText: cleanedText
    };

    // Fallback: if no clear sections found, use heuristics
    if (!sections.requirements && !sections.responsibilities) {
      const lines = cleanedText.split('\n').filter(line => line.trim());
      const midpoint = Math.floor(lines.length / 2);
      
      sections.requirements = lines.slice(0, midpoint).join('\n');
      sections.responsibilities = lines.slice(midpoint).join('\n');
    }

    return sections;
  }

  /**
   * Extract structured sections from resume
   */
  static extractResumeSections(resumeText: string): ResumeSections {
    const cleanedText = this.normalize(resumeText);
    
    return {
      experience: this.extractSection(cleanedText, this.RESUME_SECTION_PATTERNS.experience),
      skills: this.extractSection(cleanedText, this.RESUME_SECTION_PATTERNS.skills),
      education: this.extractSection(cleanedText, this.RESUME_SECTION_PATTERNS.education),
      summary: this.extractSection(cleanedText, this.RESUME_SECTION_PATTERNS.summary),
      rawText: cleanedText
    };
  }

  /**
   * Comprehensive text normalization
   */
  static normalize(text: string): string {
    return text
      // Fix encoding issues
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[–—]/g, '-')
      // Standardize whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      // Remove excess punctuation
      .replace(/[.]{2,}/g, '.')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      // Standardize technology names
      .replace(/\bnode\.?js\b/gi, 'Node.js')
      .replace(/\breact\.?js\b/gi, 'React')
      .replace(/\bangular\.?js\b/gi, 'Angular')
      .replace(/\bvue\.?js\b/gi, 'Vue.js')
      // Remove URLs and emails (privacy)
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '')
      // Trim and clean
      .trim();
  }

  /**
   * Advanced tokenization with domain-specific handling
   */
  static tokenize(text: string): string[] {
    const normalized = this.normalize(text.toLowerCase());
    
    // Split on various delimiters while preserving compound terms
    const tokens = normalized
      .split(/[,;\n\r\t\|•·∙‣⁃]+/)
      .flatMap(segment => segment.split(/\s+/))
      .map(token => token.replace(/^[^\w]*|[^\w]*$/g, '')) // Remove surrounding punctuation
      .filter(token => token.length > 1) // Filter out single characters
      .filter(token => !this.isCommonWord(token));

    return [...new Set(tokens)]; // Remove duplicates
  }

  /**
   * Clean tokens by removing stopwords and applying stemming
   */
  static cleanTokens(tokens: string[]): string[] {
    // Remove stopwords
    const withoutStopwords = removeStopwords(tokens);
    
    // Apply stemming for better matching
    return withoutStopwords
      .map((token: string) => PorterStemmer.stem(token))
      .filter((token: string) => token.length > 2); // Filter very short stemmed words
  }

  /**
   * Extract years of experience from text
   */
  static extractYearsOfExperience(text: string): number | null {
    const patterns = [
      /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/gi,
      /(?:experience|exp)[\s\w]*?(\d+)\+?\s*(?:years?|yrs?)/gi,
      /(\d+)\+?\s*(?:years?|yrs?)\s+(?:in|with|of)/gi
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        const years = matches
          .map(match => {
            const numMatch = match.match(/\d+/);
            return numMatch ? parseInt(numMatch[0]) : 0;
          })
          .filter(year => year > 0 && year < 50); // Reasonable bounds
        
        if (years.length > 0) {
          return Math.max(...years); // Return the highest years mentioned
        }
      }
    }

    return null;
  }

  /**
   * Extract education level from text
   */
  static extractEducationLevel(text: string): string | null {
    const patterns = [
      { regex: /ph\.?d|doctorate|doctoral/gi, level: 'PhD' },
      { regex: /master'?s?|m\.s\.|m\.a\.|mba|graduate\s+degree/gi, level: 'Masters' },
      { regex: /bachelor'?s?|b\.s\.|b\.a\.|undergraduate\s+degree/gi, level: 'Bachelors' },
      { regex: /associate'?s?|a\.s\.|a\.a\./gi, level: 'Associates' },
      { regex: /high\s+school|diploma|ged/gi, level: 'High School' }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        return pattern.level;
      }
    }

    return null;
  }

  /**
   * Check if candidate has work authorization
   */
  static checkWorkAuthorization(text: string): boolean | null {
    const positivePatterns = [
      /authorized\s+to\s+work/gi,
      /work\s+authorization/gi,
      /u\.?s\.?\s+citizen/gi,
      /us\s+citizen/gi,
      /u\.?s\.?\s+permanent\s+resident/gi,
      /permanent\s+resident/gi,
      /green\s+card/gi,
      /green[\s-]?card\s+holder/gi,
      /lawful\s+permanent\s+resident/gi,
      /have\s+work\s+authorization/gi,
      /possess\s+work\s+authorization/gi,
      /eligible\s+to\s+work/gi,
      /legally\s+authorized/gi,
      /no\s+sponsorship\s+required/gi,
      /do\s+not\s+require\s+sponsorship/gi
    ];

    const negativePatterns = [
      /require[sd]?\s+(?:visa\s+)?sponsorship/gi,
      /need[sd]?\s+(?:visa\s+)?sponsorship/gi,
      /visa\s+sponsorship\s+required/gi,
      /not\s+authorized\s+to\s+work/gi,
      /will\s+require\s+sponsorship/gi
    ];

    const hasPositive = positivePatterns.some(pattern => pattern.test(text));
    const hasNegative = negativePatterns.some(pattern => pattern.test(text));

    if (hasPositive && !hasNegative) return true;
    if (hasNegative && !hasPositive) return false;
    return null; // Unclear from text
  }

  /**
   * Preprocess text for embedding generation
   */
  static preprocessForEmbedding(text: string): PreprocessedText {
    const normalized = this.normalize(text);
    const tokens = this.tokenize(normalized);
    const cleanTokens = this.cleanTokens(tokens);
    
    return {
      original: text,
      normalized,
      tokens,
      cleanTokens,
      sections: text.length > 2000 ? 
        this.extractJobSections(text) : // Assume job description if long
        this.extractResumeSections(text) as any // Assume resume if shorter
    };
  }

  // Private helper methods
  private static extractSection(text: string, pattern: RegExp): string {
    const matches = text.match(pattern);
    if (!matches) return '';
    
    return matches
      .map(match => match.trim())
      .join('\n\n')
      .replace(/^[^:]*:\s*/, '') // Remove section headers
      .trim();
  }

  private static removeNoise(text: string): string {
    let cleaned = text;
    
    for (const pattern of this.NOISE_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    return this.normalize(cleaned);
  }

  private static isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'and', 'or', 'but', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'will', 'would', 'should', 'could', 'can', 'may', 'must',
      'this', 'that', 'these', 'those', 'we', 'you', 'they', 'it', 'he', 'she'
    ]);
    
    return commonWords.has(word.toLowerCase());
  }
}

/**
 * Utility functions for quick preprocessing
 */
export const preprocessJob = (jobText: string): JobSections => 
  TextPreprocessingUtils.extractJobSections(jobText);

export const preprocessResume = (resumeText: string): ResumeSections => 
  TextPreprocessingUtils.extractResumeSections(resumeText);

export const extractFeatures = (text: string) => ({
  yearsOfExperience: TextPreprocessingUtils.extractYearsOfExperience(text),
  educationLevel: TextPreprocessingUtils.extractEducationLevel(text),
  workAuthorization: TextPreprocessingUtils.checkWorkAuthorization(text),
  preprocessed: TextPreprocessingUtils.preprocessForEmbedding(text)
});