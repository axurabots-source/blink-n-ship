-- AlterTable
ALTER TABLE "courier_accounts" ADD COLUMN     "auth_method" TEXT NOT NULL DEFAULT 'api_key',
ADD COLUMN     "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_verified_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "courier_status" TEXT,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "returned_at" TIMESTAMP(3),
ADD COLUMN     "shipment_id" TEXT,
ADD COLUMN     "shipping_type" TEXT,
ADD COLUMN     "weight" DECIMAL(8,2);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "weight" DECIMAL(8,2) DEFAULT 0;

-- CreateTable
CREATE TABLE "courier_account_metadata" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "account_name" TEXT,
    "account_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "balance" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'PKR',
    "raw_metadata" JSONB,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_account_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "default_provider" TEXT NOT NULL DEFAULT 'flaship',
    "default_company_id" UUID,
    "default_pickup_id" UUID,
    "default_service_type" TEXT,
    "auto_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_sync_interval_mins" INTEGER NOT NULL DEFAULT 30,
    "booking_retry_count" INTEGER NOT NULL DEFAULT 3,
    "timeout_seconds" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_companies" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "raw_data" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "raw_data" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_locations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "area" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "raw_data" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_cities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "zone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "raw_data" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "external_id" TEXT,
    "company_code" TEXT,
    "service_type" TEXT,
    "origin_zone" TEXT,
    "destination_zone" TEXT,
    "weight_slab_min" DECIMAL(8,3),
    "weight_slab_max" DECIMAL(8,3),
    "base_rate" DECIMAL(12,2),
    "per_kg_rate" DECIMAL(12,2),
    "cod_charges" DECIMAL(12,2),
    "fuel_surcharge" DECIMAL(12,2),
    "raw_data" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "company_id" UUID,
    "pickup_location_id" UUID,
    "tracking_number" TEXT,
    "cn" TEXT,
    "external_id" TEXT,
    "label_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "courier_status" TEXT,
    "last_tracked_at" TIMESTAMP(3),
    "service_type" TEXT,
    "weight" DECIMAL(8,3),
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "cod_amount" DECIMAL(12,2),
    "recipient_name" TEXT,
    "recipient_phone" TEXT,
    "recipient_address" TEXT,
    "recipient_city" TEXT,
    "booked_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "booking_request" JSONB,
    "booking_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_timeline" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'courier',
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_snapshots" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "raw_response" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "label_url" TEXT,
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loadsheets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "external_id" TEXT,
    "loadsheet_url" TEXT,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "raw_response" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loadsheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loadsheet_orders" (
    "id" UUID NOT NULL,
    "loadsheet_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,

    CONSTRAINT "loadsheet_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "sync_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "request_body" JSONB,
    "response_body" JSONB,
    "status_code" INTEGER,
    "is_success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "called_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_activity_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'flaship',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tracking_number" TEXT,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "error_message" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_account_metadata_user_id_idx" ON "courier_account_metadata"("user_id");

-- CreateIndex
CREATE INDEX "courier_account_metadata_user_id_provider_idx" ON "courier_account_metadata"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "courier_settings_user_id_key" ON "courier_settings"("user_id");

-- CreateIndex
CREATE INDEX "courier_companies_user_id_idx" ON "courier_companies"("user_id");

-- CreateIndex
CREATE INDEX "courier_companies_user_id_provider_idx" ON "courier_companies"("user_id", "provider");

-- CreateIndex
CREATE INDEX "service_types_user_id_idx" ON "service_types"("user_id");

-- CreateIndex
CREATE INDEX "service_types_user_id_provider_idx" ON "service_types"("user_id", "provider");

-- CreateIndex
CREATE INDEX "pickup_locations_user_id_idx" ON "pickup_locations"("user_id");

-- CreateIndex
CREATE INDEX "pickup_locations_user_id_provider_idx" ON "pickup_locations"("user_id", "provider");

-- CreateIndex
CREATE INDEX "operational_cities_user_id_idx" ON "operational_cities"("user_id");

