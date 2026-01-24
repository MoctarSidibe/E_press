const authProvider = {
    login: async ({ username, password }) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const request = new Request(`${apiUrl}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email: username, password }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
        const response = await fetch(request);
        if (response.status < 200 || response.status >= 300) {
            throw new Error(response.statusText);
        }
        const { token, user } = await response.json();

        // Only allow admin or cleaner (acting as admin for now)
        if (user.role !== 'admin' && user.role !== 'cleaner') {
            throw new Error('Unauthorized: Admin access only');
        }

        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return Promise.resolve();
    },
    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        return Promise.resolve();
    },
    checkError: (error) => {
        const status = error.status;
        if (status === 401 || status === 403) {
            localStorage.removeItem('auth_token');
            return Promise.reject();
        }
        return Promise.resolve();
    },
    checkAuth: () => {
        return localStorage.getItem('auth_token')
            ? Promise.resolve()
            : Promise.reject();
    },
    getPermissions: () => {
        const user = localStorage.getItem('user');
        return user ? Promise.resolve(JSON.parse(user).role) : Promise.reject();
    },
};

export default authProvider;
