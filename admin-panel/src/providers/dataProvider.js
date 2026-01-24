import { fetchUtils } from 'react-admin';

const apiUrl = 'http://localhost:5000/api';
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
        if (resource === 'users') fetchUrl = `${apiUrl}/admin/users`;
        else if (resource === 'categories') fetchUrl = `${apiUrl}/admin/categories`;
        else if (resource === 'orders') fetchUrl = `${apiUrl}/orders`; // Admin gets all
        else fetchUrl = `${apiUrl}/${resource}`;

        const { json } = await httpClient(fetchUrl);

        // Client-side pagination since backend returns all rows
        const start = (page - 1) * perPage;
        const end = page * perPage;
        const data = json.slice(start, end);

        return {
            data: data,
            total: json.length,
        };
    },

    getOne: async (resource, params) => {
        let fetchUrl = '';
        if (resource === 'orders') fetchUrl = `${apiUrl}/orders/${params.id}`;
        else if (resource === 'categories') fetchUrl = `${apiUrl}/categories/${params.id}`;
        else if (resource === 'users') {
            // Users endpoint doesn't have GET by ID, so we fetch all and filter
            const { json } = await httpClient(`${apiUrl}/admin/users`);
            const user = json.find(u => u.id === params.id);
            if (!user) throw new Error('User not found');
            return { data: user };
        } else {
            fetchUrl = `${apiUrl}/${resource}/${params.id}`;
        }

        const { json } = await httpClient(fetchUrl);
        return { data: json };
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
            fetchUrl = `${apiUrl}/admin/categories/${params.id}`;
        } else if (resource === 'users') {
            // Users might not have PUT endpoint yet, we'll use PATCH if it exists
            // For now, skip user update or implement backend endpoint
            throw new Error('User update not implemented in backend');
        } else {
            fetchUrl = `${apiUrl}/${resource}/${params.id}`;
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
            fetchUrl = `${apiUrl}/admin/categories`;
        } else if (resource === 'users') {
            // Use auth/register endpoint for creating users
            fetchUrl = `${apiUrl}/auth/register`;
        } else {
            fetchUrl = `${apiUrl}/${resource}`;
        }

        const { json } = await httpClient(fetchUrl, {
            method: 'POST',
            body: JSON.stringify(params.data),
        });

        // Handle different response formats
        const data = json.user || json; // auth/register returns { user, token }
        return { data: { ...params.data, id: data.id } };
    },

    delete: async (resource, params) => {
        let fetchUrl = '';
        if (resource === 'categories') fetchUrl = `${apiUrl}/admin/categories/${params.id}`;
        else fetchUrl = `${apiUrl}/${resource}/${params.id}`;

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
        const { json } = await httpClient(`${apiUrl}/admin/stats`);
        return json;
    }
};

export default dataProvider;
