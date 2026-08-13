import type { IncidentIssueType, IssueAnalysisResult } from '@/lib/incidents/types';
import type { MaintenanceCategory } from '@/types';

type PatternRule = {
  type: IncidentIssueType;
  patterns: RegExp[];
  categoryHint?: MaintenanceCategory;
};

const RULES: PatternRule[] = [
  {
    type: 'WATER_LEAK',
    patterns: [/ус\s*алд/i, /ус\s*гоож/i, /ус\s*дус/i, /тааз.*ус/i, /ус\s*гар/i, /хоолой.*хагар/i, /усны\s*шугам/i, /doosh.*us/i],
    categoryHint: 'PLUMBING',
  },
  {
    type: 'NO_WATER',
    patterns: [/ус\s*гарахгүй/i, /ус\s*байхгүй/i, /ус\s*ирэхгүй/i, /no\s*water/i],
    categoryHint: 'PLUMBING',
  },
  {
    type: 'LOW_WATER_PRESSURE',
    patterns: [/ус\s*бага/i, /даралт\s*бага/i, /сул\s*ус/i],
    categoryHint: 'PLUMBING',
  },
  {
    type: 'ELECTRICITY',
    patterns: [/цахилгаан/i, /гэрэл\s*асахгүй/i, /утас\s*асахгүй/i, /хүчдэл/i, /electric/i],
    categoryHint: 'ELECTRICAL',
  },
  {
    type: 'ELEVATOR',
    patterns: [/лифт/i, /elevator/i, /шат/i],
    categoryHint: 'STRUCTURAL',
  },
  {
    type: 'HEATING',
    patterns: [/халаалт/i, /дулаан/i, /радиатор/i, /heat/i],
    categoryHint: 'HVAC',
  },
  {
    type: 'SECURITY',
    patterns: [/аюулгүй/i, /хулгай/i, /түгжээ/i, /хяналт/i, /security/i],
    categoryHint: 'OTHER',
  },
  {
    type: 'PARKING',
    patterns: [/зогсоол/i, /машин/i, /parking/i],
    categoryHint: 'OTHER',
  },
  {
    type: 'NOISE',
    patterns: [/шууг/i, /noise/i, /чимээ/i],
    categoryHint: 'OTHER',
  },
  {
    type: 'CLEANING',
    patterns: [/цэвэр/i, /хог/i, /clean/i],
    categoryHint: 'CLEANING',
  },
  {
    type: 'FIRE_SAFETY',
    patterns: [/гал/i, /унт/i, /fire/i, /шат\s*гал/i],
    categoryHint: 'OTHER',
  },
  {
    type: 'GAS',
    patterns: [/хий/i, /gas/i, /утлаг/i],
    categoryHint: 'OTHER',
  },
];

const CATEGORY_MAP: Record<MaintenanceCategory, IncidentIssueType> = {
  PLUMBING: 'WATER_LEAK',
  ELECTRICAL: 'ELECTRICITY',
  HVAC: 'HEATING',
  STRUCTURAL: 'OTHER',
  CLEANING: 'CLEANING',
  OTHER: 'OTHER',
};

/** Rule-based fallback analyzer — always available */
export function analyzeIssueRuleBased(input: {
  title: string;
  description: string | null;
  category: MaintenanceCategory;
}): IssueAnalysisResult {
  const text = `${input.title} ${input.description ?? ''}`.toLowerCase();
  const keywords_matched: string[] = [];

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) {
        keywords_matched.push(match[0]);
        return {
          detected_type: rule.type,
          normalized_category: rule.type,
          keywords_matched,
          source: 'RULE_BASED',
        };
      }
    }
  }

  return {
    detected_type: CATEGORY_MAP[input.category] ?? 'OTHER',
    normalized_category: CATEGORY_MAP[input.category] ?? 'OTHER',
    keywords_matched: [],
    source: 'RULE_BASED',
  };
}

/** Pluggable entry — swap for AI provider later */
export async function analyzeIssue(input: {
  title: string;
  description: string | null;
  category: MaintenanceCategory;
}): Promise<IssueAnalysisResult> {
  try {
    // Future: if (process.env.INCIDENT_AI_URL) return aiProvider.analyzeIssue(input);
    return analyzeIssueRuleBased(input);
  } catch {
    return analyzeIssueRuleBased(input);
  }
}
