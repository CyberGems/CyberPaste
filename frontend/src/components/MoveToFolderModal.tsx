import React from 'react';
import { X, Folder, FolderPlus } from 'lucide-react';
import { FolderItem } from '../types';

interface MoveToFolderModalProps {
  isOpen: boolean;
  folders: FolderItem[];
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
}

export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  isOpen,
  folders,
  onClose,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div
        className="animate-in zoom-in-95 flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight text-primary">
            <Folder size={16} />
            Move to Folder
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
          {/* Main Clipboard Option */}
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="group mb-1 flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/20">
              <FolderPlus size={16} />
            </div>
            <span className="text-sm font-medium">Main Clipboard</span>
          </button>

          {folders
            .filter((f) => !f.is_system)
            .map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  onSelect(folder.id);
                  onClose();
                }}
                className="group mb-1 flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors group-hover:opacity-80"
                  style={{
                    backgroundColor: folder.color
                      ? `${folder.color}20`
                      : 'rgba(var(--primary-rgb), 0.1)',
                  }}
                >
                  <Folder size={16} style={{ color: folder.color || 'currentColor' }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="block truncate text-sm font-medium">{folder.name}</span>
                  <span className="block text-[10px] opacity-40">
                    {folder.item_count || 0} items
                  </span>
                </div>
              </button>
            ))}

          {folders.filter((f) => !f.is_system).length === 0 && (
            <div className="p-8 text-center text-sm italic opacity-30">No folders created yet</div>
          )}
        </div>
      </div>
    </div>
  );
};
