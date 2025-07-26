export type ShtatnaPosada = {
    shtat_number: string; // const номер по штату (always required)
    unit_name?: string; // підрозділ (optional)
    position_name?: string; // посада (optional)
    category?: string; // кат (optional)
    shpk_code?: string; // ШПК (optional)
    extra_data?: Record<string, any>; // full raw row from Excel
};
