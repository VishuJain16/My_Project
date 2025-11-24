import React, { useEffect, useRef, useState } from "react";

export type TerminalLine = {
  id: string;
  text: string;
  color: "default" | "green" | "red";
};

interface TerminalProps {
  lines: TerminalLine[];
  onCommand: (input: string) => void;
  height: number;
  onHeightChange: (h: number) => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  lines,
  onCommand,
  height,
  onHeightChange,
}) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = input.trim();
      if (!value) return;
      onCommand(value);
      setInput("");
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const handleMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const newHeight = Math.min(
        500,
        Math.max(80, startHeight - delta)
      );
      onHeightChange(newHeight);
    };

    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const renderLine = (line: TerminalLine) => {
    let className = "terminal-line";
    if (line.color === "green") className += " terminal-line-green";
    if (line.color === "red") className += " terminal-line-red";
    return (
      <div key={line.id} className={className}>
        {line.text}
      </div>
    );
  };

  return (
    <div className="terminal-root" style={{ height }}>
      <div
        className="terminal-resize-handle"
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize"
      >
        <div className="terminal-resize-grip" />
      </div>

      <div className="terminal-header">
        <div className="terminal-tabs">
          <div className="terminal-tab">PROBLEMS</div>
          <div className="terminal-tab">OUTPUT</div>
          <div className="terminal-tab">DEBUG CONSOLE</div>
          <div className="terminal-tab terminal-tab-active">TERMINAL</div>
          <div className="terminal-tab">PORTS</div>
        </div>
        <div className="terminal-header-actions">
          <span className="terminal-header-icon">➕</span>
          <span className="terminal-header-icon">▼</span>
        </div>
      </div>

      <div className="terminal-body" ref={scrollRef}>
        {lines.map(renderLine)}
      </div>

      <div className="terminal-input-row">
        <span className="terminal-prompt">
          PS C:\Users\new_project&gt;{" "}
        </span>
        <input
          className="terminal-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      </div>

      <div className="terminal-footer">
        <span>PowerShell</span>
        <span>esbuild</span>
      </div>
    </div>
  );
};
