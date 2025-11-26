import { supabase, sessionState } from './core.js';

// Cache for lookups
const cache = {
  volumes: null,
  recycled: null,
  rawCerts: null,
  countries: null,
  focus: null,
  categories: null
};

export const Suppliers = {
  async get() {
    const userId = sessionState.session?.user?.id;
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    sessionState.setSupplierId(data.id);
    return data;
  },

  async update(updates) {
    const userId = sessionState.session?.user?.id;
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const Products = {
  async list() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, reference_name, type, material, material_secondary, specifications, finishing,
        handmade, private_label_white_label, limited_edition, deadstock,
        production_volumes, made_in, recycled_organic, raw_material_certifications, other_raw_material_certifications,
        product_volumes (quantity),
        recycled_organic_table:recycled_organic (name),
        raw_material_certifications_table:raw_material_certifications (name),
        countries:made_in (name)
      `)
      .eq('supplier', sessionState.supplierId)
      .order('id');
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...payload, supplier: sessionState.supplierId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(productId, updates) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .eq('supplier', sessionState.supplierId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(productId) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('supplier', sessionState.supplierId);
    if (error) throw error;
  }
};

export const Lookups = {
  async getProductLookups() {
    if (cache.volumes && cache.recycled && cache.rawCerts && cache.countries) {
      return { volumes: cache.volumes, recycled: cache.recycled, rawCerts: cache.rawCerts, countries: cache.countries };
    }

    const [volumes, recycled, rawCerts, countries] = await Promise.all([
      this.listProductVolumes(),
      this.listRecycledOrganic(),
      this.listRawMaterialCertifications(),
      this.listCountries()
    ]);

    cache.volumes = volumes;
    cache.recycled = recycled;
    cache.rawCerts = rawCerts;
    cache.countries = countries;

    return { volumes, recycled, rawCerts, countries };
  },

  async listCountries() {
    if (cache.countries) return cache.countries;
    const { data, error } = await supabase.from('countries').select('id, name').order('name');
    if (error) throw error;
    return cache.countries = data;
  },

  async listFocus() {
    if (cache.focus) return cache.focus;
    const { data, error } = await supabase.from('focuses').select('id, name').order('name');
    if (error) throw error;
    return cache.focus = data;
  },

  async listCategories() {
    if (cache.categories) return cache.categories;
    const { data, error } = await supabase.from('product_categories').select('id, name').order('name');
    if (error) throw error;
    return cache.categories = data;
  },

  async listProductVolumes() {
    if (cache.volumes) return cache.volumes;
    const { data, error } = await supabase.from('product_volumes').select('id, quantity').order('id');
    if (error) throw error;
    return cache.volumes = data;
  },

  async listRecycledOrganic() {
    if (cache.recycled) return cache.recycled;
    const { data, error } = await supabase.from('recycled_organic').select('id, name').order('id');
    if (error) throw error;
    return cache.recycled = data;
  },

  async listRawMaterialCertifications() {
    if (cache.rawCerts) return cache.rawCerts;
    const { data, error } = await supabase.from('raw_material_certifications').select('id, name').order('name');
    if (error) throw error;
    return cache.rawCerts = data;
  }
};
