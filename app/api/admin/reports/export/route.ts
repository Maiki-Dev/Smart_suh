import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import {
  getFinancialReport,
  getPaymentMethodReport,
  getVehicleReport,
  getMaintenanceReport,
  getResidentReport,
  type ReportFilters,
} from '@/lib/queries/reports';
import { formatMNT, maintenanceCategoryLabel, paymentMethodLabel } from '@/lib/admin/format';

const VALID_TYPES = ['financial', 'payment-methods', 'vehicles', 'maintenance', 'residents'] as const;
const VALID_FORMATS = ['csv', 'excel', 'pdf'] as const;

type ReportType = (typeof VALID_TYPES)[number];
type ExportFormat = (typeof VALID_FORMATS)[number];

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

async function fetchReportData(type: ReportType, filters: ReportFilters) {
  switch (type) {
    case 'financial':
      return getFinancialReport(filters);
    case 'payment-methods':
      return getPaymentMethodReport(filters);
    case 'vehicles':
      return getVehicleReport(filters);
    case 'maintenance':
      return getMaintenanceReport(filters);
    case 'residents':
      return getResidentReport(filters);
  }
}

function reportToRows(type: ReportType, data: Awaited<ReturnType<typeof fetchReportData>>): string[][] {
  switch (type) {
    case 'financial': {
      const d = data as Awaited<ReturnType<typeof getFinancialReport>>;
      const rows: string[][] = [
        ['Төрөл', 'Утга'],
        ['Нэхэмжлэсэн', formatMNT(d.total_invoiced)],
        ['Төлсөн', formatMNT(d.total_paid)],
        ['Үлдэгдэл', formatMNT(d.total_outstanding)],
        ['Төлсөн орон сууц', String(d.paid_apartments)],
        ['Төлөөгүй орон сууц', String(d.unpaid_apartments)],
        ['Хугацаа хэтэрсэн', String(d.overdue_invoices)],
        [],
        ['Сар', 'Орлого'],
        ...d.monthly_income.map((m) => [m.label, formatMNT(m.amount)]),
      ];
      return rows;
    }
    case 'payment-methods': {
      const d = data as Awaited<ReturnType<typeof getPaymentMethodReport>>;
      return [
        ['Төлбөрийн хэлбэр', 'Дүн', 'Тоо'],
        ...d.methods.map((m) => [
          paymentMethodLabel(m.method),
          formatMNT(m.amount),
          String(m.count),
        ]),
      ];
    }
    case 'vehicles': {
      const d = data as Awaited<ReturnType<typeof getVehicleReport>>;
      return [
        ['Үзүүлэлт', 'Тоо'],
        ['Нийт', String(d.total)],
        ['Идэвхтэй', String(d.active)],
        ['Идэвхгүй', String(d.disabled)],
        ['Төлбөргүйгээс', String(d.disabled_unpaid)],
        ['Гараар идэвхгүй', String(d.disabled_manual)],
      ];
    }
    case 'maintenance': {
      const d = data as Awaited<ReturnType<typeof getMaintenanceReport>>;
      const rows: string[][] = [
        ['Үзүүлэлт', 'Тоо'],
        ['Нийт', String(d.total)],
        ['Нээлттэй', String(d.open)],
        ['Явцад', String(d.in_progress)],
        ['Дууссан', String(d.completed)],
        ['Цуцлагдсан', String(d.cancelled)],
      ];
      if (d.avg_resolution_hours != null) {
        rows.push(['Дундаж шийдвэрлэлт (цаг)', d.avg_resolution_hours.toFixed(1)]);
      }
      if (d.by_category.length > 0) {
        rows.push([]);
        rows.push(['Ангилал', 'Тоо']);
        for (const c of d.by_category) {
          rows.push([maintenanceCategoryLabel(c.category), String(c.count)]);
        }
      }
      return rows;
    }
    case 'residents': {
      const d = data as Awaited<ReturnType<typeof getResidentReport>>;
      return [
        ['Үзүүлэлт', 'Тоо'],
        ['Нийт', String(d.total)],
        ['Идэвхтэй', String(d.active)],
        ['Идэвхгүй', String(d.inactive)],
        ['Эзэмшигч', String(d.owners)],
        ['Түр оршин суугч', String(d.tenants)],
      ];
    }
  }
}

async function buildPdfBuffer(title: string, rows: string[][]): Promise<Uint8Array | null> {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    let y = 32;
    for (const row of rows) {
      const line = row.join(' | ');
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 7;
    }
    return new Uint8Array(doc.output('arraybuffer'));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await requireAdminRole();
    const orgScope = getScopedOrganizationId(ctx);
    const orgId = orgScope ?? ctx.user.organization_id;

    const url = new URL(request.url);
    const type = url.searchParams.get('type') as ReportType | null;
    const format = (url.searchParams.get('format') ?? 'csv') as ExportFormat;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Буруу тайлангийн төрөл' }, { status: 400 });
    }
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json({ error: 'Буруу формат' }, { status: 400 });
    }

    const filters: ReportFilters = {
      organizationId: orgId,
      buildingId: url.searchParams.get('building') || undefined,
      tower: url.searchParams.get('tower') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
    };

    const data = await fetchReportData(type, filters);
    const rows = reportToRows(type, data);
    const csv = rowsToCsv(rows);
    const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'pdf') {
      const pdfBuffer = await buildPdfBuffer(`Тайлан: ${type}`, rows);
      if (pdfBuffer) {
        return new NextResponse(Buffer.from(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}.pdf"`,
          },
        });
      }
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === 'excel') {
      try {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Тайлан');
        for (const row of rows) {
          sheet.addRow(row);
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
          },
        });
      } catch {
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.xls"`,
          },
        });
      }
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Алдаа гарлаа' },
      { status: 500 },
    );
  }
}
