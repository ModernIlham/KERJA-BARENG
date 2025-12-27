
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, Plus, Trash2, CheckCircle2, XCircle, Link2, RefreshCw, Eye, Settings2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const STICKER_SIZES = {
  kecil: { width: 23.8, height: 39.8, label: 'Kecil (2.38x3.98cm)', desc: 'Aksesori' },
  sedang: { width: 69.8, height: 22.1, label: 'Sedang (6.98x2.21cm)', desc: 'Standar' },
  besar: { width: 94.9, height: 32.2, label: 'Besar (9.49x3.22cm)', desc: 'Mesin Besar' }
};

const CANVAS_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210x297mm)' },
  A3: { width: 297, height: 420, label: 'A3 (297x420mm)' }
};

function AssetTable({ 
  assets, 
  loading, 
  page, 
  totalPages, 
  setPage, 
  selectedItems, 
  toggleSelect, 
  selectAll, 
  selectAllPages, 
  selectingAll, 
  onPrint, 
  onManageChildren, 
  onPreview,
  filters,
  setFilters,
  loadAssets
}) {
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('semua');
  const [selectedSize, setSelectedSize] = useState('sedang');
  const [canvasSize, setCanvasSize] = useState('A4');
  
  // Pass size changes up to parent or handle locally? 
  // For now, these seem to be part of the "view/selection" state.
  
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Cari Aset</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Nama, kode, merk..." 
                  value={filters.search} 
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} 
                  className="pl-8" 
                />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={val => { setStatusFilter(val); setFilters(prev => ({ ...prev, status: val })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua</SelectItem>
                  <SelectItem value="belum_cetak">Belum Cetak</SelectItem>
                  <SelectItem value="sudah_cetak">Sudah Cetak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="text-xs">Ukuran Stiker</Label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STICKER_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label className="text-xs">Kertas</Label>
              <Select value={canvasSize} onValueChange={val => { setCanvasSize(val); filters.onCanvasSizeChange?.(val); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CANVAS_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={loadAssets} variant="outline"><RefreshCw className="w-4 h-4" /></Button>
            <Button 
              variant={showAdvancedFilter ? "secondary" : "outline"} 
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              className="flex items-center gap-1"
            >
              <Settings2 className="w-4 h-4" />
              Filter
              {showAdvancedFilter ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
          
          {/* Advanced Filter Panel */}
          {showAdvancedFilter && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="w-32">
                  <Label className="text-xs">NUP</Label>
                  <Input 
                    placeholder="Contoh: 1" 
                    value={filters.nup || ''} 
                    onChange={e => setFilters(prev => ({ ...prev, nup: e.target.value }))} 
                  />
                </div>
                <div className="w-32">
                  <Label className="text-xs">Tahun Perolehan</Label>
                  <Input 
                    placeholder="Contoh: 2024" 
                    value={filters.tahun || ''} 
                    onChange={e => setFilters(prev => ({ ...prev, tahun: e.target.value }))} 
                  />
                </div>
                <div className="w-40">
                  <Label className="text-xs">Nilai Min (Rp)</Label>
                  <Input 
                    type="number"
                    placeholder="0" 
                    value={filters.nilaiMin || ''} 
                    onChange={e => setFilters(prev => ({ ...prev, nilaiMin: e.target.value }))} 
                  />
                </div>
                <div className="w-40">
                  <Label className="text-xs">Nilai Max (Rp)</Label>
                  <Input 
                    type="number"
                    placeholder="999999999" 
                    value={filters.nilaiMax || ''} 
                    onChange={e => setFilters(prev => ({ ...prev, nilaiMax: e.target.value }))} 
                  />
                </div>
                <div className="w-40">
                  <Label className="text-xs">Urutkan</Label>
                  <Select value={filters.sortField || 'kode_barang'} onValueChange={val => setFilters(prev => ({ ...prev, sortField: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kode_barang">Kode Barang</SelectItem>
                      <SelectItem value="nama_barang">Nama Barang</SelectItem>
                      <SelectItem value="nup">NUP</SelectItem>
                      <SelectItem value="tgl_perolehan">Tanggal Perolehan</SelectItem>
                      <SelectItem value="nilai_perolehan">Nilai Perolehan</SelectItem>
                      <SelectItem value="nilai_buku">Nilai Buku</SelectItem>
                      <SelectItem value="print_count">Status Cetak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <Label className="text-xs">Arah</Label>
                  <Select value={filters.sortOrder || 'asc'} onValueChange={val => setFilters(prev => ({ ...prev, sortOrder: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A-Z / Kecil</SelectItem>
                      <SelectItem value="desc">Z-A / Besar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" onClick={() => setFilters(prev => ({ ...prev, nup: '', tahun: '', nilaiMin: '', nilaiMax: '', sortField: 'kode_barang', sortOrder: 'asc' }))} className="text-gray-500">
                  <RotateCcw className="w-4 h-4 mr-1" />Reset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={assets.length > 0 && assets.every(a => selectedItems.some(i => i.id === a.id))} 
              onCheckedChange={selectAll} 
            />
            <span className="text-sm text-gray-500">Halaman ini</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={selectAllPages}
            disabled={selectingAll}
            className="text-xs"
          >
            {selectingAll ? (
              <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Memuat...</>
            ) : selectedItems.length > 0 ? (
              <><Trash2 className="w-3 h-3 mr-1" />Batal Pilih ({selectedItems.length})</>
            ) : (
              <><CheckCircle2 className="w-3 h-3 mr-1" />Pilih Semua Halaman</>
            )}
          </Button>
          <span className="text-sm font-medium text-blue-600">{selectedItems.length} dipilih</span>
        </div>
        <Button onClick={onPrint} disabled={selectedItems.length === 0}><Printer className="w-4 h-4 mr-2" />Cetak ({selectedItems.length})</Button>
      </div>
      
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr>
              <th className="w-10 p-3"></th>
              <th className="text-left p-3">Kode / Nama Barang</th>
              <th className="text-left p-3">Merk / Tipe</th>
              <th className="text-center p-3">NUP</th>
              <th className="text-center p-3">Tahun</th>
              <th className="text-right p-3">Nilai Perolehan</th>
              <th className="text-right p-3">Nilai Buku</th>
              <th className="text-center p-3">Aksesori</th>
              <th className="text-center p-3">Status Cetak</th>
              <th className="text-center p-3">Aksi</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10} className="text-center p-8">Memuat...</td></tr> :
               assets.length === 0 ? <tr><td colSpan={10} className="text-center p-8 text-gray-500">Tidak ada data</td></tr> :
               assets.map(asset => {
                 const isSelected = selectedItems.some(i => i.id === asset.id);
                 const tahunPerolehan = asset.tgl_perolehan ? new Date(asset.tgl_perolehan).getFullYear() : (asset.tahun_anggaran || '-');
                 const nilaiPerolehan = asset.nilai_perolehan || asset.harga_perolehan || 0;
                 const nilaiBuku = asset.nilai_buku || asset.nilai_buku_sekarang || 0;
                 return (
                   <tr key={asset.id} className={`border-t ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                     <td className="p-3 text-center"><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(asset)} /></td>
                     <td className="p-3">
                       <div className="font-medium">{asset.nama_barang}</div>
                       <code className="text-xs bg-slate-100 px-1 rounded">#{asset.kode_register || asset.kode_barang}</code>
                     </td>
                     <td className="p-3"><div>{asset.merk || '-'}</div><div className="text-xs text-gray-500">{asset.tipe || ''}</div></td>
                     <td className="text-center p-3">
                       <Badge variant="outline" className="font-mono">{asset.nup || '1'}</Badge>
                     </td>
                     <td className="text-center p-3">
                       <span className="text-gray-600">{tahunPerolehan}</span>
                     </td>
                     <td className="text-right p-3">
                       <span className="font-mono text-xs">{nilaiPerolehan.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</span>
                     </td>
                     <td className="text-right p-3">
                       <span className="font-mono text-xs">{nilaiBuku.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</span>
                     </td>
                     <td className="text-center p-3">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => onManageChildren(asset)}
                         className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                       >
                         <Link2 className="w-4 h-4 mr-1" />
                         {asset.child_count > 0 ? (
                           <Badge variant="secondary" className="ml-1">{asset.child_count}</Badge>
                         ) : (
                           <span className="text-xs">Kelola</span>
                         )}
                       </Button>
                     </td>
                     <td className="text-center p-3">
                       {asset.print_count > 0 ? (
                         <div className="flex flex-col items-center gap-1">
                           <Badge className="bg-green-100 text-green-700">
                             <CheckCircle2 className="w-3 h-3 mr-1" />{asset.print_count}x
                           </Badge>
                           {asset.last_printed && (
                             <span className="text-xs text-gray-400">
                               {new Date(asset.last_printed).toLocaleDateString('id-ID')}
                             </span>
                           )}
                         </div>
                       ) : (
                         <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Belum</Badge>
                       )}
                     </td>
                     <td className="text-center p-3">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => onPreview({ ...asset, ukuran: selectedSize })}
                         title="Preview & Cetak"
                       >
                         <Eye className="w-4 h-4" />
                       </Button>
                     </td>
                   </tr>
                 );
               })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
            <span className="px-3 py-1 text-sm">Hal {page}/{totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AssetTable;
