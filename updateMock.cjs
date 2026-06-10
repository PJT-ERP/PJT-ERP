const fs = require('fs');
let code = fs.readFileSync('src/app/components/data/mockData.ts', 'utf8');

// Replace string literals in INITIAL_QUOTATIONS
code = code.replace(/'Waiting Design'/g, "'pending_design'");
code = code.replace(/'Waiting Pricing'/g, "'waiting_pricing'");
code = code.replace(/'Sent to Client'/g, "'client_price_approval'");
code = code.replace(/'Won'/g, "'won'");
code = code.replace(/'Lost'/g, "'lost'");

// Replace SOStatus literals
code = code.replace(/'Pending Design'/g, "'pending_assignment'");
code = code.replace(/'Waiting Spv Approval'/g, "'pending_assignment'");
code = code.replace(/'Waiting Approval'/g, "'waiting_dp'");
code = code.replace(/'Revision Required'/g, "'waiting_dp'");
code = code.replace(/'Ready for Production'/g, "'pending_assignment'");
code = code.replace(/'In Production'/g, "'in_production'");
code = code.replace(/'QC'/g, "'qc_check'");
code = code.replace(/'Completed'/g, "'completed'");
code = code.replace(/'Rejected'/g, "'completed'");

// Replace getStatusColor map for Quotations
const newGetStatusColor = `
export function getSOStatusColor(status: SOStatus): { bg: string; text: string; border: string } {
  const map: Record<SOStatus, { bg: string; text: string; border: string }> = {
    'waiting_dp':           { bg: '#F59E0B', text: '#FFFFFF', border: 'transparent' }, // Amber
    'pending_assignment':   { bg: '#8B5CF6', text: '#FFFFFF', border: 'transparent' }, // Purple
    'material_preparation': { bg: '#64748B', text: '#FFFFFF', border: 'transparent' }, // Slate
    'in_production':        { bg: '#2563EB', text: '#FFFFFF', border: 'transparent' }, // Blue
    'qc_check':             { bg: '#9333EA', text: '#FFFFFF', border: 'transparent' }, // Violet
    'ready_to_ship':        { bg: '#0891B2', text: '#FFFFFF', border: 'transparent' }, // Cyan
    'shipped':              { bg: '#0D9488', text: '#FFFFFF', border: 'transparent' }, // Teal
    'completed':            { bg: '#16A34A', text: '#FFFFFF', border: 'transparent' }, // Green
  };
  return map[status] || { bg: '#475569', text: '#FFFFFF', border: 'transparent' };
}

export function getStatusColor(status: QuotationStatus | SOStatus | string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    'draft':                  { bg: '#64748B', text: '#FFFFFF', border: 'transparent' }, // Slate
    'pending_design':         { bg: '#8B5CF6', text: '#FFFFFF', border: 'transparent' }, // Purple
    'design_review':          { bg: '#D946EF', text: '#FFFFFF', border: 'transparent' }, // Fuchsia
    'client_design_approval': { bg: '#F59E0B', text: '#FFFFFF', border: 'transparent' }, // Amber
    'waiting_pricing':        { bg: '#2563EB', text: '#FFFFFF', border: 'transparent' }, // Blue
    'client_price_approval':  { bg: '#0891B2', text: '#FFFFFF', border: 'transparent' }, // Cyan
    'won':                    { bg: '#16A34A', text: '#FFFFFF', border: 'transparent' }, // Green
    'lost':                   { bg: '#DC2626', text: '#FFFFFF', border: 'transparent' }, // Red
  };
  return map[status as string] || getSOStatusColor(status as SOStatus);
}
`;

code = code.replace(/export function getStatusColor.*?return map\[status\].*?\}/s, newGetStatusColor);

code = code.replace(/export const STATUS_STEPS: SOStatus\[\] = \[.*?\];/s, "export const STATUS_STEPS: SOStatus[] = ['waiting_dp', 'pending_assignment', 'material_preparation', 'in_production', 'qc_check', 'ready_to_ship', 'shipped', 'completed'];");
code = code.replace(/export const REVISION_STATUSES: SOStatus\[\] = \[.*?\];/s, "export const REVISION_STATUSES: SOStatus[] = [];");

fs.writeFileSync('src/app/components/data/mockData.ts', code);
