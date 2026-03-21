const { cmd } = require("../command");
let sendInteractiveMessage = null;

try {
  ({ sendInteractiveMessage } = require("gifted-btns"));
} catch {}

const config = require("../config");
const {
  readSettings,
  setSetting,
  toggleSetting,
} = require("../lib/botSettings");

function normalizeOwner(num = "") {
  return String(num).replace(/\D/g, "");
}

function isOwnerUser(sender = "") {
  const owner = normalizeOwner(config.BOT_OWNER || "");
  const user = normalizeOwner(String(sender).split("@")[0] || "");
  return !!owner && owner === user;
}

function onOff(v) {
  return v ? "ON" : "OFF";
}

function presenceLabel(v) {
  if (v === "typing") return "TYPING";
  if (v === "recording") return "RECORDING";
  return "OFF";
}

function settingsText() {
  const s = readSettings();
  return `
╭━━━〔 *MALIYA-MD SETTINGS* 〕━━━⬣
┃
┃ 1. Auto Status Seen : ${onOff(s.auto_status_seen)}
┃ 2. Auto Status React : ${onOff(s.auto_status_react)}
┃ 3. Auto Msg : ${onOff(s.auto_msg)}
┃ 4. Mode : ${String(s.mode).toUpperCase()}
┃ 5. Anti Delete : ${onOff(s.anti_delete)}
┃ 6. Auto Reject Calls : ${onOff(s.auto_reject_calls)}
┃ 7. Always Presence : ${presenceLabel(s.always_presence)}
┃
╰━━━━━━━━━━━━━━━━━━⬣

*Commands*
.setting status
.setting menu

.setting on autoseen
.setting off autoseen
.setting on autoreact
.setting off autoreact
.setting on automsg
.setting off automsg
.setting public
.setting private
.setting on antidelete
.setting off antidelete
.setting on rejectcalls
.setting off rejectcalls
.setting presence off
.setting presence typing
.setting presence recording
`.trim();
}

async function sendMenu(conn, from, mek) {
  const text = settingsText();

  if (!sendInteractiveMessage) {
    return conn.sendMessage(from, { text }, { quoted: mek });
  }

  try {
    await sendInteractiveMessage(
      conn,
      from,
      {
        header: { title: "MALIYA-MD SETTINGS" },
        body: { text: "Select a setting option" },
        footer: { text: "Owner only control panel" },
        buttons: [
          { type: "quick_reply", display_text: "Status", id: ".setting status" },
          { type: "quick_reply", display_text: "Auto Seen", id: ".setting toggle autoseen" },
          { type: "quick_reply", display_text: "Auto React", id: ".setting toggle autoreact" },
          { type: "quick_reply", display_text: "Auto Msg", id: ".setting toggle automsg" },
          { type: "quick_reply", display_text: "Private/Public", id: ".setting toggle mode" },
          { type: "quick_reply", display_text: "Anti Delete", id: ".setting toggle antidelete" },
          { type: "quick_reply", display_text: "Reject Calls", id: ".setting toggle rejectcalls" },
          { type: "quick_reply", display_text: "Typing", id: ".setting presence typing" },
          { type: "quick_reply", display_text: "Recording", id: ".setting presence recording" },
          { type: "quick_reply", display_text: "Presence Off", id: ".setting presence off" },
        ],
      },
      { quoted: mek }
    );
  } catch {
    await conn.sendMessage(from, { text }, { quoted: mek });
  }
}

function mapKey(raw = "") {
  const k = String(raw).toLowerCase().trim();

  if (["autoseen", "auto_seen", "statusseen", "auto_status_seen"].includes(k)) return "auto_status_seen";
  if (["autoreact", "auto_react", "statusreact", "auto_status_react"].includes(k)) return "auto_status_react";
  if (["automsg", "auto_msg", "msg"].includes(k)) return "auto_msg";
  if (["antidelete", "anti_delete", "delete"].includes(k)) return "anti_delete";
  if (["rejectcalls", "auto_reject_calls", "calls"].includes(k)) return "auto_reject_calls";
  if (["mode"].includes(k)) return "mode";

  return null;
}

cmd(
  {
    pattern: "setting",
    alias: ["settings", "setbot", "botset"],
    react: "⚙️",
    category: "owner",
    filename: __filename,
  },
  async (conn, mek, m, { from, sender, args, reply }) => {
    if (!isOwnerUser(sender)) {
      return reply("❌ This command is owner only.");
    }

    const sub = String(args[0] || "menu").toLowerCase();
    const val = String(args[1] || "").toLowerCase();

    if (sub === "menu") {
      return sendMenu(conn, from, mek);
    }

    if (sub === "status") {
      return reply(settingsText());
    }

    if (sub === "private") {
      setSetting("mode", "private");
      return reply("✅ Bot mode set to PRIVATE");
    }

    if (sub === "public") {
      setSetting("mode", "public");
      return reply("✅ Bot mode set to PUBLIC");
    }

    if (sub === "presence") {
      if (!["off", "typing", "recording"].includes(val)) {
        return reply("❌ Use:\n.setting presence off\n.setting presence typing\n.setting presence recording");
      }
      setSetting("always_presence", val);
      return reply(`✅ Always presence set to ${val.toUpperCase()}`);
    }

    if (sub === "toggle") {
      const key = mapKey(val);
      if (!key) return reply("❌ Invalid setting key");

      if (key === "mode") {
        const s = readSettings();
        const next = s.mode === "private" ? "public" : "private";
        setSetting("mode", next);
        return reply(`✅ Bot mode changed to ${next.toUpperCase()}`);
      }

      const s = toggleSetting(key);
      if (key === "auto_status_seen") return reply(`✅ Auto Status Seen: ${onOff(s.auto_status_seen)}`);
      if (key === "auto_status_react") return reply(`✅ Auto Status React: ${onOff(s.auto_status_react)}`);
      if (key === "auto_msg") return reply(`✅ Auto Msg: ${onOff(s.auto_msg)}`);
      if (key === "anti_delete") return reply(`✅ Anti Delete: ${onOff(s.anti_delete)}`);
      if (key === "auto_reject_calls") return reply(`✅ Auto Reject Calls: ${onOff(s.auto_reject_calls)}`);
    }

    if (sub === "on" || sub === "off") {
      const key = mapKey(val);
      if (!key || key === "mode") return reply("❌ Invalid setting key");

      const boolVal = sub === "on";
      const s = setSetting(key, boolVal);

      if (key === "auto_status_seen") return reply(`✅ Auto Status Seen: ${onOff(s.auto_status_seen)}`);
      if (key === "auto_status_react") return reply(`✅ Auto Status React: ${onOff(s.auto_status_react)}`);
      if (key === "auto_msg") return reply(`✅ Auto Msg: ${onOff(s.auto_msg)}`);
      if (key === "anti_delete") return reply(`✅ Anti Delete: ${onOff(s.anti_delete)}`);
      if (key === "auto_reject_calls") return reply(`✅ Auto Reject Calls: ${onOff(s.auto_reject_calls)}`);
    }

    return reply(settingsText());
  }
);
