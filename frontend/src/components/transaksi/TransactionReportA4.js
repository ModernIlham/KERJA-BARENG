import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Printer, Download, X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

/**
 * TransactionReportA4
 * 
 * A4-sized printable report dialog for transactions
 */
export default function TransactionReportA4({ open, onClose, transaction }) {
  const printRef = useRef(null);

  if (!transaction) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy', { locale: localeId });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy, HH:mm', { locale: localeId });
    } catch {
      return dateStr;
    }
  };

  const getTransactionTitle = (jenis) => {
    const titles = {
      'MASUK': 'BUKTI PENERIMAAN BARANG',
      'KELUAR': 'BUKTI PENGELUARAN BARANG',
      'DISTRIBUSI': 'BUKTI DISTRIBUSI ASET',
      'REKLASIFIKASI_KELUAR': 'BUKTI REKLASIFIKASI BMN (KELUAR)',
      'REKLASIFIKASI_MASUK': 'BUKTI REKLASIFIKASI BMN (MASUK)',
      'PERUBAHAN_KUANTITAS': 'BUKTI PERUBAHAN KUANTITAS',
      'PERUBAHAN_KONDISI': 'BUKTI PERUBAHAN KONDISI',
      'KOREKSI_NILAI_BMN': 'BUKTI KOREKSI NILAI BMN',
      'KOREKSI_NILAI_KDP': 'BUKTI KOREKSI NILAI KDP',
      'REKLASIFIKASI_KDP': 'BUKTI REKLASIFIKASI KDP',
      'TRANSFER_MASUK': 'BUKTI TRANSFER MASUK',
      'TRANSFER_KELUAR': 'BUKTI TRANSFER KELUAR'
    };
    return titles[jenis] || 'BUKTI TRANSAKSI';
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '', 'width=800,height=600');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${getTransactionTitle(transaction.jenis)}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { 
              font-family: 'Times New Roman', serif; 
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
            }
            .report-container { max-width: 210mm; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { font-size: 14pt; font-weight: bold; margin: 5px 0; }
            .header h2 { font-size: 16pt; font-weight: bold; margin: 10px 0; letter-spacing: 2px; }
            .header p { font-size: 10pt; margin: 3px 0; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
            .info-row { display: flex; margin-bottom: 5px; }
            .info-label { width: 180px; font-weight: 500; }
            .info-value { flex: 1; }
            .info-value.mono { font-family: 'Courier New', monospace; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 40px; }
            .signature-box { width: 200px; text-align: center; }
            .signature-line { border-bottom: 1px solid #000; height: 60px; margin-bottom: 5px; }
            .footer { margin-top: 30px; font-size: 9pt; text-align: center; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10pt; font-weight: bold; }
            .badge-green { background: #d1fae5; color: #065f46; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .badge-orange { background: #ffedd5; color: #9a3412; }
            .arrow { font-size: 18pt; margin: 0 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const renderTransactionDetails = () => {
    const jenis = transaction.jenis;

    if (jenis === 'REKLASIFIKASI_KELUAR' || jenis === 'REKLASIFIKASI_MASUK') {
      return (
        <>
          <div className="section">
            <div className="section-title">DETAIL REKLASIFIKASI</div>
            <table>
              <tbody>
                <tr>
                  <td style={{ width: '30%' }}>Golongan Awal</td>
                  <td><strong>{transaction.golongan_awal || '-'}</strong></td>
                </tr>
                <tr>
                  <td>Golongan Baru</td>
                  <td><strong>{transaction.golongan_baru || '-'}</strong></td>
                </tr>
                <tr>
                  <td>Kode Barang Lama</td>
                  <td className="mono">{transaction.kode_barang_lama || transaction.kode_barang || '-'}</td>
                </tr>
                <tr>
                  <td>Kode Barang Baru</td>
                  <td className="mono"><strong>{transaction.kode_barang_baru || '-'}</strong></td>
                </tr>
                <tr>
                  <td>Alasan Reklasifikasi</td>
                  <td>{transaction.alasan_reklasifikasi || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (jenis === 'PERUBAHAN_KUANTITAS') {
      return (
        <div className="section">
          <div className="section-title">DETAIL PERUBAHAN KUANTITAS</div>
          <table>
            <tbody>
              <tr>
                <td style={{ width: '30%' }}>Kuantitas Awal</td>
                <td>{transaction.kuantitas_awal || 0}</td>
              </tr>
              <tr>
                <td>Perubahan</td>
                <td>{transaction.sub_jenis === 'BERTAMBAH' ? '+' : '-'}{transaction.kuantitas_perubahan || 0}</td>
              </tr>
              <tr>
                <td>Kuantitas Akhir</td>
                <td><strong>{transaction.kuantitas_akhir || 0}</strong></td>
              </tr>
              <tr>
                <td>Alasan</td>
                <td>{transaction.alasan || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (jenis === 'PERUBAHAN_KONDISI') {
      return (
        <div className="section">
          <div className="section-title">DETAIL PERUBAHAN KONDISI</div>
          <table>
            <tbody>
              <tr>
                <td style={{ width: '30%' }}>Kondisi Awal</td>
                <td>{transaction.kondisi_awal || '-'}</td>
              </tr>
              <tr>
                <td>Kondisi Akhir</td>
                <td><strong>{transaction.kondisi_akhir || '-'}</strong></td>
              </tr>
              <tr>
                <td>Penyebab</td>
                <td>{transaction.penyebab || '-'}</td>
              </tr>
              <tr>
                <td>Tanggal Kejadian</td>
                <td>{formatDate(transaction.tanggal_kejadian)}</td>
              </tr>
              <tr>
                <td>Lokasi Kejadian</td>
                <td>{transaction.lokasi_kejadian || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (jenis === 'KOREKSI_NILAI_BMN' || jenis === 'KOREKSI_NILAI_KDP') {
      return (
        <div className="section">
          <div className="section-title">DETAIL KOREKSI NILAI</div>
          <table>
            <tbody>
              <tr>
                <td style={{ width: '30%' }}>Nilai Perolehan Awal</td>
                <td className="text-right">{formatCurrency(transaction.nilai_perolehan_awal || 0)}</td>
              </tr>
              <tr>
                <td>Nilai Buku Awal</td>
                <td className="text-right">{formatCurrency(transaction.nilai_buku_awal || 0)}</td>
              </tr>
              <tr>
                <td>Koreksi ({transaction.sub_jenis === 'BERTAMBAH' ? 'Bertambah' : 'Berkurang'})</td>
                <td className="text-right">{formatCurrency(transaction.nilai_koreksi || 0)}</td>
              </tr>
              <tr>
                <td>Nilai Perolehan Akhir</td>
                <td className="text-right"><strong>{formatCurrency(transaction.nilai_perolehan_akhir || 0)}</strong></td>
              </tr>
              <tr>
                <td>Nilai Buku Akhir</td>
                <td className="text-right"><strong>{formatCurrency(transaction.nilai_buku_akhir || 0)}</strong></td>
              </tr>
              <tr>
                <td>Dasar Koreksi</td>
                <td>{transaction.dasar_koreksi || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    // Default for MASUK/KELUAR/DISTRIBUSI
    return (
      <div className="section">
        <div className="section-title">DETAIL TRANSAKSI</div>
        <table>
          <tbody>
            <tr>
              <td style={{ width: '30%' }}>Jumlah</td>
              <td>{transaction.jumlah || 1}</td>
            </tr>
            <tr>
              <td>Nilai Satuan</td>
              <td className="text-right">{formatCurrency(transaction.nilai_satuan || 0)}</td>
            </tr>
            <tr>
              <td>Total Nilai</td>
              <td className="text-right"><strong>{formatCurrency(transaction.total_nilai || 0)}</strong></td>
            </tr>
            {transaction.nama_pegawai && (
              <tr>
                <td>Penerima</td>
                <td>{transaction.nama_pegawai}</td>
              </tr>
            )}
            {transaction.unit_penerima && (
              <tr>
                <td>Unit Penerima</td>
                <td>{transaction.unit_penerima}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Laporan Transaksi</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Cetak
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* A4 Report Preview */}
        <div 
          ref={printRef}
          className="bg-white p-8 shadow-lg mx-auto"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
            fontFamily: "'Times New Roman', serif"
          }}
        >
          {/* Header */}
          <div className="header text-center border-b-2 border-black pb-3 mb-5">
            <h1 className="text-sm font-bold">PEMERINTAH KABUPATEN/KOTA</h1>
            <h1 className="text-sm font-bold">DINAS/BADAN/UNIT KERJA</h1>
            <h2 className="text-lg font-bold tracking-wider mt-3 mb-2">
              {getTransactionTitle(transaction.jenis)}
            </h2>
            <p className="text-xs">Nomor: {transaction.no_sppa || transaction.id?.substring(0, 8).toUpperCase() || '-'}</p>
          </div>

          {/* Transaction Info */}
          <div className="section mb-4">
            <div className="section-title font-bold border-b border-gray-300 pb-1 mb-2">
              INFORMASI TRANSAKSI
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div className="info-row flex">
                <span className="info-label w-40">Jenis Transaksi</span>
                <span className="info-value">: {transaction.jenis?.replace(/_/g, ' ')}</span>
              </div>
              <div className="info-row flex">
                <span className="info-label w-40">Status</span>
                <span className="info-value">
                  : <span className={`badge ${transaction.status === 'COMPLETED' ? 'badge-green' : 'badge-orange'}`}>
                    {transaction.status || 'COMPLETED'}
                  </span>
                </span>
              </div>
              <div className="info-row flex">
                <span className="info-label w-40">Tanggal Transaksi</span>
                <span className="info-value">: {formatDate(transaction.tanggal_transaksi || transaction.created_at)}</span>
              </div>
              <div className="info-row flex">
                <span className="info-label w-40">Petugas</span>
                <span className="info-value">: {transaction.petugas || '-'}</span>
              </div>
            </div>
          </div>

          {/* Asset Info */}
          <div className="section mb-4">
            <div className="section-title font-bold border-b border-gray-300 pb-1 mb-2">
              DATA ASET
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-2 w-1/3 bg-gray-50">Kode Barang</td>
                  <td className="border border-gray-400 p-2 font-mono font-bold">{transaction.kode_barang || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 bg-gray-50">NUP</td>
                  <td className="border border-gray-400 p-2">{transaction.nup || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 bg-gray-50">Nama Barang</td>
                  <td className="border border-gray-400 p-2 font-bold">{transaction.nama_barang || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 bg-gray-50">Nilai Perolehan</td>
                  <td className="border border-gray-400 p-2 text-right">{formatCurrency(transaction.nilai_perolehan || transaction.total_nilai || 0)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 bg-gray-50">Nilai Buku</td>
                  <td className="border border-gray-400 p-2 text-right">{formatCurrency(transaction.nilai_buku || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transaction-specific details */}
          {renderTransactionDetails()}

          {/* Keterangan */}
          {transaction.keterangan && (
            <div className="section mb-4">
              <div className="section-title font-bold border-b border-gray-300 pb-1 mb-2">
                KETERANGAN
              </div>
              <p className="text-sm p-2 bg-gray-50 border rounded">{transaction.keterangan}</p>
            </div>
          )}

          {/* Signature Section */}
          <div className="signature-section flex justify-between mt-12 text-sm">
            <div className="signature-box text-center w-48">
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala Unit</p>
              <div className="signature-line h-16 border-b border-black mt-16 mb-1"></div>
              <p>NIP. ........................</p>
            </div>
            <div className="signature-box text-center w-48">
              <p>Dibuat di: ..................</p>
              <p>Tanggal: {formatDate(new Date())}</p>
              <p className="font-bold mt-2">Petugas</p>
              <div className="signature-line h-16 border-b border-black mt-10 mb-1"></div>
              <p>{transaction.petugas || '........................'}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="footer mt-8 text-xs text-center text-gray-500 border-t border-gray-300 pt-3">
            <p>Dokumen ini dicetak dari Sistem Informasi Manajemen Aset (SIMAN)</p>
            <p>Dicetak pada: {formatDateTime(new Date())}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
