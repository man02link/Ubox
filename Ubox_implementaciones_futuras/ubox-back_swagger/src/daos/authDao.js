import users_bbdd from '../config/db.js';

export const authDao = {
    async findByUsername(username) {
        const res = await users_bbdd.query('SELECT * FROM users WHERE username = $1', [username]);
        return res.rows[0] || null;
    },

    async createUser(user) {
        const query = `
            INSERT INTO users (id, username, password, name, phone, email, address, role, createdAt)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        const values = [user.id, user.username, user.password, user.name, user.phone, user.email, user.address, user.role, user.createdAt];
        return await users_bbdd.query(query, values);
    },

    // Añade este método dentro del objeto authDao si no lo tienes:
    async updateRefreshToken(userId, token) {
        const query = `UPDATE users SET refresh_token = $1 WHERE id = $2;`;
        await users_bbdd.query(query, [token, userId]);
    }
};