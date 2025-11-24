import React, { useMemo, useState, useEffect, useRef } from "react";
import type { JSX, KeyboardEvent } from "react";
import type { FileNode } from "./Explorer";
import type { ChatMessage } from "../App";

const CHAT_START = "// --- chat zone start ---";
const CHAT_END = "// --- chat zone end ---";

interface EditorProps {
  files: FileNode[];
  activeFileId: string | null;
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  panic: boolean;
  onSendChat: (text: string) => Promise<void> | void;
  chatMessages: ChatMessage[];
  currentUser: string | null;
  typingUsers: string[];
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  files,
  activeFileId,
  setFiles,
  panic,
  onSendChat,
  chatMessages,
  currentUser,
  typingUsers,
  onTypingStart,
  onTypingStop,
}) => {
  const activeFile = useMemo<FileNode | null>(() => {
    if (!activeFileId) return null;

    const findById = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.id === activeFileId) return node;
        if (node.children) {
          const child = findById(node.children);
          if (child) return child;
        }
      }
      return null;
    };

    return findById(files);
  }, [files, activeFileId]);

  const [chatInput, setChatInput] = useState("");
  const typingTimeoutRef = useRef<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // auto-scroll tiny chat window to bottom when messages change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop =
        chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  const handleChatInputChange = (value: string) => {
    setChatInput(value);
    onTypingStart();

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      onTypingStop();
    }, 1200);
  };

  const formatTime = (d: Date | null): string | null => {
    if (!d) return null;
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

  const formatTimeSeparator = (d: Date): string => {
    // same as formatTime but never null
    const s = formatTime(d);
    return s ?? "";
  };

  const handleChatKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Send" || e.keyCode === 13) {
      e.preventDefault();
      e.stopPropagation();

      const baseText = chatInput.trim();
      if (!baseText) return;

      let finalText = baseText;
      if (replyTarget) {
        const snippet =
          replyTarget.content.length > 24
            ? replyTarget.content.slice(0, 24) + "..."
            : replyTarget.content;
        finalText = `replied to { "${snippet}" } ${baseText}`;
      }

      setChatInput("");
      setReplyTarget(null);
      onTypingStop();
      await onSendChat(finalText);
    }
  };

  const updateFileContent = (fileId: string, newContent: string) => {
    setFiles((prev) =>
      prev.map((root) => {
        const updateNode = (node: FileNode): FileNode => {
          if (node.id === fileId) {
            return { ...node, content: newContent };
          }
          if (node.children) {
            return { ...node, children: node.children.map(updateNode) };
          }
          return node;
        };
        return updateNode(root);
      })
    );
  };

  if (!activeFile || !activeFile.content) {
    return (
      <div className="editor-empty">
        <span>Select a file from the Explorer to start editing.</span>
      </div>
    );
  }

  if (!activeFile.isChatFile) {
    return (
      <div className="editor-container">
        <textarea
          className="editor-textarea"
          value={activeFile.content}
          onChange={(e) => updateFileContent(activeFile.id, e.target.value)}
          spellCheck={false}
        />
      </div>
    );
  }

  // special rendering for chat file
  const allLines = activeFile.content.split("\n");
  const startIdx = allLines.findIndex((l) => l.includes(CHAT_START));
  const endIdx = allLines.findIndex((l) => l.includes(CHAT_END));

  const beforeLines =
    startIdx === -1 ? allLines : allLines.slice(0, startIdx + 1);
  const afterLines = endIdx === -1 ? [] : allLines.slice(endIdx);

  // typing indicator
  let typingLine = "";
  if (typingUsers.length === 1) {
    typingLine = `// ${typingUsers[0]} is typing...`;
  } else if (typingUsers.length > 1) {
    typingLine = "// multiple users are typing...";
  }

  const isOwn = (m: ChatMessage) => m.sender === currentUser;

  const buildMarker = (m: ChatMessage): string => {
    if (!currentUser) return "#";
    if (isOwn(m)) {
      const seenByOthers = (m.seenBy || []).some(
        (u) => u !== currentUser
      );
      return seenByOthers ? "##" : "#";
    } else {
      const seenHere = (m.seenBy || []).includes(currentUser);
      return seenHere ? "##" : "#";
    }
  };

  const buildHoverText = (m: ChatMessage): string => {
    const sent = formatTime(m.createdAt);
    let read: string | null = null;

    if (currentUser) {
      if (isOwn(m)) {
        const others = Object.entries(m.seenAt || {}).filter(
          ([user]) => user !== currentUser
        );
        if (others.length > 0) {
          const dates = others
            .map(([, t]) => (t ? t : null))
            .filter((v): v is Date => !!v);
          const latest =
            dates
              .sort((a, b) => {
                const ta = a ? a.getTime() : 0;
                const tb = b ? b.getTime() : 0;
                return ta - tb;
              })
              .pop() ?? null;
          read = formatTime(latest);
        }
      } else {
        const t = (m.seenAt && m.seenAt[currentUser]) || null;
        read = formatTime(t);
      }
    }

    if (!sent && !read) return "";
    if (sent && !read) return `message sent on ${sent}`;
    if (!sent && read) return `message read on ${read}`;
    return `message sent on ${sent}\nmessage read on ${read}`;
  };

  const handleReplyDoubleClick = (m: ChatMessage) => {
    setReplyTarget(m);
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop =
        chatScrollRef.current.scrollHeight;
    }
    const input = document.querySelector<HTMLInputElement>(".chat-input");
    if (input) {
      input.focus();
    }
  };

  const HOUR_MS = 60 * 60 * 1000;
  const renderedLines: JSX.Element[] = [];
  let lastTime: Date | null = null;

  chatMessages.forEach((m) => {
    const created = m.createdAt;

    if (created) {
      if (!lastTime || created.getTime() - lastTime.getTime() >= HOUR_MS) {
        const label = formatTimeSeparator(created);
        if (label) {
          renderedLines.push(
            <div
              key={`ts-${m.id}`}
              className="chat-line chat-line-timestamp"
            >
              <span className="chat-line-text">{`// --- ${label} ---`}</span>
            </div>
          );
        }
        lastTime = created;
      }
    }

    const marker = buildMarker(m);
    const safe = m.content.replace(/"/g, '\\"');
    const text = `// ${marker}${m.sender} { "${safe}" }`;
    const hover = buildHoverText(m);
    const replyPreview =
      replyTarget && replyTarget.id === m.id
        ? "// replying to this message"
        : null;

    renderedLines.push(
      <div
        key={m.id}
        className="chat-line"
        onDoubleClick={() => handleReplyDoubleClick(m)}
      >
        <span className="chat-line-text">{text}</span>
        {hover && (
          <div className="chat-line-tooltip">
            {hover.split("\n").map((part, idx) => (
              <div key={idx}>{part}</div>
            ))}
          </div>
        )}
        {replyPreview && (
          <div className="chat-line-reply-indicator">{replyPreview}</div>
        )}
      </div>
    );
  });

  return (
    <div className="editor-container">
      <pre className="editor-code">{beforeLines.join("\n")}</pre>

      <div className={`chat-inline ${panic ? "chat-inline-hidden" : ""}`}>
        <div className="chat-inline-scroll" ref={chatScrollRef}>
          {renderedLines}
        </div>

        <div className="chat-input-row">
          <span className="chat-input-prefix">// </span>
          <input
            className="chat-input"
            value={chatInput}
            onChange={(e) => handleChatInputChange(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder={replyTarget ? `replying to "${replyTarget.content.slice(0, 24)}..." ` : "type hidden message and press Enter"}
            spellCheck={false}
            enterKeyHint="send"
            autoCorrect="off"
            autoCapitalize="none"
          />

        </div>
        {typingLine && (
          <div className="chat-typing-line">
            <span>{typingLine}</span>
          </div>
        )}
      </div>

      <pre className="editor-code">{afterLines.join("\n")}</pre>
    </div>
  );
};
