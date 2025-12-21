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

    // Base styles
    const cell = { border: '1px solid #000', textAlign: 'center', verticalAlign: 'middle', padding: '1px', fontSize: '6px' };
    const dayCell = { ...cell, width: '13px', minWidth: '13px' };
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
                <div style={{ padding: '10px', minWidth: '900px', fontFamily: 'Arial, sans-serif', fontSize: '7px' }}>
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

                    {/* Main Table */}
                    <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
                        <thead>
                            {/* Row 1 */}
                            <tr>
                                <th rowSpan="4" style={{...cell, width: '20px'}}>NO<br/>URT</th>
                                <th rowSpan="4" style={{...cell, width: '55px'}}>Nama</th>
                                <th rowSpan="4" style={{...cell, width: '65px'}}>NIP</th>
                                <th rowSpan="4" style={{...cell, width: '18px'}}>GOL</th>
                                <th colSpan="15" style={cell}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan="2" rowSpan="2" style={cell}>JUMLAH JAM</th>
                                <th rowSpan="3" style={{...cell, width: '22px'}}>JML<br/>MAKAN</th>
                                <th colSpan="2" rowSpan="2" style={cell}>JUMLAH UANG</th>
                                <th rowSpan="3" style={{...cell, width: '42px'}}>JML<br/>KOLOM</th>
                                <th rowSpan="3" style={{...cell, width: '35px'}}>POT<br/>PPH</th>
                                <th rowSpan="3" style={{...cell, width: '42px'}}>JML<br/>BERSIH</th>
                                <th rowSpan="4" style={{...cell, width: '45px'}}>TTD/<br/>NO REK</th>
                            </tr>

                            {/* Row 2: Days 1-15 */}
                            <tr>
                                {days1to15.map(day => (
                                    <th key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                            </tr>

                            {/* Row 3: Days 16-31 + Sub headers */}
                            <tr>
                                {days16to31.map(day => (
                                    <th key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                                {Array.from({ length: 15 - days16to31.length }, (_, i) => (
                                    <th key={`pad-${i}`} style={dayCell}></th>
                                ))}
                                <th style={{...cell, width: '20px', fontSize: '5px'}}>HARI<br/>KERJA</th>
                                <th style={{...cell, width: '20px', fontSize: '5px'}}>HARI<br/>LIBUR</th>
                                <th style={{...cell, width: '40px', fontSize: '5px'}}>LEMBUR</th>
                                <th style={{...cell, width: '35px', fontSize: '5px'}}>MAKAN</th>
                            </tr>

                            {/* Row 4: Column Numbers */}
                            <tr style={{ fontSize: '5px' }}>
                                <td colSpan="15" style={{...cell, fontStyle: 'italic'}}>5 (tanda '-' = Libur ; '+' = Kerja)</td>
                                <td style={cell}><b>6</b></td>
                                <td style={cell}><b>7</b></td>
                                <td style={cell}><b>8</b></td>
                                <td style={cell}><b>9</b></td>
                                <td style={cell}><b>10</b></td>
                                <td style={cell}><b>11</b></td>
                                <td style={cell}><b>12</b></td>
                                <td style={cell}><b>13</b></td>
                            </tr>

                            {/* Row 5: Column IDs 1-4, 14 */}
                            <tr style={{ fontSize: '5px' }}>
                                <td style={cell}><b>1</b></td>
                                <td style={cell}><b>2</b></td>
                                <td style={cell}><b>3</b></td>
                                <td style={cell}><b>4</b></td>
                                <td colSpan="15" style={cell}></td>
                                <td colSpan="8" style={cell}></td>
                                <td style={cell}><b>14</b></td>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="28" style={{...cell, padding: '15px', color: '#666'}}>
                                        Tidak ada data lembur yang disetujui untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, idx) => (
                                    <React.Fragment key={emp.pegawai_id || idx}>
                                        {/* Row 1: Days 1-15 */}
                                        <tr>
                                            <td rowSpan="2" style={cell}>{idx + 1}</td>
                                            <td rowSpan="2" style={{...cell, textAlign: 'left', fontSize: '5px'}}>{emp.nama}</td>
                                            <td rowSpan="2" style={{...cell, textAlign: 'left', fontSize: '5px'}}>{emp.nip || '-'}</td>
                                            <td rowSpan="2" style={cell}>{emp.golongan?.split('/')[0] || '-'}</td>
                                            
                                            {days1to15.map(day => {
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                            
                                            <td rowSpan="2" style={cell}>{Math.round(emp.jam_hari_kerja || 0)}</td>
                                            <td rowSpan="2" style={cell}>{Math.round(emp.jam_hari_libur || 0)}</td>
                                            <td rowSpan="2" style={cell}>{emp.jumlah_makan || 0}</td>
                                            <td rowSpan="2" style={{...cell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.uang_lembur)}</td>
                                            <td rowSpan="2" style={{...cell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.uang_makan)}</td>
                                            <td rowSpan="2" style={{...cell, textAlign: 'right', fontSize: '5px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                            <td rowSpan="2" style={{...cell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.potongan_pph)}</td>
                                            <td rowSpan="2" style={{...cell, textAlign: 'right', fontSize: '5px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                            <td rowSpan="2" style={{...cell, fontSize: '5px'}}>
                                                {emp.bank_account || '-'}<br/>{emp.bank_name || 'Mandiri'}
                                            </td>
                                        </tr>
                                        
                                        {/* Row 2: Days 16-31 */}
                                        <tr>
                                            {days16to31.map(day => {
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                            {Array.from({ length: 15 - days16to31.length }, (_, i) => (
                                                <td key={`pad-${i}`} style={dayCell}>0</td>
                                            ))}
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                            
                            {/* Total Row */}
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                <td colSpan="4" style={cell}>JUMLAH TOTAL</td>
                                <td colSpan="15" style={cell}></td>
                                <td style={cell}>{Math.round(totals.jam_kerja)}</td>
                                <td style={cell}>{Math.round(totals.jam_libur)}</td>
                                <td style={cell}>{totals.jumlah_makan}</td>
                                <td style={{...cell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.uang_lembur)}</td>
                                <td style={{...cell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.uang_makan)}</td>
                                <td style={{...cell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                <td style={{...cell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.potongan_pph)}</td>
                                <td style={{...cell, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                <td style={cell}></td>
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
