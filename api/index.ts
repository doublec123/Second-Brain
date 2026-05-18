// @ts-nocheck
import app from "../artifacts/api-server/dist/app.mjs";
console.log('App loaded:', !!app);
const handler = app?.default || app;
export default handler;
