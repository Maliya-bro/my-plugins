const { cmd } = require("../command");
const config = require("../config");
const {
  readSettings,
  setSetting,
  toggleSetting,
} = require("../lib/botSettings");

let sendInteractiveMessage = null;
try {
  ({ sendInteractiveMessage } = require("gifted-btns"));
} catch {}

function normalizeNumber(num = "") {
  return String(num).replace(/\D/g, "");
}

function isRealOwner(sender = "") {
  const owner = normalizeNumber(config.BOT_OWNER || "");
  const user = normalizeNumber(String(sender).split("@")[0] || "");
  return !!owner && owner === user;
}

function onOff(val) {
  return val ? "ON" : "OFF";
}

function presenceText(val) {
  if (val === "typing") return "TYPING";
  if (val === "recording") return "RECORDING";
  return "OFF";
}

function getStatusText() {
  const s = readSettings();

  return `
╭━━━〔 *MALIYA-MD SETTINGS* 〕━━━⬣
┃
┃ 1. Auto Status Seen  : ${onOff(s.auto_status_seen)}
┃ 2. Auto Status React : ${onOff(s.auto_status_react)}
┃ 3. Auto Msg          : ${onOff(s.auto_msg)}
┃ 4. Bot Mode          : ${String(s.mode).toUpperCase()}
┃ 5. Anti Delete       : ${onOff(s.anti_delete)}
┃ 6. Reject Calls      : ${onOff(s.auto_reject_calls)}
┃ 7. Always Presence   : ${presenceText(s.always_presence)}
┃
╰━━━━━━━━━━━━━━━━━━⬣

*Commands*
.setting menu
.setting status

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

.setting toggle autoseen
.setting toggle autoreact
.setting toggle automsg
.setting toggle mode
.setting toggle antidelete
.setting toggle rejectcalls
`.trim();
}

function mapKey(name = "") {
  const k = String(name).toLowerCase().trim();

  if (["autoseen", "auto_seen", "statusseen", "auto_status_seen"].includes(k)) {
    return "auto_status_seen";
  }

  if (["autoreact", "auto_react", "statusreact", "auto_status_react"].includes(k)) {
    return "auto_status_react";
  }

  if (["automsg", "auto_msg", "msg"].includes(k)) {
    return "auto_msg";
  }

  if (["antidelete", "anti_delete", "delete"].includes(k)) {
    return "anti_delete";
  }

  if (["rejectcalls", "auto_reject_calls", "calls"].includes(k)) {
    return "auto_reject_calls";
  }

  if (["mode", "botmode", "privatepublic"].includes(k)) {
    return "mode";
  }

  return null;
}

async function sendSettingsMenu(conn, from, mek, reply) {
  const text = getStatusText();

  if (!sendInteractiveMessage) {
    return reply(text);
  }

  try {
    await sendInteractiveMessage(
      conn,
      from,
      {
        header: {
          title: "MALIYA-MD SETTINGS",
        },
        body: {
          text: "Owner control panel",
        },
        footer: {
          text: "Select one option",
        },
        buttons: [
          {
            type: "quick_reply",
            display_text: "Status",
            id: ".setting status",
          },
          {
            type: "quick_reply",
            display_text: "Auto Seen",
            id: ".setting toggle autoseen",
          },
          {
            type: "quick_reply",
            display_text: "Auto React",
            id: ".setting toggle autoreact",
          },
          {
            type: "quick_reply",
            display_text: "Auto Msg",
            id: ".setting toggle automsg",
          },
          {
            type: "quick_reply",
            display_text: "Mode",
            id: ".setting toggle mode",
          },
          {
            type: "quick_reply",
            display_text: "Anti Delete",
            id: ".setting toggle antidelete",
          },
          {
            type: "quick_reply",
            display_text: "Reject Calls",
            id: ".setting toggle rejectcalls",
          },
          {
            type: "quick_reply",
            display_text: "Typing",
            id: ".setting presence typing",
          },
          {
            type: "quick_reply",
            display_text: "Recording",
            id: ".setting presence recording",
          },
          {
            type: "quick_reply",
            display_text: "Presence Off",
            id: ".setting presence off",
          },
        ],
      },
      { quoted: mek }
    );
  } catch {
    return reply(text);
  }
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
    if (!isRealOwner(sender)) {
      return reply("❌ This command is owner only.");
    }

    const action = String(args[0] || "menu").toLowerCase().trim();
    const value = String(args[1] || "").toLowerCase().trim();

    if (action === "menu") {
      return sendSettingsMenu(conn, from, mek, reply);
    }

    if (action === "status") {
      return reply(getStatusText());
    }

    if (action === "private") {
      setSetting("mode", "private");
      return reply("✅ Bot mode set to PRIVATE");
    }

    if (action === "public") {
      setSetting("mode", "public");
      return reply("✅ Bot mode set to PUBLIC");
    }

    if (action === "presence") {
      if (!["off", "typing", "recording"].includes(value)) {
        return reply(
          "❌ Use:\n.setting presence off\n.setting presence typing\n.setting presence recording"
        );
      }

      setSetting("always_presence", value);
      return reply(`✅ Always presence set to ${value.toUpperCase()}`);
    }

    if (action === "toggle") {
      const key = mapKey(value);
      if (!key) return reply("❌ Invalid setting name.");

      if (key === "mode") {
        const now = readSettings();
        const next = now.mode === "private" ? "public" : "private";
        setSetting("mode", next);
        return reply(`✅ Bot mode changed to ${next.toUpperCase()}`);
      }

      const updated = toggleSetting(key);

      if (key === "auto_status_seen") {
        return reply(`✅ Auto Status Seen: ${onOff(updated.auto_status_seen)}`);
      }

      if (key === "auto_status_react") {
        return reply(`✅ Auto Status React: ${onOff(updated.auto_status_react)}`);
      }

      if (key === "auto_msg") {
        return reply(`✅ Auto Msg: ${onOff(updated.auto_msg)}`);
      }

      if (key === "anti_delete") {
        return reply(`✅ Anti Delete: ${onOff(updated.anti_delete)}`);
      }

      if (key === "auto_reject_calls") {
        return reply(`✅ Reject Calls: ${onOff(updated.auto_reject_calls)}`);
      }
    }

    if (action === "on" || action === "off") {
      const key = mapKey(value);

      if (!key || key === "mode") {
        return reply("❌ Invalid setting name.");
      }

      const boolVal = action === "on";
      const updated = setSetting(key, boolVal);

      if (key === "auto_status_seen") {
        return reply(`✅ Auto Status Seen: ${onOff(updated.auto_status_seen)}`);
      }

      if (key === "auto_status_react") {
        return reply(`✅ Auto Status React: ${onOff(updated.auto_status_react)}`);
      }

      if (key === "auto_msg") {
        return reply(`✅ Auto Msg: ${onOff(updated.auto_msg)}`);
      }

      if (key === "anti_delete") {
        return reply(`✅ Anti Delete: ${onOff(updated.anti_delete)}`);
      }

      if (key === "auto_reject_calls") {
        return reply(`✅ Reject Calls: ${onOff(updated.auto_reject_calls)}`);
      }
    }

    return reply(getStatusText());
  }
);
