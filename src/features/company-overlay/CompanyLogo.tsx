/**
 * CompanyLogo shim — bridges v3 canonical named-only export to default-import consumers.
 *
 * v3 canonical (./CompanyLogo.canonical.tsx) exports `CompanyLogo` as named only, but
 * globalCompanies/CompanyHeaderRow.tsx + globalCompanies/NetworkPanel.tsx default-import
 * it. Under `verbatimModuleSyntax: true` this fails at runtime (ESM semantics).
 *
 * This shim re-exports both forms so both import styles resolve without editing canonical.
 * Documented as debt (c) in docs/PHASE_5_DEBT.md — upstream v3 bug to fix separately.
 */
export { CompanyLogo, CompanyLogo as default } from './CompanyLogo.canonical'
