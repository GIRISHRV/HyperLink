import { useState } from "react";

interface PasswordModalProps {
    isOpen: boolean;
    onSubmit: (password: string) => void;
    onCancel: () => void;
    title?: string;
    description?: string;
    isCreation?: boolean; // True if creating a password (send), False if entering (receive)
}

export default function PasswordModal({
    isOpen,
    onSubmit,
    onCancel,
    title = "Password Required",
    description = "This file is encrypted. Please enter the password to decrypt it.",
    isCreation = false,
}: PasswordModalProps) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setError("Password cannot be empty");
            return;
        }
        onSubmit(password);
        setPassword("");
        setError("");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-[#333] p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary/10 p-2 rounded-full border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-2xl">lock</span>
                    </div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h2>
                </div>

                <p className="text-gray-400 text-sm mb-6 font-mono leading-relaxed">
                    {description}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-primary uppercase tracking-wider">
                            {isCreation ? "Set Password" : "Enter Password"}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-primary text-white px-4 py-3 outline-none font-mono transition-colors"
                            placeholder={isCreation ? "Create a secure password..." : "••••••••"}
                            autoFocus
                            autoComplete="off"
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 h-12 border border-white/10 hover:bg-white/5 text-gray-300 font-bold uppercase tracking-wider text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 h-12 bg-primary hover:bg-[#ffea2e] text-black font-bold uppercase tracking-wider text-sm transition-colors shadow-lg shadow-primary/20"
                        >
                            {isCreation ? "Set Password" : "Decrypt"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
