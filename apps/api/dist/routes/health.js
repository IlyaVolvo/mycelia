const healthRoute = async (app) => {
    app.get("/health", async () => {
        const db = (await app.sql `select now()::text as now`);
        return {
            ok: true,
            dbTime: db[0]?.now ?? null
        };
    });
};
export default healthRoute;
