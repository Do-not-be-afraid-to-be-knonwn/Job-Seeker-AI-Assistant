import { SkillsExtractionChain } from '../../chains/SkillsExtractionChain';
import { DomainExtractionChain } from '../../chains/DomainExtractionChain';
import { YearsExtractionChain } from '../../chains/YearsExtractionChain';
import { LevelExtractionChain } from '../../chains/LevelExtractionChain';
import { JobSections, ResumeSections, TextPreprocessingUtils } from './textPreprocessing.utils';
import { Skills } from '../../schemas/skills.schema';
import { Domain } from '../../schemas/domain.schema';
import { Years } from '../../schemas/years.schema';
import { Level } from '../../schemas/level.schema';

export interface ExtractedJobFeatures {
  skills: {
    required: string[];
    preferred: string[];
    all: string[];
  };
  domains: string[];
  yearsRequired: number | null;
  levelRequired: string | null;
  education: string | null;
  workAuthRequired: boolean | null;
  location: string | null;
  rawFeatures: {
    skills: Skills;
    domain: Domain;
    years: Years;
    level: Level;
  };
}

export interface ExtractedResumeFeatures {
  skills: string[];
  domains: string[];
  yearsOfExperience: number | null;
  currentLevel: string | null;
  education: string | null;
  workAuthStatus: boolean | null;
  location: string | null;
  rawFeatures: {
    skills: Skills;
    domain: Domain;
    years: Years;
    level: Level;
  };
}

export interface FeatureMatchAnalysis {
  skillsMatch: {
    coverage: number; // 0-1, percentage of required skills covered
    matchedSkills: string[];
    missingRequired: string[];
    missingPreferred: string[];
    additionalSkills: string[];
    overlapScore: number; // Jaccard similarity
  };
  domainMatch: {
    score: number; // 0-1, domain alignment score
    matchedDomains: string[];
    jobDomains: string[];
    candidateDomains: string[];
  };
  experienceMatch: {
    score: number; // 0-1, experience alignment score
    requiredYears: number | null;
    candidateYears: number | null;
    yearsGap: number; // Positive if candidate has less experience
    gapSeverity: 'none' | 'minor' | 'moderate' | 'major';
  };
  levelMatch: {
    score: number; // 0-1, level alignment score
    requiredLevel: string | null;
    candidateLevel: string | null;
    levelGap: number; // Positive if candidate level is lower
    isPromotable: boolean; // If gap is reasonable for growth
  };
  educationMatch: {
    score: number; // 0-1, education requirement match
    required: string | null;
    candidate: string | null;
    meetsRequirement: boolean;
  };
  locationMatch: {
    score: number; // 0-1, location/authorization match
    workAuthRequired: boolean | null;
    candidateStatus: boolean | null;
    meetsRequirement: boolean;
  };
}

/**
 * Structured feature extraction service using existing LLM chains
 * Extracts and analyzes features from job descriptions and resumes
 */
export class FeatureExtractionService {
  private skillsChain: SkillsExtractionChain;
  private domainChain: DomainExtractionChain;
  private yearsChain: YearsExtractionChain;
  private levelChain: LevelExtractionChain;

  constructor() {
    console.log('Initializing feature extraction chains...');
    this.skillsChain = new SkillsExtractionChain();
    this.domainChain = new DomainExtractionChain();
    this.yearsChain = new YearsExtractionChain();
    this.levelChain = new LevelExtractionChain();
    console.log('Feature extraction chains initialized');
  }

