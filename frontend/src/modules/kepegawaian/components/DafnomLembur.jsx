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
            @page { 
                size: A4 landscape; 
                margin: 5mm; 
            }
            @media print {
                body { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important;
                }
                table { font-size: 7px !important; }
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

    // Calculate totals
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

    // Cell style for holiday
    const holidayStyle = { backgroundColor: '#ffcccc' };
    const normalStyle = { backgroundColor: '#ffffff' };

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom...</div>;
    }

    // Days array split into two rows
    const days1to15 = Array.from({ length: 15 }, (_, i) => i + 1);
    const days16to31 = Array.from({ length: Math.min(16, daysInMonth - 15) }, (_, i) => i + 16);
    // Pad days16to31 to always have 16 items for consistent table structure
    while (days16to31.length < 16) {
        days16to31.push(null);
    }

    return (
        <div>
            {/* PRINT BUTTON */}
            <div className="flex justify-end mb-4 gap-2 print:hidden">
                <Button onClick={handlePrint} className="bg-slate-800 text-white">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            {/* PRINT AREA */}
            <div 
                className="bg-white border shadow-sm overflow-x-auto" 
                ref={componentRef}
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '8px' }}
            >
                <div className="p-3 min-w-[1200px]">
                    {/* HEADER SECTION */}
                    <div className="mb-3 text-center">
                        <h1 className="font-bold text-[11px] uppercase">
                            DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR
                        </h1>
                        <h2 className="font-bold text-[10px] uppercase">
                            LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN
                        </h2>
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

                    {/* MAIN TABLE */}
                    <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '7px' }}>
                        <thead>
                            {/* Row 1: Main Header */}
                            <tr>
                                <th rowSpan="5" style={{border: '1px solid black', padding: '2px', width: '25px', textAlign: 'center', verticalAlign: 'middle'}}>NO.<br/>URT</th>
                                <th rowSpan="5" style={{border: '1px solid black', padding: '2px', minWidth: '80px', textAlign: 'center', verticalAlign: 'middle'}}>Nama</th>
                                <th rowSpan="5" style={{border: '1px solid black', padding: '2px', minWidth: '95px', textAlign: 'center', verticalAlign: 'middle'}}>NIP</th>
                                <th rowSpan="5" style={{border: '1px solid black', padding: '2px', width: '25px', textAlign: 'center', verticalAlign: 'middle'}}>GOL</th>
                                <th colSpan="15" style={{border: '1px solid black', padding: '2px', textAlign: 'center'}}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan="2" rowSpan="3" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle'}}>JUMLAH JAM</th>
                                <th rowSpan="4" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle', width: '35px'}}>JUMLAH<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan="2" rowSpan="3" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle'}}>JUMLAH UANG</th>
                                <th rowSpan="4" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle', width: '55px'}}>JUMLAH<br/>DARI<br/>KOLOM</th>
                                <th rowSpan="4" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle', width: '45px'}}>POTONGAN<br/>PPH</th>
                                <th rowSpan="4" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle', width: '55px'}}>JUMLAH<br/>BERSIH</th>
                                <th rowSpan="5" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle', width: '65px'}}>TANDA TANGAN<br/>/<br/>NO REKENING</th>
                            </tr>

                            {/* Row 2: Days 1-15 */}
                            <tr>
                                {days1to15.map(day => (
                                    <th key={day} style={{
                                        border: '1px solid black', 
                                        padding: '1px', 
                                        width: '18px', 
                                        textAlign: 'center',
                                        fontSize: '6px',
                                        ...(isHoliday(day) ? holidayStyle : normalStyle)
                                    }}>
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                            </tr>

                            {/* Row 3: Days 16-31 */}
                            <tr>
                                {days16to31.map((day, idx) => (
                                    <th key={idx} style={{
                                        border: '1px solid black', 
                                        padding: '1px', 
                                        width: '18px', 
                                        textAlign: 'center',
                                        fontSize: '6px',
                                        ...(day && isHoliday(day) ? holidayStyle : normalStyle)
                                    }}>
                                        {day ? `${day}${isHoliday(day) ? '-' : '+'}` : ''}
                                    </th>
                                ))}
                                <th style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontSize: '6px'}}>HARI<br/>KERJA</th>
                                <th style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontSize: '6px'}}>HARI<br/>LIBUR</th>
                                <th style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontSize: '6px'}}>LEMBUR</th>
                                <th style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontSize: '6px'}}>MAKAN<br/>LEMBUR</th>
                            </tr>

                            {/* Row 4: Note + Column numbers */}
                            <tr style={{fontSize: '6px'}}>
                                <td colSpan="15" style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontStyle: 'italic'}}>
                                    5 (tanda '-' = Libur ; tanda '+' = Kerja)
                                </td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>6</td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>7</td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>9</td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>10</td>
                            </tr>

                            {/* Row 5: Column numbers for first columns */}
                            <tr style={{fontSize: '6px'}}>
                                <td colSpan="15" style={{border: '1px solid black', padding: '0'}}></td>
                                <td colSpan="2" style={{border: '1px solid black', padding: '0'}}></td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>8</td>
                                <td colSpan="2" style={{border: '1px solid black', padding: '0'}}></td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>11</td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>12</td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>13</td>
                            </tr>

                            {/* Row 6: Column identifiers 1-4 and 14 */}
                            <tr style={{fontSize: '6px'}}>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>1</td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>2</td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>3</td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>4</td>
                                <td colSpan="15" style={{border: '1px solid black', padding: '0'}}></td>
                                <td colSpan="8" style={{border: '1px solid black', padding: '0'}}></td>
                                <td style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold'}}>14</td>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="28" style={{border: '1px solid black', padding: '10px', textAlign: 'center', color: '#888'}}>
                                        Tidak ada data lembur yang disetujui untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, idx) => (
                                    <React.Fragment key={emp.pegawai_id || idx}>
                                        {/* Employee Row 1 - Days 1-15 */}
                                        <tr>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle'}}>{idx + 1}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'left', verticalAlign: 'middle', fontSize: '6px'}}>{emp.nama}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'left', verticalAlign: 'middle', fontSize: '6px'}}>{emp.nip && emp.nip !== '-' ? emp.nip : '-'}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle'}}>{emp.golongan ? emp.golongan.split('/')[0] : '-'}</td>
                                            
                                            {/* Days 1-15 */}
                                            {days1to15.map(day => {
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={day} style={{
                                                        border: '1px solid black', 
                                                        padding: '1px', 
                                                        textAlign: 'center',
                                                        fontSize: '6px',
                                                        ...(isHoliday(day) ? holidayStyle : normalStyle)
                                                    }}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                            
                                            {/* Summary cells - span 2 rows */}
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle'}}>{Math.round(emp.jam_hari_kerja || 0)}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle'}}>{Math.round(emp.jam_hari_libur || 0)}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle'}}>{emp.jumlah_makan || 0}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'right', verticalAlign: 'middle', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(emp.uang_lembur)}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'right', verticalAlign: 'middle', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(emp.uang_makan)}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'right', verticalAlign: 'middle', fontSize: '6px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'right', verticalAlign: 'middle', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(emp.potongan_pph)}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'right', verticalAlign: 'middle', fontSize: '6px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                            <td rowSpan="2" style={{border: '1px solid black', padding: '2px', textAlign: 'center', verticalAlign: 'middle', fontSize: '6px'}}>
                                                {emp.bank_account || '-'}<br/>{emp.bank_name || 'Mandiri'}
                                            </td>
                                        </tr>
                                        
                                        {/* Employee Row 2 - Days 16-31 */}
                                        <tr>
                                            {days16to31.map((day, dayIdx) => {
                                                if (!day) {
                                                    return <td key={dayIdx} style={{border: '1px solid black', padding: '1px', textAlign: 'center', fontSize: '6px'}}>0</td>;
                                                }
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={dayIdx} style={{
                                                        border: '1px solid black', 
                                                        padding: '1px', 
                                                        textAlign: 'center',
                                                        fontSize: '6px',
                                                        ...(isHoliday(day) ? holidayStyle : normalStyle)
                                                    }}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                            
                            {/* TOTAL ROW */}
                            <tr style={{fontWeight: 'bold', backgroundColor: '#f0f0f0'}}>
                                <td colSpan="4" style={{border: '1px solid black', padding: '2px', textAlign: 'center'}}>JUMLAH TOTAL</td>
                                <td colSpan="15" style={{border: '1px solid black', padding: '0'}}></td>
                                <td style={{border: '1px solid black', padding: '2px', textAlign: 'center'}}>{Math.round(totals.jam_kerja)}</td>
                                <td style={{border: '1px solid black', padding: '2px', textAlign: 'center'}}>{Math.round(totals.jam_libur)}</td>
                                <td style={{border: '1px solid black', padding: '2px', textAlign: 'center'}}>{totals.jumlah_makan}</td>
                                <td style={{border: '1px solid black', padding: '2px', textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.uang_lembur)}</td>
                                <td style={{border: '1px solid black', padding: '2px', textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.uang_makan)}</td>
                                <td style={{border: '1px solid black', padding: '2px', textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                <td style={{border: '1px solid black', padding: '2px', textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.potongan_pph)}</td>
                                <td style={{border: '1px solid black', padding: '2px', textAlign: 'right', fontSize: '6px', whiteSpace: 'nowrap'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                <td style={{border: '1px solid black', padding: '0'}}></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* FOOTER / SIGNATURE SECTION */}
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
