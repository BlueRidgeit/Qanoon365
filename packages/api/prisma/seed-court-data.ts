/**
 * Seed realistic sample UAE court data into the public schema.
 * Run: npx tsx prisma/seed-court-data.ts
 */
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '..', '.env.local') });
config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding court data...');

  // ── Parties ────────────────────────────────────────────────────
  const parties = [
    { name: 'Al Rashid Trading LLC', nameNormalized: 'al rashid trading', nameArabic: 'الراشد للتجارة ذ.م.م', partyType: 'company' },
    { name: 'Dubai Properties Group', nameNormalized: 'dubai properties group', nameArabic: 'مجموعة دبي العقارية', partyType: 'company' },
    { name: 'Mohammed Al Hashimi', nameNormalized: 'mohammed al hashimi', nameArabic: 'محمد الهاشمي', partyType: 'individual' },
    { name: 'Nakheel PJSC', nameNormalized: 'nakheel pjsc', nameArabic: 'نخيل ش.م.ع', partyType: 'company' },
    { name: 'Fatima Hassan Al Muhairi', nameNormalized: 'fatima hassan al muhairi', nameArabic: 'فاطمة حسن المهيري', partyType: 'individual' },
    { name: 'Global Tech Solutions FZE', nameNormalized: 'global tech solutions fze', nameArabic: 'جلوبال تك سوليوشنز', partyType: 'company' },
    { name: 'Ahmad bin Khalifa Al Maktoum', nameNormalized: 'ahmad bin khalifa al maktoum', nameArabic: 'أحمد بن خليفة آل مكتوم', partyType: 'individual' },
    { name: 'Emirates Steel Industries', nameNormalized: 'emirates steel industries', nameArabic: 'حديد الإمارات', partyType: 'company' },
    { name: 'Crescent Petroleum FZCO', nameNormalized: 'crescent petroleum fzco', nameArabic: 'كرسنت بتروليوم', partyType: 'company' },
    { name: 'Sara Abdullah Al Shamsi', nameNormalized: 'sara abdullah al shamsi', nameArabic: 'سارة عبدالله الشامسي', partyType: 'individual' },
    { name: 'Al Futtaim Group LLC', nameNormalized: 'al futtaim group', nameArabic: 'مجموعة الفطيم ذ.م.م', partyType: 'company' },
    { name: 'Mashreq Bank PSC', nameNormalized: 'mashreq bank psc', nameArabic: 'بنك المشرق', partyType: 'company' },
    { name: 'Abdullah Saeed Al Nahyan', nameNormalized: 'abdullah saeed al nahyan', nameArabic: 'عبدالله سعيد آل نهيان', partyType: 'individual' },
    { name: 'Emaar Development PJSC', nameNormalized: 'emaar development pjsc', nameArabic: 'إعمار للتطوير', partyType: 'company' },
    { name: 'Khalid Omar Trading Est.', nameNormalized: 'khalid omar trading', nameArabic: 'مؤسسة خالد عمر التجارية', partyType: 'company' },
  ];

  const createdParties: any[] = [];
  for (const p of parties) {
    const party = await prisma.courtParty.upsert({
      where: { id: '00000000-0000-0000-0000-000000000000' }, // force create
      create: p,
      update: {},
    });
    createdParties.push(party);
  }
  // Re-fetch to get actual IDs
  const allParties = await prisma.courtParty.findMany();
  console.log(`  Created ${allParties.length} court parties`);

  // ── Court Cases ────────────────────────────────────────────────
  const cases = [
    {
      caseNumber: 'DIFC-2024-CA-001',
      court: 'DIFC Courts',
      jurisdiction: 'difc',
      caseType: 'commercial',
      subjectMatter: 'Breach of share purchase agreement. Dispute over representations and warranties in acquisition of 40% stake in Dubai-based technology company.',
      filingDate: new Date('2024-03-15'),
      outcome: 'Settled',
      outcomeDate: new Date('2024-09-20'),
      durationDays: 189,
    },
    {
      caseNumber: 'DIFC-2023-CFI-042',
      court: 'DIFC Court of First Instance',
      jurisdiction: 'difc',
      caseType: 'banking_finance',
      subjectMatter: 'Loan default and guarantee enforcement. Bank seeking recovery of AED 45M facility against corporate borrower and personal guarantor.',
      filingDate: new Date('2023-06-10'),
      outcome: 'Judgment for Claimant',
      outcomeDate: new Date('2024-02-28'),
      durationDays: 263,
    },
    {
      caseNumber: 'ADGM-2024-CC-015',
      court: 'ADGM Courts',
      jurisdiction: 'adgm',
      caseType: 'corporate',
      subjectMatter: 'Shareholder oppression claim. Minority shareholder alleging exclusion from management and dilution of holdings in ADGM-registered fund vehicle.',
      filingDate: new Date('2024-01-22'),
      outcome: 'Pending',
      durationDays: null,
    },
    {
      caseNumber: 'DXB-2023-COMM-1127',
      court: 'Dubai Courts - Commercial Division',
      jurisdiction: 'uae_onshore',
      caseType: 'real_estate',
      subjectMatter: 'Off-plan property dispute. Buyer seeking rescission of SPA and return of 30% deposit (AED 2.1M) due to delayed handover beyond 12-month grace period.',
      filingDate: new Date('2023-09-05'),
      outcome: 'Judgment for Claimant',
      outcomeDate: new Date('2024-04-15'),
      durationDays: 223,
    },
    {
      caseNumber: 'DIFC-2024-ARB-003',
      court: 'DIFC-LCIA Arbitration Centre',
      jurisdiction: 'difc',
      caseType: 'corporate',
      subjectMatter: 'Joint venture dissolution dispute. Disagreement over asset valuation methodology and distribution of retained earnings in construction JV.',
      filingDate: new Date('2024-02-10'),
      outcome: 'Award in favour of Respondent',
      outcomeDate: new Date('2024-11-30'),
      durationDays: 294,
    },
    {
      caseNumber: 'DXB-2024-LAB-0892',
      court: 'Dubai Courts - Labour Division',
      jurisdiction: 'uae_onshore',
      caseType: 'employment',
      subjectMatter: 'Wrongful termination claim by senior executive. Claimant alleging dismissal without cause during contract term, seeking end-of-service, notice period, and compensation for remaining contract value.',
      filingDate: new Date('2024-05-18'),
      outcome: 'Partial Judgment for Claimant',
      outcomeDate: new Date('2024-10-10'),
      durationDays: 145,
    },
    {
      caseNumber: 'ADGM-2023-CFI-008',
      court: 'ADGM Court of First Instance',
      jurisdiction: 'adgm',
      caseType: 'banking_finance',
      subjectMatter: 'Sukuk default and trustee liability. Dispute over payment obligations under Sharia-compliant bond structure with cross-border elements involving Bahrain and Saudi Arabia.',
      filingDate: new Date('2023-11-01'),
      outcome: 'Judgment for Claimant',
      outcomeDate: new Date('2024-07-22'),
      durationDays: 264,
    },
    {
      caseNumber: 'DIFC-2024-CFI-019',
      court: 'DIFC Court of First Instance',
      jurisdiction: 'difc',
      caseType: 'ip',
      subjectMatter: 'Trade mark infringement and passing off. Regional distributor alleging brand misuse by former franchise partner continuing to use branding after termination.',
      filingDate: new Date('2024-04-02'),
      outcome: 'Injunction Granted',
      outcomeDate: new Date('2024-06-15'),
      durationDays: 74,
    },
    {
      caseNumber: 'DXB-2024-COMM-0456',
      court: 'Dubai Courts - Commercial Division',
      jurisdiction: 'uae_onshore',
      caseType: 'corporate',
      subjectMatter: 'Agency termination compensation claim under Federal Law No. 18 of 1981. Agent seeking compensation for goodwill after principal terminated exclusive distribution agreement.',
      filingDate: new Date('2024-01-15'),
      outcome: 'Judgment for Claimant',
      outcomeDate: new Date('2024-08-30'),
      durationDays: 228,
    },
    {
      caseNumber: 'DIFC-2023-CA-007',
      court: 'DIFC Court of Appeal',
      jurisdiction: 'difc',
      caseType: 'regulatory',
      subjectMatter: 'Appeal against DFSA enforcement action. Financial services firm challenging AED 5M fine for non-compliance with anti-money laundering regulations.',
      filingDate: new Date('2023-08-15'),
      outcome: 'Appeal Dismissed',
      outcomeDate: new Date('2024-01-20'),
      durationDays: 158,
    },
  ];

  const createdCases: any[] = [];
  for (const c of cases) {
    const courtCase = await prisma.courtCase.create({ data: c });
    createdCases.push(courtCase);
  }
  console.log(`  Created ${createdCases.length} court cases`);

  // ── Case-Party Relationships ───────────────────────────────────
  // Map parties to cases with roles, representing firms, and outcomes
  const relationships = [
    // DIFC-2024-CA-001: Al Rashid Trading vs Global Tech Solutions
    { caseIdx: 0, partyIdx: 0, role: 'plaintiff', representingFirm: 'Al Tamimi & Company', representingLawyer: 'Hassan Elhais', outcomeForParty: 'Settled - AED 8M' },
    { caseIdx: 0, partyIdx: 5, role: 'defendant', representingFirm: 'Clyde & Co', representingLawyer: 'James Sullivan', outcomeForParty: 'Settled - AED 8M paid' },

    // DIFC-2023-CFI-042: Mashreq Bank vs Mohammed Al Hashimi
    { caseIdx: 1, partyIdx: 11, role: 'plaintiff', representingFirm: 'Norton Rose Fulbright', representingLawyer: 'Patrick Bourke', outcomeForParty: 'Won - Full recovery ordered' },
    { caseIdx: 1, partyIdx: 2, role: 'defendant', representingFirm: 'Hadef & Partners', representingLawyer: 'Sadiq Jafar', outcomeForParty: 'Lost - Liable for AED 45M' },

    // ADGM-2024-CC-015: Abdullah Al Nahyan vs Crescent Petroleum
    { caseIdx: 2, partyIdx: 12, role: 'plaintiff', representingFirm: 'Allen & Overy', representingLawyer: 'Robin Abraham', outcomeForParty: 'Pending' },
    { caseIdx: 2, partyIdx: 8, role: 'defendant', representingFirm: 'Freshfields', representingLawyer: 'Pervez Akhtar', outcomeForParty: 'Pending' },

    // DXB-2023-COMM-1127: Fatima Al Muhairi vs Nakheel
    { caseIdx: 3, partyIdx: 4, role: 'plaintiff', representingFirm: 'BSA Ahmad Bin Hezeem', representingLawyer: 'Ahmad Bin Hezeem', outcomeForParty: 'Won - Deposit returned plus 9% interest' },
    { caseIdx: 3, partyIdx: 3, role: 'defendant', representingFirm: 'DLA Piper', representingLawyer: 'Fiona Robertson', outcomeForParty: 'Lost - Must return AED 2.1M + interest' },

    // DIFC-2024-ARB-003: Emirates Steel vs Dubai Properties
    { caseIdx: 4, partyIdx: 7, role: 'plaintiff', representingFirm: 'Dentons', representingLawyer: 'Nasser Ali Khasawneh', outcomeForParty: 'Lost - JV assets distributed per respondent valuation' },
    { caseIdx: 4, partyIdx: 1, role: 'defendant', representingFirm: 'Latham & Watkins', representingLawyer: 'Nick Donaldson', outcomeForParty: 'Won - Favourable asset valuation adopted' },

    // DXB-2024-LAB-0892: Sara Al Shamsi vs Al Futtaim Group
    { caseIdx: 5, partyIdx: 9, role: 'plaintiff', representingFirm: 'Galadari Advocates', representingLawyer: 'Abdulla Galadari', outcomeForParty: 'Partial win - 6 months compensation awarded' },
    { caseIdx: 5, partyIdx: 10, role: 'defendant', representingFirm: 'Baker McKenzie Habib Al Mulla', representingLawyer: 'Habib Al Mulla', outcomeForParty: 'Partial loss - Must pay 6 months salary' },

    // ADGM-2023-CFI-008: Mashreq Bank vs Crescent Petroleum (sukuk)
    { caseIdx: 6, partyIdx: 11, role: 'plaintiff', representingFirm: 'Clifford Chance', representingLawyer: 'Matthew Blythe', outcomeForParty: 'Won - Payment ordered per sukuk terms' },
    { caseIdx: 6, partyIdx: 8, role: 'defendant', representingFirm: 'White & Case', representingLawyer: 'Rani Habash', outcomeForParty: 'Lost - Must honour sukuk obligations' },

    // DIFC-2024-CFI-019: Al Rashid Trading vs Khalid Omar Trading (IP)
    { caseIdx: 7, partyIdx: 0, role: 'plaintiff', representingFirm: 'Al Tamimi & Company', representingLawyer: 'Ahmad Ghoneim', outcomeForParty: 'Won - Injunction granted' },
    { caseIdx: 7, partyIdx: 14, role: 'defendant', representingFirm: 'Afridi & Angell', representingLawyer: 'Bashir Ahmed', outcomeForParty: 'Lost - Must cease brand use within 30 days' },

    // DXB-2024-COMM-0456: Khalid Omar Trading vs Emaar (agency)
    { caseIdx: 8, partyIdx: 14, role: 'plaintiff', representingFirm: 'Afridi & Angell', representingLawyer: 'Bashir Ahmed', outcomeForParty: 'Won - AED 3.5M goodwill compensation' },
    { caseIdx: 8, partyIdx: 13, role: 'defendant', representingFirm: 'Herbert Smith Freehills', representingLawyer: 'Chris Leonard', outcomeForParty: 'Lost - Must pay AED 3.5M' },

    // DIFC-2023-CA-007: Global Tech Solutions vs DFSA (regulatory)
    { caseIdx: 9, partyIdx: 5, role: 'plaintiff', representingFirm: 'Simmons & Simmons', representingLawyer: 'Muneer Khan', outcomeForParty: 'Lost - Fine upheld' },
    { caseIdx: 9, partyIdx: 6, role: 'intervenor', representingFirm: 'DFSA In-House', representingLawyer: 'DFSA Legal Department', outcomeForParty: 'Won - Enforcement action validated' },
  ];

  for (const rel of relationships) {
    await prisma.courtCaseParty.create({
      data: {
        courtCaseId: createdCases[rel.caseIdx].id,
        courtPartyId: allParties[rel.partyIdx].id,
        role: rel.role,
        representingFirm: rel.representingFirm,
        representingLawyer: rel.representingLawyer,
        outcomeForParty: rel.outcomeForParty,
      },
    });
  }
  console.log(`  Created ${relationships.length} case-party relationships`);

  console.log('Court data seeding complete!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
