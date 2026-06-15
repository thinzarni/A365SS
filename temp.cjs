const fs = require('fs');
let c = fs.readFileSync('src/pages/FerryRequestPage/FerryRequestPage.tsx', 'utf-8');
c = c.replace(/styles\.sectionTitle/g, "newReqStyles['new-request__section-title']");
c = c.replace(/styles\.section/g, "newReqStyles['new-request__section']");
c = c.replace(/styles\.grid/g, "newReqStyles['new-request__grid']");
c = c.replace(/styles\.fullCol/g, "newReqStyles['new-request__full']");
fs.writeFileSync('src/pages/FerryRequestPage/FerryRequestPage.tsx', c, 'utf-8');
