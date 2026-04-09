import type { RefObject } from "react";
import Input from "../components/form/input/InputField";
import CustomSelect from "../components/form/CustomSelect";

interface FormData {
    title: string;
    description: string;
    user_id: string;
    priority: "low" | "medium" | "high";
    status: "pending" | "in_progress" | "completed";
    due_date: string;
}

interface User {
    id: number;
    username: string;
    full_name?: string;
}

interface TaskFormFieldsProps {
    form: FormData;
    onChange: (k: string, v: string) => void;
    users: User[];
    titleRef?: RefObject<HTMLInputElement | null>;
    descriptionRef?: RefObject<HTMLTextAreaElement | null>;
}

const TaskFormFields = ({
    form,
    onChange,
    users,
    titleRef,
    descriptionRef
}: TaskFormFieldsProps) => (
    <div className="grid grid-cols-1 gap-4">
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Title *</label>
            <Input
                ref={titleRef}
                type="text"
                placeholder="Task title"
                value={form.title}
                onChange={(e: any) => onChange("title", e.target.value)}
            />
        </div>
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Description</label>
            <textarea
                ref={descriptionRef}
                placeholder="Task description (optional)"
                value={form.description}
                onChange={e => onChange("description", e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                onKeyUp={e => e.stopPropagation()}
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-gray-300 dark:placeholder-gray-500 resize-none"
            />
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Assign To</label>
                <CustomSelect
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
                    value={form.user_id}
                    onChange={v => onChange("user_id", v)}
                    options={[{ value: "", label: "Open Pool (Unassigned)" }, ...users.map(u => ({ value: String(u.id), label: u.full_name || u.username }))]}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Priority</label>
                <CustomSelect
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
                    value={form.priority}
                    onChange={v => onChange("priority", v)}
                    options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]}
                />
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Status</label>
                <CustomSelect
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
                    value={form.status}
                    onChange={v => onChange("status", v)}
                    options={[{ value: "pending", label: "Pending" }, { value: "in_progress", label: "In Progress" }, { value: "completed", label: "Completed" }]}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Due Date</label>
                <Input type="datetime-local" value={form.due_date} onChange={(e: any) => onChange("due_date", e.target.value)} />
            </div>
        </div>
    </div>
);

TaskFormFields.displayName = "TaskFormFields";

export default TaskFormFields;
