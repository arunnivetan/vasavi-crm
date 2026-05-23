import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Consistent Premium Corporate Palette
const COLORS = {
  NAVY_DARK: [11, 15, 25],      // Deep corporate navy
  GOLD_ACCENT: [218, 165, 32],   // #DAB920 - Premium gold
  ORANGE_ACCENT: [249, 115, 22], // #F97316 - Soft orange
  TEXT_DARK: [33, 43, 54],       // Off-black body text
  TEXT_MUTED: [108, 117, 125],   // Slate gray muted text
  BG_LIGHT: [248, 250, 252],     // Light gray background
  BORDER_GRAY: [226, 232, 240],  // Sleek border gray
  STATUS_GREEN: [16, 185, 129],  // Positive financial indicators
  STATUS_RED: [239, 68, 68],     // Warning outstanding indicators
  STATUS_YELLOW: [245, 158, 11]  // Neutral indicators
};

// Safe helper to obtain final Y-coordinate of table under various jspdf-autotable versions
const getLastY = (doc, fallback = 300) => {
  if (doc.lastAutoTable && typeof doc.lastAutoTable.finalY === 'number') {
    return doc.lastAutoTable.finalY;
  }
  if (doc.previousAutoTable && typeof doc.previousAutoTable.finalY === 'number') {
    return doc.previousAutoTable.finalY;
  }
  return fallback;
};

// Generic Page Header Helper matching Sri Vasavi Plywoods business credentials
const drawPDFHeader = (doc, title, docId = '', docDate = '') => {
  const pageCount = doc.internal.getNumberOfPages();
  const dateFormatted = docDate || new Date().toLocaleDateString('en-IN');
  const numberStr = docId || 'No: CRM-REP';
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Draw white header background block to clean margins (height capped at 76 to prevent clipping of text at Y=96)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 595.28, 76, 'F');
    
    // --- 1. CIRCULAR BLACK LOGO WITH GOLD SVP TEXT ---
    doc.setFillColor(11, 15, 25); // Dark Black/Navy
    doc.ellipse(55, 43, 22, 22, 'F');
    
    doc.setDrawColor(218, 165, 32); // Gold Ring
    doc.setLineWidth(1.2);
    doc.ellipse(55, 43, 19, 19, 'S');
    
    doc.setTextColor(218, 165, 32); // Gold Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SVP', 55, 48, { align: 'center' });
    
    doc.setFontSize(3.8);
    doc.setTextColor(255, 255, 255);
    doc.text('SRI VASAVI PLYWOOD', 55, 31, { align: 'center' });
    doc.text('SINCE 1997', 55, 57, { align: 'center' });
    
    // --- 2. CENTER CREDENTIALS (SRI VASAVI PLYWOODS) ---
    doc.setTextColor(11, 15, 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('SRI VASAVI PLYWOODS', 90, 36);
    
    doc.setTextColor(108, 117, 125);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GLASSWARES & HARDWARES', 90, 48);
    
    doc.setTextColor(108, 117, 125);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('M.R.V. Building, Poovalur Road, Lalgudi-621601', 90, 58);

    // --- 3. TOP RIGHT METADATA (GSTIN, CELL) ---
    doc.setTextColor(33, 43, 54);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('GSTIN: 33APXPS6615P1ZC', 565.28, 33, { align: 'right' });
    doc.text('CELL:9842438037', 565.28, 45, { align: 'right' });
    
    // --- 4. THIN GOLD DIVIDER LINE BELOW HEADER ---
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(1);
    doc.line(30, 76, 565.28, 76);
    
    // --- 5. PAGE NUMBER & TIMESTAMP FOOTER ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.TEXT_MUTED);
    doc.text(`Sri Vasavi Plywoods — Lalgudi`, 30, 820);
    doc.text(`${new Date().toLocaleDateString('en-IN')}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`, 565.28 - doc.getTextWidth(`${new Date().toLocaleDateString('en-IN')}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`), 820);
  }
};

