
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, Link2, Package, Printer, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

function ChildAssetModal({ open, onClose, parentAsset, onSuccess, onPrintChild, api }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newChild, setNewChild] = useState({ nama_aksesori: '', keterangan: '' });
  const [selectedChildren, setSelectedChildren] = useState([]);
  
  useEffect(() => {
    if (open && parentAsset?.id) {
      setLoading(true);
      setSelectedChildren([]);
      api.get(`/api/label-bmn/child-assets/${parentAsset.id}`)
        .then(res => setChildren(res.data))
        .catch(() => toast.error('Gagal memuat data aksesori'))
        .finally(() => setLoading(false));
    }
  }, [open, parentAsset, api]);
  
  const handleAddChild = async () => {
    if (!newChild.nama_aksesori.trim()) return toast.error('Nama aksesori harus diisi');
    try {
      await api.post('/api/label-bmn/child-asset', { parent_barang_id: parentAsset.id, ...newChild });
      toast.success('Aksesori berhasil ditambahkan');
      setNewChild({ nama_aksesori: '', keterangan: '' });
      api.get(`/api/label-bmn/child-assets/${parentAsset.id}`).then(res => setChildren(res.data));
      onSuccess?.();
    } catch { toast.error('Gagal menambah aksesori'); }
  };
  
  const handleDeleteChild = async (childId) => {
    try {
      await api.delete(`/api/label-bmn/child-asset/${childId}`);
      toast.success('Aksesori dihapus');
      setChildren(prev => prev.filter(c => c.id !== childId));
      onSuccess?.();
    } catch { toast.error('Gagal menghapus aksesori'); }
  };
  
  const toggleSelectChild = (child) => {
    setSelectedChildren(prev => 
      prev.find(c => c.id === child.id) 
        ? prev.filter(c => c.id !== child.id)
        : [...prev, child]
    );
  };
  
  const handlePrintSelected = () => {
    if (selectedChildren.length === 0) return toast.error('Pilih minimal 1 aksesori');
    // Pass selected children to parent for printing
    onPrintChild?.(selectedChildren, parentAsset);
    onClose();
  };
  
  const PRESETS = ['Charger/Adaptor', 'Tas Laptop', 'Mouse', 'Keyboard', 'Kabel Power', 'USB Hub', 'Headset', 'Kabel Data', 'Stand/Dudukan'];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="w-5 h-5" />Kelola Aksesori - {parentAsset?.nama_barang}</DialogTitle>
          <DialogDescription>Kode: #{parentAsset?.kode_register || parentAsset?.kode_barang}</DialogDescription>
        </DialogHeader>
        
        {/* Add New Accessory */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Tambah Aksesori Baru</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {PRESETS.map(p => (
                <Badge 
                  key={p} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-blue-50 transition-colors" 
                  onClick={() => setNewChild({ ...newChild, nama_aksesori: p })}
                >
                  {p}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Nama aksesori (contoh: Charger Laptop)" 
                value={newChild.nama_aksesori} 
                onChange={e => setNewChild({ ...newChild, nama_aksesori: e.target.value })} 
                className="flex-1" 
              />
              <Input 
                placeholder="Keterangan (opsional)" 
                value={newChild.keterangan} 
                onChange={e => setNewChild({ ...newChild, keterangan: e.target.value })} 
                className="flex-1" 
              />
              <Button onClick={handleAddChild}><Plus className="w-4 h-4 mr-1" />Tambah</Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Accessory List */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Package className="w-4 h-4" />Daftar Aksesori ({children.length})</span>
              {children.length > 0 && (
                <Button 
                  size="sm" 
                  onClick={handlePrintSelected} 
                  disabled={selectedChildren.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Cetak Label ({selectedChildren.length})
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="w-10 p-2"></th>
                    <th className="text-left p-2">Nama Aksesori</th>
                    <th className="text-left p-2">Kode Register</th>
                    <th className="text-center p-2">Status Cetak</th>
                    <th className="text-center p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center p-4">Memuat...</td></tr>
                  ) : children.length === 0 ? (
                    <tr><td colSpan={5} className="text-center p-4 text-gray-500">Belum ada aksesori terdaftar</td></tr>
                  ) : (
                    children.map(child => {
                      const isSelected = selectedChildren.some(c => c.id === child.id);
                      return (
                        <tr key={child.id} className={`border-t ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                          <td className="p-2 text-center">
                            <Checkbox 
                              checked={isSelected} 
                              onCheckedChange={() => toggleSelectChild(child)} 
                            />
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{child.nama_aksesori}</div>
                            {child.keterangan && <div className="text-xs text-gray-500">{child.keterangan}</div>}
                          </td>
                          <td className="p-2">
                            <code className="bg-slate-100 px-1 rounded text-xs">#{child.kode_register_anak}</code>
                          </td>
                          <td className="text-center p-2">
                            {child.print_count > 0 ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />{child.print_count}x
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="w-3 h-3 mr-1" />Belum
                              </Badge>
                            )}
                          </td>
                          <td className="text-center p-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteChild(child.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Info Section */}
        <div className="text-xs text-gray-500 bg-slate-50 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Kode register aksesori otomatis dibuat berdasarkan kode aset induk</li>
            <li>Pilih aksesori yang akan dicetak, lalu klik tombol &quot;Cetak Label&quot;</li>
            <li>Stiker aksesori menggunakan ukuran Kecil (2.38x3.98cm)</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ChildAssetModal;
