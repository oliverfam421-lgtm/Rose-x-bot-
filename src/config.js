import 'dotenv/config';
import path from 'node:path';
for (const key of ['DISCORD_TOKEN','CLIENT_ID']) if (!process.env[key]) throw new Error(`Missing ${key}`);
export const config={token:process.env.DISCORD_TOKEN,clientId:process.env.CLIENT_ID,guildId:process.env.GUILD_ID||null,databasePath:process.env.DATABASE_PATH||path.resolve('data/bot.sqlite')};
