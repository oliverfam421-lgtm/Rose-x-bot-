import {EmbedBuilder,PermissionFlagsBits} from 'discord.js';
export const C={ok:0x57f287,error:0xed4245,info:0x5865f2,warn:0xfee75c};
export const card=(title,description,color=C.info)=>new EmbedBuilder().setTitle(title).setDescription(description||'\u200b').setColor(color).setTimestamp();
export const ms=s=>{const m=/^(\d+)(s|m|h|d|w)$/i.exec(s||'');return m?Number(m[1])*({s:1e3,m:6e4,h:36e5,d:864e5,w:6048e5}[m[2].toLowerCase()]):null};
export function guard(i,target,permission){if(!i.memberPermissions?.has(permission))return 'You do not have the required permission.';if(target?.id===i.guild.ownerId)return 'The server owner cannot be targeted.';if(target&&target.id!==i.user.id&&i.member.roles.highest.comparePositionTo(target.roles.highest)<=0)return 'Your highest role must be above the target.';if(target&&i.guild.members.me.roles.highest.comparePositionTo(target.roles.highest)<=0)return 'My highest role must be above the target.';return null}
export async function log(g,title,text,color=C.info){const {getConfig}=await import('./database.js');const id=getConfig(g.id).log_channel;if(!id)return;const c=await g.channels.fetch(id).catch(()=>null);if(c?.isTextBased())c.send({embeds:[card(title,text,color)]}).catch(()=>{})}
export const json=(v,f)=>{try{return JSON.parse(v||'[]')}catch{return f}}