// 1. Generate Combined All Customers Master Report (Clean ERP Portfolio Layout)
export const generateAllCustomersPDF = (customers, payments, stages, action = 'download') => {
  const doc = new jsPDF({ format: 'a4', unit: 'pt' });
  
  // Calculate aggregates
  const totalVal = customers.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.advancePaid || 0), 0);
  const totalPending = customers.reduce((sum, c) => sum + (c.pendingAmount || 0), 0);

  // Document Number & Date below gold line (Y coordinate increased to 102 to avoid clipping)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text('No: SVP/PORTFOLIO/MASTER', 30, 102);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 565.28, 102, { align: 'right' });

  // Title Section
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text('MASTER CLIENT PORTFOLIO SUMMARY', 30, 126);

  // Elegant Thick Gold Accent Divider below title
  doc.setFillColor(218, 165, 32);
  doc.rect(30, 134, 535.28, 3, 'F');

  // Rounded 3-Column Summary Card - Spaced and perfectly sized
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(1);
  doc.roundedRect(30, 150, 535.28, 72, 6, 6, 'FD');

  // Vertical Separator Lines inside card
  doc.line(205, 150, 205, 222);
  doc.line(385, 150, 385, 222);

  // Column 1: Total Revenue (No U+20B9 garbage characters, safe Rs. formatting)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('TOTAL REVENUE BOOKED', 117, 170, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(`Rs. ${totalVal.toLocaleString('en-IN')}`, 117, 196, { align: 'center' });

  // Column 2: Total Collections
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('TOTAL COLLECTIONS', 295, 170, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.STATUS_GREEN);
  doc.text(`Rs. ${totalPaid.toLocaleString('en-IN')}`, 295, 196, { align: 'center' });

  // Column 3: Outstanding Balance
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('OUTSTANDING BALANCE', 475, 170, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.STATUS_RED);
  doc.text(`Rs. ${totalPending.toLocaleString('en-IN')}`, 475, 196, { align: 'center' });

  // Draw 6-Column Portfolio Table exactly as requested
  const tableHeaders = [['Client Name', 'Project', 'Stage', 'Staff', 'Final Amount', 'Pending Balance']];
  const tableRows = customers.map(c => [
    c.customerName,
    c.projectType || 'Hardware',
    c.stage,
    c.assignedStaff || 'Unassigned',
    `Rs. ${(c.amount || 0).toLocaleString('en-IN')}`,
    `Rs. ${(c.pendingAmount || 0).toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableRows,
    startY: 238,
    margin: { left: 30, right: 30 },
    styles: {
      fontSize: 8,
      cellPadding: 6,
      textColor: COLORS.TEXT_DARK,
      lineColor: COLORS.BORDER_GRAY,
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: COLORS.TEXT_DARK,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 110 },
      1: { width: 100 },
      2: { width: 95 },
      3: { width: 80 },
      4: { width: 75, halign: 'right' },
      5: { width: 75, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [252, 253, 254]
    }
  });

  let currentY = getLastY(doc, 250) + 15;

  // Add Right-Aligned Total Summary Box
  if (currentY + 68 > 740) {
    doc.addPage();
    currentY = 100;
  }

  const calcX = 350;
  const calcW = 215.28;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(1);
  doc.roundedRect(calcX, currentY, calcW, 55, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('Grand Sales Total:', calcX + 12, currentY + 18);
  doc.text('Collections Credit:', calcX + 12, currentY + 32);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`Rs. ${totalVal.toLocaleString('en-IN')}`, 565.28 - 12, currentY + 18, { align: 'right' });
  doc.setTextColor(...COLORS.STATUS_GREEN);
  doc.text(`Rs. ${totalPaid.toLocaleString('en-IN')}`, 565.28 - 12, currentY + 32, { align: 'right' });

  doc.line(calcX, currentY + 38, 565.28, currentY + 38);
  doc.setTextColor(...COLORS.STATUS_RED);
  doc.setFontSize(9);
  doc.text('Net Balance Portfolio:', calcX + 12, currentY + 48);
  doc.text(`Rs. ${totalPending.toLocaleString('en-IN')}`, 565.28 - 12, currentY + 48, { align: 'right' });

  // Signature Section
  const sigY = currentY + 75;
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(0.8);
  doc.line(30, sigY + 35, 180, sigY + 35);
  doc.line(415, sigY + 35, 565, sigY + 35);
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text('Customer Signature', 105, sigY + 47, { align: 'center' });
  doc.text('Authorized Signature', 490, sigY + 47, { align: 'center' });

  // Footer business note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text('Thank you for your business!', 30, sigY + 62);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.setFontSize(7.5);
  doc.text('This document acts as an official portfolio ledger. Generated from Sri Vasavi Plywoods.', 30, sigY + 72);

  drawPDFHeader(doc, 'Master Portfolio Report', 'SVP-PORTFOLIO');
  
  if (action === 'print' || action === 'share') {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.location.href = doc.output('bloburl');
    } else {
      alert('Popup blocker active. Please allow popups to view the PDF report.');
    }
  } else {
    doc.save(`SriVasavi_Master_Customer_Report_${Date.now()}.pdf`);
  }
  return doc;
};

// 2. Generate Customer Comprehensive Profile Report
export const generateCustomerProfilePDF = (customer, notesList = [], activityList = [], customerImages = [], action = 'download') => {
  const doc = new jsPDF({ format: 'a4', unit: 'pt' });
  
  const profileId = `CL-${customer.id ? customer.id.split('_')[1] : 'FILE'}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`No: ${profileId}`, 30, 102);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 565.28, 102, { align: 'right' });

  // Title
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(`CLIENT DIRECTORY FILE: ${customer.customerName.toUpperCase()}`, 30, 126);

  // Thick Gold Divider
  doc.setFillColor(218, 165, 32);
  doc.rect(30, 134, 535.28, 3, 'F');

  // Customer Details Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('TO:', 30, 154);

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(String(customer.customerName || 'N/A'), 30, 168);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`Address: ${customer.address || 'Site address not specified.'}`, 30, 183);
  doc.text(`Mobile: ${customer.phone || 'N/A'}`, 30, 197);

  // Primary Metadata Columns
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('PROJECT CATEGORY:', 330, 154);
  doc.text('SALES EXECUTIVE:', 330, 168);
  doc.text('DEAL PRIORITY:', 330, 182);
  doc.text('PIPELINE STAGE:', 330, 196);

  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(String(customer.projectType || 'Plywood').toUpperCase(), 460, 154);
  doc.text(String(customer.assignedStaff || 'Unassigned'), 460, 168);
  doc.text(String(customer.priority || 'Medium').toUpperCase(), 460, 182);
  doc.text(String(customer.stage || 'New Lead').toUpperCase(), 460, 196);

  // Rounded 3-Column Summary Card (Safe Rs. formatting)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(1);
  doc.roundedRect(30, 212, 535.28, 72, 6, 6, 'FD');

  // Vertical Separators
  doc.line(205, 212, 205, 284);
  doc.line(385, 212, 385, 284);

  // Column 1: Material Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('TOTAL DEAL AMOUNT', 117, 232, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(`Rs. ${Number(customer.amount || 0).toLocaleString('en-IN')}`, 117, 258, { align: 'center' });

  // Column 2: Advance Collected
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('ADVANCE COLLECTED', 295, 232, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.STATUS_GREEN);
  doc.text(`Rs. ${Number(customer.advancePaid || 0).toLocaleString('en-IN')}`, 295, 258, { align: 'center' });

  // Column 3: Outstanding Balance
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('OUTSTANDING BALANCE', 475, 232, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.STATUS_RED);
  doc.text(`Rs. ${Number(customer.pendingAmount || 0).toLocaleString('en-IN')}`, 475, 258, { align: 'center' });

  // Project Materials / Specifications Table
  let currentY = 302;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text('PROJECT ESTIMATED MATERIALS & MODULES', 30, currentY);

  if (customer.items && Array.isArray(customer.items) && customer.items.length > 0) {
    const itemsHeaders = [['S.No', 'Product Material Description', 'Qty', 'Unit', 'Rate (Rs.)', 'GST %', 'Total Amount (Rs.)']];
    const itemsRows = customer.items.map((item, index) => [
      index + 1,
      item.productName + ((item.category || item.status) ? ` (${item.category} - ${item.status})` : ''),
      item.qty || 0,
      item.unit || 'Pcs',
      Number(item.rate || 0).toLocaleString('en-IN'),
      customer.taxPercent ? `${customer.taxPercent}%` : '18%',
      Number(item.total || 0).toLocaleString('en-IN')
    ]);
    
    autoTable(doc, {
      head: itemsHeaders,
      body: itemsRows,
      startY: currentY + 10,
      margin: { left: 30, right: 30 },
      styles: { fontSize: 8, cellPadding: 5.5, textColor: COLORS.TEXT_DARK, lineColor: COLORS.BORDER_GRAY, lineWidth: 0.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: COLORS.TEXT_DARK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      columnStyles: {
        0: { width: 30, halign: 'center' },
        1: { width: 205 },
        2: { width: 45, halign: 'center' },
        3: { width: 50, halign: 'center' },
        4: { width: 70, halign: 'right' },
        5: { width: 50, halign: 'center' },
        6: { width: 85, halign: 'right', fontStyle: 'bold' }
      }
    });
    
    currentY = getLastY(doc, currentY) + 25;
  } else {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.BORDER_GRAY);
    doc.roundedRect(30, currentY + 10, 535.28, 48, 4, 4, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.TEXT_DARK);
    const requirementLines = doc.splitTextToSize(customer.requirement || 'No detailed specifications entered.', 500);
    doc.text(requirementLines, 45, currentY + 28);
    currentY += 75;
  }

  // Right-aligned Financial calculations block
  if (currentY + 110 > 740) {
    doc.addPage();
    currentY = 100;
  }

  const calcX = 350;
  const calcW = 215.28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_MUTED);

  doc.text('Subtotal:', calcX, currentY);
  doc.text(`Discount (Less):`, calcX, currentY + 16);
  doc.text(`GST / SGST & CGST:`, calcX, currentY + 32);
  doc.text('Advance Collected (Less):', calcX, currentY + 48);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`Rs. ${Number(customer.subtotal || customer.amount || 0).toLocaleString('en-IN')}`, 565.28, currentY, { align: 'right' });
  doc.setTextColor(...COLORS.STATUS_RED);
  doc.text(`- Rs. ${Number(customer.discount || 0).toLocaleString('en-IN')}`, 565.28, currentY + 16, { align: 'right' });
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`+ Rs. ${Number(customer.taxAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 565.28, currentY + 32, { align: 'right' });
  doc.setTextColor(...COLORS.STATUS_GREEN);
  doc.text(`- Rs. ${Number(customer.advancePaid || 0).toLocaleString('en-IN')}`, 565.28, currentY + 48, { align: 'right' });

  // Final Balance Box
  doc.setFillColor(218, 165, 32, 0.08);
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(1);
  doc.roundedRect(calcX - 10, currentY + 58, calcW + 10, 26, 3, 3, 'FD');

  doc.setTextColor(218, 165, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('OUTSTANDING DUE:', calcX, currentY + 75);
  doc.setFontSize(11);
  doc.text(`Rs. ${Number(customer.pendingAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 565.28, currentY + 75, { align: 'right' });

  // Staff Notes Ledger
  currentY += 105;
  if (currentY + 100 > 740) {
    doc.addPage();
    currentY = 100;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text('CHRONOLOGICAL STAFF NOTES & INTERACTIONS', 30, currentY);

  if (!notesList || notesList.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.TEXT_MUTED);
    doc.text('No notes have been logged for this customer file.', 30, currentY + 15);
    currentY += 35;
  } else {
    const notesHeaders = [['Executive Staff', 'Date / Time', 'Note Details / Customer Feedback']];
    const notesRows = notesList.map(n => [
      n.addedBy || 'System',
      n.timestamp ? new Date(n.timestamp).toLocaleDateString('en-IN') + ' ' + new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      n.noteText || ''
    ]);

    autoTable(doc, {
      head: notesHeaders,
      body: notesRows,
      startY: currentY + 10,
      margin: { left: 30, right: 30 },
      styles: { fontSize: 7.5, cellPadding: 5, textColor: COLORS.TEXT_DARK, lineColor: COLORS.BORDER_GRAY, lineWidth: 0.5 },
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      columnStyles: {
        0: { fontStyle: 'bold', width: 90 },
        1: { width: 110 },
        2: { width: 335 }
      }
    });
    currentY = getLastY(doc, currentY) + 20;
  }

  // Appendix Grid Section for blueprint images
  if (customerImages && Array.isArray(customerImages) && customerImages.length > 0) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.NAVY_DARK);
    doc.text('BLUEPRINTS & SITE PHOTOS SPECIFICATIONS APPENDIX', 30, 115);
    
    let imgY = 130;
    let imgCol = 0;
    
    customerImages.forEach((img, idx) => {
      if (imgY + 185 > 780) {
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.NAVY_DARK);
        doc.text('BLUEPRINTS & SITE SPECIFICATIONS (CONTINUED)', 30, 115);
        imgY = 130;
        imgCol = 0;
      }
      
      const imgX = imgCol === 0 ? 30 : 305;
      const imgW = 260;
      const imgH = 150;
      
      doc.setFillColor(...COLORS.BG_LIGHT);
      doc.setDrawColor(...COLORS.BORDER_GRAY);
      doc.roundedRect(imgX, imgY, imgW, imgH + 25, 4, 4, 'FD');
      
      try {
        doc.addImage(img.imageUrl, 'JPEG', imgX + 5, imgY + 5, imgW - 10, imgH - 10);
      } catch (err) {
        doc.setFillColor(230, 235, 240);
        doc.rect(imgX + 5, imgY + 5, imgW - 10, imgH - 10, 'F');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.TEXT_MUTED);
        doc.text('[Blueprint/Image File Render]', imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
      }
      
      doc.setFillColor(...COLORS.NAVY_DARK);
      doc.rect(imgX + 5, imgY + imgH, imgW - 10, 20, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      const categoryTag = `[${img.imageType || 'File'}]`;
      const fn = img.fileName.length > 25 ? img.fileName.substring(0, 22) + '...' : img.fileName;
      doc.text(`${categoryTag} ${fn}`, imgX + 12, imgY + imgH + 13);
      
      if (imgCol === 0) {
        imgCol = 1;
      } else {
        imgCol = 0;
        imgY += imgH + 40;
      }
    });
  }

  // Signature Section at Bottom
  const finalY = Math.min(740, currentY + 30);
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(0.8);
  doc.line(30, finalY + 40, 180, finalY + 40);
  doc.line(415, finalY + 40, 565, finalY + 40);
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text('Customer Signature', 105, finalY + 52, { align: 'center' });
  doc.text('Authorized Signature', 490, finalY + 52, { align: 'center' });

  drawPDFHeader(doc, `Customer Profile: ${customer.customerName}`, profileId, new Date().toLocaleDateString('en-IN'));
  
  if (action === 'print' || action === 'share') {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.location.href = doc.output('bloburl');
    } else {
      alert('Popup blocker active. Please allow popups to view the PDF report.');
    }
  } else {
    doc.save(`CustomerProfile_${customer.customerName.replace(/\s+/g, '_')}.pdf`);
  }
  return doc;
};

