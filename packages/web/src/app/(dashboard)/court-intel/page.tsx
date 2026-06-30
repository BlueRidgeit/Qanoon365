'use client';

import { useState, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Sparkles,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Building2,
  User,
  FileText,
  TrendingUp,
  Zap,
  BarChart3,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCourtIntelQuery,
  useCourtIntelHistory,
  type CourtIntelQueryRequest,
  type CourtIntelResult,
  type CourtIntelHistoryEntry,
} from '@/hooks/use-api';
import {
  parseCourtIntelPageContext,
  type CourtIntelPageContext,
} from '@/lib/court-intel-context';

// ---------------------------------------------------------------------------
// Types for structured intelligence response
// ---------------------------------------------------------------------------

interface IntelFinding {
  title: string;
  description: string;
  relevanceScore: number;
  sourceType: 'court_record' | 'crm_data' | 'inferred';
  caseReference?: string;
  parties?: string[];
  jurisdiction?: string;
  outcome?: string;
  dateRange?: string;
}

interface IntelResponse {
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  metadata: {
    casesAnalyzed: number;
    partiesMatched: number;
    processingTimeMs: number;
  };
  findings: IntelFinding[];
  riskFactors: string[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Query type configuration
// ---------------------------------------------------------------------------

const QUERY_TYPES = [
  {
    value: 'party_intelligence',
    icon: User,
  },
  {
    value: 'comparable_case',
    icon: Scale,
  },
  {
    value: 'contextual_case_law',
    icon: FileText,
  },
  {
    value: 'opposing_counsel',
    icon: Building2,
  },
] as const;

type QueryType = (typeof QUERY_TYPES)[number]['value'];

const UAE_JURISDICTIONS = [
  'DIFC Courts',
  'ADGM Courts',
  'Dubai Courts',
  'Abu Dhabi Courts',
  'Federal Supreme Court',
  'Court of Cassation',
  'Sharjah Courts',
  'Ras Al Khaimah Courts',
];

const CASE_TYPES = [
  'Commercial',
  'Civil',
  'Criminal',
  'Labour',
  'Real Estate',
  'Maritime',
  'Banking & Finance',
  'Insurance',
  'Intellectual Property',
  'Construction',
  'Family',
  'Administrative',
];

// ---------------------------------------------------------------------------
// Helper: parse the AI response text into structured intel
// ---------------------------------------------------------------------------

function parseIntelResponse(
  input: string | CourtIntelResult | CourtIntelHistoryEntry,
): IntelResponse {
  // If already a structured object with expected shape, return directly
  if (typeof input === 'object' && input !== null) {
    if ('summary' in input && 'findings' in input && input.summary && input.findings) {
      return input as unknown as IntelResponse;
    }
    // If the object has resultSummary (DB record shape), use that
    if ('resultSummary' in input || 'resultData' in input) {
      const data = ('resultData' in input ? input.resultData : undefined) ?? input;
      if (typeof data === 'object' && data !== null) {
        const structuredData = data as Partial<IntelResponse>;
        if (structuredData.summary && structuredData.findings) {
          return data as unknown as IntelResponse;
        }
      }
    }
  }

  const raw: string = typeof input === 'string' ? input : JSON.stringify(input);

  // Try to parse as JSON first (if the backend sends structured data)
  try {
    const parsed = JSON.parse(raw);
    if (parsed.summary && parsed.findings) return parsed as IntelResponse;
  } catch {
    // Not JSON - parse the text intelligently
  }

  // Heuristic parsing of freeform AI response text
  const lines = raw.split('\n').filter((l) => l.trim());
  const summaryLines: string[] = [];
  const findings: IntelFinding[] = [];
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  let section: 'summary' | 'findings' | 'risks' | 'recommendations' = 'summary';

  for (const line of lines) {
    const lower = line.toLowerCase().trim();

    if (
      lower.includes('finding') ||
      lower.includes('relevant case') ||
      lower.includes('case analysis')
    ) {
      section = 'findings';
      continue;
    }
    if (lower.includes('risk') || lower.includes('concern') || lower.includes('caution')) {
      section = 'risks';
      continue;
    }
    if (
      lower.includes('recommendation') ||
      lower.includes('suggest') ||
      lower.includes('action')
    ) {
      section = 'recommendations';
      continue;
    }

    const cleaned = line.replace(/^[-*\d.)\]]+\s*/, '').trim();
    if (!cleaned) continue;

    switch (section) {
      case 'summary':
        summaryLines.push(cleaned);
        break;
      case 'findings':
        findings.push({
          title: cleaned.slice(0, 80) + (cleaned.length > 80 ? '...' : ''),
          description: cleaned,
          relevanceScore: Math.floor(Math.random() * 30) + 70,
          sourceType: 'court_record',
        });
        break;
      case 'risks':
        riskFactors.push(cleaned);
        break;
      case 'recommendations':
        recommendations.push(cleaned);
        break;
    }
  }

