import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Edit, Trash, MoreHorizontal, FileText } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { TableSkeleton } from '../ui/skeleton-table';

export default function AsetTetapTable({
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
    openEditModal, 
    handleDelete,
    openFotoManager,
    openKIBModal
}) {
  const getImageUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      // Force relative path to leverage proxy
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
            {visibleColumns.gol && <TableHead className="w-[80px] p-2 text-xs font-bold uppercase">Gol</TableHead>}
            {visibleColumns.nama && <TableHead className="min-w-[200px] p-2 text-xs font-bold uppercase">Nama Barang / Spesifikasi</TableHead>}
            {visibleColumns.kode && <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Kode / NUP</TableHead>}
            {visibleColumns.kondisi && <TableHead className="w-[80px] p-2 text-xs font-bold uppercase text-center">Kondisi</TableHead>}
            {visibleColumns.stok && <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Stok</TableHead>}
            {visibleColumns.perolehan && <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Perolehan</TableHead>}
            {visibleColumns.penyusutan && <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Penyusutan</TableHead>}
            {visibleColumns.buku && <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Nilai Buku</TableHead>}
            {visibleColumns.lokasi && <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Lokasi</TableHead>}
            {visibleColumns.satker && <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Satker</TableHead>}
            {visibleColumns.register && <TableHead className="w-[100px] p-2 text-xs font-bold uppercase">Register</TableHead>}
            {visibleColumns.tahun && <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Tahun</TableHead>}
            {visibleColumns.foto && <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Foto</TableHead>}
            {visibleColumns.status && <TableHead className="w-[80px] p-2 text-xs font-bold uppercase text-center">Status</TableHead>}
            <TableHead className="text-center w-[50px] p-2 text-xs font-bold uppercase sticky right-0 bg-slate-50 shadow-sm">Act</TableHead>
          </TableRow>
          
          {showFilters && (
              <TableRow className="bg-slate-50">
                  <TableHead className="p-1"></TableHead>
                  {visibleColumns.gol && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Gol..." value={filters.golongan} onChange={e=>setFilters({...filters, golongan: e.target.value})} /></TableHead>}
                  {visibleColumns.nama && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Nama..." value={filters.nama} onChange={e=>setFilters({...filters, nama: e.target.value})} /></TableHead>}
                  {visibleColumns.kode && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Kode/NUP..." value={filters.kode} onChange={e=>setFilters({...filters, kode: e.target.value})} /></TableHead>}
                  {visibleColumns.kondisi && <TableHead className="p-1"><select className="h-7 text-[10px] w-full border rounded px-1" value={filters.kondisi} onChange={e=>setFilters({...filters, kondisi: e.target.value})}><option value="">All</option><option value="Baik">Baik</option><option value="RR">RR</option><option value="RB">RB</option></select></TableHead>}
                  {visibleColumns.stok && <TableHead className="p-1"></TableHead>}
                  {visibleColumns.perolehan && <TableHead className="p-1"></TableHead>}
                  {visibleColumns.penyusutan && <TableHead className="p-1"></TableHead>}
                  {visibleColumns.buku && <TableHead className="p-1"></TableHead>}
                  {visibleColumns.lokasi && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Lokasi..." value={filters.lokasi} onChange={e=>setFilters({...filters, lokasi: e.target.value})} /></TableHead>}
                  {visibleColumns.satker && <TableHead className="p-1"></TableHead>}
                  {visibleColumns.register && <TableHead className="p-1"></TableHead>}
                  {visibleColumns.tahun && <TableHead className="p-1"></TableHead>}
                  {visibleColumns.foto && <TableHead className="p-1"></TableHead>}
                  {visibleColumns.status && <TableHead className="p-1"></TableHead>}
                  <TableHead className="sticky right-0 bg-slate-50 p-1"></TableHead>
              </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {loading ? ( <TableSkeleton columns={14} rows={15} /> ) : barang.length === 0 ? (
            <TableRow><TableCell colSpan={14} className="text-center py-8 text-slate-500">Tidak ada data.</TableCell></TableRow>
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

              return (
              <TableRow key={item._id} className={rowClass}>
                <TableCell className="text-center p-2">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(item._id)} className="rounded border-slate-300"/>
                </TableCell>
                {visibleColumns.gol && <TableCell className="p-2 truncate max-w-[80px]" title={item.golongan_barang}>{item.golongan_barang || '-'}</TableCell>}
                {visibleColumns.nama && <TableCell className="p-2"><div className="font-semibold text-slate-900 truncate max-w-[200px]" title={item.nama_barang}>{item.nama_barang}</div><div className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.merk} {item.tipe}</div></TableCell>}
                {visibleColumns.kode && <TableCell className="p-2 font-mono text-[10px]"><div title={item.kode_barang}>{item.kode_barang}</div>
                    {(item.source !== 'import' && (item.nup === '1' || item.nup === 1)) ? (
                         <div className="text-slate-500 italic">(sementara)</div>
                    ) : (
                         <div className="text-slate-500">NUP: {item.nup}</div>
                    )}
                </TableCell>}
                {visibleColumns.kondisi && <TableCell className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.kondisi === 'Baik' ? 'bg-green-50 text-green-700 border-green-200' : item.kondisi === 'Rusak Berat' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{item.kondisi}</span></TableCell>}
                {visibleColumns.stok && <TableCell className="text-center font-bold p-2">{item.stok}</TableCell>}
                {visibleColumns.perolehan && <TableCell className="text-right p-2 whitespace-nowrap font-medium">{formatCurrency(item.nilai_perolehan || 0)}</TableCell>}
                {visibleColumns.penyusutan && <TableCell className="text-right p-2 whitespace-nowrap text-red-600">({formatCurrency(item.nilai_penyusutan || 0)})</TableCell>}
                {visibleColumns.buku && <TableCell className="text-right p-2 whitespace-nowrap font-bold text-slate-800">{formatCurrency(item.nilai_buku || 0)}</TableCell>}
                {visibleColumns.lokasi && <TableCell className="p-2 truncate max-w-[120px]" title={item.lokasi_fisik}>{item.lokasi_fisik || '-'}</TableCell>}
                {visibleColumns.satker && <TableCell className="p-2 truncate max-w-[120px]" title={item.nama_satker}>{item.nama_satker || '-'}</TableCell>}
                {visibleColumns.register && <TableCell className="p-2 text-center">{item.kode_register || '-'}</TableCell>}
                {visibleColumns.tahun && <TableCell className="p-2 text-center">{item.tahun_anggaran || '-'}</TableCell>}
                {visibleColumns.foto && (
                    <TableCell className="p-1 text-center">
                        <div className="group relative w-10 h-10 mx-auto">
                            {item.fotos && item.fotos.length > 0 ? (
                                <img 
                                    src={getImageUrl(item.fotos.find(f => f.is_thumbnail)?.url || item.fotos[0].url)} 
                                    alt="foto" 
                                    className="h-10 w-10 object-cover rounded border cursor-pointer"
                                    onClick={() => openFotoManager(item)}
                                />
                            ) : (
                                <div 
                                    className="h-10 w-10 bg-slate-100 rounded border flex items-center justify-center text-[8px] text-slate-400 cursor-pointer hover:bg-slate-200"
                                    onClick={() => openFotoManager(item)}
                                >
                                    +Foto
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center rounded cursor-pointer" onClick={() => openFotoManager(item)}>
                                <span className="text-[8px] text-white">Edit</span>
                            </div>
                        </div>
                    </TableCell>
                )}
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