// 3. Generate Invoice Document (Premium business invoicing format exactly like reference image)
export const generateInvoicePDF = (customer, paymentsList, action = 'download') => {
  const doc = new jsPDF({ format: 'a4', unit: 'pt' });

  const invoiceId = `INV-${Date.now().toString().substring(6)}`;

  // Document Number & Date below gold line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`No: ${invoiceId}`, 30, 102);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 565.28, 102, { align: 'right' });

  // TO Customer Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('TO:', 30, 122);

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(String(customer.customerName || 'N/A'), 30, 136);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(String(customer.address || 'Lalgudi'), 30, 151);
  doc.text(`Ph: ${customer.phone || 'N/A'}`, 30, 165);

  // Accent Gold thick separator below customer section
  doc.setFillColor(218, 165, 32);
  doc.rect(30, 176, 535.28, 3.2, 'F');

  // Rounded 3-Column Payment Summary Card exactly like reference image
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(1);
  doc.roundedRect(30, 190, 535.28, 72, 6, 6, 'FD');

  // Vertical Separators
  doc.line(205, 190, 205, 262);
  doc.line(385, 190, 385, 262);

  // Column 1: Total Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('TOTAL AMOUNT', 117, 210, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(`Rs. ${Number(customer.amount || 0).toLocaleString('en-IN')}`, 117, 236, { align: 'center' });

  // Column 2: Advance Paid
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('ADVANCE PAID', 295, 210, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.STATUS_GREEN);
  doc.text(`Rs. ${Number(customer.advancePaid || 0).toLocaleString('en-IN')}`, 295, 236, { align: 'center' });

  // Column 3: Pending Balance
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('PENDING BALANCE', 475, 210, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.STATUS_RED);
  doc.text(`Rs. ${Number(customer.pendingAmount || 0).toLocaleString('en-IN')}`, 475, 236, { align: 'center' });

  // Bottom row inside card: Payment Status badge
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.line(30, 262, 565.28, 262);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('Payment Status:', 45, 276);

  // Status Badge Pill
  const payStatus = customer.paymentStatus || 'Pending';
  const badgeBg = payStatus === 'Paid' ? [209, 250, 229] : payStatus === 'Partial' ? [254, 243, 199] : [254, 226, 226];
  const badgeTextCol = payStatus === 'Paid' ? [16, 185, 129] : payStatus === 'Partial' ? [217, 119, 6] : [239, 68, 68];
  
  doc.setFillColor(...badgeBg);
  doc.roundedRect(120, 267, 45, 13, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...badgeTextCol);
  doc.text(payStatus, 142.5, 276, { align: 'center' });

  // Divider below Payment Card
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(0.5);
  doc.line(30, 292, 565.28, 292);

  // Material / Product Table
  let startTableY = 304;
  const itemsHeaders = [['S.No', 'Product Name', 'Qty', 'Unit', 'Rate (Rs.)', 'GST', 'Amount (Rs.)']];
  
  const itemsRows = (customer.items && Array.isArray(customer.items) && customer.items.length > 0)
    ? customer.items.map((item, index) => [
        index + 1,
        item.productName + ((item.category) ? ` [${item.category}]` : ''),
        item.qty || 0,
        item.unit || 'Pcs',
        `Rs. ${Number(item.rate || 0).toLocaleString('en-IN')}`,
        customer.taxPercent ? `${customer.taxPercent}%` : '18%',
        `Rs. ${Number(item.total || 0).toLocaleString('en-IN')}`
      ])
    : [
        [
          1,
          customer.requirement || 'Standard hardware / plywood order items',
          1,
          'Lot',
          `Rs. ${Number(customer.amount || 0).toLocaleString('en-IN')}`,
          '18%',
          `Rs. ${Number(customer.amount || 0).toLocaleString('en-IN')}`
        ]
      ];

  autoTable(doc, {
    head: itemsHeaders,
    body: itemsRows,
    startY: startTableY,
    margin: { left: 30, right: 30 },
    styles: { fontSize: 8, cellPadding: 5.5, textColor: COLORS.TEXT_DARK, lineColor: COLORS.BORDER_GRAY, lineWidth: 0.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: COLORS.TEXT_DARK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 253, 254] },
    columnStyles: {
      0: { width: 35, halign: 'center' },
      1: { width: 215 },
      2: { width: 45, halign: 'center' },
      3: { width: 50, halign: 'center' },
      4: { width: 75, halign: 'right' },
      5: { width: 45, halign: 'center' },
      6: { width: 70, halign: 'right', fontStyle: 'bold' }
    }
  });

  let currentY = getLastY(doc, startTableY) + 20;

  // Right Aligned Total Calculation Section
  if (currentY + 110 > 740) {
    doc.addPage();
    currentY = 100;
  }

  const calcX = 350;
  const calcW = 215.28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_MUTED);

  doc.text('Subtotal:', calcX, currentY);
  doc.text(`Discount (Less):`, calcX, currentY + 16);
  doc.text(`GST Amount:`, calcX, currentY + 32);
  doc.text('Advance Collected:', calcX, currentY + 48);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`Rs. ${Number(customer.subtotal || customer.amount || 0).toLocaleString('en-IN')}`, 565.28, currentY, { align: 'right' });
  doc.setTextColor(...COLORS.STATUS_RED);
  doc.text(`- Rs. ${Number(customer.discount || 0).toLocaleString('en-IN')}`, 565.28, currentY + 16, { align: 'right' });
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`+ Rs. ${Number(customer.taxAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 565.28, currentY + 32, { align: 'right' });
  doc.setTextColor(...COLORS.STATUS_GREEN);
  doc.text(`- Rs. ${Number(customer.advancePaid || 0).toLocaleString('en-IN')}`, 565.28, currentY + 48, { align: 'right' });

  // Final Total Highlight Card
  doc.setFillColor(218, 165, 32, 0.08);
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(1);
  doc.roundedRect(calcX - 10, currentY + 58, calcW + 10, 26, 3, 3, 'FD');

  doc.setTextColor(218, 165, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('BALANCE DUE:', calcX, currentY + 75);
  doc.setFontSize(11);
  doc.text(`Rs. ${Number(customer.pendingAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 565.28, currentY + 75, { align: 'right' });

  // Signature lines
  const sigY = currentY + 105;
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(0.8);
  doc.line(30, sigY + 40, 180, sigY + 40);
  doc.line(415, sigY + 40, 565, sigY + 40);
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text('Customer Signature', 105, sigY + 52, { align: 'center' });
  doc.text('Authorized Signature', 490, sigY + 52, { align: 'center' });

  // Footer business note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text('Thank you for your business!', 30, sigY + 68);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.setFontSize(7.5);
  doc.text('This is a system-generated document. For Sri Vasavi Plywoods.', 30, sigY + 78);

  // Draw Header
  drawPDFHeader(doc, 'Sales Tax Invoice', invoiceId, new Date().toLocaleDateString('en-IN'));
  
  if (action === 'print' || action === 'share') {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.location.href = doc.output('bloburl');
    } else {
      alert('Popup blocker active. Please allow popups to view the PDF report.');
    }
  } else {
    doc.save(`Invoice_${customer.customerName.replace(/\s+/g, '_')}.pdf`);
  }
  return doc;
};

