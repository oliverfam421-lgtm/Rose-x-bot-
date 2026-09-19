import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {config} from './config.js';
fs.mkdirSync(path.dirname(path.resolve(config.databasePath)),{recursive:true});
export const db=new Database(config.databasePath); db.pragma('journal_mode=WAL');
db.exec(`CREATE TABLE IF NOT EXISTS guild_config(guild_id TEXT PRIMARY KEY,log_channel TEXT,security_channel TEXT,anti_link INTEGER DEFAULT 0,anti_spam INTEGER DEFAULT 0,anti_nuke INTEGER DEFAULT 0,allowed_domains TEXT DEFAULT '[]',spam_limit INTEGER DEFAULT 6,spam_window INTEGER DEFAULT 8,nuke_threshold INTEGER DEFAULT 4,trusted_roles TEXT DEFAULT '[]',trusted_users TEXT DEFAULT '[]',repeat_punishment TEXT DEFAULT 'warn'); CREATE TABLE IF NOT EXISTS warnings(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,user_id TEXT,moderator_id TEXT,reason TEXT,created_at INTEGER);`);
const defaults={log_channel:null,security_channel:null,anti_link:0,anti_spam:0,anti_nuke:0,allowed_domains:'[]',spam_limit:6,spam_window:8,nuke_threshold:4,trusted_roles:'[]',trusted_users:'[]',repeat_punishment:'warn'};
export function getConfig(g){let r=db.prepare('SELECT * FROM guild_config WHERE guild_id=?').get(g);if(!r){db.prepare('INSERT INTO guild_config(guild_id,log_channel,security_channel,anti_link,anti_spam,anti_nuke,allowed_domains,spam_limit,spam_window,nuke_threshold,trusted_roles,trusted_users,repeat_punishment) VALUES(@guild_id,@log_channel,@security_channel,@anti_link,@anti_spam,@anti_nuke,@allowed_domains,@spam_limit,@spam_window,@nuke_threshold,@trusted_roles,@trusted_users,@repeat_punishment)').run({guild_id:g,...defaults});r=db.prepare('SELECT * FROM guild_config WHERE guild_id=?').get(g)}return r}
export function setConfig(g,k,v){getConfig(g);if(!/^[a-z_]+$/.test(k))throw Error('Invalid setting');db.prepare(`UPDATE guild_config SET ${k}=? WHERE guild_id=?`).run(v,g);return getConfig(g)}
export function addWarning(g,u,m,reason){db.prepare('INSERT INTO warnings(guild_id,user_id,moderator_id,reason,created_at) VALUES(?,?,?,?,?)').run(g,u,m,reason,Date.now())}
export function getWarnings(g,u){return db.prepare('SELECT * FROM warnings WHERE guild_id=? AND user_id=? ORDER BY created_at DESC LIMIT 25').all(g,u)}
