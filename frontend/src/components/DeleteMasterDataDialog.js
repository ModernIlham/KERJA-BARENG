import React, { useState } from 'react';
import { Button } from './ui/button';
import { PackageX } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';

export default function DeleteMasterDataDialog({ onConfirm, loading }) {
    const [open, setOpen] = useState(false);
    const [assetType, setAssetType] = useState('all');

    const handleConfirm = () => {
        // We pass 'barang' as target, and the selected assetType
        // The txnType param is irrelevant here but we can pass 'all' or ignore it
        onConfirm('barang', assetType, 'all'); 
        setOpen(false);
    };

    return (
        <>
            <Button 
                variant="outline" 
                className="w-full justify-start bg-white hover:bg-red-100 border-red-200 text-red-700"
                onClick={() => setOpen(true)}
                disabled={loading}
            >
                <PackageX size={16} className="mr-2"/> 
                Hapus Master Barang (Pilih Jenis)
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Hapus Master Barang</DialogTitle>
                        <DialogDescription>
                            Pilih jenis aset yang ingin dihapus dari database. 
                            <br/><span className="font-bold">PERINGATAN:</span> Tindakan ini akan menghapus data master barang dan TIDAK BISA dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Jenis Aset yang Dihapus</Label>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant={assetType === 'all' ? 'default' : 'outline'} 
                                    onClick={() => setAssetType('all')}
                                    className="flex-1"
                                >
                                    Semua
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={assetType === 'aset' ? 'default' : 'outline'} 
                                    onClick={() => setAssetType('aset')}
                                    className="flex-1"
                                >
                                    Aset Tetap
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={assetType === 'persediaan' ? 'default' : 'outline'} 
                                    onClick={() => setAssetType('persediaan')}
                                    className="flex-1"
                                >
                                    Persediaan
                                </Button>
                            </div>
                        </div>
                        
                        <div className="bg-red-50 p-3 rounded text-xs text-red-800 border border-red-200 mt-2">
                            <p className="font-bold">Konfirmasi:</p>
                            <p>Anda akan menghapus data MASTER 
                                <strong> {assetType === 'all' ? 'SEMUA ASET' : assetType === 'aset' ? 'ASET TETAP' : 'PERSEDIAAN'}</strong>.
                            </p>
                            <p className="mt-1">
                                Note: Data riwayat transaksi mungkin menjadi tidak valid (orphan) jika master barang dihapus.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleConfirm}>Ya, Hapus Permanen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