// 4. Generate Quotation Estimate
export const generateQuotationPDF = (customer, action = 'download') => {
  const doc = new jsPDF({ format: 'a4', unit: 'pt' });

  const quotationId = `QT-${Date.now().toString().substring(6)}`;

  // Document Number & Date below gold line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`No: ${quotationId}`, 30, 102);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 565.28, 102, { align: 'right' });

  // TO Customer Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('TO:', 30, 120);

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(String(customer.customerName || 'N/A'), 30, 134);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(String(customer.address || 'Lalgudi'), 30, 149);
  doc.text(`Ph: ${customer.phone || 'N/A'}`, 30, 163);

  // Accent Gold thick separator below customer section
  doc.setFillColor(218, 165, 32);
  doc.rect(30, 174, 535.28, 3.2, 'F');

  // Rounded 3-Column Payment Summary Card exactly like reference image
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(1);
  doc.roundedRect(30, 188, 535.28, 72, 6, 6, 'FD');

  // Vertical Separators
  doc.line(205, 188, 205, 260);
  doc.line(385, 188, 385, 260);

  // Column 1: Estimated Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('ESTIMATED TOTAL', 117, 208, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(`Rs. ${Number(customer.amount || 0).toLocaleString('en-IN')}`, 117, 234, { align: 'center' });

  // Column 2: Estimate Validity
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('QUOTE VALIDITY', 295, 208, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.STATUS_GREEN);
  doc.text('15 DAYS', 295, 234, { align: 'center' });

  // Column 3: Net Balance Due
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('NET BALANCE DUE', 475, 208, { align: 'center' });
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.STATUS_RED);
  doc.text(`Rs. ${Number(customer.pendingAmount || 0).toLocaleString('en-IN')}`, 475, 234, { align: 'center' });

  // Bottom row inside card: Payment Status badge
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.line(30, 260, 565.28, 260);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.text('Quotation Status:', 45, 274);

  // Status Badge Pill
  doc.setFillColor(254, 243, 199); // Yellow/Amber background
  doc.roundedRect(120, 265, 55, 13, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(217, 119, 6);
  doc.text('ESTIMATE', 147.5, 274, { align: 'center' });

  // Divider below Card
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(0.5);
  doc.line(30, 290, 565.28, 290);

  // Material / Product Table
  let startTableY = 302;
  const itemsHeaders = [['S.No', 'Product Name', 'Qty', 'Unit', 'Rate (Rs.)', 'GST', 'Amount (Rs.)']];
  
  const itemsRows = (customer.items && Array.isArray(customer.items) && customer.items.length > 0)
    ? customer.items.map((item, index) => [
        index + 1,
        item.productName + ((item.category) ? ` [${item.category}]` : ''),
        item.qty || 0,
        item.unit || 'Pcs',
        `Rs. ${Number(item.rate || 0).toLocaleString('en-IN')}`,
        customer.taxPercent ? `${customer.taxPercent}%` : '18%',
        `Rs. ${Number(item.total || 0).toLocaleString('en-IN')}`
      ])
    : [
        [
          1,
          customer.requirement || 'Standard design layout specs',
          1,
          'Lot',
          `Rs. ${Number(customer.amount || 0).toLocaleString('en-IN')}`,
          '18%',
          `Rs. ${Number(customer.amount || 0).toLocaleString('en-IN')}`
        ]
      ];

  autoTable(doc, {
    head: itemsHeaders,
    body: itemsRows,
    startY: startTableY,
    margin: { left: 30, right: 30 },
    styles: { fontSize: 8, cellPadding: 5.5, textColor: COLORS.TEXT_DARK, lineColor: COLORS.BORDER_GRAY, lineWidth: 0.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: COLORS.TEXT_DARK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 253, 254] },
    columnStyles: {
      0: { width: 35, halign: 'center' },
      1: { width: 215 },
      2: { width: 45, halign: 'center' },
      3: { width: 50, halign: 'center' },
      4: { width: 75, halign: 'right' },
      5: { width: 45, halign: 'center' },
      6: { width: 70, halign: 'right', fontStyle: 'bold' }
    }
  });

  let currentY = getLastY(doc, startTableY) + 20;

  // Right Aligned Total Calculation Section
  if (currentY + 110 > 740) {
    doc.addPage();
    currentY = 100;
  }

  const calcX = 350;
  const calcW = 215.28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_MUTED);

  doc.text('Subtotal:', calcX, currentY);
  doc.text(`Discount (Less):`, calcX, currentY + 16);
  doc.text(`Estimated GST:`, calcX, currentY + 32);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`Rs. ${Number(customer.subtotal || customer.amount || 0).toLocaleString('en-IN')}`, 565.28, currentY, { align: 'right' });
  doc.setTextColor(...COLORS.STATUS_RED);
  doc.text(`- Rs. ${Number(customer.discount || 0).toLocaleString('en-IN')}`, 565.28, currentY + 16, { align: 'right' });
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`+ Rs. ${Number(customer.taxAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 565.28, currentY + 32, { align: 'right' });

  // Final Total Highlight Card
  doc.setFillColor(218, 165, 32, 0.08);
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(1);
  doc.roundedRect(calcX - 10, currentY + 42, calcW + 10, 26, 3, 3, 'FD');

  doc.setTextColor(218, 165, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL ESTIMATE:', calcX, currentY + 59);
  doc.setFontSize(11);
  doc.text(`Rs. ${Number(customer.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 565.28, currentY + 59, { align: 'right' });

  // Signature lines
  const sigY = currentY + 90;
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(0.8);
  doc.line(30, sigY + 40, 180, sigY + 40);
  doc.line(415, sigY + 40, 565, sigY + 40);
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text('Customer Signature', 105, sigY + 52, { align: 'center' });
  doc.text('Authorized Signature', 490, sigY + 52, { align: 'center' });

  // Footer business note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text('Subject to Sri Vasavi Plywoods Standard Commercial Terms.', 30, sigY + 68);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.TEXT_MUTED);
  doc.setFontSize(7.5);
  doc.text('This is a formal quotation estimation for materials and labor. Valid for 15 days.', 30, sigY + 78);

  // Draw Header
  drawPDFHeader(doc, 'Commercial Quotation', quotationId, new Date().toLocaleDateString('en-IN'));
  
  if (action === 'print' || action === 'share') {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.location.href = doc.output('bloburl');
    } else {
      alert('Popup blocker active. Please allow popups to view the PDF report.');
    }
  } else {
    doc.save(`Quotation_${customer.customerName.replace(/\s+/g, '_')}.pdf`);
  }
  return doc;
};