  /**
   * Extract structured features from job description
   */
  async extractJobFeatures(jobSections: JobSections): Promise<ExtractedJobFeatures> {
    // Use requirements section primarily, fallback to full text
    const primaryText = jobSections.requirements || jobSections.rawText;
    const qualificationsText = jobSections.qualifications || jobSections.rawText;

    try {
      // Extract features in parallel
      const [skillsResult, domainResult, yearsResult, levelResult] = await Promise.allSettled([
        this.skillsChain.run({ text: primaryText }),
        this.domainChain.run({ text: primaryText }),
        this.yearsChain.run({ text: primaryText }),
        this.levelChain.run({ text: primaryText })
      ]);

      // Process skills with requirements/preferred separation
      // New chains return ChainOutput<T> with { result, metadata }
      const extractedSkills = skillsResult.status === 'fulfilled' ?
        skillsResult.value.result : { skills: ['None'] as [string, ...string[]] };
      const skills = this.processJobSkills(
        extractedSkills,
        jobSections
      );

      // Extract additional metadata
      const education = TextPreprocessingUtils.extractEducationLevel(primaryText);
      const workAuthRequired = TextPreprocessingUtils.checkWorkAuthorization(primaryText);
      const location = this.extractLocation(jobSections.rawText);

      // New chains return ChainOutput<T> with { result, metadata }
      // Use minYears as the primary requirement
      const extractedYears = yearsResult.status === 'fulfilled' ?
        yearsResult.value.result.minYears : undefined;
      // Level chain returns ChainOutput<LevelOutput> where LevelOutput is { text: Level }
      const extractedLevel = levelResult.status === 'fulfilled' ?
        levelResult.value.result.text.level : undefined;

      return {
        skills,
        domains: domainResult.status === 'fulfilled' ? (domainResult.value.result?.domains || []) : [],
        yearsRequired: (extractedYears === 0 || extractedYears === undefined || extractedYears === null) ? null : extractedYears,
        levelRequired: (extractedLevel === undefined || extractedLevel === null) ? null : extractedLevel,
        education,
        workAuthRequired,
        location,
        rawFeatures: {
          skills: extractedSkills,
          domain: domainResult.status === 'fulfilled' ? domainResult.value.result : { domains: [] },
          years: yearsResult.status === 'fulfilled' ? yearsResult.value.result : { minYears: null, maxYears: null },
          level: levelResult.status === 'fulfilled' ? levelResult.value.result.text : { level: null }
        }
      };

    } catch (error) {
      console.error('Error extracting job features:', error);
      return this.getEmptyJobFeatures();
    }
  }

  /**
   * Extract structured features from resume
   */
  async extractResumeFeatures(resumeSections: ResumeSections): Promise<ExtractedResumeFeatures> {
    // Use experience section primarily, fallback to full text
    const primaryText = resumeSections.experience || resumeSections.rawText;

    try {
      // Extract features in parallel
      const [skillsResult, domainResult, yearsResult, levelResult] = await Promise.allSettled([
        this.skillsChain.run({ text: primaryText }),
        this.domainChain.run({ text: primaryText }),
        this.yearsChain.run({ text: primaryText }),
        this.levelChain.run({ text: primaryText })
      ]);

      // Extract additional metadata
      const education = TextPreprocessingUtils.extractEducationLevel(resumeSections.education || resumeSections.rawText);
      const workAuthStatus = TextPreprocessingUtils.checkWorkAuthorization(resumeSections.rawText);
      const location = this.extractLocation(resumeSections.rawText);

      // New chains return ChainOutput<T> with { result, metadata }
      const extractedResumeSkills = skillsResult.status === 'fulfilled' ?
        skillsResult.value.result : { skills: ['None'] as [string, ...string[]] };
      // New chains return ChainOutput<T> with { result, metadata }
      // Use minYears as the primary requirement
      const extractedYears = yearsResult.status === 'fulfilled' ?
        yearsResult.value.result.minYears : undefined;
      // Level chain returns ChainOutput<LevelOutput> where LevelOutput is { text: Level }
      const extractedLevel = levelResult.status === 'fulfilled' ?
        levelResult.value.result.text.level : undefined;

      return {
        skills: extractedResumeSkills.skills || [],
        domains: domainResult.status === 'fulfilled' ? (domainResult.value.result?.domains || []) : [],
        yearsOfExperience: (extractedYears === 0 || extractedYears === undefined || extractedYears === null) ? null : extractedYears,
        currentLevel: (extractedLevel === undefined || extractedLevel === null) ? null : extractedLevel,
        education,
        workAuthStatus,
        location,
        rawFeatures: {
          skills: extractedResumeSkills,
          domain: domainResult.status === 'fulfilled' ? domainResult.value.result : { domains: [] },
          years: yearsResult.status === 'fulfilled' ? yearsResult.value.result : { minYears: null, maxYears: null },
          level: levelResult.status === 'fulfilled' ? levelResult.value.result.text : { level: null }
        }
      };

    } catch (error) {
      console.error('Error extracting resume features:', error);
      return this.getEmptyResumeFeatures();
    }
  }

