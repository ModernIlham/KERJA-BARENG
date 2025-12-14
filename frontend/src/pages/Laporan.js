import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Printer } from 'lucide-react';

export default function Laporan() {
  const [barangList, setBarangList] = useState([]);
  const [selectedBarang, setSelectedBarang] = useState('');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    api.get('/api/barang').then(res => setBarangList(res.data));
  }, []);

  const generateReport = async () => {
    if (!selectedBarang) return;
    try {
        const res = await api.get('/api/laporan/kartu-gudang', {
            params: { 
                barang_id: selectedBarang,
                start_date: dateRange.start,
                end_date: dateRange.end
            }
        });
        setReportData(res.data);
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Laporan & Kartu Gudang</h1>
        
        <Card className="no-print">
            <CardHeader><CardTitle>Filter Laporan</CardTitle></CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Pilih Barang</label>
                        <select 
                            className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                            value={selectedBarang}
                            onChange={(e) => setSelectedBarang(e.target.value)}
                        >
                            <option value="">-- Pilih --</option>
                            {barangList.map(b => (
                                <option key={b._id} value={b._id}>{b.nama_barang}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Dari Tanggal</label>
                        <Input type="date" onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Sampai Tanggal</label>
                        <Input type="date" onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={generateReport} className="bg-slate-900 flex-1">
                            <Search className="mr-2 h-4 w-4"/> Tampilkan
                        </Button>
                        <Button variant="outline" onClick={() => window.print()}>
                            <Printer className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        {reportData && (
            <Card className="print-area">
                <CardHeader className="text-center border-b pb-4">
                    <h2 className="text-xl font-bold uppercase">Kartu Persediaan Barang</h2>
                    <div className="text-sm text-slate-500 mt-1">
                        {reportData.barang.nama_barang} | Kode: {reportData.barang.kode_barang}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>No. Dokumen</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="text-right">Masuk</TableHead>
                                <TableHead className="text-right">Keluar</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Initial Balance Row could be added here if calc logic improved */}
                            {reportData.mutasi.map((m, i) => (
                                <TableRow key={i}>
                                    <TableCell>{new Date(m.tanggal).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-mono text-xs">{m.no_dokumen}</TableCell>
                                    <TableCell className="text-xs">{m.keterangan}</TableCell>
                                    <TableCell className="text-right font-medium text-green-600">{m.masuk > 0 ? m.masuk : '-'}</TableCell>
                                    <TableCell className="text-right font-medium text-red-600">{m.keluar > 0 ? m.keluar : '-'}</TableCell>
                                    <TableCell className="text-right font-bold bg-slate-50">{m.saldo}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
