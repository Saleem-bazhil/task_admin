import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { ChevronDownIcon } from "../../icons";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function CustomSelect({
  value,
  options,
  onChange,
  className = "",
  placeholder = "Select...",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <div className="relative inline-block w-full hover:z-50 focus-within:z-50">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`dropdown-toggle flex items-center justify-between w-full focus:outline-hidden ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`shrink-0 ml-2 w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-brand-500" : "text-gray-400"
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute z-60 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-[#111827] dark:border-gray-800 py-1 !right-auto left-0"
      >
        <ul className="max-h-60 overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
                  String(opt.value) === String(value)
                    ? "bg-gray-50 text-brand-500 font-medium dark:bg-gray-700/50 dark:text-brand-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(String(opt.value));
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </Dropdown>
    </div>
  );
}
