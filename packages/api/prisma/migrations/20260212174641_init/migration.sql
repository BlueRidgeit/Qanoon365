-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_default";

-- CreateTable
CREATE TABLE "tenants" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_number" VARCHAR(100) NOT NULL,
    "filing_date" DATE,
    "court" VARCHAR(255),
    "jurisdiction" VARCHAR(100),
    "case_type" VARCHAR(100),
    "subject_matter" TEXT,
    "outcome" VARCHAR(100),
    "outcome_date" DATE,
    "duration_days" INTEGER,
    "notes" TEXT,
    "raw_document_path" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_parties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "name_normalized" VARCHAR(255),
    "name_arabic" VARCHAR(255),
    "party_type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_case_parties" (
    "court_case_id" UUID NOT NULL,
    "court_party_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "representing_firm" VARCHAR(255),
    "representing_lawyer" VARCHAR(255),
    "outcome_for_party" VARCHAR(100),

    CONSTRAINT "court_case_parties_pkey" PRIMARY KEY ("court_case_id","court_party_id")
);

-- CreateTable
CREATE TABLE "tenant_default"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "client_type" VARCHAR(30) NOT NULL,
    "registration_number" VARCHAR(100),
    "industry" VARCHAR(100),
    "preferred_language" VARCHAR(10) NOT NULL DEFAULT 'english',
    "kyc_status" VARCHAR(30) NOT NULL DEFAULT 'not_started',
    "kyc_expiry_date" DATE,
    "risk_rating" VARCHAR(10),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "job_title" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject" VARCHAR(255) NOT NULL,
    "case_type" VARCHAR(30) NOT NULL,
    "jurisdiction" VARCHAR(30) NOT NULL,
    "urgency" VARCHAR(15) NOT NULL,
    "case_summary" TEXT NOT NULL,
    "client_name" VARCHAR(255),
    "client_type" VARCHAR(30),
    "opposing_party_names" TEXT,
    "estimated_value" DECIMAL(15,2),
    "referral_source" VARCHAR(100),
    "court_intel_flag" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "assigned_to" UUID,
    "converted_opportunity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "stage" VARCHAR(20) NOT NULL DEFAULT 'inquiry',
    "conflict_check_status" VARCHAR(30) NOT NULL DEFAULT 'not_started',
    "conflict_approved_by" UUID,
    "conflict_resolution_notes" TEXT,
    "kyc_status" VARCHAR(30) NOT NULL DEFAULT 'not_started',
    "practice_area" VARCHAR(30) NOT NULL,
    "engagement_type" VARCHAR(20),
    "assigned_partner" UUID NOT NULL,
    "estimated_value" DECIMAL(15,2),
    "court_intel_summary" TEXT,
    "risk_score" VARCHAR(10),
    "closed_at" TIMESTAMP(3),
    "close_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."matters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_number" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "client_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "status" VARCHAR(15) NOT NULL DEFAULT 'active',
    "practice_area" VARCHAR(30),
    "lead_partner" UUID NOT NULL,
    "open_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_close_date" DATE,
    "court_intel_context" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."conflict_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "opportunity_id" UUID NOT NULL,
    "matched_entity_type" VARCHAR(20) NOT NULL,
    "matched_entity_id" UUID NOT NULL,
    "match_source" VARCHAR(20) NOT NULL,
    "match_confidence" VARCHAR(10) NOT NULL,
    "confidence_score" DECIMAL(3,2),
    "match_field" VARCHAR(100),
    "relationship_path" TEXT,
    "court_case_reference" TEXT,
    "related_matter_id" UUID,
    "resolution_status" VARCHAR(25) NOT NULL DEFAULT 'pending',
    "resolved_by" UUID,
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conflict_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."kyc_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "verification_type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'not_started',
    "id_document_type" VARCHAR(40),
    "id_document_number" VARCHAR(100),
    "id_expiry_date" DATE,
    "verification_date" DATE,
    "verified_by" UUID,
    "risk_rating" VARCHAR(10),
    "notes" TEXT,
    "document_folder_path" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "kyc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."opposing_parties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "name_normalized" VARCHAR(255),
    "name_arabic" VARCHAR(255),
    "party_type" VARCHAR(20),
    "matter_id" UUID,
    "opportunity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opposing_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "blob_path" VARCHAR(500) NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "document_category" VARCHAR(30) NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "activity_type" VARCHAR(20) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "activity_date" TIMESTAMP(3) NOT NULL,
    "completed_by" UUID,
    "is_system_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."court_intel_queries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_type" VARCHAR(30) NOT NULL,
    "source_entity_type" VARCHAR(20),
    "source_entity_id" UUID,
    "query_input" JSONB,
    "result_summary" TEXT,
    "result_data" JSONB,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_intel_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" VARCHAR(20),
    "entity_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_default"."audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "field_changed" VARCHAR(100),
    "old_value" TEXT,
    "new_value" TEXT,
    "performed_by" UUID NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "tenant_default"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "matters_matter_number_key" ON "tenant_default"."matters"("matter_number");

-- AddForeignKey
ALTER TABLE "court_case_parties" ADD CONSTRAINT "court_case_parties_court_case_id_fkey" FOREIGN KEY ("court_case_id") REFERENCES "court_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_case_parties" ADD CONSTRAINT "court_case_parties_court_party_id_fkey" FOREIGN KEY ("court_party_id") REFERENCES "court_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_default"."contacts" ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tenant_default"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_default"."leads" ADD CONSTRAINT "leads_converted_opportunity_id_fkey" FOREIGN KEY ("converted_opportunity_id") REFERENCES "tenant_default"."opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_default"."opportunities" ADD CONSTRAINT "opportunities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tenant_default"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_default"."matters" ADD CONSTRAINT "matters_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tenant_default"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_default"."matters" ADD CONSTRAINT "matters_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "tenant_default"."opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_default"."conflict_records" ADD CONSTRAINT "conflict_records_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "tenant_default"."opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_default"."kyc_records" ADD CONSTRAINT "kyc_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "tenant_default"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
