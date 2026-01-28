# Bug Fix: Race Condition in Invoice Number Generation

## Overview
This fix addresses a critical race condition in the `generate_invoice_number` database function that could cause duplicate invoice numbers when multiple invoices are created simultaneously.

## The Problem

### Root Cause
The original `generate_invoice_number` function had a race condition vulnerability:

1. Function reads `MAX(numero)` to determine the next invoice number
2. Returns the calculated number to the application
3. Application inserts a new invoice with that number

If two concurrent requests execute this sequence simultaneously:
- Both read the same MAX value (e.g., "2026-0005")
- Both calculate the same "next" number (e.g., "2026-0006")
- Both attempt to insert invoices with number "2026-0006"
- The second INSERT fails with a unique constraint violation error

### Impact
- **Random failures**: Invoice creation fails unpredictably during concurrent operations
- **Poor user experience**: Users see cryptic "duplicate key" database errors
- **Data inconsistency risk**: Failed transactions may leave partial data
- **Frustration**: Users don't understand why invoice creation sometimes fails

### Reproduction Scenario
This bug occurs when:
1. Multiple users create invoices at the same time
2. The same user rapidly creates multiple invoices (e.g., via API or batch operations)
3. Automated systems create invoices concurrently

## The Solution

### Fix Implementation
Added PostgreSQL advisory locking to ensure atomicity of the invoice number generation:

```sql
CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    invoice_number TEXT;
    lock_key BIGINT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Create a deterministic lock key from user_id and year
    -- This ensures each user+year combination has its own lock
    lock_key := ('x' || substring(md5(p_user_id::TEXT || current_year) from 1 for 15))::bit(60)::BIGINT;
    
    -- Acquire advisory lock to prevent race conditions
    -- This lock is automatically released at the end of the transaction
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Get the next invoice number for this user in the current year
    SELECT COALESCE(MAX(...)) + 1
    INTO next_number
    FROM facturas
    WHERE user_id = p_user_id
    AND numero LIKE current_year || '-%';

    -- Format: YYYY-NNNN (e.g., 2026-0001)
    invoice_number := current_year || '-' || LPAD(next_number::TEXT, 4, '0');

    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;
```

### Key Changes
1. **Advisory Lock**: Uses `pg_advisory_xact_lock()` to ensure only one transaction can generate invoice numbers for a given user+year combination at a time
2. **Deterministic Lock Key**: Creates a unique lock key from user_id and year using MD5 hashing
3. **Automatic Release**: The lock is automatically released when the transaction completes (commit or rollback)

### How It Works
1. When a transaction calls `generate_invoice_number()`, it first acquires an advisory lock
2. If another transaction is already holding the lock, the second transaction waits
3. Once the lock is acquired, the function safely reads the MAX value and calculates the next number
4. The invoice is inserted with the generated number
5. When the transaction commits, the lock is released
6. The next waiting transaction can now proceed

### Why Advisory Locks?
- **Transaction-scoped**: Automatically released on commit/rollback
- **No deadlock risk**: Per-user+year locking ensures minimal contention
- **Performance**: Locks are in-memory and very fast
- **Backward compatible**: No schema changes required

## Applying the Fix

### For New Installations
The fix is already included in `supabase/migrations/001_initial_schema.sql`. Just run the migration as usual.

### For Existing Databases
Apply the migration file `supabase/migrations/002_fix_race_condition.sql`:

#### Option 1: Using Supabase CLI
```bash
supabase db push
```

#### Option 2: Using SQL Editor
1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/002_fix_race_condition.sql`
4. Paste and execute the SQL

#### Option 3: Manual Update
Run this SQL command in your database:
```sql
CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
-- (paste the full function from the migration file)
$$ LANGUAGE plpgsql;
```

## Testing

### Before the Fix
If you run this test before applying the fix, you might see duplicate key errors:

```javascript
// Create 10 invoices concurrently
const promises = Array.from({ length: 10 }, () =>
  createFactura({
    cliente_id: 'some-client-id',
    fecha: '2026-01-28',
    lineas: [{ concepto: 'Test', cantidad: 1, precio_unitario: 100 }]
  })
);

const results = await Promise.allSettled(promises);
// Before fix: Some promises rejected with "duplicate key" error
```

### After the Fix
All concurrent creations should succeed:

```javascript
const results = await Promise.allSettled(promises);
const successful = results.filter(r => r.status === 'fulfilled').length;
// After fix: All 10 should succeed
console.log(`${successful}/10 invoices created successfully`);
```

## Related Files Modified
- `supabase/migrations/001_initial_schema.sql` - Updated function definition
- `supabase/migrations/002_fix_race_condition.sql` - Migration for existing databases

## Impact Assessment
- **Breaking Changes**: None
- **Performance Impact**: Negligible (advisory locks are very fast)
- **Backward Compatibility**: Fully compatible
- **Risk Level**: Low (only modifies a database function)

## Additional Notes

### Lock Granularity
The lock is scoped to `user_id + year`, meaning:
- ✅ Different users can create invoices simultaneously without blocking
- ✅ The same user can create invoices for different years without blocking
- ⚠️ The same user creating multiple invoices for the same year will be serialized (but this is desired behavior)

### Alternative Solutions Considered

1. **Database Sequences**: Would require schema changes and doesn't support the year-based numbering format
2. **SELECT FOR UPDATE**: Would require locking entire rows, causing more contention
3. **Optimistic Locking**: Would still result in retry loops and poor UX

The advisory lock approach was chosen for its simplicity, performance, and backward compatibility.

## Future Improvements

If high-volume concurrent invoice creation becomes common, consider:
1. Pre-allocating blocks of invoice numbers
2. Using a separate sequence table per user
3. Implementing client-side queueing for bulk operations
