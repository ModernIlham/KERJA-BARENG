import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatCurrency } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { TableSkeleton } from '../ui/skeleton-table';

export default function TransactionTable({ data, loading, assetType, type }) {
  return (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[120px]">Tanggal</TableHead>
            <TableHead>Kode Barang</TableHead>
            <TableHead>Nama Barang</TableHead>
            {assetType === 'persediaan' && <TableHead>Batch / Expired</TableHead>}
            <TableHead className="text-center">Jumlah</TableHead>
            <TableHead className="text-right">Nilai Total</TableHead>
            <TableHead>Keterangan</TableHead>
            {type === 'keluar' && <TableHead>Penerima</TableHead>}
            <TableHead className="text-right">Dokumen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton columns={assetType === 'persediaan' ? 9 : 8} rows={5} />
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={assetType === 'persediaan' ? 9 : 8} className="text-center py-8 text-slate-500">
                Tidak ada data transaksi.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item._id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-xs">
                  {new Date(item.timestamp).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{item.kode_barang}</TableCell>
                <TableCell className="font-medium text-sm">
                    {item.nama_barang}
                    {item.nup && item.nup !== '1' && <span className="ml-1 text-xs text-slate-400">NUP: {item.nup}</span>}
                </TableCell>
                
                {assetType === 'persediaan' && (
                    <TableCell className="text-xs">
                        {item.batch_number && <div className="font-mono text-[10px]">Batch: {item.batch_number}</div>}
                        {item.expired_date && <div className={`text-[10px] ${new Date(item.expired_date) < new Date() ? 'text-red-500 font-bold' : 'text-slate-500'}`}>Exp: {item.expired_date}</div>}
                    </TableCell>
                )}

                <TableCell className="text-center">
                    <Badge variant={type === 'masuk' ? 'success' : 'warning'} className={`${type === 'masuk' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {type === 'masuk' ? '+' : '-'}{item.jumlah}
                    </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                    {formatCurrency(item.total_nilai)}
                </TableCell>
                <TableCell className="text-sm text-slate-600 max-w-[200px] truncate" title={item.keterangan}>
                    {item.keterangan || '-'}
                </TableCell>
                {type === 'keluar' && (
                    <TableCell className="text-xs">{item.unit_penerima || item.nama_pegawai || '-'}</TableCell>
                )}
                <TableCell className="text-right text-xs font-mono text-slate-500">
                    {item.dokumen_ref || '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
