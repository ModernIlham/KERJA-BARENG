import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency } from '../../../lib/utils';

const DafnomLembur = ({ data, month, year }) => {
    const componentRef = useRef();
    
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `DAFTAR_REKAP_LEMBUR_${month}_${year}`,
    });

    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const monthName = monthNames[parseInt(month) - 1] || "-";

    const totalJamKerja = data.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
    const totalUangLembur = data.reduce((acc, curr) => acc + ((curr.totalHours * curr.rate) || 0), 0);
    const totalMakan = data.reduce((acc, curr) => acc + (curr.mealAllowance || 0), 0);
    const totalKotor = data.reduce((acc, curr) => acc + (curr.totalGross || 0), 0);
    const totalPajak = data.reduce((acc, curr) => acc + (curr.tax || 0), 0);
    const totalBersih = data.reduce((acc, curr) => acc + (curr.netPay || 0), 0);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={handlePrint} className="bg-slate-800 text-white">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            {/* PRINT AREA */}
            <div className="overflow-x-auto bg-white p-4 border shadow-sm" ref={componentRef}>
                <style type="text/css" media="print">
                    {`
                        @page { size: landscape; margin: 10mm; }
                        body { -webkit-print-color-adjust: exact; font-family: Arial, sans-serif; }
                        table { width: 100%; border-collapse: collapse; font-size: 10px; }
                        th, td { border: 1px solid black; padding: 4px; }
                        .no-border { border: none !important; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                        .bg-gray { background-color: #f0f0f0; }
                    `}
                </style>

                {/* HEADER */}
                <div className="mb-4 font-sans">
                    <h3 className="text-center font-bold text-sm">DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR</h3>
                    <h3 className="text-center font-bold text-sm">KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN</h3>
                    
                    <div className="flex justify-between mt-4 text-xs font-bold uppercase">
                        <div>
                            <p>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA</p>
                            <p>BULAN : {monthName} {year}</p>
                        </div>
                        <div className="text-right">
                            <p>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <table>
                    <thead>
                        <tr>
                            <th rowSpan="2" className="w-8">NO. URT</th>
                            <th rowSpan="2">Nama</th>
                            <th rowSpan="2">NIP</th>
                            <th rowSpan="2" className="w-10">GOL</th>
                            <th colSpan="31">JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                            <th colSpan="2">JUMLAH JAM</th>
                            <th rowSpan="2">JUMLAH MAKAN LEMBUR</th>
                            <th colSpan="2">JUMLAH UANG</th>
                            <th rowSpan="2">JUMLAH DARI KOLOM (LEMBUR + MAKAN)</th>
                            <th rowSpan="2">POTONGAN PPH</th>
                            <th rowSpan="2">JUMLAH BERSIH</th>
                            <th rowSpan="2" className="w-24">TANDA TANGAN / NO REKENING</th>
                        </tr>
                        <tr>
                            {/* Dates 1-31 */}
                            {[...Array(31)].map((_, i) => (
                                <th key={i} className="w-4 text-[8px]">{i + 1}</th>
                            ))}
                            {/* Summary Columns */}
                            <th className="w-10">HARI KERJA</th>
                            <th className="w-10">HARI LIBUR</th>
                            <th>LEMBUR</th>
                            <th>MAKAN LEMBUR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx}>
                                <td className="text-center">{idx + 1}</td>
                                <td>{row.name}</td>
                                <td>{row.nip ? `'${row.nip}` : '-'}</td>
                                <td className="text-center">{row.grade?.split('/')[0] || '-'}</td>
                                
                                {/* Placeholder for Daily Hours - In a real app, this would come from backend breakdown */}
                                {[...Array(31)].map((_, i) => (
                                    <td key={i} className="text-center text-[8px]">-</td>
                                ))}

                                <td className="text-center">{row.totalHours}</td>
                                <td className="text-center">0</td> {/* Holiday hours placeholder */}
                                <td className="text-center">{row.mealAllowance > 0 ? (row.mealAllowance / 37000).toFixed(0) : 0}</td> {/* Meal count approximation */}
                                
                                <td className="text-right">{formatCurrency(row.totalHours * row.rate)}</td>
                                <td className="text-right">{formatCurrency(row.mealAllowance)}</td>
                                <td className="text-right font-bold">{formatCurrency(row.totalGross)}</td>
                                <td className="text-right">{formatCurrency(row.tax)}</td>
                                <td className="text-right font-bold">{formatCurrency(row.netPay)}</td>
                                <td className="text-center text-[9px]">
                                    <div className="h-8 border-b border-dotted mb-1"></div>
                                    {row.bankAccount || "1020012039217"}
                                    <br/>
                                    {row.bankName || "Mandiri"}
                                </td>
                            </tr>
                        ))}
                        
                        {/* TOTAL ROW */}
                        <tr className="font-bold bg-gray">
                            <td colSpan="35" className="text-center">JUMLAH TOTAL</td>
                            <td className="text-center">{totalJamKerja}</td>
                            <td className="text-center">0</td>
                            <td className="text-center">-</td>
                            <td className="text-right">{formatCurrency(totalUangLembur)}</td>
                            <td className="text-right">{formatCurrency(totalMakan)}</td>
                            <td className="text-right">{formatCurrency(totalKotor)}</td>
                            <td className="text-right">{formatCurrency(totalPajak)}</td>
                            <td className="text-right">{formatCurrency(totalBersih)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                {/* FOOTER */}
                <div className="mt-8 flex justify-end">
                    <div className="text-center w-1/3">
                        <p className="mb-16">Mengetahui:<br/>Pejabat Pembuat Komitmen</p>
                        <p className="font-bold underline">AMBAR TRI BAWONO</p>
                        <p>NIP. 199307132024211004</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DafnomLembur;
