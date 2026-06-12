import { INITIAL_SALES_ORDERS, CUSTOMERS } from "./src/app/components/data/mockData";

const inProductionRev = INITIAL_SALES_ORDERS.filter(so => so.status === 'In Production');
try {
    inProductionRev.forEach((so) => {
        const customer = CUSTOMERS.find(c => c.code === so.customerId);
        const progress = so.timeline ? Math.round((so.timeline.findIndex(t => t.current) / so.timeline.length) * 100) : 0;
        const currentStep = so.timeline?.find(t => t.current);
    });
    console.log("In Production OK");
} catch(e) { console.error("In Production FAIL", e); }

const waitingQCRev = INITIAL_SALES_ORDERS.filter(so => so.status === 'QC');
try {
    waitingQCRev.forEach((so) => {
        const customer = CUSTOMERS.find(c => c.code === so.customerId);
    });
    console.log("QC OK");
} catch(e) { console.error("QC FAIL", e); }