-- CreateIndex
CREATE INDEX "operational_cities_user_id_provider_idx" ON "operational_cities"("user_id", "provider");

-- CreateIndex
CREATE INDEX "rate_cards_user_id_idx" ON "rate_cards"("user_id");

-- CreateIndex
CREATE INDEX "rate_cards_user_id_provider_idx" ON "rate_cards"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_user_id_idx" ON "shipments"("user_id");

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_user_id_status_idx" ON "shipments"("user_id", "status");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipment_timeline_shipment_id_idx" ON "shipment_timeline"("shipment_id");

-- CreateIndex
CREATE INDEX "shipment_timeline_shipment_id_occurred_at_idx" ON "shipment_timeline"("shipment_id", "occurred_at");

-- CreateIndex
CREATE INDEX "tracking_snapshots_shipment_id_idx" ON "tracking_snapshots"("shipment_id");

-- CreateIndex
CREATE INDEX "tracking_snapshots_tracking_number_idx" ON "tracking_snapshots"("tracking_number");

-- CreateIndex
CREATE INDEX "labels_user_id_idx" ON "labels"("user_id");

-- CreateIndex
CREATE INDEX "labels_shipment_id_idx" ON "labels"("shipment_id");

-- CreateIndex
CREATE INDEX "loadsheets_user_id_idx" ON "loadsheets"("user_id");

-- CreateIndex
CREATE INDEX "loadsheet_orders_loadsheet_id_idx" ON "loadsheet_orders"("loadsheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "loadsheet_orders_loadsheet_id_shipment_id_key" ON "loadsheet_orders"("loadsheet_id", "shipment_id");

-- CreateIndex
CREATE INDEX "sync_logs_user_id_idx" ON "sync_logs"("user_id");

-- CreateIndex
CREATE INDEX "sync_logs_user_id_sync_type_idx" ON "sync_logs"("user_id", "sync_type");

-- CreateIndex
CREATE INDEX "sync_logs_user_id_started_at_idx" ON "sync_logs"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "api_logs_user_id_idx" ON "api_logs"("user_id");

-- CreateIndex
CREATE INDEX "api_logs_user_id_called_at_idx" ON "api_logs"("user_id", "called_at");

-- CreateIndex
CREATE INDEX "api_logs_user_id_is_success_idx" ON "api_logs"("user_id", "is_success");

-- CreateIndex
CREATE INDEX "courier_activity_logs_user_id_idx" ON "courier_activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "courier_activity_logs_user_id_event_type_idx" ON "courier_activity_logs"("user_id", "event_type");

-- CreateIndex
CREATE INDEX "courier_activity_logs_user_id_created_at_idx" ON "courier_activity_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "booking_attempts_user_id_idx" ON "booking_attempts"("user_id");

-- CreateIndex
CREATE INDEX "booking_attempts_order_id_idx" ON "booking_attempts"("order_id");

-- CreateIndex
CREATE INDEX "courier_accounts_user_id_idx" ON "courier_accounts"("user_id");

-- CreateIndex
CREATE INDEX "courier_accounts_user_id_provider_is_active_idx" ON "courier_accounts"("user_id", "provider", "is_active");

-- CreateIndex
CREATE INDEX "orders_tracking_number_idx" ON "orders"("tracking_number");

-- AddForeignKey
ALTER TABLE "courier_account_metadata" ADD CONSTRAINT "courier_account_metadata_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_settings" ADD CONSTRAINT "courier_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_companies" ADD CONSTRAINT "courier_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "courier_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_cities" ADD CONSTRAINT "operational_cities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "courier_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "pickup_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_timeline" ADD CONSTRAINT "shipment_timeline_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_snapshots" ADD CONSTRAINT "tracking_snapshots_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loadsheets" ADD CONSTRAINT "loadsheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loadsheet_orders" ADD CONSTRAINT "loadsheet_orders_loadsheet_id_fkey" FOREIGN KEY ("loadsheet_id") REFERENCES "loadsheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loadsheet_orders" ADD CONSTRAINT "loadsheet_orders_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_activity_logs" ADD CONSTRAINT "courier_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
