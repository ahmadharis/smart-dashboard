-- Add public sharing setting to existing tenants
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    -- Add allow_public_sharing setting for all existing tenants
    FOR tenant_record IN SELECT tenant_id FROM tenants LOOP
        -- Removed description column as it doesn't exist in settings table
        INSERT INTO settings (tenant_id, key, value)
        VALUES (
            tenant_record.tenant_id,
            'allow_public_sharing',
            'true'
        )
        ON CONFLICT (tenant_id, key) DO NOTHING;
    END LOOP;
END $$;
