import React, { useState } from 'react';
import { Button } from './ui/button';
import { Eraser } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';

export default function DeleteTransactionDialog({ onConfirm, loading }) {
    const [open, setOpen] = useState(false);
    const [assetType, setAssetType] = useState('all');
    const [txnType, setTxnType] = useState('all');

    const handleConfirm = () => {
        onConfirm('transaksi', assetType, txnType);
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
                <Eraser size={16} className="mr-2"/> 
                Hapus Riwayat Transaksi (Advanced)
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Riwayat Transaksi</DialogTitle>
                        <DialogDescription>
                            Pilih jenis data yang ingin dihapus. Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Jenis Aset</Label>
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

                        <div className="space-y-2">
                            <Label>Jenis Transaksi</Label>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant={txnType === 'all' ? 'default' : 'outline'} 
                                    onClick={() => setTxnType('all')}
                                    className="flex-1"
                                >
                                    Semua
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={txnType === 'in' ? 'default' : 'outline'} 
                                    onClick={() => setTxnType('in')}
                                    className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
                                >
                                    Barang Masuk
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={txnType === 'out' ? 'default' : 'outline'} 
                                    onClick={() => setTxnType('out')}
                                    className="flex-1 text-red-700 border-red-200 hover:bg-red-50"
                                >
                                    Barang Keluar
                                </Button>
                            </div>
                        </div>
                        
                        <div className="bg-red-50 p-3 rounded text-xs text-red-800 border border-red-200 mt-2">
                            <p className="font-bold">Konfirmasi:</p>
                            <p>Anda akan menghapus riwayat 
                                <strong> {assetType === 'all' ? 'SEMUA ASET' : assetType === 'aset' ? 'ASET TETAP' : 'PERSEDIAAN'} </strong>
                                dengan tipe transaksi 
                                <strong> {txnType === 'all' ? 'SEMUA' : txnType === 'in' ? 'MASUK' : 'KELUAR'}</strong>.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleConfirm}>Hapus Sekarang</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
