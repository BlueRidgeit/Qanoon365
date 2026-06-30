import { type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size = 18) {
  return {
    viewBox: '0 0 18 18',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...(size !== 18 ? { width: size, height: size } : {}),
  };
}

export function IconTasks({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="3" y="3" width="12" height="13" rx="1.5" />
      <path d="M6.5 3.5V3a1.5 1.5 0 013 0v0.5h2V5h-5V3.5z" />
      <path d="M5.5 8.5l1 1 1.75-2" />
      <path d="M10 9h3" />
      <path d="M5.5 12l1 1 1.75-2" />
      <path d="M10 12.5h3" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   1. FIRM DASHBOARD — Bento grid: asymmetric tiles suggesting a command
   centre overview. Large tile top-left, smaller tiles arranged around it.
   ----------------------------------------------------------------------- */
export function IconDashboard({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Large tile — top-left */}
      <rect x="1.5" y="1.5" width="8" height="8" rx="1.5" />
      {/* Small tile — top-right */}
      <rect x="11.5" y="1.5" width="5" height="3.5" rx="1" />
      {/* Small tile — mid-right */}
      <rect x="11.5" y="7" width="5" height="3" rx="1" />
      {/* Wide tile — bottom-left */}
      <rect x="1.5" y="11.5" width="5.5" height="5" rx="1" />
      {/* Wide tile — bottom-right */}
      <rect x="9" y="12" width="7.5" height="4.5" rx="1" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   2. NEW ENQUIRIES — A document with a person silhouette and a small "+"
   sign, conveying new business/intake arriving.
   ----------------------------------------------------------------------- */
export function IconEnquiries({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Document body */}
      <path d="M4 2.5h7l3.5 3.5v9.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-13a1 1 0 011-1z" />
      {/* Folded corner */}
      <path d="M11 2.5v3.5h3.5" />
      {/* Person silhouette inside document */}
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M6 13.5a2.5 2.5 0 015 0" />
      {/* Plus sign — new arrival */}
      <path d="M14.5 1v3M13 2.5h3" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   3. ENGAGEMENT PIPELINE — A refined funnel with staged lines inside,
   representing stages narrowing toward an outcome (instruction).
   ----------------------------------------------------------------------- */
export function IconPipeline({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Funnel outline: wide top tapering to narrow bottom spout */}
      <path d="M2 2.5h14l-4.5 6v5l-3 2v-7L4 2.5" />
      {/* Stage lines inside the funnel */}
      <path d="M4.5 5h9" />
      <path d="M6 7.5h6" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   4. ACTIVE MATTERS — Elegant scales of justice with a refined pillar,
   balanced pans on chains, and a tapered base.
   ----------------------------------------------------------------------- */
export function IconMatters({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Pillar */}
      <path d="M9 3v11.5" />
      {/* Ornamental top */}
      <circle cx="9" cy="2.5" r="0.75" fill="currentColor" stroke="none" />
      {/* Beam */}
      <path d="M3 5h12" />
      {/* Left chain and pan */}
      <path d="M4.5 5v2.5" />
      <path d="M2.5 7.5c0 1.5 1.2 2.5 2 2.5s2-1 2-2.5" />
      <path d="M2.5 7.5h4" />
      {/* Right chain and pan */}
      <path d="M13.5 5v2.5" />
      <path d="M11.5 7.5c0 1.5 1.2 2.5 2 2.5s2-1 2-2.5" />
      <path d="M11.5 7.5h4" />
      {/* Base */}
      <path d="M6.5 16h5" />
      <path d="M7.5 16l1.5-1.5L10.5 16" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   5. CLIENT DIRECTORY — Two people with a subtle connecting arc between
   them, and a small folder tab element beneath.
   ----------------------------------------------------------------------- */
export function IconClients({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Primary person */}
      <circle cx="6" cy="5" r="2" />
      <path d="M2 12.5a4 4 0 018 0" />
      {/* Secondary person (slightly behind) */}
      <circle cx="12.5" cy="5.5" r="1.75" />
      <path d="M9.5 12.5a3.5 3.5 0 016 0" />
      {/* Connecting arc between them — network / directory feel */}
      <path d="M8 4a3 3 0 012.5 0" strokeWidth="1" strokeDasharray="1.5 1" />
      {/* Directory underline */}
      <path d="M2 14.5h14" />
      {/* Folder tab */}
      <path d="M2 14.5v1h3l1-1" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   6. COUNSEL & CONTACTS — A contact card / vCard with a person outline
   and horizontal address lines.
   ----------------------------------------------------------------------- */
export function IconContacts({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Card body */}
      <rect x="1.5" y="3" width="15" height="12" rx="1.5" />
      {/* Person avatar on left side of card */}
      <circle cx="6" cy="7.5" r="1.5" />
      <path d="M4 11.5a2 2 0 014 0" />
      {/* Contact detail lines on right side */}
      <path d="M10.5 6.5h3.5" />
      <path d="M10.5 9h2.5" />
      <path d="M10.5 11.5h3" />
      {/* Vertical divider */}
      <path d="M9 5v7" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   7. CONFLICT CHECKS — A shield with two opposing diagonal arrows inside,
   conveying ethical review / checking for conflicts of interest.
   ----------------------------------------------------------------------- */
export function IconConflict({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Shield shape */}
      <path d="M9 1.5L2.5 4v4.5c0 4 3 6.5 6.5 8 3.5-1.5 6.5-4 6.5-8V4L9 1.5z" />
      {/* Two opposing arrows — clean X pattern */}
      {/* Arrow top-left to bottom-right */}
      <path d="M6 6.5l6 5.5" />
      <path d="M6 6.5l2 0.5" />
      <path d="M6 6.5l0.5 2" />
      {/* Arrow bottom-left to top-right */}
      <path d="M12 6.5l-6 5.5" />
      <path d="M12 6.5l-2 0.5" />
      <path d="M12 6.5l-0.5 2" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   8. KYC & COMPLIANCE — A document with a person silhouette at top and
   a verified badge/checkmark, conveying identity verification.
   ----------------------------------------------------------------------- */
export function IconKyc({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Document / ID card */}
      <rect x="2" y="2.5" width="14" height="13" rx="1.5" />
      {/* Person identity */}
      <circle cx="7" cy="7" r="1.75" />
      <path d="M4.5 11.5a2.5 2.5 0 015 0" />
      {/* ID lines on right */}
      <path d="M11.5 6h3" />
      <path d="M11.5 8.5h2" />
      {/* Verified badge — circle with check at bottom-right corner */}
      <circle cx="14" cy="13" r="2.5" fill="currentColor" stroke="currentColor" />
      <path d="M12.75 13l0.75 0.75 1.5-1.5" stroke="var(--sidebar)" strokeWidth="1.5" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   9. ENFORCEMENT DASHBOARD — An elegant gavel with a well-proportioned
   head, handle, and sound block platform.
   ----------------------------------------------------------------------- */
export function IconGavel({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Gavel head — angled, path-based for clarity */}
      <path d="M7 2l7.5 4-1 2L6 4z" />
      {/* Handle */}
      <path d="M8.5 5.5L4.5 12.5" strokeWidth="1.8" />
      {/* Sound block — raised platform */}
      <path d="M2 16h7" />
      <path d="M2.5 16v-1.5h6V16" />
      {/* Impact lines */}
      <path d="M4 13.5l1-1" strokeWidth="1" />
      <path d="M6.5 13.5l-0.5-1" strokeWidth="1" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   10. EXECUTION FILES — A document with an official seal/stamp at the
   bottom-right, conveying filed enforcement action.
   ----------------------------------------------------------------------- */
export function IconExecutionFiles({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Document body */}
      <path d="M4 2h7l3.5 3.5v9a1.5 1.5 0 01-1.5 1.5H4a1.5 1.5 0 01-1.5-1.5v-11A1.5 1.5 0 014 2z" />
      {/* Folded corner */}
      <path d="M11 2v3.5h3.5" />
      {/* Text lines */}
      <path d="M5.5 8h5" />
      <path d="M5.5 10.5h3.5" />
      {/* Official stamp / seal circle at bottom-right */}
      <circle cx="12" cy="13" r="2.5" />
      <circle cx="12" cy="13" r="1" strokeWidth="1" />
      {/* Stamp handle going up */}
      <path d="M12 10.5v-1" strokeWidth="1.2" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   11. CRIMINAL COMPLAINTS — A shield with an exclamation mark inside,
   conveying a formal/serious legal complaint or alert.
   ----------------------------------------------------------------------- */
export function IconComplaints({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Shield / badge shape */}
      <path d="M9 1.5L3 4v4c0 4.5 3 7.5 6 9 3-1.5 6-4.5 6-9V4L9 1.5z" />
      {/* Exclamation — alert */}
      <path d="M9 6v4" />
      <circle cx="9" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   12. FOLLOW-UP SETTINGS — An elegant calendar with a small clock inset
   at the bottom-right corner.
   ----------------------------------------------------------------------- */
export function IconCalendar({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Calendar body */}
      <rect x="1.5" y="3" width="12.5" height="12" rx="1.5" />
      {/* Binding rings */}
      <path d="M5.5 1.5v3M10 1.5v3" />
      {/* Header divider */}
      <path d="M1.5 7h12.5" />
      {/* Date grid dots — elegant sparse grid */}
      <circle cx="5" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="11" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
      {/* Clock overlay — bottom right corner */}
      <circle cx="14.5" cy="13.5" r="3" fill="var(--sidebar, #1a2456)" stroke="currentColor" />
      <path d="M14.5 12v1.5l1 1" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   13. AI LEGAL RESEARCH — An open book with a neural/sparkle element
   rising from it, merging law (book) with AI (sparkle nodes).
   ----------------------------------------------------------------------- */
export function IconAI({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Open book */}
      <path d="M9 5v11" />
      <path d="M9 5c-1-1.5-3.5-2-5.5-2v10.5c2 0 4.5.5 5.5 2" />
      <path d="M9 5c1-1.5 3.5-2 5.5-2v10.5c-2 0-4.5.5-5.5 2" />
      {/* AI sparkle / star above the book */}
      <path d="M9 1l0.5 1.5L11 3l-1.5 0.5L9 5l-0.5-1.5L7 3l1.5-0.5L9 1z" strokeWidth="1" />
      {/* Small neural nodes to the sides */}
      <circle cx="4.5" cy="2" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="2" r="0.5" fill="currentColor" stroke="none" />
      <path d="M5 2l2.5 1" strokeWidth="0.75" />
      <path d="M13 2l-2.5 1" strokeWidth="0.75" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   14. DOCUMENT VAULT — Stacked documents with a small lock on front,
   conveying secure storage.
   ----------------------------------------------------------------------- */
export function IconDocuments({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Back document (offset behind) */}
      <path d="M6 3h7.5a1 1 0 011 1v10a1 1 0 01-1 1" opacity="0.35" />
      {/* Middle document */}
      <path d="M4.5 2h7.5a1 1 0 011 1v10.5a1 1 0 01-1 1" opacity="0.55" />
      {/* Front document */}
      <rect x="2.5" y="1.5" width="10" height="13" rx="1" />
      {/* Text lines on front doc */}
      <path d="M5 5h5" />
      <path d="M5 7.5h4" />
      {/* Lock body */}
      <rect x="5.75" y="10.5" width="3.5" height="2.5" rx="0.5" />
      {/* Lock shackle */}
      <path d="M6.75 10.5V9.5a0.75 0.75 0 011.5 0v1" />
      {/* Keyhole */}
      <circle cx="7.5" cy="11.75" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   15. USER GUIDE — An open book with a question mark, conveying help
   and documentation / how-to reference.
   ----------------------------------------------------------------------- */
export function IconGuide({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Open book pages */}
      <path d="M9 4v12" />
      <path d="M9 4c-1.5-1-4-1.5-6-1.5v11c2 0 4.5.5 6 1.5" />
      <path d="M9 4c1.5-1 4-1.5 6-1.5v11c-2 0-4.5.5-6 1.5" />
      {/* Question mark on right page */}
      <path d="M11 7.5a1.25 1.25 0 112 1c0 .5-.75.75-.75 1.5" />
      <circle cx="12.25" cy="11.25" r="0.4" fill="currentColor" stroke="none" />
      {/* Lines on left page */}
      <path d="M4.5 7h2.5" />
      <path d="M4.5 9h2" />
      <path d="M4.5 11h2.5" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   16. APPEAL DEADLINES — A clock face with an exclamation mark beside it,
   conveying time-sensitive legal deadlines requiring urgent attention.
   ----------------------------------------------------------------------- */
export function IconAppealDeadlines({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Clock face */}
      <circle cx="8.5" cy="9.5" r="6" />
      {/* Clock hands */}
      <path d="M8.5 6v3.5l2.5 2" />
      {/* Centre dot */}
      <circle cx="8.5" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
      {/* Exclamation mark — urgency */}
      <path d="M15.5 2.5v4" strokeWidth="1.8" />
      <circle cx="15.5" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   17. ARCHIVE — An archive box with a document partially visible inside,
   conveying organized document storage and retrieval.
   ----------------------------------------------------------------------- */
export function IconArchive({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Archive box lid */}
      <rect x="1.5" y="2" width="15" height="3.5" rx="1" />
      {/* Box body */}
      <path d="M3 5.5v9a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-9" />
      {/* Slot / handle on front */}
      <path d="M7 8.5h4" />
      {/* Document peeking out */}
      <path d="M7 11h4" strokeWidth="1" opacity="0.5" />
      <path d="M7.5 13h3" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   18. FIRM SETTINGS — Three horizontal sliders at different positions,
   a modern settings/equalizer motif. Less cliched than a gear.
   ----------------------------------------------------------------------- */
export function IconSettings({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Top slider track + handle */}
      <path d="M2 4.5h14" />
      <circle cx="11.5" cy="4.5" r="1.5" fill="var(--sidebar, #1a2456)" stroke="currentColor" />
      {/* Middle slider track + handle */}
      <path d="M2 9h14" />
      <circle cx="6" cy="9" r="1.5" fill="var(--sidebar, #1a2456)" stroke="currentColor" />
      {/* Bottom slider track + handle */}
      <path d="M2 13.5h14" />
      <circle cx="10" cy="13.5" r="1.5" fill="var(--sidebar, #1a2456)" stroke="currentColor" />
    </svg>
  );
}

/* -----------------------------------------------------------------------
   17. DALEEL — An open book with a chat bubble and sparkle, conveying
   AI-powered document intelligence and conversation.
   ----------------------------------------------------------------------- */
export function IconDaleel({ size, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      {/* Open book base */}
      <path d="M9 6v10" />
      <path d="M9 6c-1-1.5-3.5-2-5.5-2v10c2 0 4.5.5 5.5 1.5" />
      <path d="M9 6c1-1.5 3.5-2 5.5-2v10c-2 0-4.5.5-5.5 1.5" />
      {/* Chat bubble above */}
      <rect x="5" y="0.5" width="8" height="4" rx="1.5" />
      <path d="M8 4.5L9 6L10 4.5" />
      {/* Sparkle dots inside chat */}
      <circle cx="7.5" cy="2.5" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="2.5" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="2.5" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
