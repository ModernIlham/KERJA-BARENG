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
    
    const days1to16 = Array.from({ length: 16 }, (_, i) => i + 1);
    const days17to31 = Array.from({ length: 15 }, (_, i) => i + 17);

    // Cell styles
    const cell = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '4px 3px', 
        fontSize: '8px',
        backgroundColor: '#fff',
        lineHeight: '1.3'
    };
    const dayCell = { ...cell, width: '16px', minWidth: '16px', maxWidth: '16px', padding: '2px 1px', fontSize: '7px' };
    const holidayBg = { backgroundColor: '#ffcccc' };
    const totalCell = { ...cell, backgroundColor: '#c8e6c9', fontWeight: 'bold', fontSize: '9px' };

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
                <div style={{ padding: '12px', minWidth: '1000px', fontFamily: 'Arial, sans-serif', fontSize: '9px' }}>
                    {/* Title */}
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11px' }}>DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '9px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                            <div>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</div>
                            <div>BULAN : {monthName} {year}</div>
                        </div>
                        <div>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</div>
                    </div>

                    {/* Table */}
                    <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '24px' }} />
                            <col style={{ width: '70px' }} />
                            <col style={{ width: '80px' }} />
                            <col style={{ width: '24px' }} />
                            {Array(16).fill(null).map((_, i) => <col key={i} style={{ width: '16px' }} />)}
                            <col style={{ width: '26px' }} />
                            <col style={{ width: '26px' }} />
                            <col style={{ width: '26px' }} />
                            <col style={{ width: '58px' }} />
                            <col style={{ width: '52px' }} />
                            <col style={{ width: '62px' }} />
                            <col style={{ width: '48px' }} />
                            <col style={{ width: '62px' }} />
                            <col style={{ width: '60px' }} />
                        </colgroup>
                        <thead>
                            {/* Header Row 1 */}
                            <tr>
                                <th rowSpan={3} style={cell}>NO.<br/>URT</th>
                                <th rowSpan={3} style={cell}>Nama</th>
                                <th rowSpan={3} style={cell}>NIP</th>
                                <th rowSpan={3} style={cell}>GOL</th>
                                <th colSpan={16} style={cell}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan={2} style={cell}>JUMLAH JAM</th>
                                <th rowSpan={2} style={cell}>JML<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan={2} style={cell}>JUMLAH UANG</th>
                                <th rowSpan={2} style={cell}>JUMLAH<br/>DARI<br/>KOLOM<br/>(9+10)</th>
                                <th rowSpan={2} style={cell}>POT.<br/>PPH</th>
                                <th rowSpan={2} style={cell}>JUMLAH<br/>BERSIH<br/>(11-12)</th>
                                <th rowSpan={3} style={cell}>TANDA<br/>TANGAN<br/>/<br/>NO REK</th>
                            </tr>

                            {/* Header Row 2 - Days 1-16 + sub headers */}
                            <tr>
                                {days1to16.map(day => {
                                    const valid = day <= daysInMonth;
                                    return (
                                        <th key={day} style={{...dayCell, ...(valid && isHoliday(day) ? holidayBg : {})}}>
                                            {valid ? `${day}${isHoliday(day) ? '-' : '+'}` : ''}
                                        </th>
                                    );
                                })}
                                <th style={cell}>HARI<br/>KERJA</th>
                                <th style={cell}>HARI<br/>LIBUR</th>
                                <th style={cell}>LEMBUR</th>
                                <th style={cell}>MAKAN</th>
                            </tr>

                            {/* Header Row 3 - Days 17-31 + column numbers */}
                            <tr>
                                {days17to31.map(day => {
                                    const valid = day <= daysInMonth;
                                    return (
                                        <th key={day} style={{...dayCell, ...(valid && isHoliday(day) ? holidayBg : {})}}>
                                            {valid ? `${day}${isHoliday(day) ? '-' : '+'}` : ''}
                                        </th>
                                    );
                                })}
                                <th style={dayCell}></th>
                                <th style={cell}>(6)</th>
                                <th style={cell}>(7)</th>
                                <th style={cell}>(8)</th>
                                <th style={cell}>(9)</th>
                                <th style={cell}>(10)</th>
                                <th style={cell}>(11)</th>
                                <th style={cell}>(12)</th>
                                <th style={cell}>(13)</th>
                            </tr>

                            {/* Header Row 4 - Column identifiers */}
                            <tr>
                                <th style={cell}>(1)</th>
                                <th style={cell}>(2)</th>
                                <th style={cell}>(3)</th>
                                <th style={cell}>(4)</th>
                                <th colSpan={16} style={{...cell, fontStyle: 'italic', fontSize: '7px'}}>(5) tanda "-" = Libur ; tanda "+" = Kerja</th>
                                <th colSpan={8} style={cell}></th>
                                <th style={cell}>(14)</th>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={29} style={{...cell, padding: '20px', color: '#666'}}>
                                        Tidak ada data lembur yang disetujui untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, idx) => (
                                    <React.Fragment key={emp.pegawai_id || idx}>
                                        {/* Data Row 1 */}
                                        <tr>
                                            <td rowSpan={2} style={cell}>{idx + 1}</td>
                                            <td rowSpan={2} style={{...cell, textAlign: 'left', fontSize: '7px'}}>{emp.nama}</td>
                                            <td rowSpan={2} style={{...cell, textAlign: 'left', fontSize: '7px'}}>{emp.nip || '-'}</td>
                                            <td rowSpan={2} style={cell}>{emp.golongan?.split('/')[0] || '-'}</td>
                                            
                                            {days1to16.map(day => {
                                                const valid = day <= daysInMonth;
                                                const hours = valid ? (emp.daily_hours?.[String(day)]?.hours || 0) : 0;
                                                return (
                                                    <td key={day} style={{...dayCell, ...(valid && isHoliday(day) ? holidayBg : {})}}>
                                                        {valid ? (hours > 0 ? Math.round(hours) : 0) : ''}
                                                    </td>
                                                );
                                            })}
                                            
                                            <td rowSpan={2} style={cell}>{Math.round(emp.jam_hari_kerja || 0)}</td>
                                            <td rowSpan={2} style={cell}>{Math.round(emp.jam_hari_libur || 0)}</td>
                                            <td rowSpan={2} style={cell}>{emp.jumlah_makan || 0}</td>
                                            <td rowSpan={2} style={{...cell, textAlign: 'right', fontSize: '7px'}}>{formatRupiah(emp.uang_lembur)}</td>
                                            <td rowSpan={2} style={{...cell, textAlign: 'right', fontSize: '7px'}}>{formatRupiah(emp.uang_makan)}</td>
                                            <td rowSpan={2} style={{...cell, textAlign: 'right', fontSize: '7px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                            <td rowSpan={2} style={{...cell, textAlign: 'right', fontSize: '7px'}}>{formatRupiah(emp.potongan_pph)}</td>
                                            <td rowSpan={2} style={{...cell, textAlign: 'right', fontSize: '7px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                            <td rowSpan={2} style={{...cell, fontSize: '6px'}}>{emp.bank_account || '-'}<br/>{emp.bank_name || 'Mandiri'}</td>
                                        </tr>
                                        
                                        {/* Data Row 2 */}
                                        <tr>
                                            {days17to31.map(day => {
                                                const valid = day <= daysInMonth;
                                                const hours = valid ? (emp.daily_hours?.[String(day)]?.hours || 0) : 0;
                                                return (
                                                    <td key={day} style={{...dayCell, ...(valid && isHoliday(day) ? holidayBg : {})}}>
                                                        {valid ? (hours > 0 ? Math.round(hours) : 0) : ''}
                                                    </td>
                                                );
                                            })}
                                            <td style={dayCell}></td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                            
                            {/* Total Row */}
                            <tr>
                                <td colSpan={4} style={totalCell}>JUMLAH TOTAL</td>
                                <td colSpan={16} style={totalCell}></td>
                                <td style={totalCell}>{Math.round(totals.jam_kerja)}</td>
                                <td style={totalCell}>{Math.round(totals.jam_libur)}</td>
                                <td style={totalCell}>{totals.jumlah_makan}</td>
                                <td style={{...totalCell, textAlign: 'right'}}>{formatRupiah(totals.uang_lembur)}</td>
                                <td style={{...totalCell, textAlign: 'right'}}>{formatRupiah(totals.uang_makan)}</td>
                                <td style={{...totalCell, textAlign: 'right'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                <td style={{...totalCell, textAlign: 'right'}}>{formatRupiah(totals.potongan_pph)}</td>
                                <td style={{...totalCell, textAlign: 'right'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                <td style={totalCell}></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'center', fontSize: '9px', width: '180px' }}>
                            <div>Mengetahui:</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '40px' }}>Pejabat Pembuat Komitmen</div>
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
