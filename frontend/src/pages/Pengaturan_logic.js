
  const updateConfig = async () => {
      try {
          const limit = parseInt(config.monthly_upload_limit);
          if (isNaN(limit) || limit < 0) return toast.error("Limit harus angka positif");
          
          await api.put('/api/settings/config', { monthly_upload_limit: limit });
          toast.success("Konfigurasi disimpan");
      } catch (e) {
          toast.error("Gagal update konfigurasi");
      }
  };
