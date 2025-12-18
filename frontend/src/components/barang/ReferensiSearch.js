import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Loader2 } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";

export default function ReferensiSearch({ onSelect, placeholder = "Cari Kode / Nama Barang...", type = "all" }) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (query.length >= 2) {
                fetchResults();
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [query]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            // Search only level 5 items (Sub-Sub Kelompok) which are usually the item codes
            // But user might want to search broad terms.
            // Let's filter client side or API side.
            // API `/api/referensi` has `search` and `level` params.
            const res = await api.get('/api/referensi', { 
                params: { search: query, limit: 20 } // Removing level constraint to allow broader search if needed, but ideally level 5
            });
            
            // Filter based on type
            let filtered = res.data.data;
            if (type === 'aset') {
                filtered = filtered.filter(item => !item.kode.startsWith('1'));
            } else if (type === 'persediaan') {
                filtered = filtered.filter(item => item.kode.startsWith('1'));
            }
            
            setResults(filtered);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-white border-slate-300 text-slate-700"
                >
                    {value ? value : placeholder}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput 
                        placeholder="Ketik nama barang atau kode..." 
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && <div className="py-6 text-center text-sm text-slate-500"><Loader2 className="animate-spin h-4 w-4 mx-auto mb-2"/>Mencari referensi...</div>}
                        {!loading && results.length === 0 && <CommandEmpty>Tidak ditemukan.</CommandEmpty>}
                        <CommandGroup>
                            {results.map((item) => (
                                <CommandItem
                                    key={item._id}
                                    value={item.kode}
                                    onSelect={() => {
                                        setValue(`${item.kode} - ${item.uraian}`);
                                        onSelect(item);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{item.kode}</span>
                                        <span className="text-xs text-slate-500">{item.uraian}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
