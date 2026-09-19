# Rose X Bot

A modular Discord.js v14 moderation and server-management bot. It is designed for a Render **worker** service (not a web service) and uses SQLite for per-guild configuration and warnings.

## Requirements

- Node.js 20+
- A Discord application/bot with **Server Members Intent**, **Message Content Intent**, and **Moderation** permissions enabled in the Developer Portal
- The bot invited with the `bot` and `applications.commands` scopes and permissions such as Manage Messages, Kick Members, Ban Members, Moderate Members, Manage Channels, Manage Roles, Manage Webhooks, View Audit Log, and Send Messages

## Local setup

```bash
cp .env.example .env
npm install
# Set DISCORD_TOKEN and CLIENT_ID in .env
npm run deploy
npm start
```

Set `GUILD_ID` while developing to register commands instantly in one server. Leave it empty to register globally (global propagation can take up to an hour). Never commit `.env` or a token.

## Render

Create a **Background Worker**, connect this repository, and use the included `render.yaml`, or set Build Command to `npm ci` and Start Command to `npm start`. Add `DISCORD_TOKEN` and `CLIENT_ID` as secret environment variables. SQLite is simple and persistent only while the service disk persists; attach a Render persistent disk mounted at `/data` and set `DATABASE_PATH=/data/bot.sqlite` for durable production data.

## Included commands

Moderation: `/kick`, `/ban`, `/unban`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clear`, `/slowmode`.

Management and utility: `/embed`, `/webhook`, `/serverinfo`, `/userinfo`, `/avatar`, `/roleinfo`, `/channelinfo`, `/ping`, `/botinfo`, `/uptime`, `/lock`, `/unlock`, `/lockdown`, `/nick`, `/role`, `/announce`, `/say`, `/poll`, `/afk`, `/invite`, `/help`, `/config`, `/setup`.

`/config` and `/setup` are administrator-only. All moderation actions check Discord permissions, bot permissions, and role hierarchy. Security protections are intentionally conservative: links, spam, and audit-log bursts are logged and can be configured without automatically punishing the owner.

## Safety notes

No bot can override Discord hierarchy. Put the bot role above members and roles it must manage. Anti-nuke cannot undo every destructive action; keep trusted users/roles configured and maintain server backups. Webhook tokens are never returned by this bot.
