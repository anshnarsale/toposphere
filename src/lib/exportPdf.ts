import { jsPDF } from 'jspdf';
import type { NetworkTopology } from '@/types/network';

interface PdfExportOptions {
  projectName: string;
  topology: NetworkTopology;
  layout: Record<string, { x: number; y: number }>;
}

export function exportTopologyPdf({ projectName, topology, layout }: PdfExportOptions): void {
  // Landscape A4 document: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background dark gradient / header
  doc.setFillColor(13, 17, 23); // #0d1117
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top Banner
  doc.setFillColor(22, 27, 34); // #161b22
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setDrawColor(48, 54, 61); // #30363d
  doc.line(0, 24, pageWidth, 24);

  // Logo & Title
  doc.setFillColor(31, 111, 235); // #1f6feb
  doc.roundedRect(12, 5, 14, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TS', 16, 14);

  doc.setTextColor(230, 237, 243); // #e6edf3
  doc.setFontSize(14);
  doc.text('TopoSphere', 30, 12);
  doc.setTextColor(88, 166, 255); // #58a6ff
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Next-Gen Network Topology Architecture Report', 30, 18);

  // Project Meta
  doc.setTextColor(139, 148, 158); // #8b949e
  doc.setFontSize(9);
  doc.text(`Lab: ${projectName}`, pageWidth - 90, 11);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 90, 17);

  // SECTION 1: TOPOLOGY SCENE MAP (Canvas Diagram)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(88, 166, 255);
  doc.text('1. TOPOLOGY SCENE MAP', 12, 33);

  const canvasX = 12;
  const canvasY = 36;
  const canvasW = pageWidth - 24;
  const canvasH = 95;

  // Canvas container box
  doc.setFillColor(18, 22, 28);
  doc.roundedRect(canvasX, canvasY, canvasW, canvasH, 3, 3, 'F');
  doc.setDrawColor(48, 54, 61);
  doc.roundedRect(canvasX, canvasY, canvasW, canvasH, 3, 3, 'S');

  // Compute bounding box of devices to scale and fit inside canvas area
  const devices = Object.values(topology.devices);
  const links = Object.values(topology.links);

  if (devices.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    devices.forEach((d, idx) => {
      const pos = layout[d.id] || { x: 100 + (idx % 4) * 180, y: 80 + Math.floor(idx / 4) * 120 };
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + 120);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + 80);
    });

    const spanX = Math.max(maxX - minX, 200);
    const spanY = Math.max(maxY - minY, 150);

    const pad = 16;
    const scale = Math.min((canvasW - pad * 2) / spanX, (canvasH - pad * 2) / spanY, 0.45);

    const mapCoord = (x: number, y: number) => ({
      x: canvasX + pad + (x - minX) * scale,
      y: canvasY + pad + (y - minY) * scale,
    });

    // Draw Links first
    doc.setLineWidth(0.6);
    links.forEach((l) => {
      const sPos = layout[l.sourceDeviceId] || { x: 100, y: 100 };
      const tPos = layout[l.targetDeviceId] || { x: 300, y: 100 };
      const p1 = mapCoord(sPos.x + 50, sPos.y + 30);
      const p2 = mapCoord(tPos.x + 50, tPos.y + 30);

      doc.setDrawColor(63, 185, 80); // green operational
      doc.line(p1.x, p1.y, p2.x, p2.y);

      // Link interface labels
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(139, 148, 158);
      const srcIface = topology.devices[l.sourceDeviceId]?.interfaces[l.sourceInterfaceId]?.shortName || '';
      const tgtIface = topology.devices[l.targetDeviceId]?.interfaces[l.targetInterfaceId]?.shortName || '';
      
      const midX1 = p1.x + (p2.x - p1.x) * 0.25;
      const midY1 = p1.y + (p2.y - p1.y) * 0.25;
      const midX2 = p1.x + (p2.x - p1.x) * 0.75;
      const midY2 = p1.y + (p2.y - p1.y) * 0.75;

      doc.text(srcIface, midX1, midY1 - 1);
      doc.text(tgtIface, midX2, midY2 - 1);
    });

    // Draw Devices
    devices.forEach((d, idx) => {
      const pos = layout[d.id] || { x: 100 + (idx % 4) * 180, y: 80 + Math.floor(idx / 4) * 120 };
      const p = mapCoord(pos.x, pos.y);
      const nodeW = 28;
      const nodeH = 18;

      // Device Box
      doc.setFillColor(22, 27, 34);
      doc.setDrawColor(88, 166, 255);
      doc.setLineWidth(0.4);
      doc.roundedRect(p.x, p.y, nodeW, nodeH, 1.5, 1.5, 'FD');

      // Status LED
      doc.setFillColor(63, 185, 80);
      doc.circle(p.x + nodeW - 3, p.y + 3, 1, 'F');

      // Device Hostname
      doc.setTextColor(230, 237, 243);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(d.hostname, p.x + nodeW / 2, p.y + 7, { align: 'center' });

      // Device Model / Type
      doc.setTextColor(139, 148, 158);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(d.model.slice(0, 16), p.x + nodeW / 2, p.y + 11, { align: 'center' });

      // Primary IP
      const primaryIp = Object.values(d.interfaces).find((i) => i.ipv4?.address)?.ipv4?.address;
      if (primaryIp) {
        doc.setTextColor(88, 166, 255);
        doc.setFontSize(5.5);
        doc.text(primaryIp, p.x + nodeW / 2, p.y + 15, { align: 'center' });
      }
    });
  }

  // SECTION 2: IP ADDRESS & INTERFACE ALLOCATION TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(88, 166, 255);
  doc.text('2. IP ADDRESSING & INTERFACE ALLOCATION TABLE', 12, 137);

  const tableX = 12;
  let tableY = 141;

  // Table Header
  doc.setFillColor(33, 38, 45);
  doc.rect(tableX, tableY, canvasW, 6, 'F');
  doc.setDrawColor(48, 54, 61);
  doc.rect(tableX, tableY, canvasW, 6, 'S');

  doc.setTextColor(230, 237, 243);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Device Hostname', tableX + 3, tableY + 4.2);
  doc.text('Interface', tableX + 38, tableY + 4.2);
  doc.text('IP Address / Mask', tableX + 75, tableY + 4.2);
  doc.text('Default Gateway', tableX + 120, tableY + 4.2);
  doc.text('MAC Address', tableX + 160, tableY + 4.2);
  doc.text('VLAN Mode', tableX + 205, tableY + 4.2);
  doc.text('Status', tableX + 245, tableY + 4.2);

  tableY += 6;

  // Flatten interface entries
  const rows: Array<{
    devName: string;
    ifaceName: string;
    ipMask: string;
    gateway: string;
    mac: string;
    vlan: string;
    status: string;
  }> = [];

  devices.forEach((dev) => {
    Object.values(dev.interfaces).forEach((i) => {
      if (i.ipv4?.address || i.linkedTo || i.adminState === 'up') {
        rows.push({
          devName: dev.hostname,
          ifaceName: i.name,
          ipMask: i.ipv4 ? `${i.ipv4.address}/${i.ipv4.prefixLength}` : 'Unassigned',
          gateway: i.ipv4?.gateway || 'None',
          mac: i.mac,
          vlan: i.vlanMode === 'trunk' ? 'Trunk (802.1Q)' : `Access (VLAN ${i.accessVlan})`,
          status: i.operState.toUpperCase(),
        });
      }
    });
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  rows.slice(0, 11).forEach((r, idx) => {
    const rowBg = idx % 2 === 0 ? 16 : 22;
    doc.setFillColor(rowBg, rowBg + 4, rowBg + 10);
    doc.rect(tableX, tableY, canvasW, 5.2, 'F');
    doc.setDrawColor(33, 38, 45);
    doc.rect(tableX, tableY, canvasW, 5.2, 'S');

    doc.setTextColor(230, 237, 243);
    doc.text(r.devName, tableX + 3, tableY + 3.8);
    doc.text(r.ifaceName, tableX + 38, tableY + 3.8);

    doc.setTextColor(r.ipMask === 'Unassigned' ? 139 : 88, r.ipMask === 'Unassigned' ? 148 : 166, r.ipMask === 'Unassigned' ? 158 : 255);
    doc.text(r.ipMask, tableX + 75, tableY + 3.8);

    doc.setTextColor(139, 148, 158);
    doc.text(r.gateway, tableX + 120, tableY + 3.8);
    doc.text(r.mac, tableX + 160, tableY + 3.8);
    doc.text(r.vlan, tableX + 205, tableY + 3.8);

    doc.setTextColor(r.status === 'UP' ? 63 : 218, r.status === 'UP' ? 185 : 54, r.status === 'UP' ? 80 : 51);
    doc.text(r.status, tableX + 245, tableY + 3.8);

    tableY += 5.2;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(139, 148, 158);
  doc.text('TopoSphere Virtual Network Engineering Suite • Confidential & Proprietary', 12, pageHeight - 5);
  doc.text('Page 1 of 1', pageWidth - 25, pageHeight - 5);

  // Download PDF
  const cleanName = projectName.toLowerCase().replace(/\s+/g, '-');
  doc.save(`${cleanName}-toposphere.pdf`);
}