// 5. Generate Permanent Activity History PDF
export const generateCustomerHistoryPDF = (customer, activityList, action = 'download') => {
  const doc = new jsPDF({ format: 'a4', unit: 'pt' });

  const historyId = `REP-HIST-${customer.id ? customer.id.split('_')[1] : 'FILE'}`;

  // Document Number & Date below gold line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text(`No: ${historyId}`, 30, 102);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 565.28, 102, { align: 'right' });

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text(`PERMANENT AUDIT TRAIL LOG: ${customer.customerName.toUpperCase()}`, 30, 120);

  // Thick Gold Divider
  doc.setFillColor(218, 165, 32);
  doc.rect(30, 128, 535.28, 3, 'F');

  const historyHeaders = [['Timestamp', 'Action Type', 'Executive Staff', 'Description of Changes / Values']];
  const historyRows = (activityList || []).map(act => [
    act.timestamp ? new Date(act.timestamp).toLocaleDateString('en-IN') : 'N/A',
    String(act.actionType || 'Action').toUpperCase().replace(/_/g, ' '),
    String(act.updatedBy || 'System'),
    `From: "${act.oldValue || 'None'}" -> To: "${act.newValue || 'None'}"`
  ]);

  if (historyRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.TEXT_MUTED);
    doc.text('No activity items are logged for this customer.', 30, 145);
  } else {
    autoTable(doc, {
      head: historyHeaders,
      body: historyRows,
      startY: 145,
      margin: { left: 30, right: 30 },
      styles: { fontSize: 8, cellPadding: 5.5, textColor: COLORS.TEXT_DARK, lineColor: COLORS.BORDER_GRAY, lineWidth: 0.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: COLORS.TEXT_DARK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      columnStyles: {
        0: { width: 110 },
        1: { fontStyle: 'bold', width: 95 },
        2: { width: 75 },
        3: { width: 255 }
      }
    });
  }

  // Signatures at bottom
  const finalY = Math.min(740, getLastY(doc, 200) + 40);
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(0.8);
  doc.line(30, finalY + 40, 180, finalY + 40);
  doc.line(415, finalY + 40, 565, finalY + 40);
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text('Audited By', 105, finalY + 52, { align: 'center' });
  doc.text('Management Signature', 490, finalY + 52, { align: 'center' });

  drawPDFHeader(doc, 'Permanent Activity Log', historyId, new Date().toLocaleDateString('en-IN'));
  
  if (action === 'print' || action === 'share') {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.location.href = doc.output('bloburl');
    } else {
      alert('Popup blocker active. Please allow popups to view the PDF report.');
    }
  } else {
    doc.save(`ActivityLog_${customer.customerName.replace(/\s+/g, '_')}.pdf`);
  }
  return doc;
};

