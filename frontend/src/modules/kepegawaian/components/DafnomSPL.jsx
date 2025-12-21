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
    const [data, setData] = useState(null);
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
            setData(res.data || {});
        } catch (err) {
            console.error('Error fetching data:', err);
        }
        setLoading(false);
    };

    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const monthName = monthNames[parseInt(month) - 1] || "-";

    const batches = data?.batches || [];
    const holidays = data?.holidays || [];
    const daysInMonth = data?.days_in_month || 31;

    // Filter batches
    const displayBatches = selectedBatch === 'all' 
        ? batches 
        : batches.filter(b => b.nomor_spl === selectedBatch);

    // Calculate grand totals
    const grandTotals = displayBatches.reduce((acc, batch) => ({
        participants: acc.participants + (batch.participants?.length || 0),
        jam_kerja: acc.jam_kerja + (batch.participants?.reduce((s, p) => s + (p.jam_hari_kerja || 0), 0) || 0),
        jam_libur: acc.jam_libur + (batch.participants?.reduce((s, p) => s + (p.jam_hari_libur || 0), 0) || 0),
        uang_lembur: acc.uang_lembur + ((batch.total_gross || 0) - (batch.participants?.reduce((s, p) => s + (p.meal_allowance || 0), 0) || 0)),
        uang_makan: acc.uang_makan + (batch.participants?.reduce((s, p) => s + (p.meal_allowance || 0), 0) || 0),
        jumlah_kotor: acc.jumlah_kotor + (batch.total_gross || 0),
        potongan_pph: acc.potongan_pph + (batch.total_tax || 0),
        jumlah_bersih: acc.jumlah_bersih + (batch.total_net || 0)
    }), { participants: 0, jam_kerja: 0, jam_libur: 0, uang_lembur: 0, uang_makan: 0, jumlah_kotor: 0, potongan_pph: 0, jumlah_bersih: 0 });

    const isHoliday = (day) => holidays.includes(day);

    // Days split: 1-16 (first row), 17-31+1empty (second row) = 16 columns each
    const days1to16 = Array.from({ length: 16 }, (_, i) => i + 1);
    const days17to31 = Array.from({ length: 15 }, (_, i) => i + 17);

    // Cell styles (same as DafnomLembur)
    const thStyle = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '2px 1px', 
        fontSize: '7px',
        backgroundColor: '#fff',
        fontWeight: 'bold',
        lineHeight: '1.2'
    };
    const tdStyle = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '2px 1px', 
        fontSize: '7px',
        backgroundColor: '#fff'
    };
    const dayColStyle = { ...thStyle, width: '18px', minWidth: '18px', maxWidth: '18px', padding: '1px' };
    const holidayBg = { backgroundColor: '#ffcccc' };
    const totalRowStyle = { ...tdStyle, backgroundColor: '#c8e6c9', fontWeight: 'bold', fontSize: '8px' };
    const grandTotalStyle = { ...tdStyle, backgroundColor: '#81c784', fontWeight: 'bold', fontSize: '8px' };
    const splColStyle = { ...tdStyle, backgroundColor: '#e3f2fd' };

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
                <div style={{ padding: '10px', minWidth: '1200px', fontFamily: 'Arial, sans-serif', fontSize: '8px' }}>
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
                            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '22px' }} /> {/* NO URT */}
                                    <col style={{ width: '80px' }} /> {/* NO SPL */}
                                    <col style={{ width: '70px' }} /> {/* Nama */}
                                    <col style={{ width: '75px' }} /> {/* NIP */}
                                    <col style={{ width: '22px' }} /> {/* GOL */}
                                    {Array(16).fill(null).map((_, i) => <col key={i} style={{ width: '18px' }} />)} {/* 16 date columns */}
                                    <col style={{ width: '26px' }} /> {/* Hari Kerja */}
                                    <col style={{ width: '26px' }} /> {/* Hari Libur */}
                                    <col style={{ width: '26px' }} /> {/* Jml Makan */}
                                    <col style={{ width: '55px' }} /> {/* Uang Lembur */}
                                    <col style={{ width: '50px' }} /> {/* Uang Makan */}
                                    <col style={{ width: '58px' }} /> {/* Jumlah Kolom */}
                                    <col style={{ width: '45px' }} /> {/* Pot PPH */}
                                    <col style={{ width: '58px' }} /> {/* Jml Bersih */}
                                    <col style={{ width: '50px' }} /> {/* TTD */}
                                </colgroup>
                                <thead>
                                    {/* Row 1: Main Headers */}
                                    <tr>
                                        <th rowSpan={3} style={thStyle}>NO.<br/>URT</th>
                                        <th rowSpan={3} style={thStyle}>NOMOR<br/>SPL</th>
                                        <th rowSpan={3} style={thStyle}>Nama</th>
                                        <th rowSpan={3} style={thStyle}>NIP</th>
                                        <th rowSpan={3} style={thStyle}>GOL</th>
                                        <th colSpan={16} style={thStyle}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                        <th colSpan={2} style={thStyle}>JUMLAH JAM</th>
                                        <th rowSpan={3} style={thStyle}>JML<br/>MAKAN<br/>LEMBUR</th>
                                        <th colSpan={2} style={thStyle}>JUMLAH UANG</th>
                                        <th rowSpan={3} style={thStyle}>JUMLAH<br/>DARI<br/>KOLOM<br/>(10+11)</th>
                                        <th rowSpan={3} style={thStyle}>POT.<br/>PPH</th>
                                        <th rowSpan={3} style={thStyle}>JUMLAH<br/>BERSIH<br/>(12-13)</th>
                                        <th rowSpan={3} style={thStyle}>TANDA<br/>TANGAN</th>
                                    </tr>

                                    {/* Row 2: Days 1-16 + Sub-headers (rowSpan=2) */}
                                    <tr>
                                        {days1to16.map(day => {
                                            const valid = day <= daysInMonth;
                                            const holiday = valid && isHoliday(day);
                                            return (
                                                <th key={day} style={{...dayColStyle, ...(holiday ? holidayBg : {})}}>
                                                    {valid ? `${day}${holiday ? '-' : '+'}` : ''}
                                                </th>
                                            );
                                        })}
                                        <th rowSpan={2} style={thStyle}>HARI<br/>KERJA</th>
                                        <th rowSpan={2} style={thStyle}>HARI<br/>LIBUR</th>
                                        <th rowSpan={2} style={thStyle}>LEMBUR</th>
                                        <th rowSpan={2} style={thStyle}>MAKAN</th>
                                    </tr>

                                    {/* Row 3: Days 17-31 + 1 empty cell */}
                                    <tr>
                                        {days17to31.map(day => {
                                            const valid = day <= daysInMonth;
                                            const holiday = valid && isHoliday(day);
                                            return (
                                                <th key={day} style={{...dayColStyle, ...(holiday ? holidayBg : {})}}>
                                                    {valid ? `${day}${holiday ? '-' : '+'}` : ''}
                                                </th>
                                            );
                                        })}
                                        {/* 1 empty cell to make 16 columns */}
                                        <th style={dayColStyle}></th>
                                    </tr>

                                    {/* Row 4: All Column Identifiers */}
                                    <tr>
                                        <th style={thStyle}>(1)</th>
                                        <th style={thStyle}>(2)</th>
                                        <th style={thStyle}>(3)</th>
                                        <th style={thStyle}>(4)</th>
                                        <th style={thStyle}>(5)</th>
                                        <th colSpan={16} style={{...thStyle, fontStyle: 'italic', fontSize: '6px'}}>(6) tanda "-" = Libur ; tanda "+" = Kerja</th>
                                        <th style={thStyle}>(7)</th>
                                        <th style={thStyle}>(8)</th>
                                        <th style={thStyle}>(9)</th>
                                        <th style={thStyle}>(10)</th>
                                        <th style={thStyle}>(11)</th>
                                        <th style={thStyle}>(12)=(10+11)</th>
                                        <th style={thStyle}>(13)</th>
                                        <th style={thStyle}>(14)</th>
                                        <th style={thStyle}>(15)</th>
                                    </tr>
                                </thead>
                                
                                <tbody>
                                    {displayBatches.map((batch, batchIdx) => {
                                        const participants = batch.participants || [];
                                        const batchMeal = participants.reduce((s, p) => s + (p.meal_allowance || 0), 0);
                                        const batchJamKerja = participants.reduce((s, p) => s + (p.jam_hari_kerja || 0), 0);
                                        const batchJamLibur = participants.reduce((s, p) => s + (p.jam_hari_libur || 0), 0);
                                        
                                        // Get day from batch date (YYYY-MM-DD)
                                        const batchDay = batch.date ? parseInt(batch.date.split('-')[2]) : null;
                                        const batchIsHoliday = batchDay && isHoliday(batchDay);
                                        
                                        return (
                                            <React.Fragment key={batch.id || batchIdx}>
                                                {participants.map((p, pIdx) => {
                                                    const uangLembur = (p.gross_pay || 0) - (p.meal_allowance || 0);
                                                    const isFirst = pIdx === 0;
                                                    const rowCount = participants.length;
                                                    
                                                    return (
                                                        <React.Fragment key={`${batch.id}-${pIdx}`}>
                                                            {/* Data Row 1: Days 1-16 */}
                                                            <tr>
                                                                {isFirst && (
                                                                    <>
                                                                        <td rowSpan={rowCount * 2} style={{...splColStyle, fontWeight: 'bold'}}>{batchIdx + 1}</td>
                                                                        <td rowSpan={rowCount * 2} style={{...splColStyle, fontSize: '6px', fontWeight: 'bold'}}>{batch.nomor_spl}</td>
                                                                    </>
                                                                )}
                                                                <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '6px', paddingLeft: '2px'}}>{p.nama_lengkap}</td>
                                                                <td rowSpan={2} style={{...tdStyle, fontSize: '6px'}}>{p.nip || '-'}</td>
                                                                <td rowSpan={2} style={tdStyle}>{p.grade || '-'}</td>
                                                                
                                                                {/* Days 1-16 - show hours only on the batch day */}
                                                                {days1to16.map(day => {
                                                                    const valid = day <= daysInMonth;
                                                                    const holiday = valid && isHoliday(day);
                                                                    const hours = (valid && batchDay === day) ? (p.duration_hours || 0) : 0;
                                                                    return (
                                                                        <td key={day} style={{...tdStyle, ...dayColStyle, ...(holiday ? holidayBg : {})}}>
                                                                            {valid ? (hours > 0 ? Math.round(hours) : 0) : ''}
                                                                        </td>
                                                                    );
                                                                })}
                                                                
                                                                <td rowSpan={2} style={tdStyle}>{Math.round(p.jam_hari_kerja || 0)}</td>
                                                                <td rowSpan={2} style={tdStyle}>{Math.round(p.jam_hari_libur || 0)}</td>
                                                                <td rowSpan={2} style={tdStyle}>{p.meal_allowance > 0 ? '1' : '0'}</td>
                                                                <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(uangLembur)}</td>
                                                                <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(p.meal_allowance)}</td>
                                                                <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold', paddingRight: '2px'}}>{formatRupiah(p.gross_pay)}</td>
                                                                <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(p.tax_amount)}</td>
                                                                <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold', paddingRight: '2px'}}>{formatRupiah(p.net_pay)}</td>
                                                                <td rowSpan={2} style={tdStyle}></td>
                                                            </tr>
                                                            
                                                            {/* Data Row 2: Days 17-31 + 1 empty */}
                                                            <tr>
                                                                {days17to31.map(day => {
                                                                    const valid = day <= daysInMonth;
                                                                    const holiday = valid && isHoliday(day);
                                                                    const hours = (valid && batchDay === day) ? (p.duration_hours || 0) : 0;
                                                                    return (
                                                                        <td key={day} style={{...tdStyle, ...dayColStyle, ...(holiday ? holidayBg : {})}}>
                                                                            {valid ? (hours > 0 ? Math.round(hours) : 0) : ''}
                                                                        </td>
                                                                    );
                                                                })}
                                                                {/* 1 empty cell */}
                                                                <td style={{...tdStyle, ...dayColStyle}}></td>
                                                            </tr>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                
                                                {/* Sub Total per SPL */}
                                                <tr>
                                                    <td colSpan={5} style={{...totalRowStyle, textAlign: 'right', paddingRight: '4px'}}>
                                                        Sub Total {batch.nomor_spl}:
                                                    </td>
                                                    <td colSpan={16} style={totalRowStyle}></td>
                                                    <td style={totalRowStyle}>{Math.round(batchJamKerja)}</td>
                                                    <td style={totalRowStyle}>{Math.round(batchJamLibur)}</td>
                                                    <td style={totalRowStyle}>{participants.filter(p => p.meal_allowance > 0).length}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah((batch.total_gross || 0) - batchMeal)}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(batchMeal)}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(batch.total_gross)}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(batch.total_tax)}</td>
                                                    <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(batch.total_net)}</td>
                                                    <td style={totalRowStyle}></td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                    
                                    {/* Grand Total */}
                                    <tr>
                                        <td colSpan={5} style={{...grandTotalStyle, textAlign: 'right', paddingRight: '4px'}}>
                                            JUMLAH TOTAL ({displayBatches.length} SPL, {grandTotals.participants} orang):
                                        </td>
                                        <td colSpan={16} style={grandTotalStyle}></td>
                                        <td style={grandTotalStyle}>{Math.round(grandTotals.jam_kerja)}</td>
                                        <td style={grandTotalStyle}>{Math.round(grandTotals.jam_libur)}</td>
                                        <td style={grandTotalStyle}>{displayBatches.reduce((s, b) => s + (b.participants?.filter(p => p.meal_allowance > 0).length || 0), 0)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.uang_lembur)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.uang_makan)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.jumlah_kotor)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.potongan_pph)}</td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.jumlah_bersih)}</td>
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
