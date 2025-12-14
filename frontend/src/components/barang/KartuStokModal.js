import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Loader2, FileText, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Badge } from '../ui/badge';

export default function KartuStokModal({ isOpen, onClose, item }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && item) {
      fetchHistory();
    }
  }, [isOpen, item]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/persediaan-transaksi/history/${item._id}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Kartu Stok
          </DialogTitle>
          <DialogDescription>
            Riwayat transaksi untuk <strong>{item.nama_barang}</strong> ({item.kode_barang})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md mt-2">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[140px] text-xs">Tanggal</TableHead>
                <TableHead className="w-[80px] text-xs text-center">Jenis</TableHead>
                <TableHead className="text-right text-xs">Jumlah</TableHead>
                <TableHead className="text-right text-xs">Harga Satuan</TableHead>
                <TableHead className="text-right text-xs">Total Nilai</TableHead>
                <TableHead className="text-center text-xs">Saldo Stok</TableHead>
                <TableHead className="text-xs">Keterangan / Penerima</TableHead>
                <TableHead className="w-[100px] text-xs">Dokumen</TableHead>
                <TableHead className="w-[100px] text-xs">Petugas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    <span className="text-xs text-slate-400 mt-2 block">Memuat riwayat...</span>
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500 text-xs">
                    Belum ada riwayat transaksi.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((txn, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 text-xs">
                    <TableCell className="font-mono text-[10px] text-slate-600">
                      {formatDate(txn.timestamp)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={txn.jenis === 'in' ? 'success' : 'destructive'} className={`text-[10px] px-1 py-0 ${txn.jenis === 'in' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                        {txn.jenis === 'in' ? (
                          <span className="flex items-center gap-1"><ArrowUpCircle size={10} /> Masuk</span>
                        ) : (
                          <span className="flex items-center gap-1"><ArrowDownCircle size={10} /> Keluar</span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${txn.jenis === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.jenis === 'in' ? '+' : '-'}{txn.jumlah}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(txn.nilai_satuan)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {formatCurrency(txn.total_nilai)}
                    </TableCell>
                    <TableCell className="text-center font-bold bg-slate-50">
                      {txn.stok_sesudah}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{txn.keterangan || '-'}</div>
                      {txn.unit_penerima && <div className="text-[10px] text-slate-500">Penerima: {txn.unit_penerima}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {txn.dokumen_ref || '-'}
                    </TableCell>
                    <TableCell className="text-[10px] truncate max-w-[100px]" title={txn.petugas}>
                      {txn.petugas || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-end pt-4 border-t mt-auto">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
