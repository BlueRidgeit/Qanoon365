'use client';

import { useState, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDownloadDocument,
  type Document as DocRecord,
} from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import {
  Download,
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  Music,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type CategoryFilter =
  | 'all'
  | 'correspondence'
  | 'court_filing'
  | 'research'
  | 'contract'
  | 'kyc_document'
  | 'engagement_letter'
  | 'other';

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'court_filing', label: 'Court Filings & Pleadings' },
  { value: 'research', label: 'Legal Memoranda' },
  { value: 'contract', label: 'Agreements & Contracts' },
  { value: 'kyc_document', label: 'KYC Document' },
  { value: 'engagement_letter', label: 'Engagement Letter' },
  { value: 'other', label: 'Miscellaneous' },
];

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  correspondence: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25',
  court_filing: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
  research: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25',
  contract: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  kyc_document: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
  engagement_letter: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/25',
  other: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25',
};

const ENTITY_TYPE_ROUTES: Record<string, string> = {
  matter: '/matters',
  client: '/clients',
  opportunity: '/opportunities',
  contact: '/contacts',
  lead: '/leads',
  kyc_record: '/kyc',
  execution_file: '/enforcement/execution-files',
};

const DOC_CATEGORIES = [
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'court_filing', label: 'Court Filing' },
  { value: 'research', label: 'Research' },
  { value: 'contract', label: 'Contract' },
  { value: 'kyc_document', label: 'KYC Document' },
  { value: 'engagement_letter', label: 'Engagement Letter' },
  { value: 'other', label: 'Other' },
];

const ENTITY_TYPES = [
  { value: 'matter', translationKey: 'matter' },
  { value: 'client', translationKey: 'client' },
  { value: 'opportunity', translationKey: 'opportunity' },
  { value: 'contact', translationKey: 'contact' },
  { value: 'lead', translationKey: 'lead' },
  { value: 'kyc_record', translationKey: 'kyc' },
  { value: 'execution_file', translationKey: 'execution_file' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString?: string): string {
  if (!dateString) return '\u2014';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '\u2014';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string): React.ElementType {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (['pdf'].includes(ext)) return FileText;
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return FileText;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return FileImage;
  if (['mp4', 'avi', 'mov', 'wmv', 'mkv'].includes(ext)) return FileVideo;
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return Music;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FileArchive;
  if (['js', 'ts', 'py', 'java', 'html', 'css', 'json', 'xml'].includes(ext)) return FileCode;
  return File;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DocumentsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-[260px]" />
      </div>
      <div className="rounded-lg border">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ filtered }: { filtered: boolean }) {
  const t = useTranslations('documents');
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-xl bg-muted p-4 mb-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">
        {filtered ? t('noMatchingDocuments') : t('noDocuments')}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? 'Try adjusting your search or category filter.'
          : t('noDocumentsHint')}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload Dialog
// ---------------------------------------------------------------------------

function UploadDialog() {
  const t = useTranslations('documents');
  const tCat = useTranslations('documentCategories');
  const tEntity = useTranslations('entityTypes');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [documentCategory, setDocumentCategory] = useState('other');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDocument = useUploadDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleUpload = async () => {
    if (!file || !entityType || !entityId) return;

    try {
      await uploadDocument.mutateAsync({
        file,
        entityType,
        entityId,
        documentCategory,
      });
      toast.success(`"${file.name}" uploaded successfully`);
      setOpen(false);
      setFile(null);
      setEntityType('');
      setEntityId('');
      setDocumentCategory('other');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      toast.error('Failed to upload document');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-1.5 h-4 w-4" />
          {t('uploadDocument')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('uploadDocument')}</DialogTitle>
          <DialogDescription>
            {t('uploadDocumentDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker */}
          <div className="space-y-2">
            <Label>{t('file')}</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                'hover:border-primary/50 hover:bg-primary/5',
                file && 'border-primary/30 bg-primary/5',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('clickToSelect')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Entity type */}
          <div className="space-y-2">
            <Label>{t('entityType')}</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectEntityType')} />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    {tEntity(et.translationKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity ID */}
          <div className="space-y-2">
            <Label>{t('entityId')}</Label>
            <Input
              placeholder={t('entityIdPlaceholder')}
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t('category')}</Label>
            <Select value={documentCategory} onValueChange={setDocumentCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {tCat(cat.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !entityType || !entityId || uploadDocument.isPending}
          >
            {uploadDocument.isPending ? t('uploading') : tc('upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocumentsPage() {
  const t = useTranslations('documents');
  const tCat = useTranslations('documentCategories');
  const tEntity = useTranslations('entityTypes');
  const tc = useTranslations('common');
  const { data: documents, isLoading } = useDocuments();
  const deleteDocument = useDeleteDocument();
  const downloadDocument = useDownloadDocument();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!documents) return [];
    let result = [...documents];

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((d) => (d.documentCategory ?? 'other') === categoryFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) =>
        d.fileName.toLowerCase().includes(q),
      );
    }

    // Sort by upload date descending
    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return result;
  }, [documents, categoryFilter, search]);

  const handleDelete = async (doc: DocRecord) => {
    try {
      await deleteDocument.mutateAsync(doc.id);
      toast.success(`"${doc.fileName}" deleted`);
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = async (doc: DocRecord) => {
    setDownloadingId(doc.id);
    try {
      const download = await downloadDocument.mutateAsync(doc.id);
      const link = document.createElement('a');
      link.href = download.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = download.fileName || doc.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloading "${doc.fileName}"`);
    } catch {
      toast.error('Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <UploadDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
        >
          <TabsList className="flex-wrap">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.value === 'all' ? tc('all') : tCat(tab.value)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchDocuments')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <DocumentsTableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          filtered={categoryFilter !== 'all' || search.trim().length > 0}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fileName')}</TableHead>
                <TableHead className="w-[140px]">{t('category')}</TableHead>
                <TableHead className="w-[140px]">{t('entity')}</TableHead>
                <TableHead className="w-[100px]">{t('size')}</TableHead>
                <TableHead className="w-[80px]">{t('version')}</TableHead>
                <TableHead className="w-[120px]">{t('uploaded')}</TableHead>
                <TableHead className="w-[100px] text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => {
                const category = doc.documentCategory ?? 'other';
                const catStyle = CATEGORY_BADGE_STYLES[category] ?? CATEGORY_BADGE_STYLES.other;
                const catLabel = tCat(category);
                const FileIcon = getFileIcon(doc.fileName);
                const entityLabel = tEntity(doc.entityType === 'kyc_record' ? 'kyc' : doc.entityType);
                const entityRoute = ENTITY_TYPE_ROUTES[doc.entityType];

                return (
                  <TableRow key={doc.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-muted p-1.5">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium truncate max-w-[300px]">
                          {doc.fileName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', catStyle)}
                      >
                        {catLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entityRoute ? (
                        <Link
                          href={`${entityRoute}/${doc.entityId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {entityLabel}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {entityLabel}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(Number(doc.fileSizeBytes))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      v{doc.version}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(doc.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc)}
                          disabled={deleteDocument.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
