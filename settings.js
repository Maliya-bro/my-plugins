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
  if (val === "typing") return "AUTO TYPING";
  if (val === "recording") return "AUTO RECORDING";
  return "OFF";
}

function modeText(val) {
  return String(val || "public").toUpperCase();
}

function getStatusCard() {
  const s = readSettings();

  return `
🎀 Ξ *BOT SETTINGS PANEL* Ξ

🍀 | *WORK TYPE:* ${String(s.mode || "public")}
🍀 | *PRESENCE:* ${String(s.always_presence || "off")}
🍀 | *AI CHAT:* ${s.auto_msg ? "on" : "off"}
🍀 | *ANTI DELETE:* ${s.anti_delete ? "on" : "off"}
🍀 | *ANTI CALL:* ${s.auto_reject_calls ? "on" : "off"}
🍀 | *AUTO STATUS:* ${s.auto_status_seen ? "on" : "off"}
🍀 | *AUTO REACT:* ${s.auto_status_react ? "on" : "off"}

© MALIYA-MD
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

  if (["automsg", "auto_msg", "msg", "aichat", "ai"].includes(k)) {
    return "auto_msg";
  }

  if (["antidelete", "anti_delete", "delete"].includes(k)) {
    return "anti_delete";
  }

  if (["rejectcalls", "auto_reject_calls", "calls", "anticall"].includes(k)) {
    return "auto_reject_calls";
  }

  if (["mode", "botmode", "privatepublic"].includes(k)) {
    return "mode";
  }

  return null;
}

async function sendSettingsMenu(conn, from, mek, reply) {
  const text = getStatusCard();

  if (!sendInteractiveMessage) {
    return reply(text);
  }

  try {
    await sendInteractiveMessage(
      conn,
      from,
      {
        text,
        footer: "Change Settings",
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "Change Settings",
              sections: [
                {
                  title: "🛠 MAIN SETTINGS",
                  rows: [
                    {
                      title: "Public Mode",
                      description: "Set bot mode to public",
                      id: ".setting public",
                    },
                    {
                      title: "Private Mode",
                      description: "Set bot mode to private",
                      id: ".setting private",
                    },
                    {
                      title: "Toggle Mode",
                      description: "Switch public/private",
                      id: ".setting toggle mode",
                    },
                  ],
                },
                {
                  title: "✨ BOT PRESENCE",
                  rows: [
                    {
                      title: "Always Online",
                      description: "Set typing presence",
                      id: ".setting presence typing",
                    },
                    {
                      title: "Always Offline",
                      description: "Turn presence off",
                      id: ".setting presence off",
                    },
                    {
                      title: "Auto Typing",
                      description: "Typing presence mode",
                      id: ".setting presence typing",
                    },
                    {
                      title: "Auto Recording",
                      description: "Recording presence mode",
                      id: ".setting presence recording",
                    },
                  ],
                },
                {
                  title: "🤖 AI & TOOLS",
                  rows: [
                    {
                      title: "Enable AI Chat",
                      description: "Turn ON auto msg",
                      id: ".setting on automsg",
                    },
                    {
                      title: "Disable AI Chat",
                      description: "Turn OFF auto msg",
                      id: ".setting off automsg",
                    },
                    {
                      title: "Enable Anti Delete",
                      description: "Turn ON anti delete",
                      id: ".setting on antidelete",
                    },
                    {
                      title: "Disable Anti Delete",
                      description: "Turn OFF anti delete",
                      id: ".setting off antidelete",
                    },
                    {
                      title: "Reject Calls ON",
                      description: "Turn ON reject calls",
                      id: ".setting on rejectcalls",
                    },
                    {
                      title: "Reject Calls OFF",
                      description: "Turn OFF reject calls",
                      id: ".setting off rejectcalls",
                    },
                  ],
                },
                {
                  title: "👁 AUTO FUNCTIONS",
                  rows: [
                    {
                      title: "Auto Status View ON",
                      description: "Enable auto status seen",
                      id: ".setting on autoseen",
                    },
                    {
                      title: "Auto Status View OFF",
                      description: "Disable auto status seen",
                      id: ".setting off autoseen",
                    },
                    {
                      title: "Auto Status React ON",
                      description: "Enable auto react",
                      id: ".setting on autoreact",
                    },
                    {
                      title: "Auto Status React OFF",
                      description: "Disable auto react",
                      id: ".setting off autoreact",
                    },
                    {
                      title: "Toggle Auto Seen",
                      description: "Switch auto seen",
                      id: ".setting toggle autoseen",
                    },
                    {
                      title: "Toggle Auto React",
                      description: "Switch auto react",
                      id: ".setting toggle autoreact",
                    },
                    {
                      title: "Toggle AI Chat",
                      description: "Switch auto msg",
                      id: ".setting toggle automsg",
                    },
                    {
                      title: "Toggle Anti Delete",
                      description: "Switch anti delete",
                      id: ".setting toggle antidelete",
                    },
                    {
                      title: "Toggle Reject Calls",
                      description: "Switch reject calls",
                      id: ".setting toggle rejectcalls",
                    },
                    {
                      title: "Show Full Status",
                      description: "View current settings",
                      id: ".setting status",
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
      return reply(getStatusCard());
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
      return reply(`✅ Always presence set to ${presenceText(value)}`);
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
        return reply(`✅ AI Chat: ${onOff(updated.auto_msg)}`);
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
        return reply(`✅ AI Chat: ${onOff(updated.auto_msg)}`);
      }

      if (key === "anti_delete") {
        return reply(`✅ Anti Delete: ${onOff(updated.anti_delete)}`);
      }

      if (key === "auto_reject_calls") {
        return reply(`✅ Reject Calls: ${onOff(updated.auto_reject_calls)}`);
      }
    }

    return reply(getStatusCard());
  }
);
