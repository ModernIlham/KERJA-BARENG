import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, RefreshCw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import api from '../../../api/axios';

const formatRupiah = (num) => {
    if (num === null || num === undefined) return '-';
    if (num === 0) return '-';
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

const DafnomSPL = ({ month, year }) => {
    const componentRef = useRef();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState('all');
    
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `DAFNOM_SPL_${selectedBatch === 'all' ? 'ALL' : selectedBatch}_${month}_${year}`,
        pageStyle: `
            @page { size: A4 landscape; margin: 5mm; }
            @media print {
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `
    });

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const res = await api.get(`/api/kepegawaian/overtime/recap-by-spl?month=${monthStr}`);
            setBatches(res.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
        setLoading(false);
    };

    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const monthName = monthNames[parseInt(month) - 1] || "-";

    // Filter batches
    const displayBatches = selectedBatch === 'all' 
        ? batches 
        : batches.filter(b => b.nomor_spl === selectedBatch);

    // Calculate grand totals
    const grandTotals = displayBatches.reduce((acc, batch) => ({
        participants: acc.participants + (batch.participants?.length || 0),
        jam: acc.jam + (batch.participants?.reduce((s, p) => s + (p.duration_hours || 0), 0) || 0),
        uang_lembur: acc.uang_lembur + ((batch.total_gross || 0) - (batch.participants?.reduce((s, p) => s + (p.meal_allowance || 0), 0) || 0)),
        uang_makan: acc.uang_makan + (batch.participants?.reduce((s, p) => s + (p.meal_allowance || 0), 0) || 0),
        jumlah_kotor: acc.jumlah_kotor + (batch.total_gross || 0),
        potongan_pph: acc.potongan_pph + (batch.total_tax || 0),
        jumlah_bersih: acc.jumlah_bersih + (batch.total_net || 0)
    }), { participants: 0, jam: 0, uang_lembur: 0, uang_makan: 0, jumlah_kotor: 0, potongan_pph: 0, jumlah_bersih: 0 });

    // Cell styles (same as DafnomLembur)
    const thStyle = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '3px 2px', 
        fontSize: '8px',
        backgroundColor: '#fff',
        fontWeight: 'bold',
        lineHeight: '1.2'
    };
    const tdStyle = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '3px 2px', 
        fontSize: '8px',
        backgroundColor: '#fff'
    };
    const totalRowStyle = { ...tdStyle, backgroundColor: '#c8e6c9', fontWeight: 'bold', fontSize: '9px' };
    const grandTotalStyle = { ...tdStyle, backgroundColor: '#81c784', fontWeight: 'bold', fontSize: '9px' };

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom SPL...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4 print:hidden">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Pilih SPL:</span>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                        <SelectTrigger className="w-48 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua SPL</SelectItem>
                            {batches.map(b => (
                                <SelectItem key={b.nomor_spl} value={b.nomor_spl}>
                                    {b.nomor_spl}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={fetchData}>
                        <RefreshCw size={16} />
                    </Button>
                </div>
                <Button onClick={handlePrint} className="bg-slate-800 text-white hover:bg-slate-700">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            <div className="bg-white border shadow-sm overflow-x-auto" ref={componentRef}>
                <div style={{ padding: '10px', minWidth: '900px', fontFamily: 'Arial, sans-serif', fontSize: '8px' }}>
                    {/* Title */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR</div>
                        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '8px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                            <div>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</div>
                            <div>BULAN : {monthName} {year}</div>
                        </div>
                        <div>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</div>
                    </div>

                    {batches.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#666', border: '1px solid #ddd', borderRadius: '4px' }}>
                            Tidak ada data SPL untuk bulan ini
                        </div>
                    ) : (
                        <>
                            {/* Table */}
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead>
                                    {/* Row 1: Main Headers */}
                                    <tr>
                                        <th rowSpan={2} style={{...thStyle, width: '25px'}}>NO.<br/>URT</th>
                                        <th rowSpan={2} style={{...thStyle, width: '90px'}}>NOMOR<br/>SPL</th>
                                        <th rowSpan={2} style={{...thStyle, width: '70px'}}>TANGGAL</th>
                                        <th rowSpan={2} style={{...thStyle, width: '140px'}}>Nama</th>
                                        <th rowSpan={2} style={{...thStyle, width: '100px'}}>NIP</th>
                                        <th rowSpan={2} style={{...thStyle, width: '35px'}}>GOL</th>
                                        <th rowSpan={2} style={{...thStyle, width: '35px'}}>JAM</th>
                                        <th rowSpan={2} style={{...thStyle, width: '35px'}}>JML<br/>MAKAN</th>
                                        <th colSpan={2} style={thStyle}>JUMLAH UANG</th>
                                        <th rowSpan={2} style={{...thStyle, width: '75px'}}>JUMLAH<br/>DARI KOLOM<br/>(9+10)</th>
                                        <th rowSpan={2} style={{...thStyle, width: '55px'}}>POT.<br/>PPH</th>
                                        <th rowSpan={2} style={{...thStyle, width: '75px'}}>JUMLAH<br/>BERSIH<br/>(11-12)</th>
                                        <th rowSpan={2} style={{...thStyle, width: '65px'}}>TANDA<br/>TANGAN</th>
                                    </tr>
                                    <tr>
                                        <th style={{...thStyle, width: '70px'}}>LEMBUR</th>
                                        <th style={{...thStyle, width: '60px'}}>MAKAN</th>
                                    </tr>

                                    {/* Row 2: Column Identifiers */}
                                    <tr>
                                        <th style={thStyle}>(1)</th>
                                        <th style={thStyle}>(2)</th>
                                        <th style={thStyle}>(3)</th>
                                        <th style={thStyle}>(4)</th>
                                        <th style={thStyle}>(5)</th>
                                        <th style={thStyle}>(6)</th>
                                        <th style={thStyle}>(7)</th>
                                        <th style={thStyle}>(8)</th>
                                        <th style={thStyle}>(9)</th>
                                        <th style={thStyle}>(10)</th>
                                        <th style={thStyle}>(11)=(9+10)</th>
                                        <th style={thStyle}>(12)</th>
                                        <th style={thStyle}>(13)</th>
                                        <th style={thStyle}>(14)</th>
                                    </tr>
                                </thead>
                                
                                <tbody>
                                    {displayBatches.map((batch, batchIdx) => {
                                        const participants = batch.participants || [];
                                        const batchMeal = participants.reduce((s, p) => s + (p.meal_allowance || 0), 0);
                                        
                                        return (
                                            <React.Fragment key={batch.id || batchIdx}>
                                                {participants.map((p, pIdx) => {
                                                    const uangLembur = (p.gross_pay || 0) - (p.meal_allowance || 0);
                                                    const isFirst = pIdx === 0;
                                                    const rowCount = participants.length;
                                                    
                                                    return (
                                                        <tr key={`${batch.id}-${pIdx}`}>
                                                            {isFirst && (
                                                                <>
                                                                    <td rowSpan={rowCount} style={{...tdStyle, backgroundColor: '#f0f9ff'}}>{batchIdx + 1}</td>
                                                                    <td rowSpan={rowCount} style={{...tdStyle, backgroundColor: '#f0f9ff', fontWeight: 'bold', fontSize: '7px'}}>{batch.nomor_spl}</td>
                                                                    <td rowSpan={rowCount} style={{...tdStyle, backgroundColor: '#f0f9ff', fontSize: '7px'}}>
                                                                        {new Date(batch.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}<br/>
                                                                        <span style={{fontSize: '6px'}}>{batch.start_time}-{batch.end_time}</span>
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td style={{...tdStyle, textAlign: 'left', paddingLeft: '4px'}}>{p.nama_lengkap}</td>
                                                            <td style={{...tdStyle, fontSize: '7px'}}>{p.nip || '-'}</td>
                                                            <td style={tdStyle}>{p.grade || '-'}</td>
                                                            <td style={tdStyle}>{p.duration_hours}</td>
                                                            <td style={tdStyle}>{p.meal_allowance > 0 ? '1' : '0'}</td>
                                                            <td style={{...tdStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(uangLembur)}</td>
                                                            <td style={{...tdStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(p.meal_allowance)}</td>
                                                            <td style={{...tdStyle, textAlign: 'right', paddingRight: '4px', fontWeight: 'bold'}}>{formatRupiah(p.gross_pay)}</td>
                                                            <td style={{...tdStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(p.tax_amount)}</td>
                                                            <td style={{...tdStyle, textAlign: 'right', paddingRight: '4px', fontWeight: 'bold'}}>{formatRupiah(p.net_pay)}</td>
                                                            <td style={tdStyle}></td>
                                                        </tr>
                                                    );
                                                })}
                                                
                                                {/* Sub Total per SPL */}
                                                <tr>
                                                    <td colSpan={6} style={{...totalRowStyle, textAlign: 'right', paddingRight: '8px'}}>
                                                        Sub Total {batch.nomor_spl}:
                                                    </td>
                                                    <td style={totalRowStyle}>{batch.duration_hours * participants.length}</td>
                                                    <td style={totalRowStyle}>{participants.filter(p => p.meal_allowance > 0).length}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah((batch.total_gross || 0) - batchMeal)}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(batchMeal)}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(batch.total_gross)}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(batch.total_tax)}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(batch.total_net)}</td>
                                                    <td style={totalRowStyle}></td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                    
                                    {/* Grand Total */}
                                    <tr>
                                        <td colSpan={6} style={{...grandTotalStyle, textAlign: 'right', paddingRight: '8px'}}>
                                            JUMLAH TOTAL ({displayBatches.length} SPL, {grandTotals.participants} orang):
                                        </td>
                                        <td style={grandTotalStyle}>{Math.round(grandTotals.jam)}</td>
                                        <td style={grandTotalStyle}>{displayBatches.reduce((s, b) => s + (b.participants?.filter(p => p.meal_allowance > 0).length || 0), 0)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(grandTotals.uang_lembur)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(grandTotals.uang_makan)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(grandTotals.jumlah_kotor)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(grandTotals.potongan_pph)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '4px'}}>{formatRupiah(grandTotals.jumlah_bersih)}</td>
                                        <td style={grandTotalStyle}></td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* Footer */}
                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'center', fontSize: '8px', width: '160px' }}>
                            <div>Mengetahui:</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Pejabat Pembuat Komitmen</div>
                            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>AMBAR TRI BAWONO</div>
                            <div>NIP. 198112082009011008</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DafnomSPL;
