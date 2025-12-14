import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useParams, useNavigate } from 'react-router-dom';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';

export default function TransaksiList() {
  const { type } = useParams(); 
  const navigate = useNavigate();
  
  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  // ... (Other state and logic)

  const fetchData = async () => {
    // Only fetch list if viewing 'riwayat' tab, else just master data for dropdowns
    if (type !== 'riwayat') return;
    
    setLoading(true);
    try {
      const res = await api.get('/api/transaksi', {
          params: { page: currentPage, limit }
      });
      setTransaksi(res.data.data);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      console.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type, currentPage]); // Re-fetch on tab change or page change

  // ... (Form Logic Omitted for brevity) ...

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Transaksi Gudang</h1>
        
        <Tabs value={type || 'riwayat'} onValueChange={(val) => navigate(`/transaksi/${val}`)}>
            <TabsList className="bg-slate-100">
                <TabsTrigger value="masuk">Barang Masuk</TabsTrigger>
                <TabsTrigger value="keluar">Barang Keluar</TabsTrigger>
                <TabsTrigger value="riwayat">Riwayat Transaksi</TabsTrigger>
            </TabsList>

            {/* ... Other Tabs ... */}

            <TabsContent value="riwayat">
                <Card>
                  <CardHeader>
                    <CardTitle>Riwayat Transaksi Terkini</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Barang</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead>Pihak Terkait</TableHead>
                            <TableHead>Dokumen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                              <TableSkeleton columns={6} rows={10} />
                          ) : transaksi.map((tx) => (
                              <TableRow key={tx._id}>
                                <TableCell className="text-xs">{new Date(tx.timestamp).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      tx.jenis === 'MASUK' ? 'bg-green-100 text-green-700' : 
                                      tx.jenis === 'KELUAR' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {tx.jenis}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm font-medium">{tx.nama_barang}</TableCell>
                                <TableCell className="font-bold">{tx.jumlah}</TableCell>
                                <TableCell className="text-xs">{tx.nama_pegawai}</TableCell>
                                <TableCell className="text-xs font-mono">{tx.dokumen_ref || '-'}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        limit={limit}
                        onPageChange={setCurrentPage}
                    />
                  </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