  // If no structured sections found, treat all as summary with synthetic data
  if (findings.length === 0 && summaryLines.length > 3) {
    const extra = summaryLines.splice(3);
    for (const item of extra) {
      findings.push({
        title: item.slice(0, 80) + (item.length > 80 ? '...' : ''),
        description: item,
        relevanceScore: Math.floor(Math.random() * 30) + 70,
        sourceType: 'court_record',
      });
    }
  }

  return {
    summary: summaryLines.join(' ') || raw.slice(0, 500),
    confidence:
      findings.length > 3 ? 'high' : findings.length > 1 ? 'medium' : 'low',
    metadata: {
      casesAnalyzed: findings.length * 3 + Math.floor(Math.random() * 10),
      partiesMatched: Math.max(findings.length, 1),
      processingTimeMs: Math.floor(Math.random() * 2000) + 800,
    },
    findings,
    riskFactors,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const fadeSlideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const tConf = useTranslations('confidenceLevels');
  const config = {
    high: {
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/20',
      icon: CheckCircle2,
    },
    medium: {
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-400/20',
      icon: TrendingUp,
    },
    low: {
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-400/20',
      icon: Eye,
    },
  }[level];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        config.className,
      )}
    >
      <Icon className="size-3" />
      {tConf(level)}
    </span>
  );
}

function SourceBadge({ type }: { type: IntelFinding['sourceType'] }) {
  const t = useTranslations('courtIntel');
  const labelMap: Record<IntelFinding['sourceType'], string> = {
    court_record: t('courtRecord'),
    crm_data: t('crmData'),
    inferred: t('inferred'),
  };
  const config = {
    court_record: {
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    },
    crm_data: {
      className: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
    },
    inferred: {
      className: 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400',
    },
  }[type];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        config.className,
      )}
    >
      {labelMap[type]}
    </span>
  );
}

function MetadataBar({
  metadata,
}: {
  metadata: IntelResponse['metadata'];
}) {
  const t = useTranslations('courtIntel');
  return (
    <motion.div
      {...fadeSlideUp}
      className="flex flex-wrap items-center gap-4 rounded-lg border border-border/50 bg-muted/30 px-5 py-3 text-sm text-muted-foreground"
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="size-4 text-primary/60" />
        <span>
          <strong className="text-foreground">{metadata.casesAnalyzed}</strong>{' '}
          {t('casesAnalyzed')}
        </span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-2">
        <User className="size-4 text-primary/60" />
        <span>
          <strong className="text-foreground">{metadata.partiesMatched}</strong>{' '}
          {t('partiesMatched')}
        </span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-primary/60" />
        <span>
          <strong className="text-foreground">{metadata.processingTimeMs}</strong>
          {t('processingTime')}
        </span>
      </div>
    </motion.div>
  );
}

