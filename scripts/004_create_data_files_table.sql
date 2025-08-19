-- Create data_files table
CREATE TABLE IF NOT EXISTS data_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    chart_type VARCHAR(50) DEFAULT 'line',
    json_data JSONB NOT NULL,
    field_order TEXT[] DEFAULT NULL,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_data_files_dashboard_tenant ON data_files(dashboard_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_files_data_type ON data_files(data_type);
