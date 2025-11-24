import React, { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  isChatFile?: boolean;
  content?: string;
}

interface ExplorerProps {
  files: FileNode[];
  activeFileId: string | null;
  onSelectFile: (id: string | null) => void;
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
}

type ContextMenuState = {
  x: number;
  y: number;
  nodeId: string | null;
  isEmpty: boolean;
} | null;

const EXPANDED_KEY = "stealth_explorer_expanded_paths";

const buildAllExpandedPaths = (nodes: FileNode[]): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  const walk = (list: FileNode[], parentPath: string | null) => {
    list.forEach((node) => {
      const path = parentPath ? `${parentPath}/${node.name}` : node.name;
      if (node.type === "folder") {
        map[path] = true;
        if (node.children) walk(node.children, path);
      }
    });
  };
  walk(nodes, null);
  return map;
};

export const Explorer: React.FC<ExplorerProps> = ({
  files,
  activeFileId,
  onSelectFile,
  setFiles,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>(
    () => {
      try {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(EXPANDED_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              return parsed as Record<string, boolean>;
            }
          }
        }
      } catch {
        /* ignore */
      }
      return buildAllExpandedPaths(files);
    }
  );

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          EXPANDED_KEY,
          JSON.stringify(expandedPaths)
        );
      }
    } catch {
      /* ignore */
    }
  }, [expandedPaths]);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const updateFiles = (updater: (prev: FileNode[]) => FileNode[]) => {
    setFiles((prev) => updater(prev));
  };

  const toggleExpanded = (path: string) => {
    setExpandedPaths((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleNewFile = () => {
    updateFiles((prev) => {
      const newFile: FileNode = {
        id: uuidv4(),
        name: "new_file.ts",
        type: "file",
        content: "",
      };

      if (prev.length === 0) return [newFile];

      const insertIntoFirstFolder = (nodes: FileNode[]): FileNode[] =>
        nodes.map((node, idx) => {
          if (idx === 0 && node.type === "folder") {
            return {
              ...node,
              children: [...(node.children || []), newFile],
            };
          }
          if (node.children) {
            return { ...node, children: insertIntoFirstFolder(node.children) };
          }
          return node;
        });

      return insertIntoFirstFolder(prev);
    });
  };

  const handleNewFolder = () => {
    updateFiles((prev) => {
      const newFolder: FileNode = {
        id: uuidv4(),
        name: "new_folder",
        type: "folder",
        children: [],
      };

      if (prev.length === 0) return [newFolder];

      const insertIntoFirstFolder = (nodes: FileNode[]): FileNode[] =>
        nodes.map((node, idx) => {
          if (idx === 0 && node.type === "folder") {
            return {
              ...node,
              children: [...(node.children || []), newFolder],
            };
          }
          if (node.children) {
            return { ...node, children: insertIntoFirstFolder(node.children) };
          }
          return node;
        });

      return insertIntoFirstFolder(prev);
    });
  };

  const renameNode = (
    nodes: FileNode[],
    id: string,
    newName: string
  ): FileNode[] =>
    nodes.map((node) => {
      if (node.id === id) return { ...node, name: newName };
      if (node.children)
        return { ...node, children: renameNode(node.children, id, newName) };
      return node;
    });

  const deleteNode = (nodes: FileNode[], id: string): FileNode[] =>
    nodes
      .filter((node) => node.id !== id)
      .map((node) =>
        node.children
          ? { ...node, children: deleteNode(node.children, id) }
          : node
      );

  const startRename = (nodeId: string, currentName: string) => {
    setRenamingId(nodeId);
    setRenameValue(currentName);
    setContextMenu(null);
  };

  const confirmRename = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    updateFiles((prev) => renameNode(prev, renamingId, trimmed));
    setRenamingId(null);
  };

  const handleDelete = (id: string) => {
    setContextMenu(null);
    updateFiles((prev) => deleteNode(prev, id));
    if (id === activeFileId) onSelectFile(null);
  };

  const handleNodeContextMenu = (
    e: React.MouseEvent,
    node: FileNode
  ): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id,
      isEmpty: false,
    });
  };

  const handleEmptyContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId: null,
      isEmpty: true,
    });
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handler = () => closeContextMenu();
    if (contextMenu) {
      window.addEventListener("click", handler);
    }
    return () => {
      window.removeEventListener("click", handler);
    };
  }, [contextMenu, closeContextMenu]);

  return (
    <div className="explorer-root">
      <div className="explorer-workspace-header">
        <span>new_project</span>
        <div className="explorer-actions">
          <button
            className="explorer-action-btn"
            title="New File"
            onClick={handleNewFile}
          >
            +
          </button>
          <button
            className="explorer-action-btn"
            title="New Folder"
            onClick={handleNewFolder}
          >
            📁
          </button>
        </div>
      </div>

      <div className="explorer-tree" onContextMenu={handleEmptyContextMenu}>
        {files.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            parentPath={null}
            expandedPaths={expandedPaths}
            onTogglePath={toggleExpanded}
            activeFileId={activeFileId}
            onSelect={onSelectFile}
            onContextMenu={handleNodeContextMenu}
            renamingId={renamingId}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            confirmRename={confirmRename}
          />
        ))}
      </div>

      {contextMenu && (
        <div
          className="explorer-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
        >
          {contextMenu.isEmpty ? (
            <>
              <div className="explorer-context-item disabled">New File</div>
              <div className="explorer-context-item disabled">New Folder</div>
              <div className="explorer-context-separator" />
              <div className="explorer-context-item disabled">
                Reveal in File Explorer
              </div>
            </>
          ) : (
            <>
              <div className="explorer-context-item disabled">
                Open to the Side
              </div>
              <div className="explorer-context-item disabled">
                Reveal in File Explorer
              </div>
              <div className="explorer-context-separator" />
              <div className="explorer-context-item disabled">Copy Path</div>
              <div className="explorer-context-item disabled">
                Copy Relative Path
              </div>
              <div className="explorer-context-separator" />
              <div
                className="explorer-context-item"
                onClick={() => {
                  if (!contextMenu.nodeId) return;
                  const nodeId = contextMenu.nodeId;
                  const findName = (nodes: FileNode[]): string | null => {
                    for (const n of nodes) {
                      if (n.id === nodeId) return n.name;
                      if (n.children) {
                        const r = findName(n.children);
                        if (r) return r;
                      }
                    }
                    return null;
                  };
                  const name = findName(files) || "";
                  startRename(nodeId, name);
                }}
              >
                Rename
              </div>
              <div
                className="explorer-context-item"
                onClick={() => {
                  if (!contextMenu.nodeId) return;
                  handleDelete(contextMenu.nodeId);
                }}
              >
                Delete
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface TreeNodeProps {
  node: FileNode;
  level: number;
  parentPath: string | null;
  expandedPaths: Record<string, boolean>;
  onTogglePath: (path: string) => void;
  activeFileId: string | null;
  onSelect: (id: string | null) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  confirmRename: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  parentPath,
  expandedPaths,
  onTogglePath,
  activeFileId,
  onSelect,
  onContextMenu,
  renamingId,
  renameValue,
  setRenameValue,
  confirmRename,
}) => {
  const isFolder = node.type === "folder";
  const path = parentPath ? `${parentPath}/${node.name}` : node.name;
  const isExpanded = isFolder ? !!expandedPaths[path] : false;
  const isActive = node.id === activeFileId;
  const indent = 8 + level * 12;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      onTogglePath(path);
    } else {
      onSelect(node.id);
    }
  };

  const chevron = isFolder ? (isExpanded ? "▾" : "▸") : " ";
  const icon = isFolder ? "📂" : "📄";

  const nameContent =
    renamingId === node.id ? (
      <input
        autoFocus
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onBlur={confirmRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirmRename();
          if (e.key === "Escape") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={{
          background: "transparent",
          border: "1px solid #555",
          color: "#eee",
          fontSize: 12,
          padding: "0 2px",
          width: "100%",
        }}
      />
    ) : (
      <span>{node.name}</span>
    );

  return (
    <div>
      <div
        className="explorer-row"
        style={{ paddingLeft: indent }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        <span className="explorer-chevron">{chevron}</span>
        <span className="explorer-icon">{icon}</span>
        <span
          className={
            isActive ? "explorer-label explorer-label-active" : "explorer-label"
          }
        >
          {nameContent}
        </span>
      </div>
      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              parentPath={path}
              expandedPaths={expandedPaths}
              onTogglePath={onTogglePath}
              activeFileId={activeFileId}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              confirmRename={confirmRename}
            />
          ))}
        </div>
      )}
    </div>
  );
};
