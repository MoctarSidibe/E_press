import { fetchUtils } from 'react-admin';
import { API_URL } from '../config/env';

const httpClient = (url, options = {}) => {
    if (!options.headers) {
        options.headers = new Headers({ Accept: 'application/json' });
    }
    const token = localStorage.getItem('auth_token');
    options.headers.set('Authorization', `Bearer ${token}`);
    return fetchUtils.fetchJson(url, options);
};

const dataProvider = {
    getList: async (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;

        // Map resources to correct endpoints
        let fetchUrl = '';
        if (resource === 'users') fetchUrl = `${API_URL}/admin/users`;
        else if (resource === 'categories') fetchUrl = `${API_URL}/admin/categories`;
        else if (resource === 'orders') fetchUrl = `${API_URL}/orders`; // Admin gets all
        else if (resource === 'coupons') fetchUrl = `${API_URL}/admin/coupons`;
        else if (resource === 'points-transactions') fetchUrl = `${API_URL}/admin/points-transactions`;
        else if (resource === 'laveries') fetchUrl = `${API_URL}/laveries`;
        else fetchUrl = `${API_URL}/${resource}`;

        const { json } = await httpClient(fetchUrl);

        // Unwrap envelope responses like { laveries: [...] }
        let rows = Array.isArray(json)
            ? json
            : json.laveries ?? json.data ?? json.orders ?? json.coupons ?? json.users ?? json.categories ?? [];

        // Client-side filtering (backend doesn't support filter params)
        const filter = params.filter || {};
        if (resource === 'users') {
            if (filter.q) {
                const q = filter.q.toLowerCase();
                rows = rows.filter(r =>
                    (r.full_name || '').toLowerCase().includes(q) ||
                    (r.email || '').toLowerCase().includes(q) ||
                    (r.phone || '').toLowerCase().includes(q)
                );
            }
            if (filter.role) rows = rows.filter(r => r.role === filter.role);
            if (filter.is_active !== undefined && filter.is_active !== '') {
                const active = filter.is_active === 'true' || filter.is_active === true;
                rows = rows.filter(r => r.is_active === active);
            }
        }
        if (resource === 'orders') {
            if (filter.status) rows = rows.filter(r => r.status === filter.status);
            if (filter.order_number) {
                const q = filter.order_number.toLowerCase();
                rows = rows.filter(r => (r.order_number || '').toLowerCase().includes(q));
            }
            if (filter.customer_email) {
                const q = filter.customer_email.toLowerCase();
                rows = rows.filter(r => (r.customer_email || '').toLowerCase().includes(q));
            }
            if (filter.pickup_type) rows = rows.filter(r => r.pickup_type === filter.pickup_type);
            if (filter.payment_method) rows = rows.filter(r => r.payment_method === filter.payment_method);
            if (filter.date_from) {
                const from = new Date(filter.date_from);
                rows = rows.filter(r => new Date(r.created_at) >= from);
            }
            if (filter.date_to) {
                const to = new Date(filter.date_to);
                to.setHours(23, 59, 59, 999);
                rows = rows.filter(r => new Date(r.created_at) <= to);
            }
        }

        // Client-side pagination
        const start = (page - 1) * perPage;
        const end = page * perPage;
        const data = rows.slice(start, end);

        return {
            data: data,
            total: rows.length,
        };
    },

    getOne: async (resource, params) => {
        let fetchUrl = '';
        if (resource === 'orders') fetchUrl = `${API_URL}/orders/${params.id}`;
        else if (resource === 'categories') fetchUrl = `${API_URL}/categories/${params.id}`;
        else if (resource === 'laveries') fetchUrl = `${API_URL}/laveries/${params.id}`;
        else if (resource === 'users') {
            // Users endpoint doesn't have GET by ID, so we fetch all and filter
            const { json } = await httpClient(`${API_URL}/admin/users`);
            const user = json.find(u => u.id === params.id);
            if (!user) throw new Error('User not found');
            return { data: user };
        } else {
            fetchUrl = `${API_URL}/${resource}/${params.id}`;
        }

        const { json } = await httpClient(fetchUrl);
        // Unwrap single-record envelopes: { laverie: {...} }, { order: {...} } etc.
        const record = json.laverie ?? json.order ?? json.category ?? json.user ?? json;
        return { data: record };
    },

    getMany: async (resource, params) => {
        // Fetch all and filter by IDs
        const { json } = await dataProvider.getList(resource, {
            pagination: { page: 1, perPage: 1000 },
            sort: { field: 'id', order: 'ASC' },
            filter: {}
        });
        const data = json.data.filter(item => params.ids.includes(item.id));
        return { data };
    },

    getManyReference: async (resource, params) => {
        // Not implementing for now
        return { data: [], total: 0 };
    },

    update: async (resource, params) => {
        let fetchUrl = '';
        let method = 'PUT';

        if (resource === 'categories') {
            fetchUrl = `${API_URL}/admin/categories/${params.id}`;
        } else if (resource === 'users') {
            fetchUrl = `${API_URL}/admin/users/${params.id}`;
            method = 'PATCH';
        } else if (resource === 'coupons') {
            fetchUrl = `${API_URL}/admin/coupons/${params.id}`;
            method = 'PATCH';
        } else if (resource === 'laveries') {
            fetchUrl = `${API_URL}/laveries/${params.id}`;
        } else {
            fetchUrl = `${API_URL}/${resource}/${params.id}`;
        }

        const { json } = await httpClient(fetchUrl, {
            method,
            body: JSON.stringify(params.data),
        });
        return { data: json };
    },

    updateMany: async (resource, params) => {
        return { data: [] };
    },

    create: async (resource, params) => {
        let fetchUrl = '';

        if (resource === 'categories') {
            fetchUrl = `${API_URL}/admin/categories`;
        } else if (resource === 'users') {
            fetchUrl = `${API_URL}/auth/register`;
        } else if (resource === 'coupons') {
            fetchUrl = `${API_URL}/admin/coupons`;
        } else if (resource === 'laveries') {
            fetchUrl = `${API_URL}/laveries`;
        } else {
            fetchUrl = `${API_URL}/${resource}`;
        }

        const { json } = await httpClient(fetchUrl, {
            method: 'POST',
            body: JSON.stringify(params.data),
        });

        // Handle different response formats
        const data = json.laverie || json.user || json;
        return { data: { ...params.data, id: data.id } };
    },

    delete: async (resource, params) => {
        let fetchUrl = '';
        if (resource === 'categories') fetchUrl = `${API_URL}/admin/categories/${params.id}`;
        else if (resource === 'coupons') fetchUrl = `${API_URL}/admin/coupons/${params.id}`;
        else if (resource === 'laveries') fetchUrl = `${API_URL}/laveries/${params.id}`;
        else fetchUrl = `${API_URL}/${resource}/${params.id}`;

        await httpClient(fetchUrl, {
            method: 'DELETE',
        });
        return { data: { id: params.id } };
    },

    deleteMany: async (resource, params) => {
        return { data: [] };
    },

    // Custom method for dashboard
    getStats: async () => {
        const { json } = await httpClient(`${API_URL}/admin/stats`);
        return json;
    }
};

export default dataProvider;
