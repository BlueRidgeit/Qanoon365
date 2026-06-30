import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env files
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Helpers ────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsFromNow(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Production safety guard ────────────────────────────────────
function isProductionDb(): boolean {
  const url = process.env.DATABASE_URL || '';
  // Block if NODE_ENV=production unless explicitly overridden
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_FORCE) {
    return true;
  }
  return false;
}

// ── Main seed ──────────────────────────────────────────────────
async function main() {
  if (isProductionDb()) {
    console.error('🚫 SEED BLOCKED: NODE_ENV=production. Set SEED_FORCE=1 to override.');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const isRemote = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');
  if (isRemote) {
    console.warn('⚠️  WARNING: Seeding a REMOTE database:', dbUrl.replace(/\/\/.*@/, '//***@'));
    console.warn('   This will DELETE all existing data. Proceeding in 3 seconds...\n');
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('🌱 Seeding database with comprehensive demo data...\n');

  // ─── 1. Tenant ─────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Al Basti & Associates',
      slug: 'default',
      isActive: true,
      settings: {
        practiceAreas: ['corporate', 'litigation', 'real_estate', 'banking_finance', 'employment', 'regulatory'],
        defaultJurisdiction: 'difc',
        firmBranding: { primaryColor: '#1e3a5f', logo: null },
      },
    },
  });
  console.log(`✓ Tenant: ${tenant.name}`);

  // Switch to tenant schema
  await prisma.$executeRawUnsafe(`SET search_path TO "tenant_default", public`);

  // ─── Clean existing data (reverse FK order) ──────────────
  console.log('Cleaning existing data...');
  await prisma.followUpLog.deleteMany({});
  await prisma.followUpRule.deleteMany({});
  await prisma.courtContact.deleteMany({});
  await prisma.criminalComplaint.deleteMany({});
  await prisma.executionFile.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.opposingParty.deleteMany({});
  await prisma.kycRecord.deleteMany({});
  await prisma.conflictRecord.deleteMany({});
  await prisma.matter.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✓ Cleaned existing data\n');

  // ─── 2. Users ──────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash('Myfav0r!teBL1T', 10);
  const demoPasswordHash = await bcrypt.hash('Admin123!', 10);

  const usersData = [
    { email: 'bladmin@albasti.dev', firstName: 'Khalid', lastName: 'Al Basti', role: 'admin', passwordHash: adminPasswordHash },
    { email: 'sarah.partner@albasti.dev', firstName: 'Sarah', lastName: 'Al Maktoum', role: 'partner', passwordHash: demoPasswordHash },
    { email: 'omar.partner@albasti.dev', firstName: 'Omar', lastName: 'Al Hashimi', role: 'partner', passwordHash: demoPasswordHash },
    { email: 'fatima.compliance@albasti.dev', firstName: 'Fatima', lastName: 'Al Shamsi', role: 'compliance', passwordHash: demoPasswordHash },
    { email: 'ahmed.lawyer@albasti.dev', firstName: 'Ahmed', lastName: 'bin Rashid', role: 'lawyer', passwordHash: demoPasswordHash },
    { email: 'layla.bd@albasti.dev', firstName: 'Layla', lastName: 'Al Mansoori', role: 'bd', passwordHash: demoPasswordHash },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    const { passwordHash: pwHash, ...rest } = u;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...rest, passwordHash: pwHash, tenantId: 'default', isActive: true },
    });
    users[u.role === 'admin' ? 'admin' : u.firstName.toLowerCase()] = user;
    console.log(`  ✓ User: ${user.firstName} ${user.lastName} (${user.role})`);
  }
  console.log('');

  const adminId = users.admin.id;
  const sarahId = users.sarah.id;
  const omarId = users.omar.id;
  const fatimaId = users.fatima.id;
  const ahmedId = users.ahmed.id;
  const laylaId = users.layla.id;

  // ─── 3. Clients ────────────────────────────────────────────
  const clientsData = [
    { name: 'Emirates Steel Industries PJSC', clientType: 'company', industry: 'Manufacturing', registrationNumber: 'DED-2019-445221', kycStatus: 'verified', kycExpiryDate: monthsFromNow(8), riskRating: 'low', preferredLanguage: 'both' },
    { name: 'Dubai Development Holdings LLC', clientType: 'company', industry: 'Real Estate', registrationNumber: 'DED-2020-887432', kycStatus: 'verified', kycExpiryDate: monthsFromNow(3), riskRating: 'medium', preferredLanguage: 'english' },
    { name: 'Sheikh Mohammed bin Khalifa', clientType: 'individual', kycStatus: 'verified', kycExpiryDate: monthsFromNow(11), riskRating: 'pep', preferredLanguage: 'arabic' },
    { name: 'Abu Dhabi Capital Partners', clientType: 'company', industry: 'Financial Services', registrationNumber: 'ADGM-2021-001234', kycStatus: 'under_review', riskRating: 'medium', preferredLanguage: 'english' },
    { name: 'DIFC Innovation Hub Ltd', clientType: 'company', industry: 'Technology', registrationNumber: 'DIFC-2022-005567', kycStatus: 'verified', kycExpiryDate: monthsFromNow(6), riskRating: 'low', preferredLanguage: 'english' },
    { name: 'Gulf Maritime Trading Co.', clientType: 'company', industry: 'Maritime & Shipping', registrationNumber: 'RAK-2018-334455', kycStatus: 'documents_requested', riskRating: 'high', preferredLanguage: 'arabic' },
    { name: 'Fatima bint Abdullah Al Nahyan', clientType: 'individual', kycStatus: 'expired', kycExpiryDate: daysAgo(30), riskRating: 'pep', preferredLanguage: 'arabic' },
    { name: 'Sharjah Construction Group WLL', clientType: 'company', industry: 'Construction', registrationNumber: 'SHJ-2017-112233', kycStatus: 'not_started', riskRating: null, preferredLanguage: 'both' },
    { name: 'Noor Islamic Finance PJSC', clientType: 'company', industry: 'Islamic Banking', registrationNumber: 'DFSA-2020-009988', kycStatus: 'verified', kycExpiryDate: monthsFromNow(10), riskRating: 'low', preferredLanguage: 'english' },
    { name: 'Al Habtoor Automotive LLC', clientType: 'company', industry: 'Automotive', registrationNumber: 'DED-2015-667788', kycStatus: 'verified', kycExpiryDate: monthsFromNow(2), riskRating: 'low', preferredLanguage: 'english' },
    { name: 'Rashid Al Maktoum Foundation', clientType: 'government_entity', industry: 'Government', kycStatus: 'under_review', riskRating: 'pep', preferredLanguage: 'arabic' },
    { name: 'TechVentures MENA Fund III', clientType: 'company', industry: 'Venture Capital', registrationNumber: 'DIFC-2023-008899', kycStatus: 'documents_requested', riskRating: 'medium', preferredLanguage: 'english' },
  ];

  const clients: any[] = [];
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: {
        ...c,
        kycExpiryDate: c.kycExpiryDate || null,
        notes: null,
        isActive: true,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    clients.push(client);
  }
  console.log(`✓ Created ${clients.length} clients`);

  // ─── 4. Contacts ───────────────────────────────────────────
  const contactsData = [
    // Emirates Steel
    { clientIdx: 0, firstName: 'Mansour', lastName: 'Al Ketbi', email: 'mansour@emiratessteel.ae', phone: '+971 4 234 5678', jobTitle: 'General Counsel', isPrimary: true },
    { clientIdx: 0, firstName: 'Rania', lastName: 'Hassan', email: 'rania@emiratessteel.ae', phone: '+971 4 234 5679', jobTitle: 'Legal Manager', isPrimary: false },
    // Dubai Development Holdings
    { clientIdx: 1, firstName: 'Tariq', lastName: 'Al Ghurair', email: 'tariq@ddhholdings.ae', phone: '+971 4 567 1234', jobTitle: 'CEO', isPrimary: true },
    { clientIdx: 1, firstName: 'Noura', lastName: 'Al Muhairi', email: 'noura@ddhholdings.ae', phone: '+971 4 567 1235', jobTitle: 'VP Legal Affairs', isPrimary: false },
    // Sheikh Mohammed bin Khalifa (individual)
    { clientIdx: 2, firstName: 'Mohammed', lastName: 'bin Khalifa', email: 'm.binkhalifa@royal.ae', phone: '+971 50 123 4567', jobTitle: 'Principal', isPrimary: true },
    // Abu Dhabi Capital
    { clientIdx: 3, firstName: 'Diana', lastName: 'Chen', email: 'diana@adcap.ae', phone: '+971 2 789 1234', jobTitle: 'Managing Partner', isPrimary: true },
    { clientIdx: 3, firstName: 'Yusuf', lastName: 'Al Balushi', email: 'yusuf@adcap.ae', phone: '+971 2 789 1235', jobTitle: 'Fund Counsel', isPrimary: false },
    // DIFC Innovation Hub
    { clientIdx: 4, firstName: 'James', lastName: 'Patterson', email: 'james@difcinnovation.ae', phone: '+971 4 321 8765', jobTitle: 'CTO', isPrimary: true },
    // Gulf Maritime
    { clientIdx: 5, firstName: 'Hassan', lastName: 'Al Zaabi', email: 'hassan@gulfmaritime.ae', phone: '+971 7 456 7890', jobTitle: 'Operations Director', isPrimary: true },
    // Fatima bint Abdullah
    { clientIdx: 6, firstName: 'Mariam', lastName: 'Al Suwaidi', email: 'mariam.assistant@gmail.com', phone: '+971 50 987 6543', jobTitle: 'Personal Assistant', isPrimary: true },
    // Noor Islamic Finance
    { clientIdx: 8, firstName: 'Ibrahim', lastName: 'Al Marzouqi', email: 'ibrahim@noorfinance.ae', phone: '+971 4 876 5432', jobTitle: 'Head of Compliance', isPrimary: true },
    // Al Habtoor Automotive
    { clientIdx: 9, firstName: 'Khalil', lastName: 'Al Habtoor', email: 'khalil@alhabtoorauto.ae', phone: '+971 4 345 6789', jobTitle: 'Managing Director', isPrimary: true },
    // Rashid Foundation
    { clientIdx: 10, firstName: 'Aisha', lastName: 'Al Falasi', email: 'aisha@rashidfoundation.ae', phone: '+971 4 222 3344', jobTitle: 'Legal Advisor', isPrimary: true },
    // TechVentures
    { clientIdx: 11, firstName: 'Sanjay', lastName: 'Mehta', email: 'sanjay@techventures.ae', phone: '+971 4 999 8877', jobTitle: 'General Partner', isPrimary: true },
    { clientIdx: 11, firstName: 'Lisa', lastName: 'Wang', email: 'lisa@techventures.ae', phone: '+971 4 999 8878', jobTitle: 'Associate', isPrimary: false },
  ];

  for (const c of contactsData) {
    await prisma.contact.create({
      data: {
        clientId: clients[c.clientIdx].id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        jobTitle: c.jobTitle,
        isPrimary: c.isPrimary,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
  }
  console.log(`✓ Created ${contactsData.length} contacts`);

  // ─── 5. Leads ──────────────────────────────────────────────
  const leadsData = [
    { subject: 'Commercial lease dispute — JBR Tower', caseType: 'real_estate', jurisdiction: 'uae_onshore', urgency: 'urgent', caseSummary: 'Tenant claims breach of RERA regulations in commercial lease. Estimated dispute value AED 15M involving flagship retail space.', status: 'new', clientName: 'JBR Retail Partners LLC', clientType: 'company', estimatedValue: 15000000, referralSource: 'Website inquiry' },
    { subject: 'Employment termination advisory — tech company', caseType: 'employment', jurisdiction: 'difc', urgency: 'standard', caseSummary: 'DIFC-based fintech needs advisory on restructuring and terminating 12 employees in compliance with DIFC Employment Law.', status: 'contacted', clientName: 'PayStream Technologies Ltd', clientType: 'company', estimatedValue: 500000, referralSource: 'Referral — Noor Finance', assignedTo: laylaId },
    { subject: 'IP licensing dispute — mobile app', caseType: 'ip', jurisdiction: 'difc', urgency: 'standard', caseSummary: 'Dispute over licensing agreement for white-label mobile banking application. Counterparty claims breach of exclusivity clause.', status: 'new', clientName: 'FinApp Solutions Ltd', clientType: 'company', estimatedValue: 2500000, referralSource: 'DIFC Courts referral' },
    { subject: 'Cross-border M&A — manufacturing acquisition', caseType: 'corporate', jurisdiction: 'multi_jurisdictional', urgency: 'urgent', caseSummary: 'UAE-based conglomerate acquiring 60% stake in Egyptian manufacturing facility. Requires ADGM structuring and EIA regulatory review.', status: 'qualified', clientName: null, estimatedValue: 85000000, referralSource: 'Existing client — Emirates Steel' },
    { subject: 'Maritime cargo insurance claim', caseType: 'litigation', jurisdiction: 'uae_onshore', urgency: 'emergency', caseSummary: 'Container vessel cargo damaged en route from Mumbai to Jebel Ali. Insurance company denying claim of AED 8M.', status: 'new', clientName: 'Gulf Maritime Trading Co.', clientType: 'company', estimatedValue: 8000000, referralSource: 'Direct client' },
    { subject: 'DFSA regulatory compliance review', caseType: 'regulatory', jurisdiction: 'difc', urgency: 'standard', caseSummary: 'Islamic bank requires comprehensive regulatory compliance review ahead of DFSA annual examination. Focus on Sharia governance framework.', status: 'contacted', clientName: 'Noor Islamic Finance PJSC', clientType: 'company', estimatedValue: 750000, referralSource: 'Existing client', assignedTo: ahmedId },
    { subject: 'Real estate joint venture — Saadiyat Island', caseType: 'real_estate', jurisdiction: 'adgm', urgency: 'standard', caseSummary: 'Structuring a JV between Abu Dhabi developer and international hotel brand for luxury resort on Saadiyat Island. AED 450M project.', status: 'new', clientName: 'Saadiyat Hospitality Partners', clientType: 'company', estimatedValue: 4500000, referralSource: 'Conference networking' },
    { subject: 'Data protection advisory — e-commerce platform', caseType: 'regulatory', jurisdiction: 'uae_onshore', urgency: 'standard', caseSummary: 'Major UAE e-commerce platform needs advisory on compliance with UAE Federal Data Protection Law. Processing 2M+ customer records.', status: 'disqualified', clientName: 'ShopUAE.com', clientType: 'company', estimatedValue: 300000, referralSource: 'Website inquiry' },
  ];

  const leads: any[] = [];
  for (const l of leadsData) {
    const lead = await prisma.lead.create({
      data: {
        ...l,
        estimatedValue: l.estimatedValue || null,
        assignedTo: l.assignedTo || null,
        createdBy: laylaId,
        updatedBy: laylaId,
      },
    });
    leads.push(lead);
  }
  console.log(`✓ Created ${leads.length} leads`);

  // ─── 6. Opportunities ──────────────────────────────────────
  const oppsData = [
    // Inquiry stage
    { clientIdx: 3, name: 'Abu Dhabi Capital — Fund IV Formation', stage: 'inquiry', practiceArea: 'banking_finance', assignedPartner: sarahId, estimatedValue: 2000000, engagementType: 'fixed_fee', conflictCheckStatus: 'not_started', kycStatus: 'not_started' },
    // Consultation stage
    { clientIdx: 5, name: 'Gulf Maritime — Cargo Insurance Litigation', stage: 'consultation', practiceArea: 'litigation', assignedPartner: omarId, estimatedValue: 8000000, engagementType: 'contingency', conflictCheckStatus: 'in_progress', kycStatus: 'not_started' },
    { clientIdx: 11, name: 'TechVentures — Portfolio Company Restructuring', stage: 'consultation', practiceArea: 'corporate', assignedPartner: sarahId, estimatedValue: 1500000, engagementType: 'hourly', conflictCheckStatus: 'not_started', kycStatus: 'not_started' },
    // Proposal stage (needs conflict cleared)
    { clientIdx: 0, name: 'Emirates Steel — Egyptian Acquisition', stage: 'proposal', practiceArea: 'corporate', assignedPartner: sarahId, estimatedValue: 85000000, engagementType: 'fixed_fee', conflictCheckStatus: 'cleared', kycStatus: 'not_started', conflictApprovedBy: fatimaId },
    { clientIdx: 4, name: 'DIFC Innovation — Series B Advisory', stage: 'proposal', practiceArea: 'corporate', assignedPartner: omarId, estimatedValue: 3500000, engagementType: 'fixed_fee', conflictCheckStatus: 'cleared', kycStatus: 'not_started', conflictApprovedBy: fatimaId },
    // Retainer stage (needs KYC verified + conflict cleared)
    { clientIdx: 8, name: 'Noor Finance — DFSA Compliance Program', stage: 'retainer', practiceArea: 'regulatory', assignedPartner: omarId, estimatedValue: 750000, engagementType: 'retainer', conflictCheckStatus: 'cleared', kycStatus: 'verified', conflictApprovedBy: fatimaId },
    { clientIdx: 1, name: 'DDH — Jumeirah Beach Mixed-Use Development', stage: 'retainer', practiceArea: 'real_estate', assignedPartner: sarahId, estimatedValue: 12000000, engagementType: 'fixed_fee', conflictCheckStatus: 'cleared', kycStatus: 'verified', conflictApprovedBy: fatimaId },
    // Won (converted to matters)
    { clientIdx: 0, name: 'Emirates Steel — Annual Retainer 2025', stage: 'won', practiceArea: 'corporate', assignedPartner: sarahId, estimatedValue: 4800000, engagementType: 'retainer', conflictCheckStatus: 'cleared', kycStatus: 'verified', conflictApprovedBy: fatimaId, closedAt: daysAgo(45) },
    { clientIdx: 2, name: 'Sheikh Mohammed — Family Office Restructuring', stage: 'won', practiceArea: 'banking_finance', assignedPartner: omarId, estimatedValue: 6000000, engagementType: 'fixed_fee', conflictCheckStatus: 'cleared', kycStatus: 'verified', conflictApprovedBy: fatimaId, closedAt: daysAgo(20) },
    { clientIdx: 9, name: 'Al Habtoor — Dealership Franchise Agreement', stage: 'won', practiceArea: 'corporate', assignedPartner: sarahId, estimatedValue: 1200000, engagementType: 'fixed_fee', conflictCheckStatus: 'cleared', kycStatus: 'verified', conflictApprovedBy: fatimaId, closedAt: daysAgo(60) },
    // Lost
    { clientIdx: 10, name: 'Rashid Foundation — Government Contract Review', stage: 'lost', practiceArea: 'regulatory', assignedPartner: omarId, estimatedValue: 900000, engagementType: 'fixed_fee', conflictCheckStatus: 'cleared', kycStatus: 'under_review', conflictApprovedBy: fatimaId, closedAt: daysAgo(15), closeReason: 'Client chose competitor with government sector specialization' },
  ];

  const opps: any[] = [];
  for (const o of oppsData) {
    const opp = await prisma.opportunity.create({
      data: {
        clientId: clients[o.clientIdx].id,
        name: o.name,
        stage: o.stage,
        practiceArea: o.practiceArea,
        assignedPartner: o.assignedPartner,
        estimatedValue: o.estimatedValue,
        engagementType: o.engagementType || null,
        conflictCheckStatus: o.conflictCheckStatus,
        conflictApprovedBy: o.conflictApprovedBy || null,
        kycStatus: o.kycStatus,
        closedAt: o.closedAt || null,
        closeReason: o.closeReason || null,
        createdBy: laylaId,
        updatedBy: laylaId,
      },
    });
    opps.push(opp);
  }
  console.log(`✓ Created ${opps.length} opportunities`);

  // ─── 7. Matters (from won opportunities) ───────────────────
  const mattersData = [
    { oppIdx: 7, matterNumber: 'MAT-2025-001', name: 'Emirates Steel — Annual Retainer 2025', clientIdx: 0, practiceArea: 'corporate', leadPartner: sarahId, status: 'active', openDate: daysAgo(45) },
    { oppIdx: 8, matterNumber: 'MAT-2025-002', name: 'Sheikh Mohammed — Family Office Restructuring', clientIdx: 2, practiceArea: 'banking_finance', leadPartner: omarId, status: 'active', openDate: daysAgo(20) },
    { oppIdx: 9, matterNumber: 'MAT-2025-003', name: 'Al Habtoor — Dealership Franchise Agreement', clientIdx: 9, practiceArea: 'corporate', leadPartner: sarahId, status: 'active', openDate: daysAgo(60), targetCloseDate: monthsFromNow(1) },
    // Additional matters not tied to opportunities (older work)
    { oppIdx: null, matterNumber: 'MAT-2024-018', name: 'Emirates Steel — Employment Dispute Resolution', clientIdx: 0, practiceArea: 'employment', leadPartner: omarId, status: 'closed', openDate: daysAgo(180), targetCloseDate: daysAgo(90) },
    { oppIdx: null, matterNumber: 'MAT-2024-019', name: 'Dubai Development — RERA Compliance Audit', clientIdx: 1, practiceArea: 'regulatory', leadPartner: sarahId, status: 'closed', openDate: daysAgo(150), targetCloseDate: daysAgo(60) },
    { oppIdx: null, matterNumber: 'MAT-2024-020', name: 'Noor Finance — Sukuk Issuance Documentation', clientIdx: 8, practiceArea: 'banking_finance', leadPartner: omarId, status: 'active', openDate: daysAgo(90), targetCloseDate: monthsFromNow(2) },
    { oppIdx: null, matterNumber: 'MAT-2025-004', name: 'DIFC Innovation — Employee Share Scheme', clientIdx: 4, practiceArea: 'employment', leadPartner: sarahId, status: 'active', openDate: daysAgo(30) },
    { oppIdx: null, matterNumber: 'MAT-2025-005', name: 'Al Habtoor — Commercial Lease Negotiation', clientIdx: 9, practiceArea: 'real_estate', leadPartner: sarahId, status: 'on_hold', openDate: daysAgo(25), notes: 'On hold pending client board approval of new showroom location.' },
  ];

  const matters: any[] = [];
  for (const m of mattersData) {
    const matter = await prisma.matter.create({
      data: {
        matterNumber: m.matterNumber,
        name: m.name,
        clientId: clients[m.clientIdx].id,
        opportunityId: m.oppIdx !== null ? opps[m.oppIdx].id : null,
        status: m.status,
        practiceArea: m.practiceArea,
        leadPartner: m.leadPartner,
        openDate: m.openDate,
        targetCloseDate: m.targetCloseDate || null,
        notes: m.notes || null,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    matters.push(matter);
  }
  console.log(`✓ Created ${matters.length} matters`);

  // ─── 8. Conflict Records ───────────────────────────────────
  // Some pending (for the conflict queue), some resolved
  const conflictsData = [
    // Gulf Maritime — pending conflict (opp idx 1, consultation stage)
    { oppIdx: 1, matchedEntityType: 'client', matchedEntityId: clients[0].id, matchSource: 'crm_data', matchConfidence: 'medium', confidenceScore: 0.68, matchField: 'industry_overlap', relationshipPath: 'Emirates Steel has maritime supply contracts', resolutionStatus: 'pending' },
    // Gulf Maritime — another pending conflict from court records
    { oppIdx: 1, matchedEntityType: 'opposing_party', matchedEntityId: clients[5].id, matchSource: 'court_records', matchConfidence: 'high', confidenceScore: 0.91, matchField: 'party_name', courtCaseReference: 'DXB-COM-2023-4521', resolutionStatus: 'pending' },
    // Emirates Steel acquisition — cleared conflicts
    { oppIdx: 3, matchedEntityType: 'client', matchedEntityId: clients[1].id, matchSource: 'crm_data', matchConfidence: 'low', confidenceScore: 0.35, matchField: 'industry_overlap', resolutionStatus: 'cleared', resolvedBy: fatimaId, resolutionNotes: 'Different business segments. No material conflict.' },
    // Noor Finance — waived conflict
    { oppIdx: 5, matchedEntityType: 'opposing_party', matchedEntityId: clients[3].id, matchSource: 'crm_data', matchConfidence: 'medium', confidenceScore: 0.55, matchField: 'financial_services_overlap', resolutionStatus: 'waived', resolvedBy: omarId, resolutionNotes: 'Abu Dhabi Capital is an investor in Noor Finance. Conflict waived with informed consent from both parties per ethical wall protocol.' },
    // TechVentures — pending (opp idx 2, consultation stage)
    { oppIdx: 2, matchedEntityType: 'client', matchedEntityId: clients[4].id, matchSource: 'crm_data', matchConfidence: 'high', confidenceScore: 0.82, matchField: 'portfolio_company', relationshipPath: 'DIFC Innovation Hub is a TechVentures portfolio company', resolutionStatus: 'pending' },
  ];

  for (const c of conflictsData) {
    await prisma.conflictRecord.create({
      data: {
        opportunityId: opps[c.oppIdx].id,
        matchedEntityType: c.matchedEntityType,
        matchedEntityId: c.matchedEntityId,
        matchSource: c.matchSource,
        matchConfidence: c.matchConfidence,
        confidenceScore: c.confidenceScore,
        matchField: c.matchField || null,
        relationshipPath: c.relationshipPath || null,
        courtCaseReference: c.courtCaseReference || null,
        resolutionStatus: c.resolutionStatus,
        resolvedBy: c.resolvedBy || null,
        resolutionNotes: c.resolutionNotes || null,
        resolvedAt: c.resolvedBy ? daysAgo(Math.floor(Math.random() * 30) + 5) : null,
      },
    });
  }
  console.log(`✓ Created ${conflictsData.length} conflict records`);

  // ─── 9. KYC Records ────────────────────────────────────────
  const kycData = [
    // Emirates Steel — verified
    { clientIdx: 0, verificationType: 'corporate_kyc', status: 'verified', idDocumentType: 'trade_license', idDocumentNumber: 'TL-DED-2019-445221', idExpiryDate: monthsFromNow(8), verifiedBy: fatimaId, riskRating: 'low', verificationDate: daysAgo(90) },
    // Dubai Development — verified
    { clientIdx: 1, verificationType: 'corporate_kyc', status: 'verified', idDocumentType: 'trade_license', idDocumentNumber: 'TL-DED-2020-887432', idExpiryDate: monthsFromNow(3), verifiedBy: fatimaId, riskRating: 'medium', verificationDate: daysAgo(60) },
    // Sheikh Mohammed — verified (PEP, enhanced due diligence)
    { clientIdx: 2, verificationType: 'enhanced_due_diligence', status: 'verified', idDocumentType: 'emirates_id', idDocumentNumber: '784-1965-XXXXX-X', idExpiryDate: monthsFromNow(11), verifiedBy: fatimaId, riskRating: 'pep', verificationDate: daysAgo(30) },
    // Abu Dhabi Capital — under review
    { clientIdx: 3, verificationType: 'corporate_kyc', status: 'under_review', idDocumentType: 'certificate_of_incorporation', idDocumentNumber: 'ADGM-COI-2021-001234', idExpiryDate: monthsFromNow(18), riskRating: 'medium', notes: 'Awaiting certified copies of beneficial ownership structure.' },
    // DIFC Innovation Hub — verified
    { clientIdx: 4, verificationType: 'corporate_kyc', status: 'verified', idDocumentType: 'trade_license', idDocumentNumber: 'DIFC-TL-2022-005567', idExpiryDate: monthsFromNow(6), verifiedBy: fatimaId, riskRating: 'low', verificationDate: daysAgo(120) },
    // Gulf Maritime — documents requested
    { clientIdx: 5, verificationType: 'corporate_kyc', status: 'documents_requested', idDocumentType: 'trade_license', riskRating: 'high', notes: 'Requested: Trade license, beneficial ownership declaration, source of funds documentation. High risk due to maritime sanctions screening.' },
    // Fatima bint Abdullah — expired
    { clientIdx: 6, verificationType: 'enhanced_due_diligence', status: 'expired', idDocumentType: 'passport', idDocumentNumber: 'P-UAE-1970-XXXX', idExpiryDate: daysAgo(30), verifiedBy: fatimaId, riskRating: 'pep', verificationDate: daysAgo(400), notes: 'PEP status requires annual renewal. ID documents expired.' },
    // Noor Islamic Finance — verified
    { clientIdx: 8, verificationType: 'corporate_kyc', status: 'verified', idDocumentType: 'trade_license', idDocumentNumber: 'DFSA-TL-2020-009988', idExpiryDate: monthsFromNow(10), verifiedBy: fatimaId, riskRating: 'low', verificationDate: daysAgo(150) },
    // Al Habtoor — verified
    { clientIdx: 9, verificationType: 'corporate_kyc', status: 'verified', idDocumentType: 'trade_license', idDocumentNumber: 'DED-TL-2015-667788', idExpiryDate: monthsFromNow(2), verifiedBy: fatimaId, riskRating: 'low', verificationDate: daysAgo(200) },
    // Rashid Foundation — under review
    { clientIdx: 10, verificationType: 'enhanced_due_diligence', status: 'under_review', riskRating: 'pep', notes: 'Government entity — enhanced due diligence in progress. Requires sovereign immunity assessment.' },
    // TechVentures — documents requested
    { clientIdx: 11, verificationType: 'corporate_kyc', status: 'documents_requested', idDocumentType: 'certificate_of_incorporation', idDocumentNumber: 'DIFC-COI-2023-008899', riskRating: 'medium', notes: 'Fund structure KYC — requesting LP register and AML compliance certificate.' },
  ];

  for (const k of kycData) {
    await prisma.kycRecord.create({
      data: {
        clientId: clients[k.clientIdx].id,
        verificationType: k.verificationType,
        status: k.status,
        idDocumentType: k.idDocumentType || null,
        idDocumentNumber: k.idDocumentNumber || null,
        idExpiryDate: k.idExpiryDate || null,
        verifiedBy: k.verifiedBy || null,
        verificationDate: k.verificationDate || null,
        riskRating: k.riskRating || null,
        notes: k.notes || null,
        createdBy: fatimaId,
        updatedBy: fatimaId,
      },
    });
  }
  console.log(`✓ Created ${kycData.length} KYC records`);

  // ─── 10. Opposing Parties ──────────────────────────────────
  const opposingData = [
    { name: 'Global Marine Insurance Ltd', partyType: 'company', matterId: null, opportunityId: opps[1].id },
    { name: 'Al Futtaim Group LLC', partyType: 'company', matterId: matters[2].id, opportunityId: opps[9].id },
    { name: 'Ahmed bin Sultan Al Qasimi', nameArabic: 'أحمد بن سلطان القاسمي', partyType: 'individual', matterId: matters[3].id },
    { name: 'RERA Enforcement Division', partyType: 'company', matterId: matters[4].id },
    { name: 'Dubai Commercial Court — Claim No. 2024/1847', partyType: 'company', matterId: null, opportunityId: opps[3].id },
  ];

  for (const op of opposingData) {
    await prisma.opposingParty.create({
      data: {
        name: op.name,
        nameNormalized: op.name.toLowerCase().replace(/[^a-z0-9\s]/g, ''),
        nameArabic: op.nameArabic || null,
        partyType: op.partyType,
        matterId: op.matterId || null,
        opportunityId: op.opportunityId || null,
      },
    });
  }
  console.log(`✓ Created ${opposingData.length} opposing parties`);

  // ─── 11. Activities ────────────────────────────────────────
  const activitiesData = [
    // Recent client activities
    { entityType: 'client', entityIdx: 0, activityType: 'meeting', subject: 'Annual retainer renewal meeting with Mansour Al Ketbi', body: 'Discussed scope expansion to include regulatory advisory. Client satisfied with litigation outcomes in 2024.', activityDate: daysAgo(2), completedBy: sarahId },
    { entityType: 'client', entityIdx: 1, activityType: 'phone_call', subject: 'Call with Tariq re: Jumeirah Beach project timeline', body: 'Client pushing for accelerated timeline due to Expo legacy development deadlines.', activityDate: daysAgo(1), completedBy: sarahId },
    { entityType: 'client', entityIdx: 2, activityType: 'note', subject: 'PEP screening updated — clear', body: 'Annual PEP screening completed. No new sanctions or adverse media findings.', activityDate: daysAgo(5), completedBy: fatimaId },

    // Lead activities
    { entityType: 'lead', entityIdx: 0, activityType: 'system_event', subject: 'New lead created from website inquiry', activityDate: daysAgo(3), isSystemGenerated: true },
    { entityType: 'lead', entityIdx: 1, activityType: 'phone_call', subject: 'Initial consultation call with PayStream CEO', body: 'Discussed restructuring timeline and DIFC employment requirements. Very interested in proceeding.', activityDate: daysAgo(4), completedBy: laylaId },
    { entityType: 'lead', entityIdx: 3, activityType: 'meeting', subject: 'Due diligence kick-off with Emirates Steel M&A team', body: 'Reviewed target company financials and Egyptian regulatory landscape. Cross-border structuring through ADGM proposed.', activityDate: daysAgo(7), completedBy: sarahId },

    // Opportunity activities
    { entityType: 'opportunity', entityIdx: 0, activityType: 'meeting', subject: 'Initial meeting with Abu Dhabi Capital — Fund IV structure', body: 'Discussed ADGM fund formation, target size AED 2B, LP requirements, and Sharia compliance considerations.', activityDate: daysAgo(3), completedBy: sarahId },
    { entityType: 'opportunity', entityIdx: 3, activityType: 'note', subject: 'Proposal draft circulated to partner committee', body: 'Fee proposal for Egyptian acquisition sent for internal review. Fixed fee of AED 4.2M proposed for full transaction advisory.', activityDate: daysAgo(2), completedBy: sarahId },
    { entityType: 'opportunity', entityIdx: 5, activityType: 'system_event', subject: 'Conflict check cleared — all records resolved', activityDate: daysAgo(15), isSystemGenerated: true },
    { entityType: 'opportunity', entityIdx: 6, activityType: 'email', subject: 'Engagement letter sent to Dubai Development Holdings', body: 'Sent draft engagement letter and fee schedule for Jumeirah Beach development. Awaiting counter-signature.', activityDate: daysAgo(1), completedBy: ahmedId },
    { entityType: 'opportunity', entityIdx: 1, activityType: 'note', subject: 'Conflict flag — requires partner review', body: 'Potential conflict identified with Emirates Steel maritime supply chain. Awaiting Fatima review.', activityDate: daysAgo(6), completedBy: fatimaId },

    // Matter activities
    { entityType: 'matter', entityIdx: 0, activityType: 'meeting', subject: 'Quarterly retainer review — Emirates Steel', body: 'Reviewed ongoing matters, upcoming regulatory changes, and resource allocation for Q2.', activityDate: daysAgo(10), completedBy: sarahId },
    { entityType: 'matter', entityIdx: 1, activityType: 'note', subject: 'Family office restructuring — tax advice received', body: 'External tax counsel confirmed no UAE corporate tax exposure for proposed holding structure.', activityDate: daysAgo(3), completedBy: omarId },
    { entityType: 'matter', entityIdx: 2, activityType: 'email', subject: 'Franchise agreement draft v3 sent to Al Habtoor', body: 'Incorporated all client comments. Key change: expanded territory from Dubai to all Northern Emirates.', activityDate: daysAgo(1), completedBy: ahmedId },
    { entityType: 'matter', entityIdx: 5, activityType: 'meeting', subject: 'Sukuk structuring committee meeting', body: 'Reviewed Sharia board requirements for USD 500M sukuk issuance. Documentation timeline approved.', activityDate: daysAgo(8), completedBy: omarId },
    { entityType: 'matter', entityIdx: 6, activityType: 'task', subject: 'Draft employee share scheme documents for DIFC Innovation', body: 'Prepare option agreement, vesting schedule, and DIFC share plan rules by end of week.', activityDate: daysAgo(2), completedBy: ahmedId },

    // System events
    { entityType: 'opportunity', entityIdx: 7, activityType: 'system_event', subject: 'Opportunity won — converted to Matter MAT-2025-001', activityDate: daysAgo(45), isSystemGenerated: true },
    { entityType: 'opportunity', entityIdx: 8, activityType: 'system_event', subject: 'Opportunity won — converted to Matter MAT-2025-002', activityDate: daysAgo(20), isSystemGenerated: true },
    { entityType: 'opportunity', entityIdx: 10, activityType: 'system_event', subject: 'Opportunity lost — client chose competitor', activityDate: daysAgo(15), isSystemGenerated: true },
  ];

  const entityArrays: Record<string, any[]> = {
    client: clients,
    lead: leads,
    opportunity: opps,
    matter: matters,
  };

  for (const a of activitiesData) {
    const entityArr = entityArrays[a.entityType];
    await prisma.activity.create({
      data: {
        entityType: a.entityType,
        entityId: entityArr[a.entityIdx].id,
        activityType: a.activityType,
        subject: a.subject,
        body: a.body || null,
        activityDate: a.activityDate,
        completedBy: a.completedBy || null,
        isSystemGenerated: a.isSystemGenerated || false,
      },
    });
  }
  console.log(`✓ Created ${activitiesData.length} activities`);

  // ─── 12. Notifications ─────────────────────────────────────
  const notificationsData = [
    { userId: sarahId, title: 'New Lead Assigned', body: 'A new cross-border M&A lead has been qualified and requires your review.', entityType: 'lead', entityId: leads[3].id, isRead: false },
    { userId: fatimaId, title: 'Conflict Review Required', body: 'Gulf Maritime Trading opportunity has 2 pending conflicts requiring compliance review.', entityType: 'opportunity', entityId: opps[1].id, isRead: false },
    { userId: fatimaId, title: 'KYC Expiry Warning', body: 'Fatima bint Abdullah Al Nahyan — KYC documents have expired. Renewal required.', entityType: 'client', entityId: clients[6].id, isRead: false },
    { userId: omarId, title: 'Engagement Letter Counter-Signed', body: 'DDH has counter-signed the engagement letter for Jumeirah Beach development.', entityType: 'opportunity', entityId: opps[6].id, isRead: true, readAt: daysAgo(1) },
    { userId: adminId, title: 'Monthly Compliance Report Ready', body: 'KYC compliance rate at 58%. 2 clients have expired documents.', isRead: false },
    { userId: laylaId, title: 'Lead Follow-Up Reminder', body: 'PayStream Technologies lead has been in "contacted" status for 4 days.', entityType: 'lead', entityId: leads[1].id, isRead: false },
    { userId: ahmedId, title: 'Task Due Tomorrow', body: 'DIFC Innovation employee share scheme documents due for review.', entityType: 'matter', entityId: matters[6].id, isRead: false },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        title: n.title,
        body: n.body,
        entityType: n.entityType || null,
        entityId: n.entityId || null,
        isRead: n.isRead,
        readAt: n.readAt || null,
      },
    });
  }
  console.log(`✓ Created ${notificationsData.length} notifications`);

  // ─── 13. Court Contacts ─────────────────────────────────────
  const courtContactsData = [
    { court: 'dubai', department: 'Civil Execution', contactName: 'Judge Clerk — Dubai Courts', email: 'execution.civil@dc.gov.ae', phone: '+971 4 334 7777' },
    { court: 'sharjah', department: 'Commercial Execution', contactName: 'Sharjah Courts Registry', email: 'execution@sharjahcourts.gov.ae', phone: '+971 6 512 3456' },
    { court: 'ajman', department: 'Execution Department', contactName: 'Ajman Courts', email: 'execution@ajmancourts.gov.ae', phone: '+971 6 740 1234' },
    { court: 'abu_dhabi', department: 'Civil Execution', contactName: 'ADJD Execution Office', email: 'execution@adjd.gov.ae', phone: '+971 2 410 5678' },
    { court: 'ras_al_khaimah', department: 'Execution Office', contactName: 'RAK Courts Registry', email: 'execution@rakcourts.gov.ae', phone: '+971 7 228 1234' },
    { court: 'fujairah', department: 'Execution Office', contactName: 'Fujairah Courts', email: 'execution@fujairahcourts.gov.ae', phone: '+971 9 222 3456' },
    { court: 'umm_al_quwain', department: 'Execution Office', contactName: 'UAQ Courts', email: 'execution@uaqcourts.gov.ae', phone: '+971 6 765 4321' },
    { court: 'dubai_rent', department: 'Rental Disputes Execution', contactName: 'RDC Execution Office', email: 'execution@rdc.gov.ae', phone: '+971 4 435 6789' },
    { court: 'sharjah_rent', department: 'Rental Disputes', contactName: 'Sharjah Rent Committee', email: 'rent.execution@sharjahcourts.gov.ae', phone: '+971 6 512 9876' },
  ];

  const courtContacts: any[] = [];
  for (const cc of courtContactsData) {
    const contact = await prisma.courtContact.create({
      data: {
        court: cc.court,
        department: cc.department,
        contactName: cc.contactName,
        email: cc.email,
        phone: cc.phone,
        isActive: true,
      },
    });
    courtContacts.push(contact);
  }
  console.log(`✓ Created ${courtContacts.length} court contacts`);

  // ─── 14. Execution Files ────────────────────────────────────
  const executionFilesData = [
    // Ongoing files
    { fileNumber: '1234/2025 Commercial Execution', caseNumber: 'COM-2025-001234', court: 'dubai', status: 'ongoing', filingDate: daysAgo(45), claimAmount: 2500000, collectedAmount: 0, currency: 'AED', debtorName: 'Al Nakheel Trading LLC', debtorNameArabic: 'النخيل للتجارة ذ.م.م', creditorName: 'Emirates Steel Industries PJSC', creditorNameArabic: 'شركة حديد الإمارات ش.م.ع', clientIdx: 0, assignedTo: ahmedId, lastActivityDate: daysAgo(5), notes: 'Debtor has assets in JLT. Travel ban issued.' },
    { fileNumber: '567/2025 Civil Execution', caseNumber: 'CIV-2025-000567', court: 'abu_dhabi', status: 'ongoing', filingDate: daysAgo(30), claimAmount: 8500000, collectedAmount: 1200000, currency: 'AED', debtorName: 'Horizon Developers LLC', debtorNameArabic: 'هورايزون للتطوير ذ.م.م', creditorName: 'Dubai Development Holdings LLC', creditorNameArabic: 'دبي للتطوير القابضة ذ.م.م', clientIdx: 1, assignedTo: ahmedId, lastActivityDate: daysAgo(3), notes: 'Partial payment received. Bank accounts attached.' },
    { fileNumber: '890/2025 Commercial Execution', caseNumber: 'COM-2025-000890', court: 'sharjah', status: 'ongoing', filingDate: daysAgo(20), claimAmount: 1750000, collectedAmount: 0, currency: 'AED', debtorName: 'Golden Sands Real Estate LLC', debtorNameArabic: 'الرمال الذهبية للعقارات ذ.م.م', creditorName: 'Sheikh Mohammed bin Khalifa', creditorNameArabic: 'الشيخ محمد بن خليفة', clientIdx: 2, assignedTo: sarahId, lastActivityDate: daysAgo(2) },
    { fileNumber: '345/2025 Commercial Execution', caseNumber: 'COM-2025-000345', court: 'dubai', status: 'ongoing', filingDate: daysAgo(15), claimAmount: 4200000, collectedAmount: 0, currency: 'AED', debtorName: 'Falcon Logistics FZE', debtorNameArabic: 'فالكون للخدمات اللوجستية م.م.ح', creditorName: 'Gulf Maritime Trading Co.', creditorNameArabic: 'الخليج للتجارة البحرية', clientIdx: 5, assignedTo: ahmedId, lastActivityDate: daysAgo(8) },
    { fileNumber: '112/2025 Civil Execution', caseNumber: 'CIV-2025-000112', court: 'ajman', status: 'ongoing', filingDate: daysAgo(60), claimAmount: 950000, collectedAmount: 200000, currency: 'AED', debtorName: 'Ajman Contracting Co.', debtorNameArabic: 'عجمان للمقاولات', creditorName: 'Sharjah Construction Group WLL', creditorNameArabic: 'مجموعة الشارقة للبناء ش.م.م', clientIdx: 7, assignedTo: sarahId, lastActivityDate: daysAgo(12) },
    { fileNumber: '678/2025 Rent Execution', caseNumber: 'RNT-2025-000678', court: 'dubai_rent', status: 'ongoing', filingDate: daysAgo(25), claimAmount: 380000, collectedAmount: 0, currency: 'AED', debtorName: 'Quick Rent Properties', debtorNameArabic: 'كويك رنت للعقارات', creditorName: 'Al Habtoor Automotive LLC', creditorNameArabic: 'الحبتور للسيارات ذ.م.م', clientIdx: 9, assignedTo: ahmedId, lastActivityDate: daysAgo(6) },
    // Stalled files (>30 days no activity)
    { fileNumber: '234/2024 Commercial Execution', caseNumber: 'COM-2024-000234', court: 'ras_al_khaimah', status: 'ongoing', filingDate: daysAgo(120), claimAmount: 3200000, collectedAmount: 500000, currency: 'AED', debtorName: 'RAK Industries Group', debtorNameArabic: 'مجموعة رأس الخيمة الصناعية', creditorName: 'Noor Islamic Finance PJSC', creditorNameArabic: 'نور للتمويل الإسلامي ش.م.ع', clientIdx: 8, assignedTo: omarId, lastActivityDate: daysAgo(45), isStalled: true, notes: 'Debtor claims insolvency. Court-appointed auditor reviewing assets.' },
    { fileNumber: '456/2024 Civil Execution', caseNumber: 'CIV-2024-000456', court: 'fujairah', status: 'ongoing', filingDate: daysAgo(90), claimAmount: 1100000, collectedAmount: 0, currency: 'AED', debtorName: 'Fujairah Trading Est.', debtorNameArabic: 'مؤسسة الفجيرة التجارية', creditorName: 'Abu Dhabi Capital Partners', creditorNameArabic: 'أبوظبي كابيتال بارتنرز', clientIdx: 3, assignedTo: omarId, lastActivityDate: daysAgo(55), isStalled: true, notes: 'Debtor absconded. Interpol notification requested.' },
    { fileNumber: '789/2024 Commercial Execution', caseNumber: 'COM-2024-000789', court: 'umm_al_quwain', status: 'ongoing', filingDate: daysAgo(150), claimAmount: 620000, collectedAmount: 100000, currency: 'AED', debtorName: 'UAQ General Trading LLC', debtorNameArabic: 'أم القيوين للتجارة العامة ذ.م.م', creditorName: 'Emirates Steel Industries PJSC', creditorNameArabic: 'شركة حديد الإمارات ش.م.ع', clientIdx: 0, assignedTo: ahmedId, lastActivityDate: daysAgo(40), isStalled: true },
    // Completed files
    { fileNumber: '100/2024 Commercial Execution', caseNumber: 'COM-2024-000100', court: 'dubai', status: 'completed', filingDate: daysAgo(180), completionDate: daysAgo(30), claimAmount: 5000000, collectedAmount: 5000000, currency: 'AED', debtorName: 'Atlas Construction LLC', debtorNameArabic: 'أطلس للبناء ذ.م.م', creditorName: 'Dubai Development Holdings LLC', creditorNameArabic: 'دبي للتطوير القابضة ذ.م.م', clientIdx: 1, assignedTo: ahmedId, lastActivityDate: daysAgo(30), notes: 'Full amount collected via bank attachment.' },
    { fileNumber: '200/2024 Civil Execution', caseNumber: 'CIV-2024-000200', court: 'sharjah', status: 'completed', filingDate: daysAgo(200), completionDate: daysAgo(60), claimAmount: 1800000, collectedAmount: 1800000, currency: 'AED', debtorName: 'Sharjah Builders FZE', debtorNameArabic: 'الشارقة للبناء م.م.ح', creditorName: 'Sheikh Mohammed bin Khalifa', creditorNameArabic: 'الشيخ محمد بن خليفة', clientIdx: 2, assignedTo: sarahId, lastActivityDate: daysAgo(60) },
    { fileNumber: '300/2024 Rent Execution', caseNumber: 'RNT-2024-000300', court: 'sharjah_rent', status: 'completed', filingDate: daysAgo(160), completionDate: daysAgo(45), claimAmount: 450000, collectedAmount: 450000, currency: 'AED', debtorName: 'Sharjah Retail Group', debtorNameArabic: 'مجموعة الشارقة للتجزئة', creditorName: 'Al Habtoor Automotive LLC', creditorNameArabic: 'الحبتور للسيارات ذ.م.م', clientIdx: 9, assignedTo: sarahId, lastActivityDate: daysAgo(45) },
    // Stopped files
    { fileNumber: '400/2024 Commercial Execution', caseNumber: 'COM-2024-000400', court: 'abu_dhabi', status: 'stopped', filingDate: daysAgo(130), claimAmount: 7500000, collectedAmount: 0, currency: 'AED', debtorName: 'Capital Ventures PJSC', debtorNameArabic: 'كابيتال فنتشرز ش.م.ع', creditorName: 'DIFC Innovation Hub Ltd', creditorNameArabic: 'مركز دبي المالي للابتكار المحدودة', clientIdx: 4, assignedTo: omarId, lastActivityDate: daysAgo(80), notes: 'Settlement reached outside court. File archived.' },
    { fileNumber: '500/2024 Civil Execution', caseNumber: 'CIV-2024-000500', court: 'dubai', status: 'stopped', filingDate: daysAgo(100), claimAmount: 2300000, collectedAmount: 800000, currency: 'AED', debtorName: 'Desert Rose Properties LLC', debtorNameArabic: 'وردة الصحراء للعقارات ذ.م.م', creditorName: 'Emirates Steel Industries PJSC', creditorNameArabic: 'شركة حديد الإمارات ش.م.ع', clientIdx: 0, assignedTo: ahmedId, lastActivityDate: daysAgo(65), notes: 'Execution stopped per client instructions — partial settlement accepted.' },
  ];

  const executionFiles: any[] = [];
  for (const ef of executionFilesData) {
    const file = await prisma.executionFile.create({
      data: {
        fileNumber: ef.fileNumber,
        caseNumber: ef.caseNumber,
        court: ef.court,
        status: ef.status,
        filingDate: ef.filingDate,
        completionDate: ef.completionDate || null,
        claimAmount: ef.claimAmount,
        collectedAmount: ef.collectedAmount,
        currency: ef.currency,
        debtorName: ef.debtorName,
        debtorNameArabic: ef.debtorNameArabic,
        creditorName: ef.creditorName,
        creditorNameArabic: ef.creditorNameArabic,
        clientId: clients[ef.clientIdx].id,
        assignedTo: ef.assignedTo,
        isStalled: ef.isStalled || false,
        lastActivityDate: ef.lastActivityDate,
        notes: ef.notes || null,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    executionFiles.push(file);
  }
  console.log(`✓ Created ${executionFiles.length} execution files`);

  // ─── 15. Criminal Complaints ────────────────────────────────
  const complaintsData = [
    { complaintNumber: 'CC-2025-001', status: 'new', complaintType: 'breach_of_trust', court: 'dubai', complainantName: 'Emirates Steel Industries PJSC', complainantNameArabic: 'شركة حديد الإمارات ش.م.ع', respondentName: 'Ali Hassan Al Rashidi', respondentNameArabic: 'علي حسن الراشدي', filedDate: daysAgo(10), clientIdx: 0, assignedTo: ahmedId, notes: 'Former employee embezzled procurement funds.' },
    { complaintNumber: 'CC-2025-002', status: 'under_investigation', complaintType: 'fraud', court: 'abu_dhabi', complainantName: 'Abu Dhabi Capital Partners', complainantNameArabic: 'أبوظبي كابيتال بارتنرز', respondentName: 'Mahmoud Saeed Trading LLC', respondentNameArabic: 'محمود سعيد للتجارة ذ.م.م', filedDate: daysAgo(30), clientIdx: 3, assignedTo: omarId, notes: 'Investment fraud — misrepresentation of fund assets.' },
    { complaintNumber: 'CC-2025-003', status: 'under_investigation', complaintType: 'bounced_cheque', court: 'sharjah', complainantName: 'Gulf Maritime Trading Co.', complainantNameArabic: 'الخليج للتجارة البحرية', respondentName: 'Khalid Ibrahim Al Suwaidi', respondentNameArabic: 'خالد إبراهيم السويدي', filedDate: daysAgo(25), clientIdx: 5, assignedTo: ahmedId, notes: 'Cheque bounced — amount AED 1.2M for cargo shipment.' },
    { complaintNumber: 'CC-2025-004', status: 'new', complaintType: 'forgery', court: 'dubai', complainantName: 'Dubai Development Holdings LLC', complainantNameArabic: 'دبي للتطوير القابضة ذ.م.م', respondentName: 'Samir Al Hashemi', respondentNameArabic: 'سمير الهاشمي', filedDate: daysAgo(5), clientIdx: 1, assignedTo: sarahId, notes: 'Forged property title deed submitted in land transaction.' },
    { complaintNumber: 'CC-2025-005', status: 'referred_to_prosecution', complaintType: 'embezzlement', court: 'dubai', complainantName: 'Noor Islamic Finance PJSC', complainantNameArabic: 'نور للتمويل الإسلامي ش.م.ع', respondentName: 'Faisal Mohammed Al Mazrouei', respondentNameArabic: 'فيصل محمد المزروعي', filedDate: daysAgo(60), referralDate: daysAgo(15), clientIdx: 8, assignedTo: omarId, notes: 'Branch manager diverted client deposits to personal account. AED 3.5M.' },
    { complaintNumber: 'CC-2024-018', status: 'closed', complaintType: 'defamation', court: 'ajman', complainantName: 'Al Habtoor Automotive LLC', complainantNameArabic: 'الحبتور للسيارات ذ.م.م', respondentName: 'Social Media User @carreviews_uae', respondentNameArabic: 'مستخدم وسائل التواصل الاجتماعي', filedDate: daysAgo(120), clientIdx: 9, assignedTo: ahmedId, notes: 'Defamatory social media campaign. Settled — posts removed.' },
    { complaintNumber: 'CC-2024-019', status: 'closed', complaintType: 'theft', court: 'sharjah', complainantName: 'Sharjah Construction Group WLL', complainantNameArabic: 'مجموعة الشارقة للبناء ش.م.م', respondentName: 'Unknown — Construction Site Workers', respondentNameArabic: 'مجهول — عمال موقع البناء', filedDate: daysAgo(90), clientIdx: 7, assignedTo: sarahId, notes: 'Equipment theft from construction site. Investigation closed — insufficient evidence.' },
    { complaintNumber: 'CC-2025-006', status: 'new', complaintType: 'breach_of_trust', court: 'ras_al_khaimah', complainantName: 'Sheikh Mohammed bin Khalifa', complainantNameArabic: 'الشيخ محمد بن خليفة', respondentName: 'Mohammed Al Balushi Real Estate', respondentNameArabic: 'محمد البلوشي للعقارات', filedDate: daysAgo(8), clientIdx: 2, assignedTo: sarahId, notes: 'Real estate agent misappropriated sale proceeds.' },
    { complaintNumber: 'CC-2025-007', status: 'under_investigation', complaintType: 'fraud', court: 'dubai', complainantName: 'DIFC Innovation Hub Ltd', complainantNameArabic: 'مركز دبي المالي للابتكار المحدودة', respondentName: 'TechStar Solutions FZE', respondentNameArabic: 'تك ستار سوليوشنز م.م.ح', filedDate: daysAgo(18), clientIdx: 4, assignedTo: omarId, notes: 'Software vendor invoiced for undelivered services.' },
  ];

  const complaints: any[] = [];
  for (const c of complaintsData) {
    const complaint = await prisma.criminalComplaint.create({
      data: {
        complaintNumber: c.complaintNumber,
        status: c.status,
        complaintType: c.complaintType,
        court: c.court,
        complainantName: c.complainantName,
        complainantNameArabic: c.complainantNameArabic,
        respondentName: c.respondentName,
        respondentNameArabic: c.respondentNameArabic,
        filedDate: c.filedDate,
        referralDate: c.referralDate || null,
        clientId: clients[c.clientIdx].id,
        assignedTo: c.assignedTo,
        notes: c.notes || null,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    complaints.push(complaint);
  }
  console.log(`✓ Created ${complaints.length} criminal complaints`);

  // ─── 16. Follow-Up Rules ────────────────────────────────────
  // Add auto follow-up rules on 6 ongoing execution files
  const followUpRulesData = [
    { fileIdx: 0, intervalDays: 7, courtContactIdx: 0, templateLanguage: 'both', nextFollowUpDate: daysAgo(-2) },   // Dubai file → Dubai court
    { fileIdx: 1, intervalDays: 14, courtContactIdx: 3, templateLanguage: 'ar', nextFollowUpDate: daysAgo(-11) },    // Abu Dhabi file → Abu Dhabi court
    { fileIdx: 2, intervalDays: 7, courtContactIdx: 1, templateLanguage: 'both', nextFollowUpDate: daysAgo(-5) },    // Sharjah file → Sharjah court
    { fileIdx: 3, intervalDays: 10, courtContactIdx: 0, templateLanguage: 'en', nextFollowUpDate: daysAgo(-2) },     // Dubai file → Dubai court
    { fileIdx: 4, intervalDays: 14, courtContactIdx: 2, templateLanguage: 'ar', nextFollowUpDate: daysAgo(-1) },     // Ajman file → Ajman court
    { fileIdx: 5, intervalDays: 7, courtContactIdx: 7, templateLanguage: 'both', nextFollowUpDate: daysAgo(-4) },    // Dubai Rent file → Dubai Rent court
  ];

  const followUpRules: any[] = [];
  for (const r of followUpRulesData) {
    const rule = await prisma.followUpRule.create({
      data: {
        executionFileId: executionFiles[r.fileIdx].id,
        intervalDays: r.intervalDays,
        isActive: true,
        courtContactId: courtContacts[r.courtContactIdx].id,
        templateLanguage: r.templateLanguage,
        nextFollowUpDate: r.nextFollowUpDate,
      },
    });
    followUpRules.push(rule);
  }
  console.log(`✓ Created ${followUpRules.length} follow-up rules`);

  // ─── 17. Follow-Up Logs ─────────────────────────────────────
  // Historical follow-up emails for realism
  const followUpLogsData = [
    // File 0 (Dubai) — 3 past follow-ups
    { fileIdx: 0, status: 'sent', sentAt: daysAgo(38), recipientEmail: 'execution.civil@dc.gov.ae', subject: 'متابعة ملف تنفيذ رقم 1234/2025 — Follow-up: Execution File 1234/2025', body: 'Follow-up regarding execution file 1234/2025. We request an update on enforcement measures taken.' },
    { fileIdx: 0, status: 'sent', sentAt: daysAgo(31), recipientEmail: 'execution.civil@dc.gov.ae', subject: 'متابعة ملف تنفيذ رقم 1234/2025 — Follow-up: Execution File 1234/2025', body: 'Second follow-up regarding execution file 1234/2025.' },
    { fileIdx: 0, status: 'sent', sentAt: daysAgo(24), recipientEmail: 'execution.civil@dc.gov.ae', subject: 'متابعة ملف تنفيذ رقم 1234/2025 — Follow-up: Execution File 1234/2025', body: 'Third follow-up. Travel ban confirmed issued.' },
    // File 1 (Abu Dhabi) — 2 past follow-ups, one failed
    { fileIdx: 1, status: 'sent', sentAt: daysAgo(16), recipientEmail: 'execution@adjd.gov.ae', subject: 'متابعة ملف تنفيذ رقم 567/2025', body: 'Follow-up regarding execution file 567/2025 Commercial Execution.' },
    { fileIdx: 1, status: 'failed', sentAt: null, recipientEmail: 'execution@adjd.gov.ae', subject: 'متابعة ملف تنفيذ رقم 567/2025', body: 'Second follow-up.', errorMessage: 'SMTP connection timeout — server unreachable' },
    // File 2 (Sharjah) — 2 sent
    { fileIdx: 2, status: 'sent', sentAt: daysAgo(13), recipientEmail: 'execution@sharjahcourts.gov.ae', subject: 'متابعة ملف تنفيذ رقم 890/2025 — Follow-up', body: 'Follow-up on Sharjah Commercial Execution 890/2025.' },
    { fileIdx: 2, status: 'sent', sentAt: daysAgo(6), recipientEmail: 'execution@sharjahcourts.gov.ae', subject: 'متابعة ملف تنفيذ رقم 890/2025 — Follow-up', body: 'Second follow-up on file 890/2025.' },
    // File 3 (Dubai) — 1 sent
    { fileIdx: 3, status: 'sent', sentAt: daysAgo(5), recipientEmail: 'execution.civil@dc.gov.ae', subject: 'Follow-up: Execution File 345/2025', body: 'Follow-up regarding execution file 345/2025 — Falcon Logistics FZE.' },
    // File 5 (Dubai Rent) — 2 sent
    { fileIdx: 5, status: 'sent', sentAt: daysAgo(18), recipientEmail: 'execution@rdc.gov.ae', subject: 'متابعة ملف تنفيذ إيجاري رقم 678/2025 — Follow-up', body: 'Follow-up regarding rent execution file 678/2025.' },
    { fileIdx: 5, status: 'sent', sentAt: daysAgo(11), recipientEmail: 'execution@rdc.gov.ae', subject: 'متابعة ملف تنفيذ إيجاري رقم 678/2025 — Follow-up', body: 'Second follow-up on rent execution file 678/2025.' },
    // Scheduled (future)
    { fileIdx: 0, status: 'scheduled', sentAt: null, recipientEmail: 'execution.civil@dc.gov.ae', subject: 'متابعة ملف تنفيذ رقم 1234/2025 — Follow-up: Execution File 1234/2025', body: 'Upcoming follow-up.' },
  ];

  for (const log of followUpLogsData) {
    await prisma.followUpLog.create({
      data: {
        executionFileId: executionFiles[log.fileIdx].id,
        status: log.status,
        sentAt: log.sentAt || null,
        recipientEmail: log.recipientEmail,
        subject: log.subject,
        body: log.body,
        errorMessage: log.errorMessage || null,
      },
    });
  }
  console.log(`✓ Created ${followUpLogsData.length} follow-up logs`);

  // ─── Summary ───────────────────────────────────────────────
  console.log('\n✅ Seed complete!');
  console.log('─'.repeat(50));
  console.log(`  Tenant:        ${tenant.name}`);
  console.log(`  Users:         ${usersData.length}`);
  console.log(`  Clients:       ${clients.length}`);
  console.log(`  Contacts:      ${contactsData.length}`);
  console.log(`  Leads:         ${leads.length}`);
  console.log(`  Opportunities: ${opps.length}`);
  console.log(`  Matters:       ${matters.length}`);
  console.log(`  Conflicts:     ${conflictsData.length}`);
  console.log(`  KYC Records:   ${kycData.length}`);
  console.log(`  Activities:    ${activitiesData.length}`);
  console.log(`  Notifications: ${notificationsData.length}`);
  console.log(`  Court Contacts: ${courtContacts.length}`);
  console.log(`  Exec. Files:   ${executionFiles.length}`);
  console.log(`  Complaints:    ${complaints.length}`);
  console.log(`  Follow-Up Rules: ${followUpRules.length}`);
  console.log(`  Follow-Up Logs:  ${followUpLogsData.length}`);
  console.log('─'.repeat(50));
  console.log('\n  Admin Login: bladmin@albasti.dev / Myfav0r!teBL1T');
  console.log('  Demo users: <name>@albasti.dev / Admin123!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
