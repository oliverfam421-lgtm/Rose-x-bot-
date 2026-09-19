import { Client, GatewayIntentBits, Partials, PermissionFlagsBits, EmbedBuilder, ChannelType, AuditLogEvent } from 'discord.js';
import { config } from './config.js';
import { getConfig, setConfig, addWarning, getWarnings, db } from './database.js';
import { card, C, guard, ms, log, json } from './utils.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildWebhooks], partials: [Partials.Channel] });
const spam = new Map();
const cooldowns = new Map();
const reason = i => i.options.getString('reason') || 'No reason provided';
const reply = (i, content, color=C.info, ephemeral=true) => i.reply({ embeds: [card('Rose X', content, color)], ephemeral });
const member = (i, name='user') => i.options.getMember(name) || i.guild.members.cache.get(i.options.getUser(name)?.id);
function cooldown(i, seconds=3) { const key=`${i.user.id}:${i.commandName}`; const until=cooldowns.get(key)||0; if(until>Date.now()) return Math.ceil((until-Date.now())/1000); cooldowns.set(key,Date.now()+seconds*1000); return 0; }

client.once('ready', c => console.log(`Logged in as ${c.user.tag} in ${c.guilds.cache.size} server(s).`));
client.on('error', console.error);
process.on('unhandledRejection', console.error);

