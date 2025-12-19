import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatCurrency } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { TableSkeleton } from '../ui/skeleton-table';
import { ExternalLink, Image, ChevronDown, ChevronRight, Package } from 'lucide-react';

export default function TransactionTable({ data, loading, assetType, type, isGrouped = false }) {
  if (isGrouped) {
      return (
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[120px]">Tanggal</TableHead>
                <TableHead>Dokumen & Keterangan</TableHead>
                <TableHead className="text-center">Jenis</TableHead>
                <TableHead className="text-center">Total Item</TableHead>
                <TableHead className="text-right">Total Nilai</TableHead>
                <TableHead className="text-right">Bukti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton columns={7} rows={5} />
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Tidak ada data.</TableCell></TableRow>
              ) : (
                data.map((group, idx) => (
                  <GroupRow key={idx} group={group} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      );
  }

  // FLAT VIEW (Original)
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
            <TableHead className="text-center w-[50px]">Bukti</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton columns={assetType === 'persediaan' ? 10 : 9} rows={5} />
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={assetType === 'persediaan' ? 10 : 9} className="text-center py-8 text-slate-500">
                Tidak ada data transaksi.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item._id} className={`hover:bg-slate-50 ${(item.jenis === 'in' || item.jenis === 'MASUK') ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                <TableCell className="font-mono text-xs">
                  {new Date(item.timestamp).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{item.kode_barang}</TableCell>
                <TableCell className="font-medium text-sm">
                    {item.nama_barang}
                    {assetType !== 'persediaan' && (
                        (item.source !== 'import' && (item.nup === '1' || item.nup === 1)) ? (
                            <span className="ml-1 text-xs text-slate-400 italic">(sementara)</span>
                        ) : (
                            item.nup && <span className="ml-1 text-xs text-slate-400">NUP: {item.nup}</span>
                        )
                    )}
                </TableCell>
                
                {assetType === 'persediaan' && (
                    <TableCell className="text-xs">
                        {item.batch_number && <div className="font-mono text-[10px]">Batch: {item.batch_number}</div>}
                        {item.expired_date && <div className={`text-[10px] ${new Date(item.expired_date) < new Date() ? 'text-red-500 font-bold' : 'text-slate-500'}`}>Exp: {item.expired_date}</div>}
                    </TableCell>
                )}

                <TableCell className="text-center">
                    <Badge 
                        variant={(item.jenis === 'in' || item.jenis === 'MASUK' || type === 'masuk') ? 'success' : 'warning'} 
                        className={`${(item.jenis === 'in' || item.jenis === 'MASUK' || type === 'masuk') ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                        {(item.jenis === 'in' || item.jenis === 'MASUK' || type === 'masuk') ? '+' : '-'}{item.jumlah}
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
                <TableCell className="text-center">
                    {item.bukti_fotos && item.bukti_fotos.length > 0 ? (
                        <a 
                            href={item.bukti_fotos[0].url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="Lihat Bukti Foto"
                        >
                            <Image size={16} />
                        </a>
                    ) : (
                        <span className="text-slate-300">-</span>
                    )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupRow({ group }) {
    const [expanded, setExpanded] = useState(false);
    const isMasuk = group.jenis === 'in' || group.jenis === 'MASUK';
    
    return (
        <>
            <TableRow 
                className={`cursor-pointer hover:bg-slate-100 ${isMasuk ? 'bg-green-50/50' : 'bg-red-50/50'}`} 
                onClick={() => setExpanded(!expanded)}
            >
                <TableCell>
                    {expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                </TableCell>
                <TableCell className="font-mono text-xs">
                    {new Date(group.timestamp).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric'
                    })}
                    <div className="text-[10px] text-slate-500">
                        {new Date(group.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </TableCell>
                <TableCell>
                    <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        {group.dokumen_ref ? (
                            <>
                                <Package size={14} className="text-slate-500"/>
                                {group.dokumen_ref}
                            </>
                        ) : (
                            <span className="text-slate-400 italic">Tanpa Dokumen</span>
                        )}
                    </div>
                    {group.no_bukti && <div className="text-xs text-slate-500 font-mono">Bukti: {group.no_bukti}</div>}
                    {group.keterangan && <div className="text-xs text-slate-600 italic mt-1">{group.keterangan}</div>}
                    {group.unit_penerima && <div className="text-xs text-blue-700 mt-1">Penerima: {group.unit_penerima}</div>}
                </TableCell>
                <TableCell className="text-center">
                    <Badge variant={isMasuk ? 'success' : 'destructive'} className={isMasuk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {isMasuk ? 'Barang Masuk' : 'Barang Keluar'}
                    </Badge>
                </TableCell>
                <TableCell className="text-center font-bold">
                    {group.total_items} Item
                </TableCell>
                <TableCell className="text-right font-bold">
                    {formatCurrency(group.total_nilai)}
                </TableCell>
                <TableCell className="text-center">
                    {group.bukti_fotos && group.bukti_fotos.length > 0 && (
                        <a href={group.bukti_fotos[0].url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600">
                            <Image size={16} />
                        </a>
                    )}
                </TableCell>
            </TableRow>
            
            {expanded && (
                <TableRow className="bg-slate-50">
                    <TableCell colSpan={7} className="p-0">
                        <div className="p-4 pl-12 border-b border-slate-200 shadow-inner">
                            <Table>
                                <TableHeader className="bg-white">
                                    <TableRow>
                                        <TableHead className="h-8 text-xs">Kode Barang</TableHead>
                                        <TableHead className="h-8 text-xs">Nama Barang</TableHead>
                                        <TableHead className="h-8 text-xs text-center">Jumlah</TableHead>
                                        <TableHead className="h-8 text-xs text-right">Nilai Satuan</TableHead>
                                        <TableHead className="h-8 text-xs text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {group.items.map((item, i) => (
                                        <TableRow key={item._id || i} className="hover:bg-white">
                                            <TableCell className="font-mono text-xs text-slate-500 py-2">{item.kode_barang}</TableCell>
                                            <TableCell className="text-xs py-2">
                                                <div className="font-medium">{item.nama_barang}</div>
                                                {item.batch_number && <span className="text-[10px] text-slate-400">Batch: {item.batch_number}</span>}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-xs py-2">{item.jumlah}</TableCell>
                                            <TableCell className="text-right text-xs py-2">{formatCurrency(item.nilai_satuan)}</TableCell>
                                            <TableCell className="text-right font-medium text-xs py-2">{formatCurrency(item.total_nilai)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
