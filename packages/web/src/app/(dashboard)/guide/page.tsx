'use client';

import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  IconGuide,
  IconDashboard,
  IconEnquiries,
  IconPipeline,
  IconMatters,
  IconClients,
  IconContacts,
  IconConflict,
  IconKyc,
  IconGavel,
  IconAI,
  IconDocuments,
  IconSettings,
} from '@/components/layout/nav-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface GuideSection {
  id: string;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  extraKeys?: string[];
}

const sections: GuideSection[] = [
  {
    id: 'getting-started',
    titleKey: 'gettingStarted',
    descKey: 'gettingStartedDesc',
    icon: IconGuide,
    extraKeys: ['gettingStartedLogin', 'gettingStartedNav', 'gettingStartedRoles'],
  },
  {
    id: 'dashboard',
    titleKey: 'firmDashboardGuide',
    descKey: 'firmDashboardDesc',
    icon: IconDashboard,
  },
  {
    id: 'enquiries',
    titleKey: 'enquiriesGuide',
    descKey: 'enquiriesDesc',
    icon: IconEnquiries,
  },
  {
    id: 'pipeline',
    titleKey: 'pipelineGuide',
    descKey: 'pipelineDesc',
    icon: IconPipeline,
  },
  {
    id: 'matters',
    titleKey: 'mattersGuide',
    descKey: 'mattersDesc',
    icon: IconMatters,
  },
  {
    id: 'clients',
    titleKey: 'clientsGuide',
    descKey: 'clientsDesc',
    icon: IconClients,
  },
  {
    id: 'contacts',
    titleKey: 'contactsGuide',
    descKey: 'contactsDesc',
    icon: IconContacts,
  },
  {
    id: 'conflicts',
    titleKey: 'conflictsGuide',
    descKey: 'conflictsDesc',
    icon: IconConflict,
  },
  {
    id: 'kyc',
    titleKey: 'kycGuide',
    descKey: 'kycDesc',
    icon: IconKyc,
  },
  {
    id: 'enforcement',
    titleKey: 'enforcementGuide',
    descKey: 'enforcementDesc',
    icon: IconGavel,
  },
  {
    id: 'intelligence',
    titleKey: 'intelligenceGuide',
    descKey: 'intelligenceDesc',
    icon: IconAI,
  },
  {
    id: 'documents',
    titleKey: 'documentsGuide',
    descKey: 'documentsDesc',
    icon: IconDocuments,
  },
  {
    id: 'settings',
    titleKey: 'settingsGuide',
    descKey: 'settingsDesc',
    icon: IconSettings,
  },
];

export default function GuidePage() {
  const t = useTranslations('guide');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
          {t('title')}
        </h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Table of Contents */}
      <Card>
        <CardContent className="py-5 px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            {t('tableOfContents')}
          </h2>
          <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-muted text-foreground/80 hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 text-primary shrink-0" />
                  {t(section.titleKey as Parameters<typeof t>[0])}
                </a>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {/* Guide Sections */}
      <div className="space-y-6">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <Card>
                <CardContent className="py-6 px-6">
                  <div className={cn('flex items-start gap-4', isRtl && 'flex-row-reverse text-right')}>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {t(section.titleKey as Parameters<typeof t>[0])}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        {t(section.descKey as Parameters<typeof t>[0])}
                      </p>
                      {section.extraKeys?.map((key) => (
                        <p key={key} className="text-muted-foreground leading-relaxed">
                          {t(key as Parameters<typeof t>[0])}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {index < sections.length - 1 && <Separator className="mt-6" />}
            </section>
          );
        })}
      </div>
    </div>
  );
}