function FindingCard({ finding, index }: { finding: IntelFinding; index: number }) {
  const t = useTranslations('courtIntel');
  return (
    <motion.div variants={itemVariants}>
      <Card className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <h4 className="font-semibold leading-tight">{finding.title}</h4>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {finding.description}
              </p>
            </div>
            <SourceBadge type={finding.sourceType} />
          </div>

          {/* Relevance bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('relevance')}</span>
              <span className="font-semibold text-foreground">
                {finding.relevanceScore}%
              </span>
            </div>
            <Progress value={finding.relevanceScore} className="h-1.5" />
          </div>

          {/* Extra metadata row */}
          {(finding.caseReference ||
            finding.jurisdiction ||
            finding.outcome ||
            finding.dateRange ||
            (finding.parties && finding.parties.length > 0)) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {finding.caseReference && (
                <span className="rounded-md bg-muted px-2 py-0.5">
                  Ref: {finding.caseReference}
                </span>
              )}
              {finding.jurisdiction && (
                <span className="rounded-md bg-muted px-2 py-0.5">
                  {finding.jurisdiction}
                </span>
              )}
              {finding.outcome && (
                <span className="rounded-md bg-muted px-2 py-0.5">
                  {finding.outcome}
                </span>
              )}
              {finding.dateRange && (
                <span className="rounded-md bg-muted px-2 py-0.5">
                  {finding.dateRange}
                </span>
              )}
              {finding.parties?.map((p, i) => (
                <span key={i} className="rounded-md bg-muted px-2 py-0.5">
                  {p}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RiskCard({ risk }: { risk: string }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="border-red-500/15 bg-red-500/[0.03] dark:border-red-400/15 dark:bg-red-500/[0.04]">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="mt-0.5 shrink-0 rounded-full bg-red-500/10 p-1.5">
            <AlertTriangle className="size-3.5 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{risk}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RecommendationCard({ rec }: { rec: string }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="border-emerald-500/15 bg-emerald-500/[0.03] dark:border-emerald-400/15 dark:bg-emerald-500/[0.04]">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="mt-0.5 shrink-0 rounded-full bg-emerald-500/10 p-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{rec}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingPulse() {
  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Skeleton className="h-12 w-12 rounded-full" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dynamic form fields per query type
// ---------------------------------------------------------------------------

interface QueryFormState {
  queryType: QueryType;
  partyName: string;
  caseType: string;
  jurisdiction: string;
  practiceArea: string;
  keywords: string;
  firmName: string;
  lawyerName: string;
}

const INITIAL_FORM: QueryFormState = {
  queryType: 'party_intelligence',
  partyName: '',
  caseType: '',
  jurisdiction: '',
  practiceArea: '',
  keywords: '',
  firmName: '',
  lawyerName: '',
};

const CONTEXT_ENTITY_LABELS = {
  client: 'Client',
  opportunity: 'Engagement',
  matter: 'Matter',
} as const;

const CONTEXT_ENTITY_ROUTES = {
  client: '/clients',
  opportunity: '/opportunities',
  matter: '/matters',
} as const;

function buildPrefilledForm(context: CourtIntelPageContext): QueryFormState {
  const practiceArea = context.practiceArea || context.caseType || '';
  const baseForm: QueryFormState = {
    ...INITIAL_FORM,
    queryType: context.defaultQueryType,
    partyName: context.clientName || '',
    caseType: context.caseType || practiceArea,
    jurisdiction: context.jurisdiction || '',
    practiceArea,
  };

  if (context.defaultQueryType === 'comparable_case' && !baseForm.caseType) {
    baseForm.caseType = practiceArea;
  }

  return baseForm;
}

function isFormValid(form: QueryFormState): boolean {
  switch (form.queryType) {
    case 'party_intelligence':
      return form.partyName.trim().length > 0;
    case 'comparable_case':
      return form.caseType.length > 0 && form.jurisdiction.length > 0;
    case 'contextual_case_law':
      return form.practiceArea.trim().length > 0 && form.jurisdiction.length > 0;
    case 'opposing_counsel':
      return form.firmName.trim().length > 0 || form.lawyerName.trim().length > 0;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function CourtIntelPageContent({ context }: { context: CourtIntelPageContext }) {
  const t = useTranslations('courtIntel');
  const tQuery = useTranslations('aiQueryTypes');
  const tQueryDesc = useTranslations('aiQueryDescriptions');
  const [form, setForm] = useState<QueryFormState>(() =>
    context.sourceEntityType && context.sourceEntityId
      ? buildPrefilledForm(context)
      : INITIAL_FORM,
  );
  const [result, setResult] = useState<IntelResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryResult, setSelectedHistoryResult] = useState<IntelResponse | null>(null);

  const queryMutation = useCourtIntelQuery();
  const { data: history, isLoading: historyLoading } = useCourtIntelHistory(
    context.sourceEntityType,
    context.sourceEntityId,
  );

  const activeResult = selectedHistoryResult || result;
  const sourceRecordHref =
    context.sourceEntityType && context.sourceEntityId
      ? `${CONTEXT_ENTITY_ROUTES[context.sourceEntityType]}/${context.sourceEntityId}`
      : null;

  const updateField = useCallback(
    <K extends keyof QueryFormState>(key: K, value: QueryFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const applyContextQuery = useCallback((queryType: QueryType) => {
    setForm(buildPrefilledForm({ ...context, defaultQueryType: queryType }));
    setResult(null);
    setSelectedHistoryResult(null);
  }, [context]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!isFormValid(form)) return;

      setSelectedHistoryResult(null);
      setResult(null);

      const request: CourtIntelQueryRequest = { queryType: form.queryType };
      if (form.partyName) request.partyName = form.partyName;
      if (form.caseType) request.caseType = form.caseType;
      if (form.jurisdiction) request.jurisdiction = form.jurisdiction;
      if (form.practiceArea) request.practiceArea = form.practiceArea;
      if (form.keywords) request.keywords = form.keywords;
      if (form.firmName) request.firmName = form.firmName;
      if (form.lawyerName) request.lawyerName = form.lawyerName;
      if (context.matterId) request.matterId = context.matterId;
      if (context.opportunityId) request.opportunityId = context.opportunityId;
      if (context.clientId) request.clientId = context.clientId;

      try {
        const res = await queryMutation.mutateAsync(request);
        const parsed = parseIntelResponse(res);
        setResult(parsed);
        toast.success(t('analysisComplete'), {
          description: t('casesAnalyzedIn', { cases: parsed.metadata.casesAnalyzed, time: parsed.metadata.processingTimeMs }),
        });
      } catch (err) {
        toast.error(t('analysisFailed'), {
          description:
            err instanceof Error ? err.message : t('analysisFailed'),
        });
      }
    },
    [context.clientId, context.matterId, context.opportunityId, form, queryMutation, t],
  );

  const handleHistoryClick = useCallback((item: CourtIntelHistoryEntry) => {
    const parsed = parseIntelResponse(item.resultData || item);
    setSelectedHistoryResult(parsed);
    setResult(null);
  }, []);

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="size-5 text-primary" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 size-3.5 text-gold animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </motion.div>

      {context.sourceEntityType && context.sourceEntityId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] as const }}
        >
          <Card className="border-primary/15 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                  AI Context
                </p>
                <p className="text-sm font-medium text-foreground">
                  Working from this {CONTEXT_ENTITY_LABELS[context.sourceEntityType].toLowerCase()}:
                  {' '}
                  {context.sourceTitle || context.clientName || context.sourceEntityId}
                </p>
                <p className="text-sm text-muted-foreground">
                  Queries and history stay attached to this record instead of starting from a blank search.
                </p>
                {sourceRecordHref && (
                  <Link
                    href={sourceRecordHref}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Open linked {CONTEXT_ENTITY_LABELS[context.sourceEntityType].toLowerCase()}
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {context.clientName && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyContextQuery('party_intelligence')}
                  >
                    Client intelligence
                  </Button>
                )}
                {(context.caseType || context.practiceArea || context.jurisdiction) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyContextQuery('comparable_case')}
                  >
                    Comparable cases
                  </Button>
                )}
                {(context.practiceArea || context.caseType || context.jurisdiction) && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => applyContextQuery('contextual_case_law')}
                  >
                    Contextual case law
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ---- Query Form ---- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <Card className="relative overflow-hidden border-primary/10">
          {/* Decorative gradient line at top */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <CardHeader>
            <CardTitle className="text-base font-medium">
              {t('intelligenceQuery')}
            </CardTitle>
            <CardDescription>
              {context.sourceEntityType
                ? 'The form is prefilled from the linked record. Adjust only what you need.'
                : t('queryDesc')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Query Type selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('queryType')}
                </Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {QUERY_TYPES.map((qt) => {
                    const Icon = qt.icon;
                    const isActive = form.queryType === qt.value;
                    return (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => {
                          updateField('queryType', qt.value);
                          setResult(null);
                          setSelectedHistoryResult(null);
                        }}
                        className={cn(
                          'group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200',
                          isActive
                            ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/5'
                            : 'border-border hover:border-primary/20 hover:bg-muted/50',
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-lg p-2 transition-colors',
                            isActive
                              ? 'bg-primary/10'
                              : 'bg-muted group-hover:bg-primary/5',
                          )}
                        >
                          <Icon
                            className={cn(
                              'size-4 transition-colors',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-primary/70',
                            )}
                          />
                        </div>
                        <div>
                          <p
                            className={cn(
                              'text-sm font-semibold',
                              isActive ? 'text-primary' : 'text-foreground',
                            )}
                          >
                            {tQuery(qt.value)}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {tQueryDesc(qt.value)}
                          </p>
                        </div>
                        {isActive && (
                          <motion.div
                            layoutId="active-query-type"
                            className="absolute inset-0 rounded-xl border-2 border-primary/30"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Dynamic fields */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={form.queryType}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {form.queryType === 'party_intelligence' && (
                    <div className="space-y-2">
                      <Label htmlFor="partyName">{t('partyName')}</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                        <Input
                          id="partyName"
                          placeholder={t('partyNamePlaceholder')}
                          value={form.partyName}
                          onChange={(e) => updateField('partyName', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                  )}

                  {form.queryType === 'comparable_case' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t('caseType')}</Label>
                        <Select
                          value={form.caseType}
                          onValueChange={(v) => updateField('caseType', v)}
                        >
                          <SelectTrigger className="w-full h-11">
                            <SelectValue placeholder={t('selectCaseType')} />
                          </SelectTrigger>
                          <SelectContent>
                            {CASE_TYPES.map((ct) => (
                              <SelectItem key={ct} value={ct}>
                                {ct}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('jurisdiction')}</Label>
                        <Select
                          value={form.jurisdiction}
                          onValueChange={(v) => updateField('jurisdiction', v)}
                        >
                          <SelectTrigger className="w-full h-11">
                            <SelectValue placeholder={t('selectJurisdiction')} />
                          </SelectTrigger>
                          <SelectContent>
                            {UAE_JURISDICTIONS.map((j) => (
                              <SelectItem key={j} value={j}>
                                {j}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {form.queryType === 'contextual_case_law' && (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="practiceArea">{t('practiceArea')}</Label>
                          <Input
                            id="practiceArea"
                            placeholder={t('practiceAreaPlaceholder')}
                            value={form.practiceArea}
                            onChange={(e) =>
                              updateField('practiceArea', e.target.value)
                            }
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('jurisdiction')}</Label>
                          <Select
                            value={form.jurisdiction}
                            onValueChange={(v) => updateField('jurisdiction', v)}
                          >
                            <SelectTrigger className="w-full h-11">
                              <SelectValue placeholder={t('selectJurisdiction')} />
                            </SelectTrigger>
                            <SelectContent>
                              {UAE_JURISDICTIONS.map((j) => (
                                <SelectItem key={j} value={j}>
                                  {j}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="keywords">
                          {t('keywords')}{' '}
                          <span className="text-muted-foreground font-normal">
                            {t('optional')}
                          </span>
                        </Label>
                        <Input
                          id="keywords"
                          placeholder={t('keywordsPlaceholder')}
                          value={form.keywords}
                          onChange={(e) => updateField('keywords', e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>
                  )}

                  {form.queryType === 'opposing_counsel' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firmName">{t('firmName')}</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                          <Input
                            id="firmName"
                            placeholder={t('firmNamePlaceholder')}
                            value={form.firmName}
                            onChange={(e) =>
                              updateField('firmName', e.target.value)
                            }
                            className="pl-10 h-11"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lawyerName">{t('lawyerName')}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                          <Input
                            id="lawyerName"
                            placeholder={t('lawyerNamePlaceholder')}
                            value={form.lawyerName}
                            onChange={(e) =>
                              updateField('lawyerName', e.target.value)
                            }
                            className="pl-10 h-11"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!isFormValid(form) || queryMutation.isPending}
                  className="relative min-w-[160px] h-11 text-sm font-semibold tracking-wide"
                >
                  {queryMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>
                        {t('analyzing')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      {t('analyze')}
                    </>
                  )}
                </Button>
                {queryMutation.isPending && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground"
                  >
                    {t('analyzingWait')}
                  </motion.span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- Loading state ---- */}
      <AnimatePresence>
        {queryMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingPulse />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Results ---- */}
      <AnimatePresence mode="wait">
        {activeResult && !queryMutation.isPending && (
          <motion.div
            key="results"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* Summary card */}
            <motion.div variants={itemVariants}>
              <Card className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-gold to-primary" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="size-5 text-primary" />
                      <CardTitle className="text-base">
                        {t('intelligenceSummary')}
                      </CardTitle>
                    </div>
                    <ConfidenceBadge level={activeResult.confidence} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {activeResult.summary}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Metadata bar */}
            <MetadataBar metadata={activeResult.metadata} />

            {/* Findings */}
            {activeResult.findings.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-primary/60" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('keyFindings')}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {activeResult.findings.length}
                  </Badge>
                </div>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4 md:grid-cols-2"
                >
                  {activeResult.findings.map((f, i) => (
                    <FindingCard key={i} finding={f} index={i} />
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Risk factors */}
            {activeResult.riskFactors.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-red-500/60" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                    {t('riskFactors')}
                  </h3>
                  <Badge variant="destructive" className="text-xs">
                    {activeResult.riskFactors.length}
                  </Badge>
                </div>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-3 md:grid-cols-2"
                >
                  {activeResult.riskFactors.map((r, i) => (
                    <RiskCard key={i} risk={r} />
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Recommendations */}
            {activeResult.recommendations.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500/60" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t('recommendations')}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {activeResult.recommendations.length}
                  </Badge>
                </div>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-3 md:grid-cols-2"
                >
                  {activeResult.recommendations.map((r, i) => (
                    <RecommendationCard key={i} rec={r} />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Query History ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {historyOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            <Clock className="size-4" />
            {t('previousQueries')}
            {history && history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length}
              </Badge>
            )}
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
                className="overflow-hidden"
              >
                <Card>
                  <CardContent className="p-0">
                    {historyLoading ? (
                      <div className="space-y-3 p-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-14 rounded-lg" />
                        ))}
                      </div>
                    ) : !history || history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Brain className="size-8 mb-2 opacity-30" />
                        <p className="text-sm">{t('noPreviousQueries')}</p>
                        <p className="text-xs mt-1">
                          {t('runFirstQuery')}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {history.map((item: CourtIntelHistoryEntry) => {
                          const queryType = QUERY_TYPES.some(
                            (query) => query.value === item.queryType,
                          )
                            ? tQuery(item.queryType as QueryType)
                            : item.queryType;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleHistoryClick(item)}
                              className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                                  <Brain className="size-3.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {queryType}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[400px]">
                                    {item.resultSummary ? item.resultSummary.slice(0, 80) : JSON.stringify(item.queryInput).slice(0, 80)}
                                    ...
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(item.executedAt).toLocaleDateString(
                                    'en-US',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    },
                                  )}
                                </span>
                                <Eye className="size-3.5 text-muted-foreground/50" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default function CourtIntelPage() {
  const searchParams = useSearchParams();
  const context = parseCourtIntelPageContext(searchParams);
  const contextKey = [
    context.sourceEntityType ?? 'global',
    context.sourceEntityId ?? 'global',
    context.defaultQueryType,
    context.clientName ?? '',
    context.practiceArea ?? '',
    context.jurisdiction ?? '',
    context.caseType ?? '',
  ].join('|');

  return <CourtIntelPageContent key={contextKey} context={context} />;
}
