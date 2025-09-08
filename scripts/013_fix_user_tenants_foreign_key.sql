-- Fix Missing Foreign Key Constraint in user_tenants Table
-- This addresses a critical referential integrity issue

-- Add foreign key constraint to tenant_id if it doesn't exist
DO $$
BEGIN
    -- Check if the foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_tenants_tenant_id_fkey'
        AND table_name = 'user_tenants'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Add the missing foreign key constraint
        ALTER TABLE user_tenants 
        ADD CONSTRAINT user_tenants_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added missing foreign key constraint: user_tenants.tenant_id -> tenants.tenant_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists: user_tenants.tenant_id -> tenants.tenant_id';
    END IF;
END $$;

-- Verification query to check constraint was added
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_tenants'
    AND kcu.column_name = 'tenant_id';