client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand() || !i.guild) return;
  try {
    const wait=cooldown(i); if(wait) return reply(i,`Please wait ${wait}s before using this command.`,C.warn);
    const name=i.commandName; const target=member(i);
    if (['kick','ban'].includes(name)) {
      const p=name==='kick'?PermissionFlagsBits.KickMembers:PermissionFlagsBits.BanMembers; const error=guard(i,target,p); if(error)return reply(i,error,C.error);
      await target[name]({reason:`${reason(i)} — ${i.user.tag}`}); await log(i.guild,`${name==='kick'?'Member kicked':'Member banned'}`,`${target.user.tag} (${target.id})\nModerator: ${i.user.tag}\nReason: ${reason(i)}`,C.warn); return reply(i,`${target.user.tag} was ${name}ed.`,C.ok);
    }
    if (name==='unban') { if(!i.memberPermissions.has(PermissionFlagsBits.BanMembers))return reply(i,'You need Ban Members permission.',C.error); const id=i.options.getString('user_id'); await i.guild.members.unban(id,reason(i)); return reply(i,`User ${id} was unbanned.`,C.ok); }
    if (['timeout','untimeout'].includes(name)) { const error=guard(i,target,PermissionFlagsBits.ModerateMembers); if(error)return reply(i,error,C.error); const duration=name==='timeout'?ms(i.options.getString('duration')):null; if(name==='timeout'&&!duration)return reply(i,'Use a duration such as `10m`, `2h`, or `1d`.',C.error); if(duration>2419200000)return reply(i,'Timeout cannot exceed 28 days.',C.error); await target.timeout(duration,reason(i)); return reply(i,`${target.user.tag} ${name==='timeout'?'was timed out':'is no longer timed out'}.`,C.ok); }
    if (name==='warn') { const error=guard(i,target,PermissionFlagsBits.ModerateMembers); if(error)return reply(i,error,C.error); addWarning(i.guild.id,target.id,i.user.id,reason(i)); await log(i.guild,'Warning issued',`${target.user.tag} (${target.id})\nModerator: ${i.user.tag}\nReason: ${reason(i)}`,C.warn); return reply(i,`${target.user.tag} has been warned.`,C.ok); }
    if (name==='warnings') { if(!i.memberPermissions.has(PermissionFlagsBits.ModerateMembers))return reply(i,'You need Moderate Members permission.',C.error); const rows=getWarnings(i.guild.id,target.id); return reply(i,rows.length?rows.map((x,n)=>`**${n+1}.** <t:${Math.floor(x.created_at/1000)}:R> — ${x.reason}`).join('\n'):'No warnings found.',C.info); }
    if (name==='clear') { if(!i.memberPermissions.has(PermissionFlagsBits.ManageMessages))return reply(i,'You need Manage Messages permission.',C.error); const amount=i.options.getInteger('amount'); const deleted=await i.channel.bulkDelete(amount,true); await log(i.guild,'Messages deleted',`${deleted.size} messages deleted by ${i.user.tag}`); return reply(i,`Deleted ${deleted.size} messages.`,C.ok); }
    if (name==='slowmode') { if(!i.memberPermissions.has(PermissionFlagsBits.ManageChannels))return reply(i,'You need Manage Channels permission.',C.error); await i.channel.setRateLimitPerUser(i.options.getInteger('duration')); return reply(i,'Slowmode updated.',C.ok); }
    if (name==='embed') { const e=new EmbedBuilder().setDescription(i.options.getString('description')).setTitle(i.options.getString('title')||null).setColor(i.options.getString('color')||C.info).setTimestamp(); const channel=i.options.getChannel('channel')||i.channel; await channel.send({embeds:[e]}); return reply(i,`Embed sent in ${channel}.`,C.ok); }
    if (name==='serverinfo') return reply(i,`**${i.guild.name}**\nOwner: <@${i.guild.ownerId}>\nMembers: ${i.guild.memberCount}\nChannels: ${i.guild.channels.cache.size}\nCreated: <t:${Math.floor(i.guild.createdTimestamp/1000)}:R>`);
    if (name==='userinfo') { const u=i.options.getUser('user')||i.user; return reply(i,`**${u.tag}**\nID: ${u.id}\nCreated: <t:${Math.floor(u.createdTimestamp/1000)}:R>\n${u.displayAvatarURL({size:1024})}`); }
    if (name==='avatar') { const u=i.options.getUser('user')||i.user; return reply(i,u.displayAvatarURL({size:4096,extension:'png'})); }
    if (name==='ping') return reply(i,`WebSocket: ${client.ws.ping}ms`,'5865f2',false);
    if (name==='uptime') return reply(i,`Uptime: <t:${Math.floor((Date.now()-client.readyTimestamp)/1000)}:R>`);
    if (name==='botinfo') return reply(i,`Servers: ${client.guilds.cache.size}\nUsers: ${client.guilds.cache.reduce((n,g)=>n+g.memberCount,0)}\ndiscord.js v14`);
    if (name==='help') return reply(i,'Moderation: `/kick`, `/ban`, `/unban`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clear`, `/slowmode`\nManagement: `/embed`, `/webhook`, `/setup`, `/config`, `/lock`, `/unlock`, `/announce`, `/say`, `/poll`, `/nick`\nInfo: `/serverinfo`, `/userinfo`, `/avatar`, `/ping`, `/uptime`, `/botinfo`');
    if (['lock','unlock'].includes(name)) { if(!i.memberPermissions.has(PermissionFlagsBits.ManageChannels))return reply(i,'You need Manage Channels permission.',C.error); await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:name==='unlock'}); return reply(i,`Channel ${name}ed.`,C.ok); }
    if (name==='announce') { const ch=i.options.getChannel('channel')||i.channel; await ch.send({embeds:[card('Announcement',i.options.getString('message'),C.info)]}); return reply(i,`Announcement sent in ${ch}.`,C.ok); }
    if (name==='say') { await i.channel.send(i.options.getString('message')); return reply(i,'Message sent.',C.ok); }
    if (name==='poll') { await i.channel.send({embeds:[card('Poll',i.options.getString('question'),C.info)]}).then(m=>m.react('👍').then(()=>m.react('👎'))); return reply(i,'Poll created.',C.ok); }
    if (name==='nick') { const error=guard(i,target,PermissionFlagsBits.ManageNicknames); if(error)return reply(i,error,C.error); await target.setNickname(i.options.getString('nickname')||null); return reply(i,'Nickname updated.',C.ok); }
    if (name==='setup') { const setting=i.options.getString('setting'); if(setting==='log_channel'){const ch=i.options.getChannel('channel');if(!ch)return reply(i,'Select a channel.',C.error);setConfig(i.guild.id,'log_channel',ch.id);return reply(i,`Log channel set to ${ch}.`,C.ok)} setConfig(i.guild.id,setting,1); return reply(i,`${setting.replaceAll('_',' ')} enabled.`,C.ok); }
    if (name==='config') { const c=getConfig(i.guild.id); return reply(i,`Log channel: ${c.log_channel?`<#${c.log_channel}>`:'not set'}\nAnti-link: ${!!c.anti_link}\nAnti-spam: ${!!c.anti_spam}\nAnti-nuke: ${!!c.anti_nuke}\nSpam: ${c.spam_limit} messages/${c.spam_window}s`); }
    if (name==='webhook') { const sub=i.options.getSubcommand(); if(sub==='list'){const w=await i.guild.fetchWebhooks();return reply(i,w.size?[...w.values()].map(x=>`${x.name} — ${x.id}`).join('\n'):'No webhooks.');} const id=i.options.getString('id'); if(sub==='create'){const ch=i.options.getChannel('channel');const w=await ch.createWebhook({name:i.options.getString('name'),reason:`Created by ${i.user.tag}`});return reply(i,`Webhook **${w.name}** created. Its token is intentionally never shown.`);} const w=await i.guild.fetchWebhooks().then(x=>x.get(id));if(!w)return reply(i,'Webhook not found.',C.error);if(sub==='delete'){await w.delete(`Deleted by ${i.user.tag}`);return reply(i,'Webhook deleted.',C.ok)}return reply(i,`Name: ${w.name}\nID: ${w.id}\nChannel: <#${w.channelId}>`); }
  } catch (e) { console.error(e); if(!i.replied) await reply(i,'Something went wrong. Check the bot logs.',C.error); }
});

