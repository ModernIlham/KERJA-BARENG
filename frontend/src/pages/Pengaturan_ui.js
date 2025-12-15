                    <Card className="border-green-200 bg-green-50 mt-6">
                        <CardHeader>
                            <CardTitle className="text-green-800 flex items-center">Konfigurasi Sistem</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Batas Upload Foto per Bulan</label>
                                <div className="flex gap-2 mt-1">
                                    <Input 
                                        type="number" 
                                        className="bg-white max-w-[200px]" 
                                        value={config?.monthly_upload_limit || 500} 
                                        onChange={(e) => setConfig({...config, monthly_upload_limit: e.target.value})}
                                    />
                                    <Button onClick={updateConfig} className="bg-green-600 hover:bg-green-700">Simpan</Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Terpakai bulan ini ({config?.current_month}): <strong>{config?.current_month_count || 0}</strong> / {config?.monthly_upload_limit || 500}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
