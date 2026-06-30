'use client';

import { useRef, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  FileText,
  FolderOpen,
  Trash2,
  Upload,
} from 'lucide-react';

const DOC_CATEGORIES = [
  'correspondence',
  'court_filing',
  'research',
  'contract',
  'kyc_document',
  'engagement_letter',
  'other',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  correspondence: 'Correspondence',
  court_filing: 'Court Filing',
  research: 'Research',
  contract: 'Contract',
  kyc_document: 'KYC Document',
  engagement_letter: 'Engagement Letter',
  other: 'Other',
};

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  correspondence: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25',
  court_filing: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
  research: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25',
  contract: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  kyc_document: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
  engagement_letter: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/25',
  other: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25',
};

function formatDate(dateString?: string): string {
  if (!dateString) return '\u2014';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '\u2014';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RecordDocumentsPanelProps {
  entityType: string;
  entityId: string;
  emptyHint: string;
}

export function RecordDocumentsPanel({
  entityType,
  entityId,
  emptyHint,
}: RecordDocumentsPanelProps) {
  const { data: documents, isLoading } = useDocuments(entityType, entityId);
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const downloadDocument = useDownloadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>('other');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadDocument.mutateAsync({
        file,
        entityType,
        entityId,
        documentCategory: category,
      });
      toast.success(`"${file.name}" uploaded successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload document',
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: DocRecord) => {
    try {
      await deleteDocument.mutateAsync(doc.id);
      toast.success(`"${doc.fileName}" deleted`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete document',
      );
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to download document',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="record-documents-panel">
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'group cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors',
          'hover:border-primary/50 hover:bg-primary/5',
          uploadDocument.isPending && 'pointer-events-none opacity-60',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          data-testid="record-document-upload-input"
          onChange={handleFileSelect}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-muted p-3 transition-colors group-hover:bg-primary/10">
            <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {uploadDocument.isPending
                ? 'Uploading...'
                : 'Drop files or click to upload'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, images, and working files linked to this record
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Category:</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="h-7 w-40 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!documents || documents.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="record-document-list">
          {documents.map((doc) => {
            const categoryStyle =
              CATEGORY_BADGE_STYLES[doc.documentCategory ?? 'other'] ??
              CATEGORY_BADGE_STYLES.other;
            const categoryLabel =
              CATEGORY_LABELS[doc.documentCategory ?? 'other'] ?? 'Other';

            return (
              <div
                key={doc.id}
                className="group flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-lg bg-muted p-2.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.fileName}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className={cn('px-1.5 py-0 text-[10px]', categoryStyle)}
                    >
                      {categoryLabel}
                    </Badge>
                    <span>{formatFileSize(Number(doc.fileSizeBytes))}</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