client.on('messageCreate', async m => { if(!m.guild||m.author.bot)return; const c=getConfig(m.guild.id); if(c.anti_link){const urls=[...m.content.matchAll(/https?:\/\/([^\s/]+)/gi)].map(x=>x[1].toLowerCase());const allowed=json(c.allowed_domains,[]);if(urls.some(d=>!allowed.some(a=>d===a||d.endsWith(`.${a}`)))){await m.delete().catch(()=>{});await log(m.guild,'Unauthorized link deleted',`${m.author.tag} (${m.author.id}) in #${m.channel.name}`,C.warn);return;}} if(c.anti_spam){const now=Date.now(),key=`${m.guild.id}:${m.author.id}`,arr=(spam.get(key)||[]).filter(t=>now-t<c.spam_window*1000);arr.push(now);spam.set(key,arr);if(arr.length>=c.spam_limit){await m.delete().catch(()=>{});await log(m.guild,'Anti-spam action',`${m.author.tag} exceeded ${c.spam_limit} messages/${c.spam_window}s`,C.warn);}} });
client.on('guildAuditLogEntryCreate', async (entry,guild) => { const c=getConfig(guild.id); if(!c.anti_nuke||!entry.executorId||entry.executorId===guild.ownerId)return; const dangerous=[AuditLogEvent.ChannelDelete,AuditLogEvent.ChannelCreate,AuditLogEvent.RoleDelete,AuditLogEvent.RoleCreate,AuditLogEvent.MemberBanAdd,AuditLogEvent.MemberKick,AuditLogEvent.WebhookCreate]; if(!dangerous.includes(entry.action))return; await log(guild,'Anti-nuke alert',`Audit action: ${entry.action}\nExecutor: <@${entry.executorId}> (${entry.executorId})\nReview audit logs and trusted users immediately.`,C.error); });
const shutdown=async signal=>{console.log(`${signal}: shutting down`);db.close();client.destroy();process.exit(0)};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);client.login(config.token);
