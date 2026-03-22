const { cmd, replyHandlers } = require("../command");
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

const pendingSettingsMenu = Object.create(null);

function normalizeNumber(num = "") {
  return String(num).replace(/\D/g, "");
}

function makePendingKey(sender, from) {
  return `${from || ""}::${(sender || "").split(":")[0]}`;
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

function normalizeText(s = "") {
  return String(s)
    .replace(/\r/g, "")
    .replace(/\n+/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function tryParseJsonString(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function extractTexts(body, mek, m) {
  const texts = [];

  const direct = [
    body,
    m?.body,
    m?.text,
    m?.message?.conversation,
    m?.message?.extendedTextMessage?.text,
    m?.message?.buttonsResponseMessage?.selectedButtonId,
    m?.message?.buttonsResponseMessage?.selectedDisplayText,
    m?.message?.templateButtonReplyMessage?.selectedId,
    m?.message?.templateButtonReplyMessage?.selectedDisplayText,
    m?.message?.listResponseMessage?.title,
    m?.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
    m?.message?.interactiveResponseMessage?.body?.text,
    m?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson,
    mek?.message?.conversation,
    mek?.message?.extendedTextMessage?.text,
    mek?.message?.buttonsResponseMessage?.selectedButtonId,
    mek?.message?.buttonsResponseMessage?.selectedDisplayText,
    mek?.message?.templateButtonReplyMessage?.selectedId,
    mek?.message?.templateButtonReplyMessage?.selectedDisplayText,
    mek?.message?.listResponseMessage?.title,
    mek?.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
    mek?.message?.interactiveResponseMessage?.body?.text,
    mek?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson,
  ];

  for (const item of direct) {
    if (item) texts.push(String(item).trim());
  }

  const p1 = m?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  const p2 = mek?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;

  for (const raw of [p1, p2]) {
    if (!raw) continue;
    const parsed = tryParseJsonString(raw);
    if (!parsed) continue;

    const vals = [
      parsed.id,
      parsed.selectedId,
      parsed.selectedRowId,
      parsed.title,
      parsed.display_text,
      parsed.text,
      parsed.name,
    ];

    for (const v of vals) {
      if (v) texts.push(String(v).trim());
    }
  }

  return [...new Set(texts.filter(Boolean))];
}

function resolveSettingsAction(texts) {
  const normalized = texts.map((t) => normalizeText(t)).filter(Boolean);

  for (const text of normalized) {
    // direct ids
    if (text.includes(".SETTING PUBLIC".toUpperCase()) || text === "PUBLIC MODE") {
      return { action: "public" };
    }

    if (text.includes(".SETTING PRIVATE".toUpperCase()) || text === "PRIVATE MODE") {
      return { action: "private" };
    }

    if (text.includes(".SETTING TOGGLE MODE".toUpperCase()) || text === "TOGGLE MODE") {
      return { action: "toggle", value: "mode" };
    }

    if (text.includes(".SETTING PRESENCE TYPING".toUpperCase()) || text === "ALWAYS ONLINE" || text === "AUTO TYPING") {
      return { action: "presence", value: "typing" };
    }

    if (text.includes(".SETTING PRESENCE OFF".toUpperCase()) || text === "ALWAYS OFFLINE") {
      return { action: "presence", value: "off" };
    }

    if (text.includes(".SETTING PRESENCE RECORDING".toUpperCase()) || text === "AUTO RECORDING") {
      return { action: "presence", value: "recording" };
    }

    if (text.includes(".SETTING ON AUTOMSG".toUpperCase()) || text === "ENABLE AI CHAT") {
      return { action: "on", value: "automsg" };
    }

    if (text.includes(".SETTING OFF AUTOMSG".toUpperCase()) || text === "DISABLE AI CHAT") {
      return { action: "off", value: "automsg" };
    }

    if (text.includes(".SETTING ON ANTIDELETE".toUpperCase()) || text === "ENABLE ANTI DELETE") {
      return { action: "on", value: "antidelete" };
    }

    if (text.includes(".SETTING OFF ANTIDELETE".toUpperCase()) || text === "DISABLE ANTI DELETE") {
      return { action: "off", value: "antidelete" };
    }

    if (text.includes(".SETTING ON REJECTCALLS".toUpperCase()) || text === "REJECT CALLS ON") {
      return { action: "on", value: "rejectcalls" };
    }

    if (text.includes(".SETTING OFF REJECTCALLS".toUpperCase()) || text === "REJECT CALLS OFF") {
      return { action: "off", value: "rejectcalls" };
    }

    if (text.includes(".SETTING ON AUTOSEEN".toUpperCase()) || text === "AUTO STATUS VIEW ON") {
      return { action: "on", value: "autoseen" };
    }

    if (text.includes(".SETTING OFF AUTOSEEN".toUpperCase()) || text === "AUTO STATUS VIEW OFF") {
      return { action: "off", value: "autoseen" };
    }

    if (text.includes(".SETTING ON AUTOREACT".toUpperCase()) || text === "AUTO STATUS REACT ON") {
      return { action: "on", value: "autoreact" };
    }

    if (text.includes(".SETTING OFF AUTOREACT".toUpperCase()) || text === "AUTO STATUS REACT OFF") {
      return { action: "off", value: "autoreact" };
    }

    if (text.includes(".SETTING TOGGLE AUTOSEEN".toUpperCase()) || text === "TOGGLE AUTO SEEN") {
      return { action: "toggle", value: "autoseen" };
    }

    if (text.includes(".SETTING TOGGLE AUTOREACT".toUpperCase()) || text === "TOGGLE AUTO REACT") {
      return { action: "toggle", value: "autoreact" };
    }

    if (text.includes(".SETTING TOGGLE AUTOMSG".toUpperCase()) || text === "TOGGLE AI CHAT") {
      return { action: "toggle", value: "automsg" };
    }

    if (text.includes(".SETTING TOGGLE ANTIDELETE".toUpperCase()) || text === "TOGGLE ANTI DELETE") {
      return { action: "toggle", value: "antidelete" };
    }

    if (text.includes(".SETTING TOGGLE REJECTCALLS".toUpperCase()) || text === "TOGGLE REJECT CALLS") {
      return { action: "toggle", value: "rejectcalls" };
    }

    if (text.includes(".SETTING STATUS".toUpperCase()) || text === "SHOW FULL STATUS") {
      return { action: "status" };
    }
  }

  return null;
}

function isDuplicateAction(state, sig) {
  const now = Date.now();
  if (state.lastSig === sig && now - (state.lastAt || 0) < 3000) return true;
  state.lastSig = sig;
  state.lastAt = now;
  return false;
}

function applySettingAction(action, value) {
  if (action === "status") {
    return getStatusCard();
  }

  if (action === "private") {
    setSetting("mode", "private");
    return "✅ Bot mode set to PRIVATE";
  }

  if (action === "public") {
    setSetting("mode", "public");
    return "✅ Bot mode set to PUBLIC";
  }

  if (action === "presence") {
    if (!["off", "typing", "recording"].includes(value)) {
      return "❌ Invalid presence mode.";
    }
    setSetting("always_presence", value);
    return `✅ Always presence set to ${presenceText(value)}`;
  }

  if (action === "toggle") {
    const key = mapKey(value);
    if (!key) return "❌ Invalid setting name.";

    if (key === "mode") {
      const now = readSettings();
      const next = now.mode === "private" ? "public" : "private";
      setSetting("mode", next);
      return `✅ Bot mode changed to ${next.toUpperCase()}`;
    }

    const updated = toggleSetting(key);

    if (key === "auto_status_seen") {
      return `✅ Auto Status Seen: ${onOff(updated.auto_status_seen)}`;
    }
    if (key === "auto_status_react") {
      return `✅ Auto Status React: ${onOff(updated.auto_status_react)}`;
    }
    if (key === "auto_msg") {
      return `✅ AI Chat: ${onOff(updated.auto_msg)}`;
    }
    if (key === "anti_delete") {
      return `✅ Anti Delete: ${onOff(updated.anti_delete)}`;
    }
    if (key === "auto_reject_calls") {
      return `✅ Reject Calls: ${onOff(updated.auto_reject_calls)}`;
    }
  }

  if (action === "on" || action === "off") {
    const key = mapKey(value);
    if (!key || key === "mode") return "❌ Invalid setting name.";

    const boolVal = action === "on";
    const updated = setSetting(key, boolVal);

    if (key === "auto_status_seen") {
      return `✅ Auto Status Seen: ${onOff(updated.auto_status_seen)}`;
    }
    if (key === "auto_status_react") {
      return `✅ Auto Status React: ${onOff(updated.auto_status_react)}`;
    }
    if (key === "auto_msg") {
      return `✅ AI Chat: ${onOff(updated.auto_msg)}`;
    }
    if (key === "anti_delete") {
      return `✅ Anti Delete: ${onOff(updated.anti_delete)}`;
    }
    if (key === "auto_reject_calls") {
      return `✅ Reject Calls: ${onOff(updated.auto_reject_calls)}`;
    }
  }

  return getStatusCard();
}

async function sendSettingsMenu(conn, from, mek, reply, sender) {
  const text = getStatusCard();

  if (!sendInteractiveMessage) {
    return reply(text);
  }

  try {
    const key = makePendingKey(sender, from);
    pendingSettingsMenu[key] = {
      createdAt: Date.now(),
      lastSig: "",
      lastAt: 0,
    };

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
      return sendSettingsMenu(conn, from, mek, reply, sender);
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

replyHandlers.push({
  filter: (_body, { sender, from }) => {
    const key = makePendingKey(sender, from);
    return !!pendingSettingsMenu[key];
  },

  function: async (conn, mek, m, { from, body, sender, reply }) => {
    const key = makePendingKey(sender, from);
    const state = pendingSettingsMenu[key];
    if (!state) return;

    const texts = extractTexts(body, mek, m);
    const resolved = resolveSettingsAction(texts);
    if (!resolved) return;

    const sig = `${resolved.action}:${resolved.value || ""}`;
    if (isDuplicateAction(state, sig)) return;

    const result = applySettingAction(resolved.action, resolved.value);

    if (resolved.action !== "status") {
      state.createdAt = Date.now();
    }

    return reply(result);
  },
});

setInterval(() => {
  const now = Date.now();
  const timeout = 2 * 60 * 1000;

  for (const key of Object.keys(pendingSettingsMenu)) {
    if (now - pendingSettingsMenu[key].createdAt > timeout) {
      delete pendingSettingsMenu[key];
    }
  }
}, 30000);
