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
    const days16to31 = Array.from({ length: 16 }, (_, i) => i + 16).filter(d => d <= daysInMonth);

    // Common cell styles
    const cellStyle = { border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle' };
    const smallCellStyle = { ...cellStyle, padding: '1px', fontSize: '6px', width: '18px' };
    const holidayBg = { backgroundColor: '#ffcccc' };

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom...</div>;
    }

    return (
        <div>
            <div className="flex justify-end mb-4 gap-2 print:hidden">
                <Button onClick={handlePrint} className="bg-slate-800 text-white">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            <div className="bg-white border shadow-sm overflow-x-auto" ref={componentRef} style={{ fontFamily: 'Arial, sans-serif', fontSize: '8px' }}>
                <div className="p-3 min-w-[1300px]">
                    {/* Header */}
                    <div className="mb-3 text-center">
                        <h1 className="font-bold text-[11px] uppercase">DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR</h1>
                        <h2 className="font-bold text-[10px] uppercase">LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN</h2>
                    </div>
                    
                    <div className="flex justify-between mb-2 text-[9px]">
                        <div className="font-bold">
                            <p>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</p>
                            <p>BULAN : {monthName} {year}</p>
                        </div>
                        <div className="text-right">
                            <p>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
                        </div>
                    </div>

                    {/* Main Table */}
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '7px' }}>
                        <thead>
                            {/* Header Row 1 */}
                            <tr>
                                <th rowSpan="4" style={{...cellStyle, width: '25px'}}>NO.<br/>URT</th>
                                <th rowSpan="4" style={{...cellStyle, minWidth: '80px'}}>Nama</th>
                                <th rowSpan="4" style={{...cellStyle, minWidth: '95px'}}>NIP</th>
                                <th rowSpan="4" style={{...cellStyle, width: '25px'}}>GOL</th>
                                <th colSpan="15" style={cellStyle}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan="2" rowSpan="2" style={cellStyle}>JUMLAH JAM</th>
                                <th rowSpan="3" style={{...cellStyle, width: '35px'}}>JUMLAH<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan="2" rowSpan="2" style={cellStyle}>JUMLAH UANG</th>
                                <th rowSpan="3" style={{...cellStyle, width: '50px'}}>JUMLAH<br/>DARI<br/>KOLOM</th>
                                <th rowSpan="3" style={{...cellStyle, width: '45px'}}>POTONGAN<br/>PPH</th>
                                <th rowSpan="3" style={{...cellStyle, width: '50px'}}>JUMLAH<br/>BERSIH</th>
                                <th rowSpan="4" style={{...cellStyle, width: '60px'}}>TANDA TANGAN<br/>/<br/>NO REKENING</th>
                            </tr>

                            {/* Header Row 2: Days 1-15 */}
                            <tr>
                                {days1to15.map(day => (
                                    <th key={day} style={{...smallCellStyle, ...(isHoliday(day) ? holidayBg : {})}}>
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                            </tr>

                            {/* Header Row 3: Days 16-31 + Sub headers */}
                            <tr>
                                {days16to31.map(day => (
                                    <th key={day} style={{...smallCellStyle, ...(isHoliday(day) ? holidayBg : {})}}>
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                                {/* Pad empty cells if less than 15 */}
                                {Array.from({ length: 15 - days16to31.length }, (_, i) => (
                                    <th key={`pad-${i}`} style={smallCellStyle}></th>
                                ))}
                                <th style={{...smallCellStyle, width: '30px'}}>HARI<br/>KERJA</th>
                                <th style={{...smallCellStyle, width: '30px'}}>HARI<br/>LIBUR</th>
                                <th style={{...smallCellStyle, width: '50px'}}>LEMBUR</th>
                                <th style={{...smallCellStyle, width: '50px'}}>MAKAN<br/>LEMBUR</th>
                            </tr>

                            {/* Header Row 4: Note + Column Numbers */}
                            <tr style={{fontSize: '6px'}}>
                                <td colSpan="15" style={{...cellStyle, fontStyle: 'italic', padding: '1px'}}>
                                    5 (tanda '-' = Libur ; tanda '+' = Kerja)
                                </td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>6</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>7</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>8</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>9</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>10</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>11</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>12</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>13</td>
                            </tr>

                            {/* Header Row 5: Column IDs 1-4, 14 */}
                            <tr style={{fontSize: '6px'}}>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>1</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>2</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>3</td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>4</td>
                                <td colSpan="15" style={cellStyle}></td>
                                <td colSpan="8" style={cellStyle}></td>
                                <td style={{...cellStyle, fontWeight: 'bold'}}>14</td>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="28" style={{...cellStyle, padding: '15px', color: '#888'}}>
                                        Tidak ada data lembur yang disetujui untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, idx) => (
                                    <React.Fragment key={emp.pegawai_id || idx}>
                                        {/* Employee Row 1: Days 1-15 */}
                                        <tr>
                                            <td rowSpan="2" style={cellStyle}>{idx + 1}</td>
                                            <td rowSpan="2" style={{...cellStyle, textAlign: 'left', fontSize: '6px'}}>{emp.nama}</td>
                                            <td rowSpan="2" style={{...cellStyle, textAlign: 'left', fontSize: '6px'}}>{emp.nip || '-'}</td>
                                            <td rowSpan="2" style={cellStyle}>{emp.golongan?.split('/')[0] || '-'}</td>
                                            
                                            {days1to15.map(day => {
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={day} style={{...smallCellStyle, ...(isHoliday(day) ? holidayBg : {})}}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                            
                                            <td rowSpan="2" style={cellStyle}>{Math.round(emp.jam_hari_kerja || 0)}</td>
                                            <td rowSpan="2" style={cellStyle}>{Math.round(emp.jam_hari_libur || 0)}</td>
                                            <td rowSpan="2" style={cellStyle}>{emp.jumlah_makan || 0}</td>
                                            <td rowSpan="2" style={{...cellStyle, textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(emp.uang_lembur)}</td>
                                            <td rowSpan="2" style={{...cellStyle, textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(emp.uang_makan)}</td>
                                            <td rowSpan="2" style={{...cellStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                            <td rowSpan="2" style={{...cellStyle, textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(emp.potongan_pph)}</td>
                                            <td rowSpan="2" style={{...cellStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                            <td rowSpan="2" style={{...cellStyle, fontSize: '6px'}}>
                                                {emp.bank_account || '-'}<br/>{emp.bank_name || 'Mandiri'}
                                            </td>
                                        </tr>
                                        
                                        {/* Employee Row 2: Days 16-31 */}
                                        <tr>
                                            {days16to31.map(day => {
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={day} style={{...smallCellStyle, ...(isHoliday(day) ? holidayBg : {})}}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                            {Array.from({ length: 15 - days16to31.length }, (_, i) => (
                                                <td key={`pad-${i}`} style={smallCellStyle}>0</td>
                                            ))}
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                            
                            {/* Total Row */}
                            <tr style={{fontWeight: 'bold', backgroundColor: '#f0f0f0'}}>
                                <td colSpan="4" style={cellStyle}>JUMLAH TOTAL</td>
                                <td colSpan="15" style={cellStyle}></td>
                                <td style={cellStyle}>{Math.round(totals.jam_kerja)}</td>
                                <td style={cellStyle}>{Math.round(totals.jam_libur)}</td>
                                <td style={cellStyle}>{totals.jumlah_makan}</td>
                                <td style={{...cellStyle, textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.uang_lembur)}</td>
                                <td style={{...cellStyle, textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.uang_makan)}</td>
                                <td style={{...cellStyle, textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                <td style={{...cellStyle, textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.potongan_pph)}</td>
                                <td style={{...cellStyle, textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                <td style={cellStyle}></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-6 flex justify-end">
                        <div className="text-center text-[9px] w-56">
                            <p className="mb-1">Mengetahui:</p>
                            <p className="font-bold mb-10">Pejabat Pembuat Komitmen</p>
                            <p className="font-bold underline">AMBAR TRI BAWONO</p>
                            <p>NIP. 198112082009011008</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DafnomLembur;
