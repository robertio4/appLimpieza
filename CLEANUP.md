# Code Cleanup Documentation - src/lib Utilities

## Summary
This cleanup focused on the `src/lib` directory, eliminating code duplication and replacing magic numbers with named constants. The changes improve maintainability without altering functionality.

**Key Improvements:**
- ✅ Consolidated 4 duplicate `ActionResult` type definitions into a single shared type
- ✅ Replaced magic numbers (0.21) with the `IVA_PERCENTAGE` constant
- ✅ Improved code maintainability and consistency across all action files

## Overview
This document details the cleanup and refactoring performed on the utility files in the `src/lib` directory to improve code maintainability, reduce duplication, and enforce consistency.

## Changes Made

### 1. Consolidated Duplicate Type Definitions

**Problem:** The `ActionResult<T>` type was defined identically in four separate files:
- `src/lib/actions/categorias.ts`
- `src/lib/actions/dashboard.ts`
- `src/lib/actions/facturas.ts`
- `src/lib/actions/gastos.ts`

**Solution:** Created a shared types file at `src/lib/types.ts` containing the `ActionResult` type definition. Updated all four action files to import the type instead of defining it locally.

**Benefits:**
- **Single Source of Truth**: The type is now defined in one place, making it easier to maintain and update
- **Reduced Duplication**: Eliminated 4 duplicate type definitions (3 duplicates removed)
- **Consistency**: Ensures all action files use the exact same type definition
- **Easier Updates**: Future changes to the ActionResult type only need to be made in one location

**Files Modified:**
- Created: `src/lib/types.ts`
- Updated: `src/lib/actions/categorias.ts`
- Updated: `src/lib/actions/dashboard.ts`
- Updated: `src/lib/actions/facturas.ts`
- Updated: `src/lib/actions/gastos.ts`

### 2. Replaced Magic Numbers with Named Constants

**Problem:** The IVA (VAT) calculation in `facturas.ts` used hardcoded values (`0.21`) instead of the existing `IVA_PERCENTAGE` constant defined in `src/lib/constants.ts`.

**Locations Fixed:**
- `createFactura` function (line ~201)
- `updateFactura` function (line ~293)

**Solution:** 
- Imported `IVA_PERCENTAGE` from `@/lib/constants`
- Replaced `subtotal * 0.21` with `subtotal * (IVA_PERCENTAGE / 100)`

**Benefits:**
- **Maintainability**: If the IVA percentage changes, it only needs to be updated in one place
- **Readability**: The code is now self-documenting - it's clear that we're applying the IVA percentage
- **Consistency**: Uses the same constant that's documented in the constants file
- **Accuracy**: The formula `(IVA_PERCENTAGE / 100)` is clearer than `0.21`, explicitly showing the percentage conversion

**Files Modified:**
- Updated: `src/lib/actions/facturas.ts`

## Summary

### Statistics
- **Files Created**: 1 (`src/lib/types.ts`)
- **Files Modified**: 5 (all action files + facturas.ts for IVA)
- **Lines of Code Removed**: ~12 (duplicate type definitions)
- **Duplicate Definitions Eliminated**: 3
- **Magic Numbers Replaced**: 2

### Impact
These changes improve the codebase by:
1. Reducing code duplication by consolidating shared types
2. Improving maintainability through the use of named constants
3. Making the code more readable and self-documenting
4. Ensuring consistency across all action files
5. Following DRY (Don't Repeat Yourself) principles

### Testing Recommendations
After these changes, verify:
1. All action files compile without TypeScript errors
2. Invoice creation and updates calculate IVA correctly
3. All API endpoints that return `ActionResult` type continue to work
4. No breaking changes to the public API surface

## Future Improvement Opportunities

While not implemented in this cleanup (to keep changes minimal), the following opportunities for improvement were identified:

1. **Authentication Pattern**: The user authentication check pattern is repeated in every action function. Consider creating a higher-order function or middleware to handle authentication.

2. **Error Handling**: Error messages could be standardized and potentially extracted to a central location for easier localization and consistency.

3. **Supabase Client**: The pattern of creating a Supabase client is repeated. Could potentially be abstracted.

These improvements were not made to maintain the principle of minimal, focused changes, but are documented here for future consideration.
