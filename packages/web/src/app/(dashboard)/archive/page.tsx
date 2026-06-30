'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Archive,
  Upload,
  Search,
  FileText,
  Plus,
  ScrollText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EnforcementStatCard } from '@/components/enforcement/enforcement-stat-card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useArchiveDocuments,
  useArchiveStats,
  useCreateArchiveDocument,
  usePoas,
  usePoaStats,
  useCreatePoa,
  type ArchiveDocument,
  type Poa,
} from '@/hooks/use-api';

const COURTS = [
  'dubai',
  'sharjah',
  'ajman',
  'abu_dhabi',
  'ras_al_khaimah',
  'fujairah',
  'umm_al_quwain',
  'dubai_rent',
  'sharjah_rent',
] as const;

const DOC_CATEGORIES = [
  'rulings',
  'books',
  'files',
  'laws',
  'gazette',
  'ads',
  'other',
] as const;

const CATEGORY_STYLES: Record<string, string> = {
  rulings: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  books: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  files: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  laws: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  gazette: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  ads: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const POA_TYPES = ['general', 'special', 'litigation', 'real_estate', 'banking'] as const;

const POA_STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  expired: 'bg-red-500/10 text-red-600 dark:text-red-400',
  revoked: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

const POA_TYPE_STYLES: Record<string, string> = {
  general: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  special: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  litigation: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  real_estate: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  banking: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArchivePage() {
  const t = useTranslations('archive');
  const tc = useTranslations('common');
  const te = useTranslations('enforcement');

  // Documents state
  const { data: documents, isLoading: docsLoading } = useArchiveDocuments();
  const { data: archiveStats } = useArchiveStats();
  const createDocument = useCreateArchiveDocument();

  // POA state
  const { data: poas, isLoading: poasLoading } = usePoas();
  const { data: poaStats } = usePoaStats();
  const createPoa = useCreatePoa();

  const [docSearch, setDocSearch] = useState('');
  const [categoryTab, setCategoryTab] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const [poaSearch, setPoaSearch] = useState('');
  const [poaDialogOpen, setPoaDialogOpen] = useState(false);

  // Upload form state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [docCourt, setDocCourt] = useState('');
  const [docCaseNumber, setDocCaseNumber] = useState('');
  const [docCaseStage, setDocCaseStage] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docTags, setDocTags] = useState('');

  // POA form state
  const [poaNumber, setPoaNumber] = useState('');
  const [grantorName, setGrantorName] = useState('');
  const [grantorNameArabic, setGrantorNameArabic] = useState('');
  const [poaType, setPoaType] = useState('');
  const [poaCourt, setPoaCourt] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notarizationNumber, setNotarizationNumber] = useState('');
  const [poaNotes, setPoaNotes] = useState('');

  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    return documents.filter((d) => {
      const matchesSearch =
        !docSearch ||
        d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
        d.caseNumber?.toLowerCase().includes(docSearch.toLowerCase());
      const matchesCategory = categoryTab === 'all' || d.category === categoryTab;
      return matchesSearch && matchesCategory;
    });
  }, [documents, docSearch, categoryTab]);

  const filteredPoas = useMemo(() => {
    if (!poas) return [];
    return poas.filter((p) => {
      return (
        !poaSearch ||
        p.poaNumber.toLowerCase().includes(poaSearch.toLowerCase()) ||
        p.grantorName.toLowerCase().includes(poaSearch.toLowerCase())
      );
    });
  }, [poas, poaSearch]);

  const resetDocForm = () => {
    setDocTitle('');
    setDocCategory('');
    setDocCourt('');
    setDocCaseNumber('');
    setDocCaseStage('');
    setDocDescription('');
    setDocTags('');
  };

  const resetPoaForm = () => {
    setPoaNumber('');
    setGrantorName('');
    setGrantorNameArabic('');
    setPoaType('');
    setPoaCourt('');
    setIssueDate('');
    setExpiryDate('');
    setNotarizationNumber('');
    setPoaNotes('');
  };

  const handleUploadDoc = async () => {
    await createDocument.mutateAsync({
      title: docTitle,
      category: docCategory,
      court: docCourt || undefined,
      caseNumber: docCaseNumber || undefined,
      caseStage: docCaseStage || undefined,
      description: docDescription || undefined,
      tags: docTags || undefined,
      fileName: 'manual-entry',
      blobPath: 'pending',
    });
    resetDocForm();
    setUploadOpen(false);
  };

  const handleCreatePoa = async () => {
    await createPoa.mutateAsync({
      poaNumber,
      grantorName,
      grantorNameArabic: grantorNameArabic || undefined,
      poaType,
      court: poaCourt,
      issueDate,
      expiryDate: expiryDate || undefined,
      notarizationNumber: notarizationNumber || undefined,
      notes: poaNotes || undefined,
    });
    resetPoaForm();
    setPoaDialogOpen(false);
  };

  const isLoading = docsLoading || poasLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white font-heading">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white font-heading">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
        <div className="mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-primary via-pink-500 to-amber-400" />
      </div>

      {/* Top-level Tabs */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">{t('documentsTab')}</TabsTrigger>
          <TabsTrigger value="poas">{t('poasTab')}</TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* Documents & Rulings Tab                                       */}
        {/* ============================================================ */}
        <TabsContent value="documents" className="space-y-6">
          {/* Action buttons */}
          <div className="flex gap-3">
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-pink-600 hover:bg-pink-700">
                  <Upload className="h-4 w-4" />
                  {t('uploadDocument')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('uploadDocument')}</DialogTitle>
                  <DialogDescription>{t('uploadDocumentDesc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t('docTitle')}</Label>
                    <Input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder={t('docTitlePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('docCategory')}</Label>
                    <Select value={docCategory} onValueChange={setDocCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(`categories.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{te('court')}</Label>
                    <Select value={docCourt} onValueChange={setDocCourt}>
                      <SelectTrigger>
                        <SelectValue placeholder={te('selectCourt')} />
                      </SelectTrigger>
                      <SelectContent>
                        {COURTS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {te(`courts.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('caseNumber')}</Label>
                    <Input
                      value={docCaseNumber}
                      onChange={(e) => setDocCaseNumber(e.target.value)}
                      placeholder={te('caseNumberPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('caseStage')}</Label>
                    <Input
                      value={docCaseStage}
                      onChange={(e) => setDocCaseStage(e.target.value)}
                      placeholder={t('caseStagePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('description')}</Label>
                    <Textarea
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      placeholder={t('descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('tags')}</Label>
                    <Input
                      value={docTags}
                      onChange={(e) => setDocTags(e.target.value)}
                      placeholder={t('tagsPlaceholder')}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadOpen(false)}>
                    {tc('cancel')}
                  </Button>
                  <Button
                    onClick={handleUploadDoc}
                    disabled={!docTitle || !docCategory || createDocument.isPending}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    {createDocument.isPending ? tc('loading') : tc('upload')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              {t('contentSearch')}
            </Button>
          </div>

          {/* Category filter tabs */}
          <div className="flex gap-1 overflow-x-auto">
            <Button
              variant={categoryTab === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategoryTab('all')}
            >
              {tc('all')}
            </Button>
            {DOC_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={categoryTab === cat ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCategoryTab(cat)}
                className="whitespace-nowrap"
              >
                {t(`categories.${cat}`)}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder={t('searchDocuments')}
              className="pl-9"
            />
          </div>

          {/* Documents Table */}
          <div className="rounded-xl border">
            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Archive className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">{docSearch ? t('noMatchingDocuments') : t('noDocuments')}</p>
                {!docSearch && <p className="text-xs mt-1">{t('noDocumentsHint')}</p>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('docTitle')}</TableHead>
                    <TableHead>{t('docCategory')}</TableHead>
                    <TableHead>{te('court')}</TableHead>
                    <TableHead>{t('caseNumber')}</TableHead>
                    <TableHead>{t('fileType')}</TableHead>
                    <TableHead>{t('fileSize')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium truncate max-w-[200px]">{d.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('border-0', CATEGORY_STYLES[d.category] || CATEGORY_STYLES.other)}
                        >
                          {t(`categories.${d.category}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.court ? te(`courts.${d.court}`) : '-'}</TableCell>
                      <TableCell>{d.caseNumber || '-'}</TableCell>
                      <TableCell>{d.fileType || '-'}</TableCell>
                      <TableCell>{d.fileSizeBytes ? formatFileSize(d.fileSizeBytes) : '-'}</TableCell>
                      <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* Office POAs Tab                                               */}
        {/* ============================================================ */}
        <TabsContent value="poas" className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <EnforcementStatCard
              title={t('totalPoas')}
              value={poaStats?.total ?? 0}
              icon={ScrollText}
            />
            <EnforcementStatCard
              title={t('activePoas')}
              value={poaStats?.active ?? 0}
              icon={CheckCircle2}
              variant="success"
            />
            <EnforcementStatCard
              title={t('expiringSoon')}
              value={poaStats?.expiringSoon ?? 0}
              icon={AlertTriangle}
              variant="warning"
            />
          </div>

          {/* POA Actions */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={poaSearch}
                onChange={(e) => setPoaSearch(e.target.value)}
                placeholder={t('searchPoas')}
                className="pl-9"
              />
            </div>
            <Dialog open={poaDialogOpen} onOpenChange={setPoaDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('newPoa')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('newPoa')}</DialogTitle>
                  <DialogDescription>{t('newPoaDesc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t('poaNumber')}</Label>
                    <Input
                      value={poaNumber}
                      onChange={(e) => setPoaNumber(e.target.value)}
                      placeholder={t('poaNumberPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('grantorName')}</Label>
                    <Input
                      value={grantorName}
                      onChange={(e) => setGrantorName(e.target.value)}
                      placeholder={t('grantorNamePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('grantorNameArabic')}</Label>
                    <Input
                      dir="rtl"
                      value={grantorNameArabic}
                      onChange={(e) => setGrantorNameArabic(e.target.value)}
                      placeholder={t('grantorNameArabicPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('poaType')}</Label>
                    <Select value={poaType} onValueChange={setPoaType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectPoaType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {POA_TYPES.map((pt) => (
                          <SelectItem key={pt} value={pt}>
                            {t(`poaTypes.${pt}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{te('court')}</Label>
                    <Select value={poaCourt} onValueChange={setPoaCourt}>
                      <SelectTrigger>
                        <SelectValue placeholder={te('selectCourt')} />
                      </SelectTrigger>
                      <SelectContent>
                        {COURTS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {te(`courts.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('issueDate')}</Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('expiryDate')}</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('notarizationNumber')}</Label>
                    <Input
                      value={notarizationNumber}
                      onChange={(e) => setNotarizationNumber(e.target.value)}
                      placeholder={t('notarizationNumberPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{tc('notes')}</Label>
                    <Textarea
                      value={poaNotes}
                      onChange={(e) => setPoaNotes(e.target.value)}
                      placeholder={t('poaNotesPlaceholder')}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPoaDialogOpen(false)}>
                    {tc('cancel')}
                  </Button>
                  <Button
                    onClick={handleCreatePoa}
                    disabled={!poaNumber || !grantorName || !poaType || !poaCourt || !issueDate || createPoa.isPending}
                  >
                    {createPoa.isPending ? tc('loading') : tc('create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* POA Table */}
          <div className="rounded-xl border">
            {filteredPoas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">{poaSearch ? t('noMatchingPoas') : t('noPoas')}</p>
                {!poaSearch && <p className="text-xs mt-1">{t('noPoasHint')}</p>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('poaNumber')}</TableHead>
                    <TableHead>{t('grantorName')}</TableHead>
                    <TableHead>{tc('type')}</TableHead>
                    <TableHead>{te('court')}</TableHead>
                    <TableHead>{t('issueDate')}</TableHead>
                    <TableHead>{t('expiryDate')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPoas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.poaNumber}</TableCell>
                      <TableCell className="truncate max-w-[150px]">{p.grantorName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('border-0', POA_TYPE_STYLES[p.poaType] || POA_TYPE_STYLES.general)}
                        >
                          {t(`poaTypes.${p.poaType}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{te(`courts.${p.court}`)}</TableCell>
                      <TableCell>{new Date(p.issueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('border-0', POA_STATUS_STYLES[p.status] || POA_STATUS_STYLES.active)}
                        >
                          {t(`poaStatuses.${p.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
