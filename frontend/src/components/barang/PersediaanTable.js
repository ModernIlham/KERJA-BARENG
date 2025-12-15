import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Edit, Trash, MoreHorizontal } from 'lucide-react';
import { FileText } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { TableSkeleton } from '../ui/skeleton-table';

export default function PersediaanTable({
    loading, 
    barang, 
    selectedIds, 
    isAllSelected, 
    isPageSelected, 
    toggleSelectAllPage, 
    toggleSelectRow,
    visibleColumns, 
    showFilters,
    filters,
    setFilters,
    editingStatusId, 
    setEditingStatusId, 
    handleStatusChange,
    editingBatasKritisId, 
    setEditingBatasKritisId, 
    batasKritisValue, 
    setBatasKritisValue, 
    handleBatasKritisChange,
    openEditModal, 
    handleDelete,
    openTransactionModal,
    openKartuStok,
    openFotoManager
}) {
  const getImageUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return url.startsWith('/') ? url : `/${url}`;
  };

  return (
    <div className="rounded-md border border-slate-200 overflow-x-auto">
      <Table className="w-full min-w-[1500px]">
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[40px] text-center p-2">
              <input type="checkbox" onChange={(e) => toggleSelectAllPage(e.target.checked)} checked={isPageSelected || isAllSelected} className="rounded border-slate-300"/>
            </TableHead>
            {visibleColumns.gol && <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Golongan</TableHead>}
            {visibleColumns.nama && <TableHead className="min-w-[200px] p-2 text-xs font-bold uppercase">Nama Barang & Kode</TableHead>}
            <TableHead className="w-[140px] p-2 text-xs font-bold uppercase">Merk / Tipe</TableHead>
            <TableHead className="w-[90px] p-2 text-xs font-bold uppercase">Expired</TableHead>
            {visibleColumns.kondisi && <TableHead className="w-[70px] p-2 text-xs font-bold uppercase text-center">Kondisi</TableHead>}
            {visibleColumns.stok && <TableHead className="w-[85px] p-2 text-xs font-bold uppercase text-center">Stok</TableHead>}
            <TableHead className="w-[95px] p-2 text-xs font-bold uppercase text-center">Batas Kritis</TableHead>
            <TableHead className="text-right w-[95px] p-2 text-xs font-bold uppercase">Harga Rata-Rata</TableHead>
            <TableHead className="text-right w-[105px] p-2 text-xs font-bold uppercase">Total Harga</TableHead>
            {visibleColumns.mutasi && <TableHead className="text-right w-[105px] p-2 text-xs font-bold uppercase">Nilai Mutasi</TableHead>}
            {visibleColumns.lokasi && <TableHead className="w-[100px] p-2 text-xs font-bold uppercase">Lokasi</TableHead>}
            {visibleColumns.status && <TableHead className="w-[70px] p-2 text-xs font-bold uppercase text-center">Status</TableHead>}
            {visibleColumns.foto && <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Foto</TableHead>}
            <TableHead className="text-center w-[50px] p-2 text-xs font-bold uppercase sticky right-0 bg-slate-50 shadow-sm">Act</TableHead>
          </TableRow>

          {showFilters && (
            <TableRow className="bg-slate-50">
                <TableHead className="p-1"></TableHead>
                {visibleColumns.gol && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Gol..." value={filters.golongan} onChange={e=>setFilters({...filters, golongan: e.target.value})} /></TableHead>}
                {visibleColumns.nama && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Nama/Kode..." value={filters.nama} onChange={e=>setFilters({...filters, nama: e.target.value})} /></TableHead>}
                <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Merk/Tipe..." value={filters.merk} onChange={e=>setFilters({...filters, merk: e.target.value})} /></TableHead>
                <TableHead className="p-1"></TableHead>
                {visibleColumns.kondisi && <TableHead className="p-1"><select className="h-7 text-[10px] w-full border rounded px-1" value={filters.kondisi} onChange={e=>setFilters({...filters, kondisi: e.target.value})}><option value="">All</option><option value="Baik">Baik</option><option value="Barang Usang">Usang</option><option value="Barang Rusak">Rusak</option></select></TableHead>}
                {visibleColumns.stok && <TableHead className="p-1"></TableHead>}
                <TableHead className="p-1"></TableHead>
                <TableHead className="p-1"></TableHead>
                <TableHead className="p-1"></TableHead>
                {visibleColumns.mutasi && <TableHead className="p-1"></TableHead>}
                {visibleColumns.lokasi && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Lokasi..." value={filters.lokasi} onChange={e=>setFilters({...filters, lokasi: e.target.value})} /></TableHead>}
                {visibleColumns.status && <TableHead className="p-1"></TableHead>}
                {visibleColumns.foto && <TableHead className="p-1"></TableHead>}
                <TableHead className="sticky right-0 bg-slate-50 p-1"></TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton columns={12} rows={15} />
          ) : barang.length === 0 ? (
            <TableRow><TableCell colSpan={13} className="text-center py-8 text-slate-500">Tidak ada data persediaan.</TableCell></TableRow>
          ) : (
            barang.map((item) => {
              const isTemp = String(item.nup || "").includes("(Sementara)");
              const isSelected = selectedIds.has(item._id) || isAllSelected;
              const status = item.status_aset || 'Aktif';
              
              let rowClass = "text-xs ";
              if (isSelected) {
                rowClass += "bg-blue-50 hover:bg-blue-100";
              } else if (status === 'Non Aktif') {
                rowClass += "bg-slate-200 text-slate-500 opacity-70 hover:opacity-80";
              } else if (status === 'Dipinjamkan') {
                rowClass += "bg-blue-100 hover:bg-blue-200";
              } else if (isTemp) {
                rowClass += "bg-yellow-50 hover:bg-yellow-100";
              } else {
                rowClass += "hover:bg-slate-50";
              }

              // Check if stok below batas kritis
              const isBelowKritis = item.stok <= (item.batas_kritis || 0) && item.batas_kritis > 0;

              return (
                <TableRow key={item._id} className={rowClass}>
                  <TableCell className="text-center p-2">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(item._id)} className="rounded border-slate-300"/>
                  </TableCell>
                  {visibleColumns.gol && (
                    <TableCell className="p-2 text-[10px]" title={item.golongan_barang}>
                      <div className="truncate max-w-[120px]">{item.golongan_barang || '-'}</div>
                    </TableCell>
                  )}
                  {visibleColumns.nama && (
                    <TableCell className="p-2">
                      <div className="font-semibold text-slate-900 text-xs truncate max-w-[200px]" title={item.nama_barang}>{item.nama_barang}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{item.kode_barang}</div>
                    </TableCell>
                  )}
                  <TableCell className="p-2 text-[10px]">
                    <div className="max-w-[140px]" title={`${item.merk || ''} ${item.tipe || ''}`}>
                      {item.merk && <div className="font-medium truncate">{item.merk}</div>}
                      {item.tipe && <div className="text-slate-500 truncate">{item.tipe}</div>}
                      {!item.merk && !item.tipe && '-'}
                    </div>
                  </TableCell>
                  <TableCell className="p-2 text-[10px]">{item.expired_date || '-'}</TableCell>
                  {visibleColumns.kondisi && <TableCell className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.kondisi === 'Baik' ? 'bg-green-50 text-green-700 border-green-200' : item.kondisi === 'Barang Rusak' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{item.kondisi}</span></TableCell>}
                  {visibleColumns.stok && (
                    <TableCell className="text-center font-bold p-2">
                      <div className={isBelowKritis ? 'text-red-600' : 'text-slate-900'}>
                        {item.stok}
                        {item.satuan && <span className="text-[9px] font-normal ml-1">{item.satuan}</span>}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-center p-2">
                    {editingBatasKritisId === item._id ? (
                      <div className="flex gap-1 items-center justify-center">
                        <Input
                          type="number"
                          autoFocus
                          value={batasKritisValue}
                          onChange={(e) => setBatasKritisValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleBatasKritisChange(item._id);
                            if (e.key === 'Escape') { setEditingBatasKritisId(null); setBatasKritisValue(''); }
                          }}
                          onBlur={() => handleBatasKritisChange(item._id)}
                          className="w-16 h-6 text-[10px] px-1 text-center"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => { setEditingBatasKritisId(item._id); setBatasKritisValue(item.batas_kritis || 0); }}
                        className="cursor-pointer hover:bg-slate-100 px-2 py-1 rounded"
                      >
                        <div className="font-semibold">{item.batas_kritis || 0}</div>
                        {item.satuan && <div className="text-[9px] text-slate-500">{item.satuan}</div>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right p-2 text-[10px] whitespace-nowrap">{formatCurrency(item.nilai_satuan || 0)}</TableCell>
                  <TableCell className="text-right p-2 text-[10px] font-semibold whitespace-nowrap">
                    {formatCurrency((item.stok || 0) * (item.nilai_satuan || 0))}
                  </TableCell>
                  {visibleColumns.mutasi && <TableCell className="text-right p-2 text-[10px] whitespace-nowrap">{formatCurrency(item.nilai_mutasi || 0)}</TableCell>}
                  {visibleColumns.lokasi && <TableCell className="p-2 truncate max-w-[120px]" title={item.lokasi_fisik}>{item.lokasi_fisik || '-'}</TableCell>}
                  {visibleColumns.status && (
                    <TableCell className="text-center p-2">
                      {editingStatusId === item._id ? (
                        <select
                          autoFocus
                          defaultValue={item.status_aset || 'Aktif'}
                          onChange={(e) => handleStatusChange(item._id, e.target.value)}
                          onBlur={() => setEditingStatusId(null)}
                          className="text-[10px] px-1 py-0.5 rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Aktif">Aktif</option>
                          <option value="Non Aktif">Non Aktif</option>
                          <option value="Dipinjamkan">Dipinjamkan</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => setEditingStatusId(item._id)}
                          className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer hover:ring-1 hover:ring-blue-300 transition-all ${
                            item.status_aset === 'Aktif' ? 'bg-green-50 text-green-700 border border-green-200' :
                            item.status_aset === 'Non Aktif' ? 'bg-gray-100 text-gray-600 border border-gray-300' :
                            item.status_aset === 'Dipinjamkan' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                            'bg-green-50 text-green-700 border border-green-200'
                          }`}
                        >
                          {item.status_aset || 'Aktif'}
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-center sticky right-0 bg-white/90 backdrop-blur shadow-sm p-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-6 w-6 p-0 hover:bg-slate-100"><MoreHorizontal size={14}/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(item)} className="text-xs"><Edit size={12} className="mr-2"/> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openTransactionModal(item)} className="text-xs text-blue-600"><div className="flex items-center"><span className="mr-2 text-[10px]">⇄</span> Transaksi Stok</div></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openKartuStok(item)} className="text-xs"><FileText size={12} className="mr-2"/> Kartu Stok</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(item._id)} className="text-xs text-red-600"><Trash size={12} className="mr-2"/> Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})
            )}
        </TableBody>
      </Table>
    </div>
  );
}
