import React, { useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToPdf } from '../../../utils/pdfExport';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

const RekapLemburTable = ({ data, month, year }) => {
  const componentRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const totalNetPay = data.reduce((acc, curr) => acc + (curr.netPay || 0), 0);
  const totalGross = data.reduce((acc, curr) => acc + (curr.totalGross || 0), 0);
  const totalTax = data.reduce((acc, curr) => acc + (curr.tax || 0), 0);
  const totalMeal = data.reduce((acc, curr) => acc + (curr.mealAllowance || 0), 0);
  const totalHours = data.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);

  const handleExportPDF = async () => {
    if (!componentRef.current) return;
    setExporting(true);
    try {
      await exportToPdf(
        componentRef.current, 
        `Rekap_Lembur_${month}_${year}`,
        { margin: [10, 10, 10, 10] }
      );
      toast.success('PDF berhasil diexport');
    } catch (error) {
      toast.error('Gagal mengexport PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = data.map((row, idx) => ({
      'No': idx + 1,
      'Nama Pegawai': row.name,
      'Tipe': row.type,
      'Golongan': row.grade || '-',
      'Jam Lembur': row.totalHours,
      'Rate/Jam': row.rate,
      'Uang Makan': row.mealAllowance || 0,
      'Bruto': row.totalGross,
      'Pajak': row.tax,
      'Netto': row.netPay
    }));

    // Add totals row
    exportData.push({
      'No': '',
      'Nama Pegawai': 'TOTAL',
      'Tipe': '',
      'Golongan': '',
      'Jam Lembur': totalHours,
      'Rate/Jam': '',
      'Uang Makan': totalMeal,
      'Bruto': totalGross,
      'Pajak': totalTax,
      'Netto': totalNetPay
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Lembur');
    XLSX.writeFile(wb, `Rekap_Lembur_Pegawai_${month}_${year}.xlsx`);
  };

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const monthName = monthNames[parseInt(month) - 1] || '';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rekapitulasi Lembur Bulanan</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-green-700 border-green-600 hover:bg-green-50">
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button size="sm" onClick={handlePrint} className="bg-slate-800 text-white hover:bg-slate-700">
            <Printer className="w-4 h-4 mr-2" /> Cetak
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={componentRef} className="rounded-md border print:border-0">
          {/* Print Header */}
          <div className="text-center mb-4 print:block hidden p-4">
            <div className="font-bold text-lg">REKAPITULASI LEMBUR PER PEGAWAI</div>
            <div className="text-sm">Bulan {monthName} {year}</div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="print:text-xs">Nama Pegawai</TableHead>
                <TableHead className="print:text-xs">Tipe</TableHead>
                <TableHead className="text-right print:text-xs">Jam Lembur</TableHead>
                <TableHead className="text-right print:text-xs">Rate/Jam</TableHead>
                <TableHead className="text-right print:text-xs">Uang Makan</TableHead>
                <TableHead className="text-right print:text-xs">Bruto</TableHead>
                <TableHead className="text-right print:text-xs">Pajak</TableHead>
                <TableHead className="text-right font-bold print:text-xs">Netto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-slate-500">
                        Belum ada data rekapitulasi untuk bulan ini.
                    </TableCell>
                 </TableRow>
              ) : (
                data.map((row) => (
                    <TableRow key={row.id}>
                    <TableCell className="font-medium print:text-xs">{row.name}</TableCell>
                    <TableCell className="print:text-xs">
                        <span className={`px-2 py-1 rounded-full text-xs print:px-1 print:py-0.5 ${
                            row.type === 'ASN' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                            {row.type} - {row.grade}
                        </span>
                    </TableCell>
                    <TableCell className="text-right print:text-xs">{row.totalHours} Jam</TableCell>
                    <TableCell className="text-right print:text-xs">{formatCurrency(row.rate)}</TableCell>
                    <TableCell className="text-right print:text-xs">{formatCurrency(row.mealAllowance)}</TableCell>
                    <TableCell className="text-right print:text-xs">{formatCurrency(row.totalGross)}</TableCell>
                    <TableCell className="text-right text-red-600 print:text-xs">-{formatCurrency(row.tax)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600 print:text-xs">{formatCurrency(row.netPay)}</TableCell>
                    </TableRow>
                ))
              )}
              {data.length > 0 && (
                  <TableRow className="bg-slate-50 font-bold print:bg-gray-100">
                    <TableCell colSpan={7} className="text-right print:text-xs">Total Pembayaran</TableCell>
                    <TableCell className="text-right text-lg print:text-sm">{formatCurrency(totalNetPay)}</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RekapLemburTable;
