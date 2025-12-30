import React from 'react';
import { FileSystemItem, DraggedItemInfo } from '../types';
import { Folder, FileText, Plus } from 'lucide-react';

interface FileExplorerProps {
    currentPath: string[];
    currentDir: FileSystemItem;
    selectedItems: string[];
    onSelectItem: (name: string, multi: boolean) => void;
    onNavigate: (name: string) => void;
    onCreateClick: () => void;
    onDragStart: (e: React.DragEvent, item: FileSystemItem) => void;
    onDragOver: (e: React.DragEvent, item: FileSystemItem) => void;
    onDrop: (e: React.DragEvent, item: FileSystemItem) => void;
    onDragEnd: (e: React.DragEvent) => void;
    draggedItemInfo: DraggedItemInfo | null;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
    currentPath,
    currentDir,
    selectedItems,
    onSelectItem,
    onNavigate,
    onCreateClick,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
}) => {
    const children = currentDir.children || [];
    const sortedChildren = [...children].sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name, 'vi');
    });

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md min-h-[400px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentPath.length <= 1 && (
                    <div 
                        onClick={onCreateClick}
                        className="flex items-center justify-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-indigo-100 border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-all duration-200 h-full min-h-[60px]"
                    >
                        <div className="text-center text-slate-500 flex flex-col items-center">
                            <Plus size={24} className="mb-2" />
                            <span className="font-semibold">{currentPath.length === 0 ? 'Tạo loại đề mới' : 'Tạo chủ đề mới'}</span>
                        </div>
                    </div>
                )}

                {sortedChildren.map((item) => {
                    const isSelected = selectedItems.includes(item.name);
                    return (
                        <div 
                            key={item.name}
                            className={`relative flex items-center p-3 bg-slate-100 rounded-lg transition-all duration-200 ${isSelected ? 'bg-sky-100 ring-2 ring-sky-500' : ''}`}
                            data-name={item.name}
                            data-type={item.type}
                            onDragOver={(e) => item.type === 'folder' ? onDragOver(e, item) : undefined}
                            onDrop={(e) => item.type === 'folder' ? onDrop(e, item) : undefined}
                            onDragLeave={(e) => {
                                e.currentTarget.classList.remove('dragging-over');
                            }}
                        >
                            <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => onSelectItem(item.name, false)}
                                className="h-5 w-5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                            />
                            <div 
                                className="item-clickable flex items-center cursor-pointer ml-3 flex-grow min-w-0"
                                draggable
                                onDragStart={(e) => onDragStart(e, item)}
                                onDragEnd={onDragEnd}
                                onClick={() => {
                                    if (item.type === 'folder') {
                                        onNavigate(item.name);
                                    } else {
                                        onSelectItem(item.name, false);
                                    }
                                }}
                            >
                                <div className="mr-3 flex-shrink-0">
                                    {item.type === 'folder' ? (
                                        <Folder className="text-amber-500" size={24} />
                                    ) : (
                                        <FileText className="text-slate-600" size={24} />
                                    )}
                                </div>
                                <span className="font-medium text-slate-700 truncate">{item.name}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {children.length === 0 && currentPath.length > 0 && (
                <div className="flex items-center justify-center flex-col text-center py-20">
                     <Folder size={64} className="text-slate-400 mb-4" />
                     <p className="text-slate-500 font-semibold">Thư mục này trống.</p>
                     <p className="text-slate-400 text-sm mt-1">Bạn có thể tạo chủ đề mới hoặc tải lên tệp.</p>
                </div>
            )}
        </div>
    );
};

export default FileExplorer;