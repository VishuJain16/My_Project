import React, { useEffect, useState, useRef } from "react";
import { Explorer, type FileNode } from "./components/Explorer";
import { Editor } from "./components/Editor";
import { Terminal, type TerminalLine } from "./components/Terminal";
import { v4 as uuidv4 } from "uuid";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  deleteDoc,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";

type LoginState = {
  loggedIn: boolean;
  roomId: string | null;
  userName: string | null;
};

export type ChatMessage = {
  id: string;
  sender: string;
  content: string;
  createdAt: Date | null;
  seenBy: string[];
  seenAt: Record<string, Date | null>;
};

type PresenceStatus = "online" | "away" | "offline";
type PresenceInfo = {
  status: PresenceStatus;
  typing: boolean;
};
type PresenceMap = Record<string, PresenceInfo>;

const IDENTITY_KEY = "stealth_identity";

const createInitialFiles = (): FileNode[] => [
  {
    id: uuidv4(),
    name: "STEALTH-VSCODE-CHAT",
    type: "folder",
    children: [
      {
        id: uuidv4(),
        name: "src",
        type: "folder",
        children: [
          {
            id: uuidv4(),
            name: "main.tsx",
            type: "file",
            content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
          },
          {
            id: uuidv4(),
            name: "App.tsx",
            type: "file",
            content: `import React from "react";

export const AppShell: React.FC = () => {
  return (
    <div>
      {/* fake app shell, nothing to see here */}
      <h1>Dashboard</h1>
    </div>
  );
};

// real app is in another file 😉`,
          },
          {
            id: uuidv4(),
            name: "firebase.ts",
            type: "file",
            content: `// fake firebase config, do not use in production
export const firebaseConfig = {
  apiKey: "FAKE",
  authDomain: "fake.firebaseapp.com",
  projectId: "fake-project",
};`,
          },
          {
            id: uuidv4(),
            name: "style.css",
            type: "file",
            content: `/* basic layout, mimicking VS Code */
body {
  margin: 0;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}`,
          },
          {
            id: uuidv4(),
            name: "index.d.ts",
            type: "file",
            content: `// fake type definitions
declare module "*.svg" {
  const content: string;
  export default content;
}`,
          },
          {
            id: uuidv4(),
            name: "env.d.ts",
            type: "file",
            content: `/// <reference types="vite/client" />`,
          },
          {
            id: uuidv4(),
            name: "routes.ts",
            type: "file",
            content: `export const routes = [
  { path: "/", name: "Home" },
  { path: "/settings", name: "Settings" },
];`,
          },
          {
            id: uuidv4(),
            name: "api.ts",
            type: "file",
            content: `export async function fetchSomething() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ok: true }), 300);
  });
}`,
          },
          {
            id: uuidv4(),
            name: "constants.ts",
            type: "file",
            content: `export const APP_NAME = "Stealth VSCode Chat";
export const VERSION = "0.0.1";`,
          },
          {
            id: uuidv4(),
            name: "hooks",
            type: "folder",
            children: [
              {
                id: uuidv4(),
                name: "useDebounce.ts",
                type: "file",
                content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}`,
              },
              {
                id: uuidv4(),
                name: "useToggle.ts",
                type: "file",
                content: `import { useState } from "react";

export const useToggle = (initial = false) => {
  const [value, setValue] = useState(initial);
  return {
    value,
    on: () => setValue(true),
    off: () => setValue(false),
    toggle: () => setValue((v) => !v),
  };
};`,
              },
            ],
          },
          {
            id: uuidv4(),
            name: "components",
            type: "folder",
            children: [
              {
                id: uuidv4(),
                name: "TopBar.tsx",
                type: "file",
                content: `import React from "react";

export const TopBar: React.FC = () => (
  <header>
    {/* totally real app header */}
    <span>Stealth App</span>
  </header>
);`,
              },
              {
                id: uuidv4(),
                name: "StatusBar.tsx",
                type: "file",
                content: `import React from "react";

export const StatusBar: React.FC = () => (
  <footer>
    {/* fake status bar */} 
    <span>$(remote) Connected</span>
  </footer>
);`,
              },
              {
                id: uuidv4(),
                name: "Sidebar.tsx",
                type: "file",
                content: `import React from "react";

export const Sidebar: React.FC = () => {
  return (
    <aside>
      {/* pretend this renders navigation */}
      <ul>
        <li>Explorer</li>
        <li>Search</li>
      </ul>
    </aside>
  );
};`,
              },
              {
                id: uuidv4(),
                name: "Dashboard.tsx",
                type: "file",
                content: `import React from "react";

export const Dashboard: React.FC = () => {
  return (
    <div>
      {/* placeholder dashboard */}
      <p>Loading widgets...</p>
    </div>
  );
};`,
              },
              {
                id: uuidv4(),
                name: "Settings.tsx",
                type: "file",
                content: `import React from "react";

export const Settings: React.FC = () => {
  return (
    <section>
      <h2>Settings</h2>
      <p>Nothing configurable yet.</p>
    </section>
  );
};`,
              },
            ],
          },
        ],
      },
      {
        id: uuidv4(),
        name: "lib",
        type: "folder",
        children: [
          {
            id: uuidv4(),
            name: "main.dart",
            type: "file",
            content: `void main() {
  // dummy dart entrypoint
  print('Hello from stealth workspace');
}`,
          },
          {
            id: uuidv4(),
            name: "astrometry_job.dart",
            type: "file",
            content: `class AstrometryJob {
  final int submissionId;
  final int? jobId;

  AstrometryJob({required this.submissionId, this.jobId});

  factory AstrometryJob.fromJson(Map<String, dynamic> json) {
    return AstrometryJob(
      submissionId: json['subid'] as int,
      jobId: json['job_id'] as int?,
    );
  }
}`,
          },
          {
            id: uuidv4(),
            name: "astro_utils.dart",
            type: "file",
            content: `int clamp(int value, int min, int max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}`,
          },
        ],
      },
      {
        id: uuidv4(),
        name: "README.md",
        type: "file",
        content: `# Stealth VSCode Chat

This workspace is totally innocent.
All communication definitely happens via official channels.`,
      },
      {
        id: uuidv4(),
        name: "package.json",
        type: "file",
        content: `{
  "name": "stealth-vscode-chat",
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}`,
      },
    ],
  },
];

const CHAT_START = "// --- chat zone start ---";
const CHAT_END = "// --- chat zone end ---";

const hideBeforeKey = (roomId: string, userName: string) =>
  `stealth_hideBefore_${roomId}_${userName}`;

const App: React.FC = () => {
  const [files, setFiles] = useState<FileNode[]>(createInitialFiles);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(() => [
    {
      id: uuidv4(),
      text: "➜  Local:   http://localhost:5173/",
      color: "green",
    },
    {
      id: uuidv4(),
      text: "➜  Network: use --host to expose",
      color: "green",
    },
    {
      id: uuidv4(),
      text: "➜  press h + enter to show help",
      color: "green",
    },
    {
      id: uuidv4(),
      text: "11:06:09 AM [vite] (client) page reload index.html",
      color: "default",
    },
    {
      id: uuidv4(),
      text: "11:06:09 AM [vite] (client) page reload index.html (x2)",
      color: "default",
    },
    {
      id: uuidv4(),
      text: "11:08:43 AM [vite] (client) hmr update /src/App.tsx",
      color: "default",
    },
    {
      id: uuidv4(),
      text: "11:08:46 AM [vite] (client) hmr update /src/App.tsx (x2)",
      color: "default",
    },
    {
      id: uuidv4(),
      text: '11:14:53 AM [vite] Internal server error: Failed to resolve import "./styles.css"',
      color: "red",
    },
  ]);

  const [terminalHeight, setTerminalHeight] = useState<number>(210);

  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);

  const [login, setLogin] = useState<LoginState>({
    loggedIn: false,
    roomId: null,
    userName: null,
  });
  const [panic, setPanic] = useState(false);
  const [chatFileId, setChatFileId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unsubscribeMessages, setUnsubscribeMessages] =
    useState<null | (() => void)>(null);

  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});
  const [unsubscribePresence, setUnsubscribePresence] =
    useState<null | (() => void)>(null);

  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  const onlineLogRef = useRef<Record<string, number>>({});
  const filesRef = useRef<FileNode[]>(files);
  const chatFileIdRef = useRef<string | null>(chatFileId);
  const panicRef = useRef<boolean>(panic);
  const lastActivityRef = useRef<number>(Date.now());
  const lastHiddenRef = useRef<number | null>(null);
  const editorMainRef = useRef<HTMLDivElement | null>(null);

  filesRef.current = files;
  chatFileIdRef.current = chatFileId;
  panicRef.current = panic;

  const appendTerminalLine = (
    text: string,
    color: "default" | "green" | "red" = "default"
  ) => {
    setTerminalLines((prev) => [...prev, { id: uuidv4(), text, color }]);
  };

  const findFirstSafeFile = (nodes: FileNode[]): string | null => {
    for (const node of nodes) {
      if (node.type === "file" && !node.isChatFile) {
        return node.id;
      }
      if (node.children) {
        const child = findFirstSafeFile(node.children);
        if (child) return child;
      }
    }
    return null;
  };

  const findFileById = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const child = findFileById(node.children, id);
        if (child) return child;
      }
    }
    return null;
  };

  const closeTab = (fileId: string) => {
    setOpenTabs((prev) => {
      const idx = prev.indexOf(fileId);
      const next = prev.filter((id) => id !== fileId);

      if (activeFileId === fileId) {
        if (next.length === 0) {
          setActiveFileId(null);
        } else if (idx > 0) {
          setActiveFileId(next[idx - 1]);
        } else {
          setActiveFileId(next[0]);
        }
      }
      return next;
    });
  };

  const hideChatAndSwitch = () => {
    setPanic(true);
    setActiveFileId((prev) => {
      const chatId = chatFileIdRef.current;
      if (!chatId) return prev;
      if (prev !== chatId) return prev;
      const safe = findFirstSafeFile(filesRef.current);
      return safe ?? null;
    });
  };

  const handleSelectFile = (id: string | null) => {
    setActiveFileId(id);
    if (id) {
      setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.shiftKey &&
        e.key.toLowerCase() === "x" &&
        (e.ctrlKey || e.metaKey)
      ) {
        e.preventDefault();
        hideChatAndSwitch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const visHandler = () => {
      const visible = document.visibilityState === "visible";
      setTabVisible(visible);
      if (visible) {
        lastHiddenRef.current = null;
      } else {
        lastHiddenRef.current = Date.now();
      }
    };
    visHandler();
    document.addEventListener("visibilitychange", visHandler);
    return () => document.removeEventListener("visibilitychange", visHandler);
  }, []);

  useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("mousemove", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("click", markActivity);
    window.addEventListener("scroll", markActivity);
    return () => {
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("click", markActivity);
      window.removeEventListener("scroll", markActivity);
    };
  }, []);

  useEffect(() => {
    const IDLE_MS = 5 * 60 * 1000;
    const CHECK_MS = 30 * 1000;

    const id = window.setInterval(() => {
      if (!login.loggedIn || !chatFileIdRef.current) return;

      const now = Date.now();
      const idleTooLong = now - lastActivityRef.current >= IDLE_MS;
      const hiddenTooLong =
        lastHiddenRef.current !== null &&
        now - lastHiddenRef.current >= IDLE_MS;

      if ((idleTooLong || hiddenTooLong) && !panicRef.current) {
        hideChatAndSwitch();
      }
    }, CHECK_MS);

    return () => window.clearInterval(id);
  }, [login.loggedIn]);

  useEffect(() => {
    if (panic && activeFileId === chatFileId) {
      setActiveFileId(null);
    }
  }, [panic, activeFileId, chatFileId]);

  const ensureChatFile = () => {
    if (chatFileIdRef.current) return;

    let newFiles = [...filesRef.current];
    let inserted = false;
    let createdChatId: string | null = null;

    const insertIntoTree = (nodes: FileNode[]): FileNode[] =>
      nodes.map((node) => {
        if (
          node.type === "folder" &&
          (node.name === "src" || node.name === "lib") &&
          !inserted
        ) {
          const chatId = uuidv4();
          const chatFile: FileNode = {
            id: chatId,
            name: "secret_job.dart",
            type: "file",
            isChatFile: true,
            content: `class SecretJob {
  final int submissionId;
  final int? jobId; // job_id might be null initially

  SecretJob({required this.submissionId, this.jobId});

  factory SecretJob.fromJson(Map<String, dynamic> json) {
    return SecretJob(
      submissionId: json['subid'],
      jobId: json['job_id'], // Can be null
    );
  }
}

${CHAT_START}
// (type your hidden messages below between these markers)

${CHAT_END}

// end of file
`,
          };
          inserted = true;
          createdChatId = chatId;
          return {
            ...node,
            children: [...(node.children || []), chatFile],
          };
        }
        if (node.children) {
          return { ...node, children: insertIntoTree(node.children) };
        }
        return node;
      });

    newFiles = insertIntoTree(newFiles);
    if (!inserted) {
      const id = uuidv4();
      const standalone: FileNode = {
        id,
        name: "secret_job.dart",
        type: "file",
        isChatFile: true,
        content: `class SecretJob {
  final int submissionId;
  final int? jobId;

  SecretJob({required this.submissionId, this.jobId});
}

${CHAT_START}
// (type your hidden messages below between these markers)

${CHAT_END}

// end of file
`,
      };
      newFiles = [...newFiles, standalone];
      createdChatId = id;
    }
    setFiles(newFiles);
    if (createdChatId) {
      setChatFileId(createdChatId);
      chatFileIdRef.current = createdChatId;
    }
  };

  const toJsDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === "function") return value.toDate();
    return null;
  };

  const formatTimeSeparator = (d: Date): string => {
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    const mm = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const timePart = `${hour12}:${mm} ${ampm}`;

    if (isToday) return timePart;

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const datePart = `${d.getDate()} ${months[d.getMonth()]}`;
    return `${datePart} • ${timePart}`;
  };

  useEffect(() => {
    if (!chatFileId) return;

    const currentUser = login.userName ?? "";

    const updated = files.map((root) => {
      const updateNode = (node: FileNode): FileNode => {
        if (node.id === chatFileId && node.content) {
          const content = node.content;
          const startIdx = content.indexOf(CHAT_START);
          const endIdx = content.indexOf(CHAT_END);
          if (startIdx === -1 || endIdx === -1) return node;

          const before = content.slice(0, startIdx + CHAT_START.length);
          const after = content.slice(endIdx);

          const chatLines: string[] = [];
          const HOUR_MS = 60 * 60 * 1000;
          let lastTime: Date | null = null;

          messages.forEach((m) => {
            const created = m.createdAt;
            if (created) {
              if (!lastTime || created.getTime() - lastTime.getTime() >= HOUR_MS) {
                chatLines.push(`// --- ${formatTimeSeparator(created)} ---`);
                lastTime = created;
              }
            }

            const safe = m.content.replace(/"/g, '\\"');
            let marker = "#";
            if (currentUser) {
              if (m.sender === currentUser) {
                const seenByOthers = (m.seenBy || []).some(
                  (u) => u !== currentUser
                );
                marker = seenByOthers ? "##" : "#";
              } else {
                const seenHere = (m.seenBy || []).includes(currentUser);
                marker = seenHere ? "##" : "#";
              }
            }
            chatLines.push(`// ${marker}${m.sender} { "${safe}" }`);
          });

          const middleLines: string[] = [
            "",
            "// (type your hidden messages below between these markers)",
            "",
            ...chatLines,
            "",
          ];

          return {
            ...node,
            content: `${before}${middleLines.join("\n")}\n${after}`,
          };
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      return updateNode(root);
    });

    setFiles(updated);
  }, [messages, chatFileId, login.userName, files]);

  const subscribeToMessages = (roomId: string, userName: string) => {
    if (unsubscribeMessages) unsubscribeMessages();

    const messagesCol = collection(db, "rooms", roomId, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    let firstSnapshot = true;

    const unsub = onSnapshot(q, (snapshot) => {
      let hideBeforeTime: Date | null = null;
      try {
        if (typeof window !== "undefined") {
          const hbRaw = window.localStorage.getItem(
            hideBeforeKey(roomId, userName)
          );
          if (hbRaw) {
            const ms = parseInt(hbRaw, 10);
            if (!Number.isNaN(ms)) hideBeforeTime = new Date(ms);
          }
        }
      } catch {
        /* ignore */
      }

      const docs: ChatMessage[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const createdAt = toJsDate(data.createdAt);

        if (hideBeforeTime && createdAt && createdAt <= hideBeforeTime) return;

        const seenAtRaw = data.seenAt;
        const seenAt: Record<string, Date | null> = {};
        if (seenAtRaw && typeof seenAtRaw === "object") {
          Object.entries(seenAtRaw).forEach(([user, ts]) => {
            seenAt[user] = toJsDate(ts);
          });
        }

        docs.push({
          id: docSnap.id,
          sender: data.sender ?? "unknown",
          content: data.content ?? "",
          createdAt,
          seenBy: Array.isArray(data.seenBy) ? data.seenBy : [],
          seenAt,
        });
      });

      if (firstSnapshot) {
        firstSnapshot = false;
        const unreadCount = docs.filter(
          (m) => m.sender !== userName && !(m.seenBy || []).includes(userName)
        ).length;
        if (unreadCount > 0) {
          appendTerminalLine(
            `ncp summary: new ${unreadCount} message(s)`,
            "green"
          );
        }
      }

      setMessages(docs);
    });

    setUnsubscribeMessages(() => unsub);
  };

  const subscribeToPresence = (roomId: string, currentUser: string) => {
    if (unsubscribePresence) unsubscribePresence();

    const presenceCol = collection(db, "rooms", roomId, "presence");

    const unsub = onSnapshot(presenceCol, (snapshot) => {
      setPresenceMap((prev) => {
        const next: PresenceMap = { ...prev };
        const now = Date.now();

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const name: string = data.userName ?? docSnap.id;
          const status: PresenceStatus =
            (data.status as PresenceStatus) ??
            (data.online ? "online" : "offline");
          const typing: boolean = !!data.typing;

          const prevInfo = prev[name] ?? { status: "offline", typing: false };
          const prevStatus = prevInfo.status;

          if (name !== currentUser && status !== prevStatus) {
            if (status === "online") {
              const lastLog = onlineLogRef.current[name] ?? 0;
              if (now - lastLog > 2000) {
                appendTerminalLine(`user ${name} online`, "green");
                onlineLogRef.current[name] = now;
              }
            } else if (status === "away") {
              appendTerminalLine(`user ${name} away`, "default");
            } else if (status === "offline") {
              appendTerminalLine(`user ${name} offline`, "default");
            }
          }

          next[name] = { status, typing };
        });

        return next;
      });
    });

    setUnsubscribePresence(() => unsub);
  };

  // --- NEW: subscribe to "rings" collection for push-like notifications ---
    const [unsubscribeRings, setUnsubscribeRings] =
    useState<null | (() => void)>(null);

    const subscribeToRings = (roomId: string, currentUser: string) => {
    // unsubscribe previous if any
    if (unsubscribeRings) {
      try {
        unsubscribeRings();
      } catch {
        /* ignore */
      }
      setUnsubscribeRings(null);
    }

    const ringsCol = collection(db, "rooms", roomId, "rings");
    const q = query(ringsCol, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const docSnap = change.doc;
        const data = docSnap.data() as any;
        const sender = data.sender as string | undefined;
        const createdAt = toJsDate(data.createdAt);

        // ignore rings from ourselves (but still cleanup)
        if (!sender || sender === currentUser) {
          deleteDoc(doc(db, "rooms", roomId, "rings", docSnap.id)).catch(
            () => undefined
          );
          return;
        }

        // ignore older rings (avoid initial snapshot firing old docs)
        if (createdAt) {
          const ageMs = Date.now() - createdAt.getTime();
          if (ageMs > 5000) {
            // older than 5s -> treat as historical; just delete and skip notifying
            deleteDoc(doc(db, "rooms", roomId, "rings", docSnap.id)).catch(
              () => undefined
            );
            return;
          }
        }

        // show a desktop/mobile notification (no content)
        try {
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            new Notification("Check out this new version of visual studio code");
          } else {
            // fallback terminal cue
            appendTerminalLine(
              `ring: ${sender} triggered a notification`,
              "green"
            );
          }
        } catch (err) {
          appendTerminalLine(
            `ring: ${sender} triggered a notification`,
            "green"
          );
        }

        appendTerminalLine(`ring received from ${sender}`, "default");

        // remove the ring doc to keep collection clean
        deleteDoc(doc(db, "rooms", roomId, "rings", docSnap.id)).catch(
          () => undefined
        );
      });
    });

    // store unsubscribe so we won't create duplicates later
    setUnsubscribeRings(() => unsub);
    return unsub;
  };

  // --- end rings subscription ---

  const setPresenceStatus = async (
    roomId: string,
    userName: string,
    status: PresenceStatus
  ) => {
    const ref = doc(db, "rooms", roomId, "presence", userName);
    await setDoc(
      ref,
      {
        userName,
        status,
        online: status === "online",
        typing: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const setOnlinePresence = (roomId: string, userName: string) =>
    setPresenceStatus(roomId, userName, "online");
  const setAwayPresence = (roomId: string, userName: string) =>
    setPresenceStatus(roomId, userName, "away");
  const setOfflinePresence = (roomId: string, userName: string) =>
    setPresenceStatus(roomId, userName, "offline");

  const setTypingStatus = async (
    roomId: string,
    userName: string,
    typing: boolean
  ) => {
    const ref = doc(db, "rooms", roomId, "presence", userName);
    await setDoc(
      ref,
      {
        userName,
        typing,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  useEffect(() => {
    if (!login.loggedIn || !login.roomId || !login.userName) return;

    const roomId = login.roomId;
    const userName = login.userName;

    const unloadHandler = () => {
      setOfflinePresence(roomId, userName);
    };

    window.addEventListener("beforeunload", unloadHandler);
    return () => window.removeEventListener("beforeunload", unloadHandler);
  }, [login.loggedIn, login.roomId, login.userName]);

  useEffect(() => {
    if (!login.loggedIn || !login.roomId || !login.userName) return;

    const roomId = login.roomId;
    const userName = login.userName;

    const visHandler = () => {
      if (document.visibilityState === "hidden") {
        setAwayPresence(roomId, userName).catch(() => undefined);
      } else {
        setOnlinePresence(roomId, userName).catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", visHandler);
    return () => document.removeEventListener("visibilitychange", visHandler);
  }, [login.loggedIn, login.roomId, login.userName]);

  useEffect(() => {
    if (
      !login.loggedIn ||
      !login.roomId ||
      !login.userName ||
      !chatFileId ||
      panic ||
      !tabVisible ||
      activeFileId !== chatFileId
    ) {
      return;
    }

    const unseen = messages.filter(
      (m) =>
        m.sender !== login.userName &&
        !(m.seenBy || []).includes(login.userName!)
    );

    if (unseen.length === 0) return;

    unseen.forEach((m) => {
      const ref = doc(db, "rooms", login.roomId!, "messages", m.id);
      updateDoc(ref, {
        seenBy: arrayUnion(login.userName),
        [`seenAt.${login.userName}`]: serverTimestamp(),
      }).catch((err) => console.error("failed to mark seen", err));
    });
  }, [
    messages,
    login.loggedIn,
    login.roomId,
    login.userName,
    chatFileId,
    panic,
    tabVisible,
    activeFileId,
  ]);

  useEffect(() => {
    if (login.loggedIn) return;

    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(IDENTITY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const roomId: string | undefined = parsed.roomId;
      const userName: string | undefined = parsed.userName;
      if (!roomId || !userName) return;

      setLogin({ loggedIn: true, roomId, userName });
      appendTerminalLine(
        `auto-login to room ${roomId} as ${userName}`,
        "green"
      );

      ensureChatFile();
      subscribeToMessages(roomId, userName);
      subscribeToPresence(roomId, userName);
      // subscribe to rings and request permission
      subscribeToRings(roomId, userName);
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        Notification.requestPermission().catch(() => undefined);
      }
      setOnlinePresence(roomId, userName).catch(() => undefined);
    } catch (err) {
      console.error("auto-login failed", err);
    }
  }, [login.loggedIn]);

  useEffect(() => {
    const baseTitle = "Visual Studio Code";

    if (!login.loggedIn || !login.userName) {
      document.title = baseTitle;
      return;
    }

    const currentUser = login.userName;
    const unseenCount = messages.filter(
      (m) =>
        m.sender !== currentUser &&
        !(m.seenBy || []).includes(currentUser)
    ).length;

    const shouldBadge =
      unseenCount > 0 &&
      (!tabVisible || panic || activeFileId !== chatFileId);

    if (shouldBadge) {
      document.title = `(${unseenCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [
    messages,
    login.loggedIn,
    login.userName,
    tabVisible,
    panic,
    activeFileId,
    chatFileId,
  ]);

  // auto-scroll the whole editor to bottom when chat is open and messages change
  useEffect(() => {
    if (!chatFileId || activeFileId !== chatFileId) return;
    if (editorMainRef.current) {
      editorMainRef.current.scrollTop =
        editorMainRef.current.scrollHeight;
    }
  }, [messages.length, activeFileId, chatFileId]);

  const sendMessage = async (text: string) => {
    if (!login.loggedIn || !login.roomId || !login.userName) {
      appendTerminalLine("error: not logged in", "red");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    const messagesCol = collection(db, "rooms", login.roomId, "messages");
    await addDoc(messagesCol, {
      sender: login.userName,
      content: trimmed,
      createdAt: serverTimestamp(),
      seenBy: [login.userName],
      seenAt: {
        [login.userName]: serverTimestamp(),
      },
    });
  };

  const handleSendChat = async (text: string) => {
    try {
      await sendMessage(text);
      appendTerminalLine("message sent", "green");
    } catch (err) {
      console.error(err);
      if (err instanceof FirebaseError) {
        appendTerminalLine(`firebase error: ${err.code}`, "red");
      } else {
        appendTerminalLine(`error: ${String(err)}`, "red");
      }
    }
  };

  const handleTypingStart = async () => {
    if (!login.loggedIn || !login.roomId || !login.userName) return;
    if (isTypingLocal) return;
    setIsTypingLocal(true);
    try {
      await setTypingStatus(login.roomId, login.userName, true);
    } catch (err) {
      console.error("failed to set typing true", err);
    }
  };

  const handleTypingStop = async () => {
    if (!login.loggedIn || !login.roomId || !login.userName) return;
    if (!isTypingLocal) return;
    setIsTypingLocal(false);
    try {
      await setTypingStatus(login.roomId, login.userName, false);
    } catch (err) {
      console.error("failed to set typing false", err);
    }
  };

  const handleCommand = async (raw: string) => {
    const input = raw.trim();
    if (!input) return;

    appendTerminalLine(`> ${input}`, "default");

    const [cmd, ...rest] = input.split(" ");

    if (cmd === "help" || (cmd === "h" && rest.length === 0)) {
      appendTerminalLine("available commands:", "default");
      appendTerminalLine("  login <room_id> [user_name]", "default");
      appendTerminalLine("  ncp run", "default");
      appendTerminalLine("  hide_chat", "default");
      appendTerminalLine("  clear_local", "default");
      appendTerminalLine("  logout", "default");
      appendTerminalLine("  send <message>", "default");
      appendTerminalLine("  git status", "default");
      appendTerminalLine("  npm run dev", "default");
      appendTerminalLine("  flutter run", "default");
      appendTerminalLine("  ring (notify other users)", "default");
      return;
    }

    if (cmd === "git" && rest[0] === "status") {
      appendTerminalLine("On branch main", "default");
      appendTerminalLine(
        "Your branch is up to date with 'origin/main'.",
        "default"
      );
      appendTerminalLine("", "default");
      appendTerminalLine(
        "nothing to commit, working tree clean",
        "default"
      );
      return;
    }

    if (cmd === "npm" && rest[0] === "run" && rest[1] === "dev") {
      appendTerminalLine("> stealth-vscode-chat@0.0.1 dev", "default");
      appendTerminalLine("> vite", "default");
      appendTerminalLine("", "default");
      appendTerminalLine("VITE v5.0.0  ready in 450 ms", "green");
      appendTerminalLine("➜  Local:   http://localhost:5173/", "green");
      appendTerminalLine("➜  Network: use --host to expose", "green");
      appendTerminalLine("➜  press h + enter to show help", "green");
      return;
    }

    if (cmd === "flutter" && rest[0] === "run") {
      appendTerminalLine(
        "Launching lib/main.dart on Chrome in debug mode...",
        "default"
      );
      appendTerminalLine(
        "Waiting for connection from debug service on Chrome...",
        "default"
      );
      appendTerminalLine(
        "Debug service listening on ws://127.0.0.1:12345/abcd=",
        "default"
      );
      appendTerminalLine("Running with sound null safety", "green");
      return;
    }

    if (cmd === "login") {
      if (login.loggedIn) {
        appendTerminalLine("already logged in; use logout first", "red");
        return;
      }

      const roomId = rest[0];
      const userName = rest[1] ?? "dev";
      if (!roomId) {
        appendTerminalLine("usage: login <room_id> [user_name]", "red");
        return;
      }

      setLogin({ loggedIn: true, roomId, userName });
      appendTerminalLine(
        `logged into room ${roomId} as ${userName}`,
        "green"
      );

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            IDENTITY_KEY,
            JSON.stringify({ roomId, userName })
          );
        }
      } catch {
        /* ignore */
      }

      ensureChatFile();
      subscribeToMessages(roomId, userName);
      subscribeToPresence(roomId, userName);
      // subscribe to rings and request permission
      subscribeToRings(roomId, userName);
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        Notification.requestPermission().catch(() => undefined);
      }
      await setOnlinePresence(roomId, userName).catch(() => undefined);
      return;
    }

    if (cmd === "ncp" && rest[0] === "run") {
      if (!login.loggedIn) {
        appendTerminalLine("error: not logged in", "red");
        return;
      }
      if (chatFileIdRef.current) {
        setPanic(false);
        setActiveFileId(chatFileIdRef.current);
        setOpenTabs((prev) =>
          prev.includes(chatFileIdRef.current!)
            ? prev
            : [...prev, chatFileIdRef.current!]
        );
        appendTerminalLine("running ncp... opening job file", "green");
      } else {
        appendTerminalLine("chat file not initialized", "red");
      }
      return;
    }

    if (cmd === "hide_chat") {
      hideChatAndSwitch();
      appendTerminalLine("chat file hidden", "green");
      return;
    }

    if (cmd === "logout") {
      if (login.loggedIn && login.roomId && login.userName) {
        await setTypingStatus(login.roomId, login.userName, false).catch(
          () => undefined
        );
        await setOfflinePresence(login.roomId, login.userName).catch(
          () => undefined
        );
      }

      setLogin({ loggedIn: false, roomId: null, userName: null });
      setPanic(true);

      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribePresence) unsubscribePresence();

      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(IDENTITY_KEY);
        }
      } catch {
        /* ignore */
      }

      appendTerminalLine("logged out. chat file hidden", "green");
      return;
    }

    if (cmd === "clear_local") {
      if (!login.loggedIn || !login.roomId || !login.userName) {
        appendTerminalLine("error: not logged in", "red");
        return;
      }
      const nowMs = Date.now();
      try {
        if (typeof window !== "undefined") {
          const hbKey = hideBeforeKey(login.roomId, login.userName);
          window.localStorage.setItem(hbKey, String(nowMs));
        }
      } catch {
        /* ignore */
      }
      setMessages((prev) =>
        prev.filter((m) => !m.createdAt || m.createdAt.getTime() >= nowMs)
      );
      appendTerminalLine(
        "local chat history cleared (server copy still exists)",
        "green"
      );
      return;
    }

    if (cmd === "send") {
      const msgText = rest.join(" ");
      if (!msgText) {
        appendTerminalLine("usage: send <your message>", "red");
        return;
      }
      await handleSendChat(msgText);
      return;
    }

    // NEW: ring command - notify other users with a short push-like notification (no message content)
    if (cmd === "ring") {
      if (!login.loggedIn || !login.roomId || !login.userName) {
        appendTerminalLine("error: not logged in", "red");
        return;
      }
      try {
        const ringsCol = collection(db, "rooms", login.roomId, "rings");
        await addDoc(ringsCol, {
          sender: login.userName,
          createdAt: serverTimestamp(),
        });
        appendTerminalLine("ring sent", "green");
      } catch (err) {
        appendTerminalLine("failed to send ring", "red");
        console.error("ring send failed", err);
      }
      return;
    }

    appendTerminalLine(`unknown command: ${cmd}`, "red");
  };

  const typingUsers =
    login.userName && Object.keys(presenceMap).length
      ? Object.entries(presenceMap)
          .filter(
            ([name, info]) => name !== login.userName && info.typing
          )
          .map(([name]) => name)
      : [];

  return (
    <div className="app-root">
      <div className="top-bar">
        <span>stealth-vscode-chat - Visual Studio Code</span>
      </div>

      <div className="main-area">
        <div className="activity-bar">
          <div
            className={`activity-icon ${
              sidebarVisible ? "active" : ""
            }`}
            title="Explorer"
            onClick={() => setSidebarVisible((v) => !v)}
          >
            📁
          </div>
          <div className="activity-icon" title="Search">
            🔍
          </div>
          <div className="activity-icon" title="Source Control">
            ⧉
          </div>
          <div className="activity-icon" title="Run and Debug">
            ▶
          </div>
          <div className="activity-icon" title="Extensions">
            ⬡
          </div>
        </div>

        {sidebarVisible && (
          <div className="sidebar">
            <div className="sidebar-header">EXPLORER</div>
            <div className="sidebar-tree">
              <Explorer
                files={files}
                setFiles={setFiles}
                activeFileId={activeFileId}
                onSelectFile={handleSelectFile}
              />
            </div>
          </div>
        )}

        <div className="editor-area">
          <div className="tabs-bar">
            {openTabs.map((id) => {
              const file = findFileById(files, id);
              if (!file) return null;
              const isActive = id === activeFileId;
              return (
                <div
                  key={id}
                  className={`tab-item ${
                    isActive ? "tab-item-active" : ""
                  }`}
                  onClick={() => setActiveFileId(id)}
                >
                  <span className="tab-icon">●</span>
                  <span className="tab-label">{file.name}</span>
                  <span
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(id);
                    }}
                  >
                    ×
                  </span>
                </div>
              );
            })}
          </div>

          {/* scrollable coding area */}
          <div className="editor-main" ref={editorMainRef}>
            <Editor
              files={files}
              activeFileId={activeFileId}
              setFiles={setFiles}
              panic={panic}
              onSendChat={handleSendChat}
              chatMessages={messages}
              currentUser={login.userName}
              typingUsers={typingUsers}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
            />
          </div>

          {/* terminal stays at bottom of main area */}
          <Terminal
            lines={terminalLines}
            onCommand={handleCommand}
            height={terminalHeight}
            onHeightChange={setTerminalHeight}
          />
        </div>
      </div>

      <div className="status-bar">
        <div className="status-left">
          <span className="status-segment">Ln 14, Col 1</span>
          <span className="status-segment">Spaces: 2</span>
          <span className="status-segment">UTF-8</span>
          <span className="status-segment">LF</span>
          <span className="status-segment">TypeScript React</span>
        </div>
        <div className="status-right">
          <span className="status-segment">HTML</span>
          <span className="status-segment">Finish Setup</span>
          <span className="status-segment">Go Live</span>
          <span className="status-segment">
            {login.loggedIn
              ? `$(remote) Connected to ${login.roomId}`
              : "Not connected"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