  /**
   * Analyze feature matches between job and resume
   */
  async analyzeFeatureMatch(
    jobFeatures: ExtractedJobFeatures,
    resumeFeatures: ExtractedResumeFeatures
  ): Promise<FeatureMatchAnalysis> {
    return {
      skillsMatch: this.analyzeSkillsMatch(jobFeatures.skills, resumeFeatures.skills),
      domainMatch: this.analyzeDomainMatch(jobFeatures.domains, resumeFeatures.domains),
      experienceMatch: this.analyzeExperienceMatch(
        jobFeatures.yearsRequired,
        resumeFeatures.yearsOfExperience
      ),
      levelMatch: this.analyzeLevelMatch(
        jobFeatures.levelRequired,
        resumeFeatures.currentLevel
      ),
      educationMatch: this.analyzeEducationMatch(
        jobFeatures.education,
        resumeFeatures.education
      ),
      locationMatch: this.analyzeLocationMatch(
        jobFeatures.workAuthRequired,
        resumeFeatures.workAuthStatus
      )
    };
  }

  /**
   * Batch extraction for multiple job-resume pairs
   */
  async extractBatchFeatures(
    pairs: Array<{ job: JobSections; resume: ResumeSections }>
  ): Promise<Array<{ job: ExtractedJobFeatures; resume: ExtractedResumeFeatures; match: FeatureMatchAnalysis }>> {
    const BATCH_SIZE = 3; // Small batches to avoid overwhelming the LLM
    const results = [];

    for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
      const batch = pairs.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async ({ job, resume }) => {
        const [jobFeatures, resumeFeatures] = await Promise.all([
          this.extractJobFeatures(job),
          this.extractResumeFeatures(resume)
        ]);
        
        const match = await this.analyzeFeatureMatch(jobFeatures, resumeFeatures);
        
        return { job: jobFeatures, resume: resumeFeatures, match };
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch extraction failed:', result.reason);
          // Add fallback result
          results.push({
            job: this.getEmptyJobFeatures(),
            resume: this.getEmptyResumeFeatures(),
            match: this.getEmptyFeatureMatch()
          });
        }
      }
    }

    return results;
  }

  // Private analysis methods
  private processJobSkills(skillsResult: Skills, jobSections: JobSections): {
    required: string[];
    preferred: string[];
    all: string[];
  } {
    const allSkills = skillsResult.skills || [];

    // Separate required vs preferred based on section context
    const requiredSkills = [];
    const preferredSkills = [];

    const requirementsText = (jobSections.requirements || '').toLowerCase();
    const qualificationsText = (jobSections.qualifications || '').toLowerCase();
    
    for (const skill of allSkills) {
      const skillLower = skill.toLowerCase();
      
      // Check if skill appears in requirements section
      if (requirementsText.includes(skillLower) || 
          requirementsText.includes(`required`)) {
        requiredSkills.push(skill);
      } else if (qualificationsText.includes(skillLower) ||
                qualificationsText.includes(`preferred`) ||
                qualificationsText.includes(`plus`) ||
                qualificationsText.includes(`bonus`)) {
        preferredSkills.push(skill);
      } else {
        // Default to required if unclear
        requiredSkills.push(skill);
      }
    }

    return {
      required: requiredSkills,
      preferred: preferredSkills,
      all: allSkills
    };
  }

  private analyzeSkillsMatch(
    jobSkills: { required: string[]; preferred: string[]; all: string[] },
    resumeSkills: string[]
  ) {
    const normalizedResumeSkills = resumeSkills.map(s => s.toLowerCase());
    const normalizedRequiredSkills = jobSkills.required.map(s => s.toLowerCase());
    const normalizedPreferredSkills = jobSkills.preferred.map(s => s.toLowerCase());

    // Find matches using flexible matching (includes synonyms)
    const matchedSkills = [];
    const missingRequired = [];
    const missingPreferred = [];

    // Check required skills
    for (const skill of jobSkills.required) {
      if (this.skillMatches(skill, normalizedResumeSkills)) {
        matchedSkills.push(skill);
      } else {
        missingRequired.push(skill);
      }
    }

    // Check preferred skills
    for (const skill of jobSkills.preferred) {
      if (this.skillMatches(skill, normalizedResumeSkills) && !matchedSkills.includes(skill)) {
        matchedSkills.push(skill);
      } else {
        missingPreferred.push(skill);
      }
    }

    // Calculate coverage
    const coverage = jobSkills.required.length > 0 
      ? (jobSkills.required.length - missingRequired.length) / jobSkills.required.length
      : 1.0;

    // Jaccard similarity for overall skill overlap
    const allJobSkills = new Set(jobSkills.all.map(s => s.toLowerCase()));
    const allResumeSkills = new Set(normalizedResumeSkills);
    const intersection = new Set([...allJobSkills].filter(s => allResumeSkills.has(s)));
    const union = new Set([...allJobSkills, ...allResumeSkills]);
    const overlapScore = union.size > 0 ? intersection.size / union.size : 0;

    return {
      coverage,
      matchedSkills,
      missingRequired,
      missingPreferred,
      additionalSkills: resumeSkills.filter(skill => 
        !this.skillMatches(skill, jobSkills.all.map(s => s.toLowerCase()))
      ),
      overlapScore
    };
  }

  private skillMatches(jobSkill: string, resumeSkills: string[]): boolean {
    const jobSkillLower = jobSkill.toLowerCase();
    
    // Direct match
    if (resumeSkills.includes(jobSkillLower)) return true;
    
    // Synonym matching (basic)
    const synonyms = this.getSkillSynonyms(jobSkillLower);
    return synonyms.some(synonym => resumeSkills.includes(synonym));
  }

  private getSkillSynonyms(skill: string): string[] {
    const synonymMap: { [key: string]: string[] } = {
      'javascript': ['js', 'node.js', 'nodejs'],
      'node.js': ['nodejs', 'node', 'javascript'],
      'react': ['reactjs', 'react.js'],
      'python': ['py'],
      'typescript': ['ts'],
      'postgresql': ['postgres', 'psql'],
      'mongodb': ['mongo'],
      'aws': ['amazon web services'],
      'gcp': ['google cloud', 'google cloud platform'],
      'docker': ['containerization'],
      'kubernetes': ['k8s']
    };

    return synonymMap[skill] || [];
  }

  private analyzeDomainMatch(jobDomains: string[], resumeDomains: string[]) {
    if (jobDomains.length === 0) {
      return {
        score: 1.0, // No specific domain required
        matchedDomains: [],
        jobDomains,
        candidateDomains: resumeDomains
      };
    }

    const jobDomainsLower = jobDomains.map(d => d.toLowerCase());
    const resumeDomainsLower = resumeDomains.map(d => d.toLowerCase());
    
    const matchedDomains = jobDomains.filter(domain => 
      resumeDomainsLower.includes(domain.toLowerCase())
    );

    const score = matchedDomains.length / jobDomains.length;

    return {
      score,
      matchedDomains,
      jobDomains,
      candidateDomains: resumeDomains
    };
  }

  private analyzeExperienceMatch(requiredYears: number | null, candidateYears: number | null) {
    if (requiredYears === null) {
      return {
        score: 1.0,
        requiredYears,
        candidateYears,
        yearsGap: 0,
        gapSeverity: 'none' as const
      };
    }

    if (candidateYears === null) {
      return {
        score: 0.0, // Null data = 0 score (cannot verify experience)
        requiredYears,
        candidateYears,
        yearsGap: requiredYears || 0,
        gapSeverity: 'major' as const
      };
    }

    const yearsGap = Math.max(0, (requiredYears || 0) - (candidateYears || 0));
    let score = 1.0;
    let gapSeverity: 'none' | 'minor' | 'moderate' | 'major' = 'none';

    if (yearsGap === 0) {
      score = 1.0;
    } else if (yearsGap <= 1) {
      score = 0.9;
      gapSeverity = 'minor';
    } else if (yearsGap <= 3) {
      score = 0.7;
      gapSeverity = 'moderate';
    } else {
      score = 0.4;
      gapSeverity = 'major';
    }

    // Bonus for exceeding requirements
    if (candidateYears > requiredYears) {
      score = Math.min(1.0, score + 0.1);
    }

    return {
      score,
      requiredYears,
      candidateYears,
      yearsGap,
      gapSeverity
    };
  }

  private analyzeLevelMatch(requiredLevel: string | null, candidateLevel: string | null) {
    if (!requiredLevel) {
      return {
        score: 1.0,
        requiredLevel,
        candidateLevel,
        levelGap: 0,
        isPromotable: true
      };
    }

    if (!candidateLevel) {
      return {
        score: 0.0, // Null data = 0 score (cannot verify level)
        requiredLevel,
        candidateLevel,
        levelGap: 3,
        isPromotable: false
      };
    }

    const levelHierarchy = ['Intern', 'Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Manager', 'Director', 'VP', 'Executive'];
    const requiredIndex = levelHierarchy.indexOf(requiredLevel);
    const candidateIndex = levelHierarchy.indexOf(candidateLevel);

    if (requiredIndex === -1 || candidateIndex === -1) {
      return {
        score: 0.5,
        requiredLevel,
        candidateLevel,
        levelGap: 0,
        isPromotable: true
      };
    }

    const levelGap = requiredIndex - candidateIndex;
    let score = 1.0;
    let isPromotable = true;

    if (levelGap === 0) {
      score = 1.0;
    } else if (levelGap === 1) {
      score = 0.8; // One level below - promotable
      isPromotable = true;
    } else if (levelGap === 2) {
      score = 0.6; // Two levels below - stretch role
      isPromotable = true;
    } else if (levelGap > 2) {
      score = 0.3; // Too big a gap
      isPromotable = false;
    } else {
      // Candidate is more senior than required (negative gap)
      score = 1.0;
      isPromotable = true;
    }

    return {
      score,
      requiredLevel,
      candidateLevel,
      levelGap: Math.max(0, levelGap),
      isPromotable
    };
  }

  private analyzeEducationMatch(required: string | null, candidate: string | null) {
    if (!required) {
      return {
        score: 1.0,
        required,
        candidate,
        meetsRequirement: true
      };
    }

    if (!candidate) {
      return {
        score: 0.3, // Missing education is a concern but not disqualifying
        required,
        candidate,
        meetsRequirement: false
      };
    }

    const educationLevels = ['High School', 'Associates', 'Bachelors', 'Masters', 'PhD'];
    const requiredIndex = educationLevels.indexOf(required);
    const candidateIndex = educationLevels.indexOf(candidate);

    if (requiredIndex === -1 || candidateIndex === -1) {
      return {
        score: 0.5,
        required,
        candidate,
        meetsRequirement: true // Benefit of doubt
      };
    }

    const meetsRequirement = candidateIndex >= requiredIndex;
    const score = meetsRequirement ? 1.0 : 0.3;

    return {
      score,
      required,
      candidate,
      meetsRequirement
    };
  }

  private analyzeLocationMatch(workAuthRequired: boolean | null, candidateStatus: boolean | null) {
    if (workAuthRequired === null || workAuthRequired === false) {
      return {
        score: 1.0,
        workAuthRequired,
        candidateStatus,
        meetsRequirement: true
      };
    }

    if (candidateStatus === null) {
      return {
        score: 0.5, // Unknown status gets middle score
        workAuthRequired,
        candidateStatus,
        meetsRequirement: false
      };
    }

    const meetsRequirement = candidateStatus === true;
    const score = meetsRequirement ? 1.0 : 0.1; // Hard gate for work authorization

    return {
      score,
      workAuthRequired,
      candidateStatus,
      meetsRequirement
    };
  }

  private extractLocation(text: string): string | null {
    const locationPatterns = [
      /(?:location|based\s+in|located\s+in)[\s:]*([^.\n]+)/gi,
      /([A-Z][a-z]+,\s*[A-Z]{2})/g, // City, State format
      /(?:remote|hybrid|on-?site)/gi
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return null;
  }

  // Fallback methods
  private getEmptyJobFeatures(): ExtractedJobFeatures {
    return {
      skills: { required: [], preferred: [], all: [] },
      domains: [],
      yearsRequired: null,
      levelRequired: null,
      education: null,
      workAuthRequired: null,
      location: null,
      rawFeatures: {
        skills: { skills: ['None'] },
        domain: { domains: ['General'] },
        years: { minYears: null, maxYears: null },
        level: { level: null }
      }
    };
  }

  private getEmptyResumeFeatures(): ExtractedResumeFeatures {
    return {
      skills: [],
      domains: [],
      yearsOfExperience: null,
      currentLevel: null,
      education: null,
      workAuthStatus: null,
      location: null,
      rawFeatures: {
        skills: { skills: ['None'] },
        domain: { domains: ['General'] },
        years: { minYears: null, maxYears: null },
        level: { level: null }
      }
    };
  }

  private getEmptyFeatureMatch(): FeatureMatchAnalysis {
    return {
      skillsMatch: {
        coverage: 0,
        matchedSkills: [],
        missingRequired: [],
        missingPreferred: [],
        additionalSkills: [],
        overlapScore: 0
      },
      domainMatch: {
        score: 0,
        matchedDomains: [],
        jobDomains: [],
        candidateDomains: []
      },
      experienceMatch: {
        score: 0,
        requiredYears: null,
        candidateYears: null,
        yearsGap: 0,
        gapSeverity: 'none'
      },
      levelMatch: {
        score: 0,
        requiredLevel: null,
        candidateLevel: null,
        levelGap: 0,
        isPromotable: false
      },
      educationMatch: {
        score: 0,
        required: null,
        candidate: null,
        meetsRequirement: false
      },
      locationMatch: {
        score: 0,
        workAuthRequired: null,
        candidateStatus: null,
        meetsRequirement: false
      }
    };
  }
}