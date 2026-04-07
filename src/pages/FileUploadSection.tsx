import React from "react";

interface FileUploadSectionProps {
    files: File[];
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
    isCreating?: boolean;
    fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

const FileUploadSection = ({
    files,
    onFileSelect,
    onRemove,
    isCreating = false,
    fileInputRef
}: FileUploadSectionProps) => {
    const fileInputId = isCreating ? "create-file-input" : "edit-file-input";

    return (
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Attachments</label>
            <div className="flex gap-2 mb-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileSelect}
                    className="hidden"
                    id={fileInputId}
                    multiple
                />
                <button
                    type="button"
                    onClick={() => fileInputRef?.current?.click()}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors"
                >
                    Add File
                </button>
            </div>
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{file.name}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{(file.size / 1024).toFixed(0)}KB</span>
                            <button
                                type="button"
                                onClick={() => onRemove(idx)}
                                className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-xs font-bold"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUploadSection;
