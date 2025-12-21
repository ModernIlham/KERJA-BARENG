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
    
    // Days split: 1-16 (first row), 17-31+1empty (second row) = 16 columns each
    const days1to16 = Array.from({ length: 16 }, (_, i) => i + 1);
    const days17to31 = Array.from({ length: 15 }, (_, i) => i + 17);

    // Cell styles
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
                <div style={{ padding: '10px', minWidth: '1100px', fontFamily: 'Arial, sans-serif', fontSize: '8px' }}>
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

                    {/* Table */}
                    <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '22px' }} /> {/* NO URT */}
                            <col style={{ width: '70px' }} /> {/* Nama */}
                            <col style={{ width: '80px' }} /> {/* NIP */}
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
                            <col style={{ width: '55px' }} /> {/* TTD/NoRek */}
                        </colgroup>
                        <thead>
                            {/* Row 1: Main Headers */}
                            <tr>
                                <th rowSpan={4} style={thStyle}>NO.<br/>URT</th>
                                <th rowSpan={4} style={thStyle}>Nama</th>
                                <th rowSpan={4} style={thStyle}>NIP</th>
                                <th rowSpan={4} style={thStyle}>GOL</th>
                                <th colSpan={16} style={thStyle}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan={2} style={thStyle}>JUMLAH JAM</th>
                                <th rowSpan={3} style={thStyle}>JML<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan={2} style={thStyle}>JUMLAH UANG</th>
                                <th rowSpan={3} style={thStyle}>JUMLAH<br/>DARI<br/>KOLOM<br/>(9+10)</th>
                                <th rowSpan={3} style={thStyle}>POT.<br/>PPH</th>
                                <th rowSpan={3} style={thStyle}>JUMLAH<br/>BERSIH<br/>(11-12)</th>
                                <th rowSpan={4} style={thStyle}>TANDA<br/>TANGAN<br/>/<br/>NO REK</th>
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
                                <th colSpan={16} style={{...thStyle, fontStyle: 'italic', fontSize: '6px'}}>(5) tanda "-" = Libur ; tanda "+" = Kerja</th>
                                <th style={thStyle}>(6)</th>
                                <th style={thStyle}>(7)</th>
                                <th style={thStyle}>(8)</th>
                                <th style={thStyle}>(9)</th>
                                <th style={thStyle}>(10)</th>
                                <th style={thStyle}>(11)=(9+10)</th>
                                <th style={thStyle}>(12)</th>
                                <th style={thStyle}>(13)</th>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={29} style={{...tdStyle, padding: '15px', color: '#666'}}>
                                        Tidak ada data lembur yang disetujui untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, idx) => (
                                    <React.Fragment key={emp.pegawai_id || idx}>
                                        {/* Data Row 1: Days 1-16 */}
                                        <tr>
                                            <td rowSpan={2} style={tdStyle}>{idx + 1}</td>
                                            <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '6px'}}>{emp.nama}</td>
                                            <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '6px'}}>{emp.nip || '-'}</td>
                                            <td rowSpan={2} style={tdStyle}>{emp.golongan?.split('/')[0] || '-'}</td>
                                            
                                            {days1to16.map(day => {
                                                const valid = day <= daysInMonth;
                                                const hours = valid ? (emp.daily_hours?.[String(day)]?.hours || 0) : 0;
                                                const holiday = valid && isHoliday(day);
                                                return (
                                                    <td key={day} style={{...tdStyle, ...dayColStyle, ...(holiday ? holidayBg : {})}}>
                                                        {valid ? (hours > 0 ? Math.round(hours) : 0) : ''}
                                                    </td>
                                                );
                                            })}
                                            
                                            <td rowSpan={2} style={tdStyle}>{Math.round(emp.jam_hari_kerja || 0)}</td>
                                            <td rowSpan={2} style={tdStyle}>{Math.round(emp.jam_hari_libur || 0)}</td>
                                            <td rowSpan={2} style={tdStyle}>{emp.jumlah_makan || 0}</td>
                                            <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px'}}>{formatRupiah(emp.uang_lembur)}</td>
                                            <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px'}}>{formatRupiah(emp.uang_makan)}</td>
                                            <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                            <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px'}}>{formatRupiah(emp.potongan_pph)}</td>
                                            <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                            <td rowSpan={2} style={{...tdStyle, fontSize: '5px'}}>{emp.bank_account || '-'}<br/>{emp.bank_name || 'Mandiri'}</td>
                                        </tr>
                                        
                                        {/* Data Row 2: Days 17-31 + 1 empty */}
                                        <tr>
                                            {days17to31.map(day => {
                                                const valid = day <= daysInMonth;
                                                const hours = valid ? (emp.daily_hours?.[String(day)]?.hours || 0) : 0;
                                                const holiday = valid && isHoliday(day);
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
                                ))
                            )}
                            
                            {/* Total Row */}
                            <tr>
                                <td colSpan={4} style={totalRowStyle}>JUMLAH TOTAL</td>
                                <td colSpan={16} style={totalRowStyle}></td>
                                <td style={totalRowStyle}>{Math.round(totals.jam_kerja)}</td>
                                <td style={totalRowStyle}>{Math.round(totals.jam_libur)}</td>
                                <td style={totalRowStyle}>{totals.jumlah_makan}</td>
                                <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.uang_lembur)}</td>
                                <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.uang_makan)}</td>
                                <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.potongan_pph)}</td>
                                <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                <td style={totalRowStyle}></td>
                            </tr>
                        </tbody>
                    </table>

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

export default DafnomLembur;
