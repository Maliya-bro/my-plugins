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
  const owner = String(config.BOT_OWNER || "").replace(/\D/g, "");
  let user = String(sender).split("@")[0].replace(/\D/g, "");

  if (user.startsWith("0")) {
    user = "94" + user.slice(1);
  }

  if (user.startsWith("94") && user.length === 11) {
    return user === owner;
  }

  return user === owner;
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
        text:
`⚙️ *MALIYA-MD SETTINGS PANEL*

Owner control settings menu.
Select an option below.`,
        footer: "MALIYA-MD | Settings",
        interactiveButtons: [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "📊 Status",
              id: ".setting status",
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🌐 Public",
              id: ".setting public",
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🔒 Private",
              id: ".setting private",
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "⌨️ Typing",
              id: ".setting presence typing",
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🎙️ Recording",
              id: ".setting presence recording",
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "⛔ Presence Off",
              id: ".setting presence off",
            }),
          },
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🟢 ON Settings",
              sections: [
                {
                  title: "Turn ON",
                  rows: [
                    {
                      title: "Auto Seen",
                      description: "Enable auto status seen",
                      id: ".setting on autoseen",
                    },
                    {
                      title: "Auto React",
                      description: "Enable auto status react",
                      id: ".setting on autoreact",
                    },
                    {
                      title: "Auto Msg",
                      description: "Enable auto message",
                      id: ".setting on automsg",
                    },
                    {
                      title: "Anti Delete",
                      description: "Enable anti delete",
                      id: ".setting on antidelete",
                    },
                    {
                      title: "Reject Calls",
                      description: "Enable auto reject calls",
                      id: ".setting on rejectcalls",
                    },
                  ],
                },
              ],
            }),
          },
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🔴 OFF Settings",
              sections: [
                {
                  title: "Turn OFF",
                  rows: [
                    {
                      title: "Auto Seen",
                      description: "Disable auto status seen",
                      id: ".setting off autoseen",
                    },
                    {
                      title: "Auto React",
                      description: "Disable auto status react",
                      id: ".setting off autoreact",
                    },
                    {
                      title: "Auto Msg",
                      description: "Disable auto message",
                      id: ".setting off automsg",
                    },
                    {
                      title: "Anti Delete",
                      description: "Disable anti delete",
                      id: ".setting off antidelete",
                    },
                    {
                      title: "Reject Calls",
                      description: "Disable auto reject calls",
                      id: ".setting off rejectcalls",
                    },
                  ],
                },
              ],
            }),
          },
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🟡 Toggle Settings",
              sections: [
                {
                  title: "Toggle Options",
                  rows: [
                    {
                      title: "Auto Seen",
                      description: "Toggle auto status seen",
                      id: ".setting toggle autoseen",
                    },
                    {
                      title: "Auto React",
                      description: "Toggle auto status react",
                      id: ".setting toggle autoreact",
                    },
                    {
                      title: "Auto Msg",
                      description: "Toggle auto message",
                      id: ".setting toggle automsg",
                    },
                    {
                      title: "Mode",
                      description: "Toggle public/private",
                      id: ".setting toggle mode",
                    },
                    {
                      title: "Anti Delete",
                      description: "Toggle anti delete",
                      id: ".setting toggle antidelete",
                    },
                    {
                      title: "Reject Calls",
                      description: "Toggle reject calls",
                      id: ".setting toggle rejectcalls",
                    },
                  ],
                },
              ],
            }),
          },
        ],
      },
      { quoted: mek }
    );
  } catch (e) {
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
  async (conn, mek, m, { from, sender, args, reply, isOwner }) => {
    if (!isOwner) {
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
      return reply(`✅ Always online/ typing set to ${value.toUpperCase()}`);
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
