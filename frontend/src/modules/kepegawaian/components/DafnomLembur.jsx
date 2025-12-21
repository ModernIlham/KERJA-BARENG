import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatRupiah = (num) => {
    if (num === null || num === undefined) return '-';
    if (num === 0) return '-';
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

const DafnomLembur = ({ month, year }) => {
    const componentRef = useRef();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `DAFNOM_LEMBUR_${month}_${year}`,
        pageStyle: `
            @page { size: A4 landscape; margin: 5mm; }
            @media print {
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `
    });

    useEffect(() => {
        fetchDafnomData();
    }, [month, year]);

    const fetchDafnomData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const res = await fetch(`${API_URL}/api/kepegawaian/overtime/dafnom?month=${monthStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error('Error fetching dafnom:', err);
        }
        setLoading(false);
    };

    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const monthName = monthNames[parseInt(month) - 1] || "-";
    
    const daysInMonth = data?.days_in_month || 31;
    const holidays = data?.holidays || [];
    const employees = data?.employees || [];

    const totals = {
        jam_kerja: employees.reduce((acc, e) => acc + (e.jam_hari_kerja || 0), 0),
        jam_libur: employees.reduce((acc, e) => acc + (e.jam_hari_libur || 0), 0),
        jumlah_makan: employees.reduce((acc, e) => acc + (e.jumlah_makan || 0), 0),
        uang_lembur: employees.reduce((acc, e) => acc + (e.uang_lembur || 0), 0),
        uang_makan: employees.reduce((acc, e) => acc + (e.uang_makan || 0), 0),
        jumlah_kotor: employees.reduce((acc, e) => acc + (e.jumlah_kotor || 0), 0),
        potongan_pph: employees.reduce((acc, e) => acc + (e.potongan_pph || 0), 0),
        jumlah_bersih: employees.reduce((acc, e) => acc + (e.jumlah_bersih || 0), 0),
    };

    const isHoliday = (day) => holidays.includes(day);
    
    const days1to15 = Array.from({ length: 15 }, (_, i) => i + 1);
    const days16to31 = Array.from({ length: 16 }, (_, i) => i + 16);

    // Consistent cell styles
    const baseCell = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '3px 2px', 
        fontSize: '6px',
        backgroundColor: '#fff',
        lineHeight: '1.2'
    };
    const dayCell = { ...baseCell, width: '14px', minWidth: '14px', maxWidth: '14px', padding: '2px 1px' };
    const holidayBg = { backgroundColor: '#ffcccc' };

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom...</div>;
    }

    return (
        <div>
            <div className="flex justify-end mb-4 print:hidden">
                <Button onClick={handlePrint} className="bg-slate-800 text-white hover:bg-slate-700">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            <div className="bg-white border shadow-sm overflow-x-auto" ref={componentRef}>
                <div style={{ padding: '10px', minWidth: '1000px', fontFamily: 'Arial, sans-serif', fontSize: '7px' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR</div>
                        <div style={{ fontWeight: 'bold', fontSize: '8px' }}>LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '7px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                            <div>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</div>
                            <div>BULAN : {monthName} {year}</div>
                        </div>
                        <div>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</div>
                    </div>

                    {/* Main Table - Simplified structure with 4 header rows */}
                    <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '22px' }} />  {/* NO URT */}
                            <col style={{ width: '60px' }} />  {/* Nama */}
                            <col style={{ width: '70px' }} />  {/* NIP */}
                            <col style={{ width: '20px' }} />  {/* GOL */}
                            {/* 16 day columns */}
                            {Array(16).fill(null).map((_, i) => <col key={i} style={{ width: '14px' }} />)}
                            <col style={{ width: '22px' }} />  {/* Hari Kerja */}
                            <col style={{ width: '22px' }} />  {/* Hari Libur */}
                            <col style={{ width: '22px' }} />  {/* Jml Makan */}
                            <col style={{ width: '50px' }} />  {/* Uang Lembur */}
                            <col style={{ width: '45px' }} />  {/* Uang Makan */}
                            <col style={{ width: '55px' }} />  {/* Jml Kolom */}
                            <col style={{ width: '40px' }} />  {/* PPH */}
                            <col style={{ width: '55px' }} />  {/* Bersih */}
                            <col style={{ width: '55px' }} />  {/* TTD */}
                        </colgroup>
                        <thead>
                            {/* Row 1: Main Headers */}
                            <tr style={{ height: '36px' }}>
                                <th rowSpan={4} style={baseCell}>NO.<br/>URT</th>
                                <th rowSpan={4} style={baseCell}>Nama</th>
                                <th rowSpan={4} style={baseCell}>NIP</th>
                                <th rowSpan={4} style={baseCell}>GOL</th>
                                <th colSpan={16} style={baseCell}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan={2} style={baseCell}>JUMLAH<br/>JAM</th>
                                <th rowSpan={2} style={baseCell}>JML<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan={2} style={baseCell}>JUMLAH UANG</th>
                                <th rowSpan={2} style={baseCell}>JUMLAH<br/>DARI<br/>KOLOM<br/>(9+10)</th>
                                <th rowSpan={2} style={baseCell}>POT.<br/>PPH</th>
                                <th rowSpan={2} style={baseCell}>JUMLAH<br/>BERSIH<br/>(11-12)</th>
                                <th rowSpan={4} style={baseCell}>TANDA<br/>TANGAN<br/>/<br/>NO REK</th>
                            </tr>

                            {/* Row 2: Day headers 1-15 + empty + Sub-headers */}
                            <tr style={{ height: '20px' }}>
                                {days1to15.map(day => (
                                    <th key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                                <th style={dayCell}></th>
                                <th style={baseCell}>HARI<br/>KERJA</th>
                                <th style={baseCell}>HARI<br/>LIBUR</th>
                                <th style={baseCell}>LEMBUR</th>
                                <th style={baseCell}>MAKAN</th>
                            </tr>

                            {/* Row 3: Day headers 16-31 + column numbers 6-13 */}
                            <tr style={{ height: '20px' }}>
                                {days16to31.map(day => {
                                    const valid = day <= daysInMonth;
                                    return (
                                        <th key={day} style={{...dayCell, ...(valid && isHoliday(day) ? holidayBg : {})}}>
                                            {valid ? `${day}${isHoliday(day) ? '-' : '+'}` : ''}
                                        </th>
                                    );
                                })}
                                <th style={baseCell}>(6)</th>
                                <th style={baseCell}>(7)</th>
                                <th style={baseCell}>(8)</th>
                                <th style={baseCell}>(9)</th>
                                <th style={baseCell}>(10)</th>
                                <th style={baseCell}>(11)</th>
                                <th style={baseCell}>(12)</th>
                                <th style={baseCell}>(13)</th>
                            </tr>

                            {/* Row 4: Note + column numbers 1-4, 5, 14 */}
                            <tr style={{ height: '18px' }}>
                                <th colSpan={16} style={{...baseCell, fontStyle: 'italic', fontSize: '5px'}}>
                                    (5) tanda "-" = Libur ; tanda "+" = Kerja
                                </th>
                                <th colSpan={8} style={baseCell}></th>
                            </tr>

                            {/* Row 5: Column identifiers for 1-4 and 14 */}
                            <tr style={{ height: '16px' }}>
                                <th style={baseCell}>(1)</th>
                                <th style={baseCell}>(2)</th>
                                <th style={baseCell}>(3)</th>
                                <th style={baseCell}>(4)</th>
                                <th colSpan={16} style={baseCell}></th>
                                <th colSpan={8} style={baseCell}></th>
                                <th style={baseCell}>(14)</th>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={29} style={{...baseCell, padding: '15px', color: '#666'}}>
                                        Tidak ada data lembur yang disetujui untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, idx) => (
                                    <React.Fragment key={emp.pegawai_id || idx}>
                                        {/* Employee Row 1: Days 1-15 */}
                                        <tr style={{ height: '20px' }}>
                                            <td rowSpan={2} style={baseCell}>{idx + 1}</td>
                                            <td rowSpan={2} style={{...baseCell, textAlign: 'left', fontSize: '5px'}}>{emp.nama}</td>
                                            <td rowSpan={2} style={{...baseCell, textAlign: 'left', fontSize: '5px'}}>{emp.nip || '-'}</td>
                                            <td rowSpan={2} style={baseCell}>{emp.golongan?.split('/')[0] || '-'}</td>
                                            
                                            {days1to15.map(day => {
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                            <td style={dayCell}></td>
                                            
                                            <td rowSpan={2} style={baseCell}>{Math.round(emp.jam_hari_kerja || 0)}</td>
                                            <td rowSpan={2} style={baseCell}>{Math.round(emp.jam_hari_libur || 0)}</td>
                                            <td rowSpan={2} style={baseCell}>{emp.jumlah_makan || 0}</td>
                                            <td rowSpan={2} style={{...baseCell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.uang_lembur)}</td>
                                            <td rowSpan={2} style={{...baseCell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.uang_makan)}</td>
                                            <td rowSpan={2} style={{...baseCell, textAlign: 'right', fontSize: '5px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                            <td rowSpan={2} style={{...baseCell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.potongan_pph)}</td>
                                            <td rowSpan={2} style={{...baseCell, textAlign: 'right', fontSize: '5px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                            <td rowSpan={2} style={{...baseCell, fontSize: '5px'}}>
                                                {emp.bank_account || '-'}<br/>{emp.bank_name || 'Mandiri'}
                                            </td>
                                        </tr>
                                        
                                        {/* Employee Row 2: Days 16-31 */}
                                        <tr style={{ height: '20px' }}>
                                            {days16to31.map(day => {
                                                const valid = day <= daysInMonth;
                                                const hours = valid ? (emp.daily_hours?.[String(day)]?.hours || 0) : 0;
                                                return (
                                                    <td key={day} style={{...dayCell, ...(valid && isHoliday(day) ? holidayBg : {})}}>
                                                        {valid ? (hours > 0 ? Math.round(hours) : 0) : ''}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                            
                            {/* Total Row */}
                            <tr style={{ height: '22px', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                <td colSpan={4} style={baseCell}>JUMLAH TOTAL</td>
                                <td colSpan={16} style={baseCell}></td>
                                <td style={baseCell}>{Math.round(totals.jam_kerja)}</td>
                                <td style={baseCell}>{Math.round(totals.jam_libur)}</td>
                                <td style={baseCell}>{totals.jumlah_makan}</td>
                                <td style={{...baseCell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.uang_lembur)}</td>
                                <td style={{...baseCell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.uang_makan)}</td>
                                <td style={{...baseCell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                <td style={{...baseCell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.potongan_pph)}</td>
                                <td style={{...baseCell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                <td style={baseCell}></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'center', fontSize: '7px', width: '160px' }}>
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

export default DafnomLembur;
