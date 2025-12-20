import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency } from '../../../lib/utils';

const DafnomLembur = ({ data, month, year }) => {
    const componentRef = useRef();
    
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Dafnom_Lembur_${month}_${year}`,
    });

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthName = monthNames[parseInt(month) - 1] || "-";

    const totalBruto = data.reduce((acc, curr) => acc + (curr.totalGross || 0), 0);
    const totalPajak = data.reduce((acc, curr) => acc + (curr.tax || 0), 0);
    const totalNetto = data.reduce((acc, curr) => acc + (curr.netPay || 0), 0);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={handlePrint} className="bg-slate-800 text-white">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            {/* PRINT AREA */}
            <div className="overflow-x-auto bg-white p-8 border shadow-sm" ref={componentRef}>
                <style type="text/css" media="print">
                    {`
                        @page { size: landscape; margin: 10mm; }
                        body { -webkit-print-color-adjust: exact; }
                    `}
                </style>

                {/* HEADER */}
                <div className="text-center mb-6 font-serif">
                    <h2 className="text-lg font-bold uppercase underline">DAFTAR PERHITUNGAN LEMBUR PEGAWAI</h2>
                    <p className="text-sm">Bulan: {monthName} {year}</p>
                </div>

                {/* TABLE */}
                <table className="w-full border-collapse border border-black text-xs font-serif">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-2 w-8">NO</th>
                            <th className="border border-black p-2">NAMA / NIP</th>
                            <th className="border border-black p-2 w-16">GOL</th>
                            <th className="border border-black p-2 w-16">JML JAM</th>
                            <th className="border border-black p-2">TARIF / JAM</th>
                            <th className="border border-black p-2">JML UANG LEMBUR</th>
                            <th className="border border-black p-2">UANG MAKAN</th>
                            <th className="border border-black p-2">JUMLAH KOTOR</th>
                            <th className="border border-black p-2">PPH 21</th>
                            <th className="border border-black p-2">JUMLAH BERSIH</th>
                            <th className="border border-black p-2 w-24">TANDA TANGAN</th>
                        </tr>
                        <tr className="text-[10px] text-center italic">
                            <th className="border border-black bg-gray-100">1</th>
                            <th className="border border-black bg-gray-100">2</th>
                            <th className="border border-black bg-gray-100">3</th>
                            <th className="border border-black bg-gray-100">4</th>
                            <th className="border border-black bg-gray-100">5</th>
                            <th className="border border-black bg-gray-100">6 (4x5)</th>
                            <th className="border border-black bg-gray-100">7</th>
                            <th className="border border-black bg-gray-100">8 (6+7)</th>
                            <th className="border border-black bg-gray-100">9</th>
                            <th className="border border-black bg-gray-100">10 (8-9)</th>
                            <th className="border border-black bg-gray-100">11</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx}>
                                <td className="border border-black p-2 text-center">{idx + 1}</td>
                                <td className="border border-black p-2">
                                    <div className="font-bold">{row.name}</div>
                                    <div className="text-[10px]">{row.nip || '-'}</div>
                                    <div className="text-[10px] italic">{row.type}</div>
                                </td>
                                <td className="border border-black p-2 text-center">{row.grade}</td>
                                <td className="border border-black p-2 text-center">{row.totalHours}</td>
                                <td className="border border-black p-2 text-right">{formatCurrency(row.rate)}</td>
                                <td className="border border-black p-2 text-right font-medium">{formatCurrency(row.totalHours * row.rate)}</td>
                                <td className="border border-black p-2 text-right">{formatCurrency(row.mealAllowance)}</td>
                                <td className="border border-black p-2 text-right font-medium">{formatCurrency(row.totalGross)}</td>
                                <td className="border border-black p-2 text-right text-red-700">({formatCurrency(row.tax)})</td>
                                <td className="border border-black p-2 text-right font-bold">{formatCurrency(row.netPay)}</td>
                                <td className="border border-black p-2 relative h-16">
                                    <span className="absolute top-1 left-1 text-[10px] text-gray-400">{idx+1}.......</span>
                                </td>
                            </tr>
                        ))}
                        {/* TOTAL ROW */}
                        <tr className="font-bold bg-gray-100">
                            <td className="border border-black p-2 text-center" colSpan={7}>JUMLAH TOTAL</td>
                            <td className="border border-black p-2 text-right">{formatCurrency(totalBruto)}</td>
                            <td className="border border-black p-2 text-right">{formatCurrency(totalPajak)}</td>
                            <td className="border border-black p-2 text-right">{formatCurrency(totalNetto)}</td>
                            <td className="border border-black p-2 bg-gray-300"></td>
                        </tr>
                    </tbody>
                </table>

                {/* SIGNATURE SECTION */}
                <div className="mt-8 flex justify-between break-inside-avoid">
                    <div className="text-center w-1/3">
                        <p className="mb-16">Mengetahui,<br/>Pejabat Pembuat Komitmen</p>
                        <p className="font-bold underline">_________________________</p>
                        <p>NIP. ...........................</p>
                    </div>
                    <div className="text-center w-1/3">
                        <p className="mb-16">Bendahara Pengeluaran</p>
                        <p className="font-bold underline">_________________________</p>
                        <p>NIP. ...........................</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DafnomLembur;
