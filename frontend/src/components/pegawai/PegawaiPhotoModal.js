import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import PegawaiPhotoUpload from './PegawaiPhotoUpload';

export default function PegawaiPhotoModal({ isOpen, onClose, pegawai, onSuccess }) {
    if (!pegawai) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Foto Profil Pegawai</DialogTitle>
                </DialogHeader>
                
                <div className="py-4">
                    <PegawaiPhotoUpload 
                        pegawai={pegawai} 
                        onSuccess={() => {
                            onSuccess();
                            // Optional: Close modal on success or keep open
                        }} 
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