// 6. Generate Follow-up and Pending Reminders PDF Report
export const generateFollowupReportPDF = (customers, reminders, action = 'download') => {
  const doc = new jsPDF({ format: 'a4', unit: 'pt' });

  // Document Number & Date below gold line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text('No: SVP-REMINDERS/LATEST', 30, 102);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 565.28, 102, { align: 'right' });

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.NAVY_DARK);
  doc.text('OVERDUE & SCHEDULED FOLLOW-UPS LEDGER', 30, 120);

  // Thick Gold Divider
  doc.setFillColor(218, 165, 32);
  doc.rect(30, 128, 535.28, 3, 'F');

  const followHeaders = [['Customer Name', 'Phone', 'Reminder Type', 'Scheduled Target', 'Status', 'Notes']];
  
  const sortedReminders = [...reminders].sort((a, b) => new Date(a.reminderDate) - new Date(b.reminderDate));
  
  const followRows = sortedReminders.map(r => {
    const customer = customers.find(c => c.id === r.customerId) || { customerName: 'Unknown', phone: 'N/A' };
    return [
      customer.customerName,
      customer.phone,
      r.reminderType,
      new Date(r.reminderDate).toLocaleDateString('en-IN') + ' ' + new Date(r.reminderDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      r.status,
      r.notes || '—'
    ];
  });

  if (followRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.TEXT_MUTED);
    doc.text('There are currently no reminders scheduled in the system.', 30, 145);
  } else {
    autoTable(doc, {
      head: followHeaders,
      body: followRows,
      startY: 145,
      margin: { left: 30, right: 30 },
      styles: { fontSize: 8, cellPadding: 5.5, textColor: COLORS.TEXT_DARK, lineColor: COLORS.BORDER_GRAY, lineWidth: 0.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: COLORS.TEXT_DARK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      columnStyles: {
        0: { fontStyle: 'bold', width: 110 },
        1: { width: 75 },
        2: { width: 90 },
        3: { width: 110 },
        4: { width: 65, fontStyle: 'bold' },
        5: { width: 85 }
      }
    });
  }

  // Signatures at bottom
  const finalY = Math.min(740, getLastY(doc, 200) + 40);
  doc.setDrawColor(...COLORS.BORDER_GRAY);
  doc.setLineWidth(0.8);
  doc.line(30, finalY + 40, 180, finalY + 40);
  doc.line(415, finalY + 40, 565, finalY + 40);
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text('Representative Signature', 105, finalY + 52, { align: 'center' });
  doc.text('Management Verified', 490, finalY + 52, { align: 'center' });

  drawPDFHeader(doc, 'Follow-up Reminders Report', 'REP-REMINDERS', new Date().toLocaleDateString('en-IN'));
  
  if (action === 'print' || action === 'share') {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.location.href = doc.output('bloburl');
    } else {
      alert('Popup blocker active. Please allow popups to view the PDF report.');
    }
  } else {
    doc.save(`Followups_Report_${Date.now()}.pdf`);
  }
  return doc;
};
