import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

const RekapLemburTable = ({ data }) => {
  const totalNetPay = data.reduce((acc, curr) => acc + (curr.netPay || 0), 0);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rekapitulasi Lembur Bulanan</CardTitle>
        <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pegawai</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Jam Lembur</TableHead>
                <TableHead className="text-right">Rate/Jam</TableHead>
                <TableHead className="text-right">Uang Makan</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Pajak</TableHead>
                <TableHead className="text-right font-bold">Netto</TableHead>
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
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            row.type === 'ASN' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                            {row.type} - {row.grade}
                        </span>
                    </TableCell>
                    <TableCell className="text-right">{row.totalHours} Jam</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.rate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.mealAllowance)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalGross)}</TableCell>
                    <TableCell className="text-right text-red-600">-{formatCurrency(row.tax)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(row.netPay)}</TableCell>
                    </TableRow>
                ))
              )}
              {data.length > 0 && (
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={7} className="text-right">Total Pembayaran</TableCell>
                    <TableCell className="text-right text-lg">{formatCurrency(totalNetPay)}</TableCell>
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